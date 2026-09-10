const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const D=require('../data.js');
const E=require('../engine.js');
const Game=require('../game.js');
const Help=require('../help.js');

function game(seed=271){E.setBoardSize(18,24);return Game.createGame(E,{seed})}
function readyAdvance(g,roundIndex){const s=g.state();s.round=roundIndex;s.cleared=true;s.shopOpen=false;s.shopType=null;s.intermissionResolved=true;s.nextShopType='none';s.blocked=false;s.failureReason=null;return s}

{
  const g=game(2711),s=g.state();
  assert.equal(D.ROUND_REROLL_REWARD,1);
  assert.equal(D.STARTING_REROLL_CONSUMABLES,0,'the opening reroll is now the same free per-round resource');
  assert.equal(s.round,0);
  assert.equal(s.freeReroll,1,'Round 1 receives one free reroll');
  assert.equal(s.consumables.reroll,0,'no extra stored reroll is silently added at run start');
  assert.equal(g.snapshot().rerollsLeft,1);
}

{
  const g=game(2712),s=g.state();
  s.consumables.reroll=2;
  const first=g.reroll();
  assert.equal(first.ok,true);
  assert.equal(first.source,'free','free reroll is spent before stored rerolls');
  assert.equal(s.freeReroll,0);
  assert.equal(s.consumables.reroll,2);
  const second=g.reroll();
  assert.equal(second.ok,true);
  assert.equal(second.source,'stored');
  assert.equal(s.consumables.reroll,1);
}

{
  const g=game(2713),s=g.state();
  assert.equal(s.freeReroll,1);
  readyAdvance(g,0);
  assert.equal(g.advance(),true,'R1 -> R2 advances normally');
  assert.equal(s.round,1);
  assert.equal(s.freeReroll,1,'unused free reroll refreshes rather than stacking');
  const grant=[...s.events].reverse().find(e=>e.type==='round-reroll');
  assert.equal(grant.round,2);
  assert.equal(grant.granted,1);
  assert.equal(grant.replaced,1,'telemetry records an unused prior free reroll being replaced');
}

{
  const g=game(2714),s=g.state();
  g.reroll();assert.equal(s.freeReroll,0);
  readyAdvance(g,2);
  assert.equal(g.advance(),true,'R3 -> R4 enters Stage 2');
  assert.equal(s.round,3);
  assert.equal(s.freeReroll,1,'stage boundaries use the same one-free-reroll-per-round rule');
}

{
  const g=game(2715),s=g.state();
  s.standardComplete=true;s.cleared=true;s.round=D.TOTAL_ROUNDS-1;s.intermissionResolved=true;s.shopOpen=false;s.freeReroll=0;
  assert.equal(g.startEndless(),true,'completed base run can enter Endless flow');
  assert.equal(s.shopOpen,true,'existing Stage Market remains before Endless Stage 6');
  assert.equal(g.closeMarket(),true);
  assert.equal(g.advance(),true);
  assert.equal(s.round,D.TOTAL_ROUNDS);
  assert.equal(s.endlessMode,true);
  assert.equal(s.freeReroll,1,'every Endless round also receives one free reroll');
}

{
  const g=game(2716),debug=g.debugText();
  assert.match(debug,/Tools: move=0, reroll=0, freeReroll=1, undo=0/);
  assert.match(debug,/R1 FREE REROLL \+1/);
  const economy=Help.rulebookSections().find(section=>section.id==='economy');
  assert(economy,'Economy section must exist');
  assert.match(economy.rulesDescription,/Every round grants one free Reroll/);
  assert.match(economy.rulesDescription,/before stored Rerolls/);
  assert.match(economy.rulesDescription,/refreshes to one rather than accumulating/);
}

{
  const ui=fs.readFileSync(path.join(__dirname,'..','ui.js'),'utf8');
  assert.match(ui,/Reroll · FREE/,'gameplay reroll control should expose the free round reroll');
}

console.log('Per-round free Reroll regression tests passed');
