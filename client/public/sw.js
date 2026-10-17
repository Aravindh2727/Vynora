console.log('Service Worker Loaded');

self.addEventListener('push', e => {
    const data = e.data.json();
    console.log('Push Received...');
    self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/pwa-192x192.png',
        vibrate: [200, 100, 200, 100, 200, 100, 200],
        data: {
            url: data.url || '/'
        }
    });
});

self.addEventListener('notificationclick', e => {
    e.notification.close();
    e.waitUntil(
        clients.openWindow(e.notification.data.url)
    );
});
