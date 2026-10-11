const assert=require('node:assert/strict');
const D=require('../data.js'),E=require('../engine.js'),G=require('../game.js'),M=require('../mods.js');
E.setBoardSize(30,40);
let passed=0;function check(name,fn){fn();passed++;console.log('Quantum Port: '+name)}
const slotByKey=new Map(M.collection().map(x=>[x.key,x]));
check('five archive terminals and 20 unique Market Mods',()=>{
  assert.equal(M.all().filter(mod=>mod.market).length,20);
  assert.equal(M.collection().filter(x=>x.mod).length,23);
  for(const [key,id,code] of [['0|0','zero-port','Z1'],['0|1','zero-port','Z2'],['1|3','quantum-port','Q1'],['2|4','quantum-port','Q2'],['2|5','quantum-port','Q3']]){
    assert.equal(slotByKey.get(key).mod.id,id);assert.equal(slotByKey.get(key).mod.collectionCode,code)
  }
  assert.equal(M.get('long-line').displayName,'CONVEYOR');
  assert.equal(M.get('long-run').displayName,'COLLECTOR');
  assert.deepEqual([...D.QUANTUM_PORT_OUTCOME_WEIGHTS],[5,15,30,35,15]);
});
function setNetwork(g){
  const s=g.state(),ids=['d0-0','d0-1','d0-2','d0-3','d0-4'];
  s.pieces=ids.map((id,i)=>{const tile=s.set.find(x=>x.id===id),p=E.pieceFrom(tile,2+i*4,6,0,0,i+1);p.tile={...tile};return p});
  s.placedTileIds=ids.slice();s.zeroPortTileIds=ids.slice(0,2);return{state:s,ids}
}
function market(g,id){const s=g.state();s.shopOpen=true;s.shopType='market';s.shopOffers=[id];s.marketBuys=[];s.cleared=true;s.intermissionResolved=false;s.nextShopType='market';s.coins=500}
check('no Quantum Port offer without two placed Zero Ports',()=>{
  const g=G.createGame(E,{seed:7611}),{state:s,ids}=setNetwork(g);
  s.zeroPortTileIds=[ids[0]];
  assert.equal(g.marketTargetCount('quantum-port'),0);
  s.zeroPortTileIds=ids.slice(0,2);
  assert.equal(g.marketTargetCount('quantum-port'),3);
});
check('three purchases are assigned to distinct tiles and survive save/restore',()=>{
  const g=G.createGame(E,{seed:7612}),{state:s,ids}=setNetwork(g);
  for(let i=0;i<3;i++){
    market(g,'quantum-port');
    const r=g.buyMarketMod('quantum-port');assert.equal(r.ok,true);assert.equal(r.pending,true);
    assert.equal(g.chooseMarketModTile(ids[i+2]).ok,true);
    assert.equal(s.quantumPortTileIds.length,i+1);
    assert.equal(s.pendingModPlacement,null);
  }
  assert.equal(g.marketTargetCount('quantum-port'),0);
  assert.equal(g.snapshot().quantumNetwork.active,true);
  const saved=g.exportState(),restored=G.createGame(E,{seed:1});assert.equal(restored.restoreState(saved),true);
  assert.deepEqual(restored.state().quantumPortTileIds,ids.slice(2));
  assert.equal(restored.snapshot().quantumNetwork.active,true);
  const old={...saved,state:{...saved.state}};delete old.state.quantumPortTileIds;
  assert.equal(restored.restoreState(old),true);assert.deepEqual(restored.state().quantumPortTileIds,[]);
});
const makePiece=(id,a,b,x,y)=>{const p=E.pieceFrom({id:'t'+id,a,b},x,y,0,0,id);p.tile={id:'t'+id,a,b,upgrade:0,powerMultiplier:1};return p};
const pieces=[
  makePiece(1,3,0,2,4),makePiece(2,0,0,6,4),
  makePiece(3,0,2,16,4),makePiece(4,0,4,16,12),
  makePiece(5,0,3,22,4),makePiece(6,0,5,22,12)
];
const cases=[[0,'collapse',0],[5,'reflection',1],[20,'single-copy',2],[50,'quantum-array',3],[85,'resonance',5]];
for(const [roll,outcome,branches] of cases)check('deterministic '+outcome+' with '+branches+' full-strength branches',()=>{
  const opts={initialOutput:10,initialOutputExact:'10',bifurcate:true,signalEnabled:true,signalBase:24,signalMax:24,quantumPortPieceIds:[2,3,4],zeroPortPieceIds:[5,6],quantumRoll:roll,quantumOutcomeWeights:[5,15,30,35,15]};
  const a=E.bestSignal(1,pieces,opts),b=E.bestSignal(1,pieces,opts);
  assert.equal(a.outputExact,b.outputExact);
  const event=a.events.find(x=>x.type==='quantum-outcome');
  assert(event,'a complete network must activate from an entering zero');
  assert.equal(event.roll,roll);assert.equal(event.outcome,outcome);assert.equal(event.branches,branches);
  assert.equal(a.events.filter(x=>x.type==='quantum-outcome').length,1,'no recursive quantum activation');
  assert.equal(a.events.filter(x=>x.type==='quantum-arrival').length,Math.max(0,branches-1));
  const fork=a.events.find(x=>x.type==='signal-fork'&&x.splitKind==='quantum-port');
  if(branches>1){assert(fork);assert.deepEqual(fork.signalBudgets,new Array(branches).fill(event.signalRemaining));assert.equal(a.events.filter(x=>x.type==='signal-start'&&x.fork===2).length,branches)}
  else assert.equal(fork,undefined);
});
check('incomplete quantum network preserves ordinary zero behaviour',()=>{
  const r=E.bestSignal(1,pieces,{initialOutput:10,bifurcate:true,quantumPortPieceIds:[2,3],zeroPortPieceIds:[5,6],quantumRoll:85});
  assert.equal(r.events.some(e=>e.type==='quantum-outcome'),false);
});
console.log('Quantum Port tests passed: '+passed);
