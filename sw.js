const MONOID_SW='monoid-dev-network-v3';
const MONOID_VERSION='0.32.0';
const MONOID_BUILD='20260918.9';

function compareBuilds(a,b){
  const parts=value=>String(value||'').split(/[^0-9]+/).filter(Boolean).map(Number),aa=parts(a),bb=parts(b),n=Math.max(aa.length,bb.length);
  for(let i=0;i<n;i++){const delta=(aa[i]||0)-(bb[i]||0);if(delta)return delta}
  return 0
}
function freshUrl(input){const url=new URL(input);url.searchParams.set('_monoidFresh',`${Date.now()}-${Math.random().toString(36).slice(2,7)}`);return url.href}
async function fetchFresh(request){return fetch(freshUrl(request.url),{cache:'no-store',credentials:'same-origin'})}
function currentBuildResponse(){return new Response(JSON.stringify({version:MONOID_VERSION,build:MONOID_BUILD}),{status:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store, max-age=0'}})}
async function buildInfoResponse(request){
  try{
    const response=await fetchFresh(request);
    if(response.ok){
      const info=await response.clone().json();
      if(info?.build&&compareBuilds(info.build,MONOID_BUILD)>=0)return response
    }
  }catch(_){ }
  return currentBuildResponse()
}

self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  await self.clients.claim();
  const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of clients)client.postMessage({type:'MONOID_SW_UPDATED',version:MONOID_VERSION,build:MONOID_BUILD})
})()));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;
  if(url.pathname.endsWith('/build.json')){event.respondWith(buildInfoResponse(event.request));return}
  event.respondWith(fetchFresh(event.request))
});
