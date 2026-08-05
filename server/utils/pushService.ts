import webpush from 'web-push';
import Subscription from '../models/Subscription.ts';

// Hardcoded for Vynora local environment (in production, use .env)
const vapidPublicKey = 'BLXzXvww9TXfpCrCnKaATPLOjk02v8N7gggdiK1_MhNKXYW30Z2H4MNqJS_GEBWdjQGPXdPzC2jv3hCzK2RgFWY';
const vapidPrivateKey = 'zf7rZdxE_G04jZ9kKGfE4XBTOOQAR9bi18N1MVKlWkQ';

webpush.setVapidDetails(
  'mailto:noreply@vynora.ai',
  vapidPublicKey,
  vapidPrivateKey
);

export const sendPushNotification = async (user: string, payload: any) => {
    try {
        // Find all subscriptions for this user
        const subscriptions = await Subscription.find({ user });
        
        const promises = subscriptions.map(async (sub) => {
            try {
                await webpush.sendNotification(
                    JSON.parse(sub.subscription),
                    JSON.stringify(payload)
                );
            } catch (err: any) {
                // If subscription is invalid/expired (statusCode 410 or 404), remove it
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await Subscription.findByIdAndDelete(sub._id);
                } else {
                    console.error('Error sending push:', err);
                }
            }
        });

        await Promise.all(promises);
    } catch (err) {
        console.error('Error fetching subscriptions for push:', err);
    }
};

export { vapidPublicKey };
