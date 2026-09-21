(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.MonoidPlaytestTelemetry=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const PLAYER_KEY='monoid.playtestPlayer.v1',RUN_KEY='monoid.playtestRun.v1';
  const clone=value=>JSON.parse(JSON.stringify(value));
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
    const write=(key,value)=>{try{storage?.setItem(key,JSON.stringify(value))}catch(_){}};
    function profile(){
      let p=read(PLAYER_KEY);
      if(!p?.playerId){
        const token=randomUint32().toString(36).toUpperCase().padStart(7,'0').slice(-7);
        p={version:1,playerId:'P-'+token,runSequence:0};write(PLAYER_KEY,p)
      }
      if(!Number.isInteger(p.runSequence)||p.runSequence<0)p.runSequence=0;
      return p
    }
    const ensureBucket=(collection,key)=>collection[key]||(collection[key]=bucket());
    function persistedState(){
      if(!state)return null;const out=clone(state);delete out.activeSince;return out
    }
    function persist(){if(state)write(RUN_KEY,persistedState())}
    function checkpoint(){
      if(!state||activeSince==null)return;
      const t=now(),delta=Math.max(0,t-activeSince);activeSince=t;state.activeMs+=delta;
      ensureBucket(state.rounds,String(state.round)).activeMs+=delta;
      ensureBucket(state.stages,String(state.stage)).activeMs+=delta;
      persist()
    }
    function activeElapsed(){return state?state.activeMs+(activeSince==null?0:Math.max(0,now()-activeSince)):0}
    function bindRun({runId,round=1,stage=1}={}){
      if(!runId)return null;
      const saved=read(RUN_KEY),p=profile();
      if(saved?.runId===runId&&saved.playerId===p.playerId){
        state={...saved,rounds:saved.rounds||{},stages:saved.stages||{},markets:saved.markets||[],marketOpen:saved.marketOpen||null};state.sessions=(state.sessions||0)+1
      }else{
        p.runSequence+=1;write(PLAYER_KEY,p);
        state={version:1,runId,playerId:p.playerId,runSequence:p.runSequence,wallStartedAt:now(),activeMs:0,round,stage,rounds:{},stages:{},decisionStartedAtActiveMs:null,decisionTotalMs:0,decisionCount:0,cascadeTotalMs:0,cascadeCount:0,markets:[],marketOpen:null,sessions:1,partial:false}
      }
      activeSince=null;setContext(round,stage);persist();return snapshot()
    }
    function resume(){if(!state||activeSince!=null)return;activeSince=now()}
    function pause(){if(!state)return;checkpoint();activeSince=null;persist()}
    function setContext(round=state?.round||1,stage=state?.stage||1){
      if(!state)return;checkpoint();state.round=Math.max(1,finite(round)||1);state.stage=Math.max(1,finite(stage)||1);ensureBucket(state.rounds,String(state.round));ensureBucket(state.stages,String(state.stage));persist()
    }
    function startDecision(){if(!state||state.decisionStartedAtActiveMs!=null)return;state.decisionStartedAtActiveMs=activeElapsed();persist()}
    function recordDecision(){
      if(!state||state.decisionStartedAtActiveMs==null)return 0;
      const ms=Math.max(0,activeElapsed()-state.decisionStartedAtActiveMs);state.decisionStartedAtActiveMs=null;state.decisionTotalMs+=ms;state.decisionCount+=1;
      const r=ensureBucket(state.rounds,String(state.round)),s=ensureBucket(state.stages,String(state.stage));r.decisionMs+=ms;r.placements+=1;s.decisionMs+=ms;s.placements+=1;persist();return ms
    }
    function recordCascade(ms){
      if(!state)return;ms=Math.max(0,finite(ms));state.cascadeTotalMs+=ms;state.cascadeCount+=1;ensureBucket(state.rounds,String(state.round)).cascadeMs+=ms;ensureBucket(state.stages,String(state.stage)).cascadeMs+=ms;persist()
    }
    function openMarket(meta={}){
      if(!state||state.marketOpen)return;state.marketOpen={round:state.round,stage:state.stage,startedAtActiveMs:activeElapsed(),offers:Array.isArray(meta.offers)?[...meta.offers]:[]};persist()
    }
    function closeMarket(meta={}){
      if(!state?.marketOpen)return 0;
      const ms=Math.max(0,activeElapsed()-state.marketOpen.startedAtActiveMs),entry={round:state.marketOpen.round,stage:state.marketOpen.stage,durationMs:ms,outcome:meta.outcome||'continue',offers:[...state.marketOpen.offers]};state.markets.push(entry);if(state.markets.length>64)state.markets.shift();
      const s=ensureBucket(state.stages,String(entry.stage));s.markets+=1;s.marketMs+=ms;state.marketOpen=null;persist();return ms
    }
    function snapshot(){
      if(!state)return null;checkpoint();const out=persistedState();out.wallClockMs=Math.max(0,now()-state.wallStartedAt);out.activePlayMs=state.activeMs;out.decisionAverageMs=state.decisionCount?state.decisionTotalMs/state.decisionCount:0;out.cascadeAverageMs=state.cascadeCount?state.cascadeTotalMs/state.cascadeCount:0;out.marketTotalMs=state.markets.reduce((sum,m)=>sum+m.durationMs,0);out.marketAverageMs=state.markets.length?out.marketTotalMs/state.markets.length:0;return out
    }
    function text(){
      const x=snapshot();if(!x)return'PLAYTEST TELEMETRY\nNo normal run bound.';
      const rounds=Object.entries(x.rounds).sort((a,b)=>Number(a[0])-Number(b[0])).map(([id,b])=>`R${id}: active=${duration(b.activeMs)} decision=${duration(b.decisionMs)} cascade=${duration(b.cascadeMs)} placements=${b.placements}`);
      const stages=Object.entries(x.stages).sort((a,b)=>Number(a[0])-Number(b[0])).map(([id,b])=>`S${id}: active=${duration(b.activeMs)} decision=${duration(b.decisionMs)} cascade=${duration(b.cascadeMs)} placements=${b.placements} markets=${b.markets} marketTime=${duration(b.marketMs)}`);
      const markets=x.markets.map((m,i)=>`#${i+1} R${m.round}/S${m.stage}: ${duration(m.durationMs)} outcome=${m.outcome} offers=${m.offers.join(',')||'-'}`);
      return[
        'PLAYTEST TELEMETRY',
        `Player: ${x.playerId} · Run #${x.runSequence} · sessions=${x.sessions}`,
        `Run ID: ${x.runId}`,
        `Wall clock: ${duration(x.wallClockMs)} · ${Math.round(x.wallClockMs)}ms`,
        `Active play: ${duration(x.activePlayMs)} · ${Math.round(x.activePlayMs)}ms`,
        `Decision time: total=${duration(x.decisionTotalMs)} avg=${duration(x.decisionAverageMs)} placements=${x.decisionCount}`,
        `Cascade time: total=${duration(x.cascadeTotalMs)} avg=${duration(x.cascadeAverageMs)} cascades=${x.cascadeCount}`,
        `Market time: total=${duration(x.marketTotalMs)} avg=${duration(x.marketAverageMs)} visits=${x.markets.length}`,
        'Round timing:',...(rounds.length?rounds:['-']),
        'Stage timing:',...(stages.length?stages:['-']),
        'Market visits:',...(markets.length?markets:['-'])
      ].join('\n')
    }
    return{bindRun,resume,pause,setContext,startDecision,recordDecision,recordCascade,openMarket,closeMarket,snapshot,text,identity:()=>clone(profile()),keys:Object.freeze({player:PLAYER_KEY,run:RUN_KEY})}
  }
  return{create,duration,PLAYER_KEY,RUN_KEY}
});
