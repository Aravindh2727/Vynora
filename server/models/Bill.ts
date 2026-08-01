import mongoose from 'mongoose';

const billSchema = new mongoose.Schema({
  user: { type: String, required: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  isPaid: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Bill', billSchema);
