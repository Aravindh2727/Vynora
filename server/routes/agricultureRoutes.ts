import express from 'express';
import Crop from '../models/Crop.ts';
import Transaction from '../models/Transaction.ts';

const syncCropFinance = async (crop: any) => {
  await Transaction.deleteMany({ referenceId: crop._id.toString() });

  const totalCost = (crop.seedCost || 0) + (crop.fertilizerCost || 0) + (crop.waterCost || 0) + (crop.labourCost || 0) + (crop.machineCost || 0);
  if (totalCost > 0) {
    await new Transaction({
      user: crop.user,
      type: 'expense',
      amount: totalCost,
      category: 'Agriculture',
      title: `Crop Expense - ${crop.name} (${crop.season})`,
      referenceId: crop._id.toString()
    }).save();
  }

  const revenue = (crop.harvestQuantity || 0) * (crop.sellingPricePerUnit || 0);
  if (revenue > 0) {
    await new Transaction({
      user: crop.user,
      type: 'income',
      amount: revenue,
      category: 'Agriculture',
      title: `Crop Revenue - ${crop.name} (${crop.season})`,
      referenceId: crop._id.toString()
    }).save();
  }
};

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const data = await Crop.find({ user: req.query.user }).sort({ createdAt: -1 });
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const saved = await new Crop(req.body).save();
    await syncCropFinance(saved);
    res.status(201).json(saved);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const updated = await Crop.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (updated) await syncCropFinance(updated);
    res.json(updated);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await Crop.findByIdAndDelete(req.params.id);
    await Transaction.deleteMany({ referenceId: req.params.id });
    res.json({ message: 'Deleted' });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

export default router;
