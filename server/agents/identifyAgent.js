import crypto from 'node:crypto';
import { llmIsConfigured } from '../config/env.js';
import { requestLlmJson } from '../services/llmClient.js';

const DEMO_SPECIES = Object.freeze([
  { commonName: 'house sparrow', scientificName: 'Passer domesticus', kingdom: 'animal' },
  { commonName: 'western honey bee', scientificName: 'Apis mellifera', kingdom: 'insect' },
  { commonName: 'red fox', scientificName: 'Vulpes vulpes', kingdom: 'animal' },
  { commonName: 'monarch butterfly', scientificName: 'Danaus plexippus', kingdom: 'insect' },
  { commonName: 'common sunflower', scientificName: 'Helianthus annuus', kingdom: 'plant' }
]);

const imageIdentificationCache = new Map();

export function imageHashFromBase64(imageBase64) {
  return crypto.createHash('sha256').update(imageBase64).digest('hex');
}

function fallbackIdentity(imageHash) {
  const index = Number.parseInt(imageHash.slice(0, 8), 16) % DEMO_SPECIES.length;
  return { ...DEMO_SPECIES[index], source: 'deterministic-demo-fallback' };
}

/** One vision request per image hash. The cache protects accidental retry uploads. */
export async function identifySpecies(imageBase64, imageHash) {
  const cached = imageIdentificationCache.get(imageHash);
  if (cached) {
    console.log('[capture] image hash cache hit; vision call skipped');
    return { ...cached, cached: true };
  }

  let identity;
  if (!llmIsConfigured()) {
    identity = fallbackIdentity(imageHash);
    console.warn('[capture] vision fallback used because no LLM provider is configured');
  } else {
    try {
      const output = await requestLlmJson({
        label: 'identify-agent',
        messages: [
          { role: 'system', content: 'Identify the most likely wild animal, insect, or plant. Return ONLY JSON: {"commonName":"string","scientificName":"Genus species","kingdom":"animal|insect|plant"}. Never invent certainty; select the best visible species-level guess.' },
          { role: 'user', content: [{ type: 'text', text: 'Identify this nature photo.' }, { type: 'image_url', image_url: { url: imageBase64 } }] }
        ]
      });
      if (!output?.scientificName || !output?.commonName) throw new Error('missing identity fields');
      identity = { commonName: String(output.commonName).slice(0, 100), scientificName: String(output.scientificName).slice(0, 120), kingdom: String(output.kingdom || 'animal').slice(0, 20), source: 'vision-llm' };
    } catch (error) {
      console.warn(`[capture] vision failed; deterministic demo fallback used: ${error.message}`);
      identity = fallbackIdentity(imageHash);
    }
  }
  imageIdentificationCache.set(imageHash, identity);
  return identity;
}

