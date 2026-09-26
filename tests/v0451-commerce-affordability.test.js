const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const D=require('../data.js'),E=require('../engine.js'),G=require('../game.js');

function create(seed,coins){
  E.setBoardSize(18,24);
  return G.createGame(E,{seed,STARTING_COINS:coins,FIRST_TILE_MUST_BE_DOUBLE:false,TARGETS:Array(15).fill(1e15)});
}
function prepareMarket(game,round=2){
  const s=game.state(),tile=s.set.find(t=>t.id==='d1-2'),piece=E.pieceFrom(tile,4,4,0,0,1);piece.tile={...tile};
  s.pieces=[piece];s.placedTileIds=[tile.id];s.round=round;s.cleared=true;s.running=false;s.pendingCircuit=null;s.pendingModPlacement=null;s.shopOpen=false;s.shopType=null;s.nextShopType='market';s.intermissionResolved=false;return s
}

{
  const game=create(45101,0),s=game.state(),availability=game.shopPurchaseAvailability();
  assert.equal(availability.hasAny,true,'fresh Tile Shop should have real inventory');
  assert.equal(availability.canAffordAny,false);
  assert.equal(availability.blockedByCoins,true);
  assert.equal(game.openShop(),false,'normal Shop must not open when no item is affordable');
  const close=s.events.at(-1);assert.equal(close.type,'shop-close');assert.equal(close.shop,'shop');assert.equal(close.reason,'insufficient-coins');assert.equal(close.opened,false);
  assert.equal(s.shopOpen,false);
  assert.equal(game.openShop({allowUnaffordable:true}),true,'tutorial-only bypass may still present the real Shop');
  game.closeShop();
}

{
  const game=create(45102,1),s=game.state();
  assert.equal(game.openShop(),true,'the cheapest affordable Shop item keeps the Shop open');
  const bought=game.buyShopRandomTile();assert.equal(bought.ok,true);assert.equal(bought.cost,1);
  assert.equal(bought.shopClosedReason,'insufficient-coins','Shop closes immediately once the remaining balance cannot buy anything');
  assert.equal(s.shopOpen,false);
  const close=[...s.events].reverse().find(e=>e.type==='shop-close'&&e.shop==='shop');assert.equal(close.reason,'insufficient-coins');
}

{
  const game=create(45103,0),s=prepareMarket(game),roundBefore=s.round,marketsBefore=s.marketCount||0,eventCursor=s.events.length;
  assert.equal(game.openIntermission(),true,'an unaffordable scheduled Market resolves rather than blocking progression');
  assert.equal(s.round,roundBefore+1,'unaffordable Market advances directly to the next round');
  assert.equal(s.shopOpen,false);assert.equal(s.marketCount,marketsBefore+1,'a closed Market still counts as a survived Market for persistent Mod age');
  const events=s.events.slice(eventCursor),opened=events.find(e=>e.type==='shop-open'&&e.shop==='market'),closed=events.find(e=>e.type==='shop-close'&&e.shop==='market');
  assert(opened?.offers?.length>0,'fixture must contain real valid Market offers');assert.equal(closed?.reason,'insufficient-coins');
}

{
  const game=create(45104,100),s=prepareMarket(game),roundBefore=s.round;
  assert.equal(game.openIntermission(),true);assert.equal(s.round,roundBefore,'affordable Market must remain open instead of auto-advancing');assert.equal(s.shopOpen,true);assert.equal(s.shopType,'market');
  const availability=game.marketOfferAffordability();assert.equal(availability.hasAny,true);assert.equal(availability.canAffordAny,true);assert.equal(availability.blockedByCoins,false);
}

{
  const ui=fs.readFileSync(path.join(__dirname,'..','ui.js'),'utf8'),tutorial=fs.readFileSync(path.join(__dirname,'..','tutorial-controller.js'),'utf8');
  assert.match(ui,/MARKET CLOSED · INSUFFICIENT COINS/);assert.match(ui,/TILE SHOP CLOSED · INSUFFICIENT COINS/);
  assert.match(tutorial,/allowUnaffordable:true/,'BASICS may show the Shop pedagogically even if its sandbox balance is empty');
}

console.log('commerce insufficient-coins UX regression tests passed');
