// LignoWolfi Handy – offline: App-Dateien im Speicher halten
const V='lwh-16';const DATEIEN=['./','index.html','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png','vgl.js','vgl-worker.js','dendro.js','foto.js','sym_normal.png','sym_umgekehrt.png','pfeil_tafel.jpg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(DATEIEN.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const same=new URL(e.request.url).origin===location.origin;e.respondWith(fetch(e.request,same?{cache:'no-cache'}:undefined).then(r=>{const c=r.clone();caches.open(V).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('index.html'))))});
