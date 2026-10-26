// 서비스워커: 페이지는 네트워크 우선(오프라인 시 캐시), 정적 파일은 캐시 우선
const CACHE = "cb-__BUILD__";
const BASE = "__BASE__";
const CORE = [BASE, BASE + "manifest.webmanifest", BASE + "icons/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.endsWith("flash.json") || url.pathname.endsWith("search.json")) return; // 항상 최신
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).then((r) => {
      const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match(BASE))));
    return;
  }
  // ?v=빌드ID 가 붙은 파일은 주소 자체가 바뀌므로 정확히 일치할 때만 캐시를 쓴다
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return res;
  })));
});
