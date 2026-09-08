const assert=require('assert');
const E=require('../engine.js');
const Data=require('../data.js');
const Game=require('../game.js');

function placeOpening(game){
  const s=game.state();
  const i=s.hand.findIndex(t=>t&&t.a===t.b);
  assert(i>=0,'opening hand must contain a double');
  const c=game.candidatesForIndex(i)[0];
  assert(c,'opening double must have a root placement');
  const begun=game.beginPlacement(i,c);
  assert.strictEqual(begun.ok,true);
  return game.finishPlacement(begun);
}

function assertPhysicalSetIntegrity(s){
  const ids=[...s.placedTileIds,...s.hand.filter(Boolean).map(t=>t.id),...s.reserve.map(t=>t.id)];
  assert.strictEqual(ids.length,s.set.length,'placed + hand + reserve must account for every physical tile');
  assert.strictEqual(new Set(ids).size,ids.length,'opening protection must never duplicate a physical tile');
}

function testOpeningProtectionFixesKnownBrickSeed(){
  const game=Game.createGame(E,{seed:1882054734});
  const s=game.state();
  assert.strictEqual(s.hand[0].id,'d2-2','regression seed should still open with [2|2]');
  const result=placeOpening(game);
  assert.strictEqual(result.blocked,false,'known [2|2] opening must not brick after move 1');
  assert.strictEqual(game.hasLegal(),true,'opening protection must guarantee a legal continuation');
  const event=s.events.find(e=>e.type==='opening-protection'&&e.source==='draw');
  assert(event,'known brick seed should record opening draw protection');
  assert(event.tile.a===2||event.tile.b===2,'forced continuation must connect to [2|2]');
  assertPhysicalSetIntegrity(s);
}

function testOpeningProtectionAlsoCoversReroll(){
  const game=Game.createGame(E,{seed:2});
  const s=game.state(),by=id=>s.set.find(t=>t.id===id);
  const opening=by('d2-2'),piece=E.pieceFrom(opening,8,10,0,0,1);piece.tile={...opening};
  s.pieces=[piece];s.placedTileIds=[opening.id];s.turn=1;s.roundTurn=1;s.round=0;s.running=false;s.cleared=false;s.blocked=false;s.needsReroll=false;s.failureReason=null;s.consumables.reroll=1;
  const handIds=['d0-0','d0-1','d1-1','d3-3','d4-4'];s.hand=handIds.map(by);
  const used=new Set([opening.id,...handIds]);s.reserve=s.set.filter(t=>!used.has(t.id));s.events=[];
  assert.strictEqual(game.hasLegal(),false,'fixture must begin with a dead hand against [2|2]');
  const result=game.reroll();
  assert.strictEqual(result.ok,true);
  assert.strictEqual(result.blocked,false,'opening reroll must not end the run');
  assert.strictEqual(game.hasLegal(),true,'opening reroll must guarantee a legal tile');
  const event=s.events.find(e=>e.type==='opening-protection'&&e.source==='reroll');
  assert(event,'reroll protection must be observable in run telemetry');
  assert(event.tile.a===2||event.tile.b===2,'reroll protection tile must connect to [2|2]');
  assertPhysicalSetIntegrity(s);
}

function testDoubleDoubleIsRandomAndTransfers(){
  const game=Game.createGame(E,{seed:12345,STARTING_COINS:100});
  const s=game.state(),doubles=s.set.filter(t=>t.a===t.b&&t.a>0);
  s.pieces=doubles.map((tile,i)=>{const p=E.pieceFrom(tile,(i%3)*6,Math.floor(i/3)*6,0,0,100+i);p.tile={...tile};return p});
  s.placedTileIds=doubles.map(t=>t.id);s.shopOpen=true;s.shopType='market';s.shopOffers=['double-double'];s.marketBuys=[];s.coins=100;s.inflation=0;
  const first=game.buyDoubleDouble();
  assert.strictEqual(first.ok,true);
  assert.strictEqual(first.cost,8);
  assert.strictEqual(first.candidateCount,6,'six placed non-zero doubles are eligible in the fixture');
  assert.strictEqual(first.tile.a,first.tile.b);
  assert(first.tile.a>0,'[0|0] must never be selected as Double Double');
  assert.strictEqual(s.doubleDoubleTileId,first.tile.id);
  const firstId=first.tile.id;

  s.shopOpen=true;s.shopType='market';s.shopOffers=['double-double'];s.marketBuys=[];
  const second=game.buyDoubleDouble();
  assert.strictEqual(second.ok,true,'Double Double may transfer in a later Market');
  assert.strictEqual(second.cost,9,'later Market price must include global Inflation');
  assert.strictEqual(second.previousTileId,firstId);
  assert.notStrictEqual(second.tile.id,firstId,'transferring Double Double must move away from the active physical tile');
  assert.strictEqual(second.candidateCount,5,'active placed double must be excluded from the next Market target roll');
  assert.strictEqual(s.doubleDoubleTileId,second.tile.id);
  assert.match(game.debugText(),/MARKET DOUBLE DOUBLE/,'random Double Double result must remain visible in debug data');
}

function testExactDominoRemoved(){
  const game=Game.createGame(E,{seed:1});
  assert.strictEqual(Data.MARKET_EXACT_TILE_COST,undefined,'Exact Domino price config must be removed');
  assert.strictEqual(game.marketExactPrice,undefined,'Exact Domino pricing API must be removed');
  assert.strictEqual(game.buyMarketExactTile,undefined,'Exact Domino purchase API must be removed');
  assert.strictEqual(game.snapshot().shop.exactPrice,undefined,'snapshot must no longer advertise Exact Domino');
}

testOpeningProtectionFixesKnownBrickSeed();
testOpeningProtectionAlsoCoversReroll();
testDoubleDoubleIsRandomAndTransfers();
testExactDominoRemoved();
console.log('v0.20 gameplay regression tests passed');
