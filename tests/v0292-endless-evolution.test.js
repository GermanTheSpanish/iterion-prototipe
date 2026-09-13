const assert=require('assert');
const fs=require('fs');
const path=require('path');
const D=require('../data.js');
const E=require('../engine.js');
const Game=require('../game.js');

assert.strictEqual(D.ENDLESS_LONG_RUN_ACTIVATIONS,7);

function endlessPlacement(){
  E.setBoardSize(18,24);
  const game=Game.createGame(E,{seed:2920,STARTING_COINS:100,TARGETS:Array(15).fill(1e15)}),s=game.state();
  s.endlessMode=true;s.standardComplete=true;s.inflation=2;s.consumables.undo=1;
  const i=s.hand.findIndex(t=>t?.a===t?.b),candidate=game.candidatesForIndex(i)[0];
  assert(candidate,'opening double must have a legal placement');
  return{game,s,i,candidate};
}

{
  const{game,s,i,candidate}=endlessPlacement();
  const before={random:game.shopRandomPrice(),move:game.shopItemPrice('move'),market:game.marketDoubleDoublePrice()};
  const ctx=game.beginPlacement(i,candidate);assert.strictEqual(ctx.ok,true);game.finishPlacement(ctx);
  assert.strictEqual(s.systemStrain,1,'each successful Endless placement adds one System Strain');
  assert.deepStrictEqual({random:game.shopRandomPrice(),move:game.shopItemPrice('move'),market:game.marketDoubleDoublePrice()},{random:before.random+1,move:before.move+1,market:before.market+1});
  assert.strictEqual(game.snapshot().endless.systemStrain,1);
  assert.match(game.debugText(),/System Strain: 1/);
  assert.strictEqual(game.useUndo().ok,true);
  assert.strictEqual(game.state().systemStrain,0,'Undo must remove the undone placement’s Strain');
  assert.deepStrictEqual({random:game.shopRandomPrice(),move:game.shopItemPrice('move'),market:game.marketDoubleDoublePrice()},before);
}

{
  const game=Game.createGame(E,{seed:2921,TARGETS:Array(15).fill(1e15)}),s=game.state(),i=s.hand.findIndex(t=>t?.a===t?.b);
  const ctx=game.beginPlacement(i,game.candidatesForIndex(i)[0]);assert.strictEqual(ctx.ok,true);game.finishPlacement(ctx);
  assert.strictEqual(s.systemStrain,0,'base-run placements must not add System Strain');
}

function makePiece(id,upgrade){const tile={id:`lr-${id}`,a:2,b:2,upgrade,source:'test'},p=E.pieceFrom(tile,(id%5)*4,Math.floor(id/5)*4,0,0,id);p.tile=tile;return p}
function longRunCase({endless=true,used=0}={}){
  E.setBoardSize(30,40);const game=Game.createGame(E,{seed:2922,TARGETS:Array(15).fill(1e15)}),s=game.state();
  s.endlessMode=endless;s.standardComplete=endless;s.endlessLongRunActivations=used;s.mods=['long-run'];s.pieces=[];
  for(let i=1;i<=10;i++)s.pieces.push(makePiece(i,{1:3,2:2,3:1}[i]||0));
  s.hand=[s.set.find(t=>t.id==='d1-2'),null,null,null,null];s.reserve=s.set.filter(t=>t.id!=='d1-2');s.running=true;s.roundTurn=1;s.turn=1;s.blocked=false;s.failureReason=null;
  const events=s.pieces.map(p=>({type:'op',piece:p.id,op:'add',add:2,before:1,after:3})),p=s.pieces[0];
  const result=game.finishPlacement({ok:true,tile:{id:'ctx',a:1,b:2,upgrade:0,source:'test'},p,trigger:3,sim:{output:10,events,reason:'test',rebounds:0,search:{starts:1,leaves:1,expanded:1}}});
  return{game,s,result,income:[...s.events].reverse().find(e=>e.type==='upgrade-coins')};
}

{
  const{game,s,result,income}=longRunCase({used:6});
  assert.strictEqual(result.upgradeCoins,6);assert.strictEqual(income.longRunActive,true);assert.strictEqual(s.endlessLongRunActivations,7);
  assert.deepStrictEqual({used:game.snapshot().endless.longRunActivations,cap:game.snapshot().endless.longRunActivationCap},{used:7,cap:7});
}
{
  const{s,result,income,game}=longRunCase({used:7});
  assert.strictEqual(result.upgradeCoins,3,'after seven Endless payouts, Long Run must return to highest-star-wins');
  assert.strictEqual(income.longRunActive,false);assert.strictEqual(income.longRunCapped,true);assert.strictEqual(s.endlessLongRunActivations,7);
  assert.match(game.debugText(),/longRun=capped endless=7\/7/);
}
{
  const{s,result,income}=longRunCase({endless:false,used:7});
  assert.strictEqual(result.upgradeCoins,6,'the cap must not alter the base run');assert.strictEqual(income.longRunActive,true);assert.strictEqual(s.endlessLongRunActivations,7);
}

{
  const ui=fs.readFileSync(path.join(__dirname,'../ui.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'../ui-theme.css'),'utf8'),help=fs.readFileSync(path.join(__dirname,'../help.js'),'utf8');
  assert.match(ui,/dataset\.stageRound/);assert.match(ui,/endlessPalette/);assert.match(ui,/System Strain/);
  assert.match(css,/body\[data-stage-round="2"\]/);assert.match(css,/body\.endlessPalette/);assert.match(css,/body\.endlessPalette \.board/);assert.match(css,/body\.endlessPalette \.hand \.domino/);
  assert.match(help,/every placed domino adds 1 System Strain/);assert.match(help,/qualifying Endless Moves/);
}

console.log('v0.29.2 Endless evolution regression tests passed');
