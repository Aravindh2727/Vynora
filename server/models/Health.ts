import mongoose from 'mongoose';

const healthSchema = new mongoose.Schema({
  user: { type: String, required: true },
  recordType: { type: String, enum: ['Blood Pressure', 'Blood Sugar', 'Weight/BMI', 'General Note'], required: true },
  value: { type: String, required: true },
  date: { type: Date, default: Date.now },
  notes: { type: String }
}, { timestamps: true });

export default mongoose.model('Health', healthSchema);
