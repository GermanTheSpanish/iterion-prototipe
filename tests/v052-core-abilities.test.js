const assert=require('node:assert/strict');
const E=require('../engine.js');
const D=require('../data.js');
const G=require('../game.js');
const H=require('../help.js');

function piece(a,b,x,y,rr,id){
  const p=E.pieceFrom({a,b},x,y,0,rr,id);
  p.tile={id:`core-v1-${id}`,a,b};
  return p
}
const events=(result,type)=>(result.events||[]).filter(event=>event.type===type);
const coreOptions=(pieceId,core,{signalBase=2,signalMax=2,links=[]}={})=>({
  signalEnabled:true,
  signalBase,
  signalMax,
  signalCoreIdsByPiece:new Map([[pieceId,[core.id]]]),
  signalCoreById:new Map([[core.id,{...core,links}]]),
  coreLevelStep:D.CORE_SIGNAL_LEVEL_STEP,
  reservoirBonus:D.CORE_RESERVOIR_BONUS
});

assert.equal(D.VERSION,'0.64.0');
assert.equal(D.ENGINE_VERSION,'0.21.0-peaks-ridge-v1');
assert.equal(D.CORE_SIGNAL_LEVEL_STEP,4);
assert.equal(D.CORE_RESERVOIR_BONUS,8);
assert.equal(D.CORE_LEVEL_MAX,5);
assert.equal(D.CORE_MAX_PHYSICAL,6);
assert.deepEqual([...D.CORE_DISCOVERY_STAGES],[2,3,4,5]);
assert.equal(D.CORE_UPGRADE_START_STAGE,10);
assert.equal(D.CORE_UPGRADE_STAGE_INTERVAL,3);

E.setBoardSize(30,40);
const line=[
  piece(1,2,0,8,0,1),
  piece(2,3,4,8,0,2),
  piece(3,4,8,8,0,3),
  piece(4,5,12,8,0,4)
];

const reservoirCore={id:'reservoir-a',archetype:'reservoir',level:1};
const reservoir=E.bestSignal(1,line,{initialOutput:2,...coreOptions(2,reservoirCore)});
const reservoirActivation=events(reservoir,'core-activate')[0];
assert.equal(reservoirActivation.archetype,'reservoir');
assert.equal(reservoirActivation.abilityApplied,'reservoir');
assert.equal(reservoirActivation.signalAdded,10,'LEAD Reservoir I must add base 2 + 8 bonus');
assert.equal(reservoirActivation.afterSignal,reservoirActivation.beforeSignal+10,'Core charge must add to remaining Signal rather than refill to a cap');
assert.equal(reservoir.signalRuntime.leadCoreArchetype,'reservoir');

const levelTwoCore={id:'relay-level-two',archetype:'relay',level:2};
const levelTwo=E.bestSignal(1,line,{initialOutput:2,...coreOptions(2,levelTwoCore)});
assert.equal(events(levelTwo,'core-activate')[0].signalAdded,6,'Core II charge must be base 2 + level step 4');
assert.equal(events(levelTwo,'core-activate')[0].afterSignal,events(levelTwo,'core-activate')[0].beforeSignal+6);

const leadRelay={id:'lead-relay',archetype:'relay',level:1};
const followReservoir={id:'follow-reservoir',archetype:'reservoir',level:1};
const follow=E.bestSignal(1,line,{
  initialOutput:2,signalEnabled:true,signalBase:2,signalMax:2,
  signalCoreIdsByPiece:new Map([[2,[leadRelay.id]],[3,[followReservoir.id]]]),
  signalCoreById:new Map([[leadRelay.id,{...leadRelay,links:[]}],[followReservoir.id,{...followReservoir,links:[]}]]),
  coreLevelStep:D.CORE_SIGNAL_LEVEL_STEP,reservoirBonus:D.CORE_RESERVOIR_BONUS
});
assert.deepEqual(events(follow,'core-activate').map(event=>event.archetype),['relay','reservoir']);
assert.equal(events(follow,'core-activate')[1].signalAdded,2,'Reservoir bonus is LEAD-only');
assert.equal(events(follow,'core-activate')[1].afterSignal,events(follow,'core-activate')[1].beforeSignal+2);

const leadReservoir={id:'lead-reservoir',archetype:'reservoir',level:1};
const followRelay={id:'follow-relay',archetype:'relay',level:1};
const nonDrainingFollow=E.bestSignal(1,line,{
  initialOutput:2,signalEnabled:true,signalBase:2,signalMax:2,
  signalCoreIdsByPiece:new Map([[2,[leadReservoir.id]],[3,[followRelay.id]]]),
  signalCoreById:new Map([[leadReservoir.id,{...leadReservoir,links:[]}],[followRelay.id,{...followRelay,links:[]}]]),
  coreLevelStep:D.CORE_SIGNAL_LEVEL_STEP,reservoirBonus:D.CORE_RESERVOIR_BONUS
});
const nonDrainingActivations=events(nonDrainingFollow,'core-activate');
assert.equal(nonDrainingActivations[0].signalAdded,10,'LEAD Reservoir must add base + 8');
assert.equal(nonDrainingActivations[0].afterSignal,11);
assert.equal(nonDrainingActivations[1].beforeSignal,10,'fixture must reach the FOLLOW Core with additive Signal intact');
assert.equal(nonDrainingActivations[1].signalAdded,2);
assert.equal(nonDrainingActivations[1].afterSignal,12,'FOLLOW Core must add its charge instead of clamping Signal');
assert.equal(nonDrainingFollow.signalRuntime.remaining,11,'route must retain additive Core Signal after the next paid visit');

const splitFixture=[
  piece(3,3,6,8,0,11),
  piece(5,3,2,8,0,12),
  piece(3,4,10,8,0,13),
  piece(3,2,7,10,1,14)
];
const baselineSplit=E.bestSignal(14,splitFixture,{initialOutput:5,bifurcate:true,signalEnabled:true,signalBase:5,signalMax:5});
assert.deepEqual(events(baselineSplit,'signal-fork')[0].signalBudgets,[2,2]);
const distributorCore={id:'distributor-a',archetype:'distributor',level:1};
const distributed=E.bestSignal(14,splitFixture,{
  initialOutput:5,bifurcate:true,signalEnabled:true,signalBase:5,signalMax:5,
  signalCoreIdsByPiece:new Map([[11,[distributorCore.id]]]),
  signalCoreById:new Map([[distributorCore.id,{...distributorCore,links:[]}]]),
  coreLevelStep:D.CORE_SIGNAL_LEVEL_STEP,reservoirBonus:D.CORE_RESERVOIR_BONUS
});
const distributedFork=events(distributed,'signal-fork')[0];
assert.deepEqual(distributedFork.signalBudgets,[9,9],'LEAD Distributor must copy the full additive Signal into the first split');
assert.equal(distributedFork.distributorCoreId,distributorCore.id);
assert.equal(distributed.signalRuntime.distributorUsed,true);

const conductorFixture=[
  piece(1,2,0,12,0,21),
  piece(2,2,4,12,0,22),
  piece(2,2,8,12,0,23),
  piece(2,3,12,12,0,24),
  piece(3,4,16,12,0,25)
];
const noConductor=E.bestSignal(21,conductorFixture,{initialOutput:3,signalEnabled:true,signalBase:2,signalMax:2});
assert.equal(noConductor.traversals,2,'without Conductor the constrained line must stop after two paid visits');
const conductorCore={id:'conductor-a',archetype:'conductor',level:1};
const conductor=E.bestSignal(21,conductorFixture,{
  initialOutput:3,...coreOptions(22,conductorCore)
});
assert.equal(conductor.traversals,4,'LEAD Conductor must extend the route by making later double visits free');
const freeDouble=events(conductor,'op').find(event=>event.piece===23);
assert.equal(freeDouble.signalCost,0);
assert.equal(freeDouble.conductorCoreId,conductorCore.id);
assert.equal(conductor.signalRuntime.leadCoreArchetype,'conductor');

const relayFixture=[
  piece(1,2,0,18,0,31),
  piece(2,3,4,18,0,32),
  piece(4,5,16,18,0,33),
  piece(5,6,20,18,0,34)
];
const relayCore={id:'relay-a',archetype:'relay',level:1};
const relay=E.bestSignal(31,relayFixture,{
  initialOutput:3,
  ...coreOptions(32,relayCore,{
    signalBase:3,
    signalMax:3,
    links:[
      {pieceId:32,half:1,port:'R'},
      {pieceId:33,half:0,port:'L'}
    ]
  })
});
const relayEvent=events(relay,'core-relay')[0];
assert(relayEvent,'LEAD Relay must bridge a connected dead end once per Move');
assert.equal(relayEvent.fromPieceId,32);
assert.equal(relayEvent.toPieceId,33);
assert.equal(relay.traversals,3);
assert.equal(relay.signalRuntime.relayUsed,true);

E.setBoardSize(18,24);
const initial=G.createGame(E,{seed:5200,GAME_MODE:'eyes'});
assert.equal(initial.state().cores.length,2);
assert.equal(new Set(initial.state().cores.map(core=>core.archetype)).size,2,'The Eyes must start with two distinct Core archetypes');
assert(initial.state().cores.filter(core=>core.archetype==='relay').every(core=>core.ports.length>=2),'Relay must always have at least two usable ports');

const saved=initial.exportState();
saved.state.round=33;
saved.state.standardComplete=true;
saved.state.endlessMode=true;
saved.state.endlessStartedRound=16;
saved.state.coreProgressMilestones=[];
saved.state.cores[1]={...saved.state.cores[1],archetype:saved.state.cores[0].archetype};
const progressed=G.createGame(E,{seed:1,GAME_MODE:'classic'});
assert.equal(progressed.restoreState(saved),true);
const progressedState=progressed.state();
assert.equal(progressedState.gameMode,'eyes');
assert.equal(progressedState.cores.length,6,'Stage 12 restore must retroactively discover one Eyes Core at Stages 2, 3, 4 and 5');
assert.equal(new Set(progressedState.cores.map(core=>core.id)).size,6);
assert.equal(new Set(progressedState.cores.map(core=>core.archetype)).size,4,'the first discoveries must complete the four Core archetypes before repeats');
assert.deepEqual(progressedState.coreProgressMilestones,['discover:2','discover:3','discover:4','discover:5','upgrade:10']);
assert.equal(progressedState.voids.length,0,'1|1 discovery never creates Voids');
assert.equal(progressedState.cores.reduce((sum,core)=>sum+core.level,0),7,'Stage 10 milestone must upgrade exactly one of six Cores to II');
assert.equal(progressed.coreShadowTelemetry().overlapTileIds.length,0);
assert(progressedState.events.some(event=>event.type==='core-archetype-migrate'&&event.reason==='restore'),'legacy duplicate Core labels must normalize before abilities become gameplay');
assert(progressedState.events.some(event=>event.type==='core-discover'&&event.reason==='restore'));
assert(progressedState.events.some(event=>event.type==='core-upgrade'&&event.reason==='restore'));

const relayProgressed=progressedState.cores.find(core=>core.archetype==='relay');
assert(relayProgressed);
assert(relayProgressed.ports.length>=2);
const fakeTelemetry={cores:[{
  id:relayProgressed.id,
  connectedPorts:relayProgressed.ports.slice(0,2),
  connectedTileIds:['tile-a','tile-b']
}]};
progressedState.events.push({type:'test-core-state',signal:{
  leadCoreId:relayProgressed.id,
  activations:[{coreId:relayProgressed.id,role:'lead',order:1,beforeSignal:7,afterSignal:24}],
  effects:{relayCount:1,distributorSplitCount:0,conductorFreeVisits:0,reservoirLead:false}
}});
const inspected=H.inspectCore(progressedState,relayProgressed.id,fakeTelemetry);
assert.equal(inspected.displayName,'Relay');
assert.equal(inspected.ready,true);
assert.equal(inspected.lastRole,'lead');
assert.equal(inspected.lastBeforeSignal,7);
assert.equal(inspected.lastAfterSignal,24);
assert.match(inspected.ability.rule,/dead end|stop/i);

const legacy=initial.exportState();
legacy.state.cores[0]={...legacy.state.cores[0],archetype:'relay',ports:['L']};
legacy.state.coreProgressMilestones=[];
const legacyRestored=G.createGame(E,{seed:2,GAME_MODE:'classic'});
assert.equal(legacyRestored.restoreState(legacy),true);
assert(legacyRestored.state().cores[0].ports.length>=2,'legacy one-port Relay saves must become usable deterministically');
assert(legacyRestored.state().events.some(event=>event.type==='core-port-migrate'));

const gameRuntime=G.createGame(E,{seed:5201,GAME_MODE:'eyes',TARGETS:Array(15).fill(Number.MAX_SAFE_INTEGER)}),rs=gameRuntime.state();
const ta=rs.set.find(tile=>tile.id==='d1-2'),tb=rs.set.find(tile=>tile.id==='d2-3');
const pa=E.pieceFrom(ta,0,8,0,0,1),pb=E.pieceFrom(tb,4,8,0,0,2);pa.tile={...ta};pb.tile={...tb};
rs.cores=[{id:'core-runtime-reservoir',slot:'north',x:8,y:8,size:2,ports:['L'],archetype:'reservoir',level:1}];
rs.pieces=[pa,pb];rs.placedTileIds=[ta.id,tb.id];rs.hand=[];rs.reserve=[];rs.idc=2;rs.ouroborosMode=true;rs.running=false;rs.cleared=false;rs.blocked=false;rs.needsReroll=false;rs.failureReason=null;rs.shopOpen=false;rs.pendingCircuit=null;rs.pendingModPlacement=null;
const fire=gameRuntime.beginOuroborosFire(ta.id);
assert.equal(fire.ok,true);
const gameActivation=events(fire.sim,'core-activate')[0];
assert.equal(gameActivation.archetype,'reservoir');
assert.equal(gameActivation.abilityApplied,'reservoir');
assert.equal(gameActivation.signalAdded,D.CORE_SIGNAL_BY_MODE.eyes+D.CORE_RESERVOIR_BONUS,'game.js must pass the Eyes Core charge plus Reservoir bonus into the engine runtime');
assert.equal(gameActivation.afterSignal,gameActivation.beforeSignal+gameActivation.signalAdded);
assert.equal(fire.signalRuntime.leadCoreArchetype,'reservoir');
assert.equal(fire.signalRuntime.effects.reservoirLead,true);

const classic=G.createGame(E,{seed:5202,GAME_MODE:'classic'});
assert.deepEqual(classic.state().cores,[]);
assert.equal(classic.snapshot().signal.enabled,false);

console.log('The Eyes Core abilities, progression and inspector regressions passed');
