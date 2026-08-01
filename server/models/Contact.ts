import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
  user: { type: String, required: true },
  name: { type: String, required: true },
  relation: { type: String, required: true },
  phone: { type: String, required: true },
  isEmergency: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('Contact', contactSchema);
