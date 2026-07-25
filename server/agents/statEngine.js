/**
 * Deterministic species stat engine (version 1).
 * No model calls are allowed here. Species traits come from a small, versioned
 * taxonomic reference table; the stable GBIF usageKey gives a repeatable
 * species-level variation, never a photo-level variation.
 */
export const STAT_ENGINE_VERSION = '1.0.0';

const CLASS_PROFILES = Object.freeze({
  mammalia: { attack: 62, defense: 54, speed: 60, stamina: 66, special: 42 },
  aves: { attack: 42, defense: 35, speed: 82, stamina: 58, special: 53 },
  reptilia: { attack: 56, defense: 63, speed: 48, stamina: 64, special: 48 },
  amphibia: { attack: 38, defense: 45, speed: 40, stamina: 49, special: 70 },
  insecta: { attack: 47, defense: 39, speed: 73, stamina: 47, special: 61 },
  arachnida: { attack: 58, defense: 50, speed: 62, stamina: 46, special: 66 },
  actinopterygii: { attack: 47, defense: 45, speed: 67, stamina: 57, special: 49 },
  magnoliopsida: { attack: 12, defense: 55, speed: 5, stamina: 80, special: 74 },
  liliopsida: { attack: 10, defense: 51, speed: 6, stamina: 76, special: 70 },
  plantae: { attack: 10, defense: 52, speed: 5, stamina: 78, special: 69 },
  default: { attack: 38, defense: 44, speed: 43, stamina: 55, special: 48 }
});

export const RARITY_MULTIPLIERS = Object.freeze({
  Common: 1.0,
  Uncommon: 1.08,
  Rare: 1.17,
  Epic: 1.28,
  Legendary: 1.4
});

export const OCCURRENCE_THRESHOLDS = Object.freeze({
  COMMON_MIN: 1_000_000,
  UNCOMMON_MIN: 100_000,
  RARE_MIN: 10_000,
  EPIC_MIN: 500
});

const CONSERVATION_TIERS = Object.freeze({
  LC: 'Common', NT: 'Uncommon', VU: 'Rare', EN: 'Epic', CR: 'Legendary', EW: 'Legendary', EX: 'Legendary'
});

function stableHash(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function bounded(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Rarity comes from a fixed conservation mapping, then GBIF observation bands. */
export function rarityFromSignals({ conservationStatus, occurrenceCount = 0 }) {
  const status = String(conservationStatus || '').toUpperCase();
  if (CONSERVATION_TIERS[status]) return CONSERVATION_TIERS[status];
  if (occurrenceCount >= OCCURRENCE_THRESHOLDS.COMMON_MIN) return 'Common';
  if (occurrenceCount >= OCCURRENCE_THRESHOLDS.UNCOMMON_MIN) return 'Uncommon';
  if (occurrenceCount >= OCCURRENCE_THRESHOLDS.RARE_MIN) return 'Rare';
  if (occurrenceCount >= OCCURRENCE_THRESHOLDS.EPIC_MIN) return 'Epic';
  return 'Legendary';
}

/** Selects real-world trait proxies by known taxonomic class/kingdom. */
export function referenceProfileForTaxon({ className = '', kingdom = '' }) {
  const classKey = String(className).toLowerCase().replace(/\s/g, '');
  const kingdomKey = String(kingdom).toLowerCase();
  return CLASS_PROFILES[classKey] || (kingdomKey.includes('plantae') || kingdomKey.includes('plant') ? CLASS_PROFILES.plantae : CLASS_PROFILES.default);
}

/**
 * Converts stable biological proxies into five game stats. `gbifKey` produces
 * only a bounded +/- 8 species variation, so images and users never affect it.
 */
export function computeDeterministicStats({ gbifKey, className = '', kingdom = '', conservationStatus = '', occurrenceCount = 0 }) {
  if (gbifKey === undefined || gbifKey === null) throw new Error('gbifKey is required for deterministic stats');
  const profile = referenceProfileForTaxon({ className, kingdom });
  const hash = stableHash(gbifKey);
  const variation = (shift) => (((hash >>> shift) & 0x0f) - 7.5);
  const rarityTier = rarityFromSignals({ conservationStatus, occurrenceCount });
  const stats = {
    attack: bounded(profile.attack + variation(0)),
    defense: bounded(profile.defense + variation(4)),
    speed: bounded(profile.speed + variation(8)),
    stamina: bounded(profile.stamina + variation(12)),
    special: bounded(profile.special + variation(16))
  };
  const basePower = stats.attack * 0.25 + stats.defense * 0.2 + stats.speed * 0.2 + stats.stamina * 0.2 + stats.special * 0.15;
  const powerScore = bounded(basePower * RARITY_MULTIPLIERS[rarityTier]);
  return { stats, powerScore, rarityTier, statEngineVersion: STAT_ENGINE_VERSION };
}

