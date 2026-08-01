import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  user: { type: String, required: true },
  title: { type: String, required: true },
  type: { type: String, enum: ['Assignment', 'Exam', 'Project'], required: true },
  subject: { type: String, required: true },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' }
}, { timestamps: true });

export default mongoose.model('Student', studentSchema);
