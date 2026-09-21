(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.MonoidPlaytestBatchStore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const DB_NAME='monoid-playtest-batches-v1',STORE='runs';
  const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
  function create(options={}){
    const idb=options.indexedDB===undefined?(typeof indexedDB!=='undefined'?indexedDB:null):options.indexedDB;
    const memory=new Map();let disabled=!idb,dbPromise=null;
    function open(){
      if(disabled)return Promise.resolve(null);if(dbPromise)return dbPromise;
      dbPromise=new Promise((resolve,reject)=>{let req;try{req=idb.open(DB_NAME,1)}catch(error){disabled=true;reject(error);return}req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'runId'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('IndexedDB open failed'))}).catch(()=>{disabled=true;return null});return dbPromise
    }
    async function request(mode,action){
      const db=await open();if(!db)return null;
      return new Promise(resolve=>{let settled=false,req;try{const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);req=action(store);req.onsuccess=()=>{settled=true;resolve(req.result)};req.onerror=()=>{settled=true;resolve(null)};tx.onabort=()=>{if(!settled)resolve(null)}}catch(_){resolve(null)}})
    }
    async function archive(record){
      if(!record?.runId)return{ok:false,reason:'run-id'};const item={...clone(record),exportedBatchId:record.exportedBatchId||null,archivedAt:record.archivedAt||Date.now()};memory.set(item.runId,item);if(disabled)return{ok:true,backend:'memory'};const result=await request('readwrite',store=>store.put(item));return{ok:result!=null,backend:result!=null?'indexeddb':'memory'}
    }
    async function all(){
      const merged=new Map(memory);if(!disabled){const records=await request('readonly',store=>store.getAll());if(Array.isArray(records))for(const item of records)merged.set(item.runId,item)}return[...merged.values()].map(clone)
    }
    async function pending(playerId){const records=await all();return records.filter(r=>(!playerId||r.playerId===playerId)&&!r.exportedBatchId).sort((a,b)=>(a.runSequence||0)-(b.runSequence||0)||(a.archivedAt||0)-(b.archivedAt||0))}
    async function markExported(runIds,batchId){
      const ids=new Set(runIds||[]),stamp=Date.now();
      for(const id of ids){const item=memory.get(id);if(item)memory.set(id,{...item,exportedBatchId:batchId,exportedAt:stamp})}
      if(!disabled){const records=await request('readonly',store=>store.getAll())||[];for(const item of records)if(ids.has(item.runId)){item.exportedBatchId=batchId;item.exportedAt=stamp;await request('readwrite',store=>store.put(item))}for(const item of records)if(item.exportedBatchId&&item.exportedBatchId!==batchId)await request('readwrite',store=>store.delete(item.runId))}
      for(const [id,item] of memory)if(item.exportedBatchId&&item.exportedBatchId!==batchId)memory.delete(id);return{ok:true,batchId,runIds:[...ids]}
    }
    async function clear(){memory.clear();if(!disabled)await request('readwrite',store=>store.clear());return true}
    return{archive,pending,markExported,all,clear,backend:()=>disabled?'memory':'indexeddb'}
  }
  return{create,DB_NAME,STORE}
});
