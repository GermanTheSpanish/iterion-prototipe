const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const E=require('../engine.js');
const D=require('../data.js');
const G=require('../game.js');
const P=require('../presentation.js');
const C=require('../mode-carousel.js');

const visible=(item,board=E.getBoardSize())=>item.x>=0&&item.y>=0&&item.x+item.size<=board.G&&item.y+item.size<=board.H;
const overlap=(piece,item)=>piece.cubes.some(cube=>cube.x<item.x+item.size&&cube.x+E.S>item.x&&cube.y<item.y+item.size&&cube.y+E.S>item.y);
const centres=item=>({x:item.x+item.size/2,y:item.y+item.size/2});

assert.equal(D.FRAMES_MIN_PIP_DIAGONAL_CELLS,4);
assert.deepEqual(C.MODES.filter(mode=>mode.available).map(mode=>mode.id),['classic','eyes','frames']);

E.setBoardSize(18,24);
const first=G.createGame(E,{seed:5301,GAME_MODE:'frames',TARGETS:Array(15).fill(Number.MAX_SAFE_INTEGER)});
const second=G.createGame(E,{seed:5301,GAME_MODE:'frames',TARGETS:Array(15).fill(Number.MAX_SAFE_INTEGER)});
const s=first.state();
assert.equal(s.gameMode,'frames');
assert.equal(s.cores.length,2);
assert.equal(s.voids.length,2);
assert.deepEqual(s.cores,second.state().cores,'Frames Core/Void assignment must be seeded without consuming gameplay RNG');
assert.deepEqual(s.voids,second.state().voids);
assert.deepEqual(new Set(s.cores.map(core=>core.half)),new Set(['north','south']));
assert.deepEqual(new Set(s.voids.map(voidItem=>voidItem.half)),new Set(['north','south']));

for(const half of ['north','south']){
  const core=s.cores.find(item=>item.half===half),voidItem=s.voids.find(item=>item.half===half);
  assert(core&&voidItem);
  assert.notEqual(core.pip,voidItem.pip,'each 2 pip half must contain exactly one Core and one Void');
  const a=centres(core),b=centres(voidItem),dx=Math.abs(a.x-b.x)/E.S,dy=Math.abs(a.y-b.y)/E.S;
  assert.equal(dx,D.FRAMES_MIN_PIP_DIAGONAL_CELLS,'2|2 pips keep four cell horizontal diagonal spacing');
  assert.equal(dy,D.FRAMES_MIN_PIP_DIAGONAL_CELLS,'2|2 pips keep four cell vertical diagonal spacing');
}
const initialItems=[...s.cores,...s.voids],initialVisible=initialItems.filter(item=>visible(item));
assert.equal(initialVisible.length,2,'opening board reveals one 2|2 pip per half');
assert.deepEqual(new Set(initialVisible.map(item=>item.half)),new Set(['north','south']));

const snap=first.snapshot();
assert.equal(snap.signal.enabled,true);
assert.equal(snap.signal.base,24);
assert.equal(snap.signal.max,24);
assert.equal(snap.cores.mode,'frames');
assert.equal(snap.cores.maxPhysical,2);
assert.equal(snap.modeGeometry.voids.length,2);
assert.equal(snap.modeGeometry.visibleIds.length,2);
assert.deepEqual(P.modeIndicatorViewModel(s,snap).pips,[2,2]);

const double=s.set.find(tile=>tile.id==='d2-2');assert(double);
s.hand[0]=double;
const visibleVoid=s.voids.find(item=>visible(item));assert(visibleVoid);
assert.deepEqual(first.previewPlacement(0,{x:visibleVoid.x,y:visibleVoid.y,z:0,rr:0}),{ok:false,reason:'void-overlap'});
assert.deepEqual(first.beginPlacement(0,{x:visibleVoid.x,y:visibleVoid.y,z:0,rr:0}),{ok:false,reason:'void-overlap'});

let checked=0;
for(let i=0;i<s.hand.length;i++){
  const tile=s.hand[i];if(!tile)continue;
  for(const candidate of first.candidatesForIndex(i)){
    const piece=E.pieceFrom(tile,candidate.x,candidate.y,0,candidate.rr,-1);piece.tile={...tile};checked++;
    assert.equal([...s.cores,...s.voids].some(item=>overlap(piece,item)),false,'legal placements may not occupy Core or Void footprints')
  }
}
assert(checked>0,'Frames must retain legal opening placements');

const saved=first.exportState(),restored=G.createGame(E,{seed:1,GAME_MODE:'classic'});
assert.equal(restored.restoreState(saved),true);
assert.equal(restored.state().gameMode,'frames');
assert.deepEqual(restored.state().cores,s.cores);
assert.deepEqual(restored.state().voids,s.voids);
assert.equal(restored.snapshot().signal.enabled,true);

E.setBoardSize(18,24);
const growth=G.createGame(E,{seed:5302,GAME_MODE:'frames',TARGETS:Array(15).fill(Number.MAX_SAFE_INTEGER)}),gs=growth.state();
assert.equal(growth.snapshot().modeGeometry.visibleIds.length,2);
for(let n=0;n<3;n++){
  gs.cleared=true;gs.blocked=false;gs.running=false;gs.nextShopType='none';gs.intermissionResolved=true;gs.pendingCircuit=null;gs.pendingModPlacement=null;gs.shopOpen=false;
  assert.equal(growth.advance(),true)
}
assert.deepEqual(E.getBoardSize(),{G:21,H:28});
assert.equal(growth.snapshot().modeGeometry.visibleIds.length,4,'first board expansion reveals the second pip in both halves');
const reveal=[...gs.events].reverse().find(event=>event.type==='mode-geometry-reveal');
assert(reveal);
assert.equal(reveal.items.length,2);
assert.deepEqual(new Set(reveal.items.map(item=>item.half)),new Set(['north','south']));
assert.equal(gs.cores.length,2,'Frames never invents extra pips when the board grows');
assert.equal(gs.events.some(event=>event.type==='core-discover'),false,'Frames has fixed 2|2 Core sites rather than Eyes discovery');

const source=fs.readFileSync(path.join(__dirname,'..','game.js'),'utf8');
assert.match(source,/pieceOverlapsVoid\(candidate\).*void-overlap/,'HINGE must reject Void destinations');
assert.match(source,/pieces\.some\(piece=>pieceOverlapsBlockedGeometry\(piece\)\)/,'Mutations must validate Cores and Voids through the same physical blocker');
assert.match(source,/pieceOverlapsVoid\(moved\).*void-overlap/,'Ouroboros rebuild must reject Void occupancy');

console.log('The Frames 2|2 Core/Void geometry regressions passed');
