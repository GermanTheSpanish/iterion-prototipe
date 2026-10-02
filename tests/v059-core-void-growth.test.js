const assert=require('node:assert/strict');
const E=require('../engine.js');
const D=require('../data.js');
const G=require('../game.js');

const rectOverlap=(a,b)=>a.x<b.x+b.size&&a.x+a.size>b.x&&a.y<b.y+b.size&&a.y+a.size>b.y;
const residue=(value,cell=E.S)=>((value%cell)+cell)%cell;
const cardinallyAdjacent=(a,b)=>{
  const horizontal=(a.x+a.size===b.x||b.x+b.size===a.x)&&a.y<b.y+b.size&&a.y+a.size>b.y;
  const vertical=(a.y+a.size===b.y||b.y+b.size===a.y)&&a.x<b.x+b.size&&a.x+a.size>b.x;
  return horizontal||vertical
};

assert.deepEqual([...D.CORE_DISCOVERY_STAGES],[2,3,4,5]);
assert.deepEqual({...D.CORE_DISCOVERY_VOID_COUNT_BY_MODE},{eyes:0,frames:1,river:2,loom:3,peaks:4});
assert.equal(D.CORE_MAX_PHYSICAL,6);
assert.equal(D.FRAMES_CORE_MAX_PHYSICAL,6);
assert.equal(D.RIVER_CORE_MAX_PHYSICAL,6);
assert.equal(D.LOOM_CORE_MAX_PHYSICAL,8);
assert.equal(D.PEAKS_CORE_MAX_PHYSICAL,10);

function advanceToStage(game,targetStage){
  const state=game.state();
  while(game.snapshot().stage.index<targetStage){
    state.cleared=true;state.blocked=false;state.running=false;state.nextShopType='none';state.intermissionResolved=true;state.pendingCircuit=null;state.pendingModPlacement=null;state.shopOpen=false;
    assert.equal(game.advance(),true)
  }
}

function runGrowth(mode,seed,{initialCores,initialVoids,voidsPerCore,maxCores}){
  E.setBoardSize(18,24);
  const game=G.createGame(E,{seed,GAME_MODE:mode,TARGETS:Array(15).fill(Number.MAX_SAFE_INTEGER)}),state=game.state();
  const counts=[{cores:state.cores.length,voids:state.voids.length}],discoveries=[];
  assert.deepEqual(counts[0],{cores:initialCores,voids:initialVoids});
  for(let stage=2;stage<=5;stage++){
    advanceToStage(game,stage);
    assert.equal(state.cores.length,initialCores+(stage-1),`${mode} Stage ${stage} adds exactly one Core`);
    assert.equal(state.voids.length,initialVoids+(stage-1)*voidsPerCore,`${mode} Stage ${stage} adds ${voidsPerCore} Voids with its Core`);
    const coreEvent=[...state.events].reverse().find(event=>event.type==='core-discover'&&event.stage===stage);
    const voidEvent=[...state.events].reverse().find(event=>event.type==='void-discover'&&event.stage===stage);
    assert(coreEvent,`${mode} Stage ${stage} records its Core discovery`);
    assert.equal(coreEvent.mode,mode);
    assert.equal(coreEvent.companionVoidIds.length,voidsPerCore);
    assert.equal(coreEvent.growthFallback,false,`${mode} Core should use the newly expanded frame during normal progression`);
    if(voidsPerCore){
      assert(voidEvent,`${mode} Stage ${stage} records its Void discovery`);
      assert.equal(voidEvent.mode,mode);
      assert.equal(voidEvent.count,voidsPerCore);
      assert.equal(voidEvent.sourceCoreId,coreEvent.core.id);
      assert.deepEqual(voidEvent.voids.map(item=>item.id),coreEvent.companionVoidIds);
      assert.equal(voidEvent.growthFallback,false,`${mode} Voids should use the newly expanded frame during normal progression`)
    }else assert.equal(voidEvent,undefined,'1|1 must not create a Void discovery event');

    const current=D.BOARD_SIZES[stage-1],previous=D.BOARD_SIZES[stage-2],oldRect={x:Math.floor((current[0]-previous[0])/2),y:Math.floor((current[1]-previous[1])/2),w:previous[0],h:previous[1]},core=coreEvent.core;
    const insideOld=item=>item.x>=oldRect.x&&item.y>=oldRect.y&&item.x+item.size<=oldRect.x+oldRect.w&&item.y+item.size<=oldRect.y+oldRect.h;
    assert.equal(insideOld(core),false,`${mode} new Core must sit in the new outer frame`);
    if(voidEvent)assert.equal(voidEvent.voids.every(item=>!insideOld(item)),true,`${mode} companion Voids must sit in the new outer frame`);

    const canonical=[...state.cores,...state.voids].find(item=>item.siteId)||state.cores[0];
    assert(canonical,`${mode} must retain an opening pip as lattice reference`);
    const lattice={x:residue(canonical.x),y:residue(canonical.y)};
    assert.deepEqual({x:residue(core.x),y:residue(core.y)},lattice,`${mode} discovered Core stays on the canonical lattice`);
    for(const item of voidEvent?.voids||[]){
      assert.deepEqual({x:residue(item.x),y:residue(item.y)},lattice,`${mode} discovered Void stays on the canonical lattice`);
      assert.equal(rectOverlap(core,item),false,'Core and companion Void cannot overlap');
      assert.equal(cardinallyAdjacent(core,item),false,'companion Voids must preserve the new Core cardinal approaches')
    }

    const geometry=[...state.cores,...state.voids];
    for(let i=0;i<geometry.length;i++)for(let j=i+1;j<geometry.length;j++)assert.equal(rectOverlap(geometry[i],geometry[j]),false,`${mode} geometry may never overlap: ${geometry[i].id} / ${geometry[j].id}`);

    counts.push({cores:state.cores.length,voids:state.voids.length});
    discoveries.push({stage,core:{id:core.id,x:core.x,y:core.y,ports:[...core.ports],archetype:core.archetype},voids:(voidEvent?.voids||[]).map(({id,x,y})=>({id,x,y}))})
  }
  assert.equal(state.cores.length,maxCores);
  assert.equal(state.coreProgressMilestones.filter(key=>key.startsWith('discover:')).length,4);
  assert.match(game.debugText(),new RegExp(`Cores: THE ${mode==='eyes'?'EYES':mode==='frames'?'FRAMES':mode==='river'?'RIVER':mode==='loom'?'LOOM':'PEAKS'}`));
  if(voidsPerCore)assert.match(game.debugText(),/VOID DISCOVER/);else assert.doesNotMatch(game.debugText(),/VOID DISCOVER/);
  return{game,counts,discoveries}
}

const configs={
  eyes:{initialCores:2,initialVoids:0,voidsPerCore:0,maxCores:6},
  frames:{initialCores:2,initialVoids:2,voidsPerCore:1,maxCores:6},
  river:{initialCores:2,initialVoids:4,voidsPerCore:2,maxCores:6},
  loom:{initialCores:4,initialVoids:4,voidsPerCore:3,maxCores:8},
  peaks:{initialCores:6,initialVoids:4,voidsPerCore:4,maxCores:10}
};

for(const [index,mode] of Object.keys(configs).entries()){
  const seed=59010+index,first=runGrowth(mode,seed,configs[mode]),second=runGrowth(mode,seed,configs[mode]);
  assert.deepEqual(second.counts,first.counts,`${mode} growth counts must be deterministic`);
  assert.deepEqual(second.discoveries,first.discoveries,`${mode} Core/Void growth placement must be seed-deterministic`);
}

const peaks=runGrowth('peaks',59099,configs.peaks).game,saved=peaks.exportState();
E.setBoardSize(18,24);
const restored=G.createGame(E,{seed:1,GAME_MODE:'classic'});
assert.equal(restored.restoreState(saved),true);
assert.equal(restored.state().gameMode,'peaks');
assert.deepEqual(restored.state().cores,peaks.state().cores,'grown Peaks Cores survive save/restore');
assert.deepEqual(restored.state().voids,peaks.state().voids,'grown Peaks Voids survive save/restore');
assert.deepEqual(restored.state().coreProgressMilestones,peaks.state().coreProgressMilestones,'Core/Void discovery milestones survive save/restore');

console.log('Core + Void growth progression regressions passed');
