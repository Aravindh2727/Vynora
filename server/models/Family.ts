import mongoose from 'mongoose';

const familySchema = new mongoose.Schema({
  user: { type: String, required: true },
  author: { type: String, required: true }, // Name of the family member posting
  message: { type: String, required: true },
  type: { type: String, enum: ['Announcement', 'Chore', 'Event'], default: 'Announcement' }
}, { timestamps: true });

export default mongoose.model('Family', familySchema);
