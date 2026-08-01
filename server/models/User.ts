import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  firebaseUid: { type: String, required: true, unique: true },
  role: { type: String, enum: ['Admin', 'User'], default: 'User' },
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family' },
  settings: {
    theme: { type: String, default: 'dark' },
    notificationsEnabled: { type: Boolean, default: true }
  }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
