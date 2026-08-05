import mongoose from 'mongoose';

const cowSchema = new mongoose.Schema({
  user: { type: String, required: true },
  tagNumber: { type: String, required: true },
  breed: { type: String, required: true },
  dailyFoodCost: { type: Number, default: 0 },
  lastVaccination: { type: Date },
  healthNotes: { type: String },
  status: { type: String, enum: ['active', 'sold'], default: 'active' },
  purchasePrice: { type: Number, default: 0 },
  purchaseDate: { type: Date, default: Date.now },
  salePrice: { type: Number },
  saleDate: { type: Date },
  productionLogs: [{
    date: { type: Date, default: Date.now },
    session: { type: String, enum: ['Morning', 'Evening'], default: 'Morning' },
    litersProduced: { type: Number, required: true },
    ratePerLiter: { type: Number, required: true, default: 0 },
    soldAmount: { type: Number, required: true }
  }],
  expenseLogs: [{
    date: { type: Date, default: Date.now },
    type: { type: String, enum: ['Treatment', 'Feed', 'Other'], required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true }
  }]
}, { timestamps: true });

export default mongoose.model('Cow', cowSchema);
