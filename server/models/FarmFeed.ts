import mongoose from 'mongoose';

const farmFeedSchema = new mongoose.Schema({
  user: { type: String, required: true },
  date: { type: Date, default: Date.now },
  description: { type: String, required: true },
  amount: { type: Number, required: true }
}, { timestamps: true });

export default mongoose.model('FarmFeed', farmFeedSchema);
