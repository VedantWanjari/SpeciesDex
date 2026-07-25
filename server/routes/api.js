import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { SpeciesCard } from '../models/SpeciesCard.js';
import { LibraryEntry } from '../models/LibraryEntry.js';
import { SpeciesGenerationLock } from '../models/SpeciesGenerationLock.js';
import { isDatabaseConnected } from '../config/database.js';
import { llmIsConfigured } from '../config/env.js';
import { canonicalizeSpecies, occurrenceCountFor } from '../services/gbif.js';
import { AppError } from '../services/http.js';
import { identifySpecies, imageHashFromBase64 } from '../agents/identifyAgent.js';
import { computeDeterministicStats } from '../agents/statEngine.js';
import { createPersona } from '../agents/personaAgent.js';

export const apiRouter = Router();

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const captureSchema = z.object({
  imageBase64: z.string().min(32, 'An image is required.'),
  userId: z.string().trim().min(8, 'A device ID is required.').max(120),
  deviceMeta: z.string().max(500).optional().default('')
});

function assertDatabase() {
  if (!isDatabaseConnected()) throw new AppError('Database is not connected. Add MONGODB_URI and restart the API.', 503);
}

function validateImage(imageBase64) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$/.exec(imageBase64);
  if (!match) throw new AppError('Use a JPEG, PNG, or WebP image encoded as a data URL.', 400);
  const body = match[2].replace(/[\r\n]/g, '');
  if (body.length % 4 !== 0) throw new AppError('The image data is malformed.', 400);
  const bytes = Buffer.from(body, 'base64');
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new AppError('Image must be between 1 byte and 5 MB.', 400);
}

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function acquireGenerationLock(gbifKey) {
  try {
    await SpeciesGenerationLock.create({ gbifKey, expiresAt: new Date(Date.now() + 45_000) });
    return true;
  } catch (error) {
    if (error.code === 11000) return false;
    throw error;
  }
}

async function waitForCard(gbifKey) {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    await sleep(500);
    const card = await SpeciesCard.findOne({ gbifKey }).lean();
    if (card) return card;
  }
  throw new AppError('This species is still being catalogued. Please retry in a moment.', 409);
}

/** Ensures only one process invokes persona creation for a previously unseen canonical GBIF key. */
async function findOrGenerateCard(canonical) {
  const existing = await SpeciesCard.findOne({ gbifKey: canonical.gbifKey }).lean();
  if (existing) return { card: existing, newlyGenerated: false };

  const ownsLock = await acquireGenerationLock(canonical.gbifKey);
  if (!ownsLock) return { card: await waitForCard(canonical.gbifKey), newlyGenerated: false };

  try {
    const doubleCheck = await SpeciesCard.findOne({ gbifKey: canonical.gbifKey }).lean();
    if (doubleCheck) return { card: doubleCheck, newlyGenerated: false };

    const occurrenceCount = await occurrenceCountFor(canonical.gbifKey);
    const computed = computeDeterministicStats({ ...canonical, occurrenceCount });
    const { persona, source: personaSource } = await createPersona(canonical);
    const card = await SpeciesCard.create({
      ...canonical,
      occurrenceCount,
      stats: computed.stats,
      powerScore: computed.powerScore,
      rarityTier: computed.rarityTier,
      persona
    });
    console.log(`[capture] generated species card gbif=${canonical.gbifKey}; persona=${personaSource}; engine=${computed.statEngineVersion}`);
    return { card: card.toObject(), newlyGenerated: true };
  } finally {
    await SpeciesGenerationLock.deleteOne({ gbifKey: canonical.gbifKey }).catch((error) => console.warn(`[capture] lock cleanup failed: ${error.message}`));
  }
}

async function attachPhoto({ userId, gbifKey, imageBase64, deviceMeta }) {
  const existing = await LibraryEntry.findOne({ userId, speciesCardKey: gbifKey }).lean();
  const capture = { imageBase64, capturedAt: new Date(), deviceMeta };
  const entry = await LibraryEntry.findOneAndUpdate(
    { userId, speciesCardKey: gbifKey },
    {
      $setOnInsert: { capturedAt: capture.capturedAt },
      $set: { userPhotoUrl: imageBase64, deviceMeta, capturedAt: capture.capturedAt },
      $push: { photos: { $each: [capture], $slice: -12 } }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
  return { entry, alreadyInLibrary: Boolean(existing) };
}

apiRouter.get('/health', (req, res) => {
  res.status(isDatabaseConnected() ? 200 : 503).json({ status: isDatabaseConnected() ? 'ok' : 'degraded', db: isDatabaseConnected() ? 'connected' : 'disconnected' });
});

apiRouter.post('/capture', async (req, res, next) => {
  const startedAt = Date.now();
  try {
    assertDatabase();
    const body = captureSchema.parse({ ...req.body, userId: req.body?.userId || req.get('x-device-id') });
    validateImage(body.imageBase64);
    const imageHash = imageHashFromBase64(body.imageBase64);
    const identification = await identifySpecies(body.imageBase64, imageHash);
    const canonical = await canonicalizeSpecies(identification.scientificName, identification.commonName);
    const { card, newlyGenerated } = await findOrGenerateCard(canonical);
    const { entry, alreadyInLibrary } = await attachPhoto({
      userId: body.userId,
      gbifKey: canonical.gbifKey,
      imageBase64: body.imageBase64,
      deviceMeta: body.deviceMeta
    });
    console.log(`[capture] complete gbif=${canonical.gbifKey} generated=${newlyGenerated} duplicate=${alreadyInLibrary} in ${Date.now() - startedAt}ms`);
    res.status(200).json({
      card,
      newlyGenerated,
      alreadyInLibrary,
      photoCount: entry.photos.length,
      identificationSource: identification.source
    });
  } catch (error) {
    next(error);
  }
});

apiRouter.get('/library/:userId', async (req, res, next) => {
  try {
    assertDatabase();
    const userId = z.string().trim().min(8).max(120).parse(req.params.userId);
    const entries = await LibraryEntry.find({ userId }).sort({ capturedAt: -1 }).lean();
    const keys = entries.map((entry) => entry.speciesCardKey);
    const cards = await SpeciesCard.find({ gbifKey: { $in: keys } }).lean();
    const byKey = new Map(cards.map((card) => [card.gbifKey, card]));
    res.json({
      speciesCollected: entries.length,
      entries: entries.filter((entry) => byKey.has(entry.speciesCardKey)).map((entry) => ({
        ...entry,
        card: byKey.get(entry.speciesCardKey),
        photoCount: entry.photos.length
      }))
    });
  } catch (error) {
    next(error);
  }
});

apiRouter.get('/cards/:gbifKey', async (req, res, next) => {
  try {
    assertDatabase();
    const gbifKey = z.coerce.number().int().positive().parse(req.params.gbifKey);
    const card = await SpeciesCard.findOne({ gbifKey }).lean();
    if (!card) throw new AppError('Species card not found.', 404);
    res.json({ card });
  } catch (error) {
    next(error);
  }
});

apiRouter.get('/leaderboard', async (req, res, next) => {
  try {
    assertDatabase();
    const rows = await LibraryEntry.aggregate([
      { $group: { _id: { userId: '$userId', speciesCardKey: '$speciesCardKey' } } },
      { $lookup: { from: 'speciescards', localField: '_id.speciesCardKey', foreignField: 'gbifKey', as: 'card' } },
      { $unwind: '$card' },
      { $group: { _id: '$_id.userId', speciesCollected: { $sum: 1 }, totalPowerScore: { $sum: '$card.powerScore' } } },
      { $sort: { totalPowerScore: -1 } },
      { $limit: 20 }
    ]);
    res.json({ leaderboard: rows.map((row) => ({ userId: row._id, speciesCollected: row.speciesCollected, totalPowerScore: row.totalPowerScore })) });
  } catch (error) {
    next(error);
  }
});
