const assert=require('node:assert/strict');
const E=require('../engine.js');
const D=require('../data.js');
const G=require('../game.js');

const huge=Array(15).fill(Number.MAX_SAFE_INTEGER);
const rectOverlap=(a,b,cell=E.S)=>a.x<b.x+(b.size||cell)&&a.x+(a.size||cell)>b.x&&a.y<b.y+(b.size||cell)&&a.y+(a.size||cell)>b.y;

function advanceToStage(game,target){
  const state=game.state();
  while(game.snapshot().stage.index<target){
    state.cleared=true;state.blocked=false;state.needsReroll=false;state.failureReason=null;state.running=false;
    state.nextShopType='none';state.intermissionResolved=true;state.pendingCircuit=null;state.pendingModPlacement=null;state.shopOpen=false;
    assert.equal(game.advance(),true,'advance to Stage '+target);
  }
}
function approachSides(core,geometry,board=E.getBoardSize()){
  const cell=E.S,size=core.size||cell,vectors={U:[0,-cell],R:[cell,0],D:[0,cell],L:[-cell,0]};
  const cells=side=>{const[dx,dy]=vectors[side],first=side==='U'?{x:core.x,y:core.y-cell}:side==='R'?{x:core.x+size,y:core.y}:side==='D'?{x:core.x,y:core.y+size}:{x:core.x-cell,y:core.y};return[first,{x:first.x+dx,y:first.y+dy}]};
  return(core.ports||[]).filter(side=>cells(side).every(cellRect=>cellRect.x>=0&&cellRect.y>=0&&cellRect.x+cell<=board.G&&cellRect.y+cell<=board.H&&!geometry.some(item=>item.id!==core.id&&rectOverlap({...cellRect,size:cell},item))))
}
function opening(seed){
  E.setBoardSize(18,24);
  const game=G.createGame(E,{seed,GAME_MODE:'islands',TARGETS:huge}),state=game.state(),geometry=[...state.cores,...state.voids];
  assert.equal(state.cores.length,12);
  assert.equal(state.voids.length,12);
  for(const half of ['north','south']){
    assert.equal(state.cores.filter(item=>item.half===half).length,6);
    assert.equal(state.voids.filter(item=>item.half===half).length,6);
    const halfVoids=state.voids.filter(item=>item.half===half),byX=new Map(),byY=new Map();
    for(const item of halfVoids){byX.set(item.x,(byX.get(item.x)||0)+1);byY.set(item.y,(byY.get(item.y)||0)+1)}
    assert(Math.max(...byX.values())<=2,half+' opening Voids must avoid a third aligned column');
    assert(Math.max(...byY.values())<=2,half+' opening Voids must avoid a third aligned row')
  }
  const north=state.cores.filter(core=>core.half==='north'),south=state.cores.filter(core=>core.half==='south');
  const northBottom=Math.max(...north.map(core=>core.y+core.size)),southTop=Math.min(...south.map(core=>core.y));
  assert(southTop-northBottom>=E.S*2,'6|6 Core halves keep a real two-cell central gap');
  for(const core of state.cores)assert(approachSides(core,geometry).length>0,'opening Void layout must leave every Core one complete two-cell approach');
  for(let i=0;i<geometry.length;i++)for(let j=i+1;j<geometry.length;j++)assert.equal(rectOverlap(geometry[i],geometry[j]),false,'opening geometry never overlaps');
  return{
    game,
    cores:state.cores.map(({id,half,pip,x,y})=>({id,half,pip,x,y})),
    voids:state.voids.map(({id,half,x,y})=>({id,half,x,y}))
  }
}

assert.equal(D.CORE_DISCOVERY_VOID_COUNT_BY_MODE.islands,5);
assert.equal(D.ISLANDS_OPENING_VOID_COUNT_PER_HALF,6);
assert.equal(D.ISLANDS_CORE_MAX_PHYSICAL,16);
assert.equal(D.ISLANDS_ENDLESS_VOID_COUNT,5);
assert.equal(D.ISLANDS_ENDLESS_CORE_CHANCE_NUMERATOR,2);
assert.equal(D.ISLANDS_ENDLESS_CORE_CHANCE_DENOMINATOR,3);

const openingA=opening(63001),openingA2=opening(63001);
assert.deepEqual(openingA2.cores,openingA.cores,'opening Core coordinates are deterministic');
assert.deepEqual(openingA2.voids,openingA.voids,'opening Void coordinates are deterministic for the same seed');
const layouts=new Set();
for(const seed of [63001,63002,63003,63004,63005]){
  const current=opening(seed);
  assert.deepEqual(current.cores.map(({half,pip,x,y})=>({half,pip,x,y})),openingA.cores.map(({half,pip,x,y})=>({half,pip,x,y})),'Core positions stay fixed across runs');
  layouts.add(JSON.stringify(current.voids.map(({half,x,y})=>({half,x,y}))))
}
assert(layouts.size>1,'opening Void layout must vary across seeds');

E.setBoardSize(18,24);
const growth=G.createGame(E,{seed:63010,GAME_MODE:'islands',TARGETS:huge}),gs=growth.state();
assert.deepEqual({cores:gs.cores.length,voids:gs.voids.length},{cores:12,voids:12});
for(let stage=2;stage<=5;stage++){
  advanceToStage(growth,stage);
  assert.equal(gs.cores.length,12+(stage-1),'6|6 adds one Core each normal growth Stage');
  assert.equal(gs.voids.length,12+(stage-1)*5,'6|6 adds five Voids with every normal Core');
  const coreEvent=[...gs.events].reverse().find(event=>event.type==='core-discover'&&event.stage===stage),voidEvent=[...gs.events].reverse().find(event=>event.type==='void-discover'&&event.stage===stage&&event.sourceCoreId===coreEvent?.core?.id);
  assert(coreEvent,'normal Islands growth records Core discovery');
  assert.equal(coreEvent.mode,'islands');
  assert.equal(coreEvent.companionVoidIds.length,5);
  assert(voidEvent);
  assert.equal(voidEvent.count,5);
  assert((coreEvent.approachSides||[]).length>0);
}
assert.equal(gs.cores.length,16);
assert.equal(gs.voids.length,32);
assert.equal(growth.snapshot().signal.discoveredCoreCount,4);
assert.equal(growth.snapshot().signal.discoveredCoreBonus,4);
assert.equal(gs.events.some(event=>event.type==='core-progress-blocked'&&['discover','discover-pack'].includes(event.action)),false,'normal 6|6 growth must fit every Core + five Void packet');

function endlessResult(seed){
  E.setBoardSize(18,24);
  const game=G.createGame(E,{seed,GAME_MODE:'islands',TARGETS:huge}),state=game.state();
  advanceToStage(game,5);
  const before={cores:state.cores.length,voids:state.voids.length,signal:game.snapshot().signal.discoveredCoreCount};
  state.standardComplete=true;state.endlessMode=true;state.endlessStartedRound=state.round;
  advanceToStage(game,6);
  const event=[...state.events].reverse().find(item=>item.type==='islands-endless-growth'&&item.stage===6);
  assert(event,'6|6 Endless must continue terrain growth at Stage 6');
  if(event.nodeKind==='core'){
    assert.equal(event.voidCount,5,'Core Growth Node keeps five guaranteed Voids');
    assert.equal(state.cores.length,before.cores+1);
    assert.equal(state.voids.length,before.voids+5);
    assert.equal(game.snapshot().signal.discoveredCoreCount,before.signal+1)
  }else{
    assert.equal(event.nodeKind,'void');
    assert.equal(event.voidCount,6,'Void Growth Node substitutes the Core slot, producing six Voids');
    assert.equal(state.cores.length,before.cores);
    assert.equal(state.voids.length,before.voids+6);
    assert.equal(game.snapshot().signal.discoveredCoreCount,before.signal,'Void Growth Node grants no Core Signal')
  }
  const geometry=[...state.cores,...state.voids];
  for(let i=0;i<geometry.length;i++)for(let j=i+1;j<geometry.length;j++)assert.equal(rectOverlap(geometry[i],geometry[j]),false,'6|6 Endless geometry never overlaps');
  return{kind:event.nodeKind,cores:state.cores.map(({id,x,y,stage})=>({id,x,y,stage:stage||null})),voids:state.voids.map(({id,x,y,stage,growthNode})=>({id,x,y,stage:stage||null,growthNode:!!growthNode}))}
}

const kinds=new Set(),endlessSamples=[];
for(const seed of [63020,63021,63022,63023,63024,63025]){
  const result=endlessResult(seed);kinds.add(result.kind);endlessSamples.push([seed,result])
}
assert.deepEqual([...kinds].sort(),['core','void'],'seeded 6|6 Endless must exercise both Core and Void Growth Nodes');
const deterministicA=endlessResult(63020),deterministicB=endlessResult(63020);
assert.deepEqual(deterministicB,deterministicA,'6|6 Endless growth remains seed deterministic');

console.log('v0.63 6|6 opening topology and Core/Void growth regressions passed');
