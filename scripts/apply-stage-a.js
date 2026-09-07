const fs=require('fs');

const gamePath='game.js';
let game=fs.readFileSync(gamePath,'utf8');
const oldBlock=`  function openIntermission(){
    if(!s.cleared||s.intermissionResolved||s.nextShopType!=='market'||s.shopOpen)return false;
    s.shopOpen=true;s.shopType='market';s.shopOffers=[];s.marketBuys=[];
    s.events.push({type:'shop-open',round:s.round+1,shop:'market',offers:[],coins:s.coins,inflation:s.inflation,available:availableTileCount()});return true
  }
  function resolveIntermission(reason='continue'){
    if(!s.shopOpen||s.shopType!=='market')return false;
    s.events.push({type:'shop-close',round:s.round+1,shop:'market',reason,coins:s.coins,inflation:s.inflation,available:availableTileCount()});
    s.shopOpen=false;s.shopType=null;s.shopOffers=[];s.nextShopType='none';s.intermissionResolved=true;return true
  }
  function buyDoubleDouble(){
    if(!s.shopOpen||s.shopType!=='market')return{ok:false,reason:'shop'};
    const candidates=s.set.filter(t=>isDouble(t)&&t.a>0&&t.id!==s.doubleDoubleTileId);
    if(!candidates.length)return{ok:false,reason:'no-double'};
    const cost=marketDoubleDoublePrice();if(s.coins<cost)return{ok:false,reason:'coins'};
    const tile=candidates[Math.floor(rnd()*candidates.length)],previousTileId=s.doubleDoubleTileId||null,purchase=applyPurchase(cost);s.doubleDoubleTileId=tile.id;
    s.events.push({type:'double-double',round:s.round+1,shop:'market',tile:cloneTile(tile),previousTileId,candidateCount:candidates.length,baseCost:cfg.MARKET_DOUBLE_DOUBLE_COST||8,cost,coins:s.coins,...purchase});
    return{ok:true,tile:cloneTile(tile),previousTileId,candidateCount:candidates.length,cost,inflation:s.inflation}
  }
  function closeMarket(){return resolveIntermission('continue')}`;
const newBlock=`  function marketMods(){return M.all().filter(m=>m.market)}
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
  function marketTargetCount(id){return marketTargetTiles(id).length}
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
    const candidates=marketTargetTiles(id);if(!candidates.length)return{ok:false,reason:'no-target'};
    const cost=marketModPrice(id);if(s.coins<cost)return{ok:false,reason:'coins'};
    const tile=candidates[Math.floor(rnd()*candidates.length)],previousTileId=id==='double-double'?(s.doubleDoubleTileId||null):null,purchase=applyPurchase(cost);
    if(id==='double-double')s.doubleDoubleTileId=tile.id;else return{ok:false,reason:'unsupported'};
    const record={mod:id,tile:cloneTile(tile),targetTileId:tile.id,cost,inflationBefore:purchase.inflationBefore,inflationAfter:purchase.inflationAfter};s.marketBuys.push(record);
    s.events.push({type:'double-double',mod:id,round:s.round+1,shop:'market',tile:cloneTile(tile),targetTileId:tile.id,previousTileId,candidateCount:candidates.length,baseCost:Number(cfg[m.marketCostKey])||0,cost,coins:s.coins,...purchase});
    return{ok:true,mod:id,tile:cloneTile(tile),targetTileId:tile.id,previousTileId,candidateCount:candidates.length,cost,inflation:s.inflation}
  }
  function buyDoubleDouble(){return buyMarketMod('double-double')}
  function closeMarket(){return resolveIntermission('continue')}`;
if(!game.includes(oldBlock))throw new Error('Stage A market block no longer matches stable baseline');
game=game.replace(oldBlock,newBlock);
const oldReturn=`return{state:()=>s,config:cfg,target,stageIndex,boardSizeForStage,candidatesForIndex,legalHandMask,canInteract,beginPlacement,finishPlacement,reroll,canUseReroll,useMove,canUseMove,useUndo,canUndo,advance,rotateRoot,setRootRotation,fresh,snapshot,debugText,save,hasLegal,assessContinuation,maxPlacements,clearReward,clearRewardBreakdown,availableTileCount,shopItemPrice,shopRandomPrice,marketDoubleDoublePrice,canOpenShop,openShop,closeShop,buyShopItem,buyShopRandomTile,openIntermission,buyDoubleDouble,closeMarket,resolveIntermission}`;
const newReturn=`return{state:()=>s,config:cfg,target,stageIndex,boardSizeForStage,candidatesForIndex,legalHandMask,canInteract,beginPlacement,finishPlacement,reroll,canUseReroll,useMove,canUseMove,useUndo,canUndo,advance,rotateRoot,setRootRotation,fresh,snapshot,debugText,save,hasLegal,assessContinuation,maxPlacements,clearReward,clearRewardBreakdown,availableTileCount,shopItemPrice,shopRandomPrice,marketDoubleDoublePrice,marketModPrice,marketTargetCount,marketOfferInfo,canOpenShop,openShop,closeShop,buyShopItem,buyShopRandomTile,openIntermission,buyMarketMod,buyDoubleDouble,closeMarket,resolveIntermission}`;
if(!game.includes(oldReturn))throw new Error('Stage A public API line no longer matches stable baseline');
game=game.replace(oldReturn,newReturn);
fs.writeFileSync(gamePath,game);

const test=`const assert=require('assert');
const D=require('../data.js');
const E=require('../engine.js');
const Game=require('../game.js');

function piece(tile,x,id){const p=E.pieceFrom(tile,x,0,0,0,id);p.tile={...tile};return p}
function prepareMarket(game,round=2){const s=game.state();s.cleared=true;s.round=round;s.nextShopType='market';s.intermissionResolved=false;s.shopOpen=false;s.shopType=null;s.shopOffers=[];return s}

assert.strictEqual(D.VERSION,'0.22.1','version must remain stable until the complete v0.23 implementation is green');
assert.strictEqual(D.ENGINE_VERSION,'0.13.0-double-double','Stage A must not change the engine version');
assert.strictEqual(D.MARKET_OFFER_COUNT,3);
assert.strictEqual(D.MARKET_PURCHASE_LIMIT,1);

{
  E.setBoardSize(18,24);
  const game=Game.createGame(E,{seed:2301,STARTING_COINS:100}),s=game.state(),by=id=>s.set.find(t=>t.id===id);
  const placedDouble=by('d3-3'),handOnlyDouble=by('d5-5'),zeroDouble=by('d0-0');
  s.pieces=[piece(placedDouble,0,101),piece(zeroDouble,8,102)];s.placedTileIds=[placedDouble.id,zeroDouble.id];
  s.hand=[handOnlyDouble,null,null,null,null];s.reserve=s.set.filter(t=>!s.placedTileIds.includes(t.id)&&t.id!==handOnlyDouble.id);
  s.coins=100;s.inflation=2;prepareMarket(game);
  assert.strictEqual(game.openIntermission(),true);
  assert.deepStrictEqual(s.shopOffers,['double-double'],'Stage A has one valid Market mod, so the Market may present one of up to three offers');
  const info=game.marketOfferInfo('double-double');
  assert.strictEqual(info.targetCount,1,'only the placed non-zero double is eligible');
  assert.strictEqual(info.price,10,'global Inflation applies to the Market price');
  assert.strictEqual(info.canBuy,true);
  const buy=game.buyDoubleDouble();
  assert.strictEqual(buy.ok,true);
  assert.strictEqual(buy.tile.id,placedDouble.id,'hand/reserve doubles and [0|0] must never be selected');
  assert.strictEqual(s.doubleDoubleTileId,placedDouble.id);
  assert.strictEqual(s.marketBuys.length,1);
  assert.strictEqual(s.inflation,3);
  const again=game.buyDoubleDouble();
  assert.strictEqual(again.ok,false);
  assert.strictEqual(again.reason,'limit','only one Market mod may be bought per Market');
  const event=s.events.find(e=>e.type==='double-double');
  assert.strictEqual(event.targetTileId,placedDouble.id);
  assert.strictEqual(event.cost,10);
  assert.strictEqual(event.inflationBefore,2);
  assert.strictEqual(event.inflationAfter,3);

  game.closeMarket();
  const secondDouble=piece(handOnlyDouble,12,103);s.pieces.push(secondDouble);s.placedTileIds.push(handOnlyDouble.id);s.coins=100;prepareMarket(game,5);
  assert.strictEqual(game.openIntermission(),true);
  assert.deepStrictEqual(s.shopOffers,['double-double'],'Double Double may be offered again when another placed target exists');
  assert.strictEqual(game.marketTargetCount('double-double'),1,'the current Double Double target is excluded when transferring');
  const transfer=game.buyDoubleDouble();
  assert.strictEqual(transfer.ok,true);
  assert.strictEqual(transfer.previousTileId,placedDouble.id);
  assert.strictEqual(transfer.tile.id,handOnlyDouble.id,'a later Market transfers Double Double to another placed double');
}

{
  E.setBoardSize(18,24);
  const entry=E.pieceFrom({a:1,b:5},0,0,0,0,3);entry.tile={id:'entry',a:1,b:5,upgrade:0,source:'test'};
  const dd=E.pieceFrom({a:5,b:5},4,0,0,0,1);dd.tile={id:'dd',a:5,b:5,upgrade:0,source:'test'};
  const zero=E.pieceFrom({a:5,b:0},8,0,0,0,2);zero.tile={id:'zero',a:5,b:0,upgrade:0,source:'test'};
  const boosted=E.bestSignal(entry.id,[entry,dd,zero],{initialOutput:6,doubleDoublePieceId:dd.id});
  assert.strictEqual(boosted.output,3750,'Double Double scoring must remain unchanged');
  const ddOps=boosted.events.filter(e=>e.type==='op'&&e.piece===dd.id);
  assert.strictEqual(ddOps.length,2);
  assert.strictEqual(ddOps[0].factor,25);
  assert.strictEqual(ddOps[0].doubleDouble,true);
  assert.strictEqual(ddOps[1].factor,5);
  assert.strictEqual(ddOps[1].doubleDouble,false);
}

console.log('v0.23 Stage A Market / Double Double regression tests passed');
`;
fs.writeFileSync('tests/v023-stage-a.test.js',test);
fs.unlinkSync(__filename);
