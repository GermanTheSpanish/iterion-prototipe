const assert=require('assert');
const D=require('../data.js');
const E=require('../engine.js');
const Game=require('../game.js');

function piece(tile,x,id){const p=E.pieceFrom(tile,x,0,0,0,id);p.tile={...tile};return p}
function prepareMarket(game,round=2){const s=game.state();s.cleared=true;s.round=round;s.nextShopType='market';s.intermissionResolved=false;s.shopOpen=false;s.shopType=null;s.shopOffers=[];return s}

assert.strictEqual(D.VERSION,'0.23.0','version must remain stable until the complete v0.23 implementation is green');
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
  assert(s.shopOffers.includes('double-double'),'Double Double must remain a valid Market offer when it has a placed target');
  assert(s.shopOffers.length<=D.MARKET_OFFER_COUNT);
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
  assert(s.shopOffers.includes('double-double'),'Double Double may be offered again when another placed target exists');
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
