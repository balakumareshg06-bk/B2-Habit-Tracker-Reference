// sw.js — B² Habit Tracker  (bump CACHE_NAME on every redeploy)
const CACHE = "b2-v9";
const CORE  = ["./","./index.html","./manifest.json","./icons/icon-192.png","./icons/icon-512.png"];

self.addEventListener("install",  e => { e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{})); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))); self.clients.claim(); });

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const u = e.request.url;
  if (u.includes("firestore") || u.includes("firebase") || u.includes("googleapis") || u.includes("gstatic") || u.includes("mlc") || u.includes("esm.run") || u.includes("huggingface") || u.includes("jsdelivr") || u.includes("cdnjs")) return;
  const isShell = e.request.mode === "navigate" || u.endsWith("/") || u.endsWith("/index.html") || u.endsWith("/manifest.json");
  if (isShell) {
    e.respondWith(fetch(e.request).then(r=>{ const c=r.clone(); caches.open(CACHE).then(ca=>ca.put(e.request,c)).catch(()=>{}); return r; }).catch(()=>caches.match(e.request)));
  } else {
    e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).catch(()=>c)));
  }
});

self.addEventListener("message", ev => {
  const m = ev.data;
  if (!m || m.type !== "SCHEDULE_REMINDER") return;
  setTimeout(() => {
    self.registration.showNotification(m.title, { body:m.body, tag:m.tag, icon:"./icons/icon-192.png", badge:"./icons/icon-96.png", vibrate:[200,100,200] });
  }, Math.max(0, m.delay));
});

self.addEventListener("notificationclick", ev => {
  ev.notification.close();
  ev.waitUntil(self.clients.matchAll({type:"window"}).then(cs=>{ const w=cs.find(c=>c.url.includes(self.location.origin)); return w?w.focus():self.clients.openWindow("./"); }));
});