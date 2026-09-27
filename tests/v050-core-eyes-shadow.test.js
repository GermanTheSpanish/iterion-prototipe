const assert=require('node:assert/strict');
const E=require('../engine.js');
const D=require('../data.js');
const G=require('../game.js');
const C=require('../mode-carousel.js');

assert.equal(D.CORE_SIGNAL_BASE,24);
assert.equal(D.CORE_SIGNAL_MAX,24);
assert.equal(D.CORE_SIGNAL_SHADOW,true);
assert.deepEqual([...D.CORE_ARCHETYPES],['relay','reservoir','distributor','conductor']);
assert.deepEqual(C.MODES.filter(mode=>mode.available).map(mode=>mode.id),['classic','eyes']);

E.setBoardSize(18,24);
const classic=G.createGame(E,{seed:5001,GAME_MODE:'classic'});
assert.equal(classic.state().gameMode,'classic');
assert.deepEqual(classic.state().cores,[]);
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
assert.equal(first.snapshot().cores.interaction,'physical');
assert.equal(first.snapshot().signal.base,24);
assert.equal(first.snapshot().signal.max,24);
assert.equal(first.snapshot().signal.shadowEnabled,true);

const linear={events:Array.from({length:24},(_,i)=>({type:'op',piece:i+1}))};
let shadow=first.signalShadowTelemetry(linear);
assert.equal(shadow.chargedVisits,24);
assert.equal(shadow.minRemaining,0);
assert.equal(shadow.wouldStop,false,'the tile consuming the final Signal unit still executes');
shadow=first.signalShadowTelemetry({events:[...linear.events,{type:'op',piece:25}]});
assert.equal(shadow.wouldStop,true);
assert.equal(shadow.firstStop.pieceId,25);

shadow=first.signalShadowTelemetry({events:[
  {type:'op',piece:1},{type:'op',piece:2},{type:'op',piece:3},{type:'op',piece:4},
  {type:'signal-fork',piece:4,splitKind:'centered'},
  {type:'signal-start',fork:4,arm:0},{type:'op',piece:5},{type:'signal-end',fork:4,arm:0},
  {type:'signal-start',fork:4,arm:1},{type:'op',piece:6},{type:'signal-end',fork:4,arm:1},
  {type:'signal-join',piece:4}
]});
assert.deepEqual(shadow.splits[0].budgets,[10,10],'remaining Signal divides after the fork tile has paid its first-visit cost');
assert.equal(shadow.wouldStop,false);

shadow=first.signalShadowTelemetry({events:[
  {type:'op',piece:1},{type:'op',piece:2},{type:'op',piece:1},{type:'op',piece:2}
]});
assert.equal(shadow.chargedVisits,2,'retrace/rebound visits do not consume Signal again');
assert.equal(shadow.minRemaining,22);

const core=first.state().cores[0],tile=first.state().set.find(t=>t.id==='d1-2'),overlapPiece=E.pieceFrom(tile,core.x,core.y,0,0,991);overlapPiece.tile={...tile};
const corePhysical=first.coreShadowTelemetry([overlapPiece],[core]);
assert.deepEqual(corePhysical.overlapTileIds,[tile.id],'Core telemetry must still expose invalid legacy overlaps');

const rootTile=first.state().set.find(t=>t.id==='d1-1'),replacedHandTile=first.state().hand[0];first.state().reserve=first.state().reserve.filter(t=>t.id!==rootTile.id);if(replacedHandTile&&replacedHandTile.id!==rootTile.id)first.state().reserve.push(replacedHandTile);first.state().hand[0]=rootTile;
assert.deepEqual(first.previewPlacement(0,{x:core.x,y:core.y,z:0,rr:0}),{ok:false,reason:'core-overlap'});
assert.deepEqual(first.beginPlacement(0,{x:core.x,y:core.y,z:0,rr:0}),{ok:false,reason:'core-overlap'});
const rootCandidates=first.candidatesForIndex(0);
assert(rootCandidates.length>0,'The Eyes must retain legal opening placements');
for(const candidate of rootCandidates){
  const piece=E.pieceFrom(rootTile,candidate.x,candidate.y,0,candidate.rr,992);piece.tile={...rootTile};
  assert.equal(first.coreShadowTelemetry([piece]).overlapTileIds.length,0,'legal opening placements may not occupy a Core footprint')
}

const side=core.ports[0],cell=E.S;
const connectionPlacement=side==='U'?{x:core.x,y:core.y-cell,rr:0}:side==='D'?{x:core.x,y:core.y+core.size,rr:0}:side==='L'?{x:core.x-cell,y:core.y,rr:1}:{x:core.x+core.size,y:core.y,rr:1};
const connectionPiece=E.pieceFrom(tile,connectionPlacement.x,connectionPlacement.y,0,connectionPlacement.rr,993);connectionPiece.tile={...tile};
const connected=first.coreShadowTelemetry([connectionPiece],[core]).cores[0];
assert(connected.connectedTileIds.includes(tile.id),'a domino touching an active Core port must register as physically connected');
assert(connected.connectedPorts.includes(side),'the touched Core port must report its connected state');
assert.equal(first.coreShadowTelemetry([connectionPiece],[core]).overlapTileIds.length,0);

const saved=first.exportState(),restored=G.createGame(E,{seed:1,GAME_MODE:'classic'});
assert.equal(restored.restoreState(saved),true);
assert.equal(restored.state().gameMode,'eyes');
assert.deepEqual(restored.state().cores,first.state().cores);
assert.equal(restored.snapshot().cores.interaction,'physical');
assert.equal(restored.snapshot().signal.shadowEnabled,true);

const legacy=first.exportState(),legacyCore=legacy.state.cores[0],legacyTile=legacy.state.set.find(t=>t.id==='d1-2');
legacy.state.hand=legacy.state.hand.map(t=>t?.id===legacyTile.id?null:t);legacy.state.reserve=legacy.state.reserve.filter(t=>t?.id!==legacyTile.id);legacy.state.pieces=[{id:991,tile:{...legacyTile},x:legacyCore.x,y:legacyCore.y,rr:0}];legacy.state.placedTileIds=[legacyTile.id];
const migrated=G.createGame(E,{seed:2,GAME_MODE:'classic'});
assert.equal(migrated.restoreState(legacy),true);
assert.equal(migrated.coreShadowTelemetry().overlapTileIds.length,0,'v0.50.0 Core-shadow saves must migrate away from occupied Core footprints');
assert(migrated.state().events.some(event=>event.type==='core-relocate'&&event.reason==='legacy-overlap'),'legacy overlap migration must be reconstructable from telemetry');

console.log('The Eyes physical Core + Signal shadow regressions passed');
