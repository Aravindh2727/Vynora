import express from 'express';
import Cow from '../models/Cow.ts';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const data = await Cow.find({ user: req.query.user }).sort({ createdAt: -1 });
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const saved = await new Cow(req.body).save();
    res.status(201).json(saved);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

// Add a production log to a cow
router.post('/:id/logs', async (req, res) => {
  try {
    const cow = await Cow.findById(req.params.id);
    if (!cow) return res.status(404).json({ message: 'Cow not found' });
    
    cow.productionLogs.push(req.body);
    await cow.save();
    res.json(cow);
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
    await Cow.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

export default router;
