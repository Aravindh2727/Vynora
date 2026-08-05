import express from 'express';
import Subscription from '../models/Subscription.ts';
import { vapidPublicKey } from '../utils/pushService.ts';

const router = express.Router();

// Get VAPID public key
router.get('/vapidPublicKey', (req, res) => {
    res.json({ publicKey: vapidPublicKey });
});

// Subscribe a device
router.post('/subscribe', async (req, res) => {
    try {
        const { subscription, user } = req.body;
        
        // Prevent duplicate subscriptions for the same user/device
        const existing = await Subscription.findOne({ user, subscription: JSON.stringify(subscription) });
        if (!existing) {
            await new Subscription({
                user,
                subscription: JSON.stringify(subscription)
            }).save();
        }
        
        res.status(201).json({ message: 'Subscribed successfully' });
    } catch (err: any) {
        res.status(400).json({ message: err.message });
    }
});

// Unsubscribe a device
router.post('/unsubscribe', async (req, res) => {
    try {
        const { subscription, user } = req.body;
        await Subscription.findOneAndDelete({ user, subscription: JSON.stringify(subscription) });
        res.json({ message: 'Unsubscribed successfully' });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
