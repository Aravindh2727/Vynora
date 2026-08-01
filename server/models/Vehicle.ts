import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  user: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, required: true }, // Car, Bike, Tractor
  licensePlate: { type: String },
  logs: [{
    type: { type: String, enum: ['Fuel', 'Service', 'Repair'] },
    cost: { type: Number },
    date: { type: Date, default: Date.now },
    notes: { type: String }
  }]
}, { timestamps: true });

export default mongoose.model('Vehicle', vehicleSchema);
