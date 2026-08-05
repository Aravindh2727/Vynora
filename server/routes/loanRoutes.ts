import express from 'express';
import Loan from '../models/Loan.ts';
import Transaction from '../models/Transaction.ts';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const data = await Loan.find({ user: req.query.user }).sort({ createdAt: -1 });
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const saved = await new Loan(req.body).save();
    res.status(201).json(saved);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const updated = await Loan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.post('/:id/toggle-payment', async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: 'Loan not found' });
    
    const { monthString } = req.body;
    const isPaid = loan.paidMonths.includes(monthString);
    const refId = `${loan._id.toString()}-${monthString}`;
    
    if (isPaid) {
      loan.paidMonths = loan.paidMonths.filter(m => m !== monthString);
      await Transaction.deleteMany({ referenceId: refId });
    } else {
      loan.paidMonths.push(monthString);
      
      await new Transaction({
         user: loan.user,
         type: 'expense',
         amount: loan.monthlyPay,
         category: 'Loan EMI',
         title: `EMI Payment - ${loan.loanName} (${monthString})`,
         referenceId: refId
      }).save();
    }
    
    await loan.save();
    res.json(loan);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Loan.findByIdAndDelete(req.params.id);
    await Transaction.deleteMany({ referenceId: { $regex: `^${req.params.id}` } });
    res.json({ message: 'Deleted' });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

export default router;
