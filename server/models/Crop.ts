import mongoose from 'mongoose';

const cropSchema = new mongoose.Schema({
  user: { type: String, required: true },
  name: { type: String, required: true },
  season: { type: String, default: 'Kharif' },
  seedCost: { type: Number, default: 0 },
  fertilizerCost: { type: Number, default: 0 },
  waterCost: { type: Number, default: 0 },
  labourCost: { type: Number, default: 0 },
  machineCost: { type: Number, default: 0 },
  harvestQuantity: { type: Number, default: 0 }, // in Kg or Quintals
  sellingPricePerUnit: { type: Number, default: 0 },
  status: { type: String, enum: ['Planted', 'Growing', 'Harvested'], default: 'Planted' },
}, { timestamps: true });

export default mongoose.model('Crop', cropSchema);
