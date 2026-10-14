import express from 'express';
import { vapidPublicKey, saveSubscription, deleteSubscription } from '../utils/pushService.ts';

const router = express.Router();

// Get VAPID public key
router.get('/vapidPublicKey', (req, res) => {
    res.json({ publicKey: vapidPublicKey });
});

// Subscribe a device
router.post('/subscribe', (req, res) => {
    try {
        const { subscription, user } = req.body;
        if (subscription && user) {
            saveSubscription(user, JSON.stringify(subscription));
        }
        res.status(201).json({ message: 'Subscribed successfully' });
    } catch (err: any) {
        res.status(400).json({ message: err.message });
    }
});

// Unsubscribe a device
router.post('/unsubscribe', (req, res) => {
    try {
        const { subscription, user } = req.body;
        if (subscription && user) {
            deleteSubscription(user, JSON.stringify(subscription));
        }
        res.json({ message: 'Unsubscribed successfully' });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
