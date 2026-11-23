/**
 * Service Worker - 班主任管理工作台
 * 缓存策略:
 *  - 静态资源: Cache First (优先缓存,离线可用)
 *  - API 请求: Network First (优先网络,失败后缓存)
 *  - HTML 页面: Network First, 离线时返回缓存
 */

const CACHE_VERSION = 'v1.0.0';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;

// 预缓存的静态资源
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/icon-maskable.png',
  '/icons/favicon-32.png',
  '/icons/favicon-16.png'
];

// 安装: 预缓存关键资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// 激活: 清理旧版本缓存
self.addEventListener('activate', event => {
  const currentCaches = [STATIC_CACHE, RUNTIME_CACHE, API_CACHE];
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => !currentCaches.includes(key))
            .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// 拦截请求
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 跳过非 GET 请求
  if (event.request.method !== 'GET') return;

  // 跳过 chrome-extension 等
  if (!url.protocol.startsWith('http')) return;

  // API 请求: Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(event.request, API_CACHE));
    return;
  }

  // CDN 资源 (Tailwind, Chart.js, SheetJS 等): Cache First
  if (url.hostname !== self.location.hostname) {
    event.respondWith(cacheFirst(event.request, RUNTIME_CACHE));
    return;
  }

  // 同源资源: Network First, 离线回退到缓存
  event.respondWith(networkFirst(event.request, STATIC_CACHE));
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    // 离线时返回主页
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }
    return new Response('Offline', { status: 503 });
  }
}

// 消息: 跳过等待更新
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});