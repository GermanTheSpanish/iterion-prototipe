const assert=require('assert');
const E=require('../engine.js');
const D=require('../data.js');
const Game=require('../game.js');

function makePiece(tile,x,id){
  const p=E.pieceFrom(tile,x,0,0,0,id);p.tile={...tile};return p
}

function testConfig(){
  assert.strictEqual(D.VERSION,'0.23.0');
  assert.strictEqual(D.MARKET_OFFER_COUNT,3);
  assert.strictEqual(D.MARKET_PURCHASE_LIMIT,1);
  assert.strictEqual(D.LONG_RUN_UNIQUE_THRESHOLD,10);
}

function testMarketOffersThreeAndLocksAfterOnePurchase(){
  E.setBoardSize(18,24);
  const game=Game.createGame(E,{seed:77,STARTING_COINS:100});
  const s=game.state(),by=id=>s.set.find(t=>t.id===id);
  const d=makePiece(by('d3-3'),0,101),z=makePiece(by('d0-3'),8,102);
  s.pieces=[d,z];s.placedTileIds=[d.tile.id,z.tile.id];s.coins=100;
  s.cleared=true;s.round=2;s.nextShopType='market';s.intermissionResolved=false;s.shopOpen=false;s.shopType=null;
  assert.strictEqual(game.openIntermission(),true);
  const offers=[...s.shopOffers];
  assert.strictEqual(offers.length,3,'eligible Market must present three distinct offers');
  assert.strictEqual(new Set(offers).size,3);
  for(const id of offers)assert(game.marketOfferInfo(id).offered);
  const first=game.buyMarketMod(offers[0]);
  assert.strictEqual(first.ok,true,'first Market choice must be purchasable');
  const secondId=offers[1];
  const second=game.buyMarketMod(secondId);
  assert.strictEqual(second.ok,false,'a second purchase in the same Market must be rejected');
  assert.strictEqual(second.reason,'limit');
  assert.strictEqual(s.marketBuys.length,1);
}

function testDoubleEchoAndZeroMemoryEngineEffects(){
  E.setBoardSize(18,24);
  const entry=E.pieceFrom({a:1,b:5},0,0,0,0,1);entry.tile={id:'entry',a:1,b:5,upgrade:0,source:'test'};
  const dd=E.pieceFrom({a:5,b:5},4,0,0,0,2);dd.tile={id:'dd',a:5,b:5,upgrade:0,source:'test'};
  const zero=E.pieceFrom({a:5,b:0},8,0,0,0,3);zero.tile={id:'zero',a:5,b:0,upgrade:0,source:'test'};
  const pieces=[entry,dd,zero];
  const base=E.bestSignal(entry.id,pieces,{initialOutput:6});
  assert.strictEqual(base.output,750,'baseline route must remain unchanged without Market signal mods');

  const echo=E.bestSignal(entry.id,pieces,{initialOutput:6,doubleEchoPieceId:dd.id});
  assert(echo.echoOutput>0,'Double Echo must produce a second Output');
  assert.strictEqual(echo.output,echo.mainOutput+echo.echoOutput,'final Output must add main and echo outputs');
  assert.strictEqual(echo.events.filter(e=>e.type==='double-echo-start').length,1,'Double Echo can start only once per Move');
  assert.strictEqual(echo.events.filter(e=>e.type==='double-echo-result').length,1);

  const memory=E.bestSignal(entry.id,pieces,{initialOutput:6,zeroMemoryPieceId:zero.id});
  assert(memory.output>base.output,'Zero Memory must increase this route by replaying the preceding ×5');
  assert.strictEqual(memory.events.filter(e=>e.type==='zero-memory').length,1,'Zero Memory can trigger only once per Move');
}

function longRunIncome(enabled){
  E.setBoardSize(30,40);
  const game=Game.createGame(E,{seed:9,STARTING_COINS:0,TARGETS:Array(15).fill(1)});
  const s=game.state();s.mods=enabled?['long-run']:[];s.pieces=[];s.placedTileIds=[];
  const tiers=[1,2,3,0,0,0,0,0,0,0];
  for(let i=0;i<10;i++){
    const tile={id:`lr-${i}`,a:1,b:1,upgrade:tiers[i],source:'test'};
    s.set.push(tile);const p=makePiece(tile,(i%4)*5,500+i);p.cubes.forEach(c=>c.y=Math.floor(i/4)*5);p.tile={...tile};s.pieces.push(p);s.placedTileIds.push(tile.id)
  }
  const played=s.pieces[9],events=s.pieces.map(p=>({type:'op',piece:p.id,op:'multiply',factor:1,before:10,after:10}));
  s.running=true;s.roundTurn=1;s.turn=1;s.score=0;s.cleared=false;s.blocked=false;s.failureReason=null;
  const result=game.finishPlacement({ok:true,tile:played.tile,p:played,trigger:2,sim:{output:10,events,reason:'test',rebounds:0,search:{starts:1,leaves:1,expanded:10}}});
  return{result,s};
}

function testLongRunPaysEveryUniqueStarOnce(){
  const normal=longRunIncome(false),long=longRunIncome(true);
  assert.strictEqual(normal.result.upgradeCoins,3,'without Long Run only the highest activated star tier pays');
  assert.strictEqual(long.result.upgradeCoins,6,'Long Run must pay ★1 + ★2 + ★3 once at 10 unique routed tiles');
  assert.strictEqual(long.result.longRun,true);
  const event=long.s.events.find(e=>e.type==='upgrade-coins');
  assert.strictEqual(event.mode,'long-run');
  assert.strictEqual(event.uniquePieces,10);
}

testConfig();
testMarketOffersThreeAndLocksAfterOnePurchase();
testDoubleEchoAndZeroMemoryEngineEffects();testLongRunPaysEveryUniqueStarOnce();
console.log('v0.23 Market modifier regression tests passed');
