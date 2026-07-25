import { env } from '../config/env.js';
import { fetchWithTimeout, AppError } from './http.js';

async function gbifGet(path, label) {
  const startedAt = Date.now();
  try {
    const response = await fetchWithTimeout(`${env.gbifBaseUrl}${path}`, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`GBIF status ${response.status}`);
    const payload = await response.json();
    console.log(`[gbif] ${label} succeeded in ${Date.now() - startedAt}ms`);
    return payload;
  } catch (error) {
    console.warn(`[gbif] ${label} failed in ${Date.now() - startedAt}ms: ${error.message}`);
    throw error;
  }
}

function normalizedStatus(payload = {}) {
  const candidate = payload.iucnRedListCategory || payload.conservationStatus || payload.threatStatus || '';
  return String(candidate).toUpperCase().replace(/^IUCN\s*/, '');
}

/** GBIF usageKey, not classifier text, is the canonical identity used by SpeciesDex. */
export async function canonicalizeSpecies(scientificName, commonName = '') {
  const query = encodeURIComponent(scientificName || commonName);
  if (!query) throw new AppError('Could not identify a species name from this image.', 422);
  let match;
  try {
    match = await gbifGet(`/species/match?name=${query}`, 'species match');
  } catch {
    throw new AppError('Species reference service is temporarily unavailable. Please try again.', 503);
  }
  if (!match?.usageKey || match.matchType === 'NONE') {
    throw new AppError('We could not confidently match this capture to a species. Try a clearer photo.', 422);
  }

  let detail = {};
  try {
    detail = await gbifGet(`/species/${match.usageKey}`, 'species detail');
  } catch {
    // The match response contains enough canonical information to continue.
    console.warn('[gbif] species detail fallback used');
  }
  return {
    gbifKey: Number(match.usageKey),
    scientificName: detail.scientificName || match.scientificName || scientificName,
    commonName: detail.vernacularName || match.vernacularName || commonName || '',
    taxonRank: detail.rank || match.rank || 'SPECIES',
    kingdom: detail.kingdom || match.kingdom || 'Animalia',
    className: detail.class || match.class || '',
    conservationStatus: normalizedStatus(detail) || normalizedStatus(match)
  };
}

/** Occurrence API failures intentionally degrade to Common; a capture never fails over a rarity lookup. */
export async function occurrenceCountFor(gbifKey) {
  try {
    const count = await gbifGet(`/occurrence/count?taxonKey=${encodeURIComponent(gbifKey)}`, 'occurrence count');
    return Number.isFinite(Number(count)) ? Number(count) : 0;
  } catch {
    console.warn('[gbif] occurrence count fallback used: Common rarity signal');
    return Number.MAX_SAFE_INTEGER;
  }
}

