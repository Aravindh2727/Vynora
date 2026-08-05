import express from 'express';
import Vehicle from '../models/Vehicle.ts';
import Transaction from '../models/Transaction.ts';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const data = await Vehicle.find({ user: req.query.user }).sort({ createdAt: -1 });
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const saved = await new Vehicle(req.body).save();
    res.status(201).json(saved);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.post('/:id/logs', async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Not found' });
    vehicle.logs.push(req.body);
    await vehicle.save();

    const cost = Number(req.body.cost) || 0;
    if (cost > 0) {
      await new Transaction({
        user: vehicle.user,
        type: 'expense',
        amount: cost,
        category: 'Transport',
        title: `${req.body.type} - ${vehicle.name} (${req.body.notes || 'Log'})`,
        referenceId: vehicle._id.toString()
      }).save();
    }

    res.json(vehicle);
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
    await Vehicle.findByIdAndDelete(req.params.id);
    await Transaction.deleteMany({ referenceId: req.params.id });
    res.json({ message: 'Deleted' });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

export default router;
