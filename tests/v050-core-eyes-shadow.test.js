const assert=require('node:assert/strict');
const E=require('../engine.js');
const D=require('../data.js');
const G=require('../game.js');
const C=require('../mode-carousel.js');

function piece(a,b,x,y,rr,id){
  const p=E.pieceFrom({a,b},x,y,0,rr,id);
  p.tile={id:`signal-${id}`,a,b};
  return p
}
const events=(result,type)=>(result.events||[]).filter(event=>event.type===type);

assert.equal(D.CORE_SIGNAL_BASE,24);
assert.equal(D.CORE_SIGNAL_MAX,24);
assert.equal(D.CORE_SIGNAL_ENABLED,true);
assert.equal(D.CORE_SIGNAL_SHADOW,false);
assert.deepEqual([...D.CORE_ARCHETYPES],['relay','reservoir','distributor','conductor']);
assert.deepEqual(C.MODES.filter(mode=>mode.available).map(mode=>mode.id),['classic','eyes','frames']);

E.setBoardSize(18,24);
const classic=G.createGame(E,{seed:5001,GAME_MODE:'classic'});
assert.equal(classic.state().gameMode,'classic');
assert.deepEqual(classic.state().cores,[]);
assert.equal(classic.snapshot().signal.enabled,false);
assert.equal(classic.snapshot().signal.shadowEnabled,false);

E.setBoardSize(18,24);
const first=G.createGame(E,{seed:5002,GAME_MODE:'eyes'}),second=G.createGame(E,{seed:5002,GAME_MODE:'eyes'});
assert.equal(first.state().gameMode,'eyes');
assert.equal(first.state().cores.length,2);
assert.deepEqual(first.state().cores,second.state().cores,'Core topology must be deterministic without consuming gameplay RNG');
assert.deepEqual(first.state().cores.map(core=>core.slot),['north','south']);
assert(first.state().cores.every(core=>core.level===1&&D.CORE_ARCHETYPES.includes(core.archetype)));
assert(first.state().cores.every(core=>core.ports.length>=1&&core.ports.length<=4&&new Set(core.ports).size===core.ports.length));
assert(first.state().cores[0].y<first.state().cores[1].y);
const [northCore,southCore]=first.state().cores,northCenter=northCore.y+northCore.size/2,southCenter=southCore.y+southCore.size/2;
assert.equal(northCenter,8,'The Eyes north pip should sit near one-third of the opening board');
assert.equal(southCenter,16,'The Eyes south pip should sit near two-thirds of the opening board');
assert.equal(southCenter-northCenter,8,'The Eyes pips should remain reachable without spanning half the board');
assert.equal(first.snapshot().cores.interaction,'physical');
assert.equal(first.snapshot().signal.enabled,true);
assert.equal(first.snapshot().signal.interaction,'runtime');
assert.equal(first.snapshot().signal.base,10);
assert.equal(first.snapshot().signal.max,10);
assert.equal(first.snapshot().signal.shadowEnabled,false);

E.setBoardSize(30,40);
const line=[
  piece(1,2,0,8,0,1),
  piece(2,3,4,8,0,2),
  piece(3,4,8,8,0,3),
  piece(4,5,12,8,0,4)
];
const limited=E.bestSignal(1,line,{initialOutput:2,signalEnabled:true,signalBase:2,signalMax:2});
assert.equal(limited.traversals,2,'Signal must stop before entering a new tile with zero remaining charge');
assert(events(limited,'signal-depleted').some(event=>event.piece===4));
assert.equal(limited.signalRuntime.depleted,true);
assert.equal(limited.signalRuntime.remaining,0);

const refuelled=E.bestSignal(1,line,{initialOutput:2,signalEnabled:true,signalBase:2,signalMax:2,signalCoreIdsByPiece:new Map([[3,['core-a']]])});
assert.equal(refuelled.traversals,3,'a reached Core must refill Signal before the next tile');
assert.equal(events(refuelled,'signal-depleted').length,0);
assert.deepEqual(refuelled.signalRuntime.activatedCoreIds,['core-a']);
assert.equal(refuelled.signalRuntime.remaining,1);
const refill=events(refuelled,'core-activate')[0];
assert.equal(refill.beforeSignal,0);
assert.equal(refill.afterSignal,2);
assert.equal(refill.role,'lead');
assert.equal(refill.lead,true);
assert.equal(refill.last,true);

const ordered=E.bestSignal(1,line,{initialOutput:2,signalEnabled:true,signalBase:2,signalMax:2,signalCoreIdsByPiece:new Map([[2,['core-north']],[3,['core-south']]])});
assert.deepEqual(ordered.signalRuntime.activatedCoreIds,['core-north','core-south']);
assert.deepEqual(events(ordered,'core-activate').map(event=>event.role),['lead','last'],'first Core leads and final Core receives the LAST role');
assert.equal(events(ordered,'core-activate')[0].last,false);
assert.equal(events(ordered,'core-activate')[1].last,true);

const splitFixture=[
  piece(3,3,6,8,0,1),
  piece(5,3,2,8,0,2),
  piece(3,4,10,8,0,3),
  piece(3,2,7,10,1,4)
];
const split=E.bestSignal(4,splitFixture,{initialOutput:5,bifurcate:true,signalEnabled:true,signalBase:5,signalMax:5});
assert.deepEqual(events(split,'signal-fork')[0].signalBudgets,[2,2],'Signal remainder must divide deterministically after the splitter pays its first-visit cost');
assert.deepEqual(events(split,'signal-start').map(event=>event.signalRemaining),[2,2]);

const reboundFixture=[
  piece(0,0,6,8,0,1),
  piece(0,3,2,8,0,2),
  piece(0,5,10,8,0,3),
  piece(0,2,7,10,1,4)
];
const rebound=E.bestSignal(4,reboundFixture,{initialOutput:5,bifurcate:true,signalEnabled:true,signalBase:6,signalMax:6});
const costsByPiece=new Map();
for(const op of events(rebound,'op'))if(op.signalCost!=null)costsByPiece.set(op.piece,(costsByPiece.get(op.piece)||0)+op.signalCost);
assert([...costsByPiece.values()].every(cost=>cost===1),'rebound/retrace operations on the same physical tile must not consume Signal twice');

E.setBoardSize(18,24);
const core=first.state().cores[0],tile=first.state().set.find(t=>t.id==='d1-2'),overlapPiece=E.pieceFrom(tile,core.x,core.y,0,0,991);overlapPiece.tile={...tile};
const corePhysical=first.coreShadowTelemetry([overlapPiece],[core]);
assert.deepEqual(corePhysical.overlapTileIds,[tile.id],'Core telemetry must still expose invalid legacy overlaps');

const rootTile=first.state().set.find(t=>t.id==='d1-1'),replacedHandTile=first.state().hand[0];first.state().reserve=first.state().reserve.filter(t=>t.id!==rootTile.id);if(replacedHandTile&&replacedHandTile.id!==rootTile.id)first.state().reserve.push(replacedHandTile);first.state().hand[0]=rootTile;
assert.deepEqual(first.previewPlacement(0,{x:core.x,y:core.y,z:0,rr:0}),{ok:false,reason:'core-overlap'});
assert.deepEqual(first.beginPlacement(0,{x:core.x,y:core.y,z:0,rr:0}),{ok:false,reason:'core-overlap'});
const rootCandidates=first.candidatesForIndex(0);
assert(rootCandidates.length>0,'The Eyes must retain legal opening placements');
for(const candidate of rootCandidates){
  const candidatePiece=E.pieceFrom(rootTile,candidate.x,candidate.y,0,candidate.rr,992);candidatePiece.tile={...rootTile};
  assert.equal(first.coreShadowTelemetry([candidatePiece]).overlapTileIds.length,0,'legal opening placements may not occupy a Core footprint')
}

const side=core.ports[0],cell=E.S;
const connectionPlacement=side==='U'?{x:core.x,y:core.y-cell,rr:0}:side==='D'?{x:core.x,y:core.y+core.size,rr:0}:side==='L'?{x:core.x-cell,y:core.y,rr:1}:{x:core.x+core.size,y:core.y,rr:1};
const connectionPiece=E.pieceFrom(tile,connectionPlacement.x,connectionPlacement.y,0,connectionPlacement.rr,993);connectionPiece.tile={...tile};
const connected=first.coreShadowTelemetry([connectionPiece],[core]).cores[0];
assert(connected.connectedTileIds.includes(tile.id),'a domino touching an active Core port must register as physically connected');
assert(connected.connectedPorts.includes(side),'the touched Core port must report its connected state');
assert.equal(first.coreShadowTelemetry([connectionPiece],[core]).overlapTileIds.length,0);

const runtime=G.createGame(E,{seed:5003,GAME_MODE:'eyes',TARGETS:Array(15).fill(Number.MAX_SAFE_INTEGER)}),rs=runtime.state();
const a=rs.set.find(t=>t.id==='d1-2'),b=rs.set.find(t=>t.id==='d2-3'),pa=E.pieceFrom(a,0,8,0,0,1),pb=E.pieceFrom(b,4,8,0,0,2);pa.tile={...a};pb.tile={...b};
rs.cores=[{id:'core-test',slot:'north',x:8,y:8,size:2,ports:['L'],archetype:'relay',level:1}];
rs.pieces=[pa,pb];rs.placedTileIds=[a.id,b.id];rs.hand=[];rs.reserve=[];rs.idc=2;rs.ouroborosMode=true;rs.running=false;rs.cleared=false;rs.blocked=false;rs.needsReroll=false;rs.failureReason=null;rs.shopOpen=false;rs.pendingCircuit=null;rs.pendingModPlacement=null;
const fire=runtime.beginOuroborosFire(a.id);
assert.equal(fire.ok,true);
assert(events(fire.sim,'core-activate').some(event=>event.coreId==='core-test'),'game orchestration must map a physical Core connection into engine Signal activation');
assert.deepEqual(fire.signalRuntime.activatedCoreIds,['core-test']);
assert.equal(fire.signalRuntime.remaining,10);
const fireResult=runtime.finishPlacement(fire);assert.equal(fireResult.ok,true);
assert.equal(runtime.snapshot().signal.last.interaction,'runtime');
assert.deepEqual(runtime.snapshot().signal.last.activatedCoreIds,['core-test']);
assert.match(runtime.debugText(),/Signal: 10\/10/);
assert.match(runtime.debugText(),/cores=core-test/);

const saved=first.exportState(),restored=G.createGame(E,{seed:1,GAME_MODE:'classic'});
assert.equal(restored.restoreState(saved),true);
assert.equal(restored.state().gameMode,'eyes');
assert.deepEqual(restored.state().cores,first.state().cores);
assert.equal(restored.snapshot().cores.interaction,'physical');
assert.equal(restored.snapshot().signal.enabled,true);
assert.equal(restored.snapshot().signal.shadowEnabled,false);

const legacy=first.exportState(),legacyCore=legacy.state.cores[0],legacyTile=legacy.state.set.find(t=>t.id==='d1-2');
legacy.state.hand=legacy.state.hand.map(t=>t?.id===legacyTile.id?null:t);legacy.state.reserve=legacy.state.reserve.filter(t=>t?.id!==legacyTile.id);legacy.state.pieces=[{id:991,tile:{...legacyTile},x:legacyCore.x,y:legacyCore.y,rr:0}];legacy.state.placedTileIds=[legacyTile.id];
const migrated=G.createGame(E,{seed:2,GAME_MODE:'classic'});
assert.equal(migrated.restoreState(legacy),true);
assert.equal(migrated.coreShadowTelemetry().overlapTileIds.length,0,'v0.50.0 Core-shadow saves must migrate away from occupied Core footprints');
assert(migrated.state().events.some(event=>event.type==='core-relocate'&&event.reason==='legacy-overlap'),'legacy overlap migration must be reconstructable from telemetry');

console.log('The Eyes physical Core + Signal runtime regressions passed');
