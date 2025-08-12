const CACHE_NAME = 'phantom-chainer-cache-v3';
const DATA_CACHE_NAME = 'phantom-chainer-data-cache-v3';

const APP_SHELL_URLS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/script.js',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&family=Roboto:wght@400;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/particles.js@2.0.0/particles.min.js'
];

const CONFIG_URL = 'https://raw.githubusercontent.com/XTLS/Xray-examples/refs/heads/main/Serverless-for-Iran/serverless_for_Iran.jsonc';
const CONFIG_CACHE_KEY = 'phantom-base-config';

self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        Promise.all([
            caches.open(CACHE_NAME).then(cache => {
                console.log('Service Worker: Caching App Shell...');
                return cache.addAll(APP_SHELL_URLS);
            }),
            caches.open(DATA_CACHE_NAME).then(cache => {
                console.log('Service Worker: Pre-caching base config...');
                return fetch(CONFIG_URL)
                    .then(response => {
                        if (response.ok) {
                            cache.put(CONFIG_CACHE_KEY, response.clone());
                            return response.text();
                        }
                        throw new Error('Failed to fetch config');
                    })
                    .catch(err => {
                        console.warn('Service Worker: Could not pre-cache config:', err);
                    });
            })
        ])
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    const cacheWhitelist = [CACHE_NAME, DATA_CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);
    
    if (requestUrl.origin === location.origin) {
        event.respondWith(cacheFirst(event.request));
    } else if (requestUrl.href === CONFIG_URL) {
        event.respondWith(networkFirstWithFallback(event.request));
    } else if (requestUrl.origin === 'https://fonts.googleapis.com' || 
               requestUrl.origin === 'https://fonts.gstatic.com' ||
               requestUrl.origin === 'https://cdnjs.cloudflare.com' ||
               requestUrl.origin === 'https://cdn.jsdelivr.net') {
        event.respondWith(staleWhileRevalidate(event.request));
    } else {
        event.respondWith(fetch(event.request));
    }
});

function cacheFirst(request) {
    return caches.open(CACHE_NAME).then(cache => {
        return cache.match(request).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(request).then(networkResponse => {
                if (networkResponse && networkResponse.status === 200) {
                    cache.put(request, networkResponse.clone());
                }
                return networkResponse;
            }).catch(() => {
                if (request.destination === 'document') {
                    return cache.match('/index.html');
                }
                return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
            });
        });
    });
}

function networkFirstWithFallback(request) {
    return caches.open(DATA_CACHE_NAME).then(cache => {
        return fetch(request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
                cache.put(CONFIG_CACHE_KEY, networkResponse.clone());
                return networkResponse;
            }
            return cache.match(CONFIG_CACHE_KEY);
        }).catch(() => {
            return cache.match(CONFIG_CACHE_KEY);
        });
    });
}

function staleWhileRevalidate(request) {
    return caches.open(CACHE_NAME).then(cache => {
        return cache.match(request).then(cachedResponse => {
            const fetchPromise = fetch(request).then(networkResponse => {
                if (networkResponse && networkResponse.status === 200) {
                    cache.put(request, networkResponse.clone());
                }
                return networkResponse;
            });
            return cachedResponse || fetchPromise;
        });
    });
}