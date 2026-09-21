(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.MonoidPlaytestTelemetry=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const PLAYER_KEY='monoid.playtestPlayer.v1',RUN_KEY='monoid.playtestRun.v1',BATCH_KEY='monoid.playtestBatch.v1',LAST_BATCH_KEY='monoid.playtestLastBatch.v1';
  const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
  const finite=value=>Number.isFinite(Number(value))?Number(value):0;
  const bucket=()=>({activeMs:0,decisionMs:0,cascadeMs:0,placements:0,markets:0,marketMs:0});
  const duration=ms=>{const total=Math.max(0,Math.round(finite(ms)/1000)),h=Math.floor(total/3600),m=Math.floor(total%3600/60),s=total%60;return(h?String(h).padStart(2,'0')+':':'')+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')};
  function create(options={}){
    const storage=options.storage||null,now=options.now||(()=>Date.now()),randomUint32=options.randomUint32||(()=>{
      try{if(typeof crypto!=='undefined'&&crypto.getRandomValues)return crypto.getRandomValues(new Uint32Array(1))[0]>>>0}catch(_){}
      return((Math.random()*0xffffffff)>>>0)
    });
    let state=null,activeSince=null;
    const read=key=>{try{return JSON.parse(storage?.getItem(key)||'null')}catch(_){return null}};
    const write=(key,value)=>{try{storage?.setItem(key,JSON.stringify(value));return true}catch(_){return false}};
    const makeId=prefix=>prefix+'-'+randomUint32().toString(36).toUpperCase().padStart(7,'0').slice(-7);
    function profile(){
      let p=read(PLAYER_KEY);
      if(!p?.playerId){p={version:1,playerId:makeId('P'),runSequence:0};write(PLAYER_KEY,p)}
      if(!Number.isInteger(p.runSequence)||p.runSequence<0)p.runSequence=0;
      return p
    }
    function ensureBatch(){
      let b=read(BATCH_KEY);
      if(!b?.batchId)b={version:1,batchId:makeId('B'),createdAt:now(),runs:[]};
      if(!Array.isArray(b.runs))b.runs=[];
      write(BATCH_KEY,b);return b
    }
    const ensureBucket=(collection,key)=>collection[key]||(collection[key]=bucket());
    function migrate(saved,p,batch){
      return{...saved,version:2,rounds:saved.rounds||{},stages:saved.stages||{},markets:saved.markets||[],marketOpen:saved.marketOpen||null,placements:Array.isArray(saved.placements)?saved.placements:[],status:saved.status||'active',statusReason:saved.statusReason||null,finalized:!!saved.finalized,batchId:saved.batchId||batch.batchId,playerId:saved.playerId||p.playerId}
    }
    function persistedState(){return state?clone(state):null}
    function persist(){if(state)write(RUN_KEY,persistedState())}
    function checkpoint(){
      if(!state||activeSince==null)return;
      const t=now(),delta=Math.max(0,t-activeSince);activeSince=t;state.activeMs+=delta;
      ensureBucket(state.rounds,String(state.round)).activeMs+=delta;
      ensureBucket(state.stages,String(state.stage)).activeMs+=delta;
      persist()
    }
    function activeElapsed(){return state?state.activeMs+(activeSince==null?0:Math.max(0,now()-activeSince)):0}
    function snapshot(){
      if(!state)return null;checkpoint();const out=persistedState();out.wallClockMs=Math.max(0,(state.endedAt||now())-state.wallStartedAt);out.activePlayMs=state.activeMs;out.decisionAverageMs=state.decisionCount?state.decisionTotalMs/state.decisionCount:0;out.cascadeAverageMs=state.cascadeCount?state.cascadeTotalMs/state.cascadeCount:0;out.marketTotalMs=state.markets.reduce((sum,m)=>sum+m.durationMs,0);out.marketAverageMs=state.markets.length?out.marketTotalMs/state.markets.length:0;return out
    }
    function summary(){
      const x=snapshot();if(!x)return null;const last=x.placements[x.placements.length-1]||null;
      return{runId:x.runId,playerId:x.playerId,runSequence:x.runSequence,status:x.status,statusReason:x.statusReason||null,wallStartedAt:x.wallStartedAt,endedAt:x.endedAt||null,round:x.round,stage:x.stage,activePlayMs:x.activePlayMs,decisionTotalMs:x.decisionTotalMs,decisionCount:x.decisionCount,cascadeTotalMs:x.cascadeTotalMs,cascadeCount:x.cascadeCount,marketVisits:x.markets.length,placementTelemetryCount:x.placements.length,topology:last?.topologyAfter||last?.topologyBefore||null}
    }
    function upsertBatchRun(item){
      if(!item)return;const batch=ensureBatch(),at=batch.runs.findIndex(r=>r.runId===item.runId);if(at>=0)batch.runs[at]=item;else batch.runs.push(item);write(BATCH_KEY,batch)
    }
    function finalizeCurrent(status='abandoned',meta={}){
      if(!state)return null;checkpoint();activeSince=null;state.status=status;state.statusReason=meta.reason||state.statusReason||null;state.endedAt=state.endedAt||now();state.finalized=true;persist();const item=summary();upsertBatchRun(item);return clone(item)
    }
    function bindRun({runId,round=1,stage=1}={}){
      if(!runId)return null;
      const saved=read(RUN_KEY),p=profile(),batch=ensureBatch();
      if(saved?.runId===runId&&(saved.playerId||p.playerId)===p.playerId){
        state=migrate(saved,p,batch);state.sessions=(state.sessions||0)+1
      }else{
        if(saved?.runId&&!saved.finalized){state=migrate(saved,p,batch);finalizeCurrent(saved.status==='failed'?'failed':'abandoned',{reason:'new-run-unarchived'})}
        p.runSequence+=1;write(PLAYER_KEY,p);
        state={version:2,runId,playerId:p.playerId,runSequence:p.runSequence,batchId:batch.batchId,wallStartedAt:now(),activeMs:0,round,stage,rounds:{},stages:{},decisionStartedAtActiveMs:null,decisionTotalMs:0,decisionCount:0,cascadeTotalMs:0,cascadeCount:0,markets:[],marketOpen:null,placements:[],sessions:1,status:'active',statusReason:null,endedAt:null,finalized:false}
      }
      activeSince=null;setContext(round,stage);persist();return snapshot()
    }
    function resume(){if(!state||activeSince!=null||state.finalized)return;activeSince=now()}
    function pause(){if(!state)return;checkpoint();activeSince=null;persist()}
    function setContext(round=state?.round||1,stage=state?.stage||1){
      if(!state)return;const nextRound=Math.max(1,finite(round)||1),nextStage=Math.max(1,finite(stage)||1),changed=nextRound!==state.round||nextStage!==state.stage;
      checkpoint();if(changed)state.decisionStartedAtActiveMs=null;state.round=nextRound;state.stage=nextStage;ensureBucket(state.rounds,String(state.round));ensureBucket(state.stages,String(state.stage));persist()
    }
    function startDecision(){if(!state||state.finalized||state.decisionStartedAtActiveMs!=null)return;state.decisionStartedAtActiveMs=activeElapsed();persist()}
    function recordDecision(){
      if(!state||state.finalized||state.decisionStartedAtActiveMs==null)return 0;
      const ms=Math.max(0,activeElapsed()-state.decisionStartedAtActiveMs);state.decisionStartedAtActiveMs=null;state.decisionTotalMs+=ms;state.decisionCount+=1;
      const r=ensureBucket(state.rounds,String(state.round)),s=ensureBucket(state.stages,String(state.stage));r.decisionMs+=ms;r.placements+=1;s.decisionMs+=ms;s.placements+=1;persist();return ms
    }
    function recordCascade(ms){
      if(!state||state.finalized)return;ms=Math.max(0,finite(ms));state.cascadeTotalMs+=ms;state.cascadeCount+=1;ensureBucket(state.rounds,String(state.round)).cascadeMs+=ms;ensureBucket(state.stages,String(state.stage)).cascadeMs+=ms;persist()
    }
    function recordPlacement(meta={}){
      if(!state||state.finalized)return null;const entry={round:state.round,stage:state.stage,atActiveMs:Math.round(activeElapsed()),...clone(meta)};state.placements.push(entry);if(state.placements.length>512)state.placements.shift();persist();return clone(entry)
    }
    function openMarket(meta={}){if(!state||state.finalized||state.marketOpen)return;state.marketOpen={round:state.round,stage:state.stage,startedAtActiveMs:activeElapsed(),offers:Array.isArray(meta.offers)?[...meta.offers]:[]};persist()}
    function closeMarket(meta={}){
      if(!state?.marketOpen||state.finalized)return 0;
      const ms=Math.max(0,activeElapsed()-state.marketOpen.startedAtActiveMs),entry={round:state.marketOpen.round,stage:state.marketOpen.stage,durationMs:ms,outcome:meta.outcome||'continue',offers:[...state.marketOpen.offers]};state.markets.push(entry);if(state.markets.length>128)state.markets.shift();const s=ensureBucket(state.stages,String(entry.stage));s.markets+=1;s.marketMs+=ms;state.marketOpen=null;persist();return ms
    }
    function placementLine(p){
      const best=p.evaluationComplete&&p.bestLegalOutput!=null?p.bestLegalOutput:'-',ratio=p.chosenVsBestRatio==null?'-':Number(p.chosenVsBestRatio).toFixed(4),topology=p.topologyAfter||p.topologyBefore||{},bestTile=p.bestPlacement?.tileId?`${p.bestPlacement.tileId}@${p.bestPlacement.x},${p.bestPlacement.y},r${p.bestPlacement.rr}`:'-';
      return`T${p.turn??'?'} R${p.round}/S${p.stage}: chosen=${p.chosenOutput??'-'} best=${best} ratio=${ratio} legal=${p.legalPlacementCount??'-'} evaluated=${p.evaluatedPlacementCount??0}/${p.legalPlacementCount??0} complete=${p.evaluationComplete?'yes':'no'} evalMs=${Math.round(finite(p.evaluationMs))} bestPlacement=${bestTile} rebounds=${p.context?.rebounds??0} splits=${p.context?.splits??0} circuits+${p.context?.newCircuits??0} topology=tiles:${topology.machineSize??'-'},cycles:${topology.cycleRank??'-'},T:${topology.tJunctionCount??'-'},X:${topology.crossCount??'-'},doubles:${topology.doubleCount??'-'},maxDegree:${topology.maxDegree??'-'}`
    }
    function text(){
      const x=snapshot();if(!x)return'PLAYTEST TELEMETRY\nNo normal run bound.';
      const rounds=Object.entries(x.rounds).sort((a,b)=>Number(a[0])-Number(b[0])).map(([id,b])=>`R${id}: active=${duration(b.activeMs)} decision=${duration(b.decisionMs)} cascade=${duration(b.cascadeMs)} placements=${b.placements}`);
      const stages=Object.entries(x.stages).sort((a,b)=>Number(a[0])-Number(b[0])).map(([id,b])=>`S${id}: active=${duration(b.activeMs)} decision=${duration(b.decisionMs)} cascade=${duration(b.cascadeMs)} placements=${b.placements} markets=${b.markets} marketTime=${duration(b.marketMs)}`);
      const markets=x.markets.map((m,i)=>`#${i+1} R${m.round}/S${m.stage}: ${duration(m.durationMs)} outcome=${m.outcome} offers=${m.offers.join(',')||'-'}`),placements=x.placements.map(placementLine),batch=ensureBatch();
      return['PLAYTEST TELEMETRY',`Player: ${x.playerId} · Run #${x.runSequence} · sessions=${x.sessions}`,`Run ID: ${x.runId} · Batch ID: ${x.batchId||batch.batchId} · status=${x.status}${x.statusReason?` (${x.statusReason})`:''}`,`Wall clock: ${duration(x.wallClockMs)} · ${Math.round(x.wallClockMs)}ms`,`Active play: ${duration(x.activePlayMs)} · ${Math.round(x.activePlayMs)}ms`,`Decision time: total=${duration(x.decisionTotalMs)} avg=${duration(x.decisionAverageMs)} placements=${x.decisionCount}`,`Cascade time: total=${duration(x.cascadeTotalMs)} avg=${duration(x.cascadeAverageMs)} cascades=${x.cascadeCount}`,`Market time: total=${duration(x.marketTotalMs)} avg=${duration(x.marketAverageMs)} visits=${x.markets.length}`,'Round timing:',...(rounds.length?rounds:['-']),'Stage timing:',...(stages.length?stages:['-']),'Market visits:',...(markets.length?markets:['-']),'Placement decisions:',...(placements.length?placements:['-'])].join('\n')
    }
    function batchInfo(){const batch=ensureBatch();return{...clone(batch),playerId:profile().playerId,currentRunId:state?.runId||null,currentRunSequence:state?.runSequence||null}}
    function markBatchExported(meta={}){
      const current=ensureBatch(),exported={...clone(current),exportedAt:now(),includedRunIds:Array.isArray(meta.includedRunIds)?[...meta.includedRunIds]:[]};write(LAST_BATCH_KEY,exported);const next={version:1,batchId:makeId('B'),createdAt:now(),runs:[]};write(BATCH_KEY,next);if(state){state.batchId=next.batchId;persist()}return{exported:clone(exported),next:clone(next)}
    }
    return{bindRun,resume,pause,setContext,startDecision,recordDecision,recordCascade,recordPlacement,openMarket,closeMarket,snapshot,text,summary,finalizeCurrent,batchInfo,markBatchExported,identity:()=>clone(profile()),keys:Object.freeze({player:PLAYER_KEY,run:RUN_KEY,batch:BATCH_KEY,lastBatch:LAST_BATCH_KEY})}
  }
  return{create,duration,PLAYER_KEY,RUN_KEY,BATCH_KEY,LAST_BATCH_KEY}
});
