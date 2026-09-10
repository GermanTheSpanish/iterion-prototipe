const assert=require('node:assert/strict');
const E=require('../engine.js'),G=require('../game.js'),D=require('../data.js'),C=require('../circuits.js');
let checks=0;const check=(name,fn)=>{fn();checks++;console.log(`POWER: ${name}`)},clone=x=>JSON.parse(JSON.stringify(x));
function pieces(specs){return specs.map(([a,b,x,y,rr],i)=>{const p=E.pieceFrom({a,b},x,y,0,rr,i+1);p.tile={id:`tile-${i}`,a,b};return p})}
function topology(r){return{start:r.events.find(e=>e.type==='start'),path:r.path,segments:r.segments,traversals:r.traversals,rebounds:r.rebounds,charges:[...r.zeroCharges||[]],search:r.search,events:r.events.filter(e=>['op','signal-fork','signal-start','signal-end','signal-join','rebound','zero-pass','move','route'].includes(e.type)).map(({type,piece,fork,arm,entryHalf,exitHalf,reverse,charge,toPiece,fromPiece,key})=>({type,piece,fork,arm,entryHalf,exitHalf,reverse,charge,toPiece,fromPiece,key}))}}
function run(ps,opts={}){return E.bestSignal(ps.at(-1).id,ps,{initialOutput:5,bifurcate:true,...opts})}
const simple=()=>pieces([[3,3,6,8,0],[5,3,2,8,0],[3,4,10,8,0],[3,2,7,10,1]]);
const zeros=()=>pieces([[3,3,6,8,0],[0,3,2,8,0],[3,0,10,8,0],[3,2,7,10,1]]);
const nested=()=>pieces([[3,3,12,14,0],[5,3,8,14,0],[3,4,16,14,0],[5,5,6,13,1],[2,5,6,9,1],[5,4,6,17,1],[3,2,13,16,1]]);
E.setBoardSize(30,40);
for(const power of [1,2,3,4])check(`printed operation families and DD magnitude at x${power}`,()=>{
  for(let v=0;v<=6;v++){const s={output:7},op=E.applyOp(v,false,s,false,power);assert.equal(op.type,v===0?'zero':v%2?'multiply':'add');assert.equal(s.output,v===0?7:v%2?7*v*power:7+v*power)}
  assert.equal(E.applyOp(5,true,{output:1},true,power).factor,25*power);
  assert.equal(E.applyOp(4,true,{output:1},true,power).add,8*power);
});
check('legally constructed competing routes ignore POWER metadata at every level',()=>{
  E.setBoardSize(18,24);
  const ps=pieces([[3,3,8,12,1],[3,4,10,13,0],[1,4,12,9,1],[4,4,12,15,0],[2,3,4,14,0]]);
  ps.forEach((p,i)=>assert(E.validatePlacement(p.tile,p.cubes[0].x,p.cubes[0].y,0,p.rr,ps.slice(0,i)).ok));
  const base=run(ps);assert.equal(base.output,23);assert.deepEqual(base.segments.map(e=>e.piece),[1,2,4]);
  for(const power of [2,3,4]){
    ps[2].tile.powerMultiplier=power;const unselected=run(ps);assert.deepEqual(topology(unselected),topology(base));assert.equal(unselected.output,23);
    ps[3].tile.powerMultiplier=power;const active=run(ps);assert.deepEqual(topology(active),topology(base));assert.equal(active.output,19+4*power);assert.equal(active.selectionOutput,23);delete ps[3].tile.powerMultiplier;
    assert.deepEqual(E.allPlacements(ps[4].tile,0,ps.slice(0,4)).map(p=>[p.x,p.y,p.rr]),E.allPlacements({...ps[4].tile,powerMultiplier:power},0,ps.slice(0,4)).map(p=>[p.x,p.y,p.rr]));
  }
  E.setBoardSize(30,40);
});
for(const fixture of [simple,zeros,nested])for(const power of [2,3,4])check(`${fixture.name} topology, DD, ZM and Echo at x${power}`,()=>{
  const ps=fixture(),opts={doubleDoublePieceId:1,zeroMemoryPieceId:2,doubleEchoPieceId:1};const base=run(ps,opts);
  ps.forEach(p=>p.tile.powerMultiplier=power);const r=run(ps,opts);
  assert.deepEqual(topology(r),topology(base));assert.notEqual(r.output,base.output);
  assert.equal(r.events.filter(e=>e.type==='double-echo-start').length,1);
  assert.equal(r.output,r.mainOutput+r.echoOutput);
  assert.equal(r.events.filter(e=>e.type==='op'&&e.doubleDouble).length,1);
  const zm=r.events.find(e=>e.type==='zero-memory');if(zm)assert.equal(zm.factor,9*power,'the preceding first DD operation is x9 before POWER');
  for(const family of ['signal','echo-signal']){const totals=new Map();for(const e of r.events){if(e.type===family+'-end'){const xs=totals.get(e.fork)||[];xs.push(e.output);totals.set(e.fork,xs)}if(e.type===family+'-join')assert.equal(e.output,totals.get(e.piece).reduce((a,b)=>a+b,0))}}
  const ranks=Object.fromEntries(ps.slice(0,3).map(p=>[p.tile.id,5])),res=C.resonance(r.output,r.events,ps,ranks,D);assert.equal(res.multiplier,25);assert.equal(res.active.length,3);assert.equal(res.output,Math.floor((r.mainOutput+r.echoOutput)*25));
});
check('POWER ZM repeats the actual preceding factor, not the printed value',()=>{
  const ps=zeros();ps[0].tile.powerMultiplier=3;const r=run(ps,{zeroMemoryPieceId:2});assert.equal(r.events.find(e=>e.type==='zero-memory').factor,9);
});
check('Echo activated inside an arm does not traverse its ancestor sibling',()=>{
  const ps=nested(),base=run(ps),r=run(ps,{doubleEchoPieceId:4});assert.deepEqual(topology(r),topology(base));
  assert.equal(r.events.filter(e=>e.type==='double-echo-start').length,1);assert(!r.events.some(e=>e.type==='echo-op'&&e.piece===3));assert.equal(r.events.filter(e=>e.type==='echo-signal-fork').length,1);
});
check('straight Echo and zero double retain selected topology at every POWER level',()=>{
  for(const power of [1,2,3,4]){const ps=pieces([[3,3,6,8,0],[3,5,10,8,0],[2,3,2,8,0]]);ps.forEach(p=>p.tile.powerMultiplier=power);const r=run(ps,{doubleEchoPieceId:1});assert.equal(r.mainOutput,5*3*power*5*power);assert.equal(r.echoOutput,r.mainOutput);
    const zs=pieces([[0,0,6,8,0],[3,0,2,8,0],[0,5,10,8,0],[0,2,7,10,1]]),base=run(zs);zs.forEach(p=>p.tile.powerMultiplier=power);const z=run(zs);assert.deepEqual(topology(z),topology(base));assert(!z.events.some(e=>e.type==='signal-fork'))}
});
// State-machine boundary fixtures deliberately isolate supply from board search.
// Geometry, matching and routing above use the real engine and legal placements.
const stateEngine={...E,hasLegalMove:()=>true};
function stateGame(){return G.createGame(stateEngine,{seed:2701,TARGETS:Array(15).fill(1e12)})}
function consumeSupply(g){const s=g.state();s.placedTileIds=s.set.map(t=>t.id);s.hand=Array(5).fill(null);s.reserve=[];s.cleared=false;s.roundTurn=0;g.assessContinuation()}
function uniqueLocations(s){const ids=[...s.placedTileIds,...s.hand.filter(Boolean).map(t=>t.id),...s.reserve.map(t=>t.id)];assert.equal(new Set(ids).size,ids.length);assert.equal(ids.length,s.set.length);assert.equal(new Set(s.set.map(t=>t.id)).size,s.set.length)}
check('complete sets I through VII, capped POWER, unique IDs and deterministic draws',()=>{
  const a=stateGame(),b=stateGame();assert.equal(a.state().set.length,28);uniqueLocations(a.state());
  for(let generation=2;generation<=7;generation++){
    consumeSupply(a);consumeSupply(b);const s=a.state(),tiles=s.set.filter(t=>t.generation===generation);assert.equal(tiles.length,28);assert.equal(new Set(tiles.map(t=>`${t.a}|${t.b}`)).size,28);assert(tiles.every(t=>t.powerMultiplier===Math.min(4,generation)));assert.equal(s.setGeneration,generation);assert.equal(s.failureReason,null);assert.equal(s.round,0);assert(!s.endlessMode);uniqueLocations(s);
    assert.deepEqual(s.hand,b.state().hand);assert.deepEqual(s.reserve,b.state().reserve);assert.equal(s.rngState,b.state().rngState);
    const events=s.events.filter(e=>e.type==='power-set');assert.equal(events.length,generation-1);assert.equal(events.at(-1).powerMultiplier,Math.min(4,generation));
    assert.equal(a.snapshot().powerSets.powerMultiplier,Math.min(4,generation));assert.match(a.debugText(),new RegExp(`POWER SET ${generation} UNLOCKED size=28 power=x${Math.min(4,generation)}`));
  }
});
check('purchases inherit each generation, retain identity and delay exhaustion',()=>{
  const g=stateGame();for(let generation=1;generation<=5;generation++){
    const s=g.state();s.coins=100;s.cleared=false;assert(g.openShop());const buy=g.buyShopRandomTile();assert(buy.ok);g.closeShop();assert.equal(buy.tile.generation||1,generation);assert.equal(buy.tile.powerMultiplier||1,Math.min(4,generation));
    const before=clone(buy.tile);s.placedTileIds=s.set.filter(t=>t.id!==buy.tile.id).map(t=>t.id);s.hand=[s.set.find(t=>t.id===buy.tile.id),null,null,null,null];s.reserve=[];s.roundTurn=0;g.assessContinuation();assert.equal(s.setGeneration,generation);uniqueLocations(s);
    consumeSupply(g);assert.deepEqual(g.state().set.find(t=>t.id===buy.tile.id),before);
  }
});
function lastTileGame(){const g=G.createGame(E,{seed:2707,TARGETS:Array(15).fill(1e12)}),s=g.state(),root=s.set.find(t=>t.id==='d2-2'),last=s.set.find(t=>t.id==='d2-4');s.set=[root,last];s.pieces=[E.pieceFrom(root,6,8,0,0,1)];s.pieces[0].tile={...root};s.placedTileIds=[root.id];s.hand=[last,null,null,null,null];s.reserve=[];s.idc=1;s.turn=1;s.roundTurn=1;s.consumables.undo=2;s.coins=100;return g}
check('Undo restores exact supply, generation, RNG, coordinates and repeatable unlock',()=>{
  const g=lastTileGame(),before=clone(g.state()),ctx=g.beginPlacement(0,{x:10,y:8,rr:0});assert(ctx.ok);g.finishPlacement(ctx);const after=clone(g.state());assert.equal(after.setGeneration,2);assert(g.useUndo().ok);
  for(const key of ['setGeneration','set','hand','reserve','placedTileIds','pieces','score','turn','rngState','circuitRanks','circuitSignatures'])assert.deepEqual(g.state()[key],before[key],key);assert(!g.state().events.some(e=>e.type==='power-set'));uniqueLocations(g.state());
  const replay=g.beginPlacement(0,{x:10,y:8,rr:0});g.finishPlacement(replay);for(const key of ['set','hand','reserve','placedTileIds','pieces','score','turn','rngState'])assert.deepEqual(g.state()[key],after[key],key);assert.deepEqual(g.state().events.filter(e=>e.type==='power-set'),after.events.filter(e=>e.type==='power-set'));
});
check('paid POWER purchase survives Undo across unlock, with coherent metadata',()=>{
  const g=lastTileGame(),ctx=g.beginPlacement(0,{x:10,y:8,rr:0});g.finishPlacement(ctx);assert(g.openShop());const r=g.buyShopRandomTile();g.closeShop();assert.equal(r.tile.powerMultiplier,2);assert(g.useUndo().ok);const s=g.state();assert.deepEqual(s.set.find(t=>t.id===r.tile.id),r.tile);assert.equal(s.coins,100-r.cost);assert.equal(s.inflation,1);uniqueLocations(s);
});
check('purchase before a POWER placement stays owned after its Undo',()=>{
  const g=lastTileGame();g.finishPlacement(g.beginPlacement(0,{x:10,y:8,rr:0}));g.openShop();const r=g.buyShopRandomTile();g.closeShop();assert(g.reroll().ok);const s=g.state(),before=clone(s);let ctx;for(let i=0;i<5&&!ctx;i++){const c=g.candidatesForIndex(i)[0];if(c)ctx=g.beginPlacement(i,c)}assert(ctx?.ok);g.finishPlacement(ctx);assert(g.useUndo().ok);assert.deepEqual(g.state().set.find(t=>t.id===r.tile.id),r.tile);assert.equal(g.state().coins,before.coins);assert.equal(g.state().inflation,before.inflation);uniqueLocations(g.state());
});
for(const power of [1,2,3,4])check(`initial trigger remains printed sum at x${power}`,()=>{
  const g=G.createGame(E,{seed:27,TARGETS:Array(15).fill(1e12)}),s=g.state();let i=s.hand.findIndex(t=>t?.a===t?.b);s.hand[i].powerMultiplier=power;const t=s.hand[i],ctx=g.beginPlacement(i,g.candidatesForIndex(i)[0]);assert(ctx.ok);assert.equal(ctx.trigger,t.a+t.b);assert.equal(ctx.sim.output,t.a+t.b);
});
check('free Reroll refresh and stored purchases preserve coins and Inflation',()=>{
  const g=stateGame(),s=g.state();s.coins=50;g.openShop();g.buyShopItem('reroll');g.closeShop();const money=[s.coins,s.inflation];assert.equal(g.reroll().source,'free');assert.deepEqual([s.coins,s.inflation],money);assert.equal(s.consumables.reroll,1);
  for(let round=0;round<18;round++){s.round=round;s.endlessMode=round>=14;s.cleared=true;s.shopOpen=false;s.intermissionResolved=true;assert(g.advance());assert.equal(s.freeReroll,1);assert.equal(s.consumables.reroll,1)}
});
check('long physical route with POWER and Echo pays Stars and Resonance once',()=>{
  E.setBoardSize(30,40);const specs=[];for(let i=0;i<6;i++)specs.push([3,3,4+i*4,16,0]);for(let i=0;i<5;i++)specs.push([3,3,28,16+i*4,1]);specs.push([2,3,0,16,0]);const ps=pieces(specs);
  // Each additional contact is legal; the first tile position is a state fixture.
  for(let i=1;i<ps.length;i++)assert(E.validatePlacement(ps[i].tile,ps[i].cubes[0].x,ps[i].cubes[0].y,0,ps[i].rr,ps.slice(0,i)).ok);
  ps.forEach(p=>{p.tile.powerMultiplier=2;p.tile.upgrade=2});const sim=run(ps,{doubleEchoPieceId:1});assert.equal(sim.traversals,11);assert.equal(sim.events.filter(e=>e.type==='echo-op').length,10);
  const g=G.createGame(E,{seed:2718,TARGETS:Array(15).fill(Number.MAX_VALUE)}),s=g.state();s.pieces=ps;s.set=ps.map(p=>p.tile);s.placedTileIds=s.set.map(t=>t.id);s.hand=Array(5).fill(null);s.reserve=[];s.mods=['long-run'];s.coins=0;s.turn=12;s.roundTurn=7;s.running=true;s.circuitRanks=Object.fromEntries(ps.slice(0,3).map(p=>[p.tile.id,5]));
  g.finishPlacement({ok:true,tile:ps.at(-1).tile,p:ps.at(-1),trigger:5,sim});const income=s.events.find(e=>e.type==='upgrade-coins');assert.equal(income.uniquePieces,11);assert.equal(income.amount,22);assert.equal(s.coins,22);assert.equal(s.score,Math.floor(sim.output*25));assert.equal(s.events.find(e=>e.type==='circuit-resonance').active.length,3);
});
console.log(`${checks} POWER behavioural checks passed`);
