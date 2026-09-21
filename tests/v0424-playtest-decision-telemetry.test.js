const assert=require('node:assert/strict');
const D=require('../data.js'),E=require('../engine.js'),G=require('../game.js');
E.setBoardSize(30,40);
const g=G.createGame(E,{seed:42401});
const rootIndex=g.state().hand.findIndex(t=>t&&t.a===t.b);assert(rootIndex>=0);
let candidates=g.candidatesForIndex(rootIndex);assert(candidates.length>1);
let before=JSON.stringify(g.exportState()),decision=g.decisionTelemetry(rootIndex,candidates[0],{maxEvaluations:1,timeBudgetMs:1000});
assert.equal(JSON.stringify(g.exportState()),before,'decision telemetry must not mutate authoritative state');
assert.equal(decision.evaluationComplete,true,'opening placement has position-independent Score');assert.equal(decision.bestLegalOutput,decision.chosenOutput);
let ctx=g.beginPlacement(rootIndex,candidates[0]);assert(ctx.ok);let result=g.finishPlacement(ctx);assert.equal(result.resonance.output,decision.chosenOutput);
const topology=g.topologyTelemetry();assert.equal(topology.machineSize,1);assert.equal(topology.doubleCount,1);assert.equal(topology.branchingDoubleCount,0);
if(!g.state().cleared&&!g.state().blocked&&!g.state().pendingCircuit&&!g.state().pendingModPlacement){
  let index=-1;for(let i=0;i<g.state().hand.length;i++)if(g.candidatesForIndex(i).length){index=i;break}assert(index>=0);
  candidates=g.candidatesForIndex(index);before=JSON.stringify(g.exportState());decision=g.decisionTelemetry(index,candidates[0],{maxEvaluations:128,timeBudgetMs:1000});assert.equal(JSON.stringify(g.exportState()),before,'multi-placement evaluation must remain read-only');
  const chosen=g.previewPlacement(index,candidates[0]);assert(chosen.ok);ctx=g.beginPlacement(index,candidates[0]);assert(ctx.ok);result=g.finishPlacement(ctx);assert.equal(result.resonance.output,chosen.output,'preview must match authoritative placement output');
}
const capped=G.createGame(E,{seed:42402}),ci=capped.state().hand.findIndex(t=>t&&t.a===t.b),cc=capped.candidatesForIndex(ci);const rootCap=capped.decisionTelemetry(ci,cc[0],{maxEvaluations:1,timeBudgetMs:0});assert(rootCap.evaluationComplete,'root remains exact without evaluating equivalent board positions');
console.log('v0.42.4 read-only playtest decision telemetry regressions passed');
