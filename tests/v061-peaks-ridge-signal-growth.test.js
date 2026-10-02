const assert=require('node:assert/strict');
const E=require('../engine.js');
const D=require('../data.js');
const G=require('../game.js');

function piece(a,b,x,id){
  const p=E.pieceFrom({a,b},x,8,0,0,id);
  p.tile={id:\`v061-\${id}\`,a,b};
  return p
}
function routeKeys(result){return(result.events||[]).filter(e=>e.type==='route').map(e=>\`\${e.piece}>\${e.toPieceId}\`)}

assert.equal(D.CORE_SIGNAL_DISCOVERED_CORE_STEP,1);
assert.equal(D.PEAK_RIDGE_ENABLED,true);
assert.deepEqual(D.PEAK_RIDGE_TIERS.map(t=>[t.minTiles,t.multiplier]),[[2,2],[5,3],[7,4]]);

E.setBoardSize(30,40);

for(const mode of ['eyes','frames','river','loom','peaks']){
  const game=G.createGame(E,{seed:61000+mode.length,GAME_MODE:mode,TARGETS:Array(15).fill(Number.MAX_SAFE_INTEGER)});
  const before=game.snapshot().signal;
  assert.equal(before.discoveredCoreCount,0,\`\${mode} opening Cores are not discovery bonuses\`);
  assert.equal(before.discoveredCoreBonus,0);
  const baseCoreCharge=before.coreCharge;
  game.state().cores.push({id:\`core-\${mode}-stage-2\`,slot:\`\${mode}-stage-2\`,stage:2,x:24,y:30,size:2,ports:['U'],archetype:'relay',level:1});
  const afterOne=game.snapshot().signal;
  assert.equal(afterOne.base,before.base+1,\`\${mode} gains +1 starting Signal for one discovered Core\`);
  assert.equal(afterOne.discoveredCoreCount,1);
  assert.equal(afterOne.discoveredCoreBonus,1);
  assert.equal(afterOne.coreCharge,baseCoreCharge,'discovery bonus must not increase Core recharge');
  game.state().cores.push({id:\`core-\${mode}-stage-3\`,slot:\`\${mode}-stage-3\`,stage:3,x:26,y:32,size:2,ports:['U'],archetype:'relay',level:1});
  assert.equal(game.snapshot().signal.base,before.base+2,\`\${mode} discovered Core bonus is cumulative\`);
}

const line=[
  piece(1,2,0,1),
  piece(2,3,4,2),
  piece(3,4,8,3),
  piece(4,5,12,4),
  piece(5,6,16,5),
  piece(6,1,20,6),
  piece(1,2,24,7),
  piece(2,3,28,8)
];
const peakA={id:'peak-a',archetype:'relay',level:1,kind:'peak',peak:true,links:[]};
const peakB={id:'peak-b',archetype:'relay',level:1,kind:'peak',peak:true,links:[]};
const common={
  initialOutput:3,
  signalEnabled:true,
  signalBase:20,
  signalMax:2,
  signalCoreCharge:2,
  signalCoreIdsByPiece:new Map([[2,[peakA.id]],[6,[peakB.id]]]),
  signalCoreById:new Map([[peakA.id,peakA],[peakB.id,peakB]]),
  coreLevelStep:D.CORE_SIGNAL_LEVEL_STEP,
  reservoirBonus:D.CORE_RESERVOIR_BONUS,
  coreAbilityLimit:2,
  peakSignalMultiplier:D.CORE_PEAK_SIGNAL_MULTIPLIER
};
const baseline=E.bestSignal(1,line,{...common,peakRidgeEnabled:false});
const ridge=E.bestSignal(1,line,{...common,peakRidgeEnabled:true,peakRidgeTiers:D.PEAK_RIDGE_TIERS});
assert.deepEqual(routeKeys(ridge),routeKeys(baseline),'Ridge scoring must not alter route selection');
assert(ridge.peakRidge,'selected route must form a Ridge');
assert.deepEqual(ridge.peakRidge.pieceIds,[2,3,4,5,6]);
assert.equal(ridge.peakRidge.tileCount,5);
assert.equal(ridge.peakRidge.multiplier,3);
assert.equal(ridge.output,baseline.output*3,'five-tile Ridge applies x3 once to the selected Move');
assert.equal((ridge.events||[]).filter(e=>e.type==='peak-ridge').length,1,'Ridge multiplier applies once per Move');
assert.equal(ridge.signalRuntime.peakRidge.multiplier,3);

const separateBranches={
  output:100,outputExact:'100',gain:97,gainExact:'97',events:[
    {type:'core-activate',coreId:'peak-a',piece:2,peak:true},
    {type:'route',piece:2,toPieceId:3},
    {type:'signal-fork',piece:3},
    {type:'signal-start',fork:3,arm:0},
    {type:'route',piece:3,toPieceId:4},
    {type:'signal-end',fork:3,arm:0},
    {type:'signal-start',fork:3,arm:1},
    {type:'route',piece:3,toPieceId:5},
    {type:'core-activate',coreId:'peak-b',piece:5,peak:true},
    {type:'signal-end',fork:3,arm:1},
    {type:'signal-join',piece:3}
  ]
};
const noCrossBranch=E.applyPeakRidgeMultiplier(separateBranches,{peakRidgeEnabled:true,peakRidgeTiers:D.PEAK_RIDGE_TIERS,initialOutput:3});
assert.equal(noCrossBranch.peakRidge?.multiplier,2,'a Peak reached through the same directed fork ancestry can still form the physical traversed Ridge');
assert.deepEqual(noCrossBranch.peakRidge.pieceIds,[2,3,5]);

const disconnected={
  output:100,outputExact:'100',gain:97,gainExact:'97',events:[
    {type:'core-activate',coreId:'peak-a',piece:2,peak:true},
    {type:'route',piece:2,toPieceId:3},
    {type:'core-activate',coreId:'peak-b',piece:8,peak:true},
    {type:'route',piece:8,toPieceId:9}
  ]
};
const noRidge=E.applyPeakRidgeMultiplier(disconnected,{peakRidgeEnabled:true,peakRidgeTiers:D.PEAK_RIDGE_TIERS,initialOutput:3});
assert.equal(noRidge.peakRidge,undefined,'two Peak activations without a traversed Peak-to-Peak path do not score a Ridge');
assert.equal(noRidge.output,100);

const looped={
  output:100,outputExact:'100',gain:97,gainExact:'97',events:[
    {type:'core-activate',coreId:'peak-a',piece:2,peak:true},
    {type:'route',piece:2,toPieceId:3},
    {type:'move',fromPiece:3,toPiece:2,retrace:true},
    {type:'route',piece:3,toPieceId:4},
    {type:'core-activate',coreId:'peak-b',piece:4,peak:true}
  ]
};
const loopRidge=E.applyPeakRidgeMultiplier(looped,{peakRidgeEnabled:true,peakRidgeTiers:D.PEAK_RIDGE_TIERS,initialOutput:3});
assert.deepEqual(loopRidge.peakRidge.pieceIds,[2,3,4]);
assert.equal(loopRidge.peakRidge.tileCount,3,'retraces cannot inflate Ridge length');
assert.equal(loopRidge.peakRidge.multiplier,2);

const noPeakMultiplier=E.bestSignal(1,line,{...common,signalCoreIdsByPiece:new Map([[2,['core-a']],[6,['core-b']]]),signalCoreById:new Map([['core-a',{id:'core-a',archetype:'relay',level:1,peak:false}],['core-b',{id:'core-b',archetype:'relay',level:1,peak:false}]]),peakRidgeEnabled:true,peakRidgeTiers:D.PEAK_RIDGE_TIERS});
assert.equal(noPeakMultiplier.peakRidge,undefined,'ordinary Cores never create a Ridge');

console.log('v0.61 discovered Core Signal growth and Peaks Ridge regressions passed');
