const assert=require('node:assert/strict');
const Profile=require('../profile.js'),Game=require('../game.js'),E=require('../engine.js'),Mods=require('../mods.js');

function storage(initial={}){const map=new Map(Object.entries(initial));return{
  get length(){return map.size},key:i=>[...map.keys()][i]||null,getItem:k=>map.has(k)?map.get(k):null,
  setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)
}}
function makeProfile(store=storage()){return Profile.create({storage:store,crypto:{getRandomValues:a=>(a[0]=99,a)},now:()=>Date.parse('2026-10-12T10:00:00Z'),location:{hostname:'play.monoid.test'}})}
const snap={gameMode:'classic',cores:{telemetry:{connectedCoreCount:0}},endless:{infinitePhase:false}};
const run=(events=[],wins=[])=>({gameMode:'classic',events,wins,cores:[]});
let checks=0;
function check(label,fn){fn();checks++;console.log('MOD DISCOVERIES V2: '+label)}
const ids=['bridge','recall','parity-exchange','pivot','broker','hinge','foundation','long-run','triple-double','pair'];
const starter=['bank','corner','double-double','double-echo','long-line','mint','overload','zero-port'];

check('eight physical Mod types at start, nine face-up slots, 14 locked archive slots',()=>{
  const p=makeProfile(),a=p.modUnlockState();
  assert.deepEqual(a.availableMods,starter);assert.equal(a.quantumLevel,0);assert.equal(a.knot,false);
  for(const id of ids)assert.equal(p.isModSlotUnlocked(id),false,id);
  for(const id of starter)assert.equal(p.isModSlotUnlocked(id),true,id);
  const archive=Mods.collection();
  assert.equal(archive.filter(slot=>slot.mod&&p.isModSlotUnlocked(slot.mod.id,slot.mod.collectionIndex||1)).length,9);
  assert.equal(archive.filter(slot=>slot.mod&&!p.isModSlotUnlocked(slot.mod.id,slot.mod.collectionIndex||1)).length,14);
  assert.equal(Mods.all().filter(m=>m.market&&m.collectionDefaultUnlocked).length,8)
});
check('DEV remains complete and legacy player upgrades to unlocked catalog without removing QP tiers',()=>{
  const store=storage({'monoid.profile.player.v1':JSON.stringify({profileId:'P-OLD',unlockedModes:['classic'],completedModes:[],unlockedMods:['knot','quantum-port:1'],modUnlockSchema:1})}),p=makeProfile(store);
  assert.equal(p.modUnlockState().availableMods.length,20);assert.equal(p.modUnlockState().quantumLevel,3);
  assert.equal(p.ensureProfile().modUnlockSchema,2);assert.equal(makeProfile(store).modUnlockState().availableMods.length,20);
  p.setContext('fresh',{reset:true});assert.deepEqual(p.modUnlockState().availableMods,starter);
  p.setContext('dev');assert.equal(p.modUnlockState().availableMods.length,20)
});
check('new run snapshots catalog; old save without new availableMods retains grandfathered access',()=>{
  const p=makeProfile(),g=Game.createGame(E,{seed:80101,MOD_ACCESS:p.modUnlockState()});
  assert.deepEqual(g.state().marketModAccess.availableMods,starter);
  assert.equal(g.marketTargetCount('long-run'),0,'Collector is absent from Market before discovery');
  assert.equal(g.marketTargetCount('quantum-port'),0);
  p.unlockModStep('long-run');g.config.MOD_ACCESS=p.modUnlockState();
  assert.deepEqual(g.state().marketModAccess.availableMods,starter);
  g.fresh(80102);
  assert(g.state().marketModAccess.availableMods.includes('long-run'));
  const saved=g.exportState(),restored=Game.createGame(E,{seed:1,MOD_ACCESS:makeProfile().modUnlockState()});
  assert(restored.restoreState(saved));assert(restored.state().marketModAccess.availableMods.includes('long-run'));
  const old={...saved,state:{...saved.state,marketModAccess:{knot:true,quantumLevel:3}}};
  assert(restored.restoreState(old));assert(!('availableMods' in restored.state().marketModAccess));
  assert.equal(restored.marketTargetCount('long-run'),1)
});
check('all ten milestones are permanent, independent and idempotent',()=>{
  const p=makeProfile();
  for(const id of ids)assert.equal(p.unlockModStep(id).changed,true,id);
  for(const id of ids){assert(p.modUnlockState().availableMods.includes(id));assert.equal(p.isModSlotUnlocked(id),true);assert.equal(p.unlockModStep(id).changed,false)}
  assert.equal(p.modUnlockState().availableMods.length,18,'eight starters plus ten earned');
});

function piece(id,a,b,x,y,rr=0){const t={id,a,b},p=E.pieceFrom(t,x,y,0,rr,id);p.tile=t;return p}
E.setBoardSize(30,40);
check('BRIDGE requires two groups of at least two physical neighbours, not merely a 3-tile articulation',()=>{
  const g=Game.createGame(E,{seed:80103}),five=[0,1,2,3,4].map(i=>piece('bridge-'+i,6,6,2+4*i,8));
  g.state().pieces=five.slice(0,3);assert.equal(g.modDiscoveryFacts({knot:false,hinge:false,pair:false,'triple-double':false}).bridgeRobust,false);
  g.state().pieces=five;assert.equal(g.modDiscoveryFacts({knot:false,hinge:false,pair:false,'triple-double':false}).bridgeRobust,true);
  const p=makeProfile();assert.deepEqual(p.evaluateRun(run(),snap,undefined,{bridgeRobust:true}).modDiscoveries,['bridge']);
});
check('PAIR needs two independent identical printed tiles aligned as a physical parallel pair',()=>{
  const g=Game.createGame(E,{seed:80104});
  const a=piece('pair-a',6,6,4,8),b=piece('pair-b',6,6,4,10),c=piece('pair-c',5,6,4,10);
  g.state().pieces=[a,c];assert.equal(g.modDiscoveryFacts({knot:false,bridge:false,hinge:false,'triple-double':false}).pairExactTwin,false);
  g.state().pieces=[a,b];assert.equal(g.modDiscoveryFacts({knot:false,bridge:false,hinge:false,'triple-double':false}).pairExactTwin,true);
  assert.deepEqual(makeProfile().evaluateRun(run(),snap,undefined,{pairExactTwin:true}).modDiscoveries,['pair']);
});
check('TRIPLE DOUBLE requires the complete four-sided non-zero double cross',()=>{
  const g=Game.createGame(E,{seed:80105}),cross=[
    piece('td-a',3,3,6,8),piece('td-b',5,3,2,8),piece('td-c',3,4,10,8),
    piece('td-d',3,2,7,10,1),piece('td-e',2,3,7,4,1)
  ];
  g.state().pieces=cross.slice(0,4);assert.equal(g.modDiscoveryFacts({knot:false,bridge:false,hinge:false,pair:false}).tripleDoubleCross,false);
  g.state().pieces=cross;assert.equal(g.modDiscoveryFacts({knot:false,bridge:false,hinge:false,pair:false}).tripleDoubleCross,true)
});
check('HINGE only discovers a legal alternate when a six-tile machine exists',()=>{
  const g=Game.createGame(E,{seed:80106});
  const a=piece('hinge-a',2,3,6,8),pivot=piece('hinge-pivot',2,2,2,8),extras=[0,1,2,3].map(i=>piece('hinge-extra-'+i,6,6,18,5+i*6));
  g.state().pieces=[a,pivot];assert.equal(g.modDiscoveryFacts({knot:false,bridge:false,pair:false,'triple-double':false}).hingeSix,false);
  g.state().pieces=[a,pivot,...extras];
  const actual=E.hingeAlternates(a,g.state().pieces).length>0;
  assert.equal(g.modDiscoveryFacts({knot:false,bridge:false,pair:false,'triple-double':false}).hingeSix,actual);
  assert.deepEqual(makeProfile().evaluateRun(run(),snap,undefined,{hingeSix:true}).modDiscoveries,['hinge'])
});
check('RECALL requires Undo and later completion of that same Round',()=>{
  const p=makeProfile();
  assert.deepEqual(p.evaluateRun(run([{type:'undo',round:2,restoredTurn:6}],[{round:3,turn:8}]),snap).modDiscoveries,[]);
  assert.deepEqual(p.evaluateRun(run([{type:'undo',round:2,restoredTurn:6}],[{round:2,turn:5}]),snap).modDiscoveries,[]);
  assert.deepEqual(p.evaluateRun(run([{type:'undo',round:2,restoredTurn:6}],[{round:2,turn:7}]),snap).modDiscoveries,['recall'])
});
check('PARITY requires four DISTINCT physical tiles, two even and two odd nonzero',()=>{
  const p=makeProfile();
  assert.deepEqual(p.evaluateRun(run([{turn:1,parityMixedFour:false,parityEvenTileCount:2,parityOddTileCount:2}]),snap).modDiscoveries,[]);
  assert.deepEqual(p.evaluateRun(run([{turn:1,parityMixedFour:true,parityEvenTileCount:2,parityOddTileCount:2}]),snap).modDiscoveries,['parity-exchange'])
});
check('PIVOT requires the Circuit and rotated placement to occur on the same Move',()=>{
  const p=makeProfile();
  assert.deepEqual(p.evaluateRun(run([{turn:2,placement:{rr:1}},{type:'circuit-closed',move:3}]),snap).modDiscoveries,[]);
  assert.deepEqual(p.evaluateRun(run([{turn:3,placement:{rr:0}},{type:'circuit-closed',move:3}]),snap).modDiscoveries,[]);
  assert.deepEqual(p.evaluateRun(run([{turn:3,placement:{rr:3}},{type:'circuit-closed',move:3}]),snap).modDiscoveries,['pivot'])
});
check('BROKER fires only for voluntary no-Mod Market exit with an affordable offer',()=>{
  const g=Game.createGame(E,{seed:80107}),s=g.state();s.shopOpen=true;s.shopType='market';s.marketBuys=[];
  s.events.push({type:'shop-open',shop:'market',discoveryAffordableMods:['corner']});
  assert(g.closeMarket());const close=s.events.findLast(e=>e.type==='shop-close'&&e.shop==='market');assert.equal(close.brokerDiscovery,true);
  assert.deepEqual(makeProfile().evaluateRun(run([close]),snap).modDiscoveries,['broker']);
  const q=Game.createGame(E,{seed:80108}),t=q.state();t.shopOpen=true;t.shopType='market';t.marketBuys=[];t.events.push({type:'shop-open',shop:'market',discoveryAffordableMods:[]});
  assert(q.closeMarket());assert.equal(t.events.findLast(e=>e.type==='shop-close'&&e.shop==='market').brokerDiscovery,false)
});
check('FOUNDATION requires same activated tile across three CONSECUTIVE Markets',()=>{
  const p=makeProfile();
  const mk=(marketIndex,ids)=>({type:'shop-open',shop:'market',marketIndex,foundationCandidateTileIds:ids});
  assert.deepEqual(p.evaluateRun(run([mk(1,['x']),mk(3,['x']),mk(4,['x'])]),snap).modDiscoveries,[]);
  assert.deepEqual(p.evaluateRun(run([mk(1,['x']),mk(2,['y']),mk(3,['x'])]),snap).modDiscoveries,[]);
  assert.deepEqual(p.evaluateRun(run([mk(1,['x','y']),mk(2,['y']),mk(3,['y'])]),snap).modDiscoveries,['foundation']);
});
check('FOUNDATION stage evidence is produced at real Market opening with persistent physical IDs',()=>{
  const g=Game.createGame(E,{seed:80109}),s=g.state(),tile=s.set.find(t=>t.id==='d3-3'),p=E.pieceFrom(tile,4,8,0,0,1);p.tile={...tile};s.pieces=[p];s.placedTileIds=[tile.id];s.coins=200;
  for(let i=1;i<=3;i++){
    s.events.push({turn:i,round:3*i,physicalActivatedTileIds:[tile.id]});
    s.cleared=true;s.intermissionResolved=false;s.nextShopType='market';
    assert(g.openIntermission());const e=s.events.findLast(e=>e.type==='shop-open'&&e.shop==='market');
    assert.equal(e.marketIndex,i);assert.deepEqual(e.foundationCandidateTileIds,[tile.id]);
    assert(g.closeMarket())
  }
  assert(makeProfile().evaluateRun(s,snap).modDiscoveries.includes('foundation'),'three successive Market openings with surviving activations must unlock FOUNDATION')
});
check('COLLECTOR requires ten unique routed physical tiles in one Move',()=>{
  const p=makeProfile();
  assert.deepEqual(p.evaluateRun(run([{turn:3,uniquePieces:9}]),snap).modDiscoveries,[]);
  assert.deepEqual(p.evaluateRun(run([{turn:4,uniquePieces:10}]),snap).modDiscoveries,['long-run'])
});
console.log('Mod discoveries v2 regressions passed: '+checks);
