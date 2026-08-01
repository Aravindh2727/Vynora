import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: String, enum: ['Vehicle', 'Crop', 'Livestock', 'Appliance'], required: true },
  name: { type: String, required: true },
  purchaseDate: { type: Date },
  warrantyExpiry: { type: Date },
  insuranceExpiry: { type: Date },
  metadata: { type: mongoose.Schema.Types.Mixed } // Flexible JSON for specific stats
}, { timestamps: true });

export default mongoose.model('Asset', assetSchema);
