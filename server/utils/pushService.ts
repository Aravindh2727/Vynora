import webpush from 'web-push';

import dotenv from 'dotenv';
dotenv.config();

// Load VAPID keys strictly from environment variables
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@vynora.ai';

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey
    );
  } catch (err) {
    console.warn('[PushService] Failed to initialize VAPID details for web-push:', err);
  }
} else {
  console.warn('[PushService] VAPID keys not configured in environment. Push notifications are disabled.');
}

interface PushSub {
  user: string;
  subscription: string;
}

const subscriptionStore: PushSub[] = [];

export const saveSubscription = (user: string, subString: string) => {
  const exists = subscriptionStore.some(s => s.user === user && s.subscription === subString);
  if (!exists) {
    subscriptionStore.push({ user, subscription: subString });
  }
};

export const deleteSubscription = (user: string, subString: string) => {
  const idx = subscriptionStore.findIndex(s => s.user === user && s.subscription === subString);
  if (idx !== -1) {
    subscriptionStore.splice(idx, 1);
  }
};

export const sendPushNotification = async (user: string, payload: any) => {
  if (!vapidPublicKey || !vapidPrivateKey) {
    return;
  }
  try {
    const userSubs = subscriptionStore.filter(s => s.user === user);
    const promises = userSubs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          JSON.parse(sub.subscription),
          JSON.stringify(payload)
        );
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          deleteSubscription(sub.user, sub.subscription);
        } else {
          console.error('Error sending push:', err);
        }
      }
    });

    await Promise.all(promises);
  } catch (err) {
    console.error('Error processing subscriptions for push:', err);
  }
};

export { vapidPublicKey };

