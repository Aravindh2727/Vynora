import express from 'express';
import Document from '../models/Document.ts';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const docs = await Document.find({ user: req.query.user }).sort({ createdAt: -1 });
    res.json(docs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const newDoc = new Document(req.body);
    const saved = await newDoc.save();
    res.status(201).json(saved);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
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
        await Document.findByIdAndDelete(req.params.id);
        res.json({ message: 'Document deleted' });
    } catch(err: any) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
