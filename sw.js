const CACHE_NAME = 'padoo-delivery-v1.5.0';
// Minimal caching - only essential files for faster loading
const urlsToCache = [
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/plogo.png',
  '/landingpage/index.html',
  '/landingpage/styles.css',
  '/landingpage/script.js'
];


self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(urlsToCache.map(url => new Request(url, { credentials: 'same-origin' })));
      })
      .catch((error) => {
        console.error('[SW] Failed to cache:', error);
      })
  );
  
  self.skipWaiting();
});


self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Ensure the new service worker takes control immediately
      return self.clients.claim();
    })
  );
});

// Network Only - No offline functionality, require internet connection
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  
  // Only cache essential PWA files (manifest, icons, pwa-utils)
  if (urlsToCache.includes(requestUrl.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        });
      })
    );
    return;
  }
  
  // For all other requests: Network Only - show "go online" message if offline
  event.respondWith(
    fetch(event.request).catch(() => {
      // If network fails, show "go online" message
      if (event.request.mode === 'navigate') {
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head>
              <title>Internet Required - Delivery App</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <meta name="theme-color" content="#ef4444">
              <style>
                  body {
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                      display: flex;
                      flex-direction: column;
                      align-items: center;
                      justify-content: center;
                      height: 100vh;
                      margin: 0;
                      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                      color: white;
                      text-align: center;
                      padding: 20px;
                  }
                  .icon {
                      font-size: 5rem;
                      margin-bottom: 1.5rem;
                      animation: pulse 2s infinite;
                  }
                  @keyframes pulse {
                      0%, 100% { transform: scale(1); }
                      50% { transform: scale(1.1); }
                  }
                  h1 { 
                      margin-bottom: 1rem; 
                      font-size: 2rem;
                      font-weight: 700;
                  }
                  p { 
                      opacity: 0.9; 
                      margin-bottom: 2rem; 
                      font-size: 1.1rem;
                      line-height: 1.5;
                      max-width: 400px;
                  }
                  .retry-btn {
                      background: rgba(255,255,255,0.15);
                      border: 2px solid rgba(255,255,255,0.3);
                      color: white;
                      padding: 15px 30px;
                      border-radius: 12px;
                      cursor: pointer;
                      font-size: 1.1rem;
                      font-weight: 600;
                      transition: all 0.3s ease;
                      margin: 10px;
                  }
                  .retry-btn:hover {
                      background: rgba(255,255,255,0.25);
                      transform: translateY(-2px);
                      box-shadow: 0 8px 25px rgba(0,0,0,0.2);
                  }
                  .status {
                      margin-top: 2rem;
                      padding: 15px 20px;
                      background: rgba(255,255,255,0.1);
                      border-radius: 8px;
                      font-size: 0.9rem;
                  }
              </style>
          </head>
          <body>
              <div class="icon">🌐</div>
              <h1>Internet Connection Required</h1>
              <p>This app requires an active internet connection to work. Please connect to WiFi or mobile data and try again.</p>
              <button class="retry-btn" onclick="window.location.reload()">🔄 Retry Connection</button>
              <button class="retry-btn" onclick="window.history.back()">⬅️ Go Back</button>
              <div class="status">
                  <strong>Status:</strong> Offline | <strong>App:</strong> Delivery Management System
              </div>
          </body>
          </html>
        `, {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/html' }
        });
      }
      
      // For API requests, return error
      if (requestUrl.pathname.startsWith('/api/')) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Internet connection required. Please go online and try again.',
          offline: true,
          error: 'NETWORK_ERROR'
        }), {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // For other resources, let them fail normally
      return Response.error();
    })
  );
});

// Background Sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync-orders') {
    event.waitUntil(syncOfflineOrders());
  }
});

// Handle push notifications with enhanced sound and reliability
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  let notificationData = {};

  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      notificationData = { body: event.data.text() };
    }
  }

  // Enhanced notification options for maximum reliability
  const options = {
    body: notificationData.body || 'New delivery order available!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/plogo.png',
    image: notificationData.image || null,
    tag: 'padoo-order-' + (notificationData.notificationId || notificationData.order_id || notificationData.orderId || (notificationData.data && (notificationData.data.order_id || notificationData.data.orderId)) || 'generic'),
    renotify: true,
    requireInteraction: true,
    silent: false, // Ensure sound is enabled
    vibrate: [300, 200, 300, 200, 300, 200, 300], // Strong vibration pattern
    timestamp: Date.now(),
    data: {
      url: notificationData.url || '/mainapp/delivery',
      notificationId: notificationData.notificationId || null,
      clickAction: notificationData.clickAction || 'open_app',
      orderAmount: notificationData.order_amount || null,
      shopName: notificationData.shop_name || null,
      orderId: notificationData.order_id || null,
      userId: notificationData.userId || (notificationData.data && notificationData.data.userId) || null,
      ...notificationData.data
    },
    actions: []
  };

  // Show notification with enhanced error handling
  event.waitUntil(
    Promise.all([
      // Show the notification
      self.registration.showNotification(
        notificationData.title || '🚚 New Delivery Order!',
        options
      ),
      // Play custom sound if available
      playNotificationSound(notificationData),
      // Store notification for offline handling
      storeNotificationOffline(notificationData)
    ]).then(() => {
      console.log('[SW] Enhanced push notification displayed successfully');

      // Send analytics/tracking if needed
      if (notificationData.notificationId) {
        trackNotificationDelivery(notificationData.notificationId);
      }
    }).catch(error => {
      console.error('[SW] Error displaying enhanced push notification:', error);

      // Fallback: try basic notification
      return self.registration.showNotification(
        'New Order Available!',
        {
          body: 'Tap to view your new delivery order',
          icon: '/icons/icon-192x192.png',
          tag: 'padoo-order-' + (notificationData.notificationId || notificationData.order_id || notificationData.orderId || (notificationData.data && (notificationData.data.order_id || notificationData.data.orderId)) || 'generic'),
          renotify: true,
          requireInteraction: true,
          vibrate: [300, 200, 300],
          data: { url: notificationData.url || '/mainapp/delivery' }
        }
      );
    })
  );
});

// Enhanced sound notification function
async function playNotificationSound(notificationData) {
  try {
    // For order notifications, we want maximum attention
    if (notificationData.title && notificationData.title.includes('Order')) {
      console.log('[SW] Playing enhanced order notification sound');

      // Multiple notification attempts for reliability
      const soundPromises = [];

      // Method 1 removed to avoid duplicate in-app sounds; rely on SW sound only

      // Method 2: Use Web Audio API in service worker (if supported)
      if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
        soundPromises.push(playServiceWorkerSound());
      }

      await Promise.allSettled(soundPromises);
    }
  } catch (error) {
    console.error('[SW] Error playing notification sound:', error);
  }
}

// Service worker sound generation
async function playServiceWorkerSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Create urgent delivery notification sound (multiple tones)
    const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.2);

      gain.gain.setValueAtTime(0.4, now + i * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3 + i * 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.2);
      osc.stop(now + 0.3 + i * 0.2);
    });

    // Close context after sound completes
    setTimeout(() => {
      ctx.close();
    }, 1500);

  } catch (error) {
    console.error('[SW] Error creating service worker sound:', error);
  }
}

// Store notification for offline handling
async function storeNotificationOffline(notificationData) {
  try {
    // Store in IndexedDB for offline access
    const dbName = 'PadooNotifications';
    const storeName = 'notifications';

    const request = indexedDB.open(dbName, 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('notificationId', 'notificationId', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      store.add({
        ...notificationData,
        timestamp: Date.now(),
        received_at: new Date().toISOString()
      });
    };

  } catch (error) {
    console.error('[SW] Error storing notification offline:', error);
  }
}

// Track notification delivery for analytics
async function trackNotificationDelivery(notificationId) {
  try {
    await fetch('/api/notifications/delivered', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        notificationId: notificationId,
        deliveredAt: new Date().toISOString(),
        userAgent: navigator.userAgent
      })
    });
  } catch (error) {
    console.error('[SW] Error tracking notification delivery:', error);
  }
}

// Enhanced notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received:', event.action, event.notification.data);

  event.notification.close();

  const notificationData = event.notification.data || {};
  const notificationId = notificationData.notificationId;
  const orderId = notificationData.orderId;
  const shopName = notificationData.shopName;

  // Handle different actions
  if (event.action === 'dismiss') {
    console.log('[SW] Notification dismissed by user');
    // Track dismissal
    if (notificationId) {
      trackNotificationAction(notificationId, 'dismissed');
    }
    return;
  }



  // Handle view action or general notification click
  const urlToOpen = notificationData.url || '/mainapp/delivery';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes('/app') || client.url.includes('/mainapp')) {
            console.log('[SW] Focusing existing app window');
            client.focus();

            // Send comprehensive message to app
            client.postMessage({
              type: 'notification_clicked',
              action: event.action || 'view',
              notificationId: notificationId,
              orderId: orderId,
              shopName: shopName,
              notificationData: notificationData
            });

            // Track the click
            if (notificationId) {
              trackNotificationAction(notificationId, event.action || 'clicked');
            }

            return;
          }
        }

        // App not open, open new window with specific parameters
        let finalUrl = urlToOpen;
        // Always direct to Orders page on notification clicks
        finalUrl += `${finalUrl.includes('?') ? '&' : '?'}page=orders`;
        if (notificationId) {
          finalUrl += `&notification=${encodeURIComponent(notificationId)}`;
        }
        if (orderId) {
          finalUrl += `&order=${encodeURIComponent(orderId)}`;
        }

        console.log('[SW] Opening new app window:', finalUrl);
        return clients.openWindow(finalUrl);
      })
      .then(() => {
        // Track the click after handling
        if (notificationId) {
          trackNotificationAction(notificationId, event.action || 'clicked');
        }
      })
      .catch(error => {
        console.error('[SW] Error handling notification click:', error);
      })
  );
});


// Track notification actions for analytics
async function trackNotificationAction(notificationId, action) {
  try {
    await fetch('/api/notifications/action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        notificationId: notificationId,
        action: action,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      })
    });
  } catch (error) {
    console.error('[SW] Error tracking notification action:', error);
  }
}

// Handle push subscription change
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription changed');
  
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(getApplicationServerKey())
    })
    .then(subscription => {
      console.log('[SW] New push subscription created');
      
      // Send new subscription to server
      return fetch('/api/push/subscription', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription: subscription,
          oldEndpoint: event.oldSubscription?.endpoint
        })
      });
    })
    .catch(error => {
      console.error('[SW] Error handling push subscription change:', error);
    })
  );
});

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Get application server key (VAPID public key)
function getApplicationServerKey() {
  // This should match the public key in server.js and client code
  return 'BG_qTrWFr2qESzBzbog1Ajx_6r79bf4WheyZD2jgdzz_o68TzMkzR4Fd-WS0Y-G2gJK7xQcD0HvQ259UgQk4kM8';
}

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(event.data.payload);
      })
    );
  }
});

// Helper function to sync offline orders
async function syncOfflineOrders() {
  try {
    // Get offline orders from IndexedDB
    const offlineOrders = await getOfflineOrders();
    
    if (offlineOrders.length === 0) {
      console.log('[SW] No offline orders to sync');
      return;
    }
    
    console.log(`[SW] Syncing ${offlineOrders.length} offline orders`);
    
    for (const order of offlineOrders) {
      try {
        const response = await fetch('/api/user/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${order.sessionToken}`
          },
          body: JSON.stringify(order.data)
        });
        
        if (response.ok) {
          // Remove synced order from offline storage
          await removeOfflineOrder(order.id);
          console.log('[SW] Order synced successfully:', order.id);
        }
      } catch (syncError) {
        console.error('[SW] Failed to sync order:', order.id, syncError);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Helper functions for IndexedDB operations (simplified)
async function getOfflineOrders() {
  // In a real implementation, you would use IndexedDB
  // For now, return empty array
  return [];
}

async function removeOfflineOrder(orderId) {
  // In a real implementation, you would remove from IndexedDB
  console.log('[SW] Would remove offline order:', orderId);
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync triggered:', event.tag);
  
  if (event.tag === 'background-sync-orders') {
    event.waitUntil(syncOfflineOrders());
  }
});

console.log('[SW] Service Worker loaded successfully'); 