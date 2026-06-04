/* JUIS service worker — instalable + audios offline */
const VERSION = 'juis-v3';
const SHELL = ['./', './index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // App shell (navegación / HTML / manifest.json): network-first, para que la app
  // se actualice sola cuando hay conexión. Cae a caché si no hay red.
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html')
      || url.pathname === '/' || url.pathname.endsWith('manifest.json')
      || url.pathname.endsWith('manifest.webmanifest')) {
    e.respondWith(
      fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // audios e imágenes: cache-first (para escuchar sin conexión lo ya oído)
  if (/\.(mp3|jpg|jpeg|png|webp)$/i.test(url.pathname)) {
    e.respondWith(
      caches.match(e.request).then((hit) =>
        hit || fetch(e.request).then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
          return res;
        })
      )
    );
    return;
  }

  // resto: cache-first con red de respaldo
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});
