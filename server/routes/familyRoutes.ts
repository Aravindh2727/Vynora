import express from 'express';
import Family from '../models/Family.ts';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const data = await Family.find({ user: req.query.user }).sort({ createdAt: -1 });
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const saved = await new Family(req.body).save();
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
    await Family.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

export default router;
