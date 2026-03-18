const CACHE_NAME = 'z201-plan-v2'; 
const DYNAMIC_CACHE = 'z201-dynamic-v2';

// To zapisujemy na twardo przy pierwszej instalacji
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './zjazdy.json',
    './manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css' // Dodane FontAwesome!
];

// Instalacja
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => cache.addAll(ASSETS_TO_CACHE))
        .then(() => self.skipWaiting()) // Wymuś natychmiastową aktualizację
    );
});

// Sprzątanie starych śmieci (np. wersji v1)
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys
                .filter(key => key !== CACHE_NAME && key !== DYNAMIC_CACHE)
                .map(key => caches.delete(key))
            );
        })
    );
    return self.clients.claim();
});

// GŁÓWNA LOGIKA: Network First (Najpierw Internet, potem Cache)
self.addEventListener('fetch', event => {
    // Interesują nas tylko zapytania pobierające dane (GET)
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
        .then(response => {
            // Mamy internet! Zapisujemy kopię zapasową w tle i oddajemy świeże dane
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then(cache => {
                cache.put(event.request, responseClone);
            });
            return response;
        })
        .catch(() => {
            // Brak internetu (offline)! Wyciągamy ostatnią znaną wersję z pamięci telefonu
            return caches.match(event.request);
        })
    );
});