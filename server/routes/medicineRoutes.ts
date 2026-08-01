import express from 'express';
import Medicine from '../models/Medicine.ts';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // Auto-delete expired medicines where endDate is before today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await Medicine.deleteMany({ 
      user: req.query.user,
      endDate: { $exists: true, $lt: today }
    });

    const data = await Medicine.find({ user: req.query.user }).sort({ time: 1 });
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const saved = await new Medicine(req.body).save();
    res.status(201).json(saved);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const updated = await Medicine.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await Medicine.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

export default router;
