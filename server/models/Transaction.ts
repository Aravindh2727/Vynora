import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  user: { type: String, required: true }, // Using email/UID for rapid prototyping Sprint
  type: { type: String, enum: ['income', 'expense'], required: true },
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  title: { type: String, required: true },
  date: { type: Date, default: Date.now },
  isRecurring: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Transaction', transactionSchema);
