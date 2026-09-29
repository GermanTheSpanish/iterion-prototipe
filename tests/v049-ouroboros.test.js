const assert=require('node:assert/strict');
const E=require('../engine.js');
const G=require('../game.js');

const stateEngine={...E,hasLegalMove:()=>true};
const clone=x=>JSON.parse(JSON.stringify(x));

function place(s,id,x,y,rr,pieceId){
  const tile=s.set.find(t=>t.id===id);assert(tile);
  const p=E.pieceFrom(tile,x,y,0,rr,pieceId);p.tile={...tile};return p
}
function readyOuroboros(seed=4901){
  E.setBoardSize(18,24);const game=G.createGame(E,{seed,FIRST_TILE_MUST_BE_DOUBLE:false,TARGETS:Array(15).fill(Number.MAX_SAFE_INTEGER)}),s=game.state();
  s.pieces=[place(s,'d2-2',6,8,0,1),place(s,'d2-3',10,8,0,2),place(s,'d3-4',2,2,0,3)];s.placedTileIds=s.pieces.map(p=>p.tile.id);s.idc=3;s.turn=3;s.roundTurn=0;
  s.ouroborosMode=true;s.ouroborosStartedRound=1;s.endlessMode=true;s.hand=[];s.reserve=[];s.cleared=false;s.blocked=false;s.needsReroll=false;s.failureReason=null;s.running=false;s.pendingCircuit=null;s.pendingModPlacement=null;s.shopOpen=false;
  return{game,s}
}
{
  const game=G.createGame(stateEngine,{seed:4900,FIRST_TILE_MUST_BE_DOUBLE:false,TARGETS:Array(15).fill(Number.MAX_SAFE_INTEGER)}),s=game.state();
  const consume=()=>{s.placedTileIds=s.set.map(t=>t.id);s.hand=[];s.reserve=[];s.cleared=false;s.blocked=false;s.failureReason=null;s.roundTurn=0;game.assessContinuation()};
  consume();assert.equal(s.setGeneration,2);assert.equal(s.ouroborosMode,false);
  consume();assert.equal(s.setGeneration,3);assert.equal(s.ouroborosMode,false);assert(s.set.filter(t=>t.generation===3).every(t=>t.powerMultiplier===3));
  E.setBoardSize(39,52);
  consume();assert.equal(s.setGeneration,3);assert.equal(s.ouroborosMode,true);assert.equal(s.set.some(t=>t.generation===4),false);assert.equal(s.hand.length,0);assert.equal(s.failureReason,null);
  assert.deepEqual(s.ouroborosBoardSize,[39,52],'Ouroboros must capture the physical board size at activation');
  s.round=90;assert.deepEqual(game.boardSizeForStage(),[39,52],'Ouroboros must stop later Stage growth');
  assert.equal(game.snapshot().powerSets.maxGeneration,3);assert.equal(game.snapshot().endless.phase,'ouroboros');assert.deepEqual(game.snapshot().endless.ouroborosBoardSize,[39,52]);assert.equal(game.status?.(),undefined);
}
{
  const{game,s}=readyOuroboros(4902),piece=s.pieces.find(p=>p.tile.id==='d2-3'),pieceId=piece.id;
  const isolated=game.ouroborosPlacementPreview('d2-3',{x:12,y:16,rr:0});assert.equal(isolated.ok,true,'Ouroboros may create a disconnected island');
  const moved=game.moveOuroborosTile('d2-3',isolated.placement);assert.equal(moved.ok,true);assert.equal(s.pieces.find(p=>p.tile.id==='d2-3').id,pieceId,'physical piece ID persists');
  const mismatch=game.ouroborosPlacementPreview('d3-4',{x:10,y:8,rr:0});assert.equal(mismatch.ok,true,'Ouroboros allows mismatched touching values during rebuild');
  const rebuilt=game.moveOuroborosTile('d3-4',mismatch.placement);assert.equal(rebuilt.ok,true);
  const overlap=game.ouroborosPlacementPreview('d3-4',{x:6,y:8,rr:0});assert.equal(overlap.ok,false);assert.equal(overlap.reason,'overlap','physical dominoes still cannot occupy the same space');
  const bounds=game.ouroborosPlacementPreview('d3-4',{x:17,y:8,rr:0});assert.equal(bounds.ok,false);assert.equal(bounds.reason,'bounds','rebuild stays inside the board');
}
{
  const{game,s}=readyOuroboros(4903),tile=s.set.find(t=>t.id==='d2-3');tile.generation=3;tile.powerMultiplier=3;tile.upgrade=2;s.pieces.find(p=>p.tile.id===tile.id).tile={...tile};s.bankTileId=tile.id;s.circuitRanks[tile.id]=4;s.consumables.undo=1;
  assert.equal(game.moveOuroborosTile(tile.id,{x:12,y:16,rr:0}).ok,true);const rebuilt=clone(s.pieces.find(p=>p.tile.id===tile.id));
  const ctx=game.beginOuroborosFire(tile.id);assert.equal(ctx.ok,true);assert.equal(s.roundTurn,1);assert.equal(s.placedTileIds.filter(id=>id===tile.id).length,1);
  const result=game.finishPlacement(ctx);assert.equal(result.ok,true);assert.equal(s.pieces.find(p=>p.tile.id===tile.id).tile.powerMultiplier,3);assert.equal(s.circuitRanks[tile.id],4);assert.equal(s.bankTileId,tile.id);
  assert(s.events.some(e=>e.type==='ouroboros-fire'&&e.tileId===tile.id));assert(s.events.some(e=>Number.isInteger(e.turn)&&e.mode==='ouroboros'));
  assert.equal(game.useUndo().ok,true);assert.deepEqual(s.pieces.find(p=>p.tile.id===tile.id),rebuilt,'Undo after FIRE returns to the rebuilt layout, not the pre-rebuild layout');
}
{
  const{game,s}=readyOuroboros(4904);assert.equal(game.canUseReroll(),false);assert.equal(game.canBuyTool('reroll'),false);s.coins=100;assert.equal(game.shopPurchaseAvailability().hasAny,false);assert.equal(game.openShop(),false);
  const moved=game.moveOuroborosTile('d2-3',{x:12,y:16,rr:1});assert.equal(moved.ok,true);s.ouroborosBoardSize=[18,24];const saved=game.exportState(),restored=G.createGame(E,{seed:1});assert.equal(restored.restoreState(saved),true);
  assert.equal(restored.state().ouroborosMode,true);assert.deepEqual(restored.state().ouroborosBoardSize,[18,24]);assert.deepEqual(E.getBoardSize(),{G:18,H:24});assert.equal(restored.handSizeForRound(),0);const p=restored.state().pieces.find(p=>p.tile.id==='d2-3');assert.deepEqual({x:p.cubes[0].x,y:p.cubes[0].y,rr:p.rr},{x:12,y:16,rr:1})
}
console.log('Ouroboros progression and rebuild regressions passed');
