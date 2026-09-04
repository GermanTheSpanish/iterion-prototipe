(function(root,factory){
  const api=factory(root.IterionData,root.IterionMods);
  if(typeof module==='object'&&module.exports) module.exports=factory(require('./data.js'),require('./mods.js'));
  root.IterionGame=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(D,M){
function createGame(E,opts={}){
  if(!E)throw new Error('IterionEngine required');
  const cfg=Object.assign({},D,opts);let s={};

  function rnd(){s.rngState=(s.rngState+0x6D2B79F5)|0;let t=s.rngState;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}
  function sh(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
  function makePersistentSet(){let a=[];for(let i=0;i<=6;i++)for(let j=i;j<=6;j++)a.push({id:`d${i}-${j}`,a:i,b:j,upgrade:0,source:'base'});return a}
  const cloneTile=t=>t?{id:t.id,a:t.a,b:t.b,upgrade:t.upgrade||0,source:t.source||'base'}:null;
  const isZero=t=>!!t&&(t.a===0||t.b===0),countZero=a=>a.filter(isZero).length,isDouble=t=>!!t&&t.a===t.b;
  const pairList=()=>{const out=[];for(let a=0;a<=6;a++)for(let b=a;b<=6;b++)out.push([a,b]);return out};

  function drawOne(){if(!s.reserve.length)return null;const t=s.reserve.shift();if(isZero(t))s.roundZero.drawn++;return t}
  function initialHand(){
    s.hand=Array(cfg.HAND_SIZE).fill(null);
    if(cfg.FIRST_TILE_MUST_BE_DOUBLE&&s.turn===0&&!s.pieces.length){
      const di=s.reserve.findIndex(isDouble);
      if(di>=0){const t=s.reserve.splice(di,1)[0];s.hand[0]=t;if(isZero(t))s.roundZero.drawn++;s.events.push({type:'opening-double',round:1,tile:cloneTile(t)})}
    }
    for(let i=0;i<cfg.HAND_SIZE;i++)if(!s.hand[i])s.hand[i]=drawOne();
  }

  function target(){return cfg.TARGETS[s.round]}
  function stageIndex(){return Math.floor(s.round/(cfg.STAGE_SIZE||5))}
  function boardSizeForStage(stage=stageIndex()){const sizes=cfg.BOARD_SIZES||[[18,24]];return sizes[Math.min(stage,sizes.length-1)]||sizes[sizes.length-1]}
  function maxPlacements(){return cfg.MAX_PLACEMENTS+(s.mods.includes('long-machine')?1:0)+s.extraPlacements}
  function clearReward(){let reward=s.roundTurn<=3?4:3;if(s.mods.includes('coin-engine'))reward+=cfg.COIN_ENGINE_BONUS||1;return reward}
  function availableTileCount(){return s.set.length-(s.placedTileIds?.length||0)}
  function hasLegal(){if(!s.pieces.length){if(cfg.FIRST_TILE_MUST_BE_DOUBLE&&s.turn===0)return s.hand.some(isDouble);return s.hand.some(Boolean)}return E.hasLegalMove(s.hand.filter(Boolean),s.pieces,[0])}
  function fail(reason){s.blocked=true;s.needsReroll=false;s.failureReason=reason;s.roundZero.endHand=countZero(s.hand.filter(Boolean));s.events.push({type:'failure',round:s.round+1,roundTurn:s.roundTurn,reason})}
  function assessContinuation(){
    s.needsReroll=false;if(s.cleared)return;
    if(s.roundTurn>=maxPlacements()){fail('placement-limit');return}
    if(!s.hand.some(Boolean)&&!s.reserve.length){fail('no-tiles');return}
    if(hasLegal()){s.blocked=false;s.failureReason=null;return}
    if(s.rerollsLeft>0){s.blocked=false;s.needsReroll=true;return}
    fail('no-legal-moves')
  }

  function rebuildPiece(old,dx,dy){
    const tile={id:old.tile.id,a:old.tile.a,b:old.tile.b,upgrade:old.tile.upgrade||0,source:old.tile.source||'base'};
    const p=E.pieceFrom(tile,old.cubes[0].x+dx,old.cubes[0].y+dy,0,old.rr,old.id);
    p.tile=tile;return p
  }
  function ensureBoardForStage(){
    const [newG,newH]=boardSizeForStage(),old=E.getBoardSize?E.getBoardSize():{G:E.G,H:E.H};
    if(old.G===newG&&old.H===newH){s.boardStage=stageIndex();return}
    const dx=Math.floor((newG-old.G)/2),dy=Math.floor((newH-old.H)/2);
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
    s.score=0;s.roundTurn=0;s.rootRR=0;s.roundZero={drawn:0,placed:0,endHand:0};
    s.extraPlacements=s.pendingExtraPlacements||0;s.pendingExtraPlacements=0;
    s.rerollsLeft=1+(s.pendingExtraRerolls||0);s.pendingExtraRerolls=0;
    s.cleared=false;s.blocked=false;s.needsReroll=false;s.failureReason=null;
    s.nextShopType='none';s.intermissionResolved=true;s.shopOpen=false;s.shopType=null;s.shopOffers=[];s.bigShopRandomStock=0;s.bigShopBuys=[];
    initialHand();
    if(s.pieces.length||!s.hand.some(Boolean))assessContinuation()
  }

  function fresh(seedOverride){
    const seed=(seedOverride==null?(typeof crypto!=='undefined'&&crypto.getRandomValues?crypto.getRandomValues(new Uint32Array(1))[0]:Math.floor(Math.random()*4294967296)):seedOverride)>>>0;
    s={set:makePersistentSet(),reserve:[],hand:[],pieces:[],placedTileIds:[],score:0,best:0,round:0,roundTurn:0,turn:0,wins:[],events:[],idc:0,running:false,cleared:false,blocked:false,needsReroll:false,failureReason:null,rootRR:0,seed,rngState:seed|0,runId:`${Date.now().toString(36)}-${seed.toString(36)}`,startedAt:new Date().toISOString(),roundZero:{drawn:0,placed:0,endHand:0},coins:cfg.STARTING_COINS,mods:[],extraPlacements:0,pendingExtraPlacements:0,rerollsLeft:1,pendingExtraRerolls:0,anchorId:null,nextShopType:'none',intermissionResolved:true,shopOpen:false,shopType:null,shopOffers:[],bigShopRandomStock:0,bigShopBuys:[],tileSerial:0,boardStage:0};
    startRound(true);return s
  }

  function setRootRotation(rr){if(s.pieces.length||s.running)return false;s.rootRR=((rr%4)+4)%4;return true}
  function rotateRoot(){return setRootRotation(s.rootRR+1)}
  function rootPlacements(tile){let out=[];for(let y=0;y<=E.H-E.S;y++)for(let x=0;x<=E.G-E.S;x++){let p=E.pieceFrom(tile,x,y,0,s.rootRR,-1);if(p.rect.minx>=0&&p.rect.miny>=0&&p.rect.maxx<=E.G&&p.rect.maxy<=E.H)out.push({x,y,z:0,rr:s.rootRR})}return out}
  function candidatesForIndex(i){const tile=s.hand[i];if(!tile)return[];if(!s.pieces.length&&cfg.FIRST_TILE_MUST_BE_DOUBLE&&s.turn===0&&!isDouble(tile))return[];return s.pieces.length?E.allPlacements(tile,0,s.pieces):rootPlacements(tile)}
  function legalHandMask(){return s.hand.map(t=>{if(!t)return false;if(!s.pieces.length)return !(cfg.FIRST_TILE_MUST_BE_DOUBLE&&s.turn===0&&!isDouble(t));return E.hasAnyPlacement?E.hasAnyPlacement(t,0,s.pieces):E.allPlacements(t,0,s.pieces).length>0})}
  function canInteract(){return !s.running&&!s.cleared&&!s.blocked&&!s.needsReroll&&!s.shopOpen}

  function beginPlacement(i,c){
    if(!canInteract()||i<0||i>=s.hand.length||!s.hand[i])return{ok:false,reason:'state'};
    const tile=s.hand[i];
    if(s.placedTileIds.includes(tile.id))return{ok:false,reason:'tile-already-in-machine'};
    if(!s.pieces.length&&cfg.FIRST_TILE_MUST_BE_DOUBLE&&s.turn===0&&!isDouble(tile))return{ok:false,reason:'first-double'};
    if(s.pieces.length){const v=E.validatePlacement(tile,c.x,c.y,0,c.rr,s.pieces);if(!v.ok)return{ok:false,reason:v.reason||'invalid'}}
    else{const p0=E.pieceFrom(tile,c.x,c.y,0,c.rr,-1);if(p0.rect.minx<0||p0.rect.miny<0||p0.rect.maxx>E.G||p0.rect.maxy>E.H)return{ok:false,reason:'bounds'}}
    s.running=true;
    const p=E.pieceFrom(tile,c.x,c.y,0,c.rr,++s.idc);p.tile={...cloneTile(tile)};
    s.pieces.push(p);s.placedTileIds.push(tile.id);
    const baseTrigger=tile.a+tile.b,upgradeBonus=(tile.upgrade||0)*cfg.UPGRADE_TRIGGER_BONUS,trigger=baseTrigger+upgradeBonus;
    const sim=s.pieces.length===1?{output:trigger,events:[],reason:'root',rebounds:0,search:{starts:0,leaves:1,expanded:0}}:E.bestSignal(p.id,s.pieces,{initialOutput:trigger});
    if(isZero(tile))s.roundZero.placed++;
    s.hand[i]=drawOne();s.turn++;s.roundTurn++;
    return{ok:true,tile,p,trigger,baseTrigger,upgradeBonus,sim,handIndex:i}
  }

  function overkillTier(output,tgt){const ratio=output/tgt;return ratio>=10?3:ratio>=5?2:ratio>=3?1:0}
  function scheduleIntermission(){
    if(s.round>=cfg.TOTAL_ROUNDS-1){s.nextShopType='none';s.intermissionResolved=true;return}
    const endOfStage=(s.round+1)%(cfg.STAGE_SIZE||5)===0;
    s.nextShopType=endOfStage?'big':(rnd()<(cfg.MINI_SHOP_CHANCE??0.5)?'mini':'none');
    s.intermissionResolved=s.nextShopType==='none';
    s.events.push({type:'shop-scheduled',round:s.round+1,shop:s.nextShopType})
  }

  function finishPlacement(ctx){
    if(!ctx?.ok)return ctx;
    const{tile,p,trigger,baseTrigger,upgradeBonus,sim}=ctx;s.score=sim.output??trigger;s.best=Math.max(s.best,s.score);s.cleared=s.score>=target();
    const st=(sim.events||[]).find(e=>e.type==='start'),rs=(sim.events||[]).filter(e=>e.type==='route');
    s.events.push({turn:s.turn,round:s.round+1,roundTurn:s.roundTurn,tile:cloneTile(tile),placement:{x:p.cubes[0].x,y:p.cubes[0].y,z:0,rr:p.rr},dir:E.ARROW[p.rr],target:target(),trigger,baseTrigger,upgradeBonus,output:s.score,rebounds:sim.rebounds||0,start:st?.key||'-',flipped:!!st?.flipped,reason:sim.reason,ops:(sim.events||[]).filter(e=>e.type==='op').map(e=>e.op==='multiply'?`${e.piece}:×${e.factor} ${e.before}>${e.after}${e.reverse?'R':''}`:`${e.piece}:+${e.add} ${e.before}>${e.after}${e.reverse?'R':''}`).join(','),routes:rs.map(e=>`${e.piece}:${e.entryHalf}>${e.toPieceId}:${e.toHalf}`).join(';'),search:sim.search?`${sim.search.starts}/${sim.search.leaves}/${sim.search.expanded}${sim.search.truncated?'!':''}`:'-',clear:s.cleared});
    if(s.cleared){
      const reward=clearReward();s.coins+=reward;s.roundZero.endHand=countZero(s.hand.filter(Boolean));
      const tier=overkillTier(s.score,target()),old=tile.upgrade||0;
      if(tier>old){tile.upgrade=tier;p.tile.upgrade=tier;s.events.push({type:'tile-upgrade',round:s.round+1,tile:cloneTile(tile),from:old,to:tier,ratio:+(s.score/target()).toFixed(2)})}
      s.anchorId=tile.id;s.events.push({type:'anchor-set',round:s.round+1,tile:cloneTile(tile)});
      s.wins.push({round:s.round+1,target:target(),output:s.score,turn:s.turn,placements:s.roundTurn,reward,anchor:cloneTile(tile),upgradeTier:tile.upgrade||0,machineSize:s.pieces.length,setSize:s.set.length,zeros:{...s.roundZero}});
      s.events.push({type:'coins',round:s.round+1,amount:reward,coins:s.coins});scheduleIntermission()
    }else assessContinuation();
    s.running=false;return{ok:true,cleared:s.cleared,blocked:s.blocked,needsReroll:s.needsReroll,failureReason:s.failureReason,nextShopType:s.nextShopType}
  }

  function reroll(){
    if(s.rerollsLeft<=0||s.running||s.cleared||s.blocked||s.shopOpen)return{ok:false};
    const old=s.hand.filter(Boolean);s.reserve.push(...old);sh(s.reserve);s.hand=Array(cfg.HAND_SIZE).fill(null).map(()=>drawOne());
    s.rerollsLeft--;s.needsReroll=false;s.events.push({type:'reroll',round:s.round+1,roundTurn:s.roundTurn,remaining:s.rerollsLeft,hand:s.hand.filter(Boolean).map(cloneTile)});
    assessContinuation();return{ok:true,blocked:s.blocked,needsReroll:s.needsReroll,failureReason:s.failureReason}
  }

  function availableMiniItems(){return M.all().filter(m=>!(m.kind==='mod'&&s.mods.includes(m.id)))}
  function miniOffers(){
    const pool=availableMiniItems().slice(),out=[],affordable=pool.filter(m=>m.cost<=s.coins);
    if(affordable.length){const pick=affordable[Math.floor(rnd()*affordable.length)];out.push(pick.id);pool.splice(pool.findIndex(m=>m.id===pick.id),1)}
    while(pool.length&&out.length<(cfg.MINI_SHOP_OFFERS||2)){const i=Math.floor(rnd()*pool.length);out.push(pool.splice(i,1)[0].id)}
    return out
  }
  function openIntermission(){
    if(!s.cleared||s.intermissionResolved||s.nextShopType==='none'||s.shopOpen)return false;
    s.shopOpen=true;s.shopType=s.nextShopType;s.shopOffers=[];s.bigShopBuys=[];
    if(s.shopType==='mini')s.shopOffers=miniOffers();
    if(s.shopType==='big')s.bigShopRandomStock=cfg.BIG_SHOP_RANDOM_STOCK||3;
    s.events.push({type:'shop-open',round:s.round+1,shop:s.shopType,offers:[...s.shopOffers],coins:s.coins});return true
  }
  function resolveIntermission(reason='continue'){
    if(!s.shopOpen)return false;
    s.events.push({type:'shop-close',round:s.round+1,shop:s.shopType,reason,coins:s.coins});
    s.shopOpen=false;s.shopType=null;s.shopOffers=[];s.nextShopType='none';s.intermissionResolved=true;return true
  }
  function buyMiniShop(id){
    if(!s.shopOpen||s.shopType!=='mini'||!s.shopOffers.includes(id))return{ok:false,reason:'shop'};
    const m=M.get(id);if(!m||s.coins<m.cost)return{ok:false,reason:'coins'};
    s.coins-=m.cost;
    if(id==='extra-placement')s.pendingExtraPlacements++;
    else if(id==='extra-reroll')s.pendingExtraRerolls++;
    else if(m.kind==='mod'&&!s.mods.includes(id))s.mods.push(id);
    s.events.push({type:'shop-buy',round:s.round+1,shop:'mini',item:id,cost:m.cost,coins:s.coins});
    resolveIntermission('purchase');return{ok:true,item:id}
  }
  function skipMiniShop(){if(!s.shopOpen||s.shopType!=='mini')return false;return resolveIntermission('skip')}

  function addPurchasedTile(a,b,source){
    a=Math.max(0,Math.min(6,Math.trunc(a)));b=Math.max(0,Math.min(6,Math.trunc(b)));if(a>b)[a,b]=[b,a];
    const tile={id:`p${++s.tileSerial}-${a}-${b}`,a,b,upgrade:0,source};s.set.push(tile);return tile
  }
  function buyBigRandomTile(){
    if(!s.shopOpen||s.shopType!=='big')return{ok:false,reason:'shop'};
    const cost=cfg.BIG_SHOP_RANDOM_TILE_COST||1;if(s.bigShopRandomStock<=0)return{ok:false,reason:'stock'};if(s.coins<cost)return{ok:false,reason:'coins'};
    const pairs=pairList(),[a,b]=pairs[Math.floor(rnd()*pairs.length)],tile=addPurchasedTile(a,b,'big-random');
    s.coins-=cost;s.bigShopRandomStock--;s.bigShopBuys.push(cloneTile(tile));s.events.push({type:'tile-buy',round:s.round+1,shop:'big',mode:'random',tile:cloneTile(tile),cost,coins:s.coins,stock:s.bigShopRandomStock});return{ok:true,tile:cloneTile(tile),stock:s.bigShopRandomStock}
  }
  function buyBigExactTile(a,b){
    if(!s.shopOpen||s.shopType!=='big')return{ok:false,reason:'shop'};
    const cost=cfg.BIG_SHOP_EXACT_TILE_COST||10;if(s.coins<cost)return{ok:false,reason:'coins'};
    if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||a>6||b<0||b>6)return{ok:false,reason:'tile'};
    const tile=addPurchasedTile(a,b,'big-exact');s.coins-=cost;s.bigShopBuys.push(cloneTile(tile));s.events.push({type:'tile-buy',round:s.round+1,shop:'big',mode:'exact',tile:cloneTile(tile),cost,coins:s.coins});return{ok:true,tile:cloneTile(tile)}
  }
  function closeBigShop(){if(!s.shopOpen||s.shopType!=='big')return false;return resolveIntermission('continue')}

  function advance(){if(!s.cleared||s.round>=cfg.TOTAL_ROUNDS-1||s.shopOpen||!s.intermissionResolved)return false;s.round++;startRound(false);return true}
  function status(){return s.cleared&&s.round===cfg.TOTAL_ROUNDS-1?'COMPLETE':s.blocked?'ROUND FAILED':'IN PROGRESS'}

  function snapshot(){
    const size=cfg.STAGE_SIZE||5,stage=stageIndex(),bs=E.getBoardSize?E.getBoardSize():{G:E.G,H:E.H};
    return{schema:'iterion.run.v7',gameVersion:cfg.VERSION,engineVersion:cfg.ENGINE_VERSION,runId:s.runId,seed:s.seed,startedAt:s.startedAt,savedAt:new Date().toISOString(),status:status(),failureReason:s.failureReason,round:{index:s.round+1,total:cfg.TOTAL_ROUNDS,target:target(),placements:s.roundTurn,maxPlacements:maxPlacements(),clears:s.wins},stage:{index:stage+1,total:Math.ceil(cfg.TOTAL_ROUNDS/size),round:(s.round%size)+1,size},boardSize:{width:bs.G,height:bs.H},score:{last:s.score,best:s.best},turnCount:s.turn,coins:s.coins,mods:[...s.mods],anchorId:s.anchorId,setSize:s.set.length,set:s.set.map(cloneTile),placedTileIds:[...s.placedTileIds],availableTileCount:availableTileCount(),machinePersistent:!!cfg.PERSIST_MACHINE_BETWEEN_ROUNDS,rerollsLeft:s.rerollsLeft,pending:{extraPlacements:s.pendingExtraPlacements,extraRerolls:s.pendingExtraRerolls},shop:{nextType:s.nextShopType,resolved:s.intermissionResolved,open:s.shopOpen,type:s.shopType,offers:[...s.shopOffers],randomStock:s.bigShopRandomStock,buys:s.bigShopBuys.map(cloneTile)},zeroStats:{...s.roundZero},hand:s.hand.filter(Boolean).map(cloneTile),reserve:s.reserve.map(cloneTile),board:s.pieces.map(p=>({id:p.id,tileId:p.tile.id,a:p.tile.a,b:p.tile.b,upgrade:p.tile.upgrade||0,source:p.tile.source||'base',x:p.cubes[0].x,y:p.cubes[0].y,z:0,rr:p.rr})),turns:s.events.map(e=>JSON.parse(JSON.stringify(e)))}
  }

  function debugText(){
    const x=snapshot(),up=x.set.filter(t=>t.upgrade).map(t=>`[${t.a}|${t.b}]★${t.upgrade}`).join(', ')||'-';
    const lines=[`ITERION DEBUG v${x.gameVersion}`,`Run ID: ${x.runId}`,`Seed: ${x.seed}`,`Result: ${x.status}${x.failureReason?` · ${x.failureReason}`:''}`,`Stage: ${x.stage.index}/${x.stage.total} · round ${x.stage.round}/${x.stage.size}`,`Round: ${x.round.index}/${x.round.total} · target=${x.round.target} · placements=${x.round.placements}/${x.round.maxPlacements}`,`Board: ${x.boardSize.width}x${x.boardSize.height} · Machine: ${x.board.length} pieces · unique=${new Set(x.placedTileIds).size}/${x.placedTileIds.length}`,`Set: ${x.setSize} tiles · available=${x.availableTileCount}`,`Last output: ${x.score.last}`,`Best output: ${x.score.best}`,`Coins: ${x.coins} · Mods: ${x.mods.join(', ')||'-'} · Rerolls left: ${x.rerollsLeft}`,`Anchor: ${s.anchorId||'-'} · Upgraded tiles: ${up}`,`Next shop: ${x.shop.nextType} · shop open=${x.shop.open?'yes':'no'}`,`Round clears: ${x.round.clears.map(w=>`R${w.round} target=${w.target} output=${w.output} placements=${w.placements} machine=${w.machineSize} set=${w.setSize} reward=${w.reward} anchor=[${w.anchor.a}|${w.anchor.b}]★${w.upgradeTier}`).join(' | ')||'-'}`,''];
    for(const v of x.turns){
      if(v.type==='reroll'){lines.push(`R${v.round} REROLL after placement ${v.roundTurn} remaining=${v.remaining}`);continue}
      if(v.type==='coins'){lines.push(`R${v.round} COINS +${v.amount} total=${v.coins}`);continue}
      if(v.type==='tile-upgrade'){lines.push(`R${v.round} UPGRADE [${v.tile.a}|${v.tile.b}] ${v.from}>${v.to} overkill=x${v.ratio}`);continue}
      if(v.type==='anchor-set'){lines.push(`R${v.round} ANCHOR [${v.tile.a}|${v.tile.b}]★${v.tile.upgrade||0}`);continue}
      if(v.type==='opening-double'){lines.push(`R1 OPENING DOUBLE [${v.tile.a}|${v.tile.b}]`);continue}
      if(v.type==='board-expand'){lines.push(`STAGE ${v.stage} BOARD ${v.from.join('x')} > ${v.to.join('x')} offset=${v.offset.join(',')}`);continue}
      if(v.type==='shop-scheduled'){lines.push(`R${v.round} NEXT SHOP ${v.shop.toUpperCase()}`);continue}
      if(v.type==='shop-open'){lines.push(`R${v.round} ${v.shop.toUpperCase()} SHOP OPEN coins=${v.coins}${v.offers?.length?` offers=${v.offers.join(',')}`:''}`);continue}
      if(v.type==='shop-buy'){lines.push(`R${v.round} MINI SHOP BUY ${v.item} -${v.cost} coins=${v.coins}`);continue}
      if(v.type==='tile-buy'){lines.push(`R${v.round} BIG SHOP ${v.mode.toUpperCase()} [${v.tile.a}|${v.tile.b}] id=${v.tile.id} -${v.cost} coins=${v.coins}`);continue}
      if(v.type==='shop-close'){lines.push(`R${v.round} ${v.shop.toUpperCase()} SHOP CLOSE ${v.reason}`);continue}
      if(v.type==='failure'){lines.push(`R${v.round} FAIL ${v.reason} after placement ${v.roundTurn}`);continue}
      if(Number.isInteger(v.turn))lines.push(`T${v.turn} R${v.round}.${v.roundTurn} [${v.tile.a}|${v.tile.b}]${v.tile.upgrade?`★${v.tile.upgrade}`:''} ${v.dir} @${v.placement.x},${v.placement.y},r${v.placement.rr} trigger=${v.trigger}${v.upgradeBonus?` (+${v.upgradeBonus} upgrade)`:''} output=${v.output} rebounds=${v.rebounds} start=${v.start}${v.flipped?' FLIPPED':''} reason=${v.reason} ops=${v.ops||'-'} routes=${v.routes||'-'} search=${v.search}${v.clear?' CLEAR':''}`)
    }
    return lines.join('\n')
  }

  function save(){try{const x=snapshot();localStorage.setItem('iterion.latestRun.v7',JSON.stringify(x));return x}catch(_){return snapshot()}}
  fresh(opts.seed);
  return{state:()=>s,config:cfg,target,stageIndex,boardSizeForStage,candidatesForIndex,legalHandMask,canInteract,beginPlacement,finishPlacement,reroll,advance,rotateRoot,setRootRotation,fresh,snapshot,debugText,save,hasLegal,assessContinuation,maxPlacements,clearReward,availableTileCount,openIntermission,buyMiniShop,skipMiniShop,buyBigRandomTile,buyBigExactTile,closeBigShop,resolveIntermission}
}
return{createGame}
});