const assert=require('assert');
const E=require('../engine.js');
const Game=require('../game.js');
const QA=require('../qa-presets.js');

E.setBoardSize(18,24);
const game=Game.createGame(E,{seed:18092026});
QA.applyPreset(game,E,'classic14');

function settleCircuit(){
  const pending=game.state().pendingCircuit;
  if(!pending)return;
  const pick=pending.eligibleTileIds?.[0];
  assert(pick,'pending Circuit must expose an eligible physical tile');
  const chosen=game.chooseCircuitTile(pick);
  assert.strictEqual(chosen.ok,true,'pending Circuit must remain selectable')
}
function preview(i,candidate){
  const saved=game.exportState();
  const ctx=game.beginPlacement(i,candidate);
  if(!ctx.ok){game.restoreState(saved);return null}
  const result=game.finishPlacement(ctx);
  const score=game.state().score,cleared=game.state().cleared;
  game.restoreState(saved);
  return{score,cleared,result}
}
function bestMove(){
  let best=null;
  for(let i=0;i<game.state().hand.length;i++){
    const candidates=game.candidatesForIndex(i);
    for(const candidate of candidates){
      const result=preview(i,candidate);if(!result)continue;
      if(!best||Number(result.cleared)>Number(best.cleared)||result.cleared===best.cleared&&result.score>best.score)best={i,candidate,score:result.score,cleared:result.cleared}
    }
  }
  return best
}
function commitMove(move){
  const ctx=game.beginPlacement(move.i,move.candidate);assert.strictEqual(ctx.ok,true);
  const result=game.finishPlacement(ctx);settleCircuit();return result
}
function recoverIfNeeded(){
  const s=game.state();
  if(s.needsReroll){assert.strictEqual(game.canUseReroll(),true,'no-legal state must remain recoverable by the granted reroll');const result=game.resolveRequiredRerolls();assert.strictEqual(result.ok,true);return true}
  if(s.blocked&&s.failureReason==='placement-limit'&&game.canUseMove()){const result=game.useMove();assert.strictEqual(result.ok,true);return true}
  return false
}
function advanceClear(){
  const s=game.state();
  assert.strictEqual(s.cleared,true);
  if(game.canStartEndless()){
    assert.strictEqual(game.startEndless(),true,'base clear must enter Endless');
    if(game.state().shopOpen){assert.strictEqual(game.closeMarket(),true);assert.strictEqual(game.advance(),true)}
    return
  }
  if(s.nextShopType==='market'){
    assert.strictEqual(game.openIntermission(),true);
    assert.strictEqual(game.closeMarket(),true)
  }
  assert.strictEqual(game.advance(),true,'cleared run must advance')
}

const rounds=[];
while(game.snapshot().round.index<=19){
  const round=game.snapshot().round.index;
  let guard=0;
  while(!game.state().cleared&&guard++<12){
    if(recoverIfNeeded())continue;
    const move=bestMove();
    if(!move){
      throw new Error('Endless QA progression has no playable move at R'+round+'\n'+game.debugText())
    }
    commitMove(move)
  }
  if(!game.state().cleared){
    throw new Error('Endless QA progression failed to clear R'+round+'\n'+game.debugText())
  }
  rounds.push({round,score:game.state().score,pieces:game.state().pieces.length,endless:game.state().endlessMode,generation:game.state().setGeneration});
  if(round===19)break;
  advanceClear()
}
assert(rounds.some(r=>r.round===16&&r.endless),'fixture must actually cross into Endless');
assert(rounds.some(r=>r.round>=18),'fixture must remain playable for multiple Endless rounds');
assert(game.snapshot().round.index>=19);
assert(game.state().pieces.length===new Set(game.state().placedTileIds).size,'physical tile identity must remain unique');
assert(game.legalHandMask().some(Boolean)||game.state().needsReroll||game.state().cleared,'post-Endless state must remain interactable');
console.log('real R14 fixture remains playable through multiple Endless rounds',rounds);
