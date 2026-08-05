import express from 'express';
import FamilyMember from '../models/FamilyMember.ts';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const members = await FamilyMember.find({ user: req.query.user }).sort({ createdAt: 1 });
    res.json(members);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const colors = ['#00f2fe', '#4facfe', '#667eea', '#764ba2', '#ff0844', '#f6d365', '#fda085', '#4ade80', '#fbbf24'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const newMember = new FamilyMember({
      ...req.body,
      avatarColor: randomColor
    });
    const saved = await newMember.save();
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updated = await FamilyMember.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await FamilyMember.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
