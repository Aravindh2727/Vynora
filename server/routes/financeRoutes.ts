import express from 'express';
import Transaction from '../models/Transaction.ts';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.query.user }).sort({ date: -1 });
    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const newTransaction = new Transaction(req.body);
    const saved = await newTransaction.save();
    res.status(201).json(saved);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.query.user });
    
    const income = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
    
    const categoryBreakdown = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc: any, curr) => {
            acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
            return acc;
        }, {});

    res.json({
        totalIncome: income,
        totalExpense: expense,
        balance: income - expense,
        categoryBreakdown
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updated = await express.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await Transaction.findByIdAndDelete(req.params.id);
    res.json({ message: 'Transaction deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
