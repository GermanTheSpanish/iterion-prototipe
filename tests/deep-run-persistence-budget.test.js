const assert=require('node:assert/strict');
const D=require('../data.js'),E=require('../engine.js'),Game=require('../game.js');

const game=Game.createGame(E,{seed:79121,STARTING_UNDO_CONSUMABLES:1});
const state=game.state(),index=state.hand.findIndex(tile=>tile&&tile.a===tile.b);
assert(index>=0,'fixture has an opening double');
const candidate=game.candidatesForIndex(index)[0];
assert(candidate,'opening has a legal position');
const placement=game.beginPlacement(index,candidate);
assert(placement.ok);
game.finishPlacement(placement);
assert(game.canUndo(),'fixture includes a real Undo frame');

const move=state.events.find(event=>Number.isInteger(event.turn));
assert(move,'real placement generated an event');
const hugeOps='1:×5 12345678901234567890>61728394506172839450,'.repeat(1800);
const hugeRoutes='1:0>2:1;2:0>3:1;'.repeat(1800);
move.ops=hugeOps;
move.routes=hugeRoutes;
move.signal={...(move.signal||{}),splits:Array.from({length:200},(_,i)=>({pieceId:i,remaining:i})),
  branchEnds:Array.from({length:100},(_,i)=>({fork:i,remaining:i}))};
move.signalShadow=structuredClone(move.signal);
move.coreShadow={cachedNodes:Array.from({length:1000},(_,i)=>({id:i,adjacent:i+1}))};
move.coreActivations=Array.from({length:200},(_,i)=>({coreId:i}));
const originalScore=state.scoreExact,originalTileIds=state.pieces.map(piece=>piece.tile.id);

const saved=game.exportState(),persisted=saved.state.events.find(event=>event.turn===move.turn);
assert(persisted,'saved Move still exists');
assert.equal(persisted.opsCompacted,true);
assert.equal(persisted.routesCompacted,true);
assert.equal(persisted.opsTotalChars,hugeOps.length);
assert.equal(persisted.routesTotalChars,hugeRoutes.length);
assert(persisted.ops.startsWith(hugeOps.slice(0,1024)),'first operations retained');
assert(persisted.ops.endsWith(hugeOps.slice(-1024)),'final operations retained');
assert(persisted.routes.endsWith(hugeRoutes.slice(-512)),'final route retained');
assert.equal(persisted.signal.splitsTotalCount,200);
assert.equal(persisted.signal.branchEndsTotalCount,100);
assert.equal(persisted.signal.splits.length,32);
assert.equal(persisted.signalShadow,undefined,'duplicate signal summary omitted');
assert.equal(persisted.coreShadow,undefined,'historical Core snapshot omitted');
assert.equal(persisted.coreActivations,undefined,'duplicate Core activations omitted');
assert.equal(move.ops,hugeOps,'live operations stay complete');
assert.equal(move.routes,hugeRoutes,'live routes stay complete');
assert.equal(move.signal.splits.length,200,'live split evidence stays complete');
assert(move.coreShadow.cachedNodes.length===1000,'live Core diagnostics stay complete');
assert(JSON.stringify(saved).length<60000,'active save remains bounded despite large operation traces');

const restored=Game.createGame(E,{seed:2,STARTING_UNDO_CONSUMABLES:1});
assert(restored.restoreState(saved));
assert.equal(restored.state().scoreExact,originalScore,'exact score round-trips');
assert.deepEqual(restored.state().pieces.map(piece=>piece.tile.id),originalTileIds,'physical IDs round-trip');
const reexported=restored.exportState();
assert.equal(reexported.state.events.find(event=>event.turn===move.turn).ops,
  persisted.ops,'compaction remains idempotent across saves');
const undo=restored.useUndo();
assert(undo.ok,'Undo remains available after restore');
assert.equal(restored.state().pieces.length,0,'Undo restores physical board');

// History size must grow with the number of Moves, not the unbounded signal search.
for(let i=0;i<48;i++)state.events.push({...move,turn:move.turn+i+1});
const lengthy=game.exportState();
assert(JSON.stringify(lengthy).length<500000,'many deep-run Moves fit a bounded save budget');
assert.equal(state.events.at(-1).ops,hugeOps,'export never truncates in-memory history');

console.log('deep-run persisted event budget, exact state and Undo regressions passed');
