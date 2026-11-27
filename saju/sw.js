/* 팔자한장 — 홈 화면·앱용 서비스 워커.
   늘 새 화면을 먼저 받고, 인터넷이 끊기면 저장해 둔 화면으로 연다.
   생년월일은 여기서 다루지 않는다(화면 파일만 저장). 파일을 고치면 CACHE 숫자와 index.html 의 ?v= 를 같이 올릴 것. */
const CACHE = 'saju-v1';
const SHELL = ['./', './index.html', './saju.js?v=20261127', './texts.js?v=20261127c', './lunar.js',
  './manifest.json', './icon-192.png', './icon-512.png', './favicon.png', './privacy.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  // 우리 것(saju-)의 옛 판만 지운다. 같은 사이트의 계산기·보험 앱 저장분은 건드리지 않는다.
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('saju-') && k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  const fonts = u.origin === 'https://fonts.googleapis.com' || u.origin === 'https://fonts.gstatic.com';
  if (u.origin !== location.origin && !fonts) return;
  if (fonts) {   // 글꼴은 한 번 받으면 그대로 쓴다
    e.respondWith(caches.match(e.request).then(m => m || fetch(e.request).then(r => {
      const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r;
    })));
    return;
  }
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); }
      return r;
    }).catch(() => caches.match(e.request).then(r => r || (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});
