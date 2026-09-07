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
  const deepClone=x=>JSON.parse(JSON.stringify(x));
  const stageSize=()=>cfg.STAGE_SIZE||3;

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
  function stageIndex(){return Math.floor(s.round/stageSize())}
  function boardSizeForStage(stage=stageIndex()){const sizes=cfg.BOARD_SIZES||[[18,24]];return sizes[Math.min(stage,sizes.length-1)]||sizes[sizes.length-1]}
  function maxPlacements(){return cfg.MAX_PLACEMENTS+s.extraPlacements}
  function clearRewardBreakdown(){
    const base=cfg.BASE_CLEAR_REWARD??3;
    const quick=s.roundTurn<=(cfg.QUICK_CLEAR_MAX_MOVES??3)?(cfg.QUICK_CLEAR_BONUS??1):0;
    const exact=s.score===target()?(cfg.EXACT_TARGET_BONUS??5):0;
    return{base,quick,exact,total:base+quick+exact}
  }
  function clearReward(){return clearRewardBreakdown().total}
  function availableTileCount(){return s.set.length-(s.placedTileIds?.length||0)}
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
  function fail(reason){s.blocked=true;s.needsReroll=false;s.failureReason=reason;s.roundZero.endHand=countZero(s.hand.filter(Boolean));s.events.push({type:'failure',round:s.round+1,roundTurn:s.roundTurn,reason})}
  function assessContinuation(){
    s.needsReroll=false;if(s.cleared)return;
    if(s.roundTurn>=maxPlacements()){fail('placement-limit');return}
    if(!s.hand.some(Boolean)&&!s.reserve.length){fail('no-tiles');return}
    if(hasLegal()){s.blocked=false;s.failureReason=null;return}
    if((s.consumables?.reroll||0)>0){s.blocked=false;s.failureReason=null;s.needsReroll=true;return}
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
    s.score=0;s.roundTurn=0;s.rootRR=0;s.roundZero={drawn:0,placed:0,endHand:0};
    s.extraPlacements=0;s.upgradeCoinsClaimed=[];s.roundUpgradeCoins=0;s.undoFrame=null;
    s.cleared=false;s.blocked=false;s.needsReroll=false;s.failureReason=null;
    s.nextShopType='none';s.intermissionResolved=true;s.shopOpen=false;s.shopType=null;s.shopOffers=[];s.marketBuys=[];
    initialHand();
    if(s.round%stageSize()===0)s.events.push({type:'stage-start',stage:stageIndex()+1,round:s.round+1,coins:s.coins,inflation:s.inflation,available:availableTileCount(),board:[E.G,E.H]});
    if(s.pieces.length||!s.hand.some(Boolean))assessContinuation()
  }

  function fresh(seedOverride){
    const seed=(seedOverride==null?(typeof crypto!=='undefined'&&crypto.getRandomValues?crypto.getRandomValues(new Uint32Array(1))[0]:Math.floor(Math.random()*4294967296)):seedOverride)>>>0;
    s={set:makePersistentSet(),reserve:[],hand:[],pieces:[],placedTileIds:[],score:0,best:0,round:0,roundTurn:0,turn:0,wins:[],events:[],idc:0,running:false,cleared:false,blocked:false,needsReroll:false,failureReason:null,rootRR:0,seed,rngState:seed|0,runId:`${Date.now().toString(36)}-${seed.toString(36)}`,startedAt:new Date().toISOString(),roundZero:{drawn:0,placed:0,endHand:0},coins:cfg.STARTING_COINS,inflation:0,consumables:{move:cfg.STARTING_MOVE_CONSUMABLES||0,reroll:cfg.STARTING_REROLL_CONSUMABLES||0,undo:cfg.STARTING_UNDO_CONSUMABLES||0},mods:[],extraPlacements:0,upgradeCoinsClaimed:[],roundUpgradeCoins:0,undoFrame:null,anchorId:null,nextShopType:'none',intermissionResolved:true,shopOpen:false,shopType:null,shopOffers:[],marketBuys:[],tileSerial:0,boardStage:0,doubleDoubleTileId:null};
    startRound(true);return s
  }

  function setRootRotation(rr){if(s.pieces.length||s.running)return false;s.rootRR=((rr%4)+4)%4;return true}
  function rotateRoot(){return setRootRotation(s.rootRR+1)}
  function rootPlacements(tile){let out=[];for(let y=0;y<=E.H-E.S;y++)for(let x=0;x<=E.G-E.S;x++){let p=E.pieceFrom(tile,x,y,0,s.rootRR,-1);if(p.rect.minx>=0&&p.rect.miny>=0&&p.rect.maxx<=E.G&&p.rect.maxy<=E.H)out.push({x,y,z:0,rr:s.rootRR})}return out}
  function candidatesForIndex(i){const tile=s.hand[i];if(!tile)return[];if(!s.pieces.length&&cfg.FIRST_TILE_MUST_BE_DOUBLE&&s.turn===0&&!isDouble(tile))return[];return s.pieces.length?E.allPlacements(tile,0,s.pieces):rootPlacements(tile)}
  function legalHandMask(){return s.hand.map(t=>{if(!t)return false;if(!s.pieces.length)return !(cfg.FIRST_TILE_MUST_BE_DOUBLE&&s.turn===0&&!isDouble(t));return E.hasAnyPlacement?E.hasAnyPlacement(t,0,s.pieces):E.allPlacements(t,0,s.pieces).length>0})}
  function canInteract(){return !s.running&&!s.cleared&&!s.blocked&&!s.needsReroll&&!s.shopOpen}

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
    s.pieces.push(p);s.placedTileIds.push(tile.id);
    const trigger=tile.a+tile.b;
    const doubleDoublePieceId=s.pieces.find(x=>x.tile.id===s.doubleDoubleTileId)?.id||null;
    const sim=s.pieces.length===1?{output:trigger,events:[],reason:'root',rebounds:0,search:{starts:0,leaves:1,expanded:0}}:E.bestSignal(p.id,s.pieces,{initialOutput:trigger,doubleDoublePieceId});
    if(isZero(tile))s.roundZero.placed++;
    s.hand[i]=drawOne();s.turn++;s.roundTurn++;s.undoFrame=undoFrame;
    return{ok:true,tile,p,trigger,baseTrigger:trigger,sim,handIndex:i}
  }

  function upgradeIncomeFor(sim){
    const seen=new Set(),activations=[];
    for(const e of sim.events||[]){
      if(e.type!=='op'||seen.has(e.piece))continue;
      seen.add(e.piece);const p=s.pieces.find(x=>x.id===e.piece),tier=p?.tile?.upgrade||0;
      if(tier>0)activations.push({pieceId:e.piece,tileId:p.tile.id,a:p.tile.a,b:p.tile.b,tier,coins:tier})
    }
    const uniquePieces=seen.size,longRunOwned=s.mods.includes('long-run'),longRunActive=longRunOwned&&uniquePieces>=(cfg.LONG_RUN_UNIQUE_THRESHOLD||10);
    const total=longRunActive?activations.reduce((sum,a)=>sum+a.tier,0):activations.reduce((best,a)=>Math.max(best,a.tier),0);
    return{activations,total,uniquePieces,longRunOwned,longRunActive}
  }
  function awardUpgradeIncome(income){
    if(!income.total)return 0;
    s.coins+=income.total;s.roundUpgradeCoins+=income.total;
    s.events.push({type:'upgrade-coins',round:s.round+1,roundTurn:s.roundTurn,amount:income.total,activations:income.activations,uniquePieces:income.uniquePieces,longRunOwned:income.longRunOwned,longRunActive:income.longRunActive,coins:s.coins});return income.total
  }

  function overkillTier(output,tgt){const ratio=output/tgt;return ratio>=10?3:ratio>=5?2:ratio>=3?1:0}
  function scheduleIntermission(){
    if(s.round>=cfg.TOTAL_ROUNDS-1){s.nextShopType='none';s.intermissionResolved=true;return}
    const endOfStage=(s.round+1)%stageSize()===0;
    s.nextShopType=endOfStage?'market':'none';
    s.intermissionResolved=!endOfStage;
    s.events.push({type:'shop-scheduled',round:s.round+1,shop:s.nextShopType})
  }

  function finishPlacement(ctx){
    if(!ctx?.ok)return ctx;
    const{tile,p,trigger,sim}=ctx;s.score=sim.output??trigger;s.best=Math.max(s.best,s.score);s.cleared=s.score>=target();
    const st=(sim.events||[]).find(e=>e.type==='start'),rs=(sim.events||[]).filter(e=>e.type==='route'),income=upgradeIncomeFor(sim);
    s.events.push({turn:s.turn,round:s.round+1,roundTurn:s.roundTurn,tile:cloneTile(tile),placement:{x:p.cubes[0].x,y:p.cubes[0].y,z:0,rr:p.rr},dir:E.ARROW[p.rr],target:target(),trigger,baseTrigger:trigger,output:s.score,upgradeCoins:income.total,rebounds:sim.rebounds||0,start:st?.key||'-',flipped:!!st?.flipped,reason:sim.reason,ops:(sim.events||[]).filter(e=>e.type==='op').map(e=>e.op==='multiply'?`${e.piece}:×${e.factor}${e.doubleDouble?'DD':''} ${e.before}>${e.after}${e.reverse?'R':''}`:`${e.piece}:+${e.add}${e.doubleDouble?'DD':''} ${e.before}>${e.after}${e.reverse?'R':''}`).join(','),routes:rs.map(e=>`${e.piece}:${e.entryHalf}>${e.toPieceId}:${e.toHalf}`).join(';'),search:sim.search?`${sim.search.starts}/${sim.search.leaves}/${sim.search.expanded}${sim.search.truncated?'!':''}`:'-',clear:s.cleared});
    const upgradeCoins=awardUpgradeIncome(income);
    if(s.cleared){
      const rewardBreakdown=clearRewardBreakdown(),reward=rewardBreakdown.total;s.coins+=reward;s.roundZero.endHand=countZero(s.hand.filter(Boolean));
      const tier=overkillTier(s.score,target()),old=tile.upgrade||0;
      if(tier>old){tile.upgrade=tier;p.tile.upgrade=tier;s.events.push({type:'tile-upgrade',round:s.round+1,tile:cloneTile(tile),from:old,to:tier,ratio:+(s.score/target()).toFixed(2)})}
      s.anchorId=tile.id;s.events.push({type:'anchor-set',round:s.round+1,tile:cloneTile(tile)});
      s.wins.push({round:s.round+1,target:target(),output:s.score,turn:s.turn,placements:s.roundTurn,reward,rewardBreakdown,upgradeCoins:s.roundUpgradeCoins,anchor:cloneTile(tile),upgradeTier:tile.upgrade||0,machineSize:s.pieces.length,setSize:s.set.length,zeros:{...s.roundZero}});
      s.events.push({type:'coins',round:s.round+1,amount:reward,breakdown:rewardBreakdown,coins:s.coins});scheduleIntermission()
    }else{const protection=ensureOpeningContinuation('draw');if(protection)s.events.push(protection);assessContinuation()}
    s.running=false;return{ok:true,cleared:s.cleared,blocked:s.blocked,needsReroll:s.needsReroll,failureReason:s.failureReason,nextShopType:s.nextShopType,upgradeCoins}
  }

  function canUseReroll(){return(s.consumables?.reroll||0)>0&&!s.running&&!s.cleared&&!s.shopOpen&&s.failureReason!=='no-tiles'&&s.failureReason!=='placement-limit'}
  function reroll(){
    if(!canUseReroll())return{ok:false,reason:'state'};
    s.consumables.reroll--;s.undoFrame=null;s.blocked=false;s.failureReason=null;
    const old=s.hand.filter(Boolean);s.reserve.push(...old);sh(s.reserve);s.hand=Array(cfg.HAND_SIZE).fill(null).map(()=>drawOne());
    const protection=ensureOpeningContinuation('reroll');s.needsReroll=false;s.events.push({type:'reroll',round:s.round+1,roundTurn:s.roundTurn,remaining:s.consumables.reroll,hand:s.hand.filter(Boolean).map(cloneTile)});if(protection)s.events.push(protection);
    assessContinuation();return{ok:true,blocked:s.blocked,needsReroll:s.needsReroll,failureReason:s.failureReason}
  }
  function canUseMove(){return(s.consumables?.move||0)>0&&!s.running&&!s.cleared&&!s.shopOpen&&!s.needsReroll&&(!s.blocked||s.failureReason==='placement-limit')}
  function useMove(){
    if(!canUseMove())return{ok:false,reason:'state'};
    s.consumables.move--;s.undoFrame=null;s.extraPlacements++;
    const rescued=s.blocked&&s.failureReason==='placement-limit';if(rescued){s.blocked=false;s.failureReason=null;assessContinuation()}
    s.events.push({type:'consume',round:s.round+1,roundTurn:s.roundTurn,item:'move',remaining:s.consumables.move,maxPlacements:maxPlacements()});
    return{ok:true,maxPlacements:maxPlacements(),remaining:s.consumables.move}
  }
  function canUndo(){return!!s.undoFrame&&(s.consumables?.undo||0)>0&&!s.running&&!s.shopOpen}
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
    const current=s,frame=deepClone(s.undoFrame),last=[...s.events].reverse().find(e=>Number.isInteger(e.turn)),preserved=preserveShopTransactions(frame,current);
    s=frame;s.consumables.undo=Math.max(0,(s.consumables?.undo||0)-1);s.undoFrame=null;s.running=false;
    s.events.push({type:'undo',round:s.round+1,roundTurn:s.roundTurn,item:'undo',remaining:s.consumables.undo,undone:last?{turn:last.turn,tile:cloneTile(last.tile),output:last.output}:null,preservedPurchases:preserved.count,preservedSpend:preserved.spend,preservedInflation:preserved.inflationDelta,coinShortfall:preserved.shortfall});
    return{ok:true,remaining:s.consumables.undo,restoredTurn:s.turn,discardedTurn:current.turn,preservedPurchases:preserved.count,preservedSpend:preserved.spend}
  }

  function inflationCost(base){return base+(s.inflation||0)}
  function shopItemPrice(id){const m=M.get(id);return m?inflationCost(m.cost):Infinity}
  function shopRandomPrice(){return inflationCost(cfg.SHOP_RANDOM_TILE_COST||1)}
  function marketDoubleDoublePrice(){return inflationCost(cfg.MARKET_DOUBLE_DOUBLE_COST||8)}
  function applyPurchase(cost,meta){
    const before=s.inflation||0;s.coins-=cost;s.inflation=before+(cfg.INFLATION_PER_PURCHASE||1);
    return{inflationBefore:before,inflationAfter:s.inflation,...meta}
  }

  function availableShopItems(){return M.all().filter(m=>m.kind==='consumable')}
  function canOpenShop(){return !s.running&&!s.cleared&&!s.shopOpen}
  function openShop(){
    if(!canOpenShop())return false;
    s.shopOpen=true;s.shopType='shop';s.shopOffers=availableShopItems().map(m=>m.id);
    s.events.push({type:'shop-open',round:s.round+1,shop:'shop',offers:[...s.shopOffers],coins:s.coins,inflation:s.inflation,available:availableTileCount()});return true
  }
  function closeShop(){
    if(!s.shopOpen||s.shopType!=='shop')return false;
    s.events.push({type:'shop-close',round:s.round+1,shop:'shop',reason:'continue',coins:s.coins,inflation:s.inflation,available:availableTileCount()});
    s.shopOpen=false;s.shopType=null;s.shopOffers=[];
    if(!s.cleared&&!s.running)assessContinuation();
    return true
  }
  function buyShopItem(id){
    if(!s.shopOpen||s.shopType!=='shop')return{ok:false,reason:'shop'};
    const m=M.get(id),cost=shopItemPrice(id);if(!m||m.kind!=='consumable'||s.coins<cost)return{ok:false,reason:m?'coins':'item'};
    s.consumables[id]=(s.consumables[id]||0)+1;const purchase=applyPurchase(cost);
    s.events.push({type:'shop-buy',round:s.round+1,shop:'shop',item:id,baseCost:m.cost,cost,coins:s.coins,...purchase});
    return{ok:true,item:id,cost,inflation:s.inflation}
  }

  function addPurchasedTile(a,b,source){
    a=Math.max(0,Math.min(6,Math.trunc(a)));b=Math.max(0,Math.min(6,Math.trunc(b)));if(a>b)[a,b]=[b,a];
    const tile={id:`p${++s.tileSerial}-${a}-${b}`,a,b,upgrade:0,source};s.set.push(tile);return tile
  }
  function deliverPurchasedTile(tile){
    const slot=s.hand.findIndex(t=>!t);
    if(slot>=0){s.hand[slot]=tile;if(isZero(tile))s.roundZero.drawn++;return{location:'hand',slot}}
    s.reserve.unshift(tile);return{location:'reserve',slot:null}
  }
  function buyShopRandomTile(){
    if(!s.shopOpen||s.shopType!=='shop')return{ok:false,reason:'shop'};
    const cost=shopRandomPrice();if(s.coins<cost)return{ok:false,reason:'coins'};
    const pairs=pairList(),[a,b]=pairs[Math.floor(rnd()*pairs.length)],tile=addPurchasedTile(a,b,'shop-random'),delivery=deliverPurchasedTile(tile),purchase=applyPurchase(cost);
    if(s.blocked&&s.failureReason==='no-tiles'){s.blocked=false;s.failureReason=null;s.needsReroll=false}
    s.events.push({type:'tile-buy',round:s.round+1,shop:'shop',mode:'random',tile:cloneTile(tile),delivery:delivery.location,baseCost:cfg.SHOP_RANDOM_TILE_COST||1,cost,coins:s.coins,...purchase});
    return{ok:true,tile:cloneTile(tile),delivery:delivery.location,cost,inflation:s.inflation}
  }

  function marketMods(){return M.all().filter(m=>m.market)}
  function marketModPrice(id){
    const m=M.get(id),base=m?.marketCostKey?Number(cfg[m.marketCostKey]):NaN;
    return Number.isFinite(base)?inflationCost(base):Infinity
  }
  function marketTargetTiles(id){
    const m=M.get(id);if(!m)return[];
    const seen=new Set(),placed=[];
    for(const p of s.pieces){const tile=s.set.find(t=>t.id===p.tile.id)||p.tile;if(!tile||seen.has(tile.id))continue;seen.add(tile.id);placed.push(tile)}
    if(m.target==='double')return placed.filter(t=>isDouble(t)&&t.a>0&&(id!=='double-double'||t.id!==s.doubleDoubleTileId));
    return[]
  }
  function marketTargetCount(id){const m=M.get(id);if(!m)return 0;if(m.target==='machine')return s.mods.includes(id)?0:1;return marketTargetTiles(id).length}
  function marketOfferInfo(id){
    const m=M.get(id),price=marketModPrice(id),targetCount=marketTargetCount(id),offered=s.shopOffers.includes(id),locked=s.marketBuys.length>=(cfg.MARKET_PURCHASE_LIMIT||1);
    return{id,mod:m,price,targetCount,offered,locked,canBuy:!!m&&m.market&&offered&&!locked&&targetCount>0&&s.coins>=price}
  }
  function generateMarketOffers(){
    const valid=marketMods().filter(m=>marketTargetCount(m.id)>0).map(m=>m.id);sh(valid);return valid.slice(0,cfg.MARKET_OFFER_COUNT||3)
  }
  function openIntermission(){
    if(!s.cleared||s.intermissionResolved||s.nextShopType!=='market'||s.shopOpen)return false;
    s.shopOpen=true;s.shopType='market';s.marketBuys=[];s.shopOffers=generateMarketOffers();
    s.events.push({type:'shop-open',round:s.round+1,shop:'market',offers:[...s.shopOffers],coins:s.coins,inflation:s.inflation,available:availableTileCount(),purchaseLimit:cfg.MARKET_PURCHASE_LIMIT||1});return true
  }
  function resolveIntermission(reason='continue'){
    if(!s.shopOpen||s.shopType!=='market')return false;
    s.events.push({type:'shop-close',round:s.round+1,shop:'market',reason,coins:s.coins,inflation:s.inflation,available:availableTileCount()});
    s.shopOpen=false;s.shopType=null;s.shopOffers=[];s.nextShopType='none';s.intermissionResolved=true;return true
  }
  function buyMarketMod(id){
    if(!s.shopOpen||s.shopType!=='market')return{ok:false,reason:'shop'};
    if(!s.shopOffers.includes(id))return{ok:false,reason:'offer'};
    if(s.marketBuys.length>=(cfg.MARKET_PURCHASE_LIMIT||1))return{ok:false,reason:'limit'};
    const m=M.get(id);if(!m?.market)return{ok:false,reason:'item'};
    if(marketTargetCount(id)<1)return{ok:false,reason:'no-target'};
    const cost=marketModPrice(id);if(s.coins<cost)return{ok:false,reason:'coins'};
    let tile=null,previousTileId=null,candidateCount=1;
    if(m.target==='double'){const candidates=marketTargetTiles(id);candidateCount=candidates.length;tile=candidates[Math.floor(rnd()*candidates.length)];previousTileId=id==='double-double'?(s.doubleDoubleTileId||null):null}
    if(id!=='double-double'&&id!=='long-run')return{ok:false,reason:'unsupported'};
    const purchase=applyPurchase(cost);
    if(id==='double-double')s.doubleDoubleTileId=tile.id;
    if(id==='long-run'&&!s.mods.includes(id))s.mods.push(id);
    const record={mod:id,tile:cloneTile(tile),targetTileId:tile?.id||null,cost,inflationBefore:purchase.inflationBefore,inflationAfter:purchase.inflationAfter};s.marketBuys.push(record);
    const type=id==='double-double'?'double-double':'market-mod-buy';
    s.events.push({type,mod:id,round:s.round+1,shop:'market',tile:cloneTile(tile),targetTileId:tile?.id||null,previousTileId,candidateCount,baseCost:Number(cfg[m.marketCostKey])||0,cost,coins:s.coins,...purchase});
    return{ok:true,mod:id,tile:cloneTile(tile),targetTileId:tile?.id||null,previousTileId,candidateCount,cost,inflation:s.inflation}
  }
  function buyDoubleDouble(){return buyMarketMod('double-double')}
  function closeMarket(){return resolveIntermission('continue')}

  function advance(){if(!s.cleared||s.round>=cfg.TOTAL_ROUNDS-1||s.shopOpen||!s.intermissionResolved)return false;s.round++;startRound(false);return true}
  function status(){return s.cleared&&s.round===cfg.TOTAL_ROUNDS-1?'COMPLETE':s.blocked?'ROUND FAILED':'IN PROGRESS'}

  function snapshot(){
    const size=stageSize(),stage=stageIndex(),bs=E.getBoardSize?E.getBoardSize():{G:E.G,H:E.H};
    return{schema:'iterion.run.v9',gameVersion:cfg.VERSION,engineVersion:cfg.ENGINE_VERSION,runId:s.runId,seed:s.seed,startedAt:s.startedAt,savedAt:new Date().toISOString(),status:status(),failureReason:s.failureReason,round:{index:s.round+1,total:cfg.TOTAL_ROUNDS,target:target(),placements:s.roundTurn,maxPlacements:maxPlacements(),clears:s.wins,upgradeCoins:s.roundUpgradeCoins},stage:{index:stage+1,total:Math.ceil(cfg.TOTAL_ROUNDS/size),round:(s.round%size)+1,size},boardSize:{width:bs.G,height:bs.H},score:{last:s.score,best:s.best},turnCount:s.turn,coins:s.coins,inflation:s.inflation,consumables:{...s.consumables},mods:[...s.mods],anchorId:s.anchorId,doubleDoubleTileId:s.doubleDoubleTileId,doubleDouble:s.doubleDoubleTileId?cloneTile(s.set.find(t=>t.id===s.doubleDoubleTileId)):null,setSize:s.set.length,set:s.set.map(cloneTile),placedTileIds:[...s.placedTileIds],availableTileCount:availableTileCount(),machinePersistent:!!cfg.PERSIST_MACHINE_BETWEEN_ROUNDS,rerollsLeft:s.consumables.reroll,canUndo:canUndo(),shop:{nextType:s.nextShopType,resolved:s.intermissionResolved,open:s.shopOpen,type:s.shopType,offers:[...s.shopOffers],randomTilePrice:shopRandomPrice(),itemPrices:Object.fromEntries(availableShopItems().map(m=>[m.id,shopItemPrice(m.id)])),doubleDoublePrice:marketDoubleDoublePrice()},zeroStats:{...s.roundZero},hand:s.hand.filter(Boolean).map(cloneTile),reserve:s.reserve.map(cloneTile),board:s.pieces.map(p=>({id:p.id,tileId:p.tile.id,a:p.tile.a,b:p.tile.b,upgrade:p.tile.upgrade||0,source:p.tile.source||'base',doubleDouble:p.tile.id===s.doubleDoubleTileId,x:p.cubes[0].x,y:p.cubes[0].y,z:0,rr:p.rr})),turns:s.events.map(e=>deepClone(e))}
  }

  function debugText(){
    const x=snapshot(),up=x.set.filter(t=>t.upgrade).map(t=>`[${t.a}|${t.b}]★${t.upgrade}`).join(', ')||'-';
    const lines=[`ITERION DEBUG v${x.gameVersion}`,`Run ID: ${x.runId}`,`Seed: ${x.seed}`,`Result: ${x.status}${x.failureReason?` · ${x.failureReason}`:''}`,`Stage: ${x.stage.index}/${x.stage.total} · round ${x.stage.round}/${x.stage.size}`,`Round: ${x.round.index}/${x.round.total} · target=${x.round.target} · moves=${x.round.placements}/${x.round.maxPlacements}`,`Board: ${x.boardSize.width}x${x.boardSize.height} · Machine: ${x.board.length} pieces · unique=${new Set(x.placedTileIds).size}/${x.placedTileIds.length}`,`Set: ${x.setSize} tiles · available=${x.availableTileCount}`,`Last output: ${x.score.last}`,`Best output: ${x.score.best}`,`Coins: ${x.coins} · Inflation: ${x.inflation} · Tools: move=${x.consumables.move}, reroll=${x.consumables.reroll}, undo=${x.consumables.undo}`,`Anchor: ${s.anchorId||'-'} · Upgraded tiles: ${up}`,`Double Double: ${x.doubleDouble?`[${x.doubleDouble.a}|${x.doubleDouble.b}] id=${x.doubleDouble.id}`:'-'}`,`Next: ${x.shop.nextType} · open=${x.shop.open?'yes':'no'}${x.shop.open?` (${x.shop.type})`:''}`,`Round clears: ${x.round.clears.map(w=>`R${w.round} target=${w.target} output=${w.output} moves=${w.placements} machine=${w.machineSize} set=${w.setSize} reward=${w.reward} upgradeCoins=${w.upgradeCoins||0} anchor=[${w.anchor.a}|${w.anchor.b}]★${w.upgradeTier}`).join(' | ')||'-'}`,''];
    for(const v of x.turns){
      if(v.type==='reroll'){lines.push(`R${v.round} REROLL after move ${v.roundTurn} remaining=${v.remaining}`);continue}
      if(v.type==='opening-protection'){lines.push(`R1 OPENING PROTECTION ${v.source} -> [${v.tile.a}|${v.tile.b}]${v.replaced?` swapped=[${v.replaced.a}|${v.replaced.b}]`:''}`);continue}
      if(v.type==='consume'){lines.push(`R${v.round} USE ${v.item.toUpperCase()} after move ${v.roundTurn} remaining=${v.remaining}${v.maxPlacements?` maxMoves=${v.maxPlacements}`:''}`);continue}
      if(v.type==='undo'){lines.push(`R${v.round} UNDO after move ${v.roundTurn} remaining=${v.remaining}${v.undone?` reverted=T${v.undone.turn} [${v.undone.tile.a}|${v.undone.tile.b}] output=${v.undone.output}`:''}${v.preservedPurchases?` preservedShop=${v.preservedPurchases} spend=${v.preservedSpend}`:''}${v.coinShortfall?` fundingShortfall=${v.coinShortfall}`:''}`);continue}
      if(v.type==='upgrade-coins'){lines.push(`R${v.round}.${v.roundTurn} UPGRADE COINS +${v.amount} total=${v.coins} tiles=${v.activations.map(a=>`[${a.a}|${a.b}]★${a.tier}`).join(',')}`);continue}
      if(v.type==='coins'){lines.push(`R${v.round} CLEAR COINS +${v.amount} base=${v.breakdown?.base||0} quick=${v.breakdown?.quick||0} exact=${v.breakdown?.exact||0} total=${v.coins}`);continue}
      if(v.type==='tile-upgrade'){lines.push(`R${v.round} UPGRADE [${v.tile.a}|${v.tile.b}] ${v.from}>${v.to} overkill=x${v.ratio}`);continue}
      if(v.type==='anchor-set'){lines.push(`R${v.round} ANCHOR [${v.tile.a}|${v.tile.b}]★${v.tile.upgrade||0}`);continue}
      if(v.type==='opening-double'){lines.push(`R1 OPENING DOUBLE [${v.tile.a}|${v.tile.b}]`);continue}
      if(v.type==='board-expand'){lines.push(`STAGE ${v.stage} BOARD ${v.from.join('x')} > ${v.to.join('x')} offset=${v.offset.join(',')}`);continue}
      if(v.type==='stage-start'){lines.push(`STAGE ${v.stage} START R${v.round} coins=${v.coins} inflation=${v.inflation} available=${v.available} board=${v.board.join('x')}`);continue}
      if(v.type==='shop-scheduled'){lines.push(`R${v.round} NEXT ${v.shop.toUpperCase()}`);continue}
      if(v.type==='shop-open'){lines.push(`R${v.round} ${v.shop.toUpperCase()} OPEN coins=${v.coins} inflation=${v.inflation} available=${v.available}${v.offers?.length?` offers=${v.offers.join(',')}`:''}`);continue}
      if(v.type==='shop-buy'){lines.push(`R${v.round} SHOP BUY ${v.item} -${v.cost} coins=${v.coins} inflation=${v.inflationBefore}>${v.inflationAfter}`);continue}
      if(v.type==='tile-buy'){lines.push(`R${v.round} ${v.shop.toUpperCase()} ${v.mode.toUpperCase()} [${v.tile.a}|${v.tile.b}] id=${v.tile.id} delivery=${v.delivery||'-'} -${v.cost} coins=${v.coins} inflation=${v.inflationBefore}>${v.inflationAfter}`);continue}
      if(v.type==='double-double'){lines.push(`R${v.round} MARKET DOUBLE DOUBLE [${v.tile.a}|${v.tile.b}] id=${v.tile.id} -${v.cost} coins=${v.coins} inflation=${v.inflationBefore}>${v.inflationAfter}${v.previousTileId?` previous=${v.previousTileId}`:''}`);continue}
      if(v.type==='shop-close'){lines.push(`R${v.round} ${v.shop.toUpperCase()} CLOSE ${v.reason} coins=${v.coins} inflation=${v.inflation} available=${v.available}`);continue}
      if(v.type==='failure'){lines.push(`R${v.round} FAIL ${v.reason} after move ${v.roundTurn}`);continue}
      if(Number.isInteger(v.turn))lines.push(`T${v.turn} R${v.round}.${v.roundTurn} [${v.tile.a}|${v.tile.b}]${v.tile.upgrade?`★${v.tile.upgrade}`:''} ${v.dir} @${v.placement.x},${v.placement.y},r${v.placement.rr} trigger=${v.trigger} output=${v.output}${v.upgradeCoins?` coins=+${v.upgradeCoins}`:''} rebounds=${v.rebounds} start=${v.start}${v.flipped?' FLIPPED':''} reason=${v.reason} ops=${v.ops||'-'} routes=${v.routes||'-'} search=${v.search}${v.clear?' CLEAR':''}`)
    }
    return lines.join('\n')
  }

  function save(){try{const x=snapshot();localStorage.setItem('iterion.latestRun.v9',JSON.stringify(x));return x}catch(_){return snapshot()}}
  fresh(opts.seed);
  return{state:()=>s,config:cfg,target,stageIndex,boardSizeForStage,candidatesForIndex,legalHandMask,canInteract,beginPlacement,finishPlacement,reroll,canUseReroll,useMove,canUseMove,useUndo,canUndo,advance,rotateRoot,setRootRotation,fresh,snapshot,debugText,save,hasLegal,assessContinuation,maxPlacements,clearReward,clearRewardBreakdown,availableTileCount,shopItemPrice,shopRandomPrice,marketDoubleDoublePrice,marketModPrice,marketTargetCount,marketOfferInfo,canOpenShop,openShop,closeShop,buyShopItem,buyShopRandomTile,openIntermission,buyMarketMod,buyDoubleDouble,closeMarket,resolveIntermission}
}
return{createGame}
});
