import webpush from 'web-push';

// Hardcoded for Vynora local environment (in production, use .env)
const vapidPublicKey = 'BLXzXvww9TXfpCrCnKaATPLOjk02v8N7gggdiK1_MhNKXYW30Z2H4MNqJS_GEBWdjQGPXdPzC2jv3hCzK2RgFWY';
const vapidPrivateKey = 'zf7rZdxE_G04jZ9kKGfE4XBTOOQAR9bi18N1MVKlWkQ';

webpush.setVapidDetails(
  'mailto:noreply@vynora.ai',
  vapidPublicKey,
  vapidPrivateKey
);

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

