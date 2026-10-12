const assert=require('node:assert/strict');
const Profile=require('../profile.js'),Game=require('../game.js'),Engine=require('../engine.js'),Circuits=require('../circuits.js');

function storage(data={}){const values=new Map(Object.entries(data));return{
  get length(){return values.size},key:i=>[...values.keys()][i]??null,
  getItem:key=>values.has(key)?values.get(key):null,setItem:(key,value)=>values.set(key,String(value)),
  removeItem:key=>values.delete(key)
}}
function profile(store=storage(),host='play.monoid.test'){return Profile.create({storage:store,crypto:{getRandomValues:a=>(a[0]=42,a)},now:()=>Date.parse('2026-10-12T09:00:00Z'),location:{hostname:host}})}
const snap={gameMode:'classic',cores:{telemetry:{connectedCoreCount:0}},endless:{infinitePhase:false}},run=events=>({gameMode:'classic',endlessMode:false,events,cores:[]});
const move=(turn,count=0,zero=true)=>({turn,zeroPorts:zero?[{fromTileId:'d0-0',toTileId:'d0-1'}]:[],physicalActivatedTileCount:count});
let checks=0;function check(name,fn){fn();checks++;console.log('MOD DISCOVERIES · '+name)}

check('new players start with four locked terminal/Mod slots; dev remains open',()=>{
  const p=profile();assert.equal(p.isModSlotUnlocked('knot'),false);for(let i=1;i<=3;i++)assert.equal(p.isModSlotUnlocked('quantum-port',i),false);
  assert.equal(p.isModSlotUnlocked('long-line'),true);assert.equal(p.modUnlockState().quantumLevel,0);
  p.setContext('dev');assert.equal(p.modUnlockState().quantumLevel,3);assert.equal(p.isModSlotUnlocked('knot'),true);
  p.setContext('fresh',{reset:true});assert.equal(p.modUnlockState().quantumLevel,0);assert.equal(p.isModSlotUnlocked('knot'),false);
});
check('legacy player retains prior open Mod access and never loses progress',()=>{
  const store=storage({'iterion.activeRun.v1':'OLD_RUN'}),p=profile(store);const access=p.modUnlockState();
  assert.equal(access.knot,true);assert.equal(access.quantumLevel,3);
  const previous=JSON.parse(store.getItem('monoid.profile.player.v1'));assert.equal(previous.modUnlockSchema,2);
  assert.equal(profile(store).modUnlockState().quantumLevel,3);
});
check('one verified Zero Port traversal permanently reveals only Q1',()=>{
  const p=profile(),r=p.evaluateRun(run([move(1,2)]),snap);assert.deepEqual(r.modDiscoveries,['quantum-port:1']);
  assert.equal(p.modUnlockState().quantumLevel,1);assert.deepEqual(p.evaluateRun(run([move(1,2)]),snap).modDiscoveries,[]);
});
check('Q2 requires three different Move identities from the SAME run',()=>{
  const p=profile();let r=p.evaluateRun(run([move(2),move(2),move(3)]),snap);assert.deepEqual(r.modDiscoveries,['quantum-port:1']);
  r=p.evaluateRun(run([move(2),move(2),move(3),move(4)]),snap);assert.deepEqual(r.modDiscoveries,['quantum-port:2']);
  assert.equal(p.modUnlockState().quantumLevel,2);
  assert.deepEqual(p.evaluateRun(run([move(9)]),snap).modDiscoveries,[]);
});
check('Q3 requires 12 distinct physical activations on one teleported Move',()=>{
  const p=profile();p.evaluateRun(run([move(1),move(2),move(3)]),snap);
  assert.equal(p.modUnlockState().quantumLevel,2);
  assert.deepEqual(p.evaluateRun(run([move(4,11)]),snap).modDiscoveries,[]);
  assert.deepEqual(p.evaluateRun(run([move(4,12,false)]),snap).modDiscoveries,[]);
  assert.deepEqual(p.evaluateRun(run([move(4,12)]),snap).modDiscoveries,['quantum-port:3']);
  assert.equal(p.modUnlockState().quantumLevel,3);
});
check('Q3 can never skip Q1 or Q2 and profile unlock steps are idempotent',()=>{
  const p=profile();assert.deepEqual(p.evaluateRun(run([move(99,20)]),snap).modDiscoveries,['quantum-port:1']);
  assert.equal(p.modUnlockState().quantumLevel,1);
  assert.equal(p.unlockModStep('quantum-port:3').changed,false,'third terminal cannot bypass Q2');
  assert.equal(p.unlockModStep('quantum-port:1').changed,false);
});
check('KNOT requires two physical closed loops sharing at least one full domino',()=>{
  Engine.setBoardSize(30,40);
  const g=Game.createGame(Engine,{seed:77001});
  assert.equal(g.modDiscoveryFacts().knotSharedLoops,false);
  const coords=[[2,4],[6,4],[10,4],[2,6],[6,6],[10,6]];
  const pieces=coords.map(([x,y],i)=>{const tile={id:'knot-test-'+i,a:6,b:6};const p=Engine.pieceFrom(tile,x,y,0,0,i+1);p.tile=tile;return p});
  g.state().pieces=pieces.slice(0,5);assert.equal(g.modDiscoveryFacts().knotSharedLoops,false);
  g.state().pieces=pieces;assert.equal(g.modDiscoveryFacts().knotSharedLoops,true);
  const graph=Circuits.adjacency(pieces,Engine.contactBetweenPieces);
  assert([...graph.keys()].some(id=>Circuits.cycleSignaturesThrough(graph,id,4).length>=2));
  const p=profile();assert.deepEqual(p.evaluateRun(run([]),snap,undefined,g.modDiscoveryFacts({pair:false,bridge:false,hinge:false,'triple-double':false})).modDiscoveries,['knot']);
  assert.equal(p.isModSlotUnlocked('knot'),true);assert.deepEqual(p.evaluateRun(run([]),snap,undefined,g.modDiscoveryFacts({pair:false,bridge:false,hinge:false,'triple-double':false})).modDiscoveries,[]);
});
function marketSetup(g){const s=g.state(),ids=['d0-0','d0-1','d0-2','d0-3','d0-4'];s.pieces=ids.map((id,i)=>{const t=s.set.find(t=>t.id===id),p=Engine.pieceFrom(t,2+i*4,6,0,0,i+1);p.tile={...t};return p});s.placedTileIds=ids.slice();s.zeroPortTileIds=ids.slice(0,2);s.coins=500;return ids}
function offer(g){const s=g.state();s.shopOpen=true;s.shopType='market';s.shopOffers=['quantum-port'];s.marketBuys=[];s.cleared=true;s.intermissionResolved=false;s.nextShopType='market'}
for(let level=0;level<=3;level++)check('Market limits QP assignments to '+level+' per run',()=>{
  const g=Game.createGame(Engine,{seed:77010+level,MOD_ACCESS:{knot:false,quantumLevel:level}}),ids=marketSetup(g);
  assert.equal(g.marketTargetCount('knot'),0);
  for(let i=0;i<level;i++){offer(g);assert(g.marketTargetCount('quantum-port')>0);assert.equal(g.buyMarketMod('quantum-port').ok,true);assert.equal(g.chooseMarketModTile(ids[i+2]).ok,true)}
  assert.equal(g.marketTargetCount('quantum-port'),0);offer(g);
  assert.equal(g.buyMarketMod('quantum-port').ok,false);assert.equal(g.state().quantumPortTileIds.length,level);
  const copy=Game.createGame(Engine,{seed:3,MOD_ACCESS:{knot:true,quantumLevel:3}});
  assert.equal(copy.restoreState(g.exportState()),true);assert.deepEqual(copy.state().marketModAccess,{knot:false,quantumLevel:level});
  assert.equal(copy.marketTargetCount('quantum-port'),0);
});
check('the NEXT run accepts newly discovered Quantum tiers, not the active run',()=>{
  const g=Game.createGame(Engine,{seed:77125,MOD_ACCESS:{knot:false,quantumLevel:0}});
  const original=g.state().marketModAccess;
  g.config.MOD_ACCESS={knot:true,quantumLevel:2};
  assert.deepEqual(original,{knot:false,quantumLevel:0});
  assert.deepEqual(g.state().marketModAccess,original);
  g.fresh(77126);
  assert.deepEqual(g.state().marketModAccess,{knot:true,quantumLevel:2});
});
check('older saves without access metadata remain grandfathered',()=>{
  const g=Game.createGame(Engine,{seed:77099}),saved=g.exportState();delete saved.state.marketModAccess;
  const copy=Game.createGame(Engine,{seed:3,MOD_ACCESS:{knot:false,quantumLevel:0}});
  assert(copy.restoreState(saved));assert.deepEqual(copy.state().marketModAccess,{knot:true,quantumLevel:3});
});
console.log('Mod discovery regressions passed: '+checks);
