import mongoose from 'mongoose';

const passwordSchema = new mongoose.Schema({
  user: { type: String, required: true },
  platform: { type: String, required: true },
  username: { type: String, required: true },
  password: { type: String, required: true }, // Should be AES encrypted in production
  category: { type: String, default: 'Web' }
}, { timestamps: true });

export default mongoose.model('Password', passwordSchema);
