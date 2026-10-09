const assert=require('node:assert/strict');
const Engine=require('../engine.js');
const Game=require('../game.js');

Engine.setBoardSize(18,24);
let sampleSeed=null;
for(let seed=1;seed<=128;seed++){
  const plain=Game.createGame(Engine,{seed});
  if(plain.state().hand.some(tile=>tile?.id==='d0-0')){sampleSeed=seed;break}
}
assert.ok(sampleSeed!=null,'unrestricted opening must be able to deal the real [0|0]');
for(const seed of [sampleSeed,490162786,20261009,918273,71]){
  const game=Game.createGame(Engine,{seed,AVOID_ZERO_DOUBLE_FIRST_HAND:true});
  const copy=Game.createGame(Engine,{seed,AVOID_ZERO_DOUBLE_FIRST_HAND:true});
  const a=game.state(),b=copy.state();
  assert.equal(a.turn,0);
  assert.equal(a.hand[0].a,a.hand[0].b,'first tile remains an actual double');
  assert.notEqual(a.hand[0].a,0,'protected first double is non-zero');
  assert.equal(a.hand.some(tile=>tile?.id==='d0-0'),false,'zero double must not be in the complete initial Hand');
  assert.equal(a.reserve.some(tile=>tile?.id==='d0-0'),true,'the same physical zero double stays in reserve');
  assert.deepEqual(a.hand.map(tile=>tile?.id),b.hand.map(tile=>tile?.id),'same seed yields the same protected hand');
  assert.deepEqual(a.reserve.map(tile=>tile.id),b.reserve.map(tile=>tile.id),'same seed yields the same protected reserve');
  const ids=[...a.hand.filter(Boolean),...a.reserve,...a.pieces.map(piece=>piece.tile)].map(tile=>tile.id);
  assert.equal(ids.length,new Set(ids).size,'no tile instance appears twice');
  assert.equal(a.events.filter(event=>event.type==='opening-zero-deferred').length,1);
  assert.match(game.debugText(),/OPENING ZERO DEFERRED/);
  const restored=Game.createGame(Engine,{seed:1});
  assert.equal(restored.restoreState(game.exportState()),true);
  assert.deepEqual(restored.state().hand.map(tile=>tile?.id),a.hand.map(tile=>tile?.id));
  assert.equal(restored.state().reserve.some(tile=>tile.id==='d0-0'),true);
}
const regular=Game.createGame(Engine,{seed:sampleSeed});
assert.ok(regular.state().hand.some(tile=>tile?.id==='d0-0'),'unprotected runs keep original seeded opening');
assert.equal(regular.state().events.some(event=>event.type==='opening-zero-deferred'),false);
console.log('Fresh first-hand zero double deferral and tile identity regressions passed');
