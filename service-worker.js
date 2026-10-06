// Service Worker 版本号，改了内容后改这个数字可以强制更新
const CACHE_NAME = 'focus-mountain-v2';

// 需要缓存的文件列表
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  // Chart.js 从CDN加载的也要缓存，离线时才能用
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// 安装阶段：缓存所有资源
self.addEventListener('install', (event) => {
  console.log('[SW] 安装中...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] 缓存资源');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting()) // 立即激活，不等待旧版本关闭
  );
});

// 激活阶段：清理旧版本缓存
self.addEventListener('activate', (event) => {
  console.log('[SW] 激活中...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] 删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // 立即接管所有页面
  );
});

// 拦截请求：优先从缓存读取，缓存没有再走网络
self.addEventListener('fetch', (event) => {
  // 只处理 GET 请求
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse; // 缓存命中，直接用缓存
        }
        // 缓存没有，走网络
        return fetch(event.request)
          .then((networkResponse) => {
            // 只缓存成功的响应
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }
            // 克隆一份放进缓存（响应流只能读一次）
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
            return networkResponse;
          })
          .catch(() => {
            // 网络也失败了，可以返回一个离线页面（这里简单处理）
            console.log('[SW] 网络请求失败:', event.request.url);
          });
      })
  );
});
