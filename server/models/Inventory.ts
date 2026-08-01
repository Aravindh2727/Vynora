import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  user: { type: String, required: true },
  itemName: { type: String, required: true },
  category: { type: String, default: 'General' },
  purchaseDate: { type: Date },
  warrantyExpiry: { type: Date },
  price: { type: Number }
}, { timestamps: true });

export default mongoose.model('Inventory', inventorySchema);
