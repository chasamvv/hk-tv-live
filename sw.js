const CACHE = 'hk-tv-v2';
const SHELL = ['manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // 直播流与源清单永远走网络，不缓存（保证"更新源"总能拿到最新）
  if(url.pathname.endsWith('.m3u8') || url.pathname.endsWith('.ts')) return;
  if(url.pathname.endsWith('channels.json')) return;
  // 页面导航：网络优先，离线才回退缓存 —— 保证线上更新能立刻生效
  if(e.request.mode === 'navigate' || url.pathname.endsWith('index.html')){
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
        return res;
      }).catch(()=> caches.match(e.request).then(r => r || caches.match('index.html')))
    );
    return;
  }
  // 其他静态资源：缓存优先
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
