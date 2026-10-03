const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const D=require('../data.js'),E=require('../engine.js'),G=require('../game.js'),M=require('../mods.js'),P=require('../presentation.js'),H=require('../help.js');

E.setBoardSize(30,40);
let checks=0;
function check(name,fn){fn();checks++;console.log('Economy: '+name)}
function piece(a,b,x,y,rr,id){const p=E.pieceFrom({a,b},x,y,0,rr,id);p.tile={id:'tile-'+id,a,b,upgrade:0,powerMultiplier:1};return p}
function op(pieceId,value){return{type:'op',piece:pieceId,entryHalf:0,exitHalf:1,entrySide:'L',exitSide:'R',value,op:value===0?'zero':value%2?'multiply':'add',before:0,after:0,add:0,factor:0,powerMultiplier:1}}
function rawResult(events){return{output:9,gain:4,path:events.filter(e=>e.type==='op').map(e=>({piece:e.piece})),segments:[],events,reason:'fixture',traversals:events.filter(e=>e.type==='op').length,rebounds:0,search:{starts:1,leaves:1,expanded:1,truncated:false}}}
function replayBank(coins){
  const p=piece(2,3,2,2,0,1),base=rawResult([op(1,3)]);
  return E.replaySelectedScoring(base,5,{pieces:[p],modIdsByPiece:new Map([[1,new Set(['bank'])]]),economyCoins:coins,bankLowCoins:D.BANK_LOW_COINS,bankHighCoins:D.BANK_HIGH_COINS,bankLowMultiplier:D.BANK_LOW_MOD_MULTIPLIER,bankHighMultiplier:D.BANK_HIGH_MOD_MULTIPLIER})
}
function setPlaced(g,ids){const s=g.state();s.pieces=ids.map((id,i)=>{const t=s.set.find(t=>t.id===id),p=E.pieceFrom(t,2+(i%3)*8,8+Math.floor(i/3)*8,0,0,i+1);p.tile={...t};return p});s.placedTileIds=[...ids];return s}
function fakeMarket(g,id){const s=g.state();s.shopOpen=true;s.shopType='market';s.shopOffers=[id];s.marketBuys=[];s.cleared=true;s.intermissionResolved=false;s.nextShopType='market';return s}

check('current Economy roster removes SPEND and TOLL',()=>{
  assert.deepEqual(['mint','bank','broker','foundation','long-run'].map(id=>M.get(id)?.category),Array(5).fill('economy'));
  assert.deepEqual(['broker','bank'].map(id=>M.get(id)?.collectionCode),['BO','BK']);
  for(const id of ['spend','toll','frame','frontier','resonator','forge'])assert.equal(M.get(id),null);
});

check('BANK snapshots the wallet at 10c and 20c thresholds',()=>{
  let r=replayBank(9);assert.equal(r.output,15);assert.equal(r.events[0].bankMultiplier,1);
  r=replayBank(10);assert.equal(r.output,30);assert.equal(r.events[0].bankMultiplier,2);
  r=replayBank(20);assert.equal(r.output,45);assert.equal(r.events[0].bankMultiplier,3);
});

check('BROKER activation primes one Market; skipping banks 2c up to 6c',()=>{
  const g=G.createGame(E,{seed:4702,STARTING_COINS:100,TARGETS:Array(15).fill(1e9)}),s=setPlaced(g,['d1-4','d2-3']);
  s.brokerTileId='d1-4';const broker=s.pieces[0],placed=s.pieces[1],tile=s.set.find(t=>t.id==='d2-3'),sim=rawResult([op(broker.id,4)]);
  let r=g.finishPlacement({ok:true,tile,p:placed,trigger:5,sim});assert(r.ok);assert.equal(r.brokerReady,true);assert.equal(s.brokerPreparedMarket,true);
  s.shopOpen=true;s.shopType='market';s.marketBuys=[];g.closeMarket();assert.equal(s.brokerDiscountStored,2);assert.equal(s.brokerPreparedMarket,false);
  for(let i=0;i<3;i++){s.brokerPreparedMarket=true;s.shopOpen=true;s.shopType='market';s.marketBuys=[];g.closeMarket()}
  assert.equal(s.brokerDiscountStored,6,'stored discount caps at 6c');
});

check('BROKER discounts only the next Mod purchase and never Signal',()=>{
  const g=G.createGame(E,{seed:4701,STARTING_COINS:100}),s=setPlaced(g,['d1-4','d5-6']);s.brokerTileId='d1-4';s.brokerDiscountStored=6;
  s.gameMode='eyes';s.inflation=2;assert.equal(g.marketSignalPrice(),(D.CORE_SIGNAL_PURCHASE_COST||8)+2);assert.equal(s.brokerDiscountStored,6);
  s.inflation=0;fakeMarket(g,'mint');assert.equal(g.marketModPrice('mint'),2);const buy=g.buyMarketMod('mint');assert(buy.ok&&buy.pending);assert.equal(buy.cost,2);assert.equal(s.brokerDiscountStored,0);
  const discount=s.events.find(e=>e.type==='broker-discount');assert.equal(discount.amount,6);assert.equal(discount.mod,'mint');
});

check('FOUNDATION pays +1c, +2c, +3c, then +3c each later Market',()=>{
  const g=G.createGame(E,{seed:4703,STARTING_COINS:100}),s=setPlaced(g,['d0-2','d3-4']);s.foundationTileId='d0-2';s.foundationAssignedMarket=0;s.foundationLastPayoutMarket=0;s.marketCount=0;
  const payouts=[];
  for(let i=0;i<4;i++){s.cleared=true;s.intermissionResolved=false;s.nextShopType='market';s.shopOpen=false;s.coins=100;const before=s.coins;assert.equal(g.openIntermission(),true);payouts.push(s.coins-before);g.closeMarket();s.intermissionResolved=false;s.nextShopType='market'}
  assert.deepEqual(payouts,[1,2,3,3]);assert.equal(g.snapshot().tileModState.foundationTier,3);
});

check('current Economy state survives save/restore',()=>{
  const g=G.createGame(E,{seed:4704}),s=setPlaced(g,['d1-4','d4-6','d0-2','d5-6']);
  s.brokerTileId='d1-4';s.bankTileId='d4-6';s.foundationTileId='d0-2';s.mintTileId='d5-6';s.foundationAssignedMarket=2;s.foundationLastPayoutMarket=3;s.marketCount=4;s.brokerDiscountStored=4;
  const restored=G.createGame(E,{seed:1});assert(restored.restoreState(g.exportState()));const rs=restored.state(),snap=restored.snapshot();
  assert.equal(rs.brokerDiscountStored,4);assert.equal(rs.foundationLastPayoutMarket,3);
  assert.deepEqual(snap.tileMods.broker,['d1-4']);assert.deepEqual(snap.tileMods.bank,['d4-6']);assert.deepEqual(snap.tileMods.foundation,['d0-2']);assert.deepEqual(snap.tileMods.mint,['d5-6']);
  assert.deepEqual(P.tileViewModel(rs.set.find(t=>t.id==='d4-6'),rs).modifiers.map(m=>m.label),['BK']);
  assert.equal(H.inspectTile(rs,'d0-2').currentMachineState.foundationAge,2);
});

check('legacy Economy state keeps Broker/Bank IDs and strips retired SPEND/TOLL',()=>{
  const g=G.createGame(E,{seed:4705}),saved=g.exportState();
  delete saved.state.brokerTileId;delete saved.state.bankTileId;saved.state.frameTileId='d1-4';saved.state.frontierTileId='d3-5';saved.state.resonatorTileId='d4-6';saved.state.forgeTileId='d5-5';
  saved.state.pendingModPlacement={mod:'forge',stage:'target',eligibleTileIds:['d5-5'],sourceTileId:null,previousTileId:null,recordIndex:0};
  const restored=G.createGame(E,{seed:1});assert(restored.restoreState(saved));const rs=restored.state();
  assert.equal(rs.brokerTileId,'d1-4');assert.equal(rs.bankTileId,'d4-6');assert.equal(rs.pendingModPlacement,null);
  for(const field of ['frameTileId','frontierTileId','resonatorTileId','forgeTileId','spendTileId','tollTileId','tollArmed'])assert.equal(field in rs,false);
});

check('MINT and LONG CHAIN remain while the protected comparator is unchanged',()=>{
  assert.equal(M.get('mint').collectionCode,'MT');assert.equal(M.get('long-run').collectionCode,'LC');
  const source=fs.readFileSync(path.join(__dirname,'..','engine.js'),'utf8');
  const traversalsIndex=source.indexOf('const at=a.traversals||0,bt=b.traversals||0'),outputIndex=source.indexOf('const scoreCmp=SCORE.compare('),tailIndex=source.indexOf("const av=[a.rebounds||0,(a.path||[]).length]");
  assert(traversalsIndex>=0&&outputIndex>traversalsIndex&&tailIndex>outputIndex,'route comparator remains protected');
});
console.log(checks+' current Economy regressions passed');
