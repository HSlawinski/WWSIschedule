const CACHE_NAME = 'z201-plan-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './zjazdy.json'
];

// Instalacja Service Workera i zapisywanie plików do pamięci podręcznej
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => {
            console.log('Zapisano pliki w pamięci podręcznej (Cache)');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Zwracanie plików z pamięci podręcznej, gdy nie ma internetu
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
        .then(response => {
            // Zwróć plik z cache, albo pobierz z sieci, jeśli go tam nie ma
            return response || fetch(event.request);
        })
    );
});