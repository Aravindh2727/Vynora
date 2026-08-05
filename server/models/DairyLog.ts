import mongoose from 'mongoose';

const dairyLogSchema = new mongoose.Schema({
  user: { type: String, required: true },
  date: { type: Date, default: Date.now },
  session: { type: String, enum: ['Morning', 'Evening'], default: 'Morning' },
  litersProduced: { type: Number, required: true },
  ratePerLiter: { type: Number, required: true, default: 0 },
  soldAmount: { type: Number, required: true }
}, { timestamps: true });

export default mongoose.model('DairyLog', dairyLogSchema);
