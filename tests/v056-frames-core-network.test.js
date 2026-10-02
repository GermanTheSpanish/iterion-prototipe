const assert=require('node:assert/strict');
const D=require('../data.js');
const E=require('../engine.js');
const G=require('../game.js');

function piece(a,b,x,y,rr,id){
  const p=E.pieceFrom({a,b},x,y,0,rr,id);
  p.tile={id:`coverage-${id}`,a,b};
  return p
}
const rectOverlap=(a,b)=>a.x<b.x+b.size&&a.x+a.size>b.x&&a.y<b.y+b.size&&a.y+a.size>b.y;
const residue=(value,cell=E.S)=>((value%cell)+cell)%cell;

assert.equal(D.VERSION,'0.57.0');
assert.equal(D.FRAMES_CORE_MAX_PHYSICAL,6);
assert.deepEqual(D.FRAMES_CORE_DISCOVERY_STAGES,[2,3,4,5]);

E.setBoardSize(30,40);
const probe=G.createGame(E,{seed:56001,GAME_MODE:'frames'});
const line=Array.from({length:6},(_,i)=>piece(1,1,2+i*4,8,0,i+1));
const coverageCore={id:'coverage-core',slot:'probe',x:0,y:8,size:2,ports:['R'],archetype:'relay',level:1};
const coverage=probe.coreCoverageTelemetry(line,[coverageCore]);
assert.deepEqual(coverage.rows.map(row=>row.distance),[0,1,2,3,4,5],'coverage uses deterministic topological hops from Core-connected tiles');
assert.equal(coverage.maxDistance,5);
assert.equal(coverage.p50Distance,2);
assert.equal(coverage.beyondStartCount,1,'Frames start Signal 4 leaves only the fifth hop beyond the initial budget');
assert.equal(coverage.worstTileId,'coverage-6');

function runProgression(seed){
  E.setBoardSize(18,24);
  const game=G.createGame(E,{seed,GAME_MODE:'frames',TARGETS:Array(15).fill(Number.MAX_SAFE_INTEGER)}),state=game.state(),counts=[state.cores.length],discoveries=[];
  for(let targetStage=2;targetStage<=5;targetStage++){
    while(game.snapshot().stage.index<targetStage){
      state.cleared=true;state.blocked=false;state.running=false;state.nextShopType='none';state.intermissionResolved=true;state.pendingCircuit=null;state.pendingModPlacement=null;state.shopOpen=false;
      assert.equal(game.advance(),true)
    }
    counts.push(state.cores.length);
    const event=[...state.events].reverse().find(item=>item.type==='core-discover'&&item.stage===targetStage);
    assert(event,`Stage ${targetStage} must discover one Frames Core`);
    assert.equal(event.connectedAtDiscovery,0,'new frame infrastructure must not auto-connect on an empty machine');
    assert.equal(event.frameFallback,false,'normal stage growth must place the Core in the newly opened frame');
    const current=D.BOARD_SIZES[targetStage-1],previous=D.BOARD_SIZES[targetStage-2],oldRect={x:Math.floor((current[0]-previous[0])/2),y:Math.floor((current[1]-previous[1])/2),w:previous[0],h:previous[1]},core=event.core;
    assert.equal(core.x>=oldRect.x&&core.y>=oldRect.y&&core.x+core.size<=oldRect.x+oldRect.w&&core.y+core.size<=oldRect.y+oldRect.h,false,'new Core must sit in the new outer frame');
    assert.equal(state.voids.some(voidItem=>rectOverlap(core,voidItem)),false,'new Core may not overlap a Void');
    const canonical=[...state.cores,...state.voids].find(item=>item.siteId);assert(canonical,'Frames must retain one canonical 2|2 pip site as the lattice reference');
    const expectedLattice={x:residue(canonical.x),y:residue(canonical.y)};
    assert.deepEqual({x:residue(core.x),y:residue(core.y)},expectedLattice,'Market-spawned Frames Cores must remain on the canonical pip lattice');
    assert.deepEqual(event.lattice,expectedLattice,'Core discovery telemetry must record the lattice used for placement');
    discoveries.push({stage:event.stage,id:core.id,x:core.x,y:core.y,ports:[...core.ports],archetype:core.archetype})
  }
  const snap=game.snapshot();
  assert.equal(snap.cores.maxPhysical,6);
  assert.equal(snap.cores.items.length,6);
  assert.equal(snap.cores.progressMilestones.filter(key=>key.startsWith('discover:')).length,4);
  assert.match(game.debugText(),/coverage=max:/);
  return{counts,discoveries}
}
const first=runProgression(56002),second=runProgression(56002);
assert.deepEqual(first.counts,[2,3,4,5,6]);
assert.deepEqual(second,first,'Frames Core growth must be seed-deterministic');
for(const seed of [1153920735,1362192979,56003,56004,56005,56006,56007,56008])runProgression(seed);

console.log('v0.56 Frames distributed Core network regressions passed');
