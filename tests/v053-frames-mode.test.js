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
const coreRectsOverlapForTest=(a,b)=>a.x<b.x+b.size&&a.x+a.size>b.x&&a.y<b.y+b.size&&a.y+a.size>b.y;
const centres=item=>({x:item.x+item.size/2,y:item.y+item.size/2});

assert.deepEqual(C.MODES.filter(mode=>mode.available).map(mode=>mode.id),['classic','eyes','frames','river','loom','peaks','islands']);

E.setBoardSize(18,24);
const first=G.createGame(E,{seed:5301,GAME_MODE:'frames',TARGETS:Array(15).fill(Number.MAX_SAFE_INTEGER)});
const second=G.createGame(E,{seed:5301,GAME_MODE:'frames',TARGETS:Array(15).fill(Number.MAX_SAFE_INTEGER)});
const s=first.state();
E.setBoardSize(18,24);
const eyesScale=G.createGame(E,{seed:5301,GAME_MODE:'eyes',TARGETS:Array(15).fill(Number.MAX_SAFE_INTEGER)}),eyesState=eyesScale.state(),riverScale=G.createGame(E,{seed:5301,GAME_MODE:'river',TARGETS:Array(15).fill(Number.MAX_SAFE_INTEGER)}),riverState=riverScale.state();
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
  const a=centres(core),b=centres(voidItem),dx=Math.abs(a.x-b.x)/E.S,dy=Math.abs(a.y-b.y)/E.S,mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2},eye=centres(eyesState.cores.find(item=>item.slot===half));
  assert.equal(dx,6,'2|2 uses the widened outer horizontal anchors of the shared pip grid');
  assert.equal(dy,4,'2|2 uses the widened outer vertical anchors of the shared pip grid');
  assert.deepEqual(mid,eye,`the ${half} 2|2 half stays centred on the matching 1|1 pip`);
  const riverHalf=[...riverState.cores,...riverState.voids].filter(item=>item.half===half).sort((left,right)=>left.pip-right.pip),framesHalf=[core,voidItem].sort((left,right)=>left.pip-right.pip);
  assert.deepEqual(framesHalf.map(({x,y,size})=>({x,y,size})),[riverHalf[0],riverHalf[2]].map(({x,y,size})=>({x,y,size})),`the ${half} 2|2 pips must use the outer sites of the matching 3|3 half`);
  assert.deepEqual({x:eye.x,y:eye.y},centres(riverHalf[1]),`the ${half} 1|1 pip must use the centre site of the matching 3|3 half`);
}
const initialItems=[...s.cores,...s.voids],initialVisible=initialItems.filter(item=>visible(item));
assert.deepEqual(eyesState.cores.map(({slot,x,y,size})=>({slot,x,y,size})),[
  {slot:'north',x:8,y:6,size:2},
  {slot:'south',x:8,y:16,size:2}
],'The Eyes uses the centre pip of each shared board-half grid');
assert.deepEqual(initialItems.map(({half,pip,x,y,size})=>({half,pip,x,y,size})).sort((a,b)=>a.half.localeCompare(b.half)||a.pip-b.pip),[
  {half:'north',pip:0,x:2,y:2,size:2},
  {half:'north',pip:1,x:14,y:10,size:2},
  {half:'south',pip:0,x:2,y:12,size:2},
  {half:'south',pip:1,x:14,y:20,size:2}
],'Frames uses the two outer sites of the same grid as River');
const approachSides=(core,items,board={G:18,H:24})=>{
  const cell=E.S,size=core.size,vectors={U:[0,-cell],R:[cell,0],D:[0,cell],L:[-cell,0]};
  const cells=side=>{const [dx,dy]=vectors[side],first=side==='U'?{x:core.x,y:core.y-cell}:side==='R'?{x:core.x+size,y:core.y}:side==='D'?{x:core.x,y:core.y+size}:{x:core.x-cell,y:core.y};return[first,{x:first.x+dx,y:first.y+dy}]};
  const blocked=cellRect=>items.some(other=>other.id!==core.id&&cellRect.x<other.x+other.size&&cellRect.x+cell>other.x&&cellRect.y<other.y+other.size&&cellRect.y+cell>other.y);
  return core.ports.filter(side=>cells(side).every(cellRect=>cellRect.x>=0&&cellRect.y>=0&&cellRect.x+cell<=board.G&&cellRect.y+cell<=board.H&&!blocked(cellRect)))
};
for(const core of s.cores)assert(approachSides(core,initialItems).length>0,`Frames Core ${core.id} must expose at least one full-domino approach through a real port`);
assert.equal(initialVisible.length,4,'opening board exposes the full 2|2 macrogeometry');
for(const half of ['north','south'])assert.equal(initialVisible.filter(item=>item.half===half).length,2,'each opening half shows both pips');

const snap=first.snapshot();
assert.equal(snap.signal.enabled,true);
assert.equal(snap.signal.base,D.CORE_SIGNAL_BY_MODE.frames);
assert.equal(snap.signal.max,D.CORE_SIGNAL_BY_MODE.frames);
assert.equal(snap.cores.mode,'frames');
assert.equal(snap.cores.maxPhysical,6);
assert.equal(snap.modeGeometry.voids.length,2);
assert.equal(snap.modeGeometry.visibleIds.length,4);
assert.equal(snap.cores.telemetry.coreCount,2,'both Frames Cores are physically active from the opening board');
assert.deepEqual(P.modeIndicatorViewModel(s,snap).pips,[2,2]);
assert.match(first.debugText(),/Cores: THE FRAMES/,'Frames Core state must remain reconstructable from debug export');

const double=s.set.find(tile=>tile.id==='d2-2');assert(double);
s.hand[0]=double;
for(const voidItem of s.voids){assert(visible(voidItem));assert.deepEqual(first.previewPlacement(0,{x:voidItem.x,y:voidItem.y,z:0,rr:0}),{ok:false,reason:'void-overlap'});assert.deepEqual(first.beginPlacement(0,{x:voidItem.x,y:voidItem.y,z:0,rr:0}),{ok:false,reason:'void-overlap'})}

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
assert.equal(growth.snapshot().modeGeometry.visibleIds.length,4);
for(let n=0;n<3;n++){
  gs.cleared=true;gs.blocked=false;gs.running=false;gs.nextShopType='none';gs.intermissionResolved=true;gs.pendingCircuit=null;gs.pendingModPlacement=null;gs.shopOpen=false;
  assert.equal(growth.advance(),true)
}
assert.deepEqual(E.getBoardSize(),{G:21,H:28});
const stage2Snapshot=growth.snapshot(),stage2Discovery=[...gs.events].reverse().find(event=>event.type==='core-discover'&&event.stage===2);
assert.equal(stage2Snapshot.modeGeometry.visibleIds.length,6,'Stage 2 keeps the canonical 2|2 sites and adds one network Core plus one Void');
assert.equal(stage2Snapshot.cores.telemetry.coreCount,3,'Frames gains one physical Core after its first Market');
assert.equal(stage2Snapshot.modeGeometry.voids.length,3,'Frames gains one permanent Void with the discovered Core');
assert.equal(gs.events.some(event=>event.type==='mode-geometry-reveal'),false,'the canonical 2|2 pips remain visible from the opening board');
assert.equal(gs.cores.length,3);
assert(stage2Discovery,'Stage 2 must discover a Core');
assert.equal(stage2Discovery.connectedAtDiscovery,0,'a new Frames Core should not auto-connect when empty frame space is available');
const stage2Core=gs.cores.find(core=>core.id===stage2Discovery.core.id),oldRect={x:1,y:2,w:18,h:24};
assert(stage2Core);
assert.equal(stage2Core.x>=oldRect.x&&stage2Core.y>=oldRect.y&&stage2Core.x+stage2Core.size<=oldRect.x+oldRect.w&&stage2Core.y+stage2Core.size<=oldRect.y+oldRect.h,false,'the discovered Core belongs to the newly opened outer frame');
assert.equal(gs.voids.some(voidItem=>coreRectsOverlapForTest(stage2Core,voidItem)),false,'new Frames Cores may not overlap canonical Voids');

const source=fs.readFileSync(path.join(__dirname,'..','game.js'),'utf8');
assert.match(source,/pieceOverlapsVoid\(candidate\).*void-overlap/,'HINGE must reject Void destinations');
assert.match(source,/pieces\.some\(piece=>pieceOverlapsBlockedGeometry\(piece\)\)/,'Mutations must validate Cores and Voids through the same physical blocker');
assert.match(source,/pieceOverlapsVoid\(moved\).*void-overlap/,'Ouroboros rebuild must reject Void occupancy');

console.log('The Frames 2|2 Core/Void geometry regressions passed');
