const assert=require('assert');
const S=require('../score.js');
const E=require('../engine.js');
const G=require('../game.js');

function firstRoot(game){
  const index=game.state().hand.findIndex(tile=>tile&&tile.a===tile.b);
  assert(index>=0,'fresh run must provide an opening double');
  const candidate=game.candidatesForIndex(index)[0];assert(candidate);
  const ctx=game.beginPlacement(index,candidate);assert(ctx.ok);
  return ctx
}
function forceExact(game,exact){
  const ctx=firstRoot(game);
  ctx.sim={output:Number(exact),outputExact:exact,events:[],reason:'root',rebounds:0,search:{starts:0,leaves:1,expanded:0}};
  return game.finishPlacement(ctx)
}

const roundIndex=23,expected=S.powMultiply('50000000000',5,roundIndex-14),below=S.subtract(expected,1);
assert.equal(Number(below),Number(expected),'fixture must reproduce a Number precision tie');

const low=G.createGame(E,{seed:7311});
low.state().round=roundIndex;low.state().endlessMode=true;
assert.equal(low.targetExact(),expected);
forceExact(low,below);
assert.equal(low.state().cleared,false,'one point below an unsafe target must not clear');
assert.equal(low.state().scoreExact,below);
const saved=low.exportState();
assert.doesNotThrow(()=>JSON.stringify(saved));
const restored=G.createGame(E,{seed:7312});
assert.equal(restored.restoreState(saved),true);
assert.equal(restored.state().scoreExact,below);
assert.equal(restored.snapshot().score.lastExact,below);

const exact=G.createGame(E,{seed:7313});
exact.state().round=roundIndex;exact.state().endlessMode=true;
forceExact(exact,expected);
assert.equal(exact.state().cleared,true,'exact target must clear');
assert.equal(exact.clearRewardBreakdown().exact,exact.config.EXACT_TARGET_BONUS);
assert.equal(exact.snapshot().round.targetExact,expected);
assert.match(exact.debugText(),new RegExp('target='+expected));
assert.match(exact.debugText(),new RegExp('Last output: '+expected));

console.log('exact score game authority and persistence regressions passed');
