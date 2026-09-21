const assert=require('assert');
const D=require('../data.js');
const E=require('../engine.js');
const Game=require('../game.js');

assert.strictEqual(D.VERSION,'0.42.0');

function purchase(seed){
  E.setBoardSize(18,24);
  const game=Game.createGame(E,{seed,FIRST_TILE_MUST_BE_DOUBLE:false,STARTING_COINS:50,TARGETS:Array(15).fill(1e15)}),s=game.state();
  assert.strictEqual(game.openShop(),true);
  const beforeRng=s.rngState,result=game.buyShopRandomTile();
  assert.strictEqual(result.ok,true);
  assert.match(result.tile.id,/^g2-d[0-6]-[0-6]$/);
  assert.deepStrictEqual(
    {source:result.tile.source,generation:result.tile.generation,powerMultiplier:result.tile.powerMultiplier},
    {source:'power-set',generation:2,powerMultiplier:2}
  );
  assert.strictEqual(result.delivery,'reserve');
  assert.strictEqual(s.reserve[0].id,result.tile.id,'a full hand receives the tile as the next physical draw');
  assert.strictEqual(s.setGeneration,1,'buying RANDOM DOMINO must not unlock the next generation');
  assert.strictEqual(game.availableTileCount(),28,'the advanced tile must not extend the current generation');
  assert.notStrictEqual(s.rngState,beforeRng);
  return{game,s,result};
}

{
  const a=purchase(301),b=purchase(301);
  assert.strictEqual(a.result.tile.id,b.result.tile.id);
  assert.strictEqual(a.s.rngState,b.s.rngState,'the same seed and actions must preserve RNG determinism');
}

{
  E.setBoardSize(18,24);
  const game=Game.createGame(E,{seed:302,FIRST_TILE_MUST_BE_DOUBLE:false,STARTING_COINS:50,HAND_SIZE:6,TARGETS:Array(15).fill(1e15)}),s=game.state();
  s.hand[5]=null;
  assert.strictEqual(game.openShop(),true);
  const bought=game.buyShopRandomTile();
  assert.strictEqual(bought.ok,true);assert.strictEqual(bought.delivery,'hand');
  assert.strictEqual(s.hand[5].id,bought.tile.id,'an empty hand slot receives the tile immediately');
  assert(game.snapshot().set.some(t=>t.id===bought.tile.id),'snapshot keeps the physical identity');
}

{
  const{game,s,result}=purchase(303),bought=result.tile;
  s.shopOpen=false;s.shopType=null;
  s.placedTileIds=s.set.filter(t=>(t.generation||1)===1).map(t=>t.id);
  s.reserve=[];s.hand=[bought,null,null,null,null];s.pieces=[];
  const candidate=game.candidatesForIndex(0)[0],ctx=game.beginPlacement(0,candidate);
  assert.strictEqual(ctx.ok,true);game.finishPlacement(ctx);
  assert.strictEqual(s.setGeneration,2,'the exhausted current generation unlocks without waiting for the bonus tile');
  assert.strictEqual(s.set.filter(t=>t.id===bought.id).length,1,'the claimed tile must not reappear at unlock');
  assert.strictEqual(s.set.filter(t=>(t.generation||1)===2).length,28,'the next deck remains 28 unique physical tiles');
}

{
  E.setBoardSize(18,24);
  const game=Game.createGame(E,{seed:304,FIRST_TILE_MUST_BE_DOUBLE:false,STARTING_COINS:50,STARTING_UNDO_CONSUMABLES:1,TARGETS:Array(15).fill(1e15)}),s=game.state();
  const ctx=game.beginPlacement(0,game.candidatesForIndex(0)[0]);assert.strictEqual(ctx.ok,true);game.finishPlacement(ctx);
  assert.strictEqual(game.openShop(),true);const bought=game.buyShopRandomTile();assert.strictEqual(bought.ok,true);game.closeShop();
  assert.strictEqual(game.useUndo().ok,true);
  const restored=game.state();
  assert.strictEqual(restored.set.filter(t=>t.id===bought.tile.id).length,1,'Undo preserves the purchased physical tile');
  assert(restored.hand.some(t=>t?.id===bought.tile.id)||restored.reserve.some(t=>t?.id===bought.tile.id));
  assert.strictEqual(restored.rngState,s.rngState,'Undo preserves RNG consumed by the purchase');
}

console.log('v0.42.0 RANDOM DOMINO regression tests passed');
