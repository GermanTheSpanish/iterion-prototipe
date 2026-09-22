const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const V=require('../presentation.js'),D=require('../data.js'),H=require('../help.js'),E=require('../engine.js');
const ui=fs.readFileSync(require.resolve('../ui.js'),'utf8');let checks=0;
const check=(name,fn)=>{fn();checks++;console.log(`Presentation: ${name}`)};
check('historical opening shake timing restored, with a deterministic regression counterexample',()=>{
  const source=ui.match(/  function maybeShakeRotate\(e\).*\n/)[0];
  function simulate(code,placed=0){let rotations=0,now=1000;const env={GAME:{state:()=>({pieces:Array(placed),rootRR:0}),rotateRoot:()=>rotations++,candidatesForIndex:()=>[]},performance:{now:()=>now},D,drag:{lastX:100,lastSign:0,switches:0,shakeStarted:1000,lastRotate:0,index:0},navigator:{},updateFloatRotation:()=>{},toast:()=>{},ARROW:['']};vm.createContext(env);vm.runInContext(code,env);for(const [t,x]of [[1010,120],[1060,100],[1110,120]]){now=t;env.maybeShakeRotate({clientX:x})}return rotations}
  // 9afb380 changed only this timing reference in the retained function.
  // These two variants reproduce the historical condition without requiring
  // Git history in CI's shallow checkout.
  const knownGood=source.replace(/now-drag\.(?:lastRotate|shakeStarted)>D.SHAKE_COOLDOWN_MS/,'now-drag.lastRotate>D.SHAKE_COOLDOWN_MS');
  const regressed=knownGood.replace('now-drag.lastRotate>D.SHAKE_COOLDOWN_MS','now-drag.shakeStarted>D.SHAKE_COOLDOWN_MS');
  assert.equal(D.SHAKE_THRESHOLD,10);assert.equal(simulate(knownGood),1);assert.equal(simulate(regressed),0);assert.equal(simulate(source),1);assert.equal(simulate(source,1),0,'ordinary tiles never use opening shake');
});
check('HTML escaping retains complete entities for every special character',()=>{
  const env={};vm.createContext(env);vm.runInContext(ui.match(/  function escapeHtml\(value\).*\n/)[0],env);
  assert.equal(env.escapeHtml('&<>"\''),'&amp;&lt;&gt;&quot;&#039;');
});
check('Rulebook retains semantic free Reroll and POWER progression coverage',()=>{
  const sections=Object.fromEntries(H.rulebookSections().map(s=>[s.id,s.rulesDescription]));
  assert.match(sections.economy,/Every round grants one free Reroll/);assert.match(sections.economy,/before stored Rerolls/);assert.match(sections.economy,/refreshes to one rather than accumulating/);
  for(const concept of [/every physical tile.*placed/i,/before Endless/,/Set II.*×2/,/Set III ×3/,/Set IV.*×4/,/initial|trigger/,/never changes.*routing/,/Buying extra tiles.*delays/,/inherit.*generation/,/retain.*generation/])assert.match(sections.power,concept);
  assert.match(sections.doubles,/both arms receive that full Score/);assert.match(sections.doubles,/\[0\|0\].*never splits/);assert.match(sections.doubles,/Echo.*same split rule/);assert.match(sections.doubles,/never create another Echo/);
  assert.match(sections.circuits,/\+2 \/ \+3 \/ \+4/);assert.match(sections.circuits,/only once/);assert.match(sections.circuits,/overlapping/);
});
check('Inspector exposes original values, generation, actual operations and Circuit rank together',()=>{
  for(const power of [2,3,4]){const t={id:'physical',a:3,b:5,generation:power,powerMultiplier:power},model=H.inspectTile({set:[t],events:[],mods:[],circuitRanks:{physical:3}},t.id);assert.deepEqual(model.baseTile.values,[3,5]);assert.equal(model.power.generation,power);assert.equal(model.power.powerMultiplier,power);assert.equal(model.baseTile.operations[1].factor,5*power);assert.equal(model.circuit.roman,'III')}
});
check('Batch B Tile Mods expose distinct physical board marks',()=>{
  const tile={id:'physical',a:2,b:3},base={set:[tile],circuitRanks:{}};
  for(const [field,label] of [['bridgeTileId','BR'],['gateTileId','GT'],['fanTileId','FN'],['frameTileId','FM'],['crownTileId','CW'],['frontierTileId','FT']]){
    const model=V.tileViewModel(tile,{...base,[field]:'physical'});assert.equal(model.modifiers.length,1);assert.equal(model.modifiers[0].label,label)
  }
});
check('presentation separates Main and Echo events without losing selected nested branches',()=>{
  const ps=[[3,3,12,14,0],[5,3,8,14,0],[3,4,16,14,0],[5,5,6,13,1],[2,5,6,9,1],[5,4,6,17,1],[3,2,13,16,1]].map(([a,b,x,y,r],i)=>{const p=E.pieceFrom({a,b},x,y,0,r,i+1);p.tile={a,b,id:'p'+i};return p});
  const r=E.bestSignal(7,ps,{bifurcate:true,initialOutput:5,doubleEchoPieceId:1}),plan=V.signalPlan(r.events);
  assert.deepEqual(plan.main.filter(e=>e.type==='op'),r.events.filter(e=>e.type==='op'));
  assert.deepEqual(plan.echo.filter(e=>e.type==='op').map(e=>e.after),r.events.filter(e=>e.type==='echo-op').map(e=>e.after));
  for(const stream of [plan.main,plan.echo]){assert.equal(stream.filter(e=>e.type==='signal-fork').length,2);for(let i=0;i<stream.length;i++)if(stream[i].type==='signal-fork'){const block=V.forkBlock(stream,i);assert.equal(block.branches.length,2);assert.equal(block.join.output,block.branches.reduce((n,b)=>n+b.end.output,0))}}
  assert.equal(plan.result.finalOutput,r.output);
});
check('cascade repeat compression is spatially scoped and uses neutral density tiers',()=>{
  const same=V.cascadeOperationKey('main.A',12,1,'+4'),otherPiece=V.cascadeOperationKey('main.A',13,1,'+4'),otherLane=V.cascadeOperationKey('main.B',12,1,'+4'),otherHalf=V.cascadeOperationKey('main.A',12,0,'+4'),otherOp=V.cascadeOperationKey('main.A',12,1,'×4');
  assert.equal(same,V.cascadeOperationKey('main.A',12,1,'+4'));assert.notEqual(same,otherPiece);assert.notEqual(same,otherLane);assert.notEqual(same,otherHalf);assert.notEqual(same,otherOp);
  assert.deepEqual([1,2,3,4,5,9].map(V.cascadeRepeatTier),[1,2,3,3,5,5]);
});
check('cascade settlement pacing keeps readable handoff time without changing arithmetic',()=>{
  assert.equal(V.CASCADE.subtotalHoldMs,360);assert.equal(V.CASCADE.settleItemMs,360);assert.equal(V.CASCADE.resonanceSettleMs,420);
});
check('cascade settlement uses terminal additive branches and preserves exact output',()=>{
  const ps=[[3,3,12,14,0],[5,3,8,14,0],[3,4,16,14,0],[5,5,6,13,1],[2,5,6,9,1],[5,4,6,17,1],[3,2,13,16,1]].map(([a,b,x,y,r],i)=>{const p=E.pieceFrom({a,b},x,y,0,r,i+1);p.tile={a,b,id:'p'+i};return p});
  const r=E.bestSignal(7,ps,{bifurcate:true,initialOutput:5,doubleEchoPieceId:1}),items=V.cascadeSettlementPlan(r.events,r.output,7,8);
  assert(items.length>1,'split/echo fixture should expose more than one truthful contribution');
  assert.equal(items.reduce((sum,item)=>sum+item.output,0),r.output);
  assert(items.some(item=>item.family==='main'));assert(items.some(item=>item.family==='echo'));
  assert(items.every(item=>Number.isFinite(item.output)&&item.label));
});
check('cascade settlement labels Triple Double arms A/B/C and falls back instead of lying',()=>{
  const events=[
    {type:'signal-fork',piece:9,output:10,splitKind:'triple-double'},
    {type:'signal-start',fork:9,arm:0,output:10},{type:'op',piece:1,exitHalf:1,after:20},{type:'signal-end',fork:9,arm:0,output:20},
    {type:'signal-start',fork:9,arm:1,output:10},{type:'op',piece:2,exitHalf:0,after:30},{type:'signal-end',fork:9,arm:1,output:30},
    {type:'signal-start',fork:9,arm:2,output:10},{type:'op',piece:3,exitHalf:1,after:40},{type:'signal-end',fork:9,arm:2,output:40},
    {type:'signal-join',piece:9,output:90}
  ];
  const items=V.cascadeSettlementPlan(events,90,9,8);assert.deepEqual(items.map(item=>item.label),['MAIN A','MAIN B','MAIN C']);assert.equal(items.reduce((sum,item)=>sum+item.output,0),90);
  const fallback=V.cascadeSettlementPlan(events,91,9,8);assert.equal(fallback.length,1);assert.equal(fallback[0].label,'RESULT');assert.equal(fallback[0].output,91);assert.equal(fallback[0].fallback,true);
});
console.log(`${checks} presentation behavioural checks passed`);
