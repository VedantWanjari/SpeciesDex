import mongoose from 'mongoose';

const speciesGenerationLockSchema = new mongoose.Schema({
  gbifKey: { type: Number, required: true, unique: true },
  expiresAt: { type: Date, required: true, expires: 0 }
}, { versionKey: false });

export const SpeciesGenerationLock = mongoose.model('SpeciesGenerationLock', speciesGenerationLockSchema);

