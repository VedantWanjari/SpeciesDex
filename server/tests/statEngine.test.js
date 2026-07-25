import test from 'node:test';
import assert from 'node:assert/strict';
import { computeDeterministicStats, rarityFromSignals } from '../agents/statEngine.js';

test('stat engine is deterministic for the same canonical GBIF key', () => {
  const species = { gbifKey: 2877951, className: 'Insecta', kingdom: 'Animalia', occurrenceCount: 1_200_000 };
  assert.deepEqual(computeDeterministicStats(species), computeDeterministicStats(species));
});

test('conservation status takes priority over occurrence frequency', () => {
  assert.equal(rarityFromSignals({ conservationStatus: 'EN', occurrenceCount: 9_000_000 }), 'Epic');
});
