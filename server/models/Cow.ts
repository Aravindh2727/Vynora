import mongoose from 'mongoose';

const cowSchema = new mongoose.Schema({
  user: { type: String, required: true },
  tagNumber: { type: String, required: true },
  breed: { type: String, required: true },
  dailyFoodCost: { type: Number, default: 0 },
  lastVaccination: { type: Date },
  healthNotes: { type: String },
  // Daily production logs can be embedded for simplicity in Sprint 4
  productionLogs: [{
    date: { type: Date, default: Date.now },
    litersProduced: { type: Number, required: true },
    soldAmount: { type: Number, required: true }
  }]
}, { timestamps: true });

export default mongoose.model('Cow', cowSchema);
