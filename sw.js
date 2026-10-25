/* ClinPharmAI Portal – service worker.
   Tăng CACHE_VERSION mỗi lần đổi tệp giao diện, danh mục hoặc trang trong pages/. */
'use strict';
var CACHE_VERSION = 'v1.1.0';
var SHELL = 'cpai-shell-' + CACHE_VERSION;
var RUNTIME = 'cpai-runtime-' + CACHE_VERSION;

var PRECACHE = [
  './', 'index.html', 'manifest.webmanifest',
  'css/base.css', 'css/themes.css', 'js/lib.js', 'js/app.js',
  'data/catalog.json',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(SHELL)
      .then(function (cache) { return cache.addAll(PRECACHE); })
      // Lưu sẵn mọi trang tài liệu có trong danh mục; một trang lỗi không làm hỏng cài đặt.
      .then(function () { return fetch('data/catalog.json', { cache: 'no-cache' }); })
      .then(function (r) { return r.json(); })
      .then(function (cat) {
        return caches.open(SHELL).then(function (cache) {
          return Promise.all((cat.records || []).map(function (rec) {
            if (!/^[A-Za-z0-9._-]+\.html$/.test(rec.file || '')) return null;
            return cache.add('pages/' + rec.file).catch(function () { return null; });
          }));
        });
      })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k.indexOf('cpai-') === 0 && k !== SHELL && k !== RUNTIME;
      }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('message', function (event) {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function staleWhileRevalidate(req, cacheName) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(req, { ignoreSearch: req.mode === 'navigate' }).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    });
  });
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  if (url.origin === self.location.origin) {
    // Danh mục: ưu tiên mạng để thấy bản mới, mất mạng thì dùng bản đã lưu.
    if (url.pathname.slice(-18) === '/data/catalog.json') {
      event.respondWith(
        fetch(req).then(function (res) {
          var copy = res.clone();
          caches.open(SHELL).then(function (c) { c.put('data/catalog.json', copy); });
          return res;
        }).catch(function () { return caches.match('data/catalog.json'); })
      );
      return;
    }
    if (req.mode === 'navigate' && !/\/pages\//.test(url.pathname)) {
      // Điều hướng tới ứng dụng: trả app shell khi ngoại tuyến.
      event.respondWith(fetch(req).catch(function () { return caches.match('index.html'); }));
      return;
    }
    event.respondWith(staleWhileRevalidate(req, SHELL));
    return;
  }

  // Tài nguyên ngoài (phông chữ, Tailwind, Chart.js, Alpine, Font Awesome) mà các trang dùng.
  var cdn = /(^|\.)(fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.tailwindcss\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|unpkg\.com)$/;
  if (cdn.test(url.hostname)) event.respondWith(staleWhileRevalidate(req, RUNTIME));
});
