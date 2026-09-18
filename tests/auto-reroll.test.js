const assert=require('assert');
const E=require('../engine.js');
const Data=require('../data.js');
const Game=require('../game.js');

function deadOpeningFixture({free=1,stored=0}={}){
  E.setBoardSize(18,24);
  const game=Game.createGame(E,{seed:2,STARTING_COINS:100});
  const s=game.state(),by=id=>s.set.find(t=>t.id===id);
  const opening=by('d2-2'),piece=E.pieceFrom(opening,8,10,0,0,1);piece.tile={...opening};
  s.pieces=[piece];s.placedTileIds=[opening.id];s.turn=1;s.roundTurn=1;s.round=0;
  s.running=false;s.cleared=false;s.blocked=false;s.needsReroll=false;s.failureReason=null;
  s.freeReroll=free;s.consumables.reroll=stored;
  const handIds=['d0-0','d0-1','d1-1','d3-3','d4-4'];s.hand=handIds.map(by);
  const used=new Set([opening.id,...handIds]);s.reserve=s.set.filter(t=>!used.has(t.id));s.events=[];
  assert.strictEqual(game.hasLegal(),false,'fixture must begin with no legal placement against [2|2]');
  return game
}

function testFreeRerollAutoConsumes(){
  const game=deadOpeningFixture({free:1,stored:0});
  game.assessContinuation();
  const s=game.state(),auto=s.events.find(e=>e.type==='reroll'&&e.automatic);
  assert(auto,'no-legal state must emit an automatic reroll event');
  assert.strictEqual(auto.source,'free');
  assert.strictEqual(s.freeReroll,0,'automatic recovery must consume the free reroll');
  assert.strictEqual(s.consumables.reroll,0);
  assert.strictEqual(s.needsReroll,false,'automatic recovery must not wait for player confirmation');
  assert.strictEqual(s.blocked,false);
  assert.strictEqual(game.hasLegal(),true,'opening protection keeps the automatically rerolled hand playable');
  assert.match(game.debugText(),/AUTO REROLL source=free/);
}

function testStoredRerollAutoConsumes(){
  const game=deadOpeningFixture({free:0,stored:1});
  game.assessContinuation();
  const s=game.state(),auto=s.events.find(e=>e.type==='reroll'&&e.automatic);
  assert(auto,'stored reroll must also auto-consume when the hand is dead');
  assert.strictEqual(auto.source,'stored');
  assert.strictEqual(s.freeReroll,0);
  assert.strictEqual(s.consumables.reroll,0);
  assert.strictEqual(s.needsReroll,false);
  assert.strictEqual(s.blocked,false);
  assert.strictEqual(game.hasLegal(),true);
}

function testNoRerollEndsRun(){
  const game=deadOpeningFixture({free:0,stored:0}),s=game.state();
  s.consumables.undo=2;s.undoFrame={sentinel:true};s.coins=100;
  game.assessContinuation();
  assert.strictEqual(s.blocked,true);
  assert.strictEqual(s.failureReason,'no-legal-moves');
  assert.strictEqual(s.needsReroll,false);
  assert.strictEqual(game.canUseReroll(),false);
  assert.strictEqual(game.canUndo(),false,'Undo must not rescue a run after no-legal-moves exhausts rerolls');
  assert.strictEqual(game.canOpenShop(),false,'Shop must not rescue a run after no-legal-moves exhausts rerolls');
  const recovery=game.recoveryOptions();
  assert.strictEqual(recovery.recoverable,false);
  assert.strictEqual(recovery.shopRescue,false);
  assert.strictEqual(recovery.automaticRerollPending,false);
}

function testLegacyWaitingSaveResolvesOnRestore(){
  const source=deadOpeningFixture({free:1,stored:0}),saved=source.exportState();
  saved.state.needsReroll=true;saved.state.blocked=false;saved.state.failureReason=null;
  const restored=Game.createGame(E,{seed:999,STARTING_COINS:100});
  assert.strictEqual(restored.restoreState(saved),true);
  assert.strictEqual(restored.state().needsReroll,false);
  assert.strictEqual(restored.state().freeReroll,0);
  assert.strictEqual(restored.state().blocked,false);
  assert.strictEqual(restored.hasLegal(),true,'legacy recoverable saves must migrate into the automatic reroll rule');
}

testFreeRerollAutoConsumes();
testStoredRerollAutoConsumes();
testNoRerollEndsRun();
testLegacyWaitingSaveResolvesOnRestore();
console.log('automatic no-legal reroll regression passed');
