const assert=require('node:assert/strict');
const E=require('../engine.js');
const G=require('../game.js');

const stateEngine={...E,hasLegalMove:()=>true};
const clone=x=>JSON.parse(JSON.stringify(x));

function supply(s){
  return{
    setGeneration:s.setGeneration,
    set:clone(s.set),
    hand:clone(s.hand),
    reserve:clone(s.reserve),
    placedTileIds:[...s.placedTileIds],
    rngState:s.rngState
  };
}

function assertUniquePhysicalLocations(s){
  const ids=[...s.placedTileIds,...s.hand.filter(Boolean).map(t=>t.id),...s.reserve.map(t=>t.id)];
  assert.equal(new Set(ids).size,ids.length,'one physical tile ID must not exist in more than one live location');
  assert.equal(ids.length,s.set.length,'every owned physical tile must be represented exactly once across machine, Hand or reserve');
}

function makeTransitionGame(seed,{purchase=false}={}){
  E.setBoardSize(18,24);
  const game=G.createGame(stateEngine,{
    seed,
    FIRST_TILE_MUST_BE_DOUBLE:false,
    STARTING_COINS:100,
    STARTING_REROLL_CONSUMABLES:2,
    STARTING_UNDO_CONSUMABLES:1,
    TARGETS:Array(15).fill(Number.MAX_SAFE_INTEGER)
  });
  const s=game.state();
  const root=s.set.find(t=>t.id==='d2-2');
  const last=s.set.find(t=>t.id==='d2-4');
  const rootPiece=E.pieceFrom(root,6,8,0,0,1);rootPiece.tile={...root};

  s.pieces=[rootPiece];
  s.placedTileIds=[root.id];
  s.hand=[last,null,null,null,null];
  s.reserve=[];
  s.idc=1;
  s.turn=1;
  s.roundTurn=1;
  s.cleared=false;
  s.blocked=false;
  s.needsReroll=false;
  s.failureReason=null;
  s.running=false;
  s.pendingCircuit=null;
  s.pendingModPlacement=null;
  s.events=[];

  let bought=null;
  if(purchase){
    const offer=game.snapshot().shop.tileOffers[0].tile;
    assert.equal(game.openShop(),true);
    const result=game.buyShopTileOffer(offer.id);
    assert.equal(result.ok,true);
    assert.equal(result.delivery,'hand');
    bought=result.tile;
    assert.equal(game.closeShop(),true);
  }

  s.set=purchase?[root,last,s.set.find(t=>t.id===bought.id)]:[root,last];
  return{game,s,bought};
}

function crossGeneration(game){
  const ctx=game.beginPlacement(0,{x:10,y:8,rr:0});
  assert.equal(ctx.ok,true);
  const result=game.finishPlacement(ctx);
  assert.equal(result.ok,true);
  return result;
}

{
  const{game,s}=makeTransitionGame(440101);
  const beforeCoins=s.coins,beforeFree=s.freeReroll,beforeStored=s.consumables.reroll;
  crossGeneration(game);
  assert.equal(s.setGeneration,2,'placing the final old-generation tile must start the next deck');
  assert.equal(s.hand.filter(Boolean).length,game.handSizeForRound(),'deck transition must refill the Hand to normal capacity');
  assert(s.hand.every(t=>t&&t.generation===2),'the completed Hand must come from the new generation');
  assert.equal(s.coins,beforeCoins,'deck transition refill must not charge Coins');
  assert.equal(s.freeReroll,beforeFree,'deck transition refill must not consume the free Reroll');
  assert.equal(s.consumables.reroll,beforeStored,'deck transition refill must not consume a stored Reroll');
  assert.equal(s.events.filter(e=>e.type==='reroll').length,0,'deck transition refill is not a Reroll');
  assert.equal(s.cleared,false,'refill must not depend on reaching the Target');
  assertUniquePhysicalLocations(s);
}

{
  const{game,s,bought}=makeTransitionGame(440102,{purchase:true});
  const coinsAfterPurchase=s.coins,rerolls=s.consumables.reroll;
  crossGeneration(game);
  assert.equal(s.setGeneration,2);
  assert.equal(s.hand.filter(Boolean).length,game.handSizeForRound());
  assert(s.hand.every(t=>t&&t.generation===2));
  assert.equal(s.set.filter(t=>t.id===bought.id).length,1,'a bought next-pack tile must remain one physical instance');
  assert.equal(s.hand.filter(t=>t?.id===bought.id).length,1,'the bought tile already in Hand must be preserved during refill');
  assert.equal(s.reserve.filter(t=>t.id===bought.id).length,0,'the bought tile must be removed from the generated reserve pool');
  assert.equal(s.set.filter(t=>(t.generation||1)===2).length,28,'the unlocked generation still has exactly one instance of each printed tile');
  assert.equal(s.coins,coinsAfterPurchase,'transition itself must not add any purchase cost');
  assert.equal(s.consumables.reroll,rerolls);
  assertUniquePhysicalLocations(s);
}

{
  const{game,s}=makeTransitionGame(440103);
  crossGeneration(game);
  const expected=supply(s),saved=game.exportState();
  const restored=G.createGame(stateEngine,{seed:999,FIRST_TILE_MUST_BE_DOUBLE:false,TARGETS:Array(15).fill(Number.MAX_SAFE_INTEGER)});
  assert.equal(restored.restoreState(saved),true);
  assert.deepEqual(supply(restored.state()),expected,'save/restore must preserve the exact post-transition supply and RNG state');
  assertUniquePhysicalLocations(restored.state());
}

{
  const{game,s}=makeTransitionGame(440104);
  const before=supply(s);
  crossGeneration(game);
  const after=supply(s);
  assert.equal(game.useUndo().ok,true);
  assert.deepEqual(supply(game.state()),before,'Undo must restore the exact pre-transition deck state');
  assert(!game.state().events.some(e=>e.type==='power-set'),'Undo must remove the reverted generation transition event');
  crossGeneration(game);
  assert.deepEqual(supply(game.state()),after,'replaying after Undo must reproduce the same new-generation Hand and reserve');
  assertUniquePhysicalLocations(game.state());
}

{
  const a=makeTransitionGame(440105),b=makeTransitionGame(440105);
  crossGeneration(a.game);crossGeneration(b.game);
  assert.deepEqual(a.s.hand,b.s.hand,'same seed must produce the same full new-generation Hand');
  assert.deepEqual(a.s.reserve,b.s.reserve,'same seed must preserve the same remaining reserve order');
  assert.equal(a.s.rngState,b.s.rngState,'same seed must finish the transition at the same RNG state');
}

console.log('deck transition full-Hand refill regression: ok');
