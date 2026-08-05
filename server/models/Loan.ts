import mongoose from 'mongoose';

const loanSchema = new mongoose.Schema({
  user: { type: String, required: true },
  loanName: { type: String, required: true },
  bankLogo: { type: String },
  principalAmount: { type: Number, required: true },
  disbursalDate: { type: Date },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  interestRate: { type: Number, default: 0 },
  monthlyPay: { type: Number, required: true },
  paidMonths: [{ type: String }],
}, { timestamps: true });

export default mongoose.model('Loan', loanSchema);
