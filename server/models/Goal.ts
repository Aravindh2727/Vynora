import mongoose from 'mongoose';

const goalSchema = new mongoose.Schema({
  user: { type: String, required: true },
  title: { type: String, required: true },
  category: { type: String, default: 'Personal' },
  targetDate: { type: Date },
  progress: { type: Number, default: 0 }, // 0 to 100 percentage
  isCompleted: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('Goal', goalSchema);
