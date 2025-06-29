const CACHE_NAME = 'tictactoe-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/css/navbar.css',
    '/css/yes.css',
    '/css/loading.css',
    '/assets/logo.png',
    '/favicon.ico',
    '/js/app.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
}); 