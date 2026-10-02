const assert=require('node:assert/strict');
const E=require('../engine.js');
const D=require('../data.js');
const G=require('../game.js');

const visible=(item,board=E.getBoardSize())=>item.x>=0&&item.y>=0&&item.x+item.size<=board.G&&item.y+item.size<=board.H;
const itemsByHalf=(state,half)=>[...state.cores,...state.voids].filter(item=>item.half===half).sort((a,b)=>a.pip-b.pip);
const piece=(a,b,x,y,id)=>{const p=E.pieceFrom({a,b},x,y,0,0,id);p.tile={id:`v058-${id}`,a,b};return p};
const events=(result,type)=>(result.events||[]).filter(event=>event.type===type);
const approachSides=(core,geometry,board={G:18,H:24})=>{
  const cell=E.S,size=core.size,vectors={U:[0,-cell],R:[cell,0],D:[0,cell],L:[-cell,0]};
  const cells=side=>{const [dx,dy]=vectors[side],first=side==='U'?{x:core.x,y:core.y-cell}:side==='R'?{x:core.x+size,y:core.y}:side==='D'?{x:core.x,y:core.y+size}:{x:core.x-cell,y:core.y};return[first,{x:first.x+dx,y:first.y+dy}]};
  const blocked=cellRect=>geometry.some(other=>other.id!==core.id&&cellRect.x<other.x+other.size&&cellRect.x+cell>other.x&&cellRect.y<other.y+other.size&&cellRect.y+cell>other.y);
  return core.ports.filter(side=>cells(side).every(cellRect=>cellRect.x>=0&&cellRect.y>=0&&cellRect.x+cell<=board.G&&cellRect.y+cell<=board.H&&!blocked(cellRect)))
};

assert.equal(D.VERSION,'0.59.1');
assert.deepEqual({...D.CORE_SIGNAL_BY_MODE},{eyes:6,frames:4,river:3,loom:2,peaks:2});
assert.deepEqual({...D.CORE_ABILITY_LIMIT_BY_MODE},{loom:2,peaks:2});
assert.equal(D.CORE_PEAK_SIGNAL_MULTIPLIER,2);

E.setBoardSize(18,24);
const loom=G.createGame(E,{seed:58001,GAME_MODE:'loom',TARGETS:Array(15).fill(Number.MAX_SAFE_INTEGER)});
const loomTwin=G.createGame(E,{seed:58001,GAME_MODE:'loom',TARGETS:Array(15).fill(Number.MAX_SAFE_INTEGER)});
assert.equal(loom.state().gameMode,'loom');
assert.equal(loom.state().cores.length,4);
assert.equal(loom.state().voids.length,4);
assert.deepEqual(loom.state().cores,loomTwin.state().cores,'Loom Core selection must be seeded and deterministic');
assert.deepEqual(loom.state().voids,loomTwin.state().voids,'Loom Void selection must be seeded and deterministic');
assert.equal(loom.snapshot().signal.base,2);
assert.equal(loom.snapshot().signal.max,2);
for(const half of ['north','south']){
  const items=itemsByHalf(loom.state(),half),cores=loom.state().cores.filter(item=>item.half===half),voids=loom.state().voids.filter(item=>item.half===half);
  assert.equal(cores.length,2,'each Loom half has two Cores');
  assert.equal(voids.length,2,'each Loom half has two Voids');
  assert.deepEqual(items.map(item=>item.pip),[0,1,2,3],'each Loom half keeps the complete 4-pip topology');
  assert.equal(items.every(item=>visible(item)),true,'all Loom pips are visible on the opening board');
}
assert.deepEqual(itemsByHalf(loom.state(),'north').map(({x,y})=>({x,y})),[{x:2,y:2},{x:14,y:2},{x:2,y:10},{x:14,y:10}]);
assert.deepEqual(itemsByHalf(loom.state(),'south').map(({x,y})=>({x,y})),[{x:2,y:12},{x:14,y:12},{x:2,y:20},{x:14,y:20}]);
for(const core of loom.state().cores)assert(approachSides(core,[...loom.state().cores,...loom.state().voids]).length>0,`Loom Core ${core.id} keeps a full-domino approach through one real port`);
assert(loom.candidatesForIndex(loom.state().hand.findIndex(tile=>tile?.a===tile?.b)).length>0,'Loom must retain legal double openings around fixed geometry');

E.setBoardSize(18,24);
const peaks=G.createGame(E,{seed:58002,GAME_MODE:'peaks',TARGETS:Array(15).fill(Number.MAX_SAFE_INTEGER)});
const peaksTwin=G.createGame(E,{seed:58002,GAME_MODE:'peaks',TARGETS:Array(15).fill(Number.MAX_SAFE_INTEGER)});
assert.equal(peaks.state().gameMode,'peaks');
assert.equal(peaks.state().cores.length,6);
assert.equal(peaks.state().voids.length,4);
assert.deepEqual(peaks.state().cores,peaksTwin.state().cores,'Peaks Core selection must be seeded and deterministic');
assert.deepEqual(peaks.state().voids,peaksTwin.state().voids,'Peaks Void selection must be seeded and deterministic');
assert.equal(peaks.snapshot().signal.base,2);
assert.equal(peaks.snapshot().signal.max,2);
for(const [half,center] of [['north',{x:8,y:6}],['south',{x:8,y:16}]]){
  const items=itemsByHalf(peaks.state(),half),cores=peaks.state().cores.filter(item=>item.half===half),voids=peaks.state().voids.filter(item=>item.half===half),peak=cores.find(item=>item.peak);
  assert.equal(cores.length,3,'each Peaks half has two normal Cores plus one Peak Core');
  assert.equal(voids.length,2,'each Peaks half has two Voids');
  assert.deepEqual(items.map(item=>item.pip),[0,1,2,3,4],'each Peaks half keeps the complete 5-pip topology');
  assert(peak,'each Peaks half must own its fixed central Peak Core');
  assert.equal(peak.kind,'peak');
  assert.equal(peak.pip,4);
  assert.deepEqual({x:peak.x,y:peak.y},center,'Peak Core must occupy the central pip');
  assert.equal(cores.filter(item=>!item.peak).length,2);
  assert.equal(voids.every(item=>item.pip<4),true);
  assert.equal(items.every(item=>visible(item)),true,'all Peaks pips are visible on the opening board');
}
for(const core of peaks.state().cores)assert(approachSides(core,[...peaks.state().cores,...peaks.state().voids]).length>0,`Peaks Core ${core.id} keeps a full-domino approach through one real port`);
assert(peaks.candidatesForIndex(peaks.state().hand.findIndex(tile=>tile?.a===tile?.b)).length>0,'Peaks must retain legal double openings around fixed geometry');

const loomSaved=loom.exportState(),loomRestored=G.createGame(E,{seed:1,GAME_MODE:'classic'});
assert.equal(loomRestored.restoreState(loomSaved),true);
assert.equal(loomRestored.state().gameMode,'loom');
assert.deepEqual(loomRestored.state().cores,loom.state().cores,'Loom Core identities survive persistence');
assert.deepEqual(loomRestored.state().voids,loom.state().voids,'Loom Voids survive persistence');

const peaksSaved=peaks.exportState(),peaksRestored=G.createGame(E,{seed:1,GAME_MODE:'classic'});
assert.equal(peaksRestored.restoreState(peaksSaved),true);
assert.equal(peaksRestored.state().gameMode,'peaks');
assert.deepEqual(peaksRestored.state().cores,peaks.state().cores,'Peak Core kind and identities survive persistence');
assert.deepEqual(peaksRestored.state().voids,peaks.state().voids,'Peaks Voids survive persistence');

E.setBoardSize(30,40);
const line=[
  piece(1,2,0,8,1),
  piece(2,3,4,8,2),
  piece(3,4,8,8,3),
  piece(4,5,12,8,4)
];
const lead={id:'lead-relay',archetype:'relay',level:1,links:[]};
const link={id:'link-reservoir',archetype:'reservoir',level:1,links:[]};
const follow={id:'follow-conductor',archetype:'conductor',level:1,links:[]};
const paired=E.bestSignal(1,line,{
  initialOutput:2,signalEnabled:true,signalBase:2,signalMax:2,signalCoreCharge:2,
  signalCoreIdsByPiece:new Map([[2,[lead.id]],[3,[link.id]],[4,[follow.id]]]),
  signalCoreById:new Map([[lead.id,lead],[link.id,link],[follow.id,follow]]),
  coreLevelStep:D.CORE_SIGNAL_LEVEL_STEP,reservoirBonus:D.CORE_RESERVOIR_BONUS,
  coreAbilityLimit:2,peakSignalMultiplier:D.CORE_PEAK_SIGNAL_MULTIPLIER
});
const pairedActivations=events(paired,'core-activate');
assert.deepEqual(pairedActivations.map(event=>event.role),['lead','link','last'],'paired modes must expose LEAD → LINK before later recharge-only Cores');
assert.equal(pairedActivations[0].abilityApplied,'relay');
assert.equal(pairedActivations[1].abilityApplied,'reservoir');
assert.equal(pairedActivations[1].signalAdded,10,'LINK Reservoir adds its own base charge plus Reservoir bonus');
assert.equal(pairedActivations[2].abilityApplied,null,'third Core must recharge without contributing a third ability');
assert.deepEqual(paired.signalRuntime.abilityCoreIds,[lead.id,link.id]);
assert.equal(paired.signalRuntime.linkCoreId,link.id);
assert.equal(paired.signalRuntime.linkCoreArchetype,'reservoir');

const peakCore={id:'peak-relay',archetype:'relay',level:1,kind:'peak',peak:true,links:[]};
const overcharged=E.bestSignal(1,line,{
  initialOutput:2,signalEnabled:true,signalBase:2,signalMax:2,signalCoreCharge:2,
  signalCoreIdsByPiece:new Map([[2,[peakCore.id]]]),
  signalCoreById:new Map([[peakCore.id,peakCore]]),
  coreLevelStep:D.CORE_SIGNAL_LEVEL_STEP,reservoirBonus:D.CORE_RESERVOIR_BONUS,
  coreAbilityLimit:2,peakSignalMultiplier:2
});
const peakActivation=events(overcharged,'core-activate')[0];
assert.equal(peakActivation.peak,true);
assert.equal(peakActivation.kind,'peak');
assert.equal(peakActivation.signalAdded,4,'Peak Core must add double the normal Core charge');
assert.equal(peakActivation.afterSignal,peakActivation.beforeSignal+4);

console.log('v0.58 Loom + Peaks mode regressions passed');
