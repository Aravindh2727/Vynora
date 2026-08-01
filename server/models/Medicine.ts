import mongoose from 'mongoose';

const medicineSchema = new mongoose.Schema({
  user: { type: String, required: true },
  name: { type: String, required: true },
  dosage: { type: String, required: true },
  time: { type: String, required: false },
  schedule: {
    morning: { selected: { type: Boolean, default: false }, time: { type: String, default: '' } },
    afternoon: { selected: { type: Boolean, default: false }, time: { type: String, default: '' } },
    evening: { selected: { type: Boolean, default: false }, time: { type: String, default: '' } },
    night: { selected: { type: Boolean, default: false }, time: { type: String, default: '' } }
  },
  frequency: { type: String, default: 'Daily' },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  isCompleted: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Medicine', medicineSchema);
