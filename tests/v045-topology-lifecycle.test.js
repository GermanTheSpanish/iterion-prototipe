const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const D=require('../data.js'),E=require('../engine.js'),G=require('../game.js'),M=require('../mods.js');

E.setBoardSize(30,40);
function placed(g,id,x,y,rr,pieceId){
  const s=g.state(),t=s.set.find(t=>t.id===id);assert(t,`missing ${id}`);
  const p=E.pieceFrom(t,x,y,0,rr,pieceId);p.tile={...t};return p
}
function elbow(g){
  const s=g.state();
  s.pieces=[placed(g,'d3-4',6,8,0,1),placed(g,'d3-5',4,8,2,2),placed(g,'d4-6',8,10,1,3)];
  s.placedTileIds=['d3-4','d3-5','d4-6'];
  s.running=false;s.cleared=false;s.blocked=false;s.needsReroll=false;s.shopOpen=false;s.pendingCircuit=null;s.pendingModPlacement=null;
  return s
}

assert.equal(D.MARKET_ACTIVE_TOPOLOGY_WEIGHT,0.25);
assert.deepEqual(
  ['corner','long-line','overload','terminal','pair','bridge','knot'].map(id=>[M.get(id).category,M.get(id).topologyRule]),
  [['topology','corner'],['topology','long-line'],['topology','overload'],['topology','terminal'],['topology','pair'],['topology','bridge'],['topology','knot']]
);

{
  const g=G.createGame(E,{seed:4501,STARTING_COINS:100}),s=elbow(g);
  const targets=g.marketOfferInfo('corner').targetTiles.map(t=>t.id);
  assert(targets.includes('d3-4'),'Corner can only be installed on a currently valid elbow');
  assert(!targets.includes('d3-5'),'Terminal-like edge tiles are not valid Corner targets');
  s.cornerTileId='d3-4';
  assert.equal(g.marketOfferInfo('corner').offerWeight,0.25,'installed active Topology Mods use reduced Market weight');
  const restoredActive=G.createGame(E,{seed:9});assert(restoredActive.restoreState(g.exportState()));assert.equal(restoredActive.state().cornerTileId,'d3-4','valid Topology assignment survives save/restore');

  const breaker=s.set.find(t=>t.id==='d4-5'),candidate={x:10,y:8,rr:0};
  assert(breaker,'fixture needs [4|5]');
  s.hand=[breaker,null,null,null,null];
  s.reserve=s.reserve.filter(t=>t.id!==breaker.id);
  const losses=g.topologyBreaksForPlacement(0,candidate);
  assert(losses.some(loss=>loss.mod==='corner'&&loss.tileId==='d3-4'&&loss.label==='CORNER'),'placing [4|5] on the open right side must warn that Corner is lost');
  s.consumables.undo=1;

  const ctx=g.beginPlacement(0,candidate);assert(ctx.ok);
  assert.deepEqual(ctx.topologyLosses.map(loss=>loss.mod),['corner']);
  assert.equal(s.cornerTileId,null,'Corner is removed before scoring the breaking placement');
  assert(s.events.some(e=>e.type==='topology-mod-lost'&&e.mod==='corner'&&e.tileId==='d3-4'&&e.causeTileId===breaker.id));
  assert.equal(g.marketOfferInfo('corner').offerWeight,1,'lost Topology Mod returns to normal Market weight');

  g.finishPlacement(ctx);
  assert.match(g.debugText(),/TOPOLOGY LOST CORNER tile=d3-4/);
  const undone=g.useUndo();assert(undone.ok);
  assert.equal(g.state().cornerTileId,'d3-4','Undo restores the lost Topology Mod with the placement snapshot');
}

{
  const g=G.createGame(E,{seed:4502}),s=elbow(g);
  s.terminalTileId='d3-4'; // invalid: the centre already has two physical neighbours
  const restored=G.createGame(E,{seed:1});assert(restored.restoreState(g.exportState()));
  assert.equal(restored.state().terminalTileId,null,'restore prunes legacy dormant Topology assignments');
}

const ui=fs.readFileSync(path.join(__dirname,'..','ui.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'..','ui-theme.css'),'utf8');
assert.match(ui,/topologyBreaksForPlacement/,'drag preview must query deterministic Topology losses');
assert.match(ui,/LOSE \$\{topologyBreak\.label\}/,'board preview must name the Mod that will be lost');
assert.match(css,/\.piece\.topologyBreakWarning/,'breaking placements need a visible pre-placement board warning');

console.log('Topology Mod lifecycle regressions passed');
