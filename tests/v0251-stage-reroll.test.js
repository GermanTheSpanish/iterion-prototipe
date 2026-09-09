const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const D=require('../data.js');
const E=require('../engine.js');
const Game=require('../game.js');
const Help=require('../help.js');

function game(seed=251){E.setBoardSize(18,24);return Game.createGame(E,{seed})}
function readyAdvance(g,roundIndex){const s=g.state();s.round=roundIndex;s.cleared=true;s.shopOpen=false;s.shopType=null;s.intermissionResolved=true;s.nextShopType='none';s.blocked=false;s.failureReason=null;return s}

{
  const g=game(2511),s=g.state();
  assert.equal(D.STAGE_REROLL_REWARD,1);
  assert.equal(s.round,0);
  assert.equal(s.stageReroll,0,'Stage 1 must not receive an extra free reroll');
  assert.equal(s.consumables.reroll,D.STARTING_REROLL_CONSUMABLES,'opening stored reroll remains unchanged');
}

{
  const g=game(2512),s=g.state();
  s.consumables.reroll=2;
  readyAdvance(g,2);
  assert.equal(g.advance(),true,'R3 -> R4 must advance into Stage 2');
  assert.equal(s.round,3);
  assert.equal(s.stageReroll,1,'Stage 2 grants one free Stage Reroll');
  assert.equal(s.consumables.reroll,2,'Stage reward must not consume or replace stored rerolls');
  assert.equal(g.snapshot().rerollsLeft,3,'snapshot total includes free + stored rerolls');
  assert.equal(g.snapshot().stageReroll,1);
}

{
  const g=game(2513),s=g.state();
  s.consumables.reroll=2;
  readyAdvance(g,2);g.advance();
  readyAdvance(g,3);g.advance();
  assert.equal(s.round,4);
  assert.equal(s.stageReroll,1,'unused Stage Reroll persists across rounds inside the same Stage');
  const first=g.reroll();
  assert.equal(first.ok,true);
  assert.equal(first.source,'stage','free Stage Reroll must be spent before stored rerolls');
  assert.equal(s.stageReroll,0);
  assert.equal(s.consumables.reroll,2);
  const second=g.reroll();
  assert.equal(second.ok,true);
  assert.equal(second.source,'stored');
  assert.equal(s.consumables.reroll,1);
}

{
  const g=game(2514),s=g.state();
  s.stageReroll=1;
  s.consumables.reroll=0;
  assert.equal(g.canUseReroll(),true,'free Stage Reroll independently enables reroll');
  readyAdvance(g,5);
  assert.equal(g.advance(),true,'R6 -> R7 enters a new Stage');
  assert.equal(s.stageReroll,1,'new Stage refreshes free reroll instead of stacking it');
  const grant=[...s.events].reverse().find(e=>e.type==='stage-reroll');
  assert.equal(grant.stage,3);
  assert.equal(grant.granted,1);
  assert.equal(grant.replaced,1,'telemetry records an unused prior Stage Reroll being refreshed');
}

{
  const g=game(2515),s=g.state();
  s.standardComplete=true;s.cleared=true;s.round=D.TOTAL_ROUNDS-1;s.intermissionResolved=true;s.shopOpen=false;s.stageReroll=0;
  assert.equal(g.startEndless(),true,'completed base run can enter Endless flow');
  assert.equal(s.shopOpen,true,'existing Stage Market remains before Endless Stage 6');
  assert.equal(g.closeMarket(),true);
  assert.equal(g.advance(),true);
  assert.equal(s.round,D.TOTAL_ROUNDS);
  assert.equal(s.endlessMode,true);
  assert.equal(s.stageReroll,1,'Endless Stage 6 receives the same free Stage Reroll');
}

{
  const g=game(2516),s=g.state();
  s.consumables.reroll=0;
  readyAdvance(g,2);g.advance();
  const debug=g.debugText();
  assert.match(debug,/Tools: move=0, reroll=0, stageReroll=1, undo=0/);
  assert.match(debug,/STAGE 2 REROLL \+1/);
  const economy=Help.rulebookSections().find(section=>section.id==='economy');
  assert.match(economy.rulesDescription,/free Stage Reroll/);
  assert.match(economy.rulesDescription,/refreshes rather than stacking/);
}

{
  const ui=fs.readFileSync(path.join(__dirname,'..','ui.js'),'utf8');
  assert.match(ui,/FREE REROLL/,'new Stage toast should expose the reward');
  assert.match(ui,/Reroll · FREE/,'gameplay reroll control should expose the free Stage Reroll');
}

console.log('v0.25.1 Stage Reroll regression tests passed');
