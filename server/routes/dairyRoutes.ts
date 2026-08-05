import express from 'express';
import Cow from '../models/Cow.ts';
import DairyLog from '../models/DairyLog.ts';
import FarmFeed from '../models/FarmFeed.ts';
import Transaction from '../models/Transaction.ts';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const data = await Cow.find({ user: req.query.user }).sort({ createdAt: -1 });
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.get('/feed', async (req, res) => {
  try {
    const data = await FarmFeed.find({ user: req.query.user }).sort({ date: -1 });
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post('/feed', async (req, res) => {
  try {
    const amount = Number(req.body.amount) || 0;
    const description = req.body.description || 'Farm Feed';
    const date = req.body.date || new Date();

    const feedEntry = new FarmFeed({
      user: req.body.user,
      date,
      description,
      amount
    });
    
    await feedEntry.save();

    if (amount > 0) {
      await new Transaction({
        user: req.body.user,
        type: 'expense',
        amount: amount,
        category: 'Dairy',
        title: `Farm Feed Expense - ${description}`,
        date: date
      }).save();
    }

    res.status(201).json(feedEntry);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.get('/logs', async (req, res) => {
  try {
    const data = await DairyLog.find({ user: req.query.user }).sort({ date: -1 });
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post('/logs', async (req, res) => {
  try {
    const litersProduced = Number(req.body.litersProduced) || 0;
    const ratePerLiter = Number(req.body.ratePerLiter) || 0;
    const soldAmount = litersProduced * ratePerLiter;
    const session = req.body.session || 'Morning';
    const date = new Date();

    const logEntry = new DairyLog({
      user: req.body.user,
      date,
      session,
      litersProduced,
      ratePerLiter,
      soldAmount
    });
    
    await logEntry.save();

    if (soldAmount > 0) {
      await new Transaction({
        user: req.body.user,
        type: 'income',
        amount: soldAmount,
        category: 'Dairy',
        title: `Farm Milk Sale - ${session} (${litersProduced}L @ ₹${ratePerLiter})`,
        date: date,
        referenceId: logEntry._id
      }).save();
    }

    res.status(201).json(logEntry);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.put('/logs/:id', async (req, res) => {
  try {
    const litersProduced = Number(req.body.litersProduced) || 0;
    const ratePerLiter = Number(req.body.ratePerLiter) || 0;
    const soldAmount = litersProduced * ratePerLiter;
    const session = req.body.session || 'Morning';
    
    const updated = await DairyLog.findByIdAndUpdate(req.params.id, {
      session, litersProduced, ratePerLiter, soldAmount
    }, { new: true });
    
    if (updated) {
      await Transaction.deleteMany({ referenceId: req.params.id });
      if (soldAmount > 0) {
        await new Transaction({
          user: updated.user,
          type: 'income',
          amount: soldAmount,
          category: 'Dairy',
          title: `Farm Milk Sale - ${session} (${litersProduced}L @ ₹${ratePerLiter})`,
          date: updated.date,
          referenceId: updated._id
        }).save();
      }
    }
    res.json(updated);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.delete('/logs/:id', async (req, res) => {
  try {
    await DairyLog.findByIdAndDelete(req.params.id);
    await Transaction.deleteMany({ referenceId: req.params.id });
    res.json({ message: 'Deleted' });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const saved = await new Cow(req.body).save();
    
    // Automatically create a finance expense if purchasePrice is provided
    if (req.body.purchasePrice && Number(req.body.purchasePrice) > 0) {
      await new Transaction({
        user: req.body.user,
        type: 'expense',
        amount: Number(req.body.purchasePrice),
        category: 'Dairy',
        title: `Bought Cattle #${req.body.tagNumber}`,
        date: req.body.purchaseDate || Date.now()
      }).save();
    }
    
    res.status(201).json(saved);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

// Add a production log to a cow
router.post('/:id/logs', async (req, res) => {
  try {
    const cow = await Cow.findById(req.params.id);
    if (!cow) return res.status(404).json({ message: 'Cow not found' });
    
    const litersProduced = Number(req.body.litersProduced) || 0;
    const ratePerLiter = Number(req.body.ratePerLiter) || 0;
    const soldAmount = litersProduced * ratePerLiter;
    const session = req.body.session || 'Morning';
    const date = new Date();

    const logEntry = {
      date,
      session,
      litersProduced,
      ratePerLiter,
      soldAmount
    };

    cow.productionLogs.push(logEntry);
    await cow.save();

    // Create a finance income transaction
    if (soldAmount > 0) {
      await new Transaction({
        user: cow.user,
        type: 'income',
        amount: soldAmount,
        category: 'Dairy',
        title: `${session} Milk Sale - Cattle #${cow.tagNumber} (${litersProduced}L @ ₹${ratePerLiter})`,
        date: date
      }).save();
    }

    res.json(cow);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const updated = await express.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

// Add an expense log to a cow
router.post('/:id/expenses', async (req, res) => {
  try {
    const cow = await Cow.findById(req.params.id);
    if (!cow) return res.status(404).json({ message: 'Cow not found' });
    
    const amount = Number(req.body.amount) || 0;
    const type = req.body.type || 'Other';
    const description = req.body.description || 'Expense';
    const date = req.body.date || new Date();

    const expenseEntry = { date, type, description, amount };
    if (!cow.expenseLogs) cow.expenseLogs = [];
    cow.expenseLogs.push(expenseEntry);
    await cow.save();

    // Create a finance expense transaction
    if (amount > 0) {
      await new Transaction({
        user: cow.user,
        type: 'expense',
        amount: amount,
        category: 'Dairy',
        title: `${type} Expense - Cattle #${cow.tagNumber} (${description})`,
        date: date
      }).save();
    }

    res.json(cow);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

// Sell a cow
router.post('/:id/sell', async (req, res) => {
  try {
    const cow = await Cow.findById(req.params.id);
    if (!cow) return res.status(404).json({ message: 'Cow not found' });

    const salePrice = Number(req.body.salePrice);
    const saleDate = req.body.saleDate || Date.now();

    cow.status = 'sold';
    cow.salePrice = salePrice;
    cow.saleDate = saleDate;
    await cow.save();

    // Create a finance income transaction
    if (salePrice > 0) {
      await new Transaction({
        user: cow.user,
        type: 'income',
        amount: salePrice,
        category: 'Dairy',
        title: `Sold Cattle #${cow.tagNumber}`,
        date: saleDate
      }).save();
    }

    res.json(cow);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await Cow.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

export default router;
