import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  user: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  status: { type: String, enum: ['Todo', 'InProgress', 'Done'], default: 'Todo' },
  dueDate: { type: Date },
}, { timestamps: true });

export default mongoose.model('Task', taskSchema);
