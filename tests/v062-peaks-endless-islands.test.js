const assert=require('node:assert/strict');
const E=require('../engine.js');
const D=require('../data.js');
const G=require('../game.js');

const huge=Array(15).fill(Number.MAX_SAFE_INTEGER);
const visible=(item,board=E.getBoardSize())=>item.x>=0&&item.y>=0&&item.x+item.size<=board.G&&item.y+item.size<=board.H;
const residue=(value,step)=>((value%step)+step)%step;
const rectOverlap=(a,b)=>a.x<b.x+b.size&&a.x+a.size>b.x&&a.y<b.y+b.size&&a.y+a.size>b.y;

function advanceToStage(game,targetStage){
  const state=game.state();
  while(game.snapshot().stage.index<targetStage){
    state.cleared=true;state.blocked=false;state.needsReroll=false;state.failureReason=null;state.running=false;
    state.nextShopType='none';state.intermissionResolved=true;state.pendingCircuit=null;state.pendingModPlacement=null;state.shopOpen=false;
    assert.equal(game.advance(),true,'advance to Stage '+targetStage);
  }
}
function syntheticPiece(id,a,b,x,y,rr=0){
  const p=E.pieceFrom({a,b},x,y,0,rr,id);p.tile={id:'island-'+id,a,b,generation:1,powerMultiplier:1,upgrade:0};return p
}

assert.equal(D.PEAKS_ENDLESS_VOID_COUNT,4);
assert.equal(D.PEAKS_ENDLESS_CORE_CHANCE_NUMERATOR,2);
assert.equal(D.PEAKS_ENDLESS_CORE_CHANCE_DENOMINATOR,3);
assert.equal(D.VOID_COLUMN_SOFT_CAP,2);
assert.equal(D.ISLANDS_CORE_MAX_PHYSICAL,12);
assert.equal(D.ISLAND_LINK_SIGNAL_STEP,2);

E.setBoardSize(18,24);
const islands=G.createGame(E,{seed:62010,GAME_MODE:'islands',TARGETS:huge,STARTING_UNDO_CONSUMABLES:1});
assert.equal(islands.state().gameMode,'islands');
assert.equal(islands.state().cores.length,12,'6|6 opens with six Cores per half');
assert.equal(islands.state().voids.length,0,'6|6 opening topology is Core islands, not opening Voids');
assert.equal(islands.snapshot().signal.base,2);
assert.equal(islands.snapshot().islands.componentCount,0);
assert.equal(islands.state().cores.every(core=>visible(core)),true);
for(const half of ['north','south']){
  const cores=islands.state().cores.filter(core=>core.half===half).sort((a,b)=>a.pip-b.pip);
  assert.equal(cores.length,6);
  assert.deepEqual(cores.map(core=>core.pip),[0,1,2,3,4,5]);
}

const state=islands.state();
state.hand[0]={id:'island-root-double',a:2,b:2,generation:1,powerMultiplier:1,upgrade:0};
const rootCandidates=islands.candidatesForIndex(0);
assert(rootCandidates.length>0,'opening double can start from a Core port');
assert(rootCandidates.every(candidate=>candidate.islandAnchor===true&&candidate.islandAnchorCoreId),'6|6 root placements are Core-anchored, not free placement');
const rootCandidate=rootCandidates[0],rootBegin=islands.beginPlacement(0,rootCandidate);
assert.equal(rootBegin.ok,true);
assert.equal(rootBegin.islandDormant,false);
assert.equal(rootBegin.islandAnchorCoreId,rootCandidate.islandAnchorCoreId);
const rootFinish=islands.finishPlacement(rootBegin);
assert.equal(rootFinish.ok,true);
assert.equal(islands.snapshot().islands.componentCount,1);
assert.equal(islands.snapshot().islands.dormantComponentCount,0);

state.cleared=false;state.blocked=false;state.needsReroll=false;state.failureReason=null;state.running=false;state.pendingCircuit=null;
state.hand[0]={id:'island-dormant-tile',a:2,b:3,generation:1,powerMultiplier:1,upgrade:0};
const dormantCandidate=islands.candidatesForIndex(0).find(candidate=>candidate.islandAnchorCoreId&&candidate.islandAnchorCoreId!==rootCandidate.islandAnchorCoreId);
assert(dormantCandidate,'another free Core can found a disconnected island');
const dormantBegin=islands.beginPlacement(0,dormantCandidate);
assert.equal(dormantBegin.ok,true);
assert.equal(dormantBegin.islandDormant,true);
assert.equal(dormantBegin.sim.output,0,'dormant island produces no score');
const dormantFinish=islands.finishPlacement(dormantBegin);
assert.equal(dormantFinish.ok,true);
assert.equal(islands.snapshot().score.last,0);
assert.equal(islands.snapshot().islands.dormantComponentCount,1);
const dormantCircuit=[...state.events].reverse().find(event=>event.type==='circuit-check');
assert.equal(dormantCircuit.reason,'dormant-island','dormant construction cannot discover a Circuit');

const saved=islands.exportState();
E.setBoardSize(18,24);
const restored=G.createGame(E,{seed:1,GAME_MODE:'classic',TARGETS:huge});
assert.equal(restored.restoreState(saved),true);
assert.equal(restored.state().gameMode,'islands');
assert.deepEqual(restored.snapshot().islands,islands.snapshot().islands,'active/dormant Island state survives save/restore');

E.setBoardSize(18,24);
const bridge=G.createGame(E,{seed:62011,GAME_MODE:'islands',TARGETS:huge,STARTING_UNDO_CONSUMABLES:1});
const bs=bridge.state();
const active=syntheticPiece(1,1,2,0,22),dormant=syntheticPiece(2,3,4,8,22);
bs.pieces=[active,dormant];bs.placedTileIds=[active.tile.id,dormant.tile.id];bs.idc=2;bs.islandRootPieceId=1;bs.islandSignalBonus=0;bs.turn=2;bs.roundTurn=2;
bs.cleared=false;bs.blocked=false;bs.needsReroll=false;bs.failureReason=null;bs.running=false;bs.pendingCircuit=null;bs.pendingModPlacement=null;bs.shopOpen=false;
bs.hand=[{id:'island-bridge',a:2,b:3,generation:1,powerMultiplier:1,upgrade:0},null,null,null,null];
assert.equal(bridge.islandTelemetry().componentCount,2);
assert.equal(bridge.islandTelemetry().dormantComponentCount,1);
const bridgeCandidate=bridge.candidatesForIndex(0).find(candidate=>candidate.x===4&&candidate.y===22&&candidate.rr===0);
assert(bridgeCandidate,'matching domino can bridge active and dormant components');
const bridgeBegin=bridge.beginPlacement(0,bridgeCandidate);
assert.equal(bridgeBegin.ok,true);
assert.equal(bridgeBegin.islandDormant,false);
assert.equal(bridgeBegin.islandLinkCount,1);
assert.equal(bridgeBegin.islandSignalAdded,2);
assert.equal(bs.islandSignalBonus,2,'link reward applies before Signal resolves');
assert.equal(bridge.snapshot().signal.base,4,'linked island permanently raises starting Signal from 2 to 4');
assert(bridgeBegin.sim.output>0,'linked island rejoins normal scoring');
bridge.finishPlacement(bridgeBegin);
assert.equal(bridge.islandTelemetry().componentCount,1);
assert.equal(bridge.islandTelemetry().dormantComponentCount,0);
const placement=[...bs.events].reverse().find(event=>event.tile?.id==='island-bridge'&&event.placement);
assert.equal(placement.islandLinkCount,1);
assert.equal(placement.islandSignalAdded,2);
assert.equal(placement.islandSignalBonus,2);
assert.equal(bridge.canUndo(),true);
const undone=bridge.useUndo();
assert.equal(undone.ok,true);
assert.equal(bridge.state().islandSignalBonus,0,'Undo restores pre-link Signal capacity');
assert.equal(bridge.islandTelemetry().componentCount,2,'Undo restores the disconnected island');
assert.equal(bridge.islandTelemetry().dormantComponentCount,1);

function endlessGrowth(seed){
  E.setBoardSize(18,24);
  const game=G.createGame(E,{seed,GAME_MODE:'peaks',TARGETS:huge}),s=game.state();
  advanceToStage(game,5);
  assert.equal(s.cores.length,10);
  assert.equal(s.voids.length,20);
  s.standardComplete=true;s.endlessMode=true;s.endlessStartedRound=s.round;
  advanceToStage(game,6);
  const stage6=[...s.events].reverse().find(event=>event.type==='peaks-endless-growth'&&event.stage===6);
  assert(stage6,'Peaks Endless keeps growing at Stage 6');
  assert.equal(stage6.nodeKind,'void','seed fixture exercises Core→Void substitution');
  assert.equal(stage6.voidCount,5,'Void growth node means four guaranteed Voids plus the substituted Core slot');
  assert.equal(s.cores.length,10);
  assert.equal(s.voids.length,25);
  assert.equal(game.snapshot().signal.discoveredCoreCount,4,'Void substitution does not grant discovered-Core Signal');
  advanceToStage(game,7);
  const stage7=[...s.events].reverse().find(event=>event.type==='peaks-endless-growth'&&event.stage===7);
  assert(stage7);
  assert.equal(stage7.nodeKind,'core','next deterministic growth fixture exercises a real Core');
  assert.equal(stage7.voidCount,4,'real Core keeps the four guaranteed Peaks Voids');
  assert.equal(s.cores.length,11);
  assert.equal(s.voids.length,29);
  assert.equal(game.snapshot().signal.discoveredCoreCount,5);
  assert.equal(game.snapshot().signal.discoveredCoreBonus,5);
  const discoveredVoids=s.voids.filter(item=>Number.isFinite(Number(item.stage)));
  assert(discoveredVoids.length>=20);
  for(const event of s.events.filter(event=>event.type==='void-discover'&&event.stage>=2)){
    assert(event.voidLattice,'Void telemetry records flexible domino grid');
    assert.equal(event.voidLattice.stepX,E.S);
    assert.equal(event.voidLattice.stepY,E.S);
    for(const item of event.voids){
      assert.equal(residue(item.x,event.voidLattice.stepX),event.voidLattice.x);
      assert.equal(residue(item.y,event.voidLattice.stepY),event.voidLattice.y);
    }
  }
  const geometry=[...s.cores,...s.voids];
  for(let i=0;i<geometry.length;i++)for(let j=i+1;j<geometry.length;j++)assert.equal(rectOverlap(geometry[i],geometry[j]),false,'Endless growth geometry never overlaps');
  return{cores:s.cores.map(core=>({id:core.id,x:core.x,y:core.y,stage:core.stage||null})),voids:s.voids.map(v=>({id:v.id,x:v.x,y:v.y,stage:v.stage||null,growthNode:!!v.growthNode})),growth:s.events.filter(event=>event.type==='peaks-endless-growth').map(event=>({stage:event.stage,nodeKind:event.nodeKind,nodeId:event.nodeId,voidIds:event.voidIds}))};
}
const growthA=endlessGrowth(62001),growthB=endlessGrowth(62001);
assert.deepEqual(growthB,growthA,'Peaks Endless Core/Void substitution and placement remain seed deterministic');

console.log('v0.62 Peaks Endless erosion and 6|6 Islands regressions passed');
