const assert=require('node:assert/strict');
const E=require('../engine.js');
const D=require('../data.js');
const G=require('../game.js');
const P=require('../presentation.js');
const C=require('../mode-carousel.js');

const visible=(item,board=E.getBoardSize())=>item.x>=0&&item.y>=0&&item.x+item.size<=board.G&&item.y+item.size<=board.H;
const overlap=(piece,item)=>piece.cubes.some(cube=>cube.x<item.x+item.size&&cube.x+E.S>item.x&&cube.y<item.y+item.size&&cube.y+E.S>item.y);
const residue=value=>((value%E.S)+E.S)%E.S;
const approachDominoes=item=>[
  E.pieceFrom({a:1,b:1},item.x,item.y-E.S,0,3,-1),
  E.pieceFrom({a:1,b:1},item.x+item.size,item.y,0,0,-1),
  E.pieceFrom({a:1,b:1},item.x,item.y+item.size,0,1,-1),
  E.pieceFrom({a:1,b:1},item.x-E.S,item.y,0,2,-1)
];

assert.equal(D.CORE_SIGNAL_BY_MODE.river,3);
assert.equal(D.RIVER_CORE_MAX_PHYSICAL,6);
assert.deepEqual(C.MODES.filter(mode=>mode.available).map(mode=>mode.id),['classic','eyes','frames','river','loom','peaks','islands']);

E.setBoardSize(18,24);
const first=G.createGame(E,{seed:5701,GAME_MODE:'river',TARGETS:Array(15).fill(Number.MAX_SAFE_INTEGER)});
E.setBoardSize(18,24);
const second=G.createGame(E,{seed:5701,GAME_MODE:'river',TARGETS:Array(15).fill(Number.MAX_SAFE_INTEGER)});
const s=first.state(),items=[...s.cores,...s.voids];
assert.equal(s.gameMode,'river');
assert.equal(s.cores.length,2);
assert.equal(s.voids.length,4);
assert.deepEqual(s.cores,second.state().cores,'River Core/Void assignment must be seeded without consuming gameplay RNG');
assert.deepEqual(s.voids,second.state().voids);
assert.equal(new Set(s.cores.map(core=>core.archetype)).size,2,'opening River Cores use distinct archetypes');

for(const half of ['north','south']){
  const halfCores=s.cores.filter(item=>item.half===half),halfVoids=s.voids.filter(item=>item.half===half),halfItems=[...halfCores,...halfVoids].sort((a,b)=>a.pip-b.pip);
  assert.equal(halfCores.length,1);
  assert.equal(halfVoids.length,2);
  assert.deepEqual(halfItems.map(item=>item.pip),[0,1,2],'each 3-pip half keeps its complete pip topology');
}
assert.deepEqual(items.map(({half,pip,x,y,size})=>({half,pip,x,y,size})).sort((a,b)=>a.half.localeCompare(b.half)||a.pip-b.pip),[
  {half:'north',pip:0,x:2,y:2,size:2},
  {half:'north',pip:1,x:8,y:6,size:2},
  {half:'north',pip:2,x:14,y:10,size:2},
  {half:'south',pip:0,x:2,y:12,size:2},
  {half:'south',pip:1,x:8,y:16,size:2},
  {half:'south',pip:2,x:14,y:20,size:2}
],'The River uses two separated canonical 3-pip domino halves on one reachable lattice');
const northItems=items.filter(item=>item.half==='north'),southItems=items.filter(item=>item.half==='south');
assert(Math.max(...northItems.map(item=>item.y+item.size))<=Math.min(...southItems.map(item=>item.y)),'The River halves must not interleave across the domino seam');
for(const halfItems of [northItems,southItems]){
  const ordered=[...halfItems].sort((a,b)=>a.pip-b.pip);
  for(let i=1;i<ordered.length;i++){
    assert.equal(ordered[i].x-ordered[i-1].x,ordered[i-1].size*3,'River pips keep two full Core/Void widths of horizontal air');
    assert.equal(ordered[i].y-ordered[i-1].y,ordered[i-1].size*2,'River pips keep one full Core/Void height of vertical air')
  }
}
const halfCenter=itemsForHalf=>itemsForHalf.reduce((sum,item)=>sum+item.y+item.size/2,0)/itemsForHalf.length;
assert.equal(halfCenter(northItems),7,'upper River half moves one full board block upward from the previous layout');
assert.equal(halfCenter(southItems),17,'lower River half moves one full board block downward from the previous layout');
assert.equal(items.filter(item=>visible(item)).length,6,'all River pips are visible from the opening board');
const lattice={x:residue(items[0].x),y:residue(items[0].y)};
for(const item of items)assert.deepEqual({x:residue(item.x),y:residue(item.y)},lattice,'every River pip stays on the domino cell lattice');
const approachSides=(core,geometry,board={G:18,H:24})=>{
  const cell=E.S,size=core.size,vectors={U:[0,-cell],R:[cell,0],D:[0,cell],L:[-cell,0]};
  const cells=side=>{const [dx,dy]=vectors[side],first=side==='U'?{x:core.x,y:core.y-cell}:side==='R'?{x:core.x+size,y:core.y}:side==='D'?{x:core.x,y:core.y+size}:{x:core.x-cell,y:core.y};return[first,{x:first.x+dx,y:first.y+dy}]};
  const blocked=cellRect=>geometry.some(other=>other.id!==core.id&&cellRect.x<other.x+other.size&&cellRect.x+cell>other.x&&cellRect.y<other.y+other.size&&cellRect.y+cell>other.y);
  return core.ports.filter(side=>cells(side).every(cellRect=>cellRect.x>=0&&cellRect.y>=0&&cellRect.x+cell<=board.G&&cellRect.y+cell<=board.H&&!blocked(cellRect)))
};
for(const core of s.cores)assert(approachSides(core,items).length>0,`River Core ${core.id} must expose at least one full-domino approach through a real port`);

const snap=first.snapshot();
assert.equal(snap.signal.enabled,true);
assert.equal(snap.signal.base,3);
assert.equal(snap.signal.max,3);
assert.equal(snap.cores.mode,'river');
assert.equal(snap.cores.maxPhysical,6);
assert.equal(snap.modeGeometry.voids.length,4);
assert.equal(snap.modeGeometry.visibleIds.length,6);
assert.deepEqual(P.modeIndicatorViewModel(s,snap).pips,[3,3]);
assert.match(first.debugText(),/Cores: THE RIVER/);

const double=s.set.find(tile=>tile.id==='d3-3');assert(double);
const replaced=s.hand[0];s.reserve=s.reserve.filter(tile=>tile.id!==double.id);if(replaced&&replaced.id!==double.id)s.reserve.push(replaced);s.hand[0]=double;
for(const voidItem of s.voids){
  assert.deepEqual(first.previewPlacement(0,{x:voidItem.x,y:voidItem.y,z:0,rr:0}),{ok:false,reason:'void-overlap'});
  assert.deepEqual(first.beginPlacement(0,{x:voidItem.x,y:voidItem.y,z:0,rr:0}),{ok:false,reason:'void-overlap'})
}
let checked=0;
for(let i=0;i<s.hand.length;i++){
  const tile=s.hand[i];if(!tile)continue;
  for(const candidate of first.candidatesForIndex(i)){
    const piece=E.pieceFrom(tile,candidate.x,candidate.y,0,candidate.rr,-1);piece.tile={...tile};checked++;
    assert.equal(items.some(item=>overlap(piece,item)),false,'legal River placements may not occupy Core or Void footprints')
  }
}
assert(checked>0,'The River must retain legal opening placements');

const saved=first.exportState(),restored=G.createGame(E,{seed:1,GAME_MODE:'classic'});
assert.equal(restored.restoreState(saved),true);
assert.equal(restored.state().gameMode,'river');
assert.deepEqual(restored.state().cores,s.cores);
assert.deepEqual(restored.state().voids,s.voids);
assert.equal(restored.snapshot().signal.base,3);

E.setBoardSize(18,24);
const progression=G.createGame(E,{seed:5702,GAME_MODE:'river',TARGETS:Array(15).fill(Number.MAX_SAFE_INTEGER)}),ps=progression.state();
for(let stage=2;stage<=5;stage++){
  while(progression.snapshot().stage.index<stage){
    ps.cleared=true;ps.blocked=false;ps.running=false;ps.nextShopType='none';ps.intermissionResolved=true;ps.pendingCircuit=null;ps.pendingModPlacement=null;ps.shopOpen=false;
    assert.equal(progression.advance(),true)
  }
  assert.equal(ps.cores.length,stage+1,'The River adds one Core at every board-growth Stage');
  assert.equal(ps.voids.length,4+(stage-1)*2,'The River adds two Voids with every discovered Core');
  const coreEvent=[...ps.events].reverse().find(event=>event.type==='core-discover'&&event.stage===stage),voidEvent=[...ps.events].reverse().find(event=>event.type==='void-discover'&&event.stage===stage);
  assert(coreEvent);assert(voidEvent);assert.equal(coreEvent.companionVoidIds.length,2);assert.equal(voidEvent.count,2)
}
assert.equal(ps.events.filter(event=>event.type==='core-discover').length,4);
assert.equal(ps.events.filter(event=>event.type==='void-discover').length,4);
assert.equal(ps.coreProgressMilestones.filter(key=>key.startsWith('discover:')).length,4);
ps.marketCount=2;
const charged=progression.snapshot().signal;
assert.equal(charged.discoveredCoreCount,4,'River tracks four extra Cores after Stages 2–5');
assert.equal(charged.discoveredCoreBonus,4,'each discovered River Core adds +1 starting Signal');
assert.equal(charged.base,7,'River starts from 3 Signal plus four discovered-Core Signal');
assert.equal(charged.coreCharge,5,'Market progression still changes Core recharge independently');
assert.equal(charged.marketBonus,2);

console.log('The River 3|3 Core/Void growth regressions passed');
