const assert=require('assert');
const D=require('../data.js');
const E=require('../engine.js');
const Game=require('../game.js');

assert.strictEqual(D.VERSION,'0.28.3');
assert.strictEqual(D.ENGINE_VERSION,'0.14.0-split');
assert.strictEqual(D.LONG_RUN_UNIQUE_THRESHOLD,10);
assert.strictEqual(D.MARKET_LONG_RUN_COST,8);

function makePiece(id,upgrade){const tile={id:'lr-'+id,a:2,b:2,upgrade,source:'test'},p=E.pieceFrom(tile,(id%5)*4,Math.floor(id/5)*4,0,0,id);p.tile=tile;return p}
function economyCase(uniqueCount,stars,longRun,repeats=[]){
  E.setBoardSize(30,40);const game=Game.createGame(E,{seed:2302,TARGETS:Array(15).fill(1e15)}),s=game.state();
  s.mods=longRun?['long-run']:[];s.pieces=[];
  for(let i=1;i<=uniqueCount;i++)s.pieces.push(makePiece(i,stars[i]||0));
  s.hand=[s.set.find(t=>t.id==='d1-2'),null,null,null,null];s.reserve=s.set.filter(t=>t.id!=='d1-2');s.running=true;s.roundTurn=1;s.turn=1;s.blocked=false;s.failureReason=null;
  const events=[];for(let i=1;i<=uniqueCount;i++)events.push({type:'op',piece:i,op:'add',add:2,before:i,after:i+2});for(const id of repeats)events.push({type:'op',piece:id,op:'add',add:2,before:1,after:3});
  const p=s.pieces[0],result=game.finishPlacement({ok:true,tile:{id:'ctx',a:1,b:2,upgrade:0,source:'test'},p,trigger:3,sim:{output:10,events,reason:'test',rebounds:repeats.length,search:{starts:1,leaves:1,expanded:1}}});
  const income=[...s.events].reverse().find(e=>e.type==='upgrade-coins');return{result,income,s}
}

{
  const {result,income}=economyCase(9,{1:3,2:2,3:1},true);
  assert.strictEqual(result.upgradeCoins,3,'9 unique tiles must keep highest-star-wins');
  assert.strictEqual(income.longRunActive,false);
  assert.strictEqual(income.uniquePieces,9);
}
{
  const {result,income}=economyCase(10,{1:3,2:2,3:1},true);
  assert.strictEqual(result.upgradeCoins,6,'Long Run must sum each activated star tier once');
  assert.strictEqual(income.longRunActive,true);
  assert.strictEqual(income.uniquePieces,10);
}
{
  const {result,income}=economyCase(10,{1:3,2:2,3:1},true,[2,2,2]);
  assert.strictEqual(result.upgradeCoins,6,'repeated traversal/rebound of one physical star must not pay twice');
  assert.strictEqual(income.activations.filter(a=>a.pieceId===2).length,1);
}
{
  const {result,income}=economyCase(10,{1:3,2:2,3:1},false);
  assert.strictEqual(result.upgradeCoins,3,'without Long Run the existing highest-star-wins rule must remain');
  assert.strictEqual(income.longRunActive,false);
}
{
  const game=Game.createGame(E,{seed:44,STARTING_COINS:100}),s=game.state();s.cleared=true;s.round=2;s.nextShopType='market';s.intermissionResolved=false;s.coins=100;
  assert.strictEqual(game.openIntermission(),true);assert(s.shopOffers.includes('long-run'),'Long Run must be a valid machine-mod offer while unowned');
  const buy=game.buyMarketMod('long-run');assert.strictEqual(buy.ok,true);assert(s.mods.includes('long-run'));assert.strictEqual(buy.cost,8);assert.strictEqual(s.inflation,1);
  game.closeMarket();s.cleared=true;s.round=5;s.nextShopType='market';s.intermissionResolved=false;s.shopOpen=false;
  assert.strictEqual(game.openIntermission(),true);assert(!s.shopOffers.includes('long-run'),'an owned permanent machine mod must not be offered again');
}
console.log('v0.23 Stage B Long Run regression tests passed');
