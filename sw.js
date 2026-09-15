const MONOID_SW='monoid-dev-network-v2';
const MONOID_BUILD='20260915.3';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;
  url.searchParams.set('_monoidAsset',MONOID_BUILD);
  event.respondWith(fetch(url.href,{cache:'no-store'}))
});
