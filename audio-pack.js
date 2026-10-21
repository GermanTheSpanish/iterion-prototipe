// Private audio packs stay in IndexedDB. No commercial stems are fetched or uploaded.
export const PACK_MAGIC='MONOIDP1';
export const PACK_SCHEMA='monoid-audio-pack-v1';
export const AUDIO_PACK_DB='monoid-private-audio-v1';
const HEADER_BYTES=12,MAX_MANIFEST=1024*1024;
const IDS='ABCDEF';
function ensure(value,description){if(!value)throw new Error('Audio pack: '+description)}
function integer(n){return Number.isSafeInteger(n)&&n>=0}
export async function parseAudioPack(blob){
 ensure(blob&&typeof blob.slice==='function'&&blob.size>=HEADER_BYTES,'missing or truncated file');
 const prefix=new Uint8Array(await blob.slice(0,HEADER_BYTES).arrayBuffer());
 ensure(String.fromCharCode(...prefix.slice(0,8))===PACK_MAGIC,'unsupported file signature');
 const size=new DataView(prefix.buffer).getUint32(8,true);
 ensure(size>0&&size<=MAX_MANIFEST&&HEADER_BYTES+size<blob.size,'invalid manifest length');
 let manifest;
 try{manifest=JSON.parse(new TextDecoder().decode(await blob.slice(HEADER_BYTES,HEADER_BYTES+size).arrayBuffer()))}
 catch{throw new Error('Audio pack: invalid manifest JSON')}
 ensure(manifest?.schema===PACK_SCHEMA,'unsupported schema');
 ensure(manifest.codec==='aac-lc'&&manifest.private===true,'private AAC-LC pack required');
 ensure(integer(manifest.sampleRateHz)&&manifest.sampleRateHz>=22050&&manifest.sampleRateHz<=96000,'invalid sample rate');
 ensure(manifest.channels===2,'expected stereo stems');
 ensure(integer(manifest.segmentSamples)&&manifest.segmentSamples>0,'invalid segment length');
 ensure(integer(manifest.segmentCount)&&manifest.segmentCount>0&&manifest.segmentCount<=256,'invalid segment count');
 ensure(manifest.totalSamples===manifest.segmentCount*manifest.segmentSamples,'segment timeline mismatch');
 const offset=HEADER_BYTES+size;
 const ranges=[];
 ensure(manifest.stems&&typeof manifest.stems==='object','missing stems');
 for(const [id,stem] of Object.entries(manifest.stems)){
  ensure(IDS.includes(id),'unknown stem id');
  ensure(stem&&Array.isArray(stem.segments)&&stem.segments.length===manifest.segmentCount,'missing segment for '+id);
  for(const seg of stem.segments){
   ensure(integer(seg.offset)&&integer(seg.bytes)&&seg.bytes>128,'invalid segment range');
   ensure(offset+seg.offset+seg.bytes<=blob.size,'segment outside pack');
   ranges.push([seg.offset,seg.offset+seg.bytes]);
  }
 }
 ensure(manifest.stems.F,'F Drum is required');
 ranges.sort((a,b)=>a[0]-b[0]);
 for(let i=0;i<ranges.length;i++){
  ensure(i===0?ranges[i][0]===0:ranges[i][0]===ranges[i-1][1],'missing or overlapping segment');
 }
 ensure(offset+ranges.at(-1)[1]===blob.size,'unexpected trailing data');
 return Object.freeze({blob,manifest,offset,ids:Object.keys(manifest.stems)});
}
function requestResult(request){
 return new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||new Error('Audio storage request failed'))});
}
async function open(){
 if(typeof indexedDB==='undefined')throw new Error('Persistent audio storage unavailable in this browser');
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open(AUDIO_PACK_DB,1);
  request.onupgradeneeded=()=>request.result.createObjectStore('packs');
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||new Error('Audio storage unavailable'));
  request.onblocked=()=>reject(new Error('Audio storage is blocked by another tab'));
 });
}
async function transaction(action,mode){
 const db=await open();
 try{
  const tx=db.transaction('packs',mode),req=action(tx.objectStore('packs'));
  // Wait for the transaction, not only the request, before confirming persistence.
  const done=new Promise((resolve,reject)=>{
   tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||new Error('Audio storage write failed'));
   tx.onabort=()=>reject(tx.error||new Error('Audio storage aborted'));
  });
  const value=await requestResult(req);await done;return value;
 }finally{db.close()}
}
export async function saveAudioPack(blob){
 const pack=await parseAudioPack(blob);
 await transaction(store=>store.put(blob,'active'),'readwrite');
 return pack;
}
export async function loadAudioPack(){
 const blob=await transaction(store=>store.get('active'),'readonly');
 if(!blob)return null;
 return parseAudioPack(blob);
}
export async function deleteAudioPack(){return transaction(store=>store.delete('active'),'readwrite')}
