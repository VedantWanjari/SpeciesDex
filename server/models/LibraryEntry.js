import mongoose from 'mongoose';

const photoSchema = new mongoose.Schema({
  imageBase64: { type: String, required: true },
  capturedAt: { type: Date, default: Date.now },
  deviceMeta: { type: String, default: '' }
}, { _id: false });

const libraryEntrySchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  speciesCardKey: { type: Number, required: true },
  userPhotoUrl: { type: String, default: '' },
  photos: { type: [photoSchema], default: [] },
  capturedAt: { type: Date, default: Date.now },
  deviceMeta: { type: String, default: '' }
}, { versionKey: false });

libraryEntrySchema.index({ userId: 1, speciesCardKey: 1 }, { unique: true });

export const LibraryEntry = mongoose.model('LibraryEntry', libraryEntrySchema);

