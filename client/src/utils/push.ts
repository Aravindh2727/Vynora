import { API_BASE_URL } from '../config';

export function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush(userId: string) {
    if ('serviceWorker' in navigator) {
        try {
            const register = await navigator.serviceWorker.register('/sw.js');
            
            // Ask for permission
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return;

            const res = await fetch(`${API_BASE_URL}/api/notifications/vapidPublicKey`);
            const { publicKey } = await res.json();

            const subscription = await register.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey)
            });

            await fetch(`${API_BASE_URL}/api/notifications/subscribe`, {
                method: 'POST',
                body: JSON.stringify({ subscription, user: userId }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            console.log('Push Subscribed successfully!');
        } catch (err) {
            console.error('Push Subscription failed:', err);
        }
    }
}
