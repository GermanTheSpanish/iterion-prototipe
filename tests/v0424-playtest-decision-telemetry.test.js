const assert=require('node:assert/strict');
const D=require('../data.js'),E=require('../engine.js'),G=require('../game.js');

E.setBoardSize(30,40);
const g=G.createGame(E,{seed:42401});
const rootIndex=g.state().hand.findIndex(t=>t&&t.a===t.b);assert(rootIndex>=0);
let candidates=g.candidatesForIndex(rootIndex);assert(candidates.length>1);

let before=JSON.stringify(g.exportState());
let decision=g.decisionTelemetry(rootIndex,candidates[0],{maxEvaluations:1,timeBudgetMs:1000});
assert.equal(JSON.stringify(g.exportState()),before,'decision telemetry must not mutate authoritative state');
assert.equal(decision.evaluationComplete,true,'opening placement is exactly evaluable without scoring every board position');
assert.equal(decision.evaluationStrategy,'root-equivalent');
assert.equal(decision.chosenOutput,null,'chosen output is supplied by the authoritative placement, not duplicated by telemetry');
assert.equal(decision.clearCoverageComplete,true);
assert.equal(decision.coverageIncludesChosen,true);
assert.equal(decision.clearCoverageSampleCount,decision.legalPlacementCount);
assert(decision.outputDistribution);
assert.equal(decision.deckBefore.generation,1);

const chosenPreview=g.previewPlacement(rootIndex,candidates[0]);assert(chosenPreview.ok);
let ctx=g.beginPlacement(rootIndex,candidates[0]);assert(ctx.ok);
let result=g.finishPlacement(ctx);
assert.equal(result.resonance.output,chosenPreview.output,'root preview must match authoritative placement output');
assert(decision.bestLegalOutput>=result.resonance.output,'root best output covers every playable opening tile');

const topology=g.topologyTelemetry(),deck=g.deckTelemetry(),rootSignal=g.signalTelemetry(ctx.sim);
assert.equal(topology.machineSize,1);assert.equal(topology.doubleCount,1);assert.equal(topology.branchingDoubleCount,0);
assert.equal(typeof topology.zeroLeafCount,'number');
assert.equal(deck.generation,1);assert.equal(deck.handCount,g.state().hand.filter(Boolean).length);
assert.equal(rootSignal.operationCount,0);assert.equal(rootSignal.reentryOperationCount,0);

if(!g.state().cleared&&!g.state().blocked&&!g.state().pendingCircuit&&!g.state().pendingModPlacement){
  let index=-1;for(let i=0;i<g.state().hand.length;i++)if(g.candidatesForIndex(i).length){index=i;break}assert(index>=0);
  candidates=g.candidatesForIndex(index);before=JSON.stringify(g.exportState());
  const sampled=g.decisionTelemetry(index,candidates[0],{maxEvaluations:1,timeBudgetMs:1000});
  if(sampled.legalPlacementCount>2){
    assert.equal(sampled.evaluationComplete,false);
    assert.equal(sampled.evaluationStrategy,'stratified-sample');
    assert.equal(sampled.clearCoverageSampleCount,1);
    assert.equal(sampled.coverageIncludesChosen,false)
  }
  decision=g.decisionTelemetry(index,candidates[0],{maxEvaluations:256,timeBudgetMs:1000});
  assert.equal(JSON.stringify(g.exportState()),before,'multi-placement evaluation must remain read-only');
  assert.equal(decision.clearCoverageSampleCount,decision.evaluatedPlacementCount);
  assert.equal(decision.coverageIncludesChosen,false);
  const preview=g.previewPlacement(index,candidates[0]);assert(preview.ok);
  ctx=g.beginPlacement(index,candidates[0]);assert(ctx.ok);result=g.finishPlacement(ctx);
  assert.equal(result.resonance.output,preview.output,'preview must match authoritative placement output');
  const signal=g.signalTelemetry(ctx.sim);
  assert(signal.operationCount>=signal.uniqueVisitedPieceCount);
  assert(signal.reentryOperationCount>=0);assert(signal.zeroReturnCount>=0);
  if(decision.evaluationComplete){
    assert.equal(decision.evaluationStrategy,'exhaustive');
    assert.equal(decision.evaluatedPlacementCount,decision.legalPlacementCount-1);
    const exactBest=Math.max(result.resonance.output,decision.bestEvaluatedOutput??-Infinity);
    assert(exactBest>=result.resonance.output)
  }
}

const capped=G.createGame(E,{seed:42402}),ci=capped.state().hand.findIndex(t=>t&&t.a===t.b),cc=capped.candidatesForIndex(ci);
const rootCap=capped.decisionTelemetry(ci,cc[0],{maxEvaluations:1,timeBudgetMs:0});
assert(rootCap.evaluationComplete,'root remains exact without evaluating equivalent board positions');

console.log('v0.45.0 coverage and signal playtest telemetry regressions passed');
