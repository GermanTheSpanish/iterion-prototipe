(function(root,factory){
  const api=factory(root.IterionData);
  if(typeof module==='object'&&module.exports) module.exports=factory(require('./data.js'));
  root.IterionGame=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(D){
  function createGame(E,opts={}){
    if(!E) throw new Error('IterionEngine required');
    const cfg=Object.assign({},D,opts);
    let s={};
    function rnd(){s.rngState=(s.rngState+0x6D2B79F5)|0;let t=s.rngState;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}
    function sh(a){for(let i=a.length-1;i;i--){let j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
    function makeSet(){let a=[];for(let i=0;i<=6;i++)for(let j=i;j<=6;j++)a.push({a:i,b:j});return sh(a)}
    const isZero=t=>!!t&&(t.a===0||t.b===0);
    const countZero=a=>a.filter(isZero).length;
    function drawOne(){if(!s.reserve.length)return null;const t=s.reserve.shift();if(isZero(t))s.roundZero.drawn++;return t}
    function initialHand(){s.hand=Array(cfg.HAND_SIZE).fill(null).map(()=>drawOne())}
    function target(){return cfg.TARGETS[s.round]}
    function hasLegal(){return s.pieces.length===0?s.hand.some(Boolean):E.hasLegalMove(s.hand.filter(Boolean),s.pieces,[0])}
    function assessContinuation(){
      s.needsReroll=false;
      if(s.cleared)return;
      if(s.roundTurn>=cfg.MAX_PLACEMENTS){s.blocked=true;s.roundZero.endHand=countZero(s.hand.filter(Boolean));return}
      if(hasLegal()){s.blocked=false;return}
      if(!s.rerollUsed){s.blocked=false;s.needsReroll=true;return}
      s.blocked=true;s.roundZero.endHand=countZero(s.hand.filter(Boolean));
    }
    function startRound(){
      s.reserve=makeSet();
      if(s.round===0)s.initialOrder=s.reserve.map(t=>({...t}));
      s.pieces=[];s.score=0;s.roundTurn=0;s.rerollUsed=false;s.rootRR=0;s.roundZero={drawn:0,placed:0,endHand:0};
      initialHand();s.cleared=s.blocked=s.needsReroll=false;
    }
    function fresh(seedOverride){
      const seed=(seedOverride==null?(typeof crypto!=='undefined'&&crypto.getRandomValues?crypto.getRandomValues(new Uint32Array(1))[0]:Math.floor(Math.random()*4294967296)):seedOverride)>>>0;
      s={reserve:[],hand:[],pieces:[],score:0,best:0,round:0,roundTurn:0,turn:0,wins:[],events:[],idc:0,running:false,cleared:false,blocked:false,needsReroll:false,rerollUsed:false,rootRR:0,seed,rngState:seed|0,runId:`${Date.now().toString(36)}-${seed.toString(36)}`,startedAt:new Date().toISOString(),initialOrder:[],roundZero:{drawn:0,placed:0,endHand:0}};
      startRound();return s;
    }
    function setRootRotation(rr){if(s.pieces.length||s.running)return false;s.rootRR=((rr%4)+4)%4;return true}
    function rotateRoot(){return setRootRotation(s.rootRR+1)}
    function rootPlacements(tile){let out=[];for(let y=0;y<=E.H-2;y++)for(let x=0;x<=E.G-2;x++){let p=E.pieceFrom(tile,x,y,0,s.rootRR,-1);if(p.rect.minx>=0&&p.rect.miny>=0&&p.rect.maxx<=E.G&&p.rect.maxy<=E.H)out.push({x,y,z:0,rr:s.rootRR})}return out}
    function candidatesForIndex(i){const tile=s.hand[i];if(!tile)return[];return s.pieces.length?E.allPlacements(tile,0,s.pieces):rootPlacements(tile)}
    function canInteract(){return !s.running&&!s.cleared&&!s.blocked&&!s.needsReroll}
    function beginPlacement(i,c){
      if(!canInteract()||i<0||i>=s.hand.length||!s.hand[i])return{ok:false,reason:'state'};
      const tile=s.hand[i];
      if(s.pieces.length){const v=E.validatePlacement(tile,c.x,c.y,0,c.rr,s.pieces);if(!v.ok)return{ok:false,reason:v.reason||'invalid'}}
      else{const p0=E.pieceFrom(tile,c.x,c.y,0,c.rr,-1);if(p0.rect.minx<0||p0.rect.miny<0||p0.rect.maxx>E.G||p0.rect.maxy>E.H)return{ok:false,reason:'bounds'}}
      s.running=true;
      const p=E.pieceFrom(tile,c.x,c.y,0,c.rr,++s.idc);s.pieces.push(p);
      const trigger=tile.a+tile.b;
      const sim=s.pieces.length===1?{output:trigger,events:[],reason:'root',rebounds:0,search:{starts:0,leaves:1,expanded:0}}:E.bestSignal(p.id,s.pieces,{initialOutput:trigger});
      if(isZero(tile))s.roundZero.placed++;
      s.hand[i]=drawOne();
      s.turn++;s.roundTurn++;
      return{ok:true,tile,p,trigger,sim,handIndex:i};
    }
    function finishPlacement(ctx){
      if(!ctx?.ok)return ctx;
      const {tile,p,trigger,sim}=ctx;
      s.score=sim.output??trigger;s.best=Math.max(s.best,s.score);s.cleared=s.score>=target();
      const st=(sim.events||[]).find(e=>e.type==='start'),rs=(sim.events||[]).filter(e=>e.type==='route');
      s.events.push({turn:s.turn,round:s.round+1,roundTurn:s.roundTurn,tile:{a:tile.a,b:tile.b},placement:{x:p.cubes[0].x,y:p.cubes[0].y,z:0,rr:p.rr},dir:E.ARROW[p.rr],target:target(),trigger,output:s.score,rebounds:sim.rebounds||0,start:st?.key||'-',flipped:!!st?.flipped,reason:sim.reason,ops:(sim.events||[]).filter(e=>e.type==='op').map(e=>e.op==='multiply'?`${e.piece}:×${e.factor} ${e.before}>${e.after}${e.reverse?'R':''}`:`${e.piece}:+${e.add} ${e.before}>${e.after}${e.reverse?'R':''}`).join(','),routes:rs.map(e=>`${e.piece}:${e.entryHalf}>${e.toPieceId}:${e.toHalf}`).join(';'),search:sim.search?`${sim.search.starts}/${sim.search.leaves}/${sim.search.expanded}${sim.search.truncated?'!':''}`:'-',clear:s.cleared});
      if(s.cleared){s.roundZero.endHand=countZero(s.hand.filter(Boolean));s.wins.push({round:s.round+1,target:target(),output:s.score,turn:s.turn,placements:s.roundTurn,zeros:{...s.roundZero}})}
      else assessContinuation();
      s.running=false;return{ok:true,cleared:s.cleared,blocked:s.blocked,needsReroll:s.needsReroll};
    }
    function reroll(){
      if(s.rerollUsed||s.running||s.cleared||s.blocked)return{ok:false};
      const old=s.hand.filter(Boolean);s.reserve.push(...old);sh(s.reserve);
      s.hand=Array(cfg.HAND_SIZE).fill(null).map(()=>drawOne());
      s.rerollUsed=true;s.needsReroll=false;
      s.events.push({type:'reroll',round:s.round+1,roundTurn:s.roundTurn,hand:s.hand.filter(Boolean).map(t=>({...t}))});
      if(s.pieces.length&&!hasLegal()){s.blocked=true;s.roundZero.endHand=countZero(s.hand.filter(Boolean))}
      return{ok:true,blocked:s.blocked};
    }
    function advance(){if(!s.cleared||s.round>=cfg.TOTAL_ROUNDS-1)return false;s.round++;startRound();return true}
    function status(){return s.cleared&&s.round===cfg.TOTAL_ROUNDS-1?'COMPLETE':s.blocked?'ROUND FAILED':'IN PROGRESS'}
    function snapshot(){return{schema:'iterion.run.v3',gameVersion:cfg.VERSION,engineVersion:cfg.ENGINE_VERSION,runId:s.runId,seed:s.seed,startedAt:s.startedAt,savedAt:new Date().toISOString(),status:status(),round:{index:s.round+1,total:cfg.TOTAL_ROUNDS,target:target(),placements:s.roundTurn,maxPlacements:cfg.MAX_PLACEMENTS,clears:s.wins},score:{last:s.score,best:s.best},turnCount:s.turn,rerollUsed:s.rerollUsed,zeroStats:{...s.roundZero},initialOrder:s.initialOrder,hand:s.hand.filter(Boolean).map(t=>({...t})),reserve:s.reserve.map(t=>({...t})),board:s.pieces.map(p=>({id:p.id,a:p.tile.a,b:p.tile.b,x:p.cubes[0].x,y:p.cubes[0].y,z:0,rr:p.rr})),turns:s.events.map(e=>JSON.parse(JSON.stringify(e)))}}
    function debugText(){const x=snapshot(),lines=[`ITERION DEBUG v${x.gameVersion}`,`Run ID: ${x.runId}`,`Seed: ${x.seed}`,`Result: ${x.status}`,`Round: ${x.round.index}/${x.round.total} · target=${x.round.target} · placements=${x.round.placements}/${x.round.maxPlacements}`,`Last output: ${x.score.last}`,`Best output: ${x.score.best}`,`Round clears: ${x.round.clears.map(w=>`R${w.round} target=${w.target} output=${w.output} placements=${w.placements} zeros=${w.zeros.drawn}/${w.zeros.placed}/${w.zeros.endHand}`).join(' | ')||'-'}`,`Current zeros drawn/placed/in-hand: ${x.zeroStats.drawn}/${x.zeroStats.placed}/${countZero(s.hand.filter(Boolean))}`,''];for(const v of x.turns){if(v.type==='reroll'){lines.push(`R${v.round} REROLL after placement ${v.roundTurn}`);continue}lines.push(`T${v.turn} R${v.round}.${v.roundTurn} [${v.tile.a}|${v.tile.b}] ${v.dir} @${v.placement.x},${v.placement.y},r${v.placement.rr} trigger=${v.trigger} output=${v.output} rebounds=${v.rebounds} start=${v.start}${v.flipped?' FLIPPED':''} reason=${v.reason} ops=${v.ops||'-'} routes=${v.routes||'-'} search=${v.search}${v.clear?' CLEAR':''}`)}return lines.join('\n')}
    function save(){try{const x=snapshot();localStorage.setItem('iterion.latestRun.v3',JSON.stringify(x));return x}catch(_){return snapshot()}}
    fresh(opts.seed);
    return{state:()=>s,config:cfg,target,candidatesForIndex,canInteract,beginPlacement,finishPlacement,reroll,advance,rotateRoot,setRootRotation,fresh,snapshot,debugText,save,hasLegal,assessContinuation};
  }
  return{createGame};
});
