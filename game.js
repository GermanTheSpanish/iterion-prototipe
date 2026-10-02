(function(root,factory){
  const cjs=typeof module==='object'&&module.exports,api=cjs?factory(require('./data.js'),require('./mods.js'),require('./circuits.js'),require('./score.js')):factory(root.IterionData,root.IterionMods,root.IterionCircuits,root.MonoidScore);
  if(cjs)module.exports=api;else root.IterionGame=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(D,M,C,SCORE){
function createGame(E,opts={}){
  if(!E)throw new Error('IterionEngine required');if(!SCORE)throw new Error('MonoidScore required');
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
  function maxSetGeneration(){return Math.max(1,Number(cfg.MAX_SET_GENERATION)||3)}
  function ensureShopTileOffers(){
    const generation=nextSetGeneration();
    if(generation>maxSetGeneration()){s.shopTileOfferGeneration=null;s.shopTileOffers=[];return s.shopTileOffers}
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
    'recall':'recallTileId',
    'pair':'pairTileId',
    'bridge':'bridgeTileId',
    'pivot':'pivotTileId',
    'scrap':'scrapTileId',
    'broker':'brokerTileId',
    'swap':'swapTileId',
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
    if(!blockedReason){candidate=E.pieceFrom(piece.tile,target.x,target.y,target.z||0,target.rr,piece.id);candidate.tile={...piece.tile};if(pieceOverlapsCore(candidate))blockedReason='core-overlap';else if(pieceOverlapsVoid(candidate))blockedReason='void-overlap';const contact=!blockedReason&&E.contactBetweenPieces(candidate,pivot);if(!blockedReason&&(!contact.touch||!contact.ok))blockedReason='pivot'}
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
  const canonicalGameMode=mode=>mode==='eyes'||mode==='frames'||mode==='river'?mode:'classic';
  const coreGameMode=mode=>{const id=canonicalGameMode(mode);return id==='eyes'||id==='frames'||id==='river'};
  const infinitePhaseStartRound=()=>Math.max(0,(cfg.TOTAL_ROUNDS||0)+(cfg.INFINITE_PHASE_AFTER_STAGES||15)*stageSize());
  function infinitePhase(roundIndex=s.round){return !!s.endlessMode&&Math.max(0,Number(roundIndex)||0)>=infinitePhaseStartRound()}
  function ouroborosPhase(){return!!s.ouroborosMode}
  function handSizeForRound(roundIndex=s.round){return ouroborosPhase()?0:infinitePhase(roundIndex)?Math.max(1,Number(cfg.INFINITE_HAND_SIZE)||3):Math.max(1,Number(cfg.HAND_SIZE)||5)}
  function endlessStagesCompleted(roundIndex=s.round){return Math.max(0,Math.floor((Math.max(0,Number(roundIndex)||0)-(cfg.TOTAL_ROUNDS||0))/stageSize()))}

  const CORE_SIDES=Object.freeze(['U','R','D','L']);
  function coreHash(seed,index,salt=0){
    let x=((Number(seed)||0)>>>0)^Math.imul(index+1,0x9E3779B1)^Math.imul(salt+1,0x85EBCA6B);
    x^=x>>>16;x=Math.imul(x,0x7FEB352D);x^=x>>>15;x=Math.imul(x,0x846CA68B);x^=x>>>16;return x>>>0
  }
  function corePortsFor(seed,index){
    const count=1+(coreHash(seed,index,7)%4);
    return CORE_SIDES.map((side,order)=>({side,rank:coreHash(seed,index,20+order)})).sort((a,b)=>a.rank-b.rank||CORE_SIDES.indexOf(a.side)-CORE_SIDES.indexOf(b.side)).slice(0,count).map(x=>x.side)
  }
  function corePortsForArchetype(seed,index,archetype,existing=null){
    const ports=[...new Set(Array.isArray(existing)?existing:corePortsFor(seed,index))].filter(side=>CORE_SIDES.includes(side));
    if(archetype==='relay'&&ports.length<2){
      const missing=CORE_SIDES.filter(side=>!ports.includes(side)).map((side,order)=>({side,rank:coreHash(seed,index,61+order)})).sort((a,b)=>a.rank-b.rank||CORE_SIDES.indexOf(a.side)-CORE_SIDES.indexOf(b.side));
      while(ports.length<2&&missing.length)ports.push(missing.shift().side)
    }
    return ports
  }
  function normalizeLegacyCoreArchetypes(reason='restore'){
    if(!coreGameMode(s.gameMode)||!Array.isArray(s.cores)||s.cores.length<2||(s.coreProgressMilestones||[]).length)return[];
    const archetypes=Array.isArray(cfg.CORE_ARCHETYPES)&&cfg.CORE_ARCHETYPES.length?cfg.CORE_ARCHETYPES:['relay','reservoir','distributor','conductor'],seen=new Set(),changed=[];
    s.cores=s.cores.map((core,index)=>{
      let archetype=core.archetype;if(!archetypes.includes(archetype))archetype=archetypes[coreHash(s.seed||0,index,197)%archetypes.length];
      if(seen.has(archetype)){const missing=archetypes.filter(id=>!seen.has(id));if(missing.length)archetype=missing[coreHash(s.seed||0,index,199)%missing.length]}
      seen.add(archetype);if(archetype===core.archetype)return core;changed.push({coreId:core.id,from:core.archetype||null,to:archetype});return{...core,archetype}
    });
    if(changed.length)s.events.push({type:'core-archetype-migrate',reason,cores:deepClone(changed)});return changed
  }
  function normalizeLegacyCorePorts(reason='restore'){
    if(!coreGameMode(s.gameMode)||!Array.isArray(s.cores))return[];
    const changed=[];
    s.cores=s.cores.map((core,index)=>{const ports=corePortsForArchetype(s.seed||0,index,core.archetype,core.ports);if(ports.join('')===(core.ports||[]).join(''))return core;changed.push({coreId:core.id,from:[...(core.ports||[])],to:[...ports]});return{...core,ports}});
    if(changed.length)s.events.push({type:'core-port-migrate',reason,cores:deepClone(changed)});return changed
  }
  function framesModeGeometry(seed=s.seed){
    const board=E.getBoardSize?E.getBoardSize():{G:E.G,H:E.H},base=(cfg.BOARD_SIZES||[[18,24]])[0]||[18,24],size=Math.max(1,Number(E.S)||2),baseG=Math.max(6,Number(base[0])||18),baseH=Math.max(6,Number(base[1])||24);
    const dx=Math.floor((board.G-baseG)/2),dy=Math.floor((board.H-baseH)/2),halfCenterOffset=Math.max(size*2,Math.round(baseH/6)),pipSpan=size*3,pipOffset=pipSpan/2,centerX=baseG/2,centerY=baseH/2,topCenterY=centerY-halfCenterOffset,bottomCenterY=centerY+halfCenterOffset;
    const site=(id,half,pip,cx,cy)=>({id,half,pip,x:Math.round(cx-size/2)+dx,y:Math.round(cy-size/2)+dy,size});
    const sites=[
      site('frames-north-a','north',0,centerX-pipXOffset,topCenterY-pipYOffset),
      site('frames-north-b','north',1,centerX+pipXOffset,topCenterY+pipYOffset),
      site('frames-south-a','south',0,centerX-pipXOffset,bottomCenterY-pipYOffset),
      site('frames-south-b','south',1,centerX+pipXOffset,bottomCenterY+pipYOffset)
    ];
    const archetypes=Array.isArray(cfg.CORE_ARCHETYPES)&&cfg.CORE_ARCHETYPES.length?cfg.CORE_ARCHETYPES:['relay','reservoir','distributor','conductor'],northArchetype=archetypes[coreHash(seed,0,229)%archetypes.length],southPool=archetypes.filter(id=>id!==northArchetype),southArchetype=(southPool.length?southPool:archetypes)[coreHash(seed,1,229)%(southPool.length||archetypes.length)],byHalf={north:sites.filter(site=>site.half==='north'),south:sites.filter(site=>site.half==='south')},cores=[],voids=[];
    for(const [half,index,archetype] of [['north',0,northArchetype],['south',1,southArchetype]]){
      const halfSites=byHalf[half],corePip=coreHash(seed,index,211)%2,coreSite=halfSites.find(site=>site.pip===corePip),voidSite=halfSites.find(site=>site.pip!==corePip);
      cores.push({id:`core-frames-${half}`,slot:half,half,pip:coreSite.pip,siteId:coreSite.id,x:coreSite.x,y:coreSite.y,size,ports:corePortsForArchetype(seed,index,archetype),archetype,level:1});
      voids.push({id:`void-frames-${half}`,half,pip:voidSite.pip,siteId:voidSite.id,x:voidSite.x,y:voidSite.y,size})
    }
    return{cores,voids,sites}
  }
  function riverModeGeometry(seed=s.seed){
    const board=E.getBoardSize?E.getBoardSize():{G:E.G,H:E.H},base=(cfg.BOARD_SIZES||[[18,24]])[0]||[18,24],size=Math.max(1,Number(E.S)||2),baseG=Math.max(6,Number(base[0])||18),baseH=Math.max(6,Number(base[1])||24),dx=Math.floor((board.G-baseG)/2),dy=Math.floor((board.H-baseH)/2),centerX=baseG/2,centerY=baseH/2,halfCenterOffset=size*2.5,pipXOffset=size*2,pipYOffset=size,topCenterY=centerY-halfCenterOffset,bottomCenterY=centerY+halfCenterOffset;
    const site=(id,half,pip,cx,cy)=>({id,half,pip,x:Math.round(cx-size/2)+dx,y:Math.round(cy-size/2)+dy,size}),sites=[
      site('river-north-a','north',0,centerX-pipOffset,topCenterY-pipOffset),
      site('river-north-b','north',1,centerX,topCenterY),
      site('river-north-c','north',2,centerX+pipOffset,topCenterY+pipOffset),
      site('river-south-a','south',0,centerX-pipOffset,bottomCenterY-pipOffset),
      site('river-south-b','south',1,centerX,bottomCenterY),
      site('river-south-c','south',2,centerX+pipOffset,bottomCenterY+pipOffset)
    ];
    const archetypes=Array.isArray(cfg.CORE_ARCHETYPES)&&cfg.CORE_ARCHETYPES.length?cfg.CORE_ARCHETYPES:['relay','reservoir','distributor','conductor'],northArchetype=archetypes[coreHash(seed,0,329)%archetypes.length],southPool=archetypes.filter(id=>id!==northArchetype),southArchetype=(southPool.length?southPool:archetypes)[coreHash(seed,1,329)%(southPool.length||archetypes.length)],byHalf={north:sites.filter(site=>site.half==='north'),south:sites.filter(site=>site.half==='south')},cores=[],voids=[];
    for(const [half,index,archetype] of [['north',0,northArchetype],['south',1,southArchetype]]){
      const halfSites=byHalf[half],corePip=coreHash(seed,index,311)%3,coreSite=halfSites.find(site=>site.pip===corePip);
      cores.push({id:`core-river-${half}`,slot:half,half,pip:coreSite.pip,siteId:coreSite.id,x:coreSite.x,y:coreSite.y,size,ports:corePortsForArchetype(seed,index,archetype),archetype,level:1});
      for(const voidSite of halfSites.filter(site=>site.pip!==corePip))voids.push({id:`void-river-${half}-${voidSite.pip}`,half,pip:voidSite.pip,siteId:voidSite.id,x:voidSite.x,y:voidSite.y,size})
    }
    return{cores,voids,sites}
  }
  function coreLayoutForMode(mode=s.gameMode,seed=s.seed){
    const id=canonicalGameMode(mode);
    if(id==='frames')return framesModeGeometry(seed).cores;
    if(id==='river')return riverModeGeometry(seed).cores;
    if(id!=='eyes')return[];
    const bs=E.getBoardSize?E.getBoardSize():{G:E.G,H:E.H},size=Math.max(1,Number(E.S)||2),x=Math.floor((bs.G-size)/2),pipOffset=Math.max(size*2,Math.round(bs.H/6)),topY=Math.max(2,Math.round(bs.H/2-pipOffset-size/2)),bottomY=Math.min(bs.H-size-2,Math.round(bs.H/2+pipOffset-size/2));
    const archetypes=Array.isArray(cfg.CORE_ARCHETYPES)&&cfg.CORE_ARCHETYPES.length?cfg.CORE_ARCHETYPES:['relay','reservoir','distributor','conductor'],northArchetype=archetypes[coreHash(seed,0,99)%archetypes.length],southPool=archetypes.filter(id=>id!==northArchetype),southArchetype=(southPool.length?southPool:archetypes)[coreHash(seed,1,99)%(southPool.length||archetypes.length)];
    return[
      {id:'core-eyes-north',slot:'north',x,y:topY,size,ports:corePortsForArchetype(seed,0,northArchetype),archetype:northArchetype,level:1},
      {id:'core-eyes-south',slot:'south',x,y:bottomY,size,ports:corePortsForArchetype(seed,1,southArchetype),archetype:southArchetype,level:1}
    ]
  }
  function voidLayoutForMode(mode=s.gameMode,seed=s.seed){const id=canonicalGameMode(mode);return id==='frames'?framesModeGeometry(seed).voids:id==='river'?riverModeGeometry(seed).voids:[]}

  function physicalCoreMode(){return coreGameMode(s.gameMode)&&Array.isArray(s.cores)&&s.cores.length>0}
  function coreSize(core){return Math.max(1,Number(core?.size)||Number(E.S)||2)}
  function cubeOverlapsCore(cube,core){
    const cell=Math.max(1,Number(E.S)||2),size=coreSize(core);
    return cube.x<core.x+size&&cube.x+cell>core.x&&cube.y<core.y+size&&cube.y+cell>core.y
  }
  function pieceOverlapsCore(piece,cores=s.cores){return physicalCoreMode()&&(cores||[]).some(core=>(canonicalGameMode(s.gameMode)!=='frames'||geometryItemVisible(core))&&(piece?.cubes||[]).some(cube=>cubeOverlapsCore(cube,core)))}
  function placementOverlapsCore(tile,x,y,rr){return physicalCoreMode()&&pieceOverlapsCore(E.pieceFrom(tile,x,y,0,rr,-1))}
  function physicalVoidMode(){return['frames','river'].includes(canonicalGameMode(s.gameMode))&&Array.isArray(s.voids)&&s.voids.length>0}
  function voidSize(voidItem){return Math.max(1,Number(voidItem?.size)||Number(E.S)||2)}
  function cubeOverlapsVoid(cube,voidItem){
    const cell=Math.max(1,Number(E.S)||2),size=voidSize(voidItem);
    return cube.x<voidItem.x+size&&cube.x+cell>voidItem.x&&cube.y<voidItem.y+size&&cube.y+cell>voidItem.y
  }
  function pieceOverlapsVoid(piece,voids=s.voids){return physicalVoidMode()&&(voids||[]).some(voidItem=>geometryItemVisible(voidItem)&&(piece?.cubes||[]).some(cube=>cubeOverlapsVoid(cube,voidItem)))}
  function placementOverlapsVoid(tile,x,y,rr){return physicalVoidMode()&&pieceOverlapsVoid(E.pieceFrom(tile,x,y,0,rr,-1))}
  function pieceOverlapsBlockedGeometry(piece){return pieceOverlapsCore(piece)||pieceOverlapsVoid(piece)}
  function placementOverlapsBlockedGeometry(tile,x,y,rr){return pieceOverlapsBlockedGeometry(E.pieceFrom(tile,x,y,0,rr,-1))}
  function geometryItemVisible(item,board=E.getBoardSize?E.getBoardSize():{G:E.G,H:E.H}){const size=Math.max(1,Number(item?.size)||Number(E.S)||2);return item&&item.x>=0&&item.y>=0&&item.x+size<=board.G&&item.y+size<=board.H}
  function modeGeometryItems(){return[...(s.cores||[]).map(item=>({...item,kind:'core'})),...(s.voids||[]).map(item=>({...item,kind:'void'}))]}
  function coreRectsOverlap(a,b){
    const as=coreSize(a),bs=coreSize(b);
    return a.x<b.x+bs&&a.x+as>b.x&&a.y<b.y+bs&&a.y+as>b.y
  }
  function relocateLegacyCoreOverlaps(){
    if(canonicalGameMode(s.gameMode)!=='eyes'||!physicalCoreMode()||!s.pieces.length)return[];
    const board=E.getBoardSize?E.getBoardSize():{G:E.G,H:E.H},placed=[],moved=[],next=[];
    for(const core of s.cores){
      const size=coreSize(core),fits=candidate=>candidate.x>=0&&candidate.y>=0&&candidate.x+size<=board.G&&candidate.y+size<=board.H&&!s.pieces.some(piece=>(piece.cubes||[]).some(cube=>cubeOverlapsCore(cube,candidate)))&&!placed.some(other=>coreRectsOverlap(candidate,other));
      let chosen={...core,size};
      if(!fits(chosen)){
        const candidates=[];
        for(let y=0;y<=board.H-size;y++)for(let x=0;x<=board.G-size;x++){
          const candidate={...core,size,x,y};if(!fits(candidate))continue;
          const wrongHalf=core.slot==='north'?(y+size>board.H/2):core.slot==='south'?(y<board.H/2):false;
          candidates.push({candidate,wrongHalf:wrongHalf?1:0,distance:Math.abs(x-core.x)+Math.abs(y-core.y),xDistance:Math.abs(x-core.x)})
        }
        candidates.sort((a,b)=>a.wrongHalf-b.wrongHalf||a.distance-b.distance||a.xDistance-b.xDistance||a.candidate.y-b.candidate.y||a.candidate.x-b.candidate.x);
        if(candidates.length){chosen=candidates[0].candidate;moved.push({id:core.id,from:{x:core.x,y:core.y},to:{x:chosen.x,y:chosen.y}})}
      }
      placed.push(chosen);next.push(chosen)
    }
    if(moved.length)s.cores=next;
    return moved
  }

  const CORE_LEVEL_ROMAN=Object.freeze(['I','II','III','IV','V']);
  function coreLevelRoman(level){return CORE_LEVEL_ROMAN[Math.max(0,Math.min(CORE_LEVEL_ROMAN.length-1,(Number(level)||1)-1))]||'I'}
  function coreRechargeValue(core,{lead=false}={}){
    const level=Math.max(1,Math.min(Math.max(1,Number(cfg.CORE_LEVEL_MAX)||5),Number(core?.level)||1)),base=Math.max(1,Number(cfg.CORE_SIGNAL_MAX)||24)+(level-1)*Math.max(0,Number(cfg.CORE_SIGNAL_LEVEL_STEP)||4);
    return base+(lead&&core?.archetype==='reservoir'?Math.max(0,Number(cfg.CORE_RESERVOIR_BONUS)||8):0)
  }
  function coreProgressKeys(){if(!Array.isArray(s.coreProgressMilestones))s.coreProgressMilestones=[];return new Set(s.coreProgressMilestones)}
  function coreMaxPhysicalForMode(mode=s.gameMode){const id=canonicalGameMode(mode);return id==='frames'?Math.max(2,Number(cfg.FRAMES_CORE_MAX_PHYSICAL)||6):id==='river'?Math.max(2,Number(cfg.RIVER_CORE_MAX_PHYSICAL)||2):Math.max(2,Number(cfg.CORE_MAX_PHYSICAL)||4)}
  function coreDiscoveryStagesForMode(mode=s.gameMode){
    const id=canonicalGameMode(mode),configured=id==='frames'?(cfg.FRAMES_CORE_DISCOVERY_STAGES||[2,3,4,5]):id==='eyes'?(cfg.CORE_DISCOVERY_STAGES||[4,7]):[];
    return[...new Set(configured.map(Number).filter(stage=>Number.isFinite(stage)&&stage>1).map(stage=>Math.trunc(stage)))].sort((a,b)=>a-b)
  }
  function coreCoverageTelemetry(pieces=s.pieces,cores=s.cores){
    const list=Array.isArray(pieces)?pieces:[],budget=coreSignalBudgetForMode(),startSignal=Math.max(0,Number(budget.base)||0);
    if(!list.length)return{pieceCount:0,connectedCoreCount:0,seedTileIds:[],reachableCount:0,unreachableCount:0,maxDistance:null,p50Distance:null,beyondStartCount:0,startSignal,worstTileId:null,worstDistance:null,rows:[]};
    const graph=C.adjacency(list,E.contactBetweenPieces),shadow=coreShadowTelemetry(list,cores),seedTileIds=[...new Set((shadow.cores||[]).flatMap(core=>core.connectedTileIds||[]))].filter(id=>graph.has(id)).sort((a,b)=>String(a).localeCompare(String(b))),distances=new Map(),queue=[];
    for(const id of seedTileIds){distances.set(id,0);queue.push(id)}
    for(let i=0;i<queue.length;i++){const id=queue[i],distance=distances.get(id);for(const next of [...(graph.get(id)||[])].sort((a,b)=>String(a).localeCompare(String(b))))if(!distances.has(next)){distances.set(next,distance+1);queue.push(next)}}
    const coreCenters=(shadow.cores||[]).map(core=>({x:core.x+core.size/2,y:core.y+core.size/2}));
    const rows=list.map(piece=>{const tileId=piece.tile?.id??piece.id,cubes=piece.cubes||[],x=cubes.length?cubes.reduce((sum,cube)=>sum+cube.x+Math.max(1,Number(E.S)||2)/2,0)/cubes.length:0,y=cubes.length?cubes.reduce((sum,cube)=>sum+cube.y+Math.max(1,Number(E.S)||2)/2,0)/cubes.length:0,physicalCoreDistance=coreCenters.length?Math.min(...coreCenters.map(core=>Math.abs(core.x-x)+Math.abs(core.y-y))):Infinity;return{tileId,pieceId:piece.id,distance:distances.has(tileId)?distances.get(tileId):null,degree:(graph.get(tileId)||new Set()).size,physicalCoreDistance:Number.isFinite(physicalCoreDistance)?physicalCoreDistance:null,x,y}});
    const reachable=rows.map(row=>row.distance).filter(Number.isFinite).sort((a,b)=>a-b),unreachableCount=rows.length-reachable.length,maxDistance=reachable.length?reachable[reachable.length-1]:null,p50Distance=reachable.length?reachable[Math.floor((reachable.length-1)*.5)]:null,beyondStartCount=rows.filter(row=>row.distance==null||row.distance>startSignal).length;
    const ranked=[...rows].sort((a,b)=>(a.distance==null?0:1)-(b.distance==null?0:1)||(b.distance??-1)-(a.distance??-1)||a.degree-b.degree||(b.physicalCoreDistance??-1)-(a.physicalCoreDistance??-1)||String(a.tileId).localeCompare(String(b.tileId))),worst=ranked[0]||null;
    return{pieceCount:rows.length,connectedCoreCount:shadow.connectedCoreCount||0,seedTileIds,reachableCount:reachable.length,unreachableCount,maxDistance,p50Distance,beyondStartCount,startSignal,worstTileId:worst?.tileId??null,worstDistance:worst?.distance??null,rows}
  }
  function framesLatticeResidue(cell=Math.max(1,Number(E.S)||2)){
    const site=framesModeGeometry(s.seed).sites?.[0]||null,mod=value=>((Math.trunc(Number(value)||0)%cell)+cell)%cell;
    return{x:mod(site?.x),y:mod(site?.y)}
  }
  function framesCoreCandidatePosition(stage,size,ports){
    const board=E.getBoardSize?E.getBoardSize():{G:E.G,H:E.H},cell=Math.max(1,Number(E.S)||2),lattice=framesLatticeResidue(cell),coverage=coreCoverageTelemetry(),target=coverage.rows.find(row=>row.tileId===coverage.worstTileId)||null,stageBoard=progressionBoardSizeForStage(Math.max(0,stage-1)),previousBoard=progressionBoardSizeForStage(Math.max(0,stage-2)),stageRect={x:Math.floor((board.G-stageBoard[0])/2),y:Math.floor((board.H-stageBoard[1])/2),w:stageBoard[0],h:stageBoard[1]},previousRect={x:Math.floor((board.G-previousBoard[0])/2),y:Math.floor((board.H-previousBoard[1])/2),w:previousBoard[0],h:previousBoard[1]},existing=s.cores||[],desiredDistance=Math.max(size*2,cell*3),onLattice=candidate=>((candidate.x%cell)+cell)%cell===lattice.x&&((candidate.y%cell)+cell)%cell===lattice.y;
    const overlapArea=(candidate,rect)=>Math.max(0,Math.min(candidate.x+size,rect.x+rect.w)-Math.max(candidate.x,rect.x))*Math.max(0,Math.min(candidate.y+size,rect.y+rect.h)-Math.max(candidate.y,rect.y));
    const fits=candidate=>onLattice(candidate)&&candidate.x>=stageRect.x&&candidate.y>=stageRect.y&&candidate.x+size<=stageRect.x+stageRect.w&&candidate.y+size<=stageRect.y+stageRect.h&&!s.pieces.some(piece=>(piece.cubes||[]).some(cube=>cubeOverlapsCore(cube,candidate)))&&!existing.some(core=>coreRectsOverlap(candidate,core))&&!(s.voids||[]).some(voidItem=>geometryItemVisible(voidItem)&&coreRectsOverlap(candidate,voidItem));
    const collect=ringOnly=>{const candidates=[];for(let y=stageRect.y;y<=stageRect.y+stageRect.h-size;y++)for(let x=stageRect.x;x<=stageRect.x+stageRect.w-size;x++){const candidate={x,y,size};if(!fits(candidate))continue;const oldOverlap=overlapArea(candidate,previousRect),insidePrevious=oldOverlap>=size*size;if(ringOnly&&insidePrevious)continue;const center={x:x+size/2,y:y+size/2},dx=(target?.x??stageRect.x+stageRect.w/2)-center.x,dy=(target?.y??stageRect.y+stageRect.h/2)-center.y,desiredSide=Math.abs(dx)>=Math.abs(dy)?(dx<0?'L':'R'):(dy<0?'U':'D'),portPenalty=ports.includes(desiredSide)?0:1,targetDistance=Math.abs(dx)+Math.abs(dy),gapError=Math.abs(targetDistance-desiredDistance),live=coreShadowTelemetry(s.pieces,[{id:'candidate',slot:'frame',x,y,size,ports,archetype:'relay',level:1}]).cores[0],touches=live?.connectedTileIds?.length||0,nearestCore=existing.length?Math.min(...existing.map(core=>Math.abs(center.x-(core.x+coreSize(core)/2))+Math.abs(center.y-(core.y+coreSize(core)/2)))):0;candidates.push({candidate,oldOverlap,touches,portPenalty,targetDistance,gapError,nearestCore,hash:coreHash(s.seed||0,x+y*board.G+stage*131,263)})}candidates.sort((a,b)=>a.oldOverlap-b.oldOverlap||a.touches-b.touches||a.portPenalty-b.portPenalty||a.gapError-b.gapError||a.targetDistance-b.targetDistance||b.nearestCore-a.nearestCore||a.hash-b.hash||a.candidate.y-b.candidate.y||a.candidate.x-b.candidate.x);return candidates[0]||null};
    const selected=collect(true)||collect(false);return selected?{position:selected.candidate,targetTileId:coverage.worstTileId,coverage,fallbackToBoard:selected.oldOverlap>=size*size,connectedAtDiscovery:selected.touches,lattice}:null
  }
  function eyesCoreCrossGeometry(size){
    const north=(s.cores||[]).find(core=>core.slot==='north'),south=(s.cores||[]).find(core=>core.slot==='south');if(!north||!south)return null;
    const northSize=coreSize(north),southSize=coreSize(south),northCenter={x:north.x+northSize/2,y:north.y+northSize/2},southCenter={x:south.x+southSize/2,y:south.y+southSize/2};
    const centerX=(northCenter.x+southCenter.x)/2,centerY=(northCenter.y+southCenter.y)/2,radius=Math.max(size,Math.abs(southCenter.y-northCenter.y)/2);
    return{centerX,centerY,radius}
  }
  function coreCandidatePosition(slot,size){
    const board=E.getBoardSize?E.getBoardSize():{G:E.G,H:E.H},cell=Math.max(1,Number(E.S)||2),margin=cell,existing=s.cores||[];
    const fits=candidate=>{
      if(candidate.x<0||candidate.y<0||candidate.x+size>board.G||candidate.y+size>board.H)return false;
      if(s.pieces.some(piece=>(piece.cubes||[]).some(cube=>cubeOverlapsCore(cube,candidate))))return false;
      if(existing.some(core=>coreRectsOverlap(candidate,core)))return false;
      return true
    };
    const geometry=eyesCoreCrossGeometry(size);
    if(geometry&&(slot==='east'||slot==='west')){
      const y=Math.round(geometry.centerY-size/2),minRadius=Math.max(size,geometry.radius-size),maxRadius=geometry.radius+size,candidates=[];
      for(let x=margin;x<=board.G-size-margin;x++){
        const centerX=x+size/2,radius=Math.abs(centerX-geometry.centerX);
        if(slot==='east'?centerX<=geometry.centerX:centerX>=geometry.centerX)continue;
        if(radius<minRadius||radius>maxRadius)continue;
        const candidate={x,y,size};if(!fits(candidate))continue;
        const touches=coreShadowTelemetry(s.pieces,[{id:'candidate',slot,x,y,size,ports:CORE_SIDES,archetype:'relay',level:1}]).cores[0]?.connectedTileIds?.length||0;
        candidates.push({candidate,radiusError:Math.abs(radius-geometry.radius),touches,hash:coreHash(s.seed||0,x+y*board.G,113)})
      }
      candidates.sort((a,b)=>a.radiusError-b.radiusError||a.touches-b.touches||a.hash-b.hash||a.candidate.x-b.candidate.x);
      return candidates[0]?.candidate||null
    }
    const centerY=Math.floor((board.H-size)/2),preferred=slot==='east'?{x:board.G-size-margin,y:centerY}:slot==='west'?{x:margin,y:centerY}:{x:Math.floor((board.G-size)/2),y:centerY},candidates=[];
    for(let y=margin;y<=board.H-size-margin;y++)for(let x=margin;x<=board.G-size-margin;x++){
      const candidate={x,y,size};if(!fits(candidate))continue;
      const distance=Math.abs(x-preferred.x)+Math.abs(y-preferred.y),touches=coreShadowTelemetry(s.pieces,[{id:'candidate',slot,x,y,size,ports:CORE_SIDES,archetype:'relay',level:1}]).cores[0]?.connectedTileIds?.length||0;
      candidates.push({candidate,distance,touches,hash:coreHash(s.seed||0,x+y*board.G,113)})
    }
    candidates.sort((a,b)=>a.touches-b.touches||a.distance-b.distance||a.hash-b.hash||a.candidate.y-b.candidate.y||a.candidate.x-b.candidate.x);
    return candidates[0]?.candidate||null
  }
  function discoverCore(stage,reason='stage'){
    const mode=canonicalGameMode(s.gameMode),maxPhysical=coreMaxPhysicalForMode(mode);if(!coreGameMode(mode)||(s.cores?.length||0)>=maxPhysical)return null;
    const archetypes=Array.isArray(cfg.CORE_ARCHETYPES)&&cfg.CORE_ARCHETYPES.length?cfg.CORE_ARCHETYPES:['relay','reservoir','distributor','conductor'],used=new Set((s.cores||[]).map(core=>core.archetype)),missing=archetypes.filter(id=>!used.has(id)),pool=missing.length?missing:archetypes,index=(s.cores?.length||0);
    if(mode==='frames'){
      const archetype=pool[coreHash(s.seed||0,stage+index,251)%pool.length],size=Math.max(1,Number(E.S)||2),ports=corePortsForArchetype(s.seed||0,stage+index,archetype),choice=framesCoreCandidatePosition(stage,size,ports),slot=`frame-${stage}`;
      if(!choice?.position){s.events.push({type:'core-progress-blocked',stage,reason,action:'discover',slot});return null}
      const position=choice.position,core={id:`core-frames-stage-${stage}`,slot,stage,x:position.x,y:position.y,size,ports,archetype,level:1},coverage=choice.coverage||coreCoverageTelemetry(),coverageBefore={pieceCount:coverage.pieceCount,connectedCoreCount:coverage.connectedCoreCount,reachableCount:coverage.reachableCount,unreachableCount:coverage.unreachableCount,maxDistance:coverage.maxDistance,p50Distance:coverage.p50Distance,beyondStartCount:coverage.beyondStartCount,startSignal:coverage.startSignal,worstTileId:coverage.worstTileId,worstDistance:coverage.worstDistance};
      s.cores.push(core);s.events.push({type:'core-discover',stage,reason,core:deepClone(core),recharge:coreRechargeValue(core),targetTileId:choice.targetTileId||null,coverageBefore,connectedAtDiscovery:choice.connectedAtDiscovery||0,frameFallback:!!choice.fallbackToBoard,lattice:choice.lattice||null});return core
    }
    if(mode!=='eyes')return null;
    const archetype=pool[coreHash(s.seed||0,stage+index,151)%pool.length],slot=index%2===0?'east':'west',size=Math.max(1,Number(E.S)||2),position=coreCandidatePosition(slot,size);
    if(!position){s.events.push({type:'core-progress-blocked',stage,reason,action:'discover',slot});return null}
    const core={id:`core-eyes-${slot}`,slot,x:position.x,y:position.y,size,ports:corePortsForArchetype(s.seed||0,stage+index,archetype),archetype,level:1};
    s.cores.push(core);s.events.push({type:'core-discover',stage,reason,core:deepClone(core),recharge:coreRechargeValue(core)});return core
  }
  function upgradeCore(stage,reason='stage'){
    if(!coreGameMode(s.gameMode)||!s.cores?.length)return null;
    const maxLevel=Math.max(1,Number(cfg.CORE_LEVEL_MAX)||5),eligible=s.cores.filter(core=>(Number(core.level)||1)<maxLevel).sort((a,b)=>String(a.id).localeCompare(String(b.id)));if(!eligible.length)return null;
    const minLevel=Math.min(...eligible.map(core=>Math.max(1,Number(core.level)||1))),lowest=eligible.filter(core=>(Number(core.level)||1)===minLevel),core=lowest[coreHash(s.seed||0,stage,173)%lowest.length],before=Math.max(1,Number(core.level)||1);core.level=Math.min(maxLevel,before+1);
    s.events.push({type:'core-upgrade',stage,reason,coreId:core.id,archetype:core.archetype,before,after:core.level,recharge:coreRechargeValue(core)});return core
  }
  function syncCoreProgressToStage(stageNumber=stageIndex()+1,reason='stage'){
    if(!coreGameMode(s.gameMode))return[];
    if(!Array.isArray(s.coreProgressMilestones))s.coreProgressMilestones=[];
    const processed=coreProgressKeys(),changes=[],discoverStages=coreDiscoveryStagesForMode(),maxPhysical=coreMaxPhysicalForMode();
    for(const stage of discoverStages){const key=`discover:${stage}`;if(stage>stageNumber||processed.has(key))continue;const change=discoverCore(stage,reason);if(change||(s.cores?.length||0)>=maxPhysical){processed.add(key);changes.push({type:'discover',stage,core:change})}}
    const start=Math.max(1,Number(cfg.CORE_UPGRADE_START_STAGE)||10),interval=Math.max(1,Number(cfg.CORE_UPGRADE_STAGE_INTERVAL)||3);
    for(let stage=start;stage<=stageNumber;stage+=interval){const key=`upgrade:${stage}`;if(processed.has(key))continue;const change=upgradeCore(stage,reason);processed.add(key);changes.push({type:'upgrade',stage,core:change})}
    s.coreProgressMilestones=[...processed].sort((a,b)=>{const [ak,av]=a.split(':'),[bk,bv]=b.split(':');return Number(av)-Number(bv)||ak.localeCompare(bk)});return changes
  }

  function availableTileCount(){
    const generation=s.setGeneration||1,placed=new Set(s.placedTileIds||[]);
    return s.set.filter(t=>(t.generation||1)<=generation&&!placed.has(t.id)).length
  }
  function activateOuroboros(source='deck-exhausted'){
    if(s.ouroborosMode)return false;
    const board=E.getBoardSize?E.getBoardSize():{G:E.G,H:E.H};
    s.ouroborosMode=true;s.ouroborosStartedRound=s.round+1;s.ouroborosBoardSize=[board.G,board.H];s.reserve=[];s.hand=[];s.shopTileOffers=[];s.shopTileOfferGeneration=null;
    s.blocked=false;s.needsReroll=false;s.failureReason=null;s.undoFrame=null;
    s.events.push({type:'ouroboros-start',round:s.round+1,roundTurn:s.roundTurn+1,generation:s.setGeneration||1,machineSize:s.pieces.length,board:[board.G,board.H],source});
    return true
  }
  function replenishPowerSet(source='draw'){
    const currentGeneration=s.setGeneration||1;
    if(s.reserve.some(t=>(t.generation||1)<=currentGeneration)||availableTileCount()>0)return false;
    if(currentGeneration>=maxSetGeneration()){activateOuroboros(source);return false}
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

  function targetExactForRound(roundIndex=s.round){
    const targets=cfg.TARGETS||[],fixed=targets[roundIndex];
    if(Number.isFinite(fixed)&&Number.isInteger(fixed))return SCORE.exact(fixed);
    const lastIndex=Math.max(0,targets.length-1),last=targets[lastIndex]??0,multiplier=Math.max(1,Math.trunc(Number(cfg.ENDLESS_TARGET_MULTIPLIER)||5));
    return SCORE.powMultiply(SCORE.exact(last),multiplier,Math.max(0,roundIndex-lastIndex))
  }
  function targetForRound(roundIndex=s.round){return SCORE.approx(targetExactForRound(roundIndex))}
  function target(){return targetForRound(s.round)}
  function targetExact(){return targetExactForRound(s.round)}
  function stageIndex(){return Math.floor(s.round/stageSize())}
  function circuitTileLimit(){
    const base=cfg.CIRCUIT_TILE_LIMIT||3;
    if(!s.endlessMode||s.round<cfg.TOTAL_ROUNDS)return base;
    return base+Math.floor((s.round-cfg.TOTAL_ROUNDS)/stageSize())+1
  }
  function progressionBoardSizeForStage(stage=stageIndex()){
    const sizes=cfg.BOARD_SIZES||[[18,24]],index=Math.max(0,Math.trunc(Number(stage)||0)),lastIndex=sizes.length-1,last=sizes[lastIndex]||[18,24];
    if(index<=lastIndex||!s.endlessMode)return sizes[Math.min(index,lastIndex)]||last;
    const configured=cfg.INFINITE_BOARD_GROWTH,previous=sizes[Math.max(0,lastIndex-1)]||last;
    const growth=Array.isArray(configured)&&configured.length>=2?configured:[last[0]-previous[0],last[1]-previous[1]],interval=Math.max(1,Number(cfg.INFINITE_BOARD_STAGE_INTERVAL)||2);
    const endlessStageOffset=Math.max(0,index-baseStageCount()),steps=Math.floor(endlessStageOffset/interval);
    return[last[0]+Math.max(1,Number(growth[0])||0)*steps,last[1]+Math.max(1,Number(growth[1])||0)*steps]
  }
  function boardSizeForStage(stage=stageIndex()){
    const frozen=s.ouroborosMode&&Array.isArray(s.ouroborosBoardSize)&&s.ouroborosBoardSize.length>=2?s.ouroborosBoardSize:null;
    if(frozen&&Number(frozen[0])>0&&Number(frozen[1])>0)return[Math.trunc(Number(frozen[0])),Math.trunc(Number(frozen[1]))];
    return progressionBoardSizeForStage(stage)
  }
  function maxPlacements(){return cfg.MAX_PLACEMENTS+s.extraPlacements}
  function clearRewardBreakdown(){
    const base=cfg.BASE_CLEAR_REWARD??3;
    const quick=s.roundTurn<=(cfg.QUICK_CLEAR_MAX_MOVES??3)?(cfg.QUICK_CLEAR_BONUS??1):0;
    const exact=SCORE.equals(s.scoreExact??SCORE.exact(s.score||0),targetExact())?(cfg.EXACT_TARGET_BONUS??5):0;
    return{base,quick,exact,total:base+quick+exact}
  }
  function clearReward(){return clearRewardBreakdown().total}
  function hasLegal(){
    if(!physicalCoreMode()){if(!s.pieces.length){if(cfg.FIRST_TILE_MUST_BE_DOUBLE&&s.turn===0)return s.hand.some(isDouble);return s.hand.some(Boolean)}return E.hasLegalMove(s.hand.filter(Boolean),s.pieces,[0])}
    return s.hand.some(tile=>tile&&placementCandidatesForTile(tile).length>0)
  }
  function openingProtectionActive(){return s.round===0&&s.roundTurn===1&&s.turn===1&&s.pieces.length===1}
  function ensureOpeningContinuation(source){
    if(!openingProtectionActive()||hasLegal())return null;
    const legal=t=>physicalCoreMode()?placementCandidatesForTile(t).length>0:(E.hasAnyPlacement?E.hasAnyPlacement(t,0,s.pieces):E.allPlacements(t,0,s.pieces).length>0);
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
    if(s.ouroborosMode){s.blocked=false;s.failureReason=null;return{autoRerolls:0}}
    if(!s.hand.some(Boolean)&&!s.reserve.length){
      if(replenishPowerSet('continuation'))s.hand=Array(handSizeForRound()).fill(null).map(()=>drawOne());
      else if(s.ouroborosMode)return{autoRerolls:0};
      else{fail('no-tiles');return{autoRerolls:0}}
    }
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
    const [newG,newH]=boardSizeForStage(),old=E.getBoardSize?E.getBoardSize():{G:E.G,H:E.H},nextBoardStage=stageIndex(),stageNumber=nextBoardStage+1,beforeVisible=new Set(modeGeometryItems().filter(item=>geometryItemVisible(item,old)).map(item=>item.id));
    if(old.G===newG&&old.H===newH){s.boardStage=nextBoardStage;syncCoreProgressToStage(stageNumber,'stage');return}
    const base=(cfg.BOARD_SIZES||[[18,24]])[0]||[18,24];
    const dx=Math.floor((newG-base[0])/2)-Math.floor((old.G-base[0])/2),dy=Math.floor((newH-base[1])/2)-Math.floor((old.H-base[1])/2);
    E.setBoardSize(newG,newH);
    if(Array.isArray(s.cores)&&s.cores.length&&(dx||dy))s.cores=s.cores.map(core=>({...core,x:core.x+dx,y:core.y+dy}));
    if(Array.isArray(s.voids)&&s.voids.length&&(dx||dy))s.voids=s.voids.map(voidItem=>({...voidItem,x:voidItem.x+dx,y:voidItem.y+dy}));
    if(s.pieces.length)s.pieces=s.pieces.map(p=>rebuildPiece(p,dx,dy));
    s.boardStage=nextBoardStage;
    s.events.push({type:'board-expand',stage:s.boardStage+1,from:[old.G,old.H],to:[newG,newH],offset:[dx,dy]});
    const revealed=modeGeometryItems().filter(item=>geometryItemVisible(item)&&!beforeVisible.has(item.id)).map(item=>({id:item.id,kind:item.kind,half:item.half||item.slot||null,pip:Number.isInteger(item.pip)?item.pip:null,x:item.x,y:item.y,size:item.size}));
    if(revealed.length)s.events.push({type:'mode-geometry-reveal',mode:s.gameMode,stage:s.boardStage+1,items:deepClone(revealed)});
    syncCoreProgressToStage(stageNumber,'stage')
  }

  function startRound(first=false){
    if(first||!cfg.PERSIST_MACHINE_BETWEEN_ROUNDS){s.pieces=[];s.placedTileIds=[]}
    ensureBoardForStage();
    const used=new Set(s.placedTileIds||[]);
    if(s.ouroborosMode){s.reserve=[];s.hand=[]}
    else{
      s.reserve=sh(s.set.filter(t=>!used.has(t.id)).slice());
      if(!s.reserve.length&&availableTileCount()===0)replenishPowerSet('round-start')
    }
    s.score=0;s.scoreExact='0';s.roundTurn=0;s.rootRR=0;s.roundZero={drawn:0,placed:0,endHand:0};
    s.extraPlacements=0;s.upgradeCoinsClaimed=[];s.roundUpgradeCoins=0;s.undoFrame=null;
    s.cleared=false;s.blocked=false;s.needsReroll=false;s.failureReason=null;
    s.nextShopType='none';s.intermissionResolved=true;s.shopOpen=false;s.shopType=null;s.shopOffers=[];s.marketBuys=[];
    const previousFree=s.freeReroll||0;s.freeReroll=s.ouroborosMode?0:Math.max(0,Number(cfg.ROUND_REROLL_REWARD??1));
    s.events.push({type:'round-reroll',round:s.round+1,granted:s.freeReroll,replaced:previousFree});
    const newStage=s.round%stageSize()===0,enteringInfinite=infinitePhase()&&s.round===infinitePhaseStartRound();
    if(!s.ouroborosMode)initialHand();else s.hand=[];
    if(enteringInfinite)s.events.push({type:'infinite-phase-start',round:s.round+1,endlessStagesCompleted:endlessStagesCompleted(),handSize:s.hand.length,board:[E.G,E.H]});
    if(newStage)s.events.push({type:'stage-start',stage:stageIndex()+1,round:s.round+1,phase:s.ouroborosMode?'ouroboros':infinitePhase()?'infinite':s.endlessMode?'endless':'classic',coins:s.coins,inflation:s.inflation,available:availableTileCount(),board:[E.G,E.H],handSize:s.hand.length,freeReroll:s.freeReroll||0,setGeneration:s.setGeneration||1});
    if(s.pieces.length||!s.hand.some(Boolean))assessContinuation()
  }

  function fresh(seedOverride){
    const seed=(seedOverride==null?(typeof crypto!=='undefined'&&crypto.getRandomValues?crypto.getRandomValues(new Uint32Array(1))[0]:Math.floor(Math.random()*4294967296)):seedOverride)>>>0;
    s={set:makePersistentSet(),setGeneration:1,reserve:[],hand:[],pieces:[],placedTileIds:[],score:0,scoreExact:'0',best:0,bestExact:'0',round:0,roundTurn:0,turn:0,wins:[],events:[],idc:0,running:false,standardComplete:false,endlessMode:false,endlessStartedRound:null,ouroborosMode:false,ouroborosStartedRound:null,ouroborosBoardSize:null,systemStrain:0,endlessLongRunActivations:0,cleared:false,blocked:false,needsReroll:false,failureReason:null,rootRR:0,seed,rngState:seed|0,runId:`${Date.now().toString(36)}-${seed.toString(36)}`,startedAt:new Date().toISOString(),gameMode:canonicalGameMode(cfg.GAME_MODE),roundZero:{drawn:0,placed:0,endHand:0},coins:cfg.STARTING_COINS,inflation:0,consumables:{move:cfg.STARTING_MOVE_CONSUMABLES||0,reroll:cfg.STARTING_REROLL_CONSUMABLES||0,undo:cfg.STARTING_UNDO_CONSUMABLES||0},freeReroll:0,mods:[],extraPlacements:0,upgradeCoinsClaimed:[],roundUpgradeCoins:0,undoFrame:null,anchorId:null,nextShopType:'none',intermissionResolved:true,shopOpen:false,shopType:null,shopOffers:[],shopTileOffers:[],shopTileOfferGeneration:null,marketBuys:[],pendingModPlacement:null,tileSerial:0,boardStage:0,doubleDoubleTileId:null,doubleEchoTileId:null,tripleDoubleTileId:null,zeroPortTileIds:[],parityExchangeTileId:null,cornerTileId:null,longLineTileId:null,overloadTileId:null,terminalTileId:null,diodeTileId:null,diodeInHalf:null,returnTileId:null,recallTileId:null,pairTileId:null,bridgeTileId:null,pivotTileId:null,scrapTileId:null,brokerTileId:null,swapTileId:null,spendTileId:null,mergeTileId:null,hingeTileId:null,hingeState:null,bankTileId:null,tollTileId:null,tollArmed:false,brokerDiscountReady:false,foundationTileId:null,knotTileId:null,mirrorTileId:null,mintTileId:null,marketCount:0,signalUpgrades:0,foundationAssignedMarket:null,foundationLastPayoutMarket:null,mintPaidRound:null,mutationUseRound:{mirror:null,pivot:null,recall:null,swap:null},scrapUsedMarket:null,cores:[],voids:[],coreProgressMilestones:[]};
    s.circuitRanks={};s.circuitSignatures=[];s.pendingCircuit=null;s.pendingModPlacement=null;ensureShopTileOffers();
    startRound(true);s.cores=coreLayoutForMode(s.gameMode,seed);s.voids=voidLayoutForMode(s.gameMode,seed);if(s.cores.length)s.events.push({type:'core-layout',mode:s.gameMode,interaction:'physical',cores:deepClone(s.cores)});if(['frames','river'].includes(s.gameMode))s.events.push({type:'mode-geometry-layout',mode:s.gameMode,items:deepClone(modeGeometryItems()),visibleIds:modeGeometryItems().filter(item=>geometryItemVisible(item)).map(item=>item.id)});return s
  }

  function setRootRotation(rr){if(s.pieces.length||s.running)return false;s.rootRR=((rr%4)+4)%4;return true}
  function rotateRoot(){return setRootRotation(s.rootRR+1)}
  function rootPlacements(tile){let out=[];for(let y=0;y<=E.H-E.S;y++)for(let x=0;x<=E.G-E.S;x++){let p=E.pieceFrom(tile,x,y,0,s.rootRR,-1);if(p.rect.minx>=0&&p.rect.miny>=0&&p.rect.maxx<=E.G&&p.rect.maxy<=E.H&&!pieceOverlapsBlockedGeometry(p))out.push({x,y,z:0,rr:s.rootRR})}return out}
  function placementCandidatesForTile(tile){
    if(!tile)return[];if(!s.pieces.length&&cfg.FIRST_TILE_MUST_BE_DOUBLE&&s.turn===0&&!isDouble(tile))return[];
    const candidates=s.pieces.length?E.allPlacements(tile,0,s.pieces):rootPlacements(tile);
    return physicalCoreMode()||physicalVoidMode()?candidates.filter(c=>!placementOverlapsBlockedGeometry(tile,c.x,c.y,c.rr)):candidates
  }
  function candidatesForIndex(i){return placementCandidatesForTile(s.hand[i])}
  function legalHandMask(){return s.hand.map(tile=>!!tile&&placementCandidatesForTile(tile).length>0)}
  function handPlacementDiagnostics(){return s.hand.map((tile,index)=>tile?{index,tile:cloneTile(tile),legalPlacements:candidatesForIndex(index).length}:null).filter(Boolean)}
  function canInteract(){return !s.pendingCircuit&&!s.pendingModPlacement&&!s.running&&!s.cleared&&!s.blocked&&!s.needsReroll&&!s.shopOpen}
  function ouroborosPlacementPreview(tileId,placement){
    if(!s.ouroborosMode||!canInteract())return{ok:false,reason:'state'};
    const piece=s.pieces.find(p=>p.tile?.id===tileId);if(!piece)return{ok:false,reason:'tile'};
    const x=Number(placement?.x),y=Number(placement?.y),rr=((Number(placement?.rr)||0)%4+4)%4;
    if(!Number.isInteger(x)||!Number.isInteger(y))return{ok:false,reason:'grid'};
    const moved=E.pieceFrom(piece.tile,x,y,0,rr,piece.id),board=E.getBoardSize?E.getBoardSize():{G:E.G,H:E.H},cell=Math.max(1,Number(E.S)||2);
    moved.tile={...piece.tile};
    if(moved.rect.minx<0||moved.rect.miny<0||moved.rect.maxx>board.G||moved.rect.maxy>board.H)return{ok:false,reason:'bounds'};
    const overlaps=(a,b)=>a.x<b.x+cell&&a.x+cell>b.x&&a.y<b.y+cell&&a.y+cell>b.y;
    for(const other of s.pieces)if(other.id!==piece.id)for(const cube of moved.cubes)for(const occupied of other.cubes)if(overlaps(cube,occupied))return{ok:false,reason:'overlap'};
    if(pieceOverlapsCore(moved))return{ok:false,reason:'core-overlap'};if(pieceOverlapsVoid(moved))return{ok:false,reason:'void-overlap'};
    const nextPieces=s.pieces.map(p=>p.id===piece.id?moved:p),topologyLosses=topologyBreaksForPieces(nextPieces);
    return{ok:true,tileId,placement:{x,y,z:0,rr},topologyLosses:deepClone(topologyLosses)}
  }
  function moveOuroborosTile(tileId,placement){
    const preview=ouroborosPlacementPreview(tileId,placement);if(!preview.ok)return preview;
    const piece=s.pieces.find(p=>p.tile?.id===tileId),before=piecePlacement(piece),moved=E.pieceFrom(piece.tile,preview.placement.x,preview.placement.y,0,preview.placement.rr,piece.id);moved.tile={...piece.tile};
    s.pieces=s.pieces.map(p=>p.id===piece.id?moved:p);const topologyLosses=removeTopologyMods(preview.topologyLosses,tileId);s.undoFrame=null;
    s.events.push({type:'ouroboros-rebuild',round:s.round+1,roundTurn:s.roundTurn,tileId,from:before,to:preview.placement,topologyLosses:deepClone(topologyLosses)});
    return{ok:true,tileId,from:before,to:preview.placement,topologyLosses}
  }
  function rotateOuroborosTile(tileId){
    const piece=s.pieces.find(p=>p.tile?.id===tileId);if(!piece)return{ok:false,reason:'tile'};
    return moveOuroborosTile(tileId,{x:piece.cubes[0].x,y:piece.cubes[0].y,z:0,rr:(piece.rr+1)%4})
  }
  function previewOuroborosFire(tileId){
    if(!s.ouroborosMode||!canInteract())return{ok:false,reason:'state'};
    const p=s.pieces.find(piece=>piece.tile?.id===tileId),tile=p&&(s.set.find(t=>t.id===tileId)||p.tile);if(!p||!tile)return{ok:false,reason:'tile'};
    const trigger=tile.a+tile.b,sim=s.pieces.length===1?{output:trigger,outputExact:SCORE.exact(trigger),events:[],reason:'root',rebounds:0,search:{starts:0,leaves:1,expanded:0}}:E.bestSignal(p.id,s.pieces,signalOptionsForPieces(s.pieces,trigger)),signalRuntime=signalShadowTelemetry(sim);
    return{ok:true,tile,p,trigger,baseTrigger:trigger,sim,signalRuntime,signalShadow:signalRuntime,handIndex:-1,topologyLosses:[],ouroboros:true}
  }
  function beginOuroborosFire(tileId){
    const preview=previewOuroborosFire(tileId);if(!preview.ok)return preview;
    const undoFrame=captureUndoFrame();s.running=true;s.turn++;s.roundTurn++;s.undoFrame=undoFrame;if(s.endlessMode)s.systemStrain=(s.systemStrain||0)+1;
    s.events.push({type:'ouroboros-fire',round:s.round+1,roundTurn:s.roundTurn,turn:s.turn,tileId,trigger:preview.trigger});
    return preview
  }
  function setTollArmed(value){
    if(!s.tollTileId||s.running||s.shopOpen||s.pendingCircuit||s.pendingModPlacement)return{ok:false,reason:'state'};
    s.tollArmed=!!value;s.events.push({type:'toll-arm',round:s.round+1,roundTurn:s.roundTurn,tileId:s.tollTileId,armed:s.tollArmed,coins:s.coins});
    return{ok:true,armed:s.tollArmed,tileId:s.tollTileId,coins:s.coins}
  }

  const ROUND_MUTATION_IDS=Object.freeze(['mirror','pivot','recall','swap']);
  function piecePlacement(piece){return{x:piece.cubes[0].x,y:piece.cubes[0].y,z:piece.z||0,rr:piece.rr}}
  function pieceAt(piece,placement){
    const p=E.pieceFrom(piece.tile,placement.x,placement.y,placement.z||0,placement.rr,piece.id);p.tile={...piece.tile};return p
  }
  function hingeProtectedTile(tileId){return!!tileId&&(tileId===s.hingeTileId||tileId===s.hingeState?.pivotTileId)}
  function machineConnected(pieces){
    if(!pieces.length)return false;if(pieces.length===1)return true;
    const seen=new Set([pieces[0].id]),queue=[pieces[0]];
    for(let i=0;i<queue.length;i++){
      const current=queue[i];
      for(const other of pieces){
        if(other.id===current.id||seen.has(other.id))continue;
        const contact=E.contactBetweenPieces(current,other);
        if(contact.touch&&contact.ok){seen.add(other.id);queue.push(other)}
      }
    }
    return seen.size===pieces.length
  }
  function mutationMachineValid(pieces){
    if(pieces.some(piece=>pieceOverlapsBlockedGeometry(piece)))return false;
    if(!machineConnected(pieces))return false;
    for(let i=0;i<pieces.length;i++)for(let j=i+1;j<pieces.length;j++){
      const contact=E.contactBetweenPieces(pieces[i],pieces[j]);
      if(contact.touch&&!contact.ok)return false
    }
    return true
  }
  function mutationConsequences(tileId){
    const tile=s.set.find(t=>t.id===tileId)||s.pieces.find(p=>p.tile.id===tileId)?.tile||null;
    return{tile:cloneTile(tile),upgrade:Math.max(0,Number(tile?.upgrade)||0),circuitRank:Math.max(0,Number(s.circuitRanks?.[tileId])||0),mods:tileModIdsForTile(tileId)}
  }
  function mirrorMutationOptions(tileId){
    const piece=s.pieces.find(p=>p.tile.id===tileId);if(!piece||hingeProtectedTile(tileId))return[];
    const others=s.pieces.filter(p=>p.id!==piece.id),out=[];
    for(const anchorHalf of [0,1]){
      const anchor=piece.cubes.find(c=>c.half===anchorHalf);if(!anchor)continue;
      const currentVector=anchorHalf===0?piece.rr:(piece.rr+2)%4,nextVector=(currentVector+2)%4,rr=anchorHalf===0?nextVector:(nextVector+2)%4,[dx,dy]=E.DIR[rr];
      const x=anchorHalf===0?anchor.x:anchor.x-dx*E.S,y=anchorHalf===0?anchor.y:anchor.y-dy*E.S,placement={x,y,z:piece.z||0,rr};
      const valid=E.validatePlacement(piece.tile,x,y,piece.z||0,rr,others);if(!valid.ok)continue;
      const candidate=pieceAt(piece,placement),next=s.pieces.map(p=>p.id===piece.id?candidate:p);if(!mutationMachineValid(next))continue;
      out.push({key:`mirror:${anchorHalf}`,kind:'mirror',tileId,anchorHalf,placement,topologyLosses:topologyBreaksForPieces(next)})
    }
    return out
  }
  function pivotMutationOptions(tileId){
    const piece=s.pieces.find(p=>p.tile.id===tileId);if(!piece||hingeProtectedTile(tileId))return[];
    const others=s.pieces.filter(p=>p.id!==piece.id),out=[],seen=new Set();
    for(const anchorHalf of [0,1]){
      const anchor=piece.cubes.find(c=>c.half===anchorHalf);if(!anchor)continue;
      const currentVector=anchorHalf===0?piece.rr:(piece.rr+2)%4;
      for(const delta of [1,3]){
        const nextVector=(currentVector+delta)%4,rr=anchorHalf===0?nextVector:(nextVector+2)%4,[dx,dy]=E.DIR[rr];
        const x=anchorHalf===0?anchor.x:anchor.x-dx*E.S,y=anchorHalf===0?anchor.y:anchor.y-dy*E.S,placement={x,y,z:piece.z||0,rr};
        const key=`pivot:${anchorHalf}:${rr}`;if(seen.has(`${x},${y},${rr}`))continue;
        const valid=E.validatePlacement(piece.tile,x,y,piece.z||0,rr,others);if(!valid.ok)continue;
        const candidate=pieceAt(piece,placement),next=s.pieces.map(p=>p.id===piece.id?candidate:p);if(!mutationMachineValid(next))continue;
        seen.add(`${x},${y},${rr}`);out.push({key,kind:'pivot',tileId,anchorHalf,turn:delta===1?'CW':'CCW',placement,topologyLosses:topologyBreaksForPieces(next)})
      }
    }
    return out
  }
  function recallMutationOptions(tileId){
    const piece=s.pieces.find(p=>p.tile.id===tileId);if(!piece||s.pieces.length<=1||hingeProtectedTile(tileId))return[];
    const next=s.pieces.filter(p=>p.id!==piece.id);if(!mutationMachineValid(next))return[];
    return[{key:'recall',kind:'recall',tileId,topologyLosses:topologyBreaksForPieces(next)}]
  }
  function directlyConnectedPieces(piece){
    const out=[];for(const other of s.pieces){if(other.id===piece.id)continue;const contact=E.contactBetweenPieces(piece,other);if(contact.touch&&contact.ok)out.push(other)}return out
  }
  function scrapMutationOptions(tileId){
    const piece=s.pieces.find(p=>p.tile.id===tileId);if(!piece)return[];
    const out=[];
    for(const target of directlyConnectedPieces(piece)){
      if(hingeProtectedTile(target.tile.id))continue;
      const next=s.pieces.filter(p=>p.id!==target.id);if(!mutationMachineValid(next))continue;
      out.push({key:`scrap:${target.tile.id}`,kind:'scrap',tileId,targetTileId:target.tile.id,topologyLosses:topologyBreaksForPieces(next),consequences:mutationConsequences(target.tile.id)})
    }
    return out
  }
  function swapMutationOptions(tileId){
    const piece=s.pieces.find(p=>p.tile.id===tileId);if(!piece||hingeProtectedTile(tileId))return[];
    const sourcePlacement=piecePlacement(piece),out=[];
    for(const target of directlyConnectedPieces(piece)){
      if(hingeProtectedTile(target.tile.id))continue;
      const targetPlacement=piecePlacement(target),a=pieceAt(piece,targetPlacement),b=pieceAt(target,sourcePlacement),next=s.pieces.map(p=>p.id===piece.id?a:p.id===target.id?b:p);
      if(!mutationMachineValid(next))continue;
      out.push({key:`swap:${target.tile.id}`,kind:'swap',tileId,targetTileId:target.tile.id,sourcePlacement,targetPlacement,topologyLosses:topologyBreaksForPieces(next)})
    }
    return out
  }
  function mutationOptionsFor(id,tileId){
    if(id==='mirror')return mirrorMutationOptions(tileId);
    if(id==='pivot')return pivotMutationOptions(tileId);
    if(id==='recall')return recallMutationOptions(tileId);
    if(id==='scrap')return scrapMutationOptions(tileId);
    if(id==='swap')return swapMutationOptions(tileId);
    return[]
  }
  function mutationUseAvailable(id){
    if(id==='scrap')return s.scrapUsedMarket!==(s.marketCount||0);
    return ROUND_MUTATION_IDS.includes(id)&&s.mutationUseRound?.[id]!==s.round
  }
  function mutationOptions(tileId){
    const id=['mirror','pivot','recall','scrap','swap'].find(mod=>assignedTileIdsForMod(mod).includes(tileId))||null;
    if(!id)return{mod:null,available:false,reason:'no-mutation',options:[]};
    if(!canInteract())return{mod:id,available:false,reason:'state',options:[]};
    if(!mutationUseAvailable(id))return{mod:id,available:false,reason:'used',options:[]};
    const options=mutationOptionsFor(id,tileId);return{mod:id,available:options.length>0,reason:options.length?null:'no-target',options:deepClone(options)}
  }
  function clearTileModAssignments(tileId){
    const removed=[];
    for(const [id,field] of Object.entries(TILE_MOD_FIELDS)){
      if(s[field]!==tileId)continue;s[field]=null;removed.push(id);
      if(id==='diode')s.diodeInHalf=null;
      if(id==='hinge')s.hingeState=null;
      if(id==='toll')s.tollArmed=false;
      if(id==='foundation'){s.foundationAssignedMarket=null;s.foundationLastPayoutMarket=null}
    }
    if((s.zeroPortTileIds||[]).includes(tileId)){s.zeroPortTileIds=s.zeroPortTileIds.filter(id=>id!==tileId);removed.push('zero-port')}
    return removed
  }
  function applyMutation(tileId,optionKey){
    const available=mutationOptions(tileId);if(!available.available)return{ok:false,reason:available.reason||'state',mod:available.mod};
    const option=available.options.find(item=>item.key===optionKey);if(!option)return{ok:false,reason:'option',mod:available.mod};
    const mod=available.mod,piece=s.pieces.find(p=>p.tile.id===tileId);if(!piece)return{ok:false,reason:'tile',mod};
    let targetTileId=option.targetTileId||null,destroyed=null,delivery=null,before={source:piecePlacement(piece)},after=null;
    if(mod==='mirror'||mod==='pivot'){
      const candidate=pieceAt(piece,option.placement);s.pieces=s.pieces.map(p=>p.id===piece.id?candidate:p);after={source:piecePlacement(candidate)}
    }else if(mod==='swap'){
      const target=s.pieces.find(p=>p.tile.id===targetTileId);if(!target)return{ok:false,reason:'target',mod};
      const a=pieceAt(piece,option.targetPlacement),b=pieceAt(target,option.sourcePlacement);before.target=piecePlacement(target);s.pieces=s.pieces.map(p=>p.id===piece.id?a:p.id===target.id?b:p);after={source:piecePlacement(a),target:piecePlacement(b)}
    }else if(mod==='recall'){
      const tile=cloneTile(s.set.find(t=>t.id===tileId)||piece.tile),slot=s.hand.findIndex(t=>!t);
      s.pieces=s.pieces.filter(p=>p.id!==piece.id);s.placedTileIds=s.placedTileIds.filter(id=>id!==tileId);
      if(slot>=0){s.hand[slot]=tile;delivery={location:'hand',slot}}else{s.reserve.unshift(tile);delivery={location:'reserve',slot:null}}
      if(s.anchorId===tileId)s.anchorId=null
    }else if(mod==='scrap'){
      const target=s.pieces.find(p=>p.tile.id===targetTileId);if(!target)return{ok:false,reason:'target',mod};
      destroyed=mutationConsequences(targetTileId);s.pieces=s.pieces.filter(p=>p.id!==target.id);s.placedTileIds=s.placedTileIds.filter(id=>id!==targetTileId);
      removeTopologyMods(option.topologyLosses,targetTileId);const removedMods=clearTileModAssignments(targetTileId);destroyed.removedMods=removedMods;
      delete s.circuitRanks[targetTileId];s.set=s.set.filter(t=>t.id!==targetTileId);s.hand=s.hand.map(t=>t?.id===targetTileId?null:t);s.reserve=s.reserve.filter(t=>t?.id!==targetTileId);
      if(s.anchorId===targetTileId)s.anchorId=null
    }
    if(mod!=='scrap')removeTopologyMods(option.topologyLosses,targetTileId||tileId);
    if(mod==='scrap')s.scrapUsedMarket=s.marketCount||0;
    else{s.mutationUseRound=s.mutationUseRound||{};s.mutationUseRound[mod]=s.round}
    s.undoFrame=null;
    s.events.push({type:'mutation-use',mod,round:s.round+1,roundTurn:s.roundTurn,tileId,targetTileId,option:option.key,before,after,delivery,topologyLosses:deepClone(option.topologyLosses||[]),destroyed:deepClone(destroyed)});
    const continuation=assessContinuation()||{autoRerolls:0};
    return{ok:true,mod,tileId,targetTileId,delivery,topologyLosses:deepClone(option.topologyLosses||[]),destroyed:deepClone(destroyed),autoRerolls:continuation.autoRerolls||0}
  }

  function coreSignalBudgetForMode(mode=s.gameMode){
    const id=canonicalGameMode(mode),mapped=Number(cfg.CORE_SIGNAL_BY_MODE?.[id]),hasMapped=Number.isFinite(mapped)&&mapped>0,modeBase=Math.max(1,hasMapped?mapped:Number(cfg.CORE_SIGNAL_BASE)||24),purchased=Math.max(0,Number(s.signalUpgrades)||0);
    const base=modeBase+purchased,configuredStep=Number(cfg.CORE_SIGNAL_MARKET_STEP),marketStep=Math.max(0,Number.isFinite(configuredStep)?configuredStep:1),markets=coreGameMode(id)?Math.max(0,Number(s.marketCount)||0):0,marketBonus=markets*marketStep,coreCharge=modeBase+marketBonus,max=coreCharge;
    return{modeBase,base,max,coreCharge,purchased,markets,marketBonus,marketStep}
  }

  function signalOptionsForPieces(pieces,trigger){
    const doubleDoublePieceId=pieces.find(x=>x.tile.id===s.doubleDoubleTileId)?.id||null,doubleEchoPieceId=pieces.find(x=>x.tile.id===s.doubleEchoTileId)?.id||null,tripleDoublePieceId=pieces.find(x=>x.tile.id===s.tripleDoubleTileId)?.id||null,diodePieceId=pieces.find(x=>x.tile.id===s.diodeTileId)?.id||null,returnPieceId=pieces.find(x=>x.tile.id===s.returnTileId)?.id||null,mergePieceId=pieces.find(x=>x.tile.id===s.mergeTileId)?.id||null,hinge=hingeOptionForPieces(pieces);
    const signalEnabled=coreGameMode(s.gameMode)&&cfg.CORE_SIGNAL_ENABLED!==false,signalBudget=coreSignalBudgetForMode(),signalCoreIdsByPiece=new Map(),signalCoreById=new Map();
    if(signalEnabled){
      const coreTelemetry=coreShadowTelemetry(pieces);
      for(const core of coreTelemetry.cores||[]){
        signalCoreById.set(core.id,{id:core.id,archetype:core.archetype,level:core.level||1,links:(core.connectedLinks||[]).map(link=>({pieceId:link.pieceId,half:link.half,port:link.port}))});
        for(const link of core.connectedLinks||[]){const pieceId=link.pieceId;if(pieceId==null)continue;if(!signalCoreIdsByPiece.has(pieceId))signalCoreIdsByPiece.set(pieceId,[]);const ids=signalCoreIdsByPiece.get(pieceId);if(!ids.includes(core.id))ids.push(core.id)}
      }
    }
    return{initialOutput:trigger,initialOutputExact:SCORE.exact(trigger),doubleDoublePieceId,doubleEchoPieceId,tripleDoublePieceId,diodePieceId,diodeInHalf:Number.isInteger(s.diodeInHalf)?s.diodeInHalf:null,returnPieceId,mergePieceId,hingePieceId:hinge?.pieceId||null,hingePivotPieceId:hinge?.pivotPieceId||null,hingeTargetPlacement:hinge?.targetPlacement||null,hingeBlockedReason:hinge?.blockedReason||null,zeroPortPieceIds:zeroPortPieceIds(pieces),modIdsByPiece:pieceModifierMap(pieces),cornerMultiplier:cfg.CORNER_MOD_MULTIPLIER||3,longLineThreshold:cfg.LONG_LINE_THRESHOLD||3,longLineHighThreshold:cfg.LONG_LINE_HIGH_THRESHOLD||5,longLineMultiplier:cfg.LONG_LINE_MULTIPLIER||2,longLineHighMultiplier:cfg.LONG_LINE_HIGH_MULTIPLIER||3,overloadMaxMultiplier:cfg.OVERLOAD_MAX_MULTIPLIER||4,terminalMultiplier:cfg.TERMINAL_MOD_MULTIPLIER||3,pairMultiplier:cfg.PAIR_MOD_MULTIPLIER||3,bridgeMultiplier:cfg.BRIDGE_MOD_MULTIPLIER||3,frameMultiplier:cfg.FRAME_MOD_MULTIPLIER||2,frontierMultiplier:cfg.FRONTIER_MOD_MULTIPLIER||2,circuitRankByPiece:new Map(pieces.map(q=>[q.id,Math.max(0,Number(s.circuitRanks?.[q.tile.id])||0)])),economyCoins:s.coins,bankLowCoins:cfg.BANK_LOW_COINS||10,bankHighCoins:cfg.BANK_HIGH_COINS||20,bankLowMultiplier:cfg.BANK_LOW_MOD_MULTIPLIER||2,bankHighMultiplier:cfg.BANK_HIGH_MOD_MULTIPLIER||3,spendCoinThreshold:cfg.SPEND_COIN_THRESHOLD||5,spendMultiplier:cfg.SPEND_MOD_MULTIPLIER||3,tollArmed:!!s.tollArmed,tollCoins:cfg.TOLL_COINS||1,knotCycleCountByPiece:knotCycleCountByPiece(E,pieces),knotMultiplier:cfg.KNOT_MOD_MULTIPLIER||4,bifurcate:cfg.BIFURCATION_ENABLED,signalEnabled,signalBase:signalBudget.base,signalMax:signalBudget.max,signalCoreCharge:signalBudget.coreCharge,signalCoreIdsByPiece,signalCoreById,coreLevelStep:Math.max(0,Number(cfg.CORE_SIGNAL_LEVEL_STEP)||4),reservoirBonus:Math.max(0,Number(cfg.CORE_RESERVOIR_BONUS)||8)}
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
    return{operationCount:ops.length,physicalOperationCount:physicalOps.length,tollRepeatCount:ops.filter(e=>e.tollRepeat).length,uniqueVisitedPieceCount,reentryOperationCount,revisitedPieceCount,revisitRatio:physicalOps.length?reentryOperationCount/physicalOps.length:0,visitedMachineFraction:pieces.length?uniqueVisitedPieceCount/pieces.length:0,retraceMoveCount:events.filter(e=>e.type==='move'&&e.retrace).length,reverseOperationCount:ops.filter(e=>e.reverse).length,reboundCount,zeroPortCount,zeroReturnCount:reboundCount+zeroPortCount,forkCount:events.filter(e=>e.type==='signal-fork').length,diodeBlockCount:events.filter(e=>e.type==='diode-block').length,returnCount:events.filter(e=>e.type==='return').length,mergeCount:events.filter(e=>e.type==='signal-merge').length,hingeMoveCount:events.filter(e=>e.type==='hinge-move').length,hingeBlockedCount:events.filter(e=>e.type==='hinge-blocked').length,powerActivationCount:ops.filter(e=>(e.powerMultiplier||1)>1).length,modActivationCount:ops.filter(e=>(e.modMultiplier||1)>1).length,coreActivationCount:events.filter(e=>e.type==='core-activate').length,coreSignalAdded:events.filter(e=>e.type==='core-activate').reduce((sum,e)=>sum+Math.max(0,Number(e.signalAdded)||0),0),signalPeak:sim?.signalRuntime?.peak??null,leadCoreId:sim?.signalRuntime?.leadCoreId||null,leadCoreArchetype:sim?.signalRuntime?.leadCoreArchetype||null,coreRelayCount:events.filter(e=>e.type==='core-relay').length,coreDistributorSplitCount:events.filter(e=>e.type==='signal-fork'&&e.distributorCoreId).length,coreConductorFreeVisitCount:ops.filter(e=>e.conductorCoreId).length,coreReservoirLead:events.some(e=>e.type==='core-activate'&&e.order===1&&e.archetype==='reservoir'),signalDepleted:events.some(e=>e.type==='signal-depleted'),signalRemaining:sim?.signalRuntime?.remaining??null}
  }

  function signalShadowTelemetry(sim){
    const budget=coreSignalBudgetForMode(),base=budget.base,max=budget.max,enabled=coreGameMode(s.gameMode)&&cfg.CORE_SIGNAL_ENABLED!==false,events=sim?.events||[];
    const ops=events.filter(e=>e.type==='op'&&!e.tollRepeat),activations=events.filter(e=>e.type==='core-activate').map(e=>({coreId:e.coreId,pieceId:e.piece,order:e.order,role:e.role||null,lead:!!e.lead,last:!!e.last,archetype:e.archetype||null,level:Math.max(1,Number(e.level)||1),abilityApplied:e.abilityApplied||null,beforeSignal:e.beforeSignal,signalAdded:Math.max(0,Number(e.signalAdded)||0),afterSignal:e.afterSignal}));
    const depleted=events.find(e=>e.type==='signal-depleted')||null,remaining=Number.isFinite(sim?.signalRuntime?.remaining)?sim.signalRuntime.remaining:(ops.length&&Number.isFinite(ops.at(-1)?.signalAfter)?ops.at(-1).signalAfter:base);
    const levels=[base,...ops.map(e=>e.signalAfter).filter(Number.isFinite),...activations.flatMap(e=>[e.beforeSignal,e.afterSignal]).filter(Number.isFinite),depleted?.remaining].filter(Number.isFinite);
    const splits=events.filter(e=>e.type==='signal-fork').map(e=>({pieceId:e.piece,splitKind:e.splitKind||'double',remaining:e.signalRemaining,budgets:Array.isArray(e.signalBudgets)?[...e.signalBudgets]:[]}));
    const branchEnds=events.filter(e=>e.type==='signal-end').map(e=>({fork:e.fork,arm:e.arm,remaining:e.signalRemaining}));
    const merges=events.filter(e=>e.type==='signal-merge').map(e=>({fork:e.fork,pieceId:e.piece,remaining:e.signalRemaining,policy:'max-remaining-runtime'}));
    const relayEvents=events.filter(e=>e.type==='core-relay'),distributorSplits=events.filter(e=>e.type==='signal-fork'&&e.distributorCoreId),conductorFreeVisits=ops.filter(e=>e.conductorCoreId);
    return{enabled,interaction:enabled?'runtime':'off',baseSignal:base,maxSignal:max,coreCharge:budget.coreCharge,purchasedSignal:budget.purchased,markets:budget.markets,marketBonus:budget.marketBonus,marketStep:budget.marketStep,coreSignalAdded:activations.reduce((sum,e)=>sum+e.signalAdded,0),peakSignal:sim?.signalRuntime?.peak??(levels.length?Math.max(...levels):base),tileFirstVisitCost:1,retraceCost:0,chargedVisits:ops.filter(e=>e.signalCost===1).length,uniqueVisitedPieceCount:new Set(ops.map(e=>e.piece)).size,minRemaining:levels.length?Math.min(...levels):base,remaining,wouldStop:!!depleted,stopped:!!depleted,firstStop:depleted?{pieceId:depleted.piece,remaining:depleted.remaining}:null,activatedCoreIds:activations.map(e=>e.coreId),leadCoreId:sim?.signalRuntime?.leadCoreId||activations[0]?.coreId||null,leadCoreArchetype:sim?.signalRuntime?.leadCoreArchetype||activations[0]?.archetype||null,activations,effects:{relayCount:relayEvents.length,distributorSplitCount:distributorSplits.length,conductorFreeVisits:conductorFreeVisits.length,reservoirLead:activations.some(e=>e.lead&&e.archetype==='reservoir')},splits,branchEnds,merges}
  }

  function coreShadowTelemetry(pieces=s.pieces,cores=s.cores){
    const items=Array.isArray(cores)?cores.filter(core=>canonicalGameMode(s.gameMode)!=='frames'||geometryItemVisible(core)):[],cell=Math.max(1,Number(E.S)||2),overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
    const portTouch=(core,cube,side)=>{
      const xOverlap=Math.max(0,Math.min(core.x+core.size,cube.x+cell)-Math.max(core.x,cube.x)),yOverlap=Math.max(0,Math.min(core.y+core.size,cube.y+cell)-Math.max(core.y,cube.y));
      if(side==='U')return cube.y+cell===core.y&&xOverlap>0;
      if(side==='D')return cube.y===core.y+core.size&&xOverlap>0;
      if(side==='L')return cube.x+cell===core.x&&yOverlap>0;
      if(side==='R')return cube.x===core.x+core.size&&yOverlap>0;
      return false
    };
    const details=items.map(core=>{
      const overlapping=[],connected=[],connectedPorts=new Set(),connectedLinks=[],linkKeys=new Set();
      for(const piece of pieces||[]){
        const hit=(piece.cubes||[]).some(cube=>overlap({x:core.x,y:core.y,w:core.size,h:core.size},{x:cube.x,y:cube.y,w:cell,h:cell}));
        if(hit)overlapping.push(piece.tile?.id||piece.id);
        let touches=false;
        for(const cube of piece.cubes||[])for(const side of core.ports||[])if(portTouch(core,cube,side)){connectedPorts.add(side);touches=true;const key=`${piece.id}:${cube.half}:${side}`;if(!linkKeys.has(key)){linkKeys.add(key);connectedLinks.push({pieceId:piece.id,tileId:piece.tile?.id||null,half:cube.half,port:side})}}
        if(touches)connected.push(piece.tile?.id||piece.id)
      }
      connectedLinks.sort((a,b)=>String(a.port).localeCompare(String(b.port))||a.pieceId-b.pieceId||a.half-b.half);
      return{id:core.id,slot:core.slot,archetype:core.archetype,level:core.level||1,ports:[...(core.ports||[])],connectedPorts:[...connectedPorts],connectedLinks,x:core.x,y:core.y,size:core.size,overlapTileIds:[...new Set(overlapping)],connectedTileIds:[...new Set(connected)]}
    });
    return{enabled:coreGameMode(s.gameMode),interaction:coreGameMode(s.gameMode)?'physical':'none',coreCount:details.length,connectedCoreCount:details.filter(core=>core.connectedTileIds.length).length,overlapTileIds:[...new Set(details.flatMap(core=>core.overlapTileIds))],cores:details}
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
    if(placementOverlapsCore(tile,c.x,c.y,c.rr))return{ok:false,reason:'core-overlap'};if(placementOverlapsVoid(tile,c.x,c.y,c.rr))return{ok:false,reason:'void-overlap'};
    if(s.pieces.length){const v=E.validatePlacement(tile,c.x,c.y,0,c.rr,s.pieces);if(!v.ok)return{ok:false,reason:v.reason||'invalid'}}
    else{const p0=E.pieceFrom(tile,c.x,c.y,0,c.rr,-1);if(p0.rect.minx<0||p0.rect.miny<0||p0.rect.maxx>E.G||p0.rect.maxy>E.H)return{ok:false,reason:'bounds'}}
    const p=E.pieceFrom(tile,c.x,c.y,0,c.rr,s.idc+1);p.tile={...cloneTile(tile)};const pieces=[...s.pieces,p],topologyBreaks=topologyBreaksForPieces(pieces),trigger=tile.a+tile.b;
    const sim=pieces.length===1?{output:trigger,outputExact:SCORE.exact(trigger),events:[],reason:'root',rebounds:0,search:{starts:0,leaves:1,expanded:0}}:E.bestSignal(p.id,pieces,signalOptionsForPieces(pieces,trigger));
    const resonance=C.resonance(sim.output??trigger,sim.events,pieces,s.circuitRanks,cfg,sim.outputExact??SCORE.exact(sim.output??trigger));
    return{ok:true,handIndex:i,tile:cloneTile(tile),placement:{x:c.x,y:c.y,z:0,rr:c.rr},trigger,selectionOutput:sim.output??trigger,selectionOutputExact:sim.outputExact??SCORE.exact(sim.output??trigger),output:resonance.output,outputExact:resonance.outputExact,sim,resonance,topologyBreaks}
  }

  function decisionTelemetry(chosenIndex,chosenCandidate,options={}){
    const maxEvaluations=Math.max(1,Number(options.maxEvaluations)||48),timeBudgetMs=Math.max(0,options.timeBudgetMs==null?32:Number(options.timeBudgetMs)),clock=()=>typeof performance!=='undefined'&&performance.now?performance.now():Date.now(),started=clock(),topologyBefore=topologyTelemetry(),deckBefore=deckTelemetry(),coverageTarget=target(),coverageTargetExact=targetExact(),legal=[];
    for(let i=0;i<s.hand.length;i++)for(const c of candidatesForIndex(i))legal.push({handIndex:i,candidate:c});
    const chosenTile=s.hand[chosenIndex],chosenPlacement=chosenTile&&chosenCandidate?{tileId:chosenTile.id,handIndex:chosenIndex,x:chosenCandidate.x,y:chosenCandidate.y,z:0,rr:chosenCandidate.rr}:null;
    if(!chosenPlacement)return{evaluationComplete:false,skippedReason:'chosen-placement',legalPlacementCount:legal.length,evaluatedPlacementCount:0,evaluationMs:clock()-started,topologyBefore,deckBefore,coverageTarget,coverageTargetExact,clearCoverageSampleCount:0,clearCoverageClearCount:0,clearCoverage:null,clearCoverageComplete:false,coverageIncludesChosen:false,outputDistribution:null};
    const same=entry=>entry.handIndex===chosenIndex&&entry.candidate.x===chosenCandidate.x&&entry.candidate.y===chosenCandidate.y&&entry.candidate.rr===chosenCandidate.rr;
    if(!s.pieces.length){
      let best=null;const outputs=[];
      for(const entry of legal){const tile=s.hand[entry.handIndex],output=tile.a+tile.b,outputExact=SCORE.exact(output);outputs.push(output);if(!best||SCORE.compare(outputExact,best.outputExact)>0)best={output,outputExact,placement:{tileId:tile.id,handIndex:entry.handIndex,x:entry.candidate.x,y:entry.candidate.y,z:0,rr:entry.candidate.rr}}}
      const clearCount=outputs.filter(output=>SCORE.compare(SCORE.exact(output),coverageTargetExact)>=0).length;
      return{chosenOutput:null,chosenOutputExact:null,chosenSelectionOutput:null,chosenSelectionOutputExact:null,bestLegalOutput:best?.output??null,bestLegalOutputExact:best?.outputExact??null,bestEvaluatedOutput:best?.output??null,bestEvaluatedOutputExact:best?.outputExact??null,chosenVsBestRatio:null,legalPlacementCount:legal.length,evaluatedPlacementCount:0,evaluationComplete:true,evaluationStrategy:'root-equivalent',skippedReason:null,evaluationMs:clock()-started,bestPlacement:best?.placement||chosenPlacement,bestEvaluatedPlacement:best?.placement||chosenPlacement,chosenPlacement,topologyBefore,deckBefore,coverageTarget,coverageTargetExact,clearCoverageSampleCount:outputs.length,clearCoverageClearCount:clearCount,clearCoverage:outputs.length?clearCount/outputs.length:null,clearCoverageComplete:true,coverageIncludesChosen:true,outputDistribution:outputDistribution(outputs)}
    }
    let evaluated=0,best=null,stopReason=null;const coverageSampleOutputs=[],coverageSampleOutputExacts=[],ordered=stratifiedLegalEntries(legal,same,chosenIndex);
    const consider=preview=>{if(!preview?.ok)return;evaluated++;coverageSampleOutputs.push(preview.output);coverageSampleOutputExacts.push(preview.outputExact);if(!best||SCORE.compare(preview.outputExact,best.outputExact)>0)best=preview};
    for(const entry of ordered){if(evaluated>=maxEvaluations){stopReason='placement-cap';break}if(clock()-started>=timeBudgetMs){stopReason='time-budget';break}consider(previewPlacement(entry.handIndex,entry.candidate))}
    const complete=evaluated>=Math.max(0,legal.length-1);if(!complete&&!stopReason)stopReason='evaluation-incomplete';
    const clearCount=coverageSampleOutputExacts.filter(outputExact=>SCORE.compare(outputExact,coverageTargetExact)>=0).length;
    return{chosenOutput:null,chosenOutputExact:null,chosenSelectionOutput:null,chosenSelectionOutputExact:null,bestLegalOutput:null,bestLegalOutputExact:null,bestEvaluatedOutput:best?.output??null,bestEvaluatedOutputExact:best?.outputExact??null,chosenVsBestRatio:null,legalPlacementCount:legal.length,evaluatedPlacementCount:evaluated,evaluationComplete:complete,evaluationStrategy:complete?'exhaustive':'stratified-sample',skippedReason:complete?null:stopReason,evaluationMs:clock()-started,bestPlacement:null,bestEvaluatedPlacement:best?{tileId:best.tile.id,handIndex:best.handIndex,...best.placement}:null,chosenPlacement,topologyBefore,deckBefore,coverageTarget,coverageTargetExact,clearCoverageSampleCount:evaluated,clearCoverageClearCount:clearCount,clearCoverage:evaluated?clearCount/evaluated:null,clearCoverageComplete:false,coverageIncludesChosen:false,outputDistribution:outputDistribution(coverageSampleOutputs),coverageSampleOutputs,coverageSampleOutputExacts}
  }
  function captureUndoFrame(){
    const old=s.undoFrame;s.undoFrame=null;const frame=deepClone(s);s.undoFrame=old;return frame
  }
  function beginPlacement(i,c){
    if(!canInteract()||i<0||i>=s.hand.length||!s.hand[i])return{ok:false,reason:'state'};
    const tile=s.hand[i];
    if(s.placedTileIds.includes(tile.id))return{ok:false,reason:'tile-already-in-machine'};
    if(!s.pieces.length&&cfg.FIRST_TILE_MUST_BE_DOUBLE&&s.turn===0&&!isDouble(tile))return{ok:false,reason:'first-double'};
    if(placementOverlapsCore(tile,c.x,c.y,c.rr))return{ok:false,reason:'core-overlap'};if(placementOverlapsVoid(tile,c.x,c.y,c.rr))return{ok:false,reason:'void-overlap'};
    if(s.pieces.length){const v=E.validatePlacement(tile,c.x,c.y,0,c.rr,s.pieces);if(!v.ok)return{ok:false,reason:v.reason||'invalid'}}
    else{const p0=E.pieceFrom(tile,c.x,c.y,0,c.rr,-1);if(p0.rect.minx<0||p0.rect.miny<0||p0.rect.maxx>E.G||p0.rect.maxy>E.H)return{ok:false,reason:'bounds'}}
    const undoFrame=captureUndoFrame();
    s.running=true;
    const p=E.pieceFrom(tile,c.x,c.y,0,c.rr,++s.idc);p.tile={...cloneTile(tile)};
    const topologyBreaks=topologyBreaksForPieces([...s.pieces,p]);
    s.pieces.push(p);s.placedTileIds.push(tile.id);
    const topologyLosses=removeTopologyMods(topologyBreaks,tile.id);
    const trigger=tile.a+tile.b;
    const sim=s.pieces.length===1?{output:trigger,outputExact:SCORE.exact(trigger),events:[],reason:'root',rebounds:0,search:{starts:0,leaves:1,expanded:0}}:E.bestSignal(p.id,s.pieces,signalOptionsForPieces(s.pieces,trigger)),signalRuntime=signalShadowTelemetry(sim);
    if(isZero(tile))s.roundZero.placed++;
    const generationBefore=s.setGeneration||1;s.hand[i]=drawOne();
    if((s.setGeneration||1)>generationBefore){
      const filled=fillEmptyHand();
      s.events.push({type:'power-set-hand-refill',round:s.round+1,roundTurn:s.roundTurn+1,generation:s.setGeneration||1,filled,hand:s.hand.filter(Boolean).map(cloneTile)})
    }
    s.turn++;s.roundTurn++;s.undoFrame=undoFrame;
    if(s.endlessMode)s.systemStrain=(s.systemStrain||0)+1;
    return{ok:true,tile,p,trigger,baseTrigger:trigger,sim,signalRuntime,signalShadow:signalRuntime,handIndex:i,topologyLosses}
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

  function overkillTier(outputExact,tgtExact){return SCORE.compare(outputExact,SCORE.multiply(tgtExact,10))>=0?3:SCORE.compare(outputExact,SCORE.multiply(tgtExact,5))>=0?2:SCORE.compare(outputExact,SCORE.multiply(tgtExact,3))>=0?1:0}
  function scheduleIntermission(){
    if(!s.endlessMode&&s.round>=cfg.TOTAL_ROUNDS-1){s.nextShopType='none';s.intermissionResolved=true;return}
    const endOfStage=(s.round+1)%stageSize()===0;
    s.nextShopType=endOfStage?'market':'none';
    s.intermissionResolved=!endOfStage;
    s.events.push({type:'shop-scheduled',round:s.round+1,shop:s.nextShopType})
  }

  function finishPlacement(ctx){
    if(!ctx?.ok)return ctx;
    const{tile,p,trigger,sim}=ctx,resonance=moveResonance(sim,trigger);s.scoreExact=resonance.outputExact;s.score=resonance.output;if(SCORE.compare(s.scoreExact,s.bestExact??SCORE.exact(s.best||0))>0){s.bestExact=s.scoreExact;s.best=s.score}s.cleared=SCORE.compare(s.scoreExact,targetExact())>=0;
    const st=(sim.events||[]).find(e=>e.type==='start'),rs=(sim.events||[]).filter(e=>e.type==='route'),income=upgradeIncomeFor(sim),mintIncome=mintIncomeFor(sim,resonance.output),tollSpend=tollSpendFor(sim),brokerPrepared=brokerActivatedFor(sim)&&!s.brokerDiscountReady;
    const activatedPieceIds=[...new Set((sim.events||[]).filter(e=>e.type==='op').map(e=>e.piece))],activatedTileIds=[...new Set([tile.id,...activatedPieceIds.map(id=>s.pieces.find(p=>p.id===id)?.tile?.id).filter(Boolean)])];
    const zeroPortEvents=(sim.events||[]).filter(e=>e.type==='zero-port'),echoEvent=(sim.events||[]).find(e=>e.type==='double-echo-result')||null,signalRuntime=deepClone(ctx.signalRuntime||ctx.signalShadow||signalShadowTelemetry(sim)),coreActivations=(signalRuntime.activations||[]).map(a=>({...a}));
    const zeroPorts=zeroPortEvents.map(e=>({fromTileId:s.pieces.find(q=>q.id===e.piece)?.tile?.id||null,toTileId:s.pieces.find(q=>q.id===e.toPieceId)?.tile?.id||null}));
    s.events.push({turn:s.turn,round:s.round+1,roundTurn:s.roundTurn,mode:ctx.ouroboros?'ouroboros':'placement',signal:signalRuntime,signalShadow:deepClone(signalRuntime),coreActivations,coreShadow:deepClone(coreShadowTelemetry()),tile:cloneTile(tile),activatedTileIds,topologyLosses:deepClone(ctx.topologyLosses||[]),placement:{x:p.cubes[0].x,y:p.cubes[0].y,z:0,rr:p.rr},dir:E.ARROW[p.rr],target:target(),targetExact:targetExact(),trigger,baseTrigger:trigger,selectionOutput:sim.selectionOutput??sim.mainOutput??sim.output,selectionOutputExact:sim.selectionOutputExact??sim.mainOutputExact??sim.outputExact??SCORE.exact(sim.selectionOutput??sim.mainOutput??sim.output??trigger),output:s.score,outputExact:s.scoreExact,upgradeCoins:income.total,mintCoins:mintIncome.total,tollCoins:tollSpend.total,brokerPrepared,starCoins:income.total,longRunActivated:income.longRunActive,longRunCapped:income.longRunCapped,systemStrain:s.systemStrain||0,uniquePieces:income.uniquePieces,zeroPorts,echo:echoEvent?{tileId:s.doubleEchoTileId,mainOutput:echoEvent.mainOutput,mainOutputExact:echoEvent.mainOutputExact,echoOutput:echoEvent.echoOutput,echoOutputExact:echoEvent.echoOutputExact,finalOutput:echoEvent.finalOutput,finalOutputExact:echoEvent.finalOutputExact,rebounds:echoEvent.echoRebounds||0}:null,rebounds:sim.rebounds||0,start:st?.key||'-',flipped:!!st?.flipped,reason:sim.reason,ops:(sim.events||[]).filter(e=>e.type==='op').map(e=>{const mod=e.modMultiplier>1?` MOD×${e.modMultiplier}`:'';return e.op==='multiply'?`${e.piece}:×${e.factor}${e.doubleDouble?'DD':''}${e.powerMultiplier>1?' PWR':''}${mod} ${e.beforeExact??e.before}>${e.afterExact??e.after}${e.reverse?'R':''}`:`${e.piece}:+${e.add}${e.doubleDouble?'DD':''}${e.powerMultiplier>1?' PWR':''}${mod} ${e.beforeExact??e.before}>${e.afterExact??e.after}${e.reverse?'R':''}`}).join(','),routes:rs.map(e=>`${e.piece}:${e.entryHalf}>${e.toPieceId}:${e.toHalf}`).join(';'),search:sim.search?`${sim.search.starts}/${sim.search.leaves}/${sim.search.expanded}${sim.search.truncated?'!':''}`:'-',clear:s.cleared});
    const tollCoins=applyTollSpend(tollSpend),brokerReady=prepareBrokerDiscount(sim),upgradeCoins=awardUpgradeIncome(income),mintCoins=awardMintIncome(mintIncome);
    const forks=(sim.events||[]).filter(e=>e.type==='signal-fork');
    if(forks.length)s.events.push({type:'signal-resolution',round:s.round+1,move:s.turn,baseOutput:sim.output,baseOutputExact:sim.outputExact,splitCount:forks.length,selectionOutput:sim.selectionOutput??sim.mainOutput??sim.output,selectionOutputExact:sim.selectionOutputExact??sim.mainOutputExact??sim.outputExact,events:sim.events.map(e=>({...e,tileId:s.pieces.find(q=>q.id===e.piece)?.tile.id||null}))});
    let continuation={autoRerolls:0};
    if(s.cleared){
      const rewardBreakdown=clearRewardBreakdown(),reward=rewardBreakdown.total;s.coins+=reward;s.roundZero.endHand=countZero(s.hand.filter(Boolean));
      const tier=overkillTier(s.scoreExact,targetExact()),old=tile.upgrade||0;
      if(tier>old){tile.upgrade=tier;p.tile.upgrade=tier;s.events.push({type:'tile-upgrade',round:s.round+1,tile:cloneTile(tile),from:old,to:tier,ratio:+(s.score/target()).toFixed(2)})}
      s.anchorId=tile.id;s.events.push({type:'anchor-set',round:s.round+1,tile:cloneTile(tile)});
      s.wins.push({round:s.round+1,target:target(),targetExact:targetExact(),output:s.score,outputExact:s.scoreExact,turn:s.turn,placements:s.roundTurn,reward,rewardBreakdown,upgradeCoins:s.roundUpgradeCoins,anchor:cloneTile(tile),upgradeTier:tile.upgrade||0,machineSize:s.pieces.length,setSize:s.set.length,setGeneration:s.setGeneration||1,zeros:{...s.roundZero}});
      if(!s.standardComplete&&s.round===cfg.TOTAL_ROUNDS-1){s.standardComplete=true;s.events.push({type:'run-complete',round:s.round+1,target:target(),targetExact:targetExact(),output:s.score,outputExact:s.scoreExact,coins:s.coins,inflation:s.inflation})}
      s.events.push({type:'coins',round:s.round+1,amount:reward,breakdown:rewardBreakdown,coins:s.coins});scheduleIntermission()
    }else{const protection=ensureOpeningContinuation('draw');if(protection)s.events.push(protection)}
    s.events.push({type:'circuit-resonance',round:s.round+1,move:s.turn,...resonance});
    let hingeMoved=false;
    if(sim.hingeFinalPlacement&&s.hingeTileId&&s.hingeState?.tileId===s.hingeTileId){
      const index=s.pieces.findIndex(q=>q.tile.id===s.hingeTileId),current=index>=0?s.pieces[index]:null,pl=sim.hingeFinalPlacement;
      if(current){const moved=E.pieceFrom(current.tile,pl.x,pl.y,pl.z||0,pl.rr,current.id);moved.tile={...current.tile};s.pieces[index]=moved;s.hingeState.active=s.hingeState.active===1?0:1;hingeMoved=true;s.events.push({type:'hinge-state',round:s.round+1,move:s.turn,tileId:s.hingeTileId,pivotTileId:s.hingeState.pivotTileId,active:s.hingeState.active,placement:{x:pl.x,y:pl.y,z:pl.z||0,rr:pl.rr}})}
    }
    discoverCircuit(tile.id);
    s.running=false;
    if(!s.cleared&&!s.pendingCircuit)continuation=assessContinuation()||continuation;
    return{ok:true,cleared:s.cleared,blocked:s.blocked,needsReroll:s.needsReroll,failureReason:s.failureReason,nextShopType:s.nextShopType,upgradeCoins,autoRerolls:continuation.autoRerolls||0,pendingCircuit:!!s.pendingCircuit,resonance,mintCoins,tollCoins,brokerReady,hingeMoved}
  }

  function moveResonance(sim,trigger=0){
    const baseOutput=sim.output??trigger,alignedExact=sim.outputExact!=null&&Number(sim.outputExact)===Number(baseOutput)?sim.outputExact:null;
    return C.resonance(baseOutput,sim.events,s.pieces,s.circuitRanks,cfg,SCORE.exact(baseOutput,alignedExact))
  }
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
    const continuation=!s.cleared?assessContinuation():{autoRerolls:0};
    return{ok:true,tileId,before,after,autoRerolls:continuation.autoRerolls||0,blocked:s.blocked,failureReason:s.failureReason}
  }

  function canUsePurchasedTool(id){
    if(id==='reroll')return !s.ouroborosMode&&!s.pendingCircuit&&!s.pendingModPlacement&&!s.running&&!s.cleared&&!s.shopOpen&&s.failureReason!=='no-tiles'&&s.failureReason!=='placement-limit';
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
    const m=M.get(id);if(!m||m.kind!=='consumable'||(s.ouroborosMode&&id==='reroll')||s.pendingCircuit||s.pendingModPlacement||s.running||s.cleared||s.shopOpen||s.needsReroll)return false;
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
    const offers=ensureShopTileOffers(),generation=nextSetGeneration(),existing=new Set(s.set.map(t=>t.id)),reserved=new Set(offers.map(t=>t.id)),generationAvailable=generation<=maxSetGeneration()&&!s.ouroborosMode;
    const randomAvailable=generationAvailable&&makePowerSet(generation).some(t=>!existing.has(t.id)&&!reserved.has(t.id)),exactOffers=generationAvailable?offers.filter(t=>!existing.has(t.id)):[],randomPrice=shopRandomPrice(),tileOfferPrice=shopTileOfferPrice();
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
  function canOpenShop(options={}){const availability=shopPurchaseAvailability();return shopStateAllowsOpen()&&availability.hasAny&&(options?.allowUnaffordable||!availability.blockedByCoins)}
  function openShop(options={}){
    if(!shopStateAllowsOpen())return false;
    const availability=shopPurchaseAvailability();if(!availability.hasAny)return false;if(!options?.allowUnaffordable&&availability.blockedByCoins){s.events.push({type:'shop-close',round:s.round+1,shop:'shop',reason:'insufficient-coins',opened:false,coins:s.coins,inflation:s.inflation,available:availableTileCount(),cheapestPrice:availability.cheapestPrice});return false}
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
    const generation=nextSetGeneration();if(generation>maxSetGeneration()||s.ouroborosMode)return null;
    const existing=new Set(s.set.map(t=>t.id)),reserved=new Set(ensureShopTileOffers().map(t=>t.id)),candidates=makePowerSet(generation).filter(t=>!existing.has(t.id)&&!reserved.has(t.id));
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
  function marketSignalBaseCost(){return Math.max(0,(Number(cfg.CORE_SIGNAL_PURCHASE_COST)||8)+(Math.max(0,Number(s.signalUpgrades)||0)*Math.max(0,Number(cfg.CORE_SIGNAL_PURCHASE_STEP)||3)))}
  function marketSignalPrice(){return coreGameMode(s.gameMode)?discountedMarketCost(marketSignalBaseCost()):Infinity}
  function marketSignalUpgradeInfo(){const available=coreGameMode(s.gameMode),locked=s.marketBuys.length>=(cfg.MARKET_PURCHASE_LIMIT||1),price=marketSignalPrice(),budget=coreSignalBudgetForMode();return{available,locked,price,canBuy:available&&!locked&&s.coins>=price,current:budget.base,next:budget.base+1,upgrades:budget.purchased,coreCharge:budget.coreCharge,brokerDiscount:brokerDiscountAmount()}}
  function marketOfferAffordability(offerIds=s.shopOffers){
    const ids=Array.isArray(offerIds)?offerIds:[],prices=ids.map(id=>marketModPrice(id)).filter(Number.isFinite),signal=marketSignalUpgradeInfo(),allPrices=signal.available&&Number.isFinite(signal.price)?[...prices,signal.price]:prices,hasAny=allPrices.length>0,canAffordAny=allPrices.some(price=>s.coins>=price);
    return{hasAny,canAffordAny,blockedByCoins:hasAny&&!canAffordAny,cheapestPrice:allPrices.length?Math.min(...allPrices):null,coins:s.coins,signal}
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
      if(m.eligibility==='mutation-mirror')candidates=candidates.filter(t=>mirrorMutationOptions(t.id).length>0);
      if(m.eligibility==='mutation-pivot')candidates=candidates.filter(t=>pivotMutationOptions(t.id).length>0);
      if(m.eligibility==='mutation-recall')candidates=candidates.filter(t=>recallMutationOptions(t.id).length>0);
      if(m.eligibility==='mutation-scrap')candidates=candidates.filter(t=>scrapMutationOptions(t.id).length>0);
      if(m.eligibility==='mutation-swap')candidates=candidates.filter(t=>swapMutationOptions(t.id).length>0);
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
  function buyMarketSignal(){
    if(!s.shopOpen||s.shopType!=='market')return{ok:false,reason:'shop'};
    if(!coreGameMode(s.gameMode))return{ok:false,reason:'mode'};
    if(s.marketBuys.length>=(cfg.MARKET_PURCHASE_LIMIT||1))return{ok:false,reason:'limit'};
    const cost=marketSignalPrice();if(s.coins<cost)return{ok:false,reason:'coins'};
    const before=coreSignalBudgetForMode(),baseCost=marketSignalBaseCost(),brokerDiscount=brokerDiscountAmount(),purchase=applyPurchase(cost);
    if(brokerDiscount>0)s.brokerDiscountReady=false;
    s.signalUpgrades=Math.max(0,Number(s.signalUpgrades)||0)+1;s.undoFrame=null;
    const after=coreSignalBudgetForMode(),record={kind:'signal',signal:1,cost,brokerDiscount,inflationBefore:purchase.inflationBefore,inflationAfter:purchase.inflationAfter,beforeSignal:before.base,afterSignal:after.base};s.marketBuys.push(record);
    s.events.push({type:'market-signal-buy',round:s.round+1,shop:'market',amount:1,baseCost,brokerDiscount,cost,coins:s.coins,beforeSignal:before.base,afterSignal:after.base,signalUpgrades:s.signalUpgrades,...purchase});
    if(brokerDiscount>0)s.events.push({type:'broker-discount',round:s.round+1,mod:'signal',amount:brokerDiscount,cost,coins:s.coins});
    closeMarketState('signal-upgrade',true);
    return{ok:true,amount:1,cost,inflation:s.inflation,beforeSignal:before.base,afterSignal:after.base,signalUpgrades:s.signalUpgrades}
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
    s.events.push({type:'endless-start',afterRound:s.round+1,nextRound:s.round+2,target:targetForRound(s.round+1),targetExact:targetExactForRound(s.round+1)});
    scheduleIntermission();
    return s.nextShopType==='market'?openIntermission():advance()
  }
  function advance(){if(s.pendingCircuit||!s.cleared||s.shopOpen||!s.intermissionResolved)return false;if(!s.endlessMode&&s.round>=cfg.TOTAL_ROUNDS-1)return false;s.round++;startRound(false);return true}
  function status(){if(s.pendingCircuit)return'CIRCUIT CHOICE';if(s.pendingModPlacement)return'MOD CHOICE';if(s.ouroborosMode)return s.blocked?'OUROBOROS FAILED':s.cleared?'OUROBOROS CLEAR':'OUROBOROS';if(s.endlessMode)return s.blocked?'ENDLESS FAILED':s.cleared?'ENDLESS CLEAR':'ENDLESS';return s.standardComplete&&s.cleared&&s.round===cfg.TOTAL_ROUNDS-1?'COMPLETE':s.blocked?'ROUND FAILED':'IN PROGRESS'}

  function recoveryOptions(){
    const failure=s.needsReroll?'no-legal-moves':s.failureReason,shopAvailable=canOpenShop(),undo=canUndo();
    const ownedReroll=canUseReroll(),ownedMove=failure==='placement-limit'&&canUseMove();
    const toolReroll=canBuyTool('reroll')&&toolPurchaseQuote('reroll',1).canAfford,toolMove=canBuyTool('move')&&toolPurchaseQuote('move',1).canAfford,shopTile=shopAvailable&&s.coins>=shopRandomPrice();
    const shopRescue=failure==='no-tiles'?shopTile:false,toolRescue=failure==='placement-limit'?toolMove:false,rerollRescue=failure==='no-legal-moves'?toolReroll:false;
    const recoverable=failure==='no-legal-moves'?rerollRescue:failure==='placement-limit'?(ownedMove||undo||toolRescue):failure==='no-tiles'?(undo||shopRescue):undo;
    return{recoverable,undo,ownedReroll,ownedMove,shopAvailable,shopRescue,toolRescue,rerollRescue,toolReroll,toolMove,shopTile,prices:{reroll:toolPrice('reroll'),move:toolPrice('move'),undo:toolPrice('undo'),randomTile:shopRandomPrice()}}
  }

  function snapshot(){
    const size=stageSize(),stage=stageIndex(),bs=E.getBoardSize?E.getBoardSize():{G:E.G,H:E.H},tileMods=allTileModAssignments(),coreShadow=coreShadowTelemetry();
    const tileById=id=>id?cloneTile(s.set.find(t=>t.id===id)):null,lastSignalEvent=[...(s.events||[])].reverse().find(e=>e?.signal||e?.signalShadow)||null,lastSignal=lastSignalEvent?.signal||lastSignalEvent?.signalShadow||null;
    return{
      circuits:{ranks:{...s.circuitRanks},signatures:[...s.circuitSignatures],pending:deepClone(s.pendingCircuit),tileLimit:circuitTileLimit()},
      cores:{mode:coreGameMode(s.gameMode)?s.gameMode:'none',interaction:coreGameMode(s.gameMode)?'physical':'none',items:deepClone(s.cores||[]),telemetry:deepClone(coreShadow),progressMilestones:[...(s.coreProgressMilestones||[])],maxPhysical:coreMaxPhysicalForMode(),maxLevel:Math.max(1,Number(cfg.CORE_LEVEL_MAX)||5)},
      modeGeometry:{mode:s.gameMode,voids:deepClone(s.voids||[]),items:deepClone(modeGeometryItems()),visibleIds:modeGeometryItems().filter(item=>geometryItemVisible(item,bs)).map(item=>item.id)},
      signal:{enabled:coreGameMode(s.gameMode)&&cfg.CORE_SIGNAL_ENABLED!==false,shadowEnabled:false,interaction:coreGameMode(s.gameMode)?'runtime':'off',modeBase:coreSignalBudgetForMode().modeBase,base:coreSignalBudgetForMode().base,max:coreSignalBudgetForMode().max,coreCharge:coreSignalBudgetForMode().coreCharge,purchasedSignal:coreSignalBudgetForMode().purchased,markets:coreSignalBudgetForMode().markets,marketBonus:coreSignalBudgetForMode().marketBonus,marketStep:coreSignalBudgetForMode().marketStep,last:deepClone(lastSignal)},
      powerSets:{generation:s.setGeneration||1,powerMultiplier:generationPower(s.setGeneration||1),maxGeneration:maxSetGeneration()},
      schema:'iterion.run.v9',gameVersion:cfg.VERSION,engineVersion:cfg.ENGINE_VERSION,gameMode:s.gameMode||'classic',runId:s.runId,seed:s.seed,startedAt:s.startedAt,savedAt:new Date().toISOString(),
      status:status(),failureReason:s.failureReason,recovery:recoveryOptions(),
      endless:{systemStrain:s.systemStrain||0,longRunActivations:s.endlessLongRunActivations||0,longRunActivationCap:cfg.ENDLESS_LONG_RUN_ACTIVATIONS??7,available:canStartEndless(),active:!!s.endlessMode,baseComplete:!!s.standardComplete,startedRound:s.endlessStartedRound,roundsCleared:Math.max(0,s.wins.length-cfg.TOTAL_ROUNDS),targetMultiplier:cfg.ENDLESS_TARGET_MULTIPLIER||5,phase:s.ouroborosMode?'ouroboros':infinitePhase()?'infinite':s.endlessMode?'endless':'classic',infinitePhase:infinitePhase(),infinitePhaseStartRound:infinitePhaseStartRound()+1,ouroboros:!!s.ouroborosMode,ouroborosStartedRound:s.ouroborosStartedRound,ouroborosBoardSize:Array.isArray(s.ouroborosBoardSize)?[...s.ouroborosBoardSize]:null,endlessStagesCompleted:endlessStagesCompleted(),boardGrowthStageInterval:Math.max(1,Number(cfg.INFINITE_BOARD_STAGE_INTERVAL)||2),handSize:handSizeForRound()},
      round:{index:s.round+1,total:cfg.TOTAL_ROUNDS,target:target(),targetExact:targetExact(),placements:s.roundTurn,maxPlacements:maxPlacements(),clears:s.wins,upgradeCoins:s.roundUpgradeCoins},
      stage:{index:stage+1,total:Math.ceil(cfg.TOTAL_ROUNDS/size),round:(s.round%size)+1,size},boardSize:{width:bs.G,height:bs.H},
      score:{last:s.score,lastExact:s.scoreExact??SCORE.exact(s.score||0),best:s.best,bestExact:s.bestExact??SCORE.exact(s.best||0)},turnCount:s.turn,coins:s.coins,inflation:s.inflation,consumables:{...s.consumables},freeReroll:s.freeReroll||0,
      mods:[...s.mods],tileMods:deepClone(tileMods),pendingModPlacement:deepClone(s.pendingModPlacement),anchorId:s.anchorId,
      doubleDoubleTileId:s.doubleDoubleTileId,doubleDouble:tileById(s.doubleDoubleTileId),
      doubleEchoTileId:s.doubleEchoTileId,doubleEcho:tileById(s.doubleEchoTileId),
      tripleDoubleTileId:s.tripleDoubleTileId,tripleDouble:tileById(s.tripleDoubleTileId),
      zeroPortTileIds:[...(s.zeroPortTileIds||[])],
      parityExchangeTileId:s.parityExchangeTileId||null,cornerTileId:s.cornerTileId||null,longLineTileId:s.longLineTileId||null,overloadTileId:s.overloadTileId||null,terminalTileId:s.terminalTileId||null,diodeTileId:s.diodeTileId||null,diodeInHalf:Number.isInteger(s.diodeInHalf)?s.diodeInHalf:null,returnTileId:s.returnTileId||null,recallTileId:s.recallTileId||null,pairTileId:s.pairTileId||null,bridgeTileId:s.bridgeTileId||null,pivotTileId:s.pivotTileId||null,scrapTileId:s.scrapTileId||null,brokerTileId:s.brokerTileId||null,swapTileId:s.swapTileId||null,spendTileId:s.spendTileId||null,mergeTileId:s.mergeTileId||null,hingeTileId:s.hingeTileId||null,hingeState:deepClone(s.hingeState),bankTileId:s.bankTileId||null,tollTileId:s.tollTileId||null,tollArmed:!!s.tollArmed,brokerDiscountReady:!!s.brokerDiscountReady,foundationTileId:s.foundationTileId||null,knotTileId:s.knotTileId||null,mirrorTileId:s.mirrorTileId||null,mintTileId:s.mintTileId||null,
      longRun:s.mods.includes('long-run'),setSize:s.set.length,set:s.set.map(cloneTile),placedTileIds:[...s.placedTileIds],availableTileCount:availableTileCount(),machinePersistent:!!cfg.PERSIST_MACHINE_BETWEEN_ROUNDS,
      rerollsLeft:(s.freeReroll||0)+(s.consumables.reroll||0),canUndo:canUndo(),
      shop:{nextType:s.nextShopType,resolved:s.intermissionResolved,open:s.shopOpen,type:s.shopType,offers:[...s.shopOffers],randomTilePrice:shopRandomPrice(),tileOfferGeneration:s.shopTileOfferGeneration||nextSetGeneration(),tileOffers:ensureShopTileOffers().map(t=>({tile:cloneTile(t),price:shopTileOfferPrice()})),doubleDoublePrice:marketDoubleDoublePrice(),marketOffers:s.shopOffers.map(id=>{const info=marketOfferInfo(id);return{id,category:info.mod?.category||null,price:info.price,targetCount:info.targetCount,locked:info.locked,offerWeight:info.offerWeight,brokerDiscount:info.brokerDiscount||0,assignedTileIds:[...info.assignedTileIds]}}),marketSignal:marketSignalUpgradeInfo()},
      tileModState:{marketCount:s.marketCount||0,foundationAssignedMarket:Number.isInteger(s.foundationAssignedMarket)?s.foundationAssignedMarket:null,foundationLastPayoutMarket:Number.isInteger(s.foundationLastPayoutMarket)?s.foundationLastPayoutMarket:null,foundationProgress:foundationAgeForTile(s.foundationTileId),foundationInterval:Math.max(1,Number(cfg.FOUNDATION_MARKETS)||3),tollArmed:!!s.tollArmed,brokerDiscountReady:!!s.brokerDiscountReady,brokerDiscount:brokerDiscountAmount(),mintPaidRound:Number.isInteger(s.mintPaidRound)?s.mintPaidRound+1:null,diodeInHalf:Number.isInteger(s.diodeInHalf)?s.diodeInHalf:null,hinge:deepClone(s.hingeState),mutationUseRound:deepClone(s.mutationUseRound||{}),scrapUsedMarket:Number.isInteger(s.scrapUsedMarket)?s.scrapUsedMarket:null},
      zeroStats:{...s.roundZero},hand:s.hand.filter(Boolean).map(cloneTile),reserve:s.reserve.map(cloneTile),
      board:s.pieces.map(p=>({id:p.id,tileId:p.tile.id,a:p.tile.a,b:p.tile.b,upgrade:p.tile.upgrade||0,source:p.tile.source||'base',generation:p.tile.generation||1,powerMultiplier:p.tile.powerMultiplier||1,modifiers:tileModIdsForTile(p.tile.id),x:p.cubes[0].x,y:p.cubes[0].y,z:0,rr:p.rr})),
      turns:s.events.map(e=>deepClone(e))
    }
  }

  function debugText(){
    const x=snapshot(),coverage=coreCoverageTelemetry(),up=x.set.filter(t=>t.upgrade).map(t=>`[${t.a}|${t.b}]★${t.upgrade}`).join(', ')||'-';
    const activeIssue=s.needsReroll?'no-legal-moves':x.failureReason;
    const lines=[`MONOID DEBUG v${x.gameVersion}`,`Mode: ${(x.gameMode||'classic').toUpperCase()}`,`Run ID: ${x.runId}`,`Seed: ${x.seed}`,`Result: ${x.status}${activeIssue?` · ${activeIssue}`:''}`,`Stage: ${x.stage.index}/${x.endless.active?'∞':x.stage.total} · round ${x.stage.round}/${x.stage.size}`,`Round: ${x.round.index}/${x.endless.active?'∞':x.round.total} · target=${x.round.targetExact??x.round.target} · moves=${x.round.placements}/${x.round.maxPlacements}`,`Board: ${x.boardSize.width}x${x.boardSize.height} · Machine: ${x.board.length} pieces · unique=${new Set(x.placedTileIds).size}/${x.placedTileIds.length}`,`Set: ${x.setSize} tiles · available=${x.availableTileCount} · generation=${x.powerSets.generation} · power=x${x.powerSets.powerMultiplier}`,`Last output: ${x.score.lastExact??x.score.last}`,`Best output: ${x.score.bestExact??x.score.best}`,`Coins: ${x.coins} · Inflation: ${x.inflation} · Tools: move=${x.consumables.move}, reroll=${x.consumables.reroll}, freeReroll=${x.freeReroll}, undo=${x.consumables.undo}`,`Anchor: ${s.anchorId||'-'} · Upgraded tiles: ${up}`,`Tile Mods: DD=${x.doubleDoubleTileId||'-'} · DE=${x.doubleEchoTileId||'-'} · TD=${x.tripleDoubleTileId||'-'} · ZP=${x.zeroPortTileIds.length?x.zeroPortTileIds.join('<->'):'-'} · PX=${x.parityExchangeTileId||'-'} · CR=${x.cornerTileId||'-'} · LN=${x.longLineTileId||'-'} · OV=${x.overloadTileId||'-'} · TE=${x.terminalTileId||'-'} · DI=${x.diodeTileId||'-'}${Number.isInteger(x.diodeInHalf)?`:IN${x.diodeInHalf}`:''} · RT=${x.returnTileId||'-'} · RC=${x.recallTileId||'-'} · PR=${x.pairTileId||'-'} · BR=${x.bridgeTileId||'-'} · PV=${x.pivotTileId||'-'} · SC=${x.scrapTileId||'-'} · BO=${x.brokerTileId||'-'} · SW=${x.swapTileId||'-'} · SP=${x.spendTileId||'-'} · MG=${x.mergeTileId||'-'} · HG=${x.hingeTileId||'-'} · BK=${x.bankTileId||'-'} · TL=${x.tollTileId||'-'} · FD=${x.foundationTileId||'-'} · KN=${x.knotTileId||'-'} · MR=${x.mirrorTileId||'-'} · MT=${x.mintTileId||'-'}`,`Machine Mods: ${x.longRun?'LONG CHAIN':'-'}`,`Endless: ${x.endless.active?`active · phase=${x.endless.phase} · baseComplete=${x.endless.baseComplete?'yes':'no'} · clears=${x.endless.roundsCleared} · endlessStages=${x.endless.endlessStagesCompleted} · hand=${x.endless.handSize}`:x.endless.baseComplete?'available · baseComplete=yes':'off'}`,`Next: ${x.shop.nextType} · open=${x.shop.open?'yes':'no'}${x.shop.open?` (${x.shop.type})`:''}`,`Round clears: ${x.round.clears.map(w=>`R${w.round} target=${w.targetExact??w.target} output=${w.outputExact??w.output} moves=${w.placements} machine=${w.machineSize} set=${w.setSize} gen=${w.setGeneration||1} reward=${w.reward} upgradeCoins=${w.upgradeCoins||0} anchor=[${w.anchor.a}|${w.anchor.b}]★${w.upgradeTier}`).join(' | ')||'-'}`,''];
    lines.splice(11,0,`System Strain: ${s.systemStrain||0} · Long Chain Endless: ${s.endlessLongRunActivations||0}/${cfg.ENDLESS_LONG_RUN_ACTIVATIONS??7}`);
    lines.splice(13,0,`Mod State: Markets=${s.marketCount||0} · DIODE in=${Number.isInteger(s.diodeInHalf)?s.diodeInHalf:'-'} · HINGE=${s.hingeState?`${s.hingeState.active===1?'B':'A'} pivot=${s.hingeState.pivotTileId}`:'-'} · TOLL=${s.tollTileId?(s.tollArmed?'armed':'disarmed'):'-'} · BROKER=${s.brokerDiscountReady?`ready -${brokerDiscountAmount()}c`:'-'} · FOUNDATION=${foundationAgeForTile(s.foundationTileId)}/${Math.max(1,Number(cfg.FOUNDATION_MARKETS)||3)} · MUTATION round=${JSON.stringify(s.mutationUseRound||{})} scrapMarket=${Number.isInteger(s.scrapUsedMarket)?s.scrapUsedMarket:'-'} · MINT paidRound=${Number.isInteger(s.mintPaidRound)?s.mintPaidRound+1:'-'}`);
    if(x.modeGeometry?.items?.length)lines.push(`Mode geometry: ${x.modeGeometry.items.map(item=>`${item.kind}:${item.half||'-'}:${item.pip??'-'}@${item.x},${item.y}${x.modeGeometry.visibleIds.includes(item.id)?' visible':' hidden'}`).join(' | ')}`);
    const tileText=t=>`[${t.a}|${t.b}]${t.powerMultiplier>1?`×${t.powerMultiplier}`:''} id=${t.id}`;
    const hand=handPlacementDiagnostics();
    lines.push(`Current hand: ${hand.map(h=>`#${h.index+1} ${tileText(h.tile)} legal=${h.legalPlacements}`).join(' | ')||'-'}`);
    lines.push(`Recovery: recoverable=${x.recovery.recoverable?'yes':'no'} · undo=${x.recovery.undo?'yes':'no'} · ownedReroll=${x.recovery.ownedReroll?'yes':'no'} · buyReroll=${x.recovery.toolReroll?`yes@${x.recovery.prices.reroll}c`:'no'} · ownedMove=${x.recovery.ownedMove?'yes':'no'} · buyMove=${x.recovery.toolMove?`yes@${x.recovery.prices.move}c`:'no'}`);
    lines.push(`Circuits: ${Object.entries(x.circuits.ranks).map(([id,rank])=>`${id}:C${rank}`).join(',')||'-'} · slots=${Object.keys(x.circuits.ranks).length}/${x.circuits.tileLimit} · discovered=${x.circuits.signatures.length} · pending=${x.circuits.pending?.signature||'-'}`);
    if(coreGameMode(x.cores.mode)){const label=x.cores.mode==='frames'?'THE FRAMES':x.cores.mode==='river'?'THE RIVER':'THE EYES';lines.push(`Cores: ${label} · physical · ${x.cores.items.map(core=>`${core.id}:${String(core.archetype||'-').toUpperCase()} ${coreLevelRoman(core.level)} ports=${(core.ports||[]).join('')||'-'} @${core.x},${core.y}`).join(' | ')} · connected=${x.cores.telemetry.connectedCoreCount}/${x.cores.telemetry.coreCount} · progress=${x.cores.progressMilestones.join(',')||'-'} · overlaps=${x.cores.telemetry.overlapTileIds.join(',')||'-'} · coverage=max:${coverage.maxDistance??'-'},p50:${coverage.p50Distance??'-'},beyondStart:${coverage.beyondStartCount},unreachable:${coverage.unreachableCount}`)}
    if(x.signal.enabled)lines.push(`Signal: start=${x.signal.base} · core=+${x.signal.coreCharge} · bought=+${x.signal.purchasedSignal||0} · markets=${x.signal.markets||0} · marketBonus=+${x.signal.marketBonus||0}${x.signal.last?` · added=+${x.signal.last.coreSignalAdded||0} · charged=${x.signal.last.chargedVisits} · remaining=${x.signal.last.remaining} · min=${x.signal.last.minRemaining} · lead=${x.signal.last.leadCoreId||'-'}:${String(x.signal.last.leadCoreArchetype||'-').toUpperCase()} · cores=${x.signal.last.activatedCoreIds?.join('>')||'-'} · fx=R${x.signal.last.effects?.relayCount||0}/D${x.signal.last.effects?.distributorSplitCount||0}/C${x.signal.last.effects?.conductorFreeVisits||0}${x.signal.last.effects?.reservoirLead?'/V1':''} · stopped=${x.signal.last.stopped?'yes':'no'}${x.signal.last.firstStop?` at=${x.signal.last.firstStop.pieceId}`:''}`:' · no moves yet'}`);
    for(const v of x.turns){
      if(v.type==='signal-resolution'){const trace=Array.isArray(v.events)?JSON.stringify(v.events):v.traceCompacted?'COMPACTED_AFTER_RESTORE':'-';lines.push(`T${v.move} SIGNAL TREE splits=${v.splitCount} base=${v.baseOutputExact??v.baseOutput} selection=${v.selectionOutputExact??v.selectionOutput??v.baseOutputExact??v.baseOutput} trace=${trace}`);continue}
      if(v.type==='power-set'){lines.push(`R${v.round} POWER SET ${v.generation} UNLOCKED size=${v.size} power=x${v.powerMultiplier} source=${v.source}`);continue}
      if(v.type==='power-set-hand-refill'){lines.push(`R${v.round} POWER SET ${v.generation} HAND REFILL +${v.filled} hand=${v.hand?.map(tileText).join(',')||'-'}`);continue}
      if(v.type==='ouroboros-start'){lines.push(`R${v.round} OUROBOROS START generation=${v.generation} machine=${v.machineSize} source=${v.source}`);continue}
      if(v.type==='ouroboros-rebuild'){lines.push(`R${v.round}.${v.roundTurn} OUROBOROS REBUILD tile=${v.tileId} ${v.from.x},${v.from.y},r${v.from.rr} > ${v.to.x},${v.to.y},r${v.to.rr}${v.topologyLosses?.length?` lost=${v.topologyLosses.map(x=>x.label||x.mod).join(',')}`:''}`);continue}
      if(v.type==='ouroboros-fire'){lines.push(`R${v.round}.${v.roundTurn} OUROBOROS FIRE tile=${v.tileId} trigger=${v.trigger}`);continue}
      if(v.type==='round-reroll'){lines.push(`R${v.round} FREE REROLL +${v.granted}${v.replaced?` refresh=${v.replaced}>${v.granted}`:''}`);continue}
      if(v.type==='circuit-check'){lines.push(`R${v.round} CIRCUIT NONE move=${v.move}`);continue}
      if(v.type==='circuit-closed'){lines.push(`R${v.round} CIRCUIT CLOSED size=${v.size} reward=+${v.reward} limit=${v.circuitTileLimit||cfg.CIRCUIT_TILE_LIMIT} signature=${v.signature} eligible=${v.eligibleTileIds.join(',')||'-'} unavailable=${v.unavailable||'no'}`);continue}
      if(v.type==='circuit-upgrade'){lines.push(`R${v.round} CIRCUIT UPGRADE [${v.tile?.a}|${v.tile?.b}] id=${v.tileId} rank=${v.before}>${v.after} signature=${v.signature}`);continue}
      if(v.type==='circuit-resonance'){lines.push(`T${v.move} CIRCUIT(active=${v.active.map(t=>`${t.tileId}:C${t.rank}`).join(',')||'-'} resonance=+${v.bonus*100}% x${v.multiplier} base=${v.baseOutputExact??v.baseOutput} final=${v.outputExact??v.output} safeInteger=${v.safeInteger})`);continue}
      if(v.type==='reroll'){lines.push(`R${v.round} REROLL source=${v.source||'stored'}${v.automatic?' AUTO':''} after move ${v.roundTurn} stored=${v.remaining} free=${v.freeRemaining??0} hand=${v.hand?.map(tileText).join(',')||'-'}`);continue}
      if(v.type==='opening-protection'){lines.push(`R1 OPENING PROTECTION ${v.source} -> [${v.tile.a}|${v.tile.b}]${v.replaced?` swapped=[${v.replaced.a}|${v.replaced.b}]`:''}`);continue}
      if(v.type==='consume'){lines.push(`R${v.round} USE ${v.item.toUpperCase()} after move ${v.roundTurn} remaining=${v.remaining}${v.maxPlacements?` maxMoves=${v.maxPlacements}`:''}`);continue}
      if(v.type==='undo'){lines.push(`R${v.round} UNDO after move ${v.roundTurn} remaining=${v.remaining}${v.undone?` reverted=T${v.undone.turn} [${v.undone.tile.a}|${v.undone.tile.b}] output=${v.undone.outputExact??v.undone.output}`:''}${v.preservedPurchases?` preservedShop=${v.preservedPurchases} spend=${v.preservedSpend}`:''}${v.coinShortfall?` fundingShortfall=${v.coinShortfall}`:''}`);continue}
      if(v.type==='topology-mod-lost'){lines.push(`R${v.round} T${v.move} TOPOLOGY LOST ${v.label||String(v.mod||'').toUpperCase()} tile=${v.tileId} cause=${v.causeTileId||'-'}`);continue}
      if(v.type==='mutation-use'){lines.push(`R${v.round}.${v.roundTurn} MUTATION ${String(v.mod||'').toUpperCase()} tile=${v.tileId} target=${v.targetTileId||'-'} option=${v.option||'-'}${v.delivery?` delivery=${v.delivery.location}`:''}${v.destroyed?.tile?` destroyed=[${v.destroyed.tile.a}|${v.destroyed.tile.b}] id=${v.destroyed.tile.id}`:''}${v.topologyLosses?.length?` lost=${v.topologyLosses.map(x=>x.label||x.mod).join(',')}`:''}`);continue}
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
      if(v.type==='run-complete'){lines.push(`RUN COMPLETE R${v.round} target=${v.targetExact??v.target} output=${v.outputExact??v.output} coins=${v.coins} inflation=${v.inflation}`);continue}
      if(v.type==='endless-start'){lines.push(`ENDLESS START R${v.nextRound} target=${v.targetExact??v.target}`);continue}
      if(v.type==='opening-double'){lines.push(`R1 OPENING DOUBLE [${v.tile.a}|${v.tile.b}]`);continue}
      if(v.type==='board-expand'){lines.push(`STAGE ${v.stage} BOARD ${v.from.join('x')} > ${v.to.join('x')} offset=${v.offset.join(',')}`);continue}
      if(v.type==='core-discover'){lines.push(`STAGE ${v.stage} CORE DISCOVER ${String(v.core?.archetype||'core').toUpperCase()} I id=${v.core?.id||'-'} ports=${(v.core?.ports||[]).join('')||'-'} @${v.core?.x},${v.core?.y} lattice=${v.lattice?`${v.lattice.x},${v.lattice.y}`:'-'} recharge=${v.recharge} reason=${v.reason||'-'}`);continue}
      if(v.type==='core-upgrade'){lines.push(`STAGE ${v.stage} CORE UPGRADE ${String(v.archetype||'core').toUpperCase()} id=${v.coreId} ${coreLevelRoman(v.before)}>${coreLevelRoman(v.after)} recharge=${v.recharge} reason=${v.reason||'-'}`);continue}
      if(v.type==='core-progress-blocked'){lines.push(`STAGE ${v.stage} CORE PROGRESS BLOCKED action=${v.action||'-'} slot=${v.slot||'-'} reason=${v.reason||'-'}`);continue}
      if(v.type==='core-archetype-migrate'){lines.push(`CORE LEGACY ARCHETYPE MIGRATE ${(v.cores||[]).map(core=>`${core.coreId}:${String(core.from||'-').toUpperCase()}>${String(core.to||'-').toUpperCase()}`).join(',')||'-'} reason=${v.reason||'-'}`);continue}
      if(v.type==='core-port-migrate'){lines.push(`CORE LEGACY PORT MIGRATE ${(v.cores||[]).map(core=>`${core.coreId}:${(core.from||[]).join('')}>${(core.to||[]).join('')}`).join(',')||'-'} reason=${v.reason||'-'}`);continue}
      if(v.type==='stage-start'){lines.push(`STAGE ${v.stage} START R${v.round} coins=${v.coins} inflation=${v.inflation} available=${v.available} board=${v.board.join('x')} freeReroll=${v.freeReroll||0} generation=${v.setGeneration||1}`);continue}
      if(v.type==='shop-scheduled'){lines.push(`R${v.round} NEXT ${v.shop.toUpperCase()}`);continue}
      if(v.type==='shop-open'){lines.push(`R${v.round} ${v.shop.toUpperCase()} OPEN coins=${v.coins} inflation=${v.inflation} available=${v.available}${v.offers?.length?` offers=${v.offers.join(',')}`:''}`);continue}
      if(v.type==='shop-buy'){lines.push(`R${v.round} SHOP BUY ${v.item} intent=${v.intent||'store'} -${v.cost} coins=${v.coins} inflation=${v.inflationBefore}>${v.inflationAfter}`);continue}
      if(v.type==='tile-buy'){lines.push(`R${v.round} ${v.shop.toUpperCase()} ${v.mode.toUpperCase()} [${v.tile.a}|${v.tile.b}]${v.tile.powerMultiplier>1?`×${v.tile.powerMultiplier}`:''} id=${v.tile.id} delivery=${v.delivery||'-'} -${v.cost} coins=${v.coins} inflation=${v.inflationBefore}>${v.inflationAfter}`);continue}
      if(v.type==='double-double'){lines.push(`R${v.round} MARKET DOUBLE DOUBLE [${v.tile.a}|${v.tile.b}] id=${v.tile.id} -${v.cost} coins=${v.coins} inflation=${v.inflationBefore}>${v.inflationAfter}${v.previousTileId?` previous=${v.previousTileId}`:''}`);continue}
      if(v.type==='market-signal-buy'){lines.push(`R${v.round} MARKET SIGNAL +${v.amount||1} ${v.beforeSignal}>${v.afterSignal} -${v.cost} coins=${v.coins} inflation=${v.inflationBefore}>${v.inflationAfter}${v.brokerDiscount?` broker=-${v.brokerDiscount}c`:''}`);continue}
      if(v.type==='market-mod-buy'){lines.push(`R${v.round} MARKET MOD ${(v.mod||'').toUpperCase()} PURCHASE -${v.cost} coins=${v.coins} inflation=${v.inflationBefore}>${v.inflationAfter}${v.brokerDiscount?` broker=-${v.brokerDiscount}c`:''}${v.pending?' target=PENDING':' machine=INSTALLED'}${v.previousTileId?` previous=${v.previousTileId}`:''}`);continue}
      if(v.type==='market-mod-relocate-source'){lines.push(`R${v.round} MARKET MOD ${(v.mod||'').toUpperCase()} RELOCATE source=${v.sourceTileId} targets=${(v.eligibleTileIds||[]).join(',')||'-'}`);continue}
      if(v.type==='market-mod-assign'){lines.push(`R${v.round} MARKET MOD ${(v.mod||'').toUpperCase()} ASSIGN [${v.tile?.a}|${v.tile?.b}] id=${v.targetTileId}${v.previousTileId?` previous=${v.previousTileId}`:''}${v.zeroPortTileIds?` pair=${v.zeroPortTileIds.join('<->')}`:''}`);continue}
      if(v.type==='shop-close'){lines.push(`R${v.round} ${v.shop.toUpperCase()} CLOSE ${v.reason} coins=${v.coins} inflation=${v.inflation} available=${v.available}`);continue}
      if(v.type==='recovery-needed'){lines.push(`R${v.round} NO LEGAL MOVES after move ${v.roundTurn} hand=${v.hand?.map(tileText).join(',')||'-'}`);continue}
      if(v.type==='failure'){lines.push(`R${v.round} FAIL ${v.reason} after move ${v.roundTurn} hand=${v.hand?.map(tileText).join(',')||'-'}`);continue}
      if(Number.isInteger(v.turn))lines.push(`T${v.turn} R${v.round}.${v.roundTurn} [${v.tile.a}|${v.tile.b}]${v.tile.powerMultiplier>1?`×${v.tile.powerMultiplier}`:''}${v.tile.upgrade?`★${v.tile.upgrade}`:''} ${v.dir} @${v.placement.x},${v.placement.y},r${v.placement.rr} trigger=${v.trigger} output=${v.outputExact??v.output} selection=${v.selectionOutputExact??v.selectionOutput??v.outputExact??v.output}${v.upgradeCoins?` coins=+${v.upgradeCoins}`:''}${v.mintCoins?` mint=+${v.mintCoins}c`:''}${v.tollCoins?` toll=-${v.tollCoins}c`:''}${v.brokerPrepared?' broker=READY':''} rebounds=${v.rebounds} start=${v.start}${v.flipped?' FLIPPED':''} reason=${v.reason} ops=${v.ops||'-'} routes=${v.routes||'-'} search=${v.search}${v.longRunActivated?` LR(unique=${v.uniquePieces},stars=+${v.starCoins})`:''}${v.zeroPorts?.length?` ZP(${v.zeroPorts.map(z=>`${z.fromTileId}>${z.toTileId}`).join(',')})`:''}${v.echo?` ECHO(main=${v.echo.mainOutput},echo=${v.echo.echoOutput},final=${v.echo.finalOutput})`:''}${v.clear?' CLEAR':''}`)
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
    s=deepClone(raw);const savedScoreExact=s.scoreExact!=null&&Number(s.scoreExact)===Number(s.score)?s.scoreExact:null,savedBestExact=s.bestExact!=null&&Number(s.bestExact)===Number(s.best)?s.bestExact:null;s.scoreExact=SCORE.exact(s.score||0,savedScoreExact);s.score=SCORE.approx(s.scoreExact);s.bestExact=SCORE.exact(s.best||0,savedBestExact);s.best=SCORE.approx(s.bestExact);const restoredMode=s.gameMode;s.ouroborosMode=!!s.ouroborosMode;if(!Number.isInteger(s.ouroborosStartedRound))s.ouroborosStartedRound=null;if(!Array.isArray(s.ouroborosBoardSize)||s.ouroborosBoardSize.length<2||!(Number(s.ouroborosBoardSize[0])>0)||!(Number(s.ouroborosBoardSize[1])>0))s.ouroborosBoardSize=null;s.gameMode=canonicalGameMode(restoredMode||cfg.GAME_MODE);if(!Array.isArray(s.cores))s.cores=[];if(!Array.isArray(s.voids))s.voids=[];if(!Array.isArray(s.coreProgressMilestones))s.coreProgressMilestones=[];if(s.gameMode==='classic'){s.cores=[];s.voids=[];s.coreProgressMilestones=[]}else if(s.gameMode==='eyes')s.voids=[];if(restoredMode==='prototype'||restoredMode==='infinite-endless'){delete s.scoringModel;delete s.scoringFormula}if(!Array.isArray(s.shopTileOffers))s.shopTileOffers=[];if(!Number.isInteger(s.shopTileOfferGeneration))s.shopTileOfferGeneration=null;if(!Array.isArray(s.marketBuys))s.marketBuys=[];if(!Array.isArray(s.zeroPortTileIds))s.zeroPortTileIds=[];s.pendingModPlacement=s.pendingModPlacement||null;for(const field of Object.values(TILE_MOD_FIELDS))if(!(field in s))s[field]=null;if(!Number.isInteger(s.diodeInHalf))s.diodeInHalf=null;if(!s.hingeState||s.hingeState.tileId!==s.hingeTileId)s.hingeState=null;if(!Number.isInteger(s.marketCount))s.marketCount=(s.events||[]).filter(e=>e.type==='shop-open'&&e.shop==='market').length;if(!Number.isInteger(s.signalUpgrades))s.signalUpgrades=0;if(!Number.isInteger(s.foundationAssignedMarket))s.foundationAssignedMarket=null;
    const legacyEconomyMods={frame:'broker',frontier:'spend',resonator:'bank',forge:'toll'},legacyFields={frameTileId:'brokerTileId',frontierTileId:'spendTileId',resonatorTileId:'bankTileId',forgeTileId:'tollTileId'};
    for(const [oldField,newField] of Object.entries(legacyFields))if(!s[newField]&&s[oldField])s[newField]=s[oldField];
    if(s.pendingModPlacement?.mod&&legacyEconomyMods[s.pendingModPlacement.mod])s.pendingModPlacement.mod=legacyEconomyMods[s.pendingModPlacement.mod];
    const legacyMutationMods={twin:'recall',gate:'pivot',fan:'scrap',crown:'swap'},legacyMutationFields={twinTileId:'recallTileId',gateTileId:'pivotTileId',fanTileId:'scrapTileId',crownTileId:'swapTileId'};
    for(const [oldField,newField] of Object.entries(legacyMutationFields))if(!s[newField]&&s[oldField])s[newField]=s[oldField];
    if(s.pendingModPlacement?.mod&&legacyMutationMods[s.pendingModPlacement.mod])s.pendingModPlacement.mod=legacyMutationMods[s.pendingModPlacement.mod];
    if(!s.mutationUseRound||typeof s.mutationUseRound!=='object')s.mutationUseRound={mirror:null,pivot:null,recall:null,swap:null};
    for(const id of ROUND_MUTATION_IDS)if(!Number.isInteger(s.mutationUseRound[id]))s.mutationUseRound[id]=null;
    if(!Number.isInteger(s.scrapUsedMarket))s.scrapUsedMarket=null;
    if(!Number.isInteger(s.foundationLastPayoutMarket))s.foundationLastPayoutMarket=Number.isInteger(s.foundationAssignedMarket)?s.foundationAssignedMarket:null;
    s.tollArmed=typeof s.tollArmed==='boolean'?s.tollArmed:false;s.brokerDiscountReady=!!s.brokerDiscountReady;
    if(!Number.isInteger(s.mintPaidRound))s.mintPaidRound=null;
    for(const field of ['zeroMemoryTileId','sequenceTileId','complementTileId','relayTileId','couplerTileId','frameTileId','frontierTileId','resonatorTileId','forgeTileId','twinTileId','gateTileId','fanTileId','crownTileId'])delete s[field];
    if(['sequence','complement','relay','coupler'].includes(s.pendingModPlacement?.mod)){s.pendingModPlacement=null;s.intermissionResolved=true;s.nextShopType='none'}ensureShopTileOffers();
    const desiredHandSize=handSizeForRound();if(Array.isArray(s.hand)&&s.hand.length>desiredHandSize){const overflow=s.hand.slice(desiredHandSize).filter(Boolean);s.hand=s.hand.slice(0,desiredHandSize);if(!Array.isArray(s.reserve))s.reserve=[];s.reserve.push(...overflow)}
    if(s.ouroborosMode&&!s.ouroborosBoardSize){const legacyBoard=progressionBoardSizeForStage(Math.floor((s.round||0)/stageSize()));s.ouroborosBoardSize=[legacyBoard[0],legacyBoard[1]]}
    const size=boardSizeForStage(Math.floor((s.round||0)/stageSize()));E.setBoardSize(size[0],size[1]);
    s.pieces=raw.pieces.map(x=>{const p=E.pieceFrom(x.tile,x.x,x.y,0,x.rr,x.id);p.tile=cloneTile(x.tile);return p});if(coreGameMode(s.gameMode)&&!s.cores.length)s.cores=coreLayoutForMode(s.gameMode,s.seed);if(['frames','river'].includes(s.gameMode)&&!s.voids.length)s.voids=voidLayoutForMode(s.gameMode,s.seed);normalizeLegacyCoreArchetypes('restore');normalizeLegacyCorePorts('restore');const coreRelocations=relocateLegacyCoreOverlaps();if(coreRelocations.length)s.events.push({type:'core-relocate',reason:'legacy-overlap',cores:deepClone(coreRelocations)});syncCoreProgressToStage(stageIndex()+1,'restore');pruneInactiveTopologyMods({record:false});
    if(!s.ouroborosMode&&(s.setGeneration||1)>=maxSetGeneration()&&availableTileCount()===0&&!s.hand.some(Boolean)&&!s.reserve.length)activateOuroboros('restore');
    return true
  }
  fresh(opts.seed);
  return{state:()=>s,config:cfg,moveResonance,chooseCircuitTile,circuitTileLimit,target,targetExact,targetForRound,targetExactForRound,stageIndex,boardSizeForStage,infinitePhase,infinitePhaseStartRound,ouroborosPhase,handSizeForRound,endlessStagesCompleted,candidatesForIndex,legalHandMask,handPlacementDiagnostics,topologyTelemetry,deckTelemetry,signalTelemetry,signalShadowTelemetry,coreShadowTelemetry,coreCoverageTelemetry,previewPlacement,topologyBreaksForPlacement,decisionTelemetry,canInteract,setTollArmed,mutationOptions,applyMutation,ouroborosPlacementPreview,moveOuroborosTile,rotateOuroborosTile,previewOuroborosFire,beginOuroborosFire,beginPlacement,finishPlacement,reroll,canUseReroll,useMove,canUseMove,useUndo,canUndo,canUsePurchasedTool,recoveryOptions,advance,startEndless,canStartEndless,rotateRoot,setRootRotation,fresh,snapshot,debugText,save,exportState,restoreState,hasLegal,assessContinuation,maxPlacements,clearReward,clearRewardBreakdown,availableTileCount,toolPrice,toolPurchaseQuote,canBuyTool,buyTool,shopItemPrice,shopRandomPrice,shopTileOfferPrice,shopPurchaseAvailability,marketDoubleDoublePrice,marketModPrice,marketSignalPrice,marketSignalUpgradeInfo,marketOfferAffordability,marketTargetCount,marketOfferInfo,canOpenShop,openShop,closeShop,buyShopItem,buyShopRandomTile,buyShopTileOffer,openIntermission,buyMarketSignal,buyMarketMod,chooseMarketModTile,chooseMarketModHalf,buyDoubleDouble,closeMarket,resolveIntermission}
}
return{createGame}
});
