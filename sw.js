const CACHE_NAME = 'phantom-chainer-cache-v2';
const APP_SHELL_URLS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/script.js',
    'https://cdn.jsdelivr.net/npm/particles.js@2.0.0/particles.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => {
            console.log('Opened cache and caching app shell');
            return cache.addAll(APP_SHELL_URLS);
        })
    );
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request)
        .then(networkResponse => {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
                .then(cache => {
                    cache.put(event.request, responseToCache);
                });
            return networkResponse;
        })
        .catch(() => {
            return caches.match(event.request)
                .then(cachedResponse => {
                    return cachedResponse || new Response("Network error: You are offline and this resource is not cached.", {
                        status: 404,
                        statusText: "Not Found"
                    });
                });
        })
    );
});