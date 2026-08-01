import express from 'express';
import Inventory from '../models/Inventory.ts';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const data = await Inventory.find({ user: req.query.user }).sort({ createdAt: -1 });
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const saved = await new Inventory(req.body).save();
    res.status(201).json(saved);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const updated = await express.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await Inventory.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

export default router;
