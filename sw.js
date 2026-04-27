const CASHE_NAME = 'notes-cache-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/app.js',
    '/style.css'
]

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CASHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CASHE_NAME)
                    .map(key => caches.delete(key))
            );
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});