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
assert.equal(first.snapshot().cores.interaction,'shadow');
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
const coreShadow=first.coreShadowTelemetry([overlapPiece],[core]);
assert.deepEqual(coreShadow.overlapTileIds,[tile.id],'shadow telemetry must expose placements that future physical Cores would block');

const saved=first.exportState(),restored=G.createGame(E,{seed:1,GAME_MODE:'classic'});
assert.equal(restored.restoreState(saved),true);
assert.equal(restored.state().gameMode,'eyes');
assert.deepEqual(restored.state().cores,first.state().cores);
assert.equal(restored.snapshot().signal.shadowEnabled,true);

console.log('The Eyes Core + Signal shadow regressions passed');
