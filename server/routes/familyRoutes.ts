import express from 'express';
import Family from '../models/Family.ts';
import FamilyMember from '../models/FamilyMember.ts';
import { sendFamilyAlertEmail } from '../utils/emailService.ts';
import { sendPushNotification } from '../utils/pushService.ts';

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
    
    // Check if the author is a registered family member with an email
    if (req.body.author && req.body.author !== 'Head of House') {
      const member = await FamilyMember.findOne({ user: req.body.user, name: req.body.author });
      if (member && member.email) {
        // Send them an email alert!
        await sendFamilyAlertEmail(member.email, req.body.type, req.body.message, 'Head of House');
      }
    }
    
    // Trigger Push Notification to all subscribed devices for this user
    await sendPushNotification(req.body.user || '1', {
      title: `New ${req.body.type}`,
      body: req.body.message,
      url: '/family'
    });

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
