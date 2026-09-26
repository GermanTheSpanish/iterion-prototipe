(function(root,factory){
  const api=factory(root.IterionData,root.IterionMods,root.IterionCircuits);
  if(typeof module==='object'&&module.exports) module.exports=factory(require('./data.js'),require('./mods.js'),require('./circuits.js'));
  root.IterionGame=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(D,M,C){
function createGame(E,opts={}){
  if(!E)throw new Error('IterionEngine required');
  const cfg=Object.assign({},D,opts);let s={};

  function rnd(){s.rngState=(s.rngState+0x6D2B79F5)|0;let t=s.rngState;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}
  function sh(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
  function shopOfferShuffle(a,generation){
    let state=((s.seed>>>0)^Math.imul(generation,0x9E3779B1))|0;
    const next=()=>{state=(state+0x6D2B79F5)|0;let t=state;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};
    for(let i=a.length-1;i>0;i--){const j=Math.floor(next()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
    return a
  }
  function makePersistentSet(){let a=[];for(let i=0;i<=6;i++)for(let j=i;j<=6;j++)a.push({id:`d${i}-${j}`,a:i,b:j,upgrade:0,source:'base'});return a}
  function generationPower(generation){const levels=cfg.POWER_MULTIPLIERS;return levels[Math.min(levels.length-1,Math.max(0,generation-1))]}
  function makePowerSet(generation){const power=generationPower(generation),out=[];for(let a=0;a<=6;a++)for(let b=a;b<=6;b++)out.push({id:`g${generation}-d${a}-${b}`,a,b,upgrade:0,source:'power-set',generation,powerMultiplier:power});return out}
  function nextSetGeneration(){return Math.max(2,(s.setGeneration||1)+1)}
  function ensureShopTileOffers(){
    const generation=nextSetGeneration();
    if(s.shopTileOfferGeneration===generation&&Array.isArray(s.shopTileOffers))return s.shopTileOffers;
    const existing=new Set((s.set||[]).map(t=>t.id)),candidates=makePowerSet(generation).filter(t=>!existing.has(t.id));
    shopOfferShuffle(candidates,generation);
    s.shopTileOfferGeneration=generation;s.shopTileOffers=candidates.slice(0,cfg.SHOP_TILE_OFFER_COUNT||4);
    return s.shopTileOffers
  }
  const cloneTile=t=>{if(!t)return null;const out={id:t.id,a:t.a,b:t.b,upgrade:t.upgrade||0,source:t.source||'base'};if((t.generation||1)>1)out.generation=t.generation;if((t.powerMultiplier||1)>1)out.powerMultiplier=t.powerMultiplier;return out};
  const isZero=t=>!!t&&(t.a===0||t.b===0),countZero=a=>a.filter(isZero).length,isDouble=t=>!!t&&t.a===t.b;
  const TILE_MOD_FIELDS=Object.freeze({
    'double-double':'doubleDoubleTileId',
    'double-echo':'doubleEchoTileId',
    'triple-double':'tripleDoubleTileId',
    'parity-exchange':'parityExchangeTileId',
    'corner':'cornerTileId',
    'long-line':'longLineTileId',
    'overload':'overloadTileId',
    'terminal':'terminalTileId',
    'diode':'diodeTileId',
    'return':'returnTileId',
    'twin':'twinTileId',
    'pair':'pairTileId',
    'bridge':'bridgeTileId',
    'gate':'gateTileId',
    'fan':'fanTileId',
    'broker':'brokerTileId',
    'crown':'crownTileId',
    'spend':'spendTileId',
    'merge':'mergeTileId',
    'hinge':'hingeTileId',
    'bank':'bankTileId',
    'toll':'tollTileId',
    'foundation':'foundationTileId',
    'knot':'knotTileId',
    'mirror':'mirrorTileId',
    'mint':'mintTileId'
  });
  function assignedTileIdsForMod(id){
    if(id==='zero-port')return Array.isArray(s.zeroPortTileIds)?s.zeroPortTileIds.filter(Boolean):[];
    const field=TILE_MOD_FIELDS[id];return field&&s[field]?[s[field]]:[]
  }
  function setSingleTileMod(id,tileId){const field=TILE_MOD_FIELDS[id];if(!field)return false;s[field]=tileId||null;return true}
  function allTileModAssignments(){
    const out={};for(const id of Object.keys(TILE_MOD_FIELDS))out[id]=assignedTileIdsForMod(id);
    out['zero-port']=assignedTileIdsForMod('zero-port');return out
  }
  function tileHasExclusiveMod(tileId){return tileId===s.doubleDoubleTileId||tileId===s.doubleEchoTileId}
  function tileHasAnyTileMod(tileId,exceptId=null){
    for(const [id,ids] of Object.entries(allTileModAssignments()))if(id!==exceptId&&ids.includes(tileId))return true;
    return false
  }
  function tileModIdsForTile(tileId){const out=[];for(const [id,ids] of Object.entries(allTileModAssignments()))if(ids.includes(tileId))out.push(id);return out}
  function pieceModifierMap(pieces=s.pieces){
    const byTile=allTileModAssignments(),out=new Map();
    for(const p of pieces){const set=new Set();for(const [id,ids] of Object.entries(byTile))if(ids.includes(p.tile.id))set.add(id);if(set.size)out.set(p.id,set)}
    return out
  }
  function foundationAgeForTile(tileId){
    if(!tileId||tileId!==s.foundationTileId)return 0;
    const baseline=Number.isInteger(s.foundationLastPayoutMarket)?s.foundationLastPayoutMarket:Number.isInteger(s.foundationAssignedMarket)?s.foundationAssignedMarket:(s.marketCount||0);
    return Math.max(0,(s.marketCount||0)-baseline)
  }
  function foundationMaturity(){
    if(!s.foundationTileId)return{cycles:0,amount:0,progress:0};
    const interval=Math.max(1,Number(cfg.FOUNDATION_MARKETS)||3),elapsed=foundationAgeForTile(s.foundationTileId),cycles=Math.floor(elapsed/interval),amount=cycles*Math.max(0,Number(cfg.FOUNDATION_COINS)||3);
    return{cycles,amount,progress:elapsed%interval,interval}
  }
  function awardFoundationIncome(){
    const income=foundationMaturity();if(!income.cycles||!income.amount)return{...income,total:0};
    const interval=income.interval||Math.max(1,Number(cfg.FOUNDATION_MARKETS)||3);
    s.foundationLastPayoutMarket=(Number.isInteger(s.foundationLastPayoutMarket)?s.foundationLastPayoutMarket:Number.isInteger(s.foundationAssignedMarket)?s.foundationAssignedMarket:(s.marketCount||0))+(income.cycles*interval);
    s.coins+=income.amount;s.events.push({type:'foundation-coins',round:s.round+1,marketCount:s.marketCount||0,amount:income.amount,cycles:income.cycles,tileId:s.foundationTileId,coins:s.coins});
    return{...income,total:income.amount,progress:foundationAgeForTile(s.foundationTileId)}
  }
  function knotCycleCountByPiece(ERef=E,pieces=s.pieces){const out=new Map();if(!s.knotTileId)return out;const p=pieces.find(q=>q.tile.id===s.knotTileId);if(!p)return out;const graph=C.adjacency(pieces,ERef.contactBetweenPieces),signatures=C.cycleSignaturesThrough(graph,s.knotTileId,cfg.KNOT_MIN_CYCLE_SIZE||4);out.set(p.id,signatures.length);return out}

  function topologyModIds(){return M.all().filter(m=>m.category==='topology'&&m.topologyRule).map(m=>m.id)}
  function topologyModActive(id,tileId,pieces=s.pieces){
    const mod=M.get(id),piece=pieces.find(p=>p.tile?.id===tileId);if(!mod?.topologyRule||!piece)return false;
    const facts=E.modGeometryFacts(piece,pieces);if(!facts)return false;
    if(mod.topologyRule==='corner')return!!facts.corner;
    if(mod.topologyRule==='long-line')return facts.straightLineLength>=Math.max(1,Number(cfg.LONG_LINE_THRESHOLD)||3);
    if(mod.topologyRule==='overload')return facts.connectionCount>=2;
    if(mod.topologyRule==='terminal')return facts.connectionCount===1;
    if(mod.topologyRule==='pair')return!!facts.pair;
    if(mod.topologyRule==='bridge')return!!facts.bridge;
    if(mod.topologyRule==='knot'){
      const graph=C.adjacency(pieces,E.contactBetweenPieces);
      return C.cycleSignaturesThrough(graph,tileId,cfg.KNOT_MIN_CYCLE_SIZE||4).length>=2
    }
    return false
  }
  function topologyAssignmentState(id,pieces=s.pieces){
    const tileId=assignedTileIdsForMod(id)[0]||null;
    return{tileId,active:!!tileId&&topologyModActive(id,tileId,pieces)}
  }
  function topologyBreaksForPieces(nextPieces){
    const losses=[];
    for(const id of topologyModIds()){
      const current=topologyAssignmentState(id,s.pieces);if(!current.active||topologyModActive(id,current.tileId,nextPieces))continue;
      const mod=M.get(id);losses.push({mod:id,tileId:current.tileId,label:mod?.displayName||id.toUpperCase(),code:mod?.collectionCode||id.slice(0,2).toUpperCase()})
    }
    return losses
  }
  function topologyBreaksForPlacement(i,c){
    if(i<0||i>=s.hand.length||!s.hand[i]||!c)return[];
    const tile=s.hand[i];if(s.placedTileIds.includes(tile.id))return[];
    if(s.pieces.length){const valid=E.validatePlacement(tile,c.x,c.y,0,c.rr,s.pieces);if(!valid.ok)return[]}
    const p=E.pieceFrom(tile,c.x,c.y,0,c.rr,s.idc+1);p.tile={...cloneTile(tile)};
    return topologyBreaksForPieces([...s.pieces,p])
  }
  function removeTopologyMods(losses,causeTileId,{record=true}={}){
    const removed=[];
    for(const loss of losses||[]){
      if(!assignedTileIdsForMod(loss.mod).includes(loss.tileId))continue;
      if(!setSingleTileMod(loss.mod,null))continue;
      const entry={...loss,causeTileId:causeTileId||null};removed.push(entry);
      if(record)s.events.push({type:'topology-mod-lost',round:s.round+1,move:s.turn+1,...entry})
    }
    return removed
  }
  function pruneInactiveTopologyMods({record=false}={}){
    const losses=[];
    for(const id of topologyModIds()){
      const tileId=assignedTileIdsForMod(id)[0]||null;if(!tileId||topologyModActive(id,tileId,s.pieces))continue;
      const mod=M.get(id);losses.push({mod:id,tileId,label:mod?.displayName||id.toUpperCase(),code:mod?.collectionCode||id.slice(0,2).toUpperCase()})
    }
    return removeTopologyMods(losses,null,{record})
  }

  function topologyRuntimeKey(id,tileId,pieces=s.pieces){
    const piece=pieces.find(p=>p.tile?.id===tileId),facts=piece&&E.modGeometryFacts(piece,pieces);if(!facts)return'absent';
    if(id==='corner')return String(!!facts.corner);
    if(id==='long-line')return String(facts.straightLineLength>=Math.max(1,Number(cfg.LONG_LINE_HIGH_THRESHOLD)||5)?3:facts.straightLineLength>=Math.max(1,Number(cfg.LONG_LINE_THRESHOLD)||3)?2:0);
    if(id==='overload')return String(Math.min(Math.max(0,Number(facts.connectionCount)||0),Math.max(1,Number(cfg.OVERLOAD_MAX_MULTIPLIER)||4)));
    if(id==='terminal')return String(facts.connectionCount===1);
    if(id==='pair')return String(!!facts.pair);
    if(id==='bridge')return String(!!facts.bridge);
    if(id==='knot'){const graph=C.adjacency(pieces,E.contactBetweenPieces);return String(C.cycleSignaturesThrough(graph,tileId,cfg.KNOT_MIN_CYCLE_SIZE||4).length)}
    return String(topologyModActive(id,tileId,pieces))
  }
  function hingeOptionForPieces(pieces=s.pieces){
    const state=s.hingeState,tileId=s.hingeTileId;if(!state||!tileId||state.tileId!==tileId||!Array.isArray(state.positions)||state.positions.length!==2)return null;
    const piece=pieces.find(p=>p.tile.id===tileId),pivot=pieces.find(p=>p.tile.id===state.pivotTileId);if(!piece||!pivot)return null;
    const target=state.positions[state.active===1?0:1],others=pieces.filter(p=>p.id!==piece.id);if(!target)return null;
    const valid=E.validatePlacement(piece.tile,target.x,target.y,target.z||0,target.rr,others);let blockedReason=valid.ok?null:(valid.reason||'occupied'),candidate=null;
    if(!blockedReason){candidate=E.pieceFrom(piece.tile,target.x,target.y,target.z||0,target.rr,piece.id);candidate.tile={...piece.tile};const contact=E.contactBetweenPieces(candidate,pivot);if(!contact.touch||!contact.ok)blockedReason='pivot'}
    if(!blockedReason&&candidate){
      const next=pieces.map(p=>p.id===piece.id?candidate:p);
      for(const id of topologyModIds()){const assigned=assignedTileIdsForMod(id)[0];if(assigned&&topologyRuntimeKey(id,assigned,pieces)!==topologyRuntimeKey(id,assigned,next)){blockedReason='topology';break}}
    }
    return{pieceId:piece.id,pivotPieceId:pivot.id,targetPlacement:{x:target.x,y:target.y,z:target.z||0,rr:target.rr},blockedReason}
  }
  function zeroPortPieceIds(pieces=s.pieces){const ids=new Set(assignedTileIdsForMod('zero-port'));return pieces.filter(p=>ids.has(p.tile.id)).map(p=>p.id)}
  const pairList=()=>{const out=[];for(let a=0;a<=6;a++)for(let b=a;b<=6;b++)out.push([a,b]);return out};
  const deepClone=x=>JSON.parse(JSON.stringify(x));
  const stageSize=()=>cfg.STAGE_SIZE||3;
  const baseStageCount=()=>Math.ceil((cfg.TOTAL_ROUNDS||0)/stageSize());
  const canonicalGameMode=mode=>mode==='prototype'||mode==='infinite-endless'?'classic':mode||'classic';
  const infinitePhaseStartRound=()=>Math.max(0,(cfg.TOTAL_ROUNDS||0)+(cfg.INFINITE_PHASE_AFTER_STAGES||15)*stageSize());
  function infinitePhase(roundIndex=s.round){return !!s.endlessMode&&Math.max(0,Number(roundIndex)||0)>=infinitePhaseStartRound()}
  function handSizeForRound(roundIndex=s.round){return infinitePhase(roundIndex)?Math.max(1,Number(cfg.INFINITE_HAND_SIZE)||3):Math.max(1,Number(cfg.HAND_SIZE)||5)}
  function endlessStagesCompleted(roundIndex=s.round){return Math.max(0,Math.floor((Math.max(0,Number(roundIndex)||0)-(cfg.TOTAL_ROUNDS||0))/stageSize()))}

  function availableTileCount(){
    const generation=s.setGeneration||1,placed=new Set(s.placedTileIds||[]);
    return s.set.filter(t=>(t.generation||1)<=generation&&!placed.has(t.id)).length
  }
  function replenishPowerSet(source='draw'){
    const currentGeneration=s.setGeneration||1;
    if(s.reserve.some(t=>(t.generation||1)<=currentGeneration)||availableTileCount()>0)return false;
    const generation=Math.max(2,currentGeneration+1),fullSet=makePowerSet(generation),existing=new Set(s.set.map(t=>t.id)),tiles=fullSet.filter(t=>!existing.has(t.id)),power=fullSet[0]?.powerMultiplier||2;
    s.set.push(...tiles);s.setGeneration=generation;s.reserve.push(...sh(tiles.slice()));ensureShopTileOffers();
    s.events.push({type:'power-set',round:s.round+1,roundTurn:s.roundTurn+1,generation,powerMultiplier:power,size:fullSet.length,source});
    return true
  }
  function drawOne(){if(!s.reserve.length)replenishPowerSet('draw');if(!s.reserve.length)return null;const t=s.reserve.shift();if(isZero(t))s.roundZero.drawn++;return t}
  function fillEmptyHand(){
    let filled=0;
    for(let i=0;i<s.hand.length;i++){
      if(s.hand[i])continue;
      const tile=drawOne();if(!tile)break;
      s.hand[i]=tile;filled++
    }
    return filled
  }
  function initialHand(){
    const handSize=handSizeForRound();s.hand=Array(handSize).fill(null);
    if(cfg.FIRST_TILE_MUST_BE_DOUBLE&&s.turn===0&&!s.pieces.length){
      const di=s.reserve.findIndex(isDouble);
      if(di>=0){const t=s.reserve.splice(di,1)[0];s.hand[0]=t;if(isZero(t))s.roundZero.drawn++;s.events.push({type:'opening-double',round:1,tile:cloneTile(t)})}
    }
    for(let i=0;i<handSize;i++)if(!s.hand[i])s.hand[i]=drawOne();
  }

  function targetForRound(roundIndex=s.round){
    const targets=cfg.TARGETS||[],fixed=targets[roundIndex];
    if(Number.isFinite(fixed))return fixed;
    const lastIndex=Math.max(0,targets.length-1),last=Number(targets[lastIndex])||0;
    return last*Math.pow(cfg.ENDLESS_TARGET_MULTIPLIER||5,Math.max(0,roundIndex-lastIndex))
  }
  function target(){return targetForRound(s.round)}
  function stageIndex(){return Math.floor(s.round/stageSize())}
  function circuitTileLimit(){
    const base=cfg.CIRCUIT_TILE_LIMIT||3;
    if(!s.endlessMode||s.round<cfg.TOTAL_ROUNDS)return base;
    return base+Math.floor((s.round-cfg.TOTAL_ROUNDS)/stageSize())+1
  }
  function boardSizeForStage(stage=stageIndex()){
    const sizes=cfg.BOARD_SIZES||[[18,24]],index=Math.max(0,Math.trunc(Number(stage)||0)),lastIndex=sizes.length-1,last=sizes[lastIndex]||[18,24];
    if(index<=lastIndex||!s.endlessMode)return sizes[Math.min(index,lastIndex)]||last;
    const configured=cfg.INFINITE_BOARD_GROWTH,previous=sizes[Math.max(0,lastIndex-1)]||last;
    const growth=Array.isArray(configured)&&configured.length>=2?configured:[last[0]-previous[0],last[1]-previous[1]],interval=Math.max(1,Number(cfg.INFINITE_BOARD_STAGE_INTERVAL)||2);
    const endlessStageOffset=Math.max(0,index-baseStageCount()),steps=Math.floor(endlessStageOffset/interval);
    return[last[0]+Math.max(1,Number(growth[0])||0)*steps,last[1]+Math.max(1,Number(growth[1])||0)*steps]
  }
  function maxPlacements(){return cfg.MAX_PLACEMENTS+s.extraPlacements}
  function clearRewardBreakdown(){
    const base=cfg.BASE_CLEAR_REWARD??3;
    const quick=s.roundTurn<=(cfg.QUICK_CLEAR_MAX_MOVES??3)?(cfg.QUICK_CLEAR_BONUS??1):0;
    const exact=s.score===target()?(cfg.EXACT_TARGET_BONUS??5):0;
    return{base,quick,exact,total:base+quick+exact}
  }
  function clearReward(){return clearRewardBreakdown().total}
  function hasLegal(){if(!s.pieces.length){if(cfg.FIRST_TILE_MUST_BE_DOUBLE&&s.turn===0)return s.hand.some(isDouble);return s.hand.some(Boolean)}return E.hasLegalMove(s.hand.filter(Boolean),s.pieces,[0])}
  function openingProtectionActive(){return s.round===0&&s.roundTurn===1&&s.turn===1&&s.pieces.length===1}
  function ensureOpeningContinuation(source){
    if(!openingProtectionActive()||hasLegal())return null;
    const legal=t=>E.hasAnyPlacement?E.hasAnyPlacement(t,0,s.pieces):E.allPlacements(t,0,s.pieces).length>0;
    const ri=s.reserve.findIndex(legal);if(ri<0)return null;
    const tile=s.reserve[ri];let slot=s.hand.findIndex(t=>!t),replaced=null;
    if(slot<0){slot=s.hand.length-1;replaced=s.hand[slot];s.reserve[ri]=replaced}else s.reserve.splice(ri,1);
    s.hand[slot]=tile;if(isZero(tile))s.roundZero.drawn++;
    return{type:'opening-protection',round:1,roundTurn:s.roundTurn,source,tile:cloneTile(tile),replaced:cloneTile(replaced)}
  }
  function fail(reason){s.blocked=true;s.needsReroll=false;s.failureReason=reason;s.roundZero.endHand=countZero(s.hand.filter(Boolean));s.events.push({type:'failure',round:s.round+1,roundTurn:s.roundTurn,reason,hand:s.hand.filter(Boolean).map(cloneTile)})}
  function rerollsAvailable(){return(s.freeReroll||0)+(s.consumables?.reroll||0)}
  function applyReroll(automatic=false){
    if(!canUseReroll())return{ok:false,reason:'state'};
    const source=(s.freeReroll||0)>0?'free':'stored';
    if(source==='free')s.freeReroll--;else s.consumables.reroll--;
    if(!automatic)s.undoFrame=null;s.blocked=false;s.failureReason=null;s.needsReroll=false;
    const old=s.hand.filter(Boolean);s.reserve.push(...old);sh(s.reserve);s.hand=Array(handSizeForRound()).fill(null).map(()=>drawOne());
    const protection=ensureOpeningContinuation('reroll');
    s.events.push({type:'reroll',round:s.round+1,roundTurn:s.roundTurn,source,automatic:!!automatic,remaining:s.consumables.reroll,freeRemaining:s.freeReroll||0,hand:s.hand.filter(Boolean).map(cloneTile)});if(protection)s.events.push(protection);
    return{ok:true,source,automatic:!!automatic,remaining:s.consumables.reroll,freeRemaining:s.freeReroll||0}
  }
  function assessContinuation(){
    s.needsReroll=false;if(s.cleared)return{autoRerolls:0};
    if(s.roundTurn>=maxPlacements()){fail('placement-limit');return{autoRerolls:0}}
    if(!s.hand.some(Boolean)&&!s.reserve.length){if(replenishPowerSet('continuation')){s.hand=Array(handSizeForRound()).fill(null).map(()=>drawOne())}else{fail('no-tiles');return{autoRerolls:0}}}
    if(hasLegal()){s.blocked=false;s.failureReason=null;return{autoRerolls:0}}
    let autoRerolls=0;
    s.events.push({type:'recovery-needed',round:s.round+1,roundTurn:s.roundTurn,reason:'no-legal-moves',automatic:true,hand:s.hand.filter(Boolean).map(cloneTile)});
    while(!hasLegal()&&rerollsAvailable()>0){
      const r=applyReroll(true);if(!r.ok)break;autoRerolls++
    }
    if(hasLegal()){s.blocked=false;s.failureReason=null;return{autoRerolls}}
    fail('no-legal-moves');return{autoRerolls}
  }

  function rebuildPiece(old,dx,dy){
    const tile=cloneTile(old.tile);
    const p=E.pieceFrom(tile,old.cubes[0].x+dx,old.cubes[0].y+dy,0,old.rr,old.id);
    p.tile=tile;return p
  }
  function ensureBoardForStage(){
    const [newG,newH]=boardSizeForStage(),old=E.getBoardSize?E.getBoardSize():{G:E.G,H:E.H};
    if(old.G===newG&&old.H===newH){s.boardStage=stageIndex();return}
    const base=(cfg.BOARD_SIZES||[[18,24]])[0]||[18,24];
    const dx=Math.floor((newG-base[0])/2)-Math.floor((old.G-base[0])/2),dy=Math.floor((newH-base[1])/2)-Math.floor((old.H-base[1])/2);
    E.setBoardSize(newG,newH);
    if(s.pieces.length)s.pieces=s.pieces.map(p=>rebuildPiece(p,dx,dy));
    s.boardStage=stageIndex();
    s.events.push({type:'board-expand',stage:s.boardStage+1,from:[old.G,old.H],to:[newG,newH],offset:[dx,dy]})
  }

  function startRound(first=false){
    if(first||!cfg.PERSIST_MACHINE_BETWEEN_ROUNDS){s.pieces=[];s.placedTileIds=[]}
    ensureBoardForStage();
    const used=new Set(s.placedTileIds||[]);
    s.reserve=sh(s.set.filter(t=>!used.has(t.id)).slice());
    if(!s.reserve.length&&availableTileCount()===0)replenishPowerSet('round-start');
    s.score=0;s.roundTurn=0;s.rootRR=0;s.roundZero={drawn:0,placed:0,endHand:0};
    s.extraPlacements=0;s.upgradeCoinsClaimed=[];s.roundUpgradeCoins=0;s.undoFrame=null;
    s.cleared=false;s.blocked=false;s.needsReroll=false;s.failureReason=null;
    s.nextShopType='none';s.intermissionResolved=true;s.shopOpen=false;s.shopType=null;s.shopOffers=[];s.marketBuys=[];
    const previousFree=s.freeReroll||0;s.freeReroll=Math.max(0,Number(cfg.ROUND_REROLL_REWARD??1));
    s.events.push({type:'round-reroll',round:s.round+1,granted:s.freeReroll,replaced:previousFree});
    const newStage=s.round%stageSize()===0,enteringInfinite=infinitePhase()&&s.round===infinitePhaseStartRound();
    initialHand();
    if(enteringInfinite)s.events.push({type:'infinite-phase-start',round:s.round+1,endlessStagesCompleted:endlessStagesCompleted(),handSize:s.hand.length,board:[E.G,E.H]});
    if(newStage)s.events.push({type:'stage-start',stage:stageIndex()+1,round:s.round+1,phase:infinitePhase()?'infinite':s.endlessMode?'endless':'classic',coins:s.coins,inflation:s.inflation,available:availableTileCount(),board:[E.G,E.H],handSize:s.hand.length,freeReroll:s.freeReroll||0,setGeneration:s.setGeneration||1});
    if(s.pieces.length||!s.hand.some(Boolean))assessContinuation()
  }

  function fresh(seedOverride){
    const seed=(seedOverride==null?(typeof crypto!=='undefined'&&crypto.getRandomValues?crypto.getRandomValues(new Uint32Array(1))[0]:Math.floor(Math.random()*4294967296)):seedOverride)>>>0;
    s={set:makePersistentSet(),setGeneration:1,reserve:[],hand:[],pieces:[],placedTileIds:[],score:0,best:0,round:0,roundTurn:0,turn:0,wins:[],events:[],idc:0,running:false,standardComplete:false,endlessMode:false,endlessStartedRound:null,systemStrain:0,endlessLongRunActivations:0,cleared:false,blocked:false,needsReroll:false,failureReason:null,rootRR:0,seed,rngState:seed|0,runId:`${Date.now().toString(36)}-${seed.toString(36)}`,startedAt:new Date().toISOString(),gameMode:canonicalGameMode(cfg.GAME_MODE),roundZero:{drawn:0,placed:0,endHand:0},coins:cfg.STARTING_COINS,inflation:0,consumables:{move:cfg.STARTING_MOVE_CONSUMABLES||0,reroll:cfg.STARTING_REROLL_CONSUMABLES||0,undo:cfg.STARTING_UNDO_CONSUMABLES||0},freeReroll:0,mods:[],extraPlacements:0,upgradeCoinsClaimed:[],roundUpgradeCoins:0,undoFrame:null,anchorId:null,nextShopType:'none',intermissionResolved:true,shopOpen:false,shopType:null,shopOffers:[],shopTileOffers:[],shopTileOfferGeneration:null,marketBuys:[],pendingModPlacement:null,tileSerial:0,boardStage:0,doubleDoubleTileId:null,doubleEchoTileId:null,tripleDoubleTileId:null,zeroPortTileIds:[],parityExchangeTileId:null,cornerTileId:null,longLineTileId:null,overloadTileId:null,terminalTileId:null,diodeTileId:null,diodeInHalf:null,returnTileId:null,twinTileId:null,pairTileId:null,bridgeTileId:null,gateTileId:null,fanTileId:null,brokerTileId:null,crownTileId:null,spendTileId:null,mergeTileId:null,hingeTileId:null,hingeState:null,bankTileId:null,tollTileId:null,tollArmed:false,brokerDiscountReady:false,foundationTileId:null,knotTileId:null,mirrorTileId:null,mintTileId:null,marketCount:0,foundationAssignedMarket:null,foundationLastPayoutMarket:null,mintPaidRound:null};
    s.circuitRanks={};s.circuitSignatures=[];s.pendingCircuit=null;s.pendingModPlacement=null;ensureShopTileOffers();
    startRound(true);return s
  }

  function setRootRotation(rr){if(s.pieces.length||s.running)return false;s.rootRR=((rr%4)+4)%4;return true}
  function rotateRoot(){return setRootRotation(s.rootRR+1)}
  function rootPlacements(tile){let out=[];for(let y=0;y<=E.H-E.S;y++)for(let x=0;x<=E.G-E.S;x++){let p=E.pieceFrom(tile,x,y,0,s.rootRR,-1);if(p.rect.minx>=0&&p.rect.miny>=0&&p.rect.maxx<=E.G&&p.rect.maxy<=E.H)out.push({x,y,z:0,rr:s.rootRR})}return out}
  function candidatesForIndex(i){const tile=s.hand[i];if(!tile)return[];if(!s.pieces.length&&cfg.FIRST_TILE_MUST_BE_DOUBLE&&s.turn===0&&!isDouble(tile))return[];return s.pieces.length?E.allPlacements(tile,0,s.pieces):rootPlacements(tile)}
  function legalHandMask(){return s.hand.map(t=>{if(!t)return false;if(!s.pieces.length)return !(cfg.FIRST_TILE_MUST_BE_DOUBLE&&s.turn===0&&!isDouble(t));return E.hasAnyPlacement?E.hasAnyPlacement(t,0,s.pieces):E.allPlacements(t,0,s.pieces).length>0})}
  function handPlacementDiagnostics(){return s.hand.map((tile,index)=>tile?{index,tile:cloneTile(tile),legalPlacements:candidatesForIndex(index).length}:null).filter(Boolean)}
  function canInteract(){return !s.pendingCircuit&&!s.pendingModPlacement&&!s.running&&!s.cleared&&!s.blocked&&!s.needsReroll&&!s.shopOpen}
  function setTollArmed(value){
    if(!s.tollTileId||s.running||s.shopOpen||s.pendingCircuit||s.pendingModPlacement)return{ok:false,reason:'state'};
    s.tollArmed=!!value;s.events.push({type:'toll-arm',round:s.round+1,roundTurn:s.roundTurn,tileId:s.tollTileId,armed:s.tollArmed,coins:s.coins});
    return{ok:true,armed:s.tollArmed,tileId:s.tollTileId,coins:s.coins}
  }

  function signalOptionsForPieces(pieces,trigger){
    const doubleDoublePieceId=pieces.find(x=>x.tile.id===s.doubleDoubleTileId)?.id||null,doubleEchoPieceId=pieces.find(x=>x.tile.id===s.doubleEchoTileId)?.id||null,tripleDoublePieceId=pieces.find(x=>x.tile.id===s.tripleDoubleTileId)?.id||null,diodePieceId=pieces.find(x=>x.tile.id===s.diodeTileId)?.id||null,returnPieceId=pieces.find(x=>x.tile.id===s.returnTileId)?.id||null,mergePieceId=pieces.find(x=>x.tile.id===s.mergeTileId)?.id||null,hinge=hingeOptionForPieces(pieces);
    return{initialOutput:trigger,doubleDoublePieceId,doubleEchoPieceId,tripleDoublePieceId,diodePieceId,diodeInHalf:Number.isInteger(s.diodeInHalf)?s.diodeInHalf:null,returnPieceId,mergePieceId,hingePieceId:hinge?.pieceId||null,hingePivotPieceId:hinge?.pivotPieceId||null,hingeTargetPlacement:hinge?.targetPlacement||null,hingeBlockedReason:hinge?.blockedReason||null,zeroPortPieceIds:zeroPortPieceIds(pieces),modIdsByPiece:pieceModifierMap(pieces),cornerMultiplier:cfg.CORNER_MOD_MULTIPLIER||3,longLineThreshold:cfg.LONG_LINE_THRESHOLD||3,longLineHighThreshold:cfg.LONG_LINE_HIGH_THRESHOLD||5,longLineMultiplier:cfg.LONG_LINE_MULTIPLIER||2,longLineHighMultiplier:cfg.LONG_LINE_HIGH_MULTIPLIER||3,overloadMaxMultiplier:cfg.OVERLOAD_MAX_MULTIPLIER||4,terminalMultiplier:cfg.TERMINAL_MOD_MULTIPLIER||3,twinMultiplier:cfg.TWIN_MOD_MULTIPLIER||3,pairMultiplier:cfg.PAIR_MOD_MULTIPLIER||3,bridgeMultiplier:cfg.BRIDGE_MOD_MULTIPLIER||3,gateMultiplier:cfg.GATE_MOD_MULTIPLIER||2,fanMultiplier:cfg.FAN_MOD_MULTIPLIER||4,frameMultiplier:cfg.FRAME_MOD_MULTIPLIER||2,crownMultiplier:cfg.CROWN_MOD_MULTIPLIER||4,frontierMultiplier:cfg.FRONTIER_MOD_MULTIPLIER||2,circuitRankByPiece:new Map(pieces.map(q=>[q.id,Math.max(0,Number(s.circuitRanks?.[q.tile.id])||0)])),economyCoins:s.coins,bankLowCoins:cfg.BANK_LOW_COINS||10,bankHighCoins:cfg.BANK_HIGH_COINS||20,bankLowMultiplier:cfg.BANK_LOW_MOD_MULTIPLIER||2,bankHighMultiplier:cfg.BANK_HIGH_MOD_MULTIPLIER||3,spendCoinThreshold:cfg.SPEND_COIN_THRESHOLD||5,spendMultiplier:cfg.SPEND_MOD_MULTIPLIER||3,tollArmed:!!s.tollArmed,tollCoins:cfg.TOLL_COINS||1,knotCycleCountByPiece:knotCycleCountByPiece(E,pieces),knotMultiplier:cfg.KNOT_MOD_MULTIPLIER||4,mirrorMultiplier:cfg.MIRROR_MOD_MULTIPLIER||3,bifurcate:cfg.BIFURCATION_ENABLED}
  }

  function topologyTelemetry(pieces=s.pieces){
    const graph=C.adjacency(pieces,E.contactBetweenPieces),degrees=[...graph.values()].map(set=>set.size),seen=new Set();let components=0;
    for(const id of graph.keys())if(!seen.has(id)){components++;const queue=[id];seen.add(id);for(let i=0;i<queue.length;i++)for(const next of graph.get(queue[i])||[])if(!seen.has(next)){seen.add(next);queue.push(next)}}
    const edges=degrees.reduce((sum,n)=>sum+n,0)/2,degreeFor=p=>graph.get(p.tile.id)?.size||0,zeroPieces=pieces.filter(p=>p.tile.a===0||p.tile.b===0);
    return{machineSize:pieces.length,edgeCount:edges,components,cycleRank:Math.max(0,edges-pieces.length+components),doubleCount:pieces.filter(p=>p.tile.a===p.tile.b).length,zeroCount:zeroPieces.length,zeroLeafCount:zeroPieces.filter(p=>degreeFor(p)<=1).length,zeroInternalCount:zeroPieces.filter(p=>degreeFor(p)>=2).length,zeroBranchCount:zeroPieces.filter(p=>degreeFor(p)>=3).length,tJunctionCount:degrees.filter(n=>n===3).length,crossCount:degrees.filter(n=>n>=4).length,maxDegree:degrees.length?Math.max(...degrees):0,branchingDoubleCount:pieces.filter(p=>p.tile.a===p.tile.b&&degreeFor(p)>=3).length,powerTileCount:pieces.filter(p=>(p.tile.powerMultiplier||1)>1).length,modTileCount:pieces.filter(p=>tileModIdsForTile(p.tile.id).length>0).length,circuitCount:(s.circuitSignatures||[]).length,circuitTileCount:Object.values(s.circuitRanks||{}).filter(rank=>Number(rank)>0).length}
  }

  function deckTelemetry(){
    const generation=s.setGeneration||1;
    return{generation,powerMultiplier:generationPower(generation),remainingTiles:availableTileCount(),reserveCount:(s.reserve||[]).length,handCount:(s.hand||[]).filter(Boolean).length,currentGenerationMachineCount:(s.pieces||[]).filter(p=>(p.tile.generation||1)===generation).length}
  }

  function signalTelemetry(sim,pieces=s.pieces){
    const events=sim?.events||[],ops=events.filter(e=>e.type==='op'),physicalOps=ops.filter(e=>!e.tollRepeat),visits=new Map();
    for(const e of physicalOps)if(e.piece!=null)visits.set(e.piece,(visits.get(e.piece)||0)+1);
    const uniqueVisitedPieceCount=visits.size,reentryOperationCount=[...visits.values()].reduce((sum,n)=>sum+Math.max(0,n-1),0),revisitedPieceCount=[...visits.values()].filter(n=>n>1).length;
    const reboundCount=events.filter(e=>e.type==='rebound').length,zeroPortCount=events.filter(e=>e.type==='zero-port').length;
    return{operationCount:ops.length,physicalOperationCount:physicalOps.length,tollRepeatCount:ops.filter(e=>e.tollRepeat).length,uniqueVisitedPieceCount,reentryOperationCount,revisitedPieceCount,revisitRatio:ops.length?reentryOperationCount/ops.length:0,visitedMachineFraction:pieces.length?uniqueVisitedPieceCount/pieces.length:0,retraceMoveCount:events.filter(e=>e.type==='move'&&e.retrace).length,reverseOperationCount:ops.filter(e=>e.reverse).length,reboundCount,zeroPortCount,zeroReturnCount:reboundCount+zeroPortCount,forkCount:events.filter(e=>e.type==='signal-fork').length,diodeBlockCount:events.filter(e=>e.type==='diode-block').length,returnCount:events.filter(e=>e.type==='return').length,mergeCount:events.filter(e=>e.type==='signal-merge').length,hingeMoveCount:events.filter(e=>e.type==='hinge-move').length,hingeBlockedCount:events.filter(e=>e.type==='hinge-blocked').length,powerActivationCount:ops.filter(e=>(e.powerMultiplier||1)>1).length,modActivationCount:ops.filter(e=>(e.modMultiplier||1)>1).length}
  }

  function spreadEntries(entries){
    const out=[],queue=entries.length?[[0,entries.length]]:[];
    while(queue.length){const [lo,hi]=queue.shift();if(lo>=hi)continue;const mid=Math.floor((lo+hi-1)/2);out.push(entries[mid]);if(lo<mid)queue.push([lo,mid]);if(mid+1<hi)queue.push([mid+1,hi])}
    return out
  }

  function stratifiedLegalEntries(legal,same,chosenIndex){
    const groups=new Map();
    for(const entry of legal){if(same(entry))continue;if(!groups.has(entry.handIndex))groups.set(entry.handIndex,[]);groups.get(entry.handIndex).push(entry)}
    let hands=[...groups.keys()].sort((a,b)=>a-b);if(hands.length){const pivot=hands.findIndex(i=>i>chosenIndex),at=pivot>=0?pivot:0;hands=[...hands.slice(at),...hands.slice(0,at)]}
    const spread=new Map(hands.map(i=>[i,spreadEntries(groups.get(i)||[])])),out=[];let depth=0,added=true;
    while(added){added=false;for(const i of hands){const entry=spread.get(i)?.[depth];if(entry){out.push(entry);added=true}}depth++}
    return out
  }

  function outputDistribution(values){
    const sorted=(values||[]).filter(Number.isFinite).sort((a,b)=>a-b);if(!sorted.length)return null;
    const at=q=>sorted[Math.min(sorted.length-1,Math.max(0,Math.ceil(q*sorted.length)-1))];
    return{min:sorted[0],median:at(.5),p90:at(.9),max:sorted[sorted.length-1]}
  }

  function previewPlacement(i,c){
    if(i<0||i>=s.hand.length||!s.hand[i]||!c)return{ok:false,reason:'state'};const tile=s.hand[i];
    if(s.placedTileIds.includes(tile.id))return{ok:false,reason:'tile-already-in-machine'};
    if(!s.pieces.length&&cfg.FIRST_TILE_MUST_BE_DOUBLE&&s.turn===0&&!isDouble(tile))return{ok:false,reason:'first-double'};
    if(s.pieces.length){const v=E.validatePlacement(tile,c.x,c.y,0,c.rr,s.pieces);if(!v.ok)return{ok:false,reason:v.reason||'invalid'}}
    else{const p0=E.pieceFrom(tile,c.x,c.y,0,c.rr,-1);if(p0.rect.minx<0||p0.rect.miny<0||p0.rect.maxx>E.G||p0.rect.maxy>E.H)return{ok:false,reason:'bounds'}}
    const p=E.pieceFrom(tile,c.x,c.y,0,c.rr,s.idc+1);p.tile={...cloneTile(tile)};const pieces=[...s.pieces,p],topologyBreaks=topologyBreaksForPieces(pieces),trigger=tile.a+tile.b;
    const sim=pieces.length===1?{output:trigger,events:[],reason:'root',rebounds:0,search:{starts:0,leaves:1,expanded:0}}:E.bestSignal(p.id,pieces,signalOptionsForPieces(pieces,trigger));
    const resonance=C.resonance(sim.output??trigger,sim.events,pieces,s.circuitRanks,cfg);
    return{ok:true,handIndex:i,tile:cloneTile(tile),placement:{x:c.x,y:c.y,z:0,rr:c.rr},trigger,selectionOutput:sim.output??trigger,output:resonance.output,sim,resonance,topologyBreaks}
  }

  function decisionTelemetry(chosenIndex,chosenCandidate,options={}){
    const maxEvaluations=Math.max(1,Number(options.maxEvaluations)||48),timeBudgetMs=Math.max(0,options.timeBudgetMs==null?32:Number(options.timeBudgetMs)),clock=()=>typeof performance!=='undefined'&&performance.now?performance.now():Date.now(),started=clock(),topologyBefore=topologyTelemetry(),deckBefore=deckTelemetry(),coverageTarget=target(),legal=[];
    for(let i=0;i<s.hand.length;i++)for(const c of candidatesForIndex(i))legal.push({handIndex:i,candidate:c});
    const chosenTile=s.hand[chosenIndex],chosenPlacement=chosenTile&&chosenCandidate?{tileId:chosenTile.id,handIndex:chosenIndex,x:chosenCandidate.x,y:chosenCandidate.y,z:0,rr:chosenCandidate.rr}:null;
    if(!chosenPlacement)return{evaluationComplete:false,skippedReason:'chosen-placement',legalPlacementCount:legal.length,evaluatedPlacementCount:0,evaluationMs:clock()-started,topologyBefore,deckBefore,coverageTarget,clearCoverageSampleCount:0,clearCoverageClearCount:0,clearCoverage:null,clearCoverageComplete:false,coverageIncludesChosen:false,outputDistribution:null};
    const same=entry=>entry.handIndex===chosenIndex&&entry.candidate.x===chosenCandidate.x&&entry.candidate.y===chosenCandidate.y&&entry.candidate.rr===chosenCandidate.rr;
    if(!s.pieces.length){
      let best=null;const outputs=[];
      for(const entry of legal){const tile=s.hand[entry.handIndex],output=tile.a+tile.b;outputs.push(output);if(!best||output>best.output)best={output,placement:{tileId:tile.id,handIndex:entry.handIndex,x:entry.candidate.x,y:entry.candidate.y,z:0,rr:entry.candidate.rr}}}
      const clearCount=outputs.filter(output=>output>=coverageTarget).length;
      return{chosenOutput:null,chosenSelectionOutput:null,bestLegalOutput:best?.output??null,bestEvaluatedOutput:best?.output??null,chosenVsBestRatio:null,legalPlacementCount:legal.length,evaluatedPlacementCount:0,evaluationComplete:true,evaluationStrategy:'root-equivalent',skippedReason:null,evaluationMs:clock()-started,bestPlacement:best?.placement||chosenPlacement,bestEvaluatedPlacement:best?.placement||chosenPlacement,chosenPlacement,topologyBefore,deckBefore,coverageTarget,clearCoverageSampleCount:outputs.length,clearCoverageClearCount:clearCount,clearCoverage:outputs.length?clearCount/outputs.length:null,clearCoverageComplete:true,coverageIncludesChosen:true,outputDistribution:outputDistribution(outputs)}
    }
    let evaluated=0,best=null,stopReason=null;const coverageSampleOutputs=[],ordered=stratifiedLegalEntries(legal,same,chosenIndex);
    const consider=preview=>{if(!preview?.ok)return;evaluated++;coverageSampleOutputs.push(preview.output);if(!best||preview.output>best.output)best=preview};
    for(const entry of ordered){if(evaluated>=maxEvaluations){stopReason='placement-cap';break}if(clock()-started>=timeBudgetMs){stopReason='time-budget';break}consider(previewPlacement(entry.handIndex,entry.candidate))}
    const complete=evaluated>=Math.max(0,legal.length-1);if(!complete&&!stopReason)stopReason='evaluation-incomplete';
    const clearCount=coverageSampleOutputs.filter(output=>output>=coverageTarget).length;
    return{chosenOutput:null,chosenSelectionOutput:null,bestLegalOutput:null,bestEvaluatedOutput:best?.output??null,chosenVsBestRatio:null,legalPlacementCount:legal.length,evaluatedPlacementCount:evaluated,evaluationComplete:complete,evaluationStrategy:complete?'exhaustive':'stratified-sample',skippedReason:complete?null:stopReason,evaluationMs:clock()-started,bestPlacement:null,bestEvaluatedPlacement:best?{tileId:best.tile.id,handIndex:best.handIndex,...best.placement}:null,chosenPlacement,topologyBefore,deckBefore,coverageTarget,clearCoverageSampleCount:evaluated,clearCoverageClearCount:clearCount,clearCoverage:evaluated?clearCount/evaluated:null,clearCoverageComplete:false,coverageIncludesChosen:false,outputDistribution:outputDistribution(coverageSampleOutputs),coverageSampleOutputs}
  }
  function captureUndoFrame(){
    const old=s.undoFrame;s.undoFrame=null;const frame=deepClone(s);s.undoFrame=old;return frame
  }
  function beginPlacement(i,c){
    if(!canInteract()||i<0||i>=s.hand.length||!s.hand[i])return{ok:false,reason:'state'};
    const tile=s.hand[i];
    if(s.placedTileIds.includes(tile.id))return{ok:false,reason:'tile-already-in-machine'};
    if(!s.pieces.length&&cfg.FIRST_TILE_MUST_BE_DOUBLE&&s.turn===0&&!isDouble(tile))return{ok:false,reason:'first-double'};
    if(s.pieces.length){const v=E.validatePlacement(tile,c.x,c.y,0,c.rr,s.pieces);if(!v.ok)return{ok:false,reason:v.reason||'invalid'}}
    else{const p0=E.pieceFrom(tile,c.x,c.y,0,c.rr,-1);if(p0.rect.minx<0||p0.rect.miny<0||p0.rect.maxx>E.G||p0.rect.maxy>E.H)return{ok:false,reason:'bounds'}}
    const undoFrame=captureUndoFrame();
    s.running=true;
    const p=E.pieceFrom(tile,c.x,c.y,0,c.rr,++s.idc);p.tile={...cloneTile(tile)};
    const topologyBreaks=topologyBreaksForPieces([...s.pieces,p]);
    s.pieces.push(p);s.placedTileIds.push(tile.id);
    const topologyLosses=removeTopologyMods(topologyBreaks,tile.id);
    const trigger=tile.a+tile.b;
    const sim=s.pieces.length===1?{output:trigger,events:[],reason:'root',rebounds:0,search:{starts:0,leaves:1,expanded:0}}:E.bestSignal(p.id,s.pieces,signalOptionsForPieces(s.pieces,trigger));
    if(isZero(tile))s.roundZero.placed++;
    const generationBefore=s.setGeneration||1;s.hand[i]=drawOne();
    if((s.setGeneration||1)>generationBefore){
      const filled=fillEmptyHand();
      s.events.push({type:'power-set-hand-refill',round:s.round+1,roundTurn:s.roundTurn+1,generation:s.setGeneration||1,filled,hand:s.hand.filter(Boolean).map(cloneTile)})
    }
    s.turn++;s.roundTurn++;s.undoFrame=undoFrame;
    if(s.endlessMode)s.systemStrain=(s.systemStrain||0)+1;
    return{ok:true,tile,p,trigger,baseTrigger:trigger,sim,handIndex:i,topologyLosses}
  }

  function upgradeIncomeFor(sim){
    const seen=new Set(),activations=[];
    for(const e of sim.events||[]){
      if(e.type!=='op'||seen.has(e.piece))continue;
      seen.add(e.piece);const p=s.pieces.find(x=>x.id===e.piece),tier=p?.tile?.upgrade||0;
      if(tier>0)activations.push({pieceId:e.piece,tileId:p.tile.id,a:p.tile.a,b:p.tile.b,tier,coins:tier})
    }
    const uniquePieces=seen.size,longRunOwned=s.mods.includes('long-run'),longRunQualified=longRunOwned&&uniquePieces>=(cfg.LONG_RUN_UNIQUE_THRESHOLD||10),longRunCap=Math.max(0,Number(cfg.ENDLESS_LONG_RUN_ACTIVATIONS??7)),longRunUsed=s.endlessLongRunActivations||0,longRunAvailable=!s.endlessMode||longRunUsed<longRunCap,longRunActive=longRunQualified&&longRunAvailable;
    const total=longRunActive?activations.reduce((sum,a)=>sum+a.tier,0):activations.reduce((best,a)=>Math.max(best,a.tier),0);
    return{activations,total,uniquePieces,longRunOwned,longRunQualified,longRunActive,longRunCapped:longRunQualified&&!longRunAvailable,longRunUsed,longRunCap}
  }
  function awardUpgradeIncome(income){
    if(!income.total)return 0;
    if(s.endlessMode&&income.longRunActive)s.endlessLongRunActivations=(s.endlessLongRunActivations||0)+1;
    s.coins+=income.total;s.roundUpgradeCoins+=income.total;
    s.events.push({type:'upgrade-coins',round:s.round+1,roundTurn:s.roundTurn,amount:income.total,activations:income.activations,uniquePieces:income.uniquePieces,longRunOwned:income.longRunOwned,longRunActive:income.longRunActive,longRunCapped:income.longRunCapped,endlessLongRunActivations:s.endlessLongRunActivations||0,endlessLongRunCap:income.longRunCap,coins:s.coins});return income.total
  }

  function mintIncomeFor(sim,finalOutput){
    if(!s.mintTileId||s.mintPaidRound===s.round||!(Number(finalOutput)>0))return{total:0,tileId:null,pieceId:null};
    const piece=s.pieces.find(p=>p.tile.id===s.mintTileId);if(!piece)return{total:0,tileId:null,pieceId:null};
    const activated=(sim.events||[]).some(e=>(e.type==='op'||e.type==='echo-op')&&e.piece===piece.id);if(!activated)return{total:0,tileId:null,pieceId:null};
    return{total:Math.max(0,Number(cfg.MINT_COINS)||1),tileId:s.mintTileId,pieceId:piece.id}
  }
  function awardMintIncome(income){
    if(!income?.total)return 0;s.coins+=income.total;s.mintPaidRound=s.round;
    s.events.push({type:'mint-coins',round:s.round+1,roundTurn:s.roundTurn,amount:income.total,tileId:income.tileId,pieceId:income.pieceId,coins:s.coins});return income.total
  }
  function tollSpendFor(sim){
    const event=(sim?.events||[]).find(e=>e.type==='toll-spend');if(!event)return{total:0,tileId:null,pieceId:null};
    const piece=s.pieces.find(p=>p.id===event.piece),amount=Math.max(0,Number(event.amount)||0);
    return{total:amount,tileId:piece?.tile?.id||s.tollTileId||null,pieceId:event.piece||null}
  }
  function applyTollSpend(spend){
    if(!spend?.total)return 0;s.coins=Math.max(0,s.coins-spend.total);
    s.events.push({type:'toll-coins',round:s.round+1,roundTurn:s.roundTurn,amount:-spend.total,tileId:spend.tileId,pieceId:spend.pieceId,coins:s.coins});return spend.total
  }
  function brokerActivatedFor(sim){
    if(!s.brokerTileId)return false;const piece=s.pieces.find(p=>p.tile.id===s.brokerTileId);if(!piece)return false;
    return(sim?.events||[]).some(e=>(e.type==='op'||e.type==='echo-op')&&e.piece===piece.id)
  }
  function prepareBrokerDiscount(sim){
    if(!brokerActivatedFor(sim)||s.brokerDiscountReady)return false;s.brokerDiscountReady=true;
    s.events.push({type:'broker-ready',round:s.round+1,roundTurn:s.roundTurn,tileId:s.brokerTileId,discount:Math.max(0,Number(cfg.BROKER_DISCOUNT)||1)});return true
  }

  function overkillTier(output,tgt){const ratio=output/tgt;return ratio>=10?3:ratio>=5?2:ratio>=3?1:0}
  function scheduleIntermission(){
    if(!s.endlessMode&&s.round>=cfg.TOTAL_ROUNDS-1){s.nextShopType='none';s.intermissionResolved=true;return}
    const endOfStage=(s.round+1)%stageSize()===0;
    s.nextShopType=endOfStage?'market':'none';
    s.intermissionResolved=!endOfStage;
    s.events.push({type:'shop-scheduled',round:s.round+1,shop:s.nextShopType})
  }

  function finishPlacement(ctx){
    if(!ctx?.ok)return ctx;
    const{tile,p,trigger,sim}=ctx,resonance=moveResonance(sim,trigger);s.score=resonance.output;s.best=Math.max(s.best,s.score);s.cleared=s.score>=target();
    const st=(sim.events||[]).find(e=>e.type==='start'),rs=(sim.events||[]).filter(e=>e.type==='route'),income=upgradeIncomeFor(sim),mintIncome=mintIncomeFor(sim,resonance.output),tollSpend=tollSpendFor(sim),brokerPrepared=brokerActivatedFor(sim)&&!s.brokerDiscountReady;
    const activatedPieceIds=[...new Set((sim.events||[]).filter(e=>e.type==='op').map(e=>e.piece))],activatedTileIds=[...new Set([tile.id,...activatedPieceIds.map(id=>s.pieces.find(p=>p.id===id)?.tile?.id).filter(Boolean)])];
    const zeroPortEvents=(sim.events||[]).filter(e=>e.type==='zero-port'),echoEvent=(sim.events||[]).find(e=>e.type==='double-echo-result')||null;
    const zeroPorts=zeroPortEvents.map(e=>({fromTileId:s.pieces.find(q=>q.id===e.piece)?.tile?.id||null,toTileId:s.pieces.find(q=>q.id===e.toPieceId)?.tile?.id||null}));
    s.events.push({turn:s.turn,round:s.round+1,roundTurn:s.roundTurn,tile:cloneTile(tile),activatedTileIds,topologyLosses:deepClone(ctx.topologyLosses||[]),placement:{x:p.cubes[0].x,y:p.cubes[0].y,z:0,rr:p.rr},dir:E.ARROW[p.rr],target:target(),trigger,baseTrigger:trigger,selectionOutput:sim.selectionOutput??sim.mainOutput??sim.output,output:s.score,upgradeCoins:income.total,mintCoins:mintIncome.total,tollCoins:tollSpend.total,brokerPrepared,starCoins:income.total,longRunActivated:income.longRunActive,longRunCapped:income.longRunCapped,systemStrain:s.systemStrain||0,uniquePieces:income.uniquePieces,zeroPorts,echo:echoEvent?{tileId:s.doubleEchoTileId,mainOutput:echoEvent.mainOutput,echoOutput:echoEvent.echoOutput,finalOutput:echoEvent.finalOutput,rebounds:echoEvent.echoRebounds||0}:null,rebounds:sim.rebounds||0,start:st?.key||'-',flipped:!!st?.flipped,reason:sim.reason,ops:(sim.events||[]).filter(e=>e.type==='op').map(e=>{const mod=e.modMultiplier>1?` MOD×${e.modMultiplier}`:'';return e.op==='multiply'?`${e.piece}:×${e.factor}${e.doubleDouble?'DD':''}${e.powerMultiplier>1?' PWR':''}${mod} ${e.before}>${e.after}${e.reverse?'R':''}`:`${e.piece}:+${e.add}${e.doubleDouble?'DD':''}${e.powerMultiplier>1?' PWR':''}${mod} ${e.before}>${e.after}${e.reverse?'R':''}`}).join(','),routes:rs.map(e=>`${e.piece}:${e.entryHalf}>${e.toPieceId}:${e.toHalf}`).join(';'),search:sim.search?`${sim.search.starts}/${sim.search.leaves}/${sim.search.expanded}${sim.search.truncated?'!':''}`:'-',clear:s.cleared});
    const tollCoins=applyTollSpend(tollSpend),brokerReady=prepareBrokerDiscount(sim),upgradeCoins=awardUpgradeIncome(income),mintCoins=awardMintIncome(mintIncome);
    const forks=(sim.events||[]).filter(e=>e.type==='signal-fork');
    if(forks.length)s.events.push({type:'signal-resolution',round:s.round+1,move:s.turn,baseOutput:sim.output,splitCount:forks.length,selectionOutput:sim.selectionOutput??sim.mainOutput??sim.output,events:sim.events.map(e=>({...e,tileId:s.pieces.find(q=>q.id===e.piece)?.tile.id||null}))});
    let continuation={autoRerolls:0};
    if(s.cleared){
      const rewardBreakdown=clearRewardBreakdown(),reward=rewardBreakdown.total;s.coins+=reward;s.roundZero.endHand=countZero(s.hand.filter(Boolean));
      const tier=overkillTier(s.score,target()),old=tile.upgrade||0;
      if(tier>old){tile.upgrade=tier;p.tile.upgrade=tier;s.events.push({type:'tile-upgrade',round:s.round+1,tile:cloneTile(tile),from:old,to:tier,ratio:+(s.score/target()).toFixed(2)})}
      s.anchorId=tile.id;s.events.push({type:'anchor-set',round:s.round+1,tile:cloneTile(tile)});
      s.wins.push({round:s.round+1,target:target(),output:s.score,turn:s.turn,placements:s.roundTurn,reward,rewardBreakdown,upgradeCoins:s.roundUpgradeCoins,anchor:cloneTile(tile),upgradeTier:tile.upgrade||0,machineSize:s.pieces.length,setSize:s.set.length,setGeneration:s.setGeneration||1,zeros:{...s.roundZero}});
      if(!s.standardComplete&&s.round===cfg.TOTAL_ROUNDS-1){s.standardComplete=true;s.events.push({type:'run-complete',round:s.round+1,target:target(),output:s.score,coins:s.coins,inflation:s.inflation})}
      s.events.push({type:'coins',round:s.round+1,amount:reward,breakdown:rewardBreakdown,coins:s.coins});scheduleIntermission()
    }else{const protection=ensureOpeningContinuation('draw');if(protection)s.events.push(protection);continuation=assessContinuation()||continuation}
    s.events.push({type:'circuit-resonance',round:s.round+1,move:s.turn,...resonance});
    let hingeMoved=false;
    if(sim.hingeFinalPlacement&&s.hingeTileId&&s.hingeState?.tileId===s.hingeTileId){
      const index=s.pieces.findIndex(q=>q.tile.id===s.hingeTileId),current=index>=0?s.pieces[index]:null,pl=sim.hingeFinalPlacement;
      if(current){const moved=E.pieceFrom(current.tile,pl.x,pl.y,pl.z||0,pl.rr,current.id);moved.tile={...current.tile};s.pieces[index]=moved;s.hingeState.active=s.hingeState.active===1?0:1;hingeMoved=true;s.events.push({type:'hinge-state',round:s.round+1,move:s.turn,tileId:s.hingeTileId,pivotTileId:s.hingeState.pivotTileId,active:s.hingeState.active,placement:{x:pl.x,y:pl.y,z:pl.z||0,rr:pl.rr}})}
    }
    discoverCircuit(tile.id);
    s.running=false;return{ok:true,cleared:s.cleared,blocked:s.blocked,needsReroll:s.needsReroll,failureReason:s.failureReason,nextShopType:s.nextShopType,upgradeCoins,autoRerolls:continuation.autoRerolls||0,pendingCircuit:!!s.pendingCircuit,resonance,mintCoins,tollCoins,brokerReady,hingeMoved}
  }

  function moveResonance(sim,trigger=0){return C.resonance(sim.output??trigger,sim.events,s.pieces,s.circuitRanks,cfg)}
  function discoverCircuit(newTileId){
    const primary=C.primaryCircuit(C.adjacency(s.pieces,E.contactBetweenPieces),newTileId,cfg);
    if(!primary){s.events.push({type:'circuit-check',round:s.round+1,move:s.turn,closed:false});return}
    const duplicate=s.circuitSignatures.includes(primary.signature);
    const limit=circuitTileLimit(),eligible=duplicate?[]:C.eligibleTiles(primary,s.circuitRanks,s.placedTileIds,cfg,limit);
    if(!duplicate)s.circuitSignatures.push(primary.signature);
    s.events.push({type:'circuit-closed',round:s.round+1,move:s.turn,...deepClone(primary),circuitTileLimit:limit,eligibleTileIds:eligible,unavailable:duplicate?'duplicate':eligible.length?null:'no-eligible-tile'});
    if(eligible.length)s.pendingCircuit={...primary,eligibleTileIds:eligible};
  }
  function chooseCircuitTile(tileId){
    const pending=s.pendingCircuit;
    if(!pending||s.running||!pending.eligibleTileIds.includes(tileId))return{ok:false,reason:'circuit-target'};
    const before=s.circuitRanks[tileId]||0,after=C.upgradedRank(before,pending.reward,cfg);
    s.circuitRanks[tileId]=after;s.pendingCircuit=null;
    s.events.push({type:'circuit-upgrade',round:s.round+1,move:s.turn,signature:pending.signature,tileId,tile:cloneTile(s.set.find(t=>t.id===tileId)),before,after,reward:pending.reward});
    return{ok:true,tileId,before,after}
  }

  function canUsePurchasedTool(id){
    if(id==='reroll')return !s.pendingCircuit&&!s.pendingModPlacement&&!s.running&&!s.cleared&&!s.shopOpen&&s.failureReason!=='no-tiles'&&s.failureReason!=='placement-limit';
    if(id==='move')return !s.pendingCircuit&&!s.pendingModPlacement&&!s.running&&!s.cleared&&!s.shopOpen&&!s.needsReroll&&(!s.blocked||s.failureReason==='placement-limit');
    if(id==='undo')return!!s.undoFrame&&!s.pendingModPlacement&&!s.running&&!s.shopOpen;
    return false
  }
  function canUseReroll(){return rerollsAvailable()>0&&canUsePurchasedTool('reroll')}
  function reroll(){
    const r=applyReroll(false);if(!r.ok)return r;
    const continuation=assessContinuation()||{autoRerolls:0};
    return{...r,autoRerolls:continuation.autoRerolls||0,blocked:s.blocked,needsReroll:s.needsReroll,failureReason:s.failureReason}
  }
  function canUseMove(){return(s.consumables?.move||0)>0&&canUsePurchasedTool('move')}
  function useMove(){
    if(!canUseMove())return{ok:false,reason:'state'};
    s.consumables.move--;s.undoFrame=null;s.extraPlacements++;
    const rescued=s.blocked&&s.failureReason==='placement-limit';if(rescued){s.blocked=false;s.failureReason=null;assessContinuation()}
    s.events.push({type:'consume',round:s.round+1,roundTurn:s.roundTurn,item:'move',remaining:s.consumables.move,maxPlacements:maxPlacements()});
    return{ok:true,maxPlacements:maxPlacements(),remaining:s.consumables.move}
  }
  function canUndo(){return(s.consumables?.undo||0)>0&&canUsePurchasedTool('undo')}
  function preserveShopTransactions(frame,current){
    const tail=(current.events||[]).slice((frame.events||[]).length);
    const keptTypes=new Set(['shop-open','shop-buy','tile-buy','shop-close']);
    const kept=tail.filter(e=>keptTypes.has(e.type)).map(e=>deepClone(e));
    const purchases=kept.filter(e=>e.type==='shop-buy'||e.type==='tile-buy');
    let spend=0,inflationDelta=0;
    for(const e of purchases){
      spend+=Number(e.cost)||0;
      inflationDelta+=Math.max(0,(Number(e.inflationAfter)||0)-(Number(e.inflationBefore)||0));
      if(e.type==='shop-buy'&&e.item)frame.consumables[e.item]=(frame.consumables[e.item]||0)+1;
      if(e.type==='tile-buy'&&e.tile?.id&&!frame.set.some(t=>t.id===e.tile.id)){
        const tile=cloneTile(e.tile);frame.set.push(tile);
        const currentSlot=(current.hand||[]).findIndex(t=>t?.id===tile.id),freeSlot=(frame.hand||[]).findIndex(t=>!t);
        if(e.delivery==='hand'&&currentSlot>=0&&!frame.hand[currentSlot])frame.hand[currentSlot]=tile;
        else if(e.delivery==='hand'&&freeSlot>=0)frame.hand[freeSlot]=tile;
        else frame.reserve.unshift(tile)
      }
      if(e.type==='tile-buy'&&e.mode==='offer')frame.shopTileOffers=(frame.shopTileOffers||[]).filter(t=>t.id!==e.tile?.id)
    }
    const beforeCoins=Number(frame.coins)||0,shortfall=Math.max(0,spend-beforeCoins);
    frame.coins=Math.max(0,beforeCoins-spend);
    frame.inflation=(Number(frame.inflation)||0)+inflationDelta;
    frame.tileSerial=Math.max(frame.tileSerial||0,current.tileSerial||0);
    if(purchases.some(e=>e.type==='tile-buy'))frame.rngState=current.rngState;
    frame.events.push(...kept);
    return{count:purchases.length,spend,inflationDelta,shortfall}
  }
  function useUndo(){
    if(!canUndo())return{ok:false,reason:'state'};
    const current=s,frame=deepClone(s.undoFrame);
    if(Number.isInteger(frame.persistenceEventCursor)){
      const cursor=Math.max(0,Math.min(frame.persistenceEventCursor,(current.events||[]).length));
      frame.events=(current.events||[]).slice(0,cursor).map(deepClone);delete frame.persistenceEventCursor
    }
    const last=[...(s.events||[])].reverse().find(e=>Number.isInteger(e?.turn)),preserved=preserveShopTransactions(frame,current);
    frame.standardComplete=!!(frame.standardComplete||current.standardComplete);
    if(frame.standardComplete&&!frame.events.some(e=>e.type==='run-complete')){
      const completion=current.events.find(e=>e.type==='run-complete');
      if(completion)frame.events.push(deepClone(completion));
    }
    s=frame;s.consumables.undo=Math.max(0,(s.consumables?.undo||0)-1);s.undoFrame=null;s.running=false;
    s.events.push({type:'undo',round:s.round+1,roundTurn:s.roundTurn,item:'undo',remaining:s.consumables.undo,undone:last?{turn:last.turn,tile:cloneTile(last.tile),output:last.output}:null,preservedPurchases:preserved.count,preservedSpend:preserved.spend,preservedInflation:preserved.inflationDelta,coinShortfall:preserved.shortfall});
    return{ok:true,remaining:s.consumables.undo,restoredTurn:s.turn,discardedTurn:current.turn,preservedPurchases:preserved.count,preservedSpend:preserved.spend}
  }

  function inflationCost(base){return base+(s.inflation||0)+(s.systemStrain||0)}
  function toolPrice(id){const m=M.get(id);return m?.kind==='consumable'?inflationCost(m.cost):Infinity}
  function shopItemPrice(id){return toolPrice(id)}
  function toolPurchaseQuote(id,quantity=1){
    const m=M.get(id),qty=Math.max(1,Math.floor(Number(quantity)||1));
    if(!m||m.kind!=='consumable')return{ok:false,reason:'item',item:id,quantity:qty,total:Infinity,unitCosts:[]};
    const inflationBefore=s.inflation||0,strain=s.systemStrain||0,step=cfg.INFLATION_PER_PURCHASE||1,unitCosts=[];
    for(let i=0;i<qty;i++)unitCosts.push(m.cost+inflationBefore+(i*step)+strain);
    const total=unitCosts.reduce((sum,cost)=>sum+cost,0);
    return{ok:true,item:id,quantity:qty,baseCost:m.cost,total,unitCosts,inflationBefore,inflationAfter:inflationBefore+(qty*step),systemStrain:strain,canAfford:s.coins>=total}
  }
  function canBuyTool(id){
    const m=M.get(id);if(!m||m.kind!=='consumable'||s.pendingCircuit||s.pendingModPlacement||s.running||s.cleared||s.shopOpen||s.needsReroll)return false;
    const empty=id==='reroll'?rerollsAvailable()===0:(s.consumables?.[id]||0)===0;if(!empty)return false;
    if(s.blocked)return(id==='move'&&s.failureReason==='placement-limit')||(id==='reroll'&&s.failureReason==='no-legal-moves');
    return true
  }
  function buyTool(id,quantity=1,meta={}){
    if(!canBuyTool(id))return{ok:false,reason:'state'};
    const quote=toolPurchaseQuote(id,quantity);if(!quote.ok)return quote;if(!quote.canAfford)return{...quote,ok:false,reason:'coins'};
    const m=M.get(id),intent=meta?.intent==='buy-use'?'buy-use':'store';for(let i=0;i<quote.quantity;i++){
      const cost=inflationCost(m.cost);s.consumables[id]=(s.consumables[id]||0)+1;const purchase=applyPurchase(cost);
      s.events.push({type:'shop-buy',round:s.round+1,shop:'tool',item:id,intent,baseCost:m.cost,cost,coins:s.coins,...purchase})
    }
    return{ok:true,item:id,intent,quantity:quote.quantity,cost:quote.total,total:quote.total,remaining:s.consumables[id],inflation:s.inflation}
  }
  function shopRandomPrice(){return inflationCost(cfg.SHOP_RANDOM_TILE_COST||1)}
  function shopTileOfferPrice(){return inflationCost(cfg.SHOP_TILE_OFFER_COST||2)}
  function shopPurchaseAvailability(){
    const offers=ensureShopTileOffers(),generation=nextSetGeneration(),existing=new Set(s.set.map(t=>t.id)),reserved=new Set(offers.map(t=>t.id));
    const randomAvailable=makePowerSet(generation).some(t=>!existing.has(t.id)&&!reserved.has(t.id)),exactOffers=offers.filter(t=>!existing.has(t.id)),randomPrice=shopRandomPrice(),tileOfferPrice=shopTileOfferPrice();
    const canAffordRandom=randomAvailable&&s.coins>=randomPrice,canAffordOffer=exactOffers.length>0&&s.coins>=tileOfferPrice,hasAny=randomAvailable||exactOffers.length>0,canAffordAny=canAffordRandom||canAffordOffer,prices=[];
    if(randomAvailable)prices.push(randomPrice);if(exactOffers.length)prices.push(tileOfferPrice);
    return{hasAny,canAffordAny,blockedByCoins:hasAny&&!canAffordAny,randomAvailable,tileOfferCount:exactOffers.length,randomPrice,tileOfferPrice,cheapestPrice:prices.length?Math.min(...prices):null,coins:s.coins}
  }
  function brokerDiscountAmount(){return s.brokerDiscountReady?Math.max(0,Number(cfg.BROKER_DISCOUNT)||1):0}
  function discountedMarketCost(base){return Math.max(0,inflationCost(base)-brokerDiscountAmount())}
  function marketDoubleDoublePrice(){return discountedMarketCost(cfg.MARKET_DOUBLE_DOUBLE_COST||8)}
  function applyPurchase(cost,meta){
    const before=s.inflation||0;s.coins-=cost;s.inflation=before+(cfg.INFLATION_PER_PURCHASE||1);
    return{inflationBefore:before,inflationAfter:s.inflation,...meta}
  }

  function availableShopItems(){return M.all().filter(m=>m.kind==='consumable')}
  function shopStateAllowsOpen(){return !s.pendingCircuit&&!s.pendingModPlacement&&!s.running&&!s.cleared&&!s.shopOpen}
  function canOpenShop(options={}){return shopStateAllowsOpen()&&(options?.allowUnaffordable||!shopPurchaseAvailability().blockedByCoins)}
  function openShop(options={}){
    if(!shopStateAllowsOpen())return false;
    const availability=shopPurchaseAvailability();if(!options?.allowUnaffordable&&availability.blockedByCoins){s.events.push({type:'shop-close',round:s.round+1,shop:'shop',reason:'insufficient-coins',opened:false,coins:s.coins,inflation:s.inflation,available:availableTileCount(),cheapestPrice:availability.cheapestPrice});return false}
    const tileOffers=ensureShopTileOffers();
    s.shopOpen=true;s.shopType='shop';s.shopOffers=[];
    s.events.push({type:'shop-open',round:s.round+1,shop:'shop',offers:[],tileOffers:tileOffers.map(t=>t.id),coins:s.coins,inflation:s.inflation,available:availableTileCount()});return true
  }
  function closeShopState(reason='continue'){
    s.events.push({type:'shop-close',round:s.round+1,shop:'shop',reason,coins:s.coins,inflation:s.inflation,available:availableTileCount()});
    s.shopOpen=false;s.shopType=null;s.shopOffers=[];
    if(!s.cleared&&!s.running)assessContinuation()
  }
  function closeShop(){
    if(!s.shopOpen||s.shopType!=='shop')return false;
    closeShopState('continue');return true
  }
  function buyShopItem(){return{ok:false,reason:'tools-moved'}}

  function claimNextGenerationTile(){
    const generation=nextSetGeneration(),existing=new Set(s.set.map(t=>t.id)),reserved=new Set(ensureShopTileOffers().map(t=>t.id)),candidates=makePowerSet(generation).filter(t=>!existing.has(t.id)&&!reserved.has(t.id));
    if(!candidates.length)return null;
    const tile=candidates[Math.floor(rnd()*candidates.length)];s.set.push(tile);return tile
  }
  function deliverPurchasedTile(tile){
    const slot=s.hand.findIndex(t=>!t);
    if(slot>=0){s.hand[slot]=tile;if(isZero(tile))s.roundZero.drawn++;return{location:'hand',slot}}
    s.reserve.unshift(tile);return{location:'reserve',slot:null}
  }
  function buyShopRandomTile(){
    if(!s.shopOpen||s.shopType!=='shop')return{ok:false,reason:'shop'};
    const cost=shopRandomPrice();if(s.coins<cost)return{ok:false,reason:'coins'};
    const tile=claimNextGenerationTile();if(!tile)return{ok:false,reason:'no-tiles'};
    const delivery=deliverPurchasedTile(tile),purchase=applyPurchase(cost);
    if(s.blocked&&s.failureReason==='no-tiles'){s.blocked=false;s.failureReason=null;s.needsReroll=false}
    s.events.push({type:'tile-buy',round:s.round+1,shop:'shop',mode:'random',tile:cloneTile(tile),delivery:delivery.location,baseCost:cfg.SHOP_RANDOM_TILE_COST||1,cost,coins:s.coins,...purchase});
    const affordability=shopPurchaseAvailability(),shopClosedReason=affordability.blockedByCoins?'insufficient-coins':null;if(shopClosedReason)closeShopState(shopClosedReason);
    return{ok:true,tile:cloneTile(tile),delivery:delivery.location,cost,inflation:s.inflation,shopClosedReason}
  }
  function buyShopTileOffer(tileId){
    if(!s.shopOpen||s.shopType!=='shop')return{ok:false,reason:'shop'};
    const offers=ensureShopTileOffers(),index=offers.findIndex(t=>t.id===tileId);if(index<0)return{ok:false,reason:'offer'};
    const cost=shopTileOfferPrice();if(s.coins<cost)return{ok:false,reason:'coins'};
    if(s.set.some(t=>t.id===tileId))return{ok:false,reason:'owned'};
    const tile=cloneTile(offers[index]);s.shopTileOffers.splice(index,1);s.set.push(tile);
    const delivery=deliverPurchasedTile(tile),purchase=applyPurchase(cost);
    if(s.blocked&&s.failureReason==='no-tiles'){s.blocked=false;s.failureReason=null;s.needsReroll=false}
    s.events.push({type:'tile-buy',round:s.round+1,shop:'shop',mode:'offer',tile:cloneTile(tile),delivery:delivery.location,baseCost:cfg.SHOP_TILE_OFFER_COST||2,cost,coins:s.coins,...purchase});
    const affordability=shopPurchaseAvailability(),shopClosedReason=affordability.blockedByCoins?'insufficient-coins':null;if(shopClosedReason)closeShopState(shopClosedReason);
    return{ok:true,tile:cloneTile(tile),delivery:delivery.location,cost,inflation:s.inflation,shopClosedReason}
  }

  function marketMods(){return M.all().filter(m=>m.market)}
  function marketOfferAffordability(offerIds=s.shopOffers){
    const ids=Array.isArray(offerIds)?offerIds:[],prices=ids.map(id=>marketModPrice(id)).filter(Number.isFinite),hasAny=prices.length>0,canAffordAny=prices.some(price=>s.coins>=price);
    return{hasAny,canAffordAny,blockedByCoins:hasAny&&!canAffordAny,cheapestPrice:prices.length?Math.min(...prices):null,coins:s.coins}
  }
  function marketModPrice(id){
    const m=M.get(id),base=m?.marketCostKey?Number(cfg[m.marketCostKey]):NaN;
    return Number.isFinite(base)?discountedMarketCost(base):Infinity
  }
  function placedPhysicalTiles(){
    const seen=new Set(),placed=[];
    for(const p of s.pieces){const tile=s.set.find(t=>t.id===p.tile.id)||p.tile;if(!tile||seen.has(tile.id))continue;seen.add(tile.id);placed.push(tile)}
    return placed
  }
  function marketTargetTiles(id){
    const m=M.get(id);if(!m)return[];
    const placed=placedPhysicalTiles(),current=new Set(assignedTileIdsForMod(id));
    if(m.target==='double')return placed.filter(t=>isDouble(t)&&t.a>0&&!current.has(t.id)&&!tileHasAnyTileMod(t.id,id));
    if(m.target==='zero-port'){
      const pair=new Set(assignedTileIdsForMod('zero-port'));
      return placed.filter(t=>isZero(t)&&!pair.has(t.id)&&!tileHasAnyTileMod(t.id,'zero-port'))
    }
    if(m.target==='tile'){
      let candidates=placed.filter(t=>!current.has(t.id)&&!tileHasAnyTileMod(t.id,id));
      if(m.eligibility==='non-double')candidates=candidates.filter(t=>!isDouble(t));
      if(m.eligibility==='non-power')candidates=candidates.filter(t=>(Number(t.powerMultiplier)||1)<=1);
      if(m.eligibility==='upgraded')candidates=candidates.filter(t=>(Number(t.upgrade)||0)>0);
      if(m.eligibility==='nonzero')candidates=candidates.filter(t=>!isZero(t));
      if(m.eligibility==='signal-nonzero-nondouble')candidates=candidates.filter(t=>!isDouble(t)&&!isZero(t));
      if(m.eligibility==='hinge')candidates=candidates.filter(t=>{if(isDouble(t)||isZero(t))return false;const piece=s.pieces.find(p=>p.tile.id===t.id);return!!piece&&E.hingeAlternates(piece,s.pieces).length>0});
      if(m.category==='topology')candidates=candidates.filter(t=>topologyModActive(id,t.id,s.pieces));
      return candidates
    }
    return[]
  }
  function marketTargetCount(id){
    const m=M.get(id);if(!m)return 0;
    if(m.target==='machine')return s.mods.includes(id)?0:1;
    return marketTargetTiles(id).length
  }
  function marketOfferInfo(id){
    const m=M.get(id),price=marketModPrice(id),targetTiles=m?.target==='machine'?[]:marketTargetTiles(id).map(cloneTile),targetCount=m?.target==='machine'?marketTargetCount(id):targetTiles.length,offered=s.shopOffers.includes(id),locked=s.marketBuys.length>=(cfg.MARKET_PURCHASE_LIMIT||1);
    return{id,mod:m,price,targetCount,targetTiles,offered,locked,assignedTileIds:assignedTileIdsForMod(id),offerWeight:marketOfferWeight(id),brokerDiscount:brokerDiscountAmount(),canBuy:!!m&&m.market&&offered&&!locked&&targetCount>0&&s.coins>=price}
  }
  function marketOfferWeight(id){
    const mod=M.get(id);if(!mod?.market)return 0;
    const installed=mod.category==='topology'&&assignedTileIdsForMod(id).some(tileId=>topologyModActive(id,tileId,s.pieces));
    return installed?Math.max(0.01,Number(cfg.MARKET_ACTIVE_TOPOLOGY_WEIGHT)||0.25):1
  }
  function zeroPortCompletionPriority(){
    return assignedTileIdsForMod('zero-port').length===1&&marketTargetCount('zero-port')>0
  }
  function generateMarketOffers(){
    const pool=marketMods().filter(m=>marketTargetCount(m.id)>0).map(m=>({id:m.id,weight:marketOfferWeight(m.id)})),out=[],limit=Math.max(0,Number(cfg.MARKET_OFFER_COUNT)||3),prioritizeZeroPort=zeroPortCompletionPriority();
    while(pool.length&&out.length<limit){
      const total=pool.reduce((sum,item)=>sum+item.weight,0);let roll=rnd()*total,index=pool.length-1;
      for(let i=0;i<pool.length;i++){roll-=pool[i].weight;if(roll<=0){index=i;break}}
      out.push(pool.splice(index,1)[0].id)
    }
    if(prioritizeZeroPort&&limit>0&&!out.includes('zero-port')){
      const zpIndex=pool.findIndex(item=>item.id==='zero-port');
      if(zpIndex>=0){
        if(out.length<limit)out.push(pool.splice(zpIndex,1)[0].id);
        else out[out.length-1]='zero-port'
      }
    }
    return out
  }
  function openIntermission(){
    if(s.pendingCircuit||s.pendingModPlacement||!s.cleared||s.intermissionResolved||s.nextShopType!=='market'||s.shopOpen)return false;
    s.marketCount=(s.marketCount||0)+1;const foundationIncome=awardFoundationIncome();s.shopOpen=true;s.shopType='market';s.marketBuys=[];s.shopOffers=generateMarketOffers();
    const affordability=marketOfferAffordability(s.shopOffers);s.events.push({type:'shop-open',round:s.round+1,shop:'market',offers:[...s.shopOffers],offerWeights:Object.fromEntries(s.shopOffers.map(id=>[id,marketOfferWeight(id)])),zeroPortCompletionPriority:zeroPortCompletionPriority(),foundationCoins:foundationIncome.total||0,brokerDiscount:brokerDiscountAmount(),coins:s.coins,inflation:s.inflation,available:availableTileCount(),purchaseLimit:cfg.MARKET_PURCHASE_LIMIT||1,cheapestPrice:affordability.cheapestPrice});
    if(affordability.blockedByCoins){closeMarketState('insufficient-coins',true);return advance()}
    return true
  }
  function closeMarketState(reason,resolved){
    s.events.push({type:'shop-close',round:s.round+1,shop:'market',reason,coins:s.coins,inflation:s.inflation,available:availableTileCount()});
    s.shopOpen=false;s.shopType=null;s.shopOffers=[];s.nextShopType='none';s.intermissionResolved=!!resolved
  }
  function resolveIntermission(reason='continue'){
    if(s.pendingModPlacement||!s.shopOpen||s.shopType!=='market')return false;
    closeMarketState(reason,true);return true
  }
  function beginPendingModPlacement(id,previousTileId,recordIndex){
    const pair=assignedTileIdsForMod('zero-port');
    if(id==='zero-port'&&pair.length===2){
      s.pendingModPlacement={mod:id,stage:'source',eligibleTileIds:[...pair],sourceTileId:null,previousTileId:null,recordIndex};
      return s.pendingModPlacement
    }
    const eligibleTileIds=marketTargetTiles(id).map(t=>t.id);
    s.pendingModPlacement={mod:id,stage:'target',eligibleTileIds,sourceTileId:null,previousTileId:previousTileId||null,recordIndex};
    return s.pendingModPlacement
  }
  function buyMarketMod(id){
    if(!s.shopOpen||s.shopType!=='market')return{ok:false,reason:'shop'};
    if(!s.shopOffers.includes(id))return{ok:false,reason:'offer'};
    if(s.marketBuys.length>=(cfg.MARKET_PURCHASE_LIMIT||1))return{ok:false,reason:'limit'};
    const m=M.get(id);if(!m?.market)return{ok:false,reason:'item'};
    const targetCount=marketTargetCount(id);if(targetCount<1)return{ok:false,reason:'no-target'};
    const cost=marketModPrice(id);if(s.coins<cost)return{ok:false,reason:'coins'};
    const previousTileId=assignedTileIdsForMod(id)[0]||null,brokerDiscount=brokerDiscountAmount(),purchase=applyPurchase(cost);
    if(brokerDiscount>0)s.brokerDiscountReady=false;
    s.undoFrame=null;
    const record={mod:id,tile:null,targetTileId:null,previousTileId,cost,brokerDiscount,inflationBefore:purchase.inflationBefore,inflationAfter:purchase.inflationAfter,pending:m.target!=='machine'};s.marketBuys.push(record);
    s.events.push({type:'market-mod-buy',mod:id,round:s.round+1,shop:'market',targetTileId:null,previousTileId,candidateCount:targetCount,pending:m.target!=='machine',baseCost:Number(cfg[m.marketCostKey])||0,brokerDiscount,cost,coins:s.coins,...purchase});
    if(brokerDiscount>0)s.events.push({type:'broker-discount',round:s.round+1,mod:id,amount:brokerDiscount,cost,coins:s.coins});
    if(m.target==='machine'){
      if(!s.mods.includes(id))s.mods.push(id);closeMarketState('mod-installed',true);
      return{ok:true,mod:id,pending:false,targetTileId:null,previousTileId,candidateCount:targetCount,cost,inflation:s.inflation}
    }
    const pending=beginPendingModPlacement(id,previousTileId,s.marketBuys.length-1);closeMarketState('mod-placement',false);
    return{ok:true,mod:id,pending:true,stage:pending.stage,eligibleTileIds:[...pending.eligibleTileIds],previousTileId,candidateCount:targetCount,cost,inflation:s.inflation}
  }
  function chooseMarketModTile(tileId){
    const pending=s.pendingModPlacement;if(!pending||s.running||s.shopOpen)return{ok:false,reason:'state'};
    if(!pending.eligibleTileIds.includes(tileId))return{ok:false,reason:'target'};
    const mod=M.get(pending.mod);if(!mod)return{ok:false,reason:'item'};
    if(pending.mod==='zero-port'&&pending.stage==='source'){
      const targets=marketTargetTiles('zero-port').map(t=>t.id);
      if(!targets.length)return{ok:false,reason:'no-target'};
      pending.stage='target';pending.sourceTileId=tileId;pending.eligibleTileIds=targets;
      s.events.push({type:'market-mod-relocate-source',round:s.round+1,mod:pending.mod,sourceTileId:tileId,eligibleTileIds:[...targets]});
      return{ok:true,pending:true,mod:pending.mod,stage:'target',sourceTileId:tileId,eligibleTileIds:[...targets]}
    }
    if(pending.mod==='diode'&&pending.stage==='target'){
      pending.stage='direction';pending.targetTileId=tileId;pending.eligibleTileIds=[tileId];
      s.events.push({type:'market-mod-direction',round:s.round+1,mod:'diode',targetTileId:tileId});
      return{ok:true,pending:true,mod:'diode',stage:'direction',targetTileId:tileId,eligibleTileIds:[tileId]}
    }
    let previousTileId=pending.previousTileId||null;
    if(pending.mod==='zero-port'){
      const pair=assignedTileIdsForMod('zero-port');
      if(pair.length<2)s.zeroPortTileIds=[...pair,tileId];
      else{
        const source=pending.sourceTileId;if(!source||!pair.includes(source))return{ok:false,reason:'source'};
        previousTileId=source;s.zeroPortTileIds=pair.map(id=>id===source?tileId:id)
      }
    }else{
      let hingeState=null;
      if(pending.mod==='hinge'){
        const piece=s.pieces.find(p=>p.tile.id===tileId),alternate=piece&&E.hingeAlternates(piece,s.pieces)[0];if(!piece||!alternate)return{ok:false,reason:'no-target'};
        hingeState={tileId,pivotTileId:alternate.pivotTileId,positions:[{x:piece.cubes[0].x,y:piece.cubes[0].y,z:piece.z||0,rr:piece.rr},{...alternate.placement}],active:0}
      }
      if(!setSingleTileMod(pending.mod,tileId))return{ok:false,reason:'unsupported'};
      if(pending.mod==='hinge')s.hingeState=hingeState
    }
    if(pending.mod==='foundation'){s.foundationAssignedMarket=s.marketCount||0;s.foundationLastPayoutMarket=s.marketCount||0}
    if(pending.mod==='toll')s.tollArmed=false;
    const tile=s.set.find(t=>t.id===tileId)||s.pieces.find(p=>p.tile.id===tileId)?.tile||null,record=s.marketBuys[pending.recordIndex];
    if(record){record.tile=cloneTile(tile);record.targetTileId=tileId;record.previousTileId=previousTileId;record.pending=false}
    s.pendingModPlacement=null;s.intermissionResolved=true;s.nextShopType='none';
    s.events.push({type:'market-mod-assign',mod:pending.mod,round:s.round+1,tile:cloneTile(tile),targetTileId:tileId,previousTileId,zeroPortTileIds:pending.mod==='zero-port'?[...s.zeroPortTileIds]:undefined});
    return{ok:true,pending:false,mod:pending.mod,tile:cloneTile(tile),targetTileId:tileId,previousTileId,zeroPortTileIds:pending.mod==='zero-port'?[...s.zeroPortTileIds]:undefined}
  }
  function chooseMarketModHalf(tileId,half){
    const pending=s.pendingModPlacement;if(!pending||pending.mod!=='diode'||pending.stage!=='direction'||s.running||s.shopOpen)return{ok:false,reason:'state'};
    half=Number(half);if(pending.targetTileId!==tileId||!pending.eligibleTileIds.includes(tileId)||(half!==0&&half!==1))return{ok:false,reason:'target'};
    if(!setSingleTileMod('diode',tileId))return{ok:false,reason:'unsupported'};s.diodeInHalf=half;
    const previousTileId=pending.previousTileId||null,tile=s.set.find(t=>t.id===tileId)||s.pieces.find(p=>p.tile.id===tileId)?.tile||null,record=s.marketBuys[pending.recordIndex];
    if(record){record.tile=cloneTile(tile);record.targetTileId=tileId;record.previousTileId=previousTileId;record.pending=false;record.inHalf=half}
    s.pendingModPlacement=null;s.intermissionResolved=true;s.nextShopType='none';
    s.events.push({type:'market-mod-assign',mod:'diode',round:s.round+1,tile:cloneTile(tile),targetTileId:tileId,previousTileId,inHalf:half});
    return{ok:true,pending:false,mod:'diode',tile:cloneTile(tile),targetTileId:tileId,previousTileId,inHalf:half}
  }
  function buyDoubleDouble(){return buyMarketMod('double-double')}
  function closeMarket(){return resolveIntermission('continue')}

  function canStartEndless(){return !s.pendingCircuit&&!s.pendingModPlacement&&!!s.standardComplete&&!s.endlessMode&&s.cleared&&s.round===cfg.TOTAL_ROUNDS-1&&!s.running&&!s.shopOpen}
  function startEndless(){
    if(!canStartEndless())return false;
    s.endlessMode=true;s.endlessStartedRound=s.round+2;s.systemStrain=0;s.endlessLongRunActivations=0;s.undoFrame=null;
    s.events.push({type:'endless-start',afterRound:s.round+1,nextRound:s.round+2,target:targetForRound(s.round+1)});
    scheduleIntermission();
    return s.nextShopType==='market'?openIntermission():advance()
  }
  function advance(){if(s.pendingCircuit||!s.cleared||s.shopOpen||!s.intermissionResolved)return false;if(!s.endlessMode&&s.round>=cfg.TOTAL_ROUNDS-1)return false;s.round++;startRound(false);return true}
  function status(){if(s.pendingCircuit)return'CIRCUIT CHOICE';if(s.pendingModPlacement)return'MOD CHOICE';if(s.endlessMode)return s.blocked?'ENDLESS FAILED':s.cleared?'ENDLESS CLEAR':'ENDLESS';return s.standardComplete&&s.cleared&&s.round===cfg.TOTAL_ROUNDS-1?'COMPLETE':s.blocked?'ROUND FAILED':'IN PROGRESS'}

  function recoveryOptions(){
    const failure=s.needsReroll?'no-legal-moves':s.failureReason,shopAvailable=canOpenShop(),undo=canUndo();
    const ownedReroll=canUseReroll(),ownedMove=failure==='placement-limit'&&canUseMove();
    const toolReroll=canBuyTool('reroll')&&toolPurchaseQuote('reroll',1).canAfford,toolMove=canBuyTool('move')&&toolPurchaseQuote('move',1).canAfford,shopTile=shopAvailable&&s.coins>=shopRandomPrice();
    const shopRescue=failure==='no-tiles'?shopTile:false,toolRescue=failure==='placement-limit'?toolMove:false,rerollRescue=failure==='no-legal-moves'?toolReroll:false;
    const recoverable=failure==='no-legal-moves'?rerollRescue:failure==='placement-limit'?(ownedMove||undo||toolRescue):failure==='no-tiles'?(undo||shopRescue):undo;
    return{recoverable,undo,ownedReroll,ownedMove,shopAvailable,shopRescue,toolRescue,rerollRescue,toolReroll,toolMove,shopTile,prices:{reroll:toolPrice('reroll'),move:toolPrice('move'),undo:toolPrice('undo'),randomTile:shopRandomPrice()}}
  }

  function snapshot(){
    const size=stageSize(),stage=stageIndex(),bs=E.getBoardSize?E.getBoardSize():{G:E.G,H:E.H},tileMods=allTileModAssignments();
    const tileById=id=>id?cloneTile(s.set.find(t=>t.id===id)):null;
    return{
      circuits:{ranks:{...s.circuitRanks},signatures:[...s.circuitSignatures],pending:deepClone(s.pendingCircuit),tileLimit:circuitTileLimit()},
      powerSets:{generation:s.setGeneration||1,powerMultiplier:generationPower(s.setGeneration||1)},
      schema:'iterion.run.v9',gameVersion:cfg.VERSION,engineVersion:cfg.ENGINE_VERSION,gameMode:s.gameMode||'classic',runId:s.runId,seed:s.seed,startedAt:s.startedAt,savedAt:new Date().toISOString(),
      status:status(),failureReason:s.failureReason,recovery:recoveryOptions(),
      endless:{systemStrain:s.systemStrain||0,longRunActivations:s.endlessLongRunActivations||0,longRunActivationCap:cfg.ENDLESS_LONG_RUN_ACTIVATIONS??7,available:canStartEndless(),active:!!s.endlessMode,baseComplete:!!s.standardComplete,startedRound:s.endlessStartedRound,roundsCleared:Math.max(0,s.wins.length-cfg.TOTAL_ROUNDS),targetMultiplier:cfg.ENDLESS_TARGET_MULTIPLIER||5,phase:infinitePhase()?'infinite':s.endlessMode?'endless':'classic',infinitePhase:infinitePhase(),infinitePhaseStartRound:infinitePhaseStartRound()+1,endlessStagesCompleted:endlessStagesCompleted(),boardGrowthStageInterval:Math.max(1,Number(cfg.INFINITE_BOARD_STAGE_INTERVAL)||2),handSize:handSizeForRound()},
      round:{index:s.round+1,total:cfg.TOTAL_ROUNDS,target:target(),placements:s.roundTurn,maxPlacements:maxPlacements(),clears:s.wins,upgradeCoins:s.roundUpgradeCoins},
      stage:{index:stage+1,total:Math.ceil(cfg.TOTAL_ROUNDS/size),round:(s.round%size)+1,size},boardSize:{width:bs.G,height:bs.H},
      score:{last:s.score,best:s.best},turnCount:s.turn,coins:s.coins,inflation:s.inflation,consumables:{...s.consumables},freeReroll:s.freeReroll||0,
      mods:[...s.mods],tileMods:deepClone(tileMods),pendingModPlacement:deepClone(s.pendingModPlacement),anchorId:s.anchorId,
      doubleDoubleTileId:s.doubleDoubleTileId,doubleDouble:tileById(s.doubleDoubleTileId),
      doubleEchoTileId:s.doubleEchoTileId,doubleEcho:tileById(s.doubleEchoTileId),
      tripleDoubleTileId:s.tripleDoubleTileId,tripleDouble:tileById(s.tripleDoubleTileId),
      zeroPortTileIds:[...(s.zeroPortTileIds||[])],
      parityExchangeTileId:s.parityExchangeTileId||null,cornerTileId:s.cornerTileId||null,longLineTileId:s.longLineTileId||null,overloadTileId:s.overloadTileId||null,terminalTileId:s.terminalTileId||null,diodeTileId:s.diodeTileId||null,diodeInHalf:Number.isInteger(s.diodeInHalf)?s.diodeInHalf:null,returnTileId:s.returnTileId||null,twinTileId:s.twinTileId||null,pairTileId:s.pairTileId||null,bridgeTileId:s.bridgeTileId||null,gateTileId:s.gateTileId||null,fanTileId:s.fanTileId||null,brokerTileId:s.brokerTileId||null,crownTileId:s.crownTileId||null,spendTileId:s.spendTileId||null,mergeTileId:s.mergeTileId||null,hingeTileId:s.hingeTileId||null,hingeState:deepClone(s.hingeState),bankTileId:s.bankTileId||null,tollTileId:s.tollTileId||null,tollArmed:!!s.tollArmed,brokerDiscountReady:!!s.brokerDiscountReady,foundationTileId:s.foundationTileId||null,knotTileId:s.knotTileId||null,mirrorTileId:s.mirrorTileId||null,mintTileId:s.mintTileId||null,
      longRun:s.mods.includes('long-run'),setSize:s.set.length,set:s.set.map(cloneTile),placedTileIds:[...s.placedTileIds],availableTileCount:availableTileCount(),machinePersistent:!!cfg.PERSIST_MACHINE_BETWEEN_ROUNDS,
      rerollsLeft:(s.freeReroll||0)+(s.consumables.reroll||0),canUndo:canUndo(),
      shop:{nextType:s.nextShopType,resolved:s.intermissionResolved,open:s.shopOpen,type:s.shopType,offers:[...s.shopOffers],randomTilePrice:shopRandomPrice(),tileOfferGeneration:s.shopTileOfferGeneration||nextSetGeneration(),tileOffers:ensureShopTileOffers().map(t=>({tile:cloneTile(t),price:shopTileOfferPrice()})),doubleDoublePrice:marketDoubleDoublePrice(),marketOffers:s.shopOffers.map(id=>{const info=marketOfferInfo(id);return{id,category:info.mod?.category||null,price:info.price,targetCount:info.targetCount,locked:info.locked,offerWeight:info.offerWeight,brokerDiscount:info.brokerDiscount||0,assignedTileIds:[...info.assignedTileIds]}})},
      tileModState:{marketCount:s.marketCount||0,foundationAssignedMarket:Number.isInteger(s.foundationAssignedMarket)?s.foundationAssignedMarket:null,foundationLastPayoutMarket:Number.isInteger(s.foundationLastPayoutMarket)?s.foundationLastPayoutMarket:null,foundationProgress:foundationAgeForTile(s.foundationTileId),foundationInterval:Math.max(1,Number(cfg.FOUNDATION_MARKETS)||3),tollArmed:!!s.tollArmed,brokerDiscountReady:!!s.brokerDiscountReady,brokerDiscount:brokerDiscountAmount(),mintPaidRound:Number.isInteger(s.mintPaidRound)?s.mintPaidRound+1:null,diodeInHalf:Number.isInteger(s.diodeInHalf)?s.diodeInHalf:null,hinge:deepClone(s.hingeState)},
      zeroStats:{...s.roundZero},hand:s.hand.filter(Boolean).map(cloneTile),reserve:s.reserve.map(cloneTile),
      board:s.pieces.map(p=>({id:p.id,tileId:p.tile.id,a:p.tile.a,b:p.tile.b,upgrade:p.tile.upgrade||0,source:p.tile.source||'base',generation:p.tile.generation||1,powerMultiplier:p.tile.powerMultiplier||1,modifiers:tileModIdsForTile(p.tile.id),x:p.cubes[0].x,y:p.cubes[0].y,z:0,rr:p.rr})),
      turns:s.events.map(e=>deepClone(e))
    }
  }

  function debugText(){
    const x=snapshot(),up=x.set.filter(t=>t.upgrade).map(t=>`[${t.a}|${t.b}]★${t.upgrade}`).join(', ')||'-';
    const activeIssue=s.needsReroll?'no-legal-moves':x.failureReason;
    const lines=[`MONOID DEBUG v${x.gameVersion}`,`Mode: ${(x.gameMode||'classic').toUpperCase()}`,`Run ID: ${x.runId}`,`Seed: ${x.seed}`,`Result: ${x.status}${activeIssue?` · ${activeIssue}`:''}`,`Stage: ${x.stage.index}/${x.endless.active?'∞':x.stage.total} · round ${x.stage.round}/${x.stage.size}`,`Round: ${x.round.index}/${x.endless.active?'∞':x.round.total} · target=${x.round.target} · moves=${x.round.placements}/${x.round.maxPlacements}`,`Board: ${x.boardSize.width}x${x.boardSize.height} · Machine: ${x.board.length} pieces · unique=${new Set(x.placedTileIds).size}/${x.placedTileIds.length}`,`Set: ${x.setSize} tiles · available=${x.availableTileCount} · generation=${x.powerSets.generation} · power=x${x.powerSets.powerMultiplier}`,`Last output: ${x.score.last}`,`Best output: ${x.score.best}`,`Coins: ${x.coins} · Inflation: ${x.inflation} · Tools: move=${x.consumables.move}, reroll=${x.consumables.reroll}, freeReroll=${x.freeReroll}, undo=${x.consumables.undo}`,`Anchor: ${s.anchorId||'-'} · Upgraded tiles: ${up}`,`Tile Mods: DD=${x.doubleDoubleTileId||'-'} · DE=${x.doubleEchoTileId||'-'} · TD=${x.tripleDoubleTileId||'-'} · ZP=${x.zeroPortTileIds.length?x.zeroPortTileIds.join('<->'):'-'} · PX=${x.parityExchangeTileId||'-'} · CR=${x.cornerTileId||'-'} · LN=${x.longLineTileId||'-'} · OV=${x.overloadTileId||'-'} · TE=${x.terminalTileId||'-'} · DI=${x.diodeTileId||'-'}${Number.isInteger(x.diodeInHalf)?`:IN${x.diodeInHalf}`:''} · RT=${x.returnTileId||'-'} · TW=${x.twinTileId||'-'} · PR=${x.pairTileId||'-'} · BR=${x.bridgeTileId||'-'} · GT=${x.gateTileId||'-'} · FN=${x.fanTileId||'-'} · BO=${x.brokerTileId||'-'} · CW=${x.crownTileId||'-'} · SP=${x.spendTileId||'-'} · MG=${x.mergeTileId||'-'} · HG=${x.hingeTileId||'-'} · BK=${x.bankTileId||'-'} · TL=${x.tollTileId||'-'} · FD=${x.foundationTileId||'-'} · KN=${x.knotTileId||'-'} · MR=${x.mirrorTileId||'-'} · MT=${x.mintTileId||'-'}`,`Machine Mods: ${x.longRun?'LONG CHAIN':'-'}`,`Endless: ${x.endless.active?`active · phase=${x.endless.phase} · baseComplete=${x.endless.baseComplete?'yes':'no'} · clears=${x.endless.roundsCleared} · endlessStages=${x.endless.endlessStagesCompleted} · hand=${x.endless.handSize}`:x.endless.baseComplete?'available · baseComplete=yes':'off'}`,`Next: ${x.shop.nextType} · open=${x.shop.open?'yes':'no'}${x.shop.open?` (${x.shop.type})`:''}`,`Round clears: ${x.round.clears.map(w=>`R${w.round} target=${w.target} output=${w.output} moves=${w.placements} machine=${w.machineSize} set=${w.setSize} gen=${w.setGeneration||1} reward=${w.reward} upgradeCoins=${w.upgradeCoins||0} anchor=[${w.anchor.a}|${w.anchor.b}]★${w.upgradeTier}`).join(' | ')||'-'}`,''];
    lines.splice(11,0,`System Strain: ${s.systemStrain||0} · Long Chain Endless: ${s.endlessLongRunActivations||0}/${cfg.ENDLESS_LONG_RUN_ACTIVATIONS??7}`);
    lines.splice(13,0,`Mod State: Markets=${s.marketCount||0} · DIODE in=${Number.isInteger(s.diodeInHalf)?s.diodeInHalf:'-'} · HINGE=${s.hingeState?`${s.hingeState.active===1?'B':'A'} pivot=${s.hingeState.pivotTileId}`:'-'} · TOLL=${s.tollTileId?(s.tollArmed?'armed':'disarmed'):'-'} · BROKER=${s.brokerDiscountReady?`ready -${brokerDiscountAmount()}c`:'-'} · FOUNDATION=${foundationAgeForTile(s.foundationTileId)}/${Math.max(1,Number(cfg.FOUNDATION_MARKETS)||3)} · MINT paidRound=${Number.isInteger(s.mintPaidRound)?s.mintPaidRound+1:'-'}`);
    const tileText=t=>`[${t.a}|${t.b}]${t.powerMultiplier>1?`×${t.powerMultiplier}`:''} id=${t.id}`;
    const hand=handPlacementDiagnostics();
    lines.push(`Current hand: ${hand.map(h=>`#${h.index+1} ${tileText(h.tile)} legal=${h.legalPlacements}`).join(' | ')||'-'}`);
    lines.push(`Recovery: recoverable=${x.recovery.recoverable?'yes':'no'} · undo=${x.recovery.undo?'yes':'no'} · ownedReroll=${x.recovery.ownedReroll?'yes':'no'} · buyReroll=${x.recovery.toolReroll?`yes@${x.recovery.prices.reroll}c`:'no'} · ownedMove=${x.recovery.ownedMove?'yes':'no'} · buyMove=${x.recovery.toolMove?`yes@${x.recovery.prices.move}c`:'no'}`);
    lines.push(`Circuits: ${Object.entries(x.circuits.ranks).map(([id,rank])=>`${id}:C${rank}`).join(',')||'-'} · slots=${Object.keys(x.circuits.ranks).length}/${x.circuits.tileLimit} · discovered=${x.circuits.signatures.length} · pending=${x.circuits.pending?.signature||'-'}`);
    for(const v of x.turns){
      if(v.type==='signal-resolution'){const trace=Array.isArray(v.events)?JSON.stringify(v.events):v.traceCompacted?'COMPACTED_AFTER_RESTORE':'-';lines.push(`T${v.move} SIGNAL TREE splits=${v.splitCount} base=${v.baseOutput} selection=${v.selectionOutput??v.baseOutput} trace=${trace}`);continue}
      if(v.type==='power-set'){lines.push(`R${v.round} POWER SET ${v.generation} UNLOCKED size=${v.size} power=x${v.powerMultiplier} source=${v.source}`);continue}
      if(v.type==='power-set-hand-refill'){lines.push(`R${v.round} POWER SET ${v.generation} HAND REFILL +${v.filled} hand=${v.hand?.map(tileText).join(',')||'-'}`);continue}
      if(v.type==='round-reroll'){lines.push(`R${v.round} FREE REROLL +${v.granted}${v.replaced?` refresh=${v.replaced}>${v.granted}`:''}`);continue}
      if(v.type==='circuit-check'){lines.push(`R${v.round} CIRCUIT NONE move=${v.move}`);continue}
      if(v.type==='circuit-closed'){lines.push(`R${v.round} CIRCUIT CLOSED size=${v.size} reward=+${v.reward} limit=${v.circuitTileLimit||cfg.CIRCUIT_TILE_LIMIT} signature=${v.signature} eligible=${v.eligibleTileIds.join(',')||'-'} unavailable=${v.unavailable||'no'}`);continue}
      if(v.type==='circuit-upgrade'){lines.push(`R${v.round} CIRCUIT UPGRADE [${v.tile?.a}|${v.tile?.b}] id=${v.tileId} rank=${v.before}>${v.after} signature=${v.signature}`);continue}
      if(v.type==='circuit-resonance'){lines.push(`T${v.move} CIRCUIT(active=${v.active.map(t=>`${t.tileId}:C${t.rank}`).join(',')||'-'} resonance=+${v.bonus*100}% x${v.multiplier} base=${v.baseOutput} final=${v.output} safeInteger=${v.safeInteger})`);continue}
      if(v.type==='reroll'){lines.push(`R${v.round} REROLL source=${v.source||'stored'}${v.automatic?' AUTO':''} after move ${v.roundTurn} stored=${v.remaining} free=${v.freeRemaining??0} hand=${v.hand?.map(tileText).join(',')||'-'}`);continue}
      if(v.type==='opening-protection'){lines.push(`R1 OPENING PROTECTION ${v.source} -> [${v.tile.a}|${v.tile.b}]${v.replaced?` swapped=[${v.replaced.a}|${v.replaced.b}]`:''}`);continue}
      if(v.type==='consume'){lines.push(`R${v.round} USE ${v.item.toUpperCase()} after move ${v.roundTurn} remaining=${v.remaining}${v.maxPlacements?` maxMoves=${v.maxPlacements}`:''}`);continue}
      if(v.type==='undo'){lines.push(`R${v.round} UNDO after move ${v.roundTurn} remaining=${v.remaining}${v.undone?` reverted=T${v.undone.turn} [${v.undone.tile.a}|${v.undone.tile.b}] output=${v.undone.output}`:''}${v.preservedPurchases?` preservedShop=${v.preservedPurchases} spend=${v.preservedSpend}`:''}${v.coinShortfall?` fundingShortfall=${v.coinShortfall}`:''}`);continue}
      if(v.type==='topology-mod-lost'){lines.push(`R${v.round} T${v.move} TOPOLOGY LOST ${v.label||String(v.mod||'').toUpperCase()} tile=${v.tileId} cause=${v.causeTileId||'-'}`);continue}
      if(v.type==='mint-coins'){lines.push(`R${v.round}.${v.roundTurn} MINT +${v.amount}c tile=${v.tileId} total=${v.coins}`);continue}
      if(v.type==='toll-coins'){lines.push(`R${v.round}.${v.roundTurn} TOLL ${v.amount}c tile=${v.tileId} total=${v.coins}`);continue}
      if(v.type==='toll-arm'){lines.push(`R${v.round}.${v.roundTurn} TOLL ${v.armed?'ARMED':'DISARMED'} tile=${v.tileId} coins=${v.coins}`);continue}
      if(v.type==='broker-ready'){lines.push(`R${v.round}.${v.roundTurn} BROKER READY -${v.discount}c tile=${v.tileId}`);continue}
      if(v.type==='broker-discount'){lines.push(`R${v.round} BROKER DISCOUNT -${v.amount}c mod=${v.mod} final=${v.cost} total=${v.coins}`);continue}
      if(v.type==='foundation-coins'){lines.push(`R${v.round} FOUNDATION +${v.amount}c cycles=${v.cycles} market=${v.marketCount} tile=${v.tileId} total=${v.coins}`);continue}
      if(v.type==='upgrade-coins'){lines.push(`R${v.round}.${v.roundTurn} UPGRADE COINS +${v.amount} total=${v.coins} tiles=${v.activations.map(a=>`[${a.a}|${a.b}]★${a.tier}`).join(',')} longRun=${v.longRunActive?'yes':v.longRunCapped?'capped':'no'}${v.endlessLongRunCap!=null?` endless=${v.endlessLongRunActivations||0}/${v.endlessLongRunCap}`:''} unique=${v.uniquePieces??'-'}`);continue}
      if(v.type==='coins'){lines.push(`R${v.round} CLEAR COINS +${v.amount} base=${v.breakdown?.base||0} quick=${v.breakdown?.quick||0} exact=${v.breakdown?.exact||0} total=${v.coins}`);continue}
      if(v.type==='tile-upgrade'){lines.push(`R${v.round} UPGRADE [${v.tile.a}|${v.tile.b}] ${v.from}>${v.to} overkill=x${v.ratio}`);continue}
      if(v.type==='anchor-set'){lines.push(`R${v.round} ANCHOR [${v.tile.a}|${v.tile.b}]★${v.tile.upgrade||0}`);continue}
      if(v.type==='run-complete'){lines.push(`RUN COMPLETE R${v.round} target=${v.target} output=${v.output} coins=${v.coins} inflation=${v.inflation}`);continue}
      if(v.type==='endless-start'){lines.push(`ENDLESS START R${v.nextRound} target=${v.target}`);continue}
      if(v.type==='opening-double'){lines.push(`R1 OPENING DOUBLE [${v.tile.a}|${v.tile.b}]`);continue}
      if(v.type==='board-expand'){lines.push(`STAGE ${v.stage} BOARD ${v.from.join('x')} > ${v.to.join('x')} offset=${v.offset.join(',')}`);continue}
      if(v.type==='stage-start'){lines.push(`STAGE ${v.stage} START R${v.round} coins=${v.coins} inflation=${v.inflation} available=${v.available} board=${v.board.join('x')} freeReroll=${v.freeReroll||0} generation=${v.setGeneration||1}`);continue}
      if(v.type==='shop-scheduled'){lines.push(`R${v.round} NEXT ${v.shop.toUpperCase()}`);continue}
      if(v.type==='shop-open'){lines.push(`R${v.round} ${v.shop.toUpperCase()} OPEN coins=${v.coins} inflation=${v.inflation} available=${v.available}${v.offers?.length?` offers=${v.offers.join(',')}`:''}`);continue}
      if(v.type==='shop-buy'){lines.push(`R${v.round} SHOP BUY ${v.item} intent=${v.intent||'store'} -${v.cost} coins=${v.coins} inflation=${v.inflationBefore}>${v.inflationAfter}`);continue}
      if(v.type==='tile-buy'){lines.push(`R${v.round} ${v.shop.toUpperCase()} ${v.mode.toUpperCase()} [${v.tile.a}|${v.tile.b}]${v.tile.powerMultiplier>1?`×${v.tile.powerMultiplier}`:''} id=${v.tile.id} delivery=${v.delivery||'-'} -${v.cost} coins=${v.coins} inflation=${v.inflationBefore}>${v.inflationAfter}`);continue}
      if(v.type==='double-double'){lines.push(`R${v.round} MARKET DOUBLE DOUBLE [${v.tile.a}|${v.tile.b}] id=${v.tile.id} -${v.cost} coins=${v.coins} inflation=${v.inflationBefore}>${v.inflationAfter}${v.previousTileId?` previous=${v.previousTileId}`:''}`);continue}
      if(v.type==='market-mod-buy'){lines.push(`R${v.round} MARKET MOD ${(v.mod||'').toUpperCase()} PURCHASE -${v.cost} coins=${v.coins} inflation=${v.inflationBefore}>${v.inflationAfter}${v.brokerDiscount?` broker=-${v.brokerDiscount}c`:''}${v.pending?' target=PENDING':' machine=INSTALLED'}${v.previousTileId?` previous=${v.previousTileId}`:''}`);continue}
      if(v.type==='market-mod-relocate-source'){lines.push(`R${v.round} MARKET MOD ${(v.mod||'').toUpperCase()} RELOCATE source=${v.sourceTileId} targets=${(v.eligibleTileIds||[]).join(',')||'-'}`);continue}
      if(v.type==='market-mod-assign'){lines.push(`R${v.round} MARKET MOD ${(v.mod||'').toUpperCase()} ASSIGN [${v.tile?.a}|${v.tile?.b}] id=${v.targetTileId}${v.previousTileId?` previous=${v.previousTileId}`:''}${v.zeroPortTileIds?` pair=${v.zeroPortTileIds.join('<->')}`:''}`);continue}
      if(v.type==='shop-close'){lines.push(`R${v.round} ${v.shop.toUpperCase()} CLOSE ${v.reason} coins=${v.coins} inflation=${v.inflation} available=${v.available}`);continue}
      if(v.type==='recovery-needed'){lines.push(`R${v.round} NO LEGAL MOVES after move ${v.roundTurn} hand=${v.hand?.map(tileText).join(',')||'-'}`);continue}
      if(v.type==='failure'){lines.push(`R${v.round} FAIL ${v.reason} after move ${v.roundTurn} hand=${v.hand?.map(tileText).join(',')||'-'}`);continue}
      if(Number.isInteger(v.turn))lines.push(`T${v.turn} R${v.round}.${v.roundTurn} [${v.tile.a}|${v.tile.b}]${v.tile.powerMultiplier>1?`×${v.tile.powerMultiplier}`:''}${v.tile.upgrade?`★${v.tile.upgrade}`:''} ${v.dir} @${v.placement.x},${v.placement.y},r${v.placement.rr} trigger=${v.trigger} output=${v.output} selection=${v.selectionOutput??v.output}${v.upgradeCoins?` coins=+${v.upgradeCoins}`:''}${v.mintCoins?` mint=+${v.mintCoins}c`:''}${v.tollCoins?` toll=-${v.tollCoins}c`:''}${v.brokerPrepared?' broker=READY':''} rebounds=${v.rebounds} start=${v.start}${v.flipped?' FLIPPED':''} reason=${v.reason} ops=${v.ops||'-'} routes=${v.routes||'-'} search=${v.search}${v.longRunActivated?` LR(unique=${v.uniquePieces},stars=+${v.starCoins})`:''}${v.zeroPorts?.length?` ZP(${v.zeroPorts.map(z=>`${z.fromTileId}>${z.toTileId}`).join(',')})`:''}${v.echo?` ECHO(main=${v.echo.mainOutput},echo=${v.echo.echoOutput},final=${v.echo.finalOutput})`:''}${v.clear?' CLEAR':''}`)
    }
    return lines.join('\n')
  }

  function compactEventForPersistence(event){
    if(!event||typeof event!=='object')return event;
    if(event.type==='signal-resolution'){
      const compact=deepClone(event);delete compact.events;compact.traceCompacted=true;return compact
    }
    return deepClone(event)
  }
  function compactEventsForPersistence(events){return(Array.isArray(events)?events:[]).map(compactEventForPersistence)}
  function persistedUndoFrame(frame){
    if(!frame)return null;
    const{events,undoFrame,...rest}=frame,out=deepClone(rest);
    out.events=[];out.persistenceEventCursor=Array.isArray(events)?events.length:0;out.undoFrame=null;return out
  }
  function persistedState(){
    const{events,undoFrame,pieces,...rest}=s,raw=deepClone(rest);
    raw.events=compactEventsForPersistence(events);raw.undoFrame=persistedUndoFrame(undoFrame);
    raw.pieces=s.pieces.map(p=>({id:p.id,tile:cloneTile(p.tile),x:p.cubes[0].x,y:p.cubes[0].y,rr:p.rr}));return raw
  }
  function save(){
    const x=snapshot();
    try{localStorage.setItem('iterion.latestRun.v9',JSON.stringify({...x,turns:compactEventsForPersistence(x.turns)}))}catch(_){}
    return x
  }
  function exportState(){return{schema:'iterion.state.v1',gameVersion:cfg.VERSION,state:persistedState()}}
  function restoreState(saved){
    const raw=saved?.schema==='iterion.state.v1'&&saved.state;if(!raw||!Array.isArray(raw.set)||!Array.isArray(raw.pieces))return false;
    s=deepClone(raw);const restoredMode=s.gameMode;s.gameMode=canonicalGameMode(restoredMode||cfg.GAME_MODE);if(restoredMode==='prototype'||restoredMode==='infinite-endless'){delete s.scoringModel;delete s.scoringFormula}if(!Array.isArray(s.shopTileOffers))s.shopTileOffers=[];if(!Number.isInteger(s.shopTileOfferGeneration))s.shopTileOfferGeneration=null;if(!Array.isArray(s.marketBuys))s.marketBuys=[];if(!Array.isArray(s.zeroPortTileIds))s.zeroPortTileIds=[];s.pendingModPlacement=s.pendingModPlacement||null;for(const field of Object.values(TILE_MOD_FIELDS))if(!(field in s))s[field]=null;if(!Number.isInteger(s.diodeInHalf))s.diodeInHalf=null;if(!s.hingeState||s.hingeState.tileId!==s.hingeTileId)s.hingeState=null;if(!Number.isInteger(s.marketCount))s.marketCount=(s.events||[]).filter(e=>e.type==='shop-open'&&e.shop==='market').length;if(!Number.isInteger(s.foundationAssignedMarket))s.foundationAssignedMarket=null;
    const legacyEconomyMods={frame:'broker',frontier:'spend',resonator:'bank',forge:'toll'},legacyFields={frameTileId:'brokerTileId',frontierTileId:'spendTileId',resonatorTileId:'bankTileId',forgeTileId:'tollTileId'};
    for(const [oldField,newField] of Object.entries(legacyFields))if(!s[newField]&&s[oldField])s[newField]=s[oldField];
    if(s.pendingModPlacement?.mod&&legacyEconomyMods[s.pendingModPlacement.mod])s.pendingModPlacement.mod=legacyEconomyMods[s.pendingModPlacement.mod];
    if(!Number.isInteger(s.foundationLastPayoutMarket))s.foundationLastPayoutMarket=Number.isInteger(s.foundationAssignedMarket)?s.foundationAssignedMarket:null;
    s.tollArmed=typeof s.tollArmed==='boolean'?s.tollArmed:false;s.brokerDiscountReady=!!s.brokerDiscountReady;
    if(!Number.isInteger(s.mintPaidRound))s.mintPaidRound=null;
    for(const field of ['zeroMemoryTileId','sequenceTileId','complementTileId','relayTileId','couplerTileId','frameTileId','frontierTileId','resonatorTileId','forgeTileId'])delete s[field];
    if(['sequence','complement','relay','coupler'].includes(s.pendingModPlacement?.mod)){s.pendingModPlacement=null;s.intermissionResolved=true;s.nextShopType='none'}ensureShopTileOffers();
    const desiredHandSize=handSizeForRound();if(Array.isArray(s.hand)&&s.hand.length>desiredHandSize){const overflow=s.hand.slice(desiredHandSize).filter(Boolean);s.hand=s.hand.slice(0,desiredHandSize);if(!Array.isArray(s.reserve))s.reserve=[];s.reserve.push(...overflow)}
    const size=boardSizeForStage(Math.floor((s.round||0)/stageSize()));E.setBoardSize(size[0],size[1]);
    s.pieces=raw.pieces.map(x=>{const p=E.pieceFrom(x.tile,x.x,x.y,0,x.rr,x.id);p.tile=cloneTile(x.tile);return p});pruneInactiveTopologyMods({record:false});return true
  }
  fresh(opts.seed);
  return{state:()=>s,config:cfg,moveResonance,chooseCircuitTile,circuitTileLimit,target,targetForRound,stageIndex,boardSizeForStage,infinitePhase,infinitePhaseStartRound,handSizeForRound,endlessStagesCompleted,candidatesForIndex,legalHandMask,handPlacementDiagnostics,topologyTelemetry,deckTelemetry,signalTelemetry,previewPlacement,topologyBreaksForPlacement,decisionTelemetry,canInteract,setTollArmed,beginPlacement,finishPlacement,reroll,canUseReroll,useMove,canUseMove,useUndo,canUndo,canUsePurchasedTool,recoveryOptions,advance,startEndless,canStartEndless,rotateRoot,setRootRotation,fresh,snapshot,debugText,save,exportState,restoreState,hasLegal,assessContinuation,maxPlacements,clearReward,clearRewardBreakdown,availableTileCount,toolPrice,toolPurchaseQuote,canBuyTool,buyTool,shopItemPrice,shopRandomPrice,shopTileOfferPrice,shopPurchaseAvailability,marketDoubleDoublePrice,marketModPrice,marketOfferAffordability,marketTargetCount,marketOfferInfo,canOpenShop,openShop,closeShop,buyShopItem,buyShopRandomTile,buyShopTileOffer,openIntermission,buyMarketMod,chooseMarketModTile,chooseMarketModHalf,buyDoubleDouble,closeMarket,resolveIntermission}
}
return{createGame}
});
