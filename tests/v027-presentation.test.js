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
check('presentation separates Main and Echo events without losing selected nested branches',()=>{
  const ps=[[3,3,12,14,0],[5,3,8,14,0],[3,4,16,14,0],[5,5,6,13,1],[2,5,6,9,1],[5,4,6,17,1],[3,2,13,16,1]].map(([a,b,x,y,r],i)=>{const p=E.pieceFrom({a,b},x,y,0,r,i+1);p.tile={a,b,id:'p'+i};return p});
  const r=E.bestSignal(7,ps,{bifurcate:true,initialOutput:5,doubleEchoPieceId:1}),plan=V.signalPlan(r.events);
  assert.deepEqual(plan.main.filter(e=>e.type==='op'),r.events.filter(e=>e.type==='op'));
  assert.deepEqual(plan.echo.filter(e=>e.type==='op').map(e=>e.after),r.events.filter(e=>e.type==='echo-op').map(e=>e.after));
  for(const stream of [plan.main,plan.echo]){assert.equal(stream.filter(e=>e.type==='signal-fork').length,2);for(let i=0;i<stream.length;i++)if(stream[i].type==='signal-fork'){const block=V.forkBlock(stream,i);assert.equal(block.branches.length,2);assert.equal(block.join.output,block.branches.reduce((n,b)=>n+b.end.output,0))}}
  assert.equal(plan.result.finalOutput,r.output);
});
console.log(`${checks} presentation behavioural checks passed`);
