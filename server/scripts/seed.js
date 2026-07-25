import { connectDatabase } from '../config/database.js';
import { SpeciesCard } from '../models/SpeciesCard.js';
import { computeDeterministicStats } from '../agents/statEngine.js';
import { fallbackPersona } from '../agents/personaAgent.js';

const SPECIES = [
  { gbifKey: 2877951, scientificName: 'Apis mellifera', commonName: 'western honey bee', kingdom: 'Animalia', className: 'Insecta', taxonRank: 'SPECIES', occurrenceCount: 2_300_000 },
  { gbifKey: 2492321, scientificName: 'Passer domesticus', commonName: 'house sparrow', kingdom: 'Animalia', className: 'Aves', taxonRank: 'SPECIES', occurrenceCount: 1_400_000 },
  { gbifKey: 5219450, scientificName: 'Danaus plexippus', commonName: 'monarch butterfly', kingdom: 'Animalia', className: 'Insecta', taxonRank: 'SPECIES', conservationStatus: 'EN', occurrenceCount: 890_000 },
  { gbifKey: 3117424, scientificName: 'Helianthus annuus', commonName: 'common sunflower', kingdom: 'Plantae', className: 'Magnoliopsida', taxonRank: 'SPECIES', occurrenceCount: 630_000 }
];

await connectDatabase();
for (const species of SPECIES) {
  const computed = computeDeterministicStats(species);
  await SpeciesCard.updateOne(
    { gbifKey: species.gbifKey },
    { $setOnInsert: { ...species, ...computed, persona: fallbackPersona(species) } },
    { upsert: true }
  );
}
console.log(`[seed] ensured ${SPECIES.length} demo cards`);
process.exit(0);

