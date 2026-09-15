const MONOID_SW='monoid-dev-network-v2';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;
  url.searchParams.set('_monoidFresh',`${Date.now()}-${Math.random().toString(36).slice(2,7)}`);
  event.respondWith(fetch(url.href,{cache:'no-store'}))
});
