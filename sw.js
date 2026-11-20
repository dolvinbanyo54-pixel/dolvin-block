const C='dolvin-v8';
const CORE=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png'];
const EXTRAS=[
  'https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800&display=swap'
];
const INDEX=new URL('./index.html',self.location.href).href;

self.addEventListener('install',e=>{
  e.waitUntil(
    caches.open(C)
      .then(c=>c.addAll(CORE)
        .then(()=>Promise.all(EXTRAS.map(u=>
          fetch(new Request(u,{mode:'no-cors'}))
            .then(r=>{if(r&&(r.ok||r.type==='opaque'))return c.put(u,r)})
            .catch(()=>{})
        )))
      )
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k.indexOf('dolvin-')===0&&k!==C).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

function put(req,res){
  if(res&&(res.ok||res.type==='opaque')){
    const cp=res.clone();
    caches.open(C).then(c=>c.put(req,cp)).catch(()=>{});
  }
}

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.protocol!=='http:'&&url.protocol!=='https:')return;

  // Halaman: utamakan versi terbaru dari GitHub Pages, cache hanya untuk offline.
  if(req.mode==='navigate'){
    e.respondWith(
      fetch(req,{cache:'no-store'})
        .then(res=>{put(req,res);return res})
        .catch(()=>caches.match(req,{ignoreSearch:true})
          .then(m=>m||caches.match(INDEX))
          .then(m=>m||new Response('Offline',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}})))
    );
    return;
  }

  // Aset: pakai cache dulu, perbarui di belakang layar (stale-while-revalidate).
  e.respondWith(
    caches.match(req).then(m=>{
      const net=fetch(req)
        .then(res=>{put(req,res);return res})
        .catch(()=>m);
      return m||net;
    })
  );
});
