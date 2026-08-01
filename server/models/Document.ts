import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  user: { type: String, required: true },
  title: { type: String, required: true },
  category: { type: String, required: true },
  fileUrl: { type: String, required: true },
  fileId: { type: String }, // Cloudinary public_id for deletions
  tags: [{ type: String }],
  expiryDate: { type: Date },
}, { timestamps: true });

export default mongoose.model('Document', documentSchema);
