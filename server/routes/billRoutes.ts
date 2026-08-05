import express from 'express';
import Bill from '../models/Bill.ts';
import Transaction from '../models/Transaction.ts';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const data = await Bill.find({ user: req.query.user }).sort({ dueDate: 1 });
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const saved = await new Bill(req.body).save();
    res.status(201).json(saved);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const updated = await Bill.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (updated) {
      if (updated.isPaid) {
         const existing = await Transaction.findOne({ referenceId: updated._id.toString() });
         if (!existing) {
             await new Transaction({
                 user: updated.user,
                 type: 'expense',
                 amount: updated.amount,
                 category: 'Bills & Utilities',
                 title: `Bill Paid - ${updated.name}`,
                 referenceId: updated._id.toString()
             }).save();
         }
      } else {
         await Transaction.deleteMany({ referenceId: updated._id.toString() });
      }
    }
    res.json(updated);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await Bill.findByIdAndDelete(req.params.id);
    await Transaction.deleteMany({ referenceId: req.params.id });
    res.json({ message: 'Deleted' });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

export default router;
