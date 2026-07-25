import mongoose from 'mongoose';

const statsSchema = new mongoose.Schema({
  attack: { type: Number, required: true, min: 0, max: 100 },
  defense: { type: Number, required: true, min: 0, max: 100 },
  speed: { type: Number, required: true, min: 0, max: 100 },
  stamina: { type: Number, required: true, min: 0, max: 100 },
  special: { type: Number, required: true, min: 0, max: 100 }
}, { _id: false });

const personaSchema = new mongoose.Schema({
  cardName: { type: String, required: true, maxlength: 30 },
  tagline: { type: String, required: true, maxlength: 60 },
  backstory: { type: String, required: true, maxlength: 280 },
  specialMove: { type: String, required: true, maxlength: 40 }
}, { _id: false });

const speciesCardSchema = new mongoose.Schema({
  gbifKey: { type: Number, required: true, unique: true, index: true },
  scientificName: { type: String, required: true },
  commonName: { type: String, default: '' },
  taxonRank: { type: String, default: 'SPECIES' },
  kingdom: { type: String, default: 'Animalia' },
  className: { type: String, default: '' },
  conservationStatus: { type: String, default: '' },
  occurrenceCount: { type: Number, default: 0 },
  stats: { type: statsSchema, required: true },
  powerScore: { type: Number, required: true, min: 0, max: 100 },
  rarityTier: { type: String, required: true, enum: ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'] },
  persona: { type: personaSchema, required: true },
  sampleImageUrl: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

export const SpeciesCard = mongoose.model('SpeciesCard', speciesCardSchema);

