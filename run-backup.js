// Independent, best-effort IndexedDB checkpoints. Gameplay state stays authoritative in game.js.
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.MonoidRunBackup=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const DB_NAME='monoid-run-recovery-v1',STORE='checkpoints';
  function checksum(value){
    let h=2166136261>>>0;
    for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619)}
    return h>>>0
  }
  function parse(payload){
    try{
      const saved=JSON.parse(payload),state=saved?.state;
      if(saved?.schema!=='iterion.state.v1'||!state||typeof state.runId!=='string'||!state.runId||!Array.isArray(state.set)||!Array.isArray(state.pieces))return null;
      return saved
    }catch(_){return null}
  }
  function create(options={}){
    const idb=options.indexedDB===undefined?(typeof indexedDB!=='undefined'?indexedDB:null):options.indexedDB;
    let queue=Promise.resolve(),lastError=null;
    function transaction(mode,action){
      if(!idb)return Promise.reject(new Error('IndexedDB unavailable'));
      return new Promise((resolve,reject)=>{
        let request;
        try{request=idb.open(DB_NAME,1)}catch(e){reject(e);return}
        request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE)};
        request.onerror=()=>reject(request.error||new Error('Recovery database unavailable'));
        request.onblocked=()=>reject(new Error('Recovery database blocked'));
        request.onsuccess=()=>{
          const db=request.result;
          let tx,result;
          try{
            tx=db.transaction(STORE,mode);
            tx.oncomplete=()=>{db.close();resolve(result)};
            tx.onerror=()=>{db.close();reject(tx.error||new Error('Recovery transaction failed'))};
            tx.onabort=()=>{db.close();reject(tx.error||new Error('Recovery transaction aborted'))};
            action(tx.objectStore(STORE),value=>{result=value});
          }catch(e){db.close();reject(e)}
        };
      })
    }
    function enqueue(work){
      const next=queue.catch(()=>{}).then(work);
      queue=next.catch(error=>{lastError=String(error?.message||error);return false});
      return next.catch(()=>false)
    }
    function save(context,payload){
      const saved=parse(payload);
      if(!saved)return Promise.resolve(false);
      const key=String(context||'player'),record={payload,checksum:checksum(payload),savedAt:Number(saved.checkpoint?.savedAt)||0,runId:saved.state.runId};
      return enqueue(()=>transaction('readwrite',(store,finish)=>{
        const req=store.get(key+':latest');
        req.onsuccess=()=>{
          const former=req.result;
          if(former?.payload!==payload){
            if(former?.payload&&checksum(former.payload)===former.checksum)store.put(former,key+':previous');
            store.put(record,key+':latest')
          }
          finish(true)
        };
      }).then(()=>{lastError=null;return true}))
    }
    async function candidates(context){
      await queue;
      try{
        const key=String(context||'player');
        const records=await transaction('readonly',(store,finish)=>{
          const found=[];
          for(const slot of ['latest','previous']){
            const req=store.get(key+':'+slot);
            req.onsuccess=()=>{if(req.result)found.push({...req.result,slot})};
          }
          // All requests complete before transaction completion.
          finish(found)
        });
        return records.filter(r=>typeof r.payload==='string'&&checksum(r.payload)===r.checksum&&parse(r.payload));
      }catch(error){lastError=String(error?.message||error);return []}
    }
    function clear(context){
      const key=String(context||'player');
      return enqueue(()=>transaction('readwrite',(store,finish)=>{
        store.delete(key+':latest');store.delete(key+':previous');finish(true)
      }).then(()=>{lastError=null;return true}))
    }
    async function flush(){await queue;return !lastError}
    return Object.freeze({save,candidates,clear,flush,status:()=>({ok:!lastError,error:lastError}),parse});
  }
  return Object.freeze({create,parse,checksum,DB_NAME});
});
