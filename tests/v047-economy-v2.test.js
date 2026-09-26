const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const D=require('../data.js'),E=require('../engine.js'),G=require('../game.js'),M=require('../mods.js'),P=require('../presentation.js'),H=require('../help.js');

E.setBoardSize(30,40);
let checks=0;
function check(name,fn){fn();checks++;console.log(`Economy v2: ${name}`)}
function piece(a,b,x,y,rr,id){const p=E.pieceFrom({a,b},x,y,0,rr,id);p.tile={id:`tile-${id}`,a,b,upgrade:0,powerMultiplier:1};return p}
function op(pieceId,value){return{type:'op',piece:pieceId,entryHalf:0,exitHalf:1,entrySide:'L',exitSide:'R',value,op:value===0?'zero':value%2?'multiply':'add',before:0,after:0,add:0,factor:0,powerMultiplier:1}}
function rawResult(events){return{output:0,gain:0,path:events.filter(e=>e.type==='op').map(e=>({piece:e.piece})),segments:[],events,reason:'fixture',traversals:events.filter(e=>e.type==='op').length,rebounds:0}}
function replayEconomy(modId,coins,{value=3,initial=5,tollArmed=false}={}){
  const p=piece(2,3,2,2,0,1),base=rawResult([op(1,value)]);
  return E.replaySelectedScoring(base,initial,{pieces:[p],modIdsByPiece:new Map([[1,new Set([modId])]]),economyCoins:coins,bankLowCoins:D.BANK_LOW_COINS,bankHighCoins:D.BANK_HIGH_COINS,bankLowMultiplier:D.BANK_LOW_MOD_MULTIPLIER,bankHighMultiplier:D.BANK_HIGH_MOD_MULTIPLIER,spendCoinThreshold:D.SPEND_COIN_THRESHOLD,spendMultiplier:D.SPEND_MOD_MULTIPLIER,tollArmed,tollCoins:D.TOLL_COINS})
}
function setPlaced(g,ids){const s=g.state();s.pieces=ids.map((id,i)=>{const t=s.set.find(t=>t.id===id),p=E.pieceFrom(t,2+(i%3)*8,8+Math.floor(i/3)*8,0,0,i+1);p.tile={...t};return p});s.placedTileIds=[...ids];return s}
function fakeMarket(g,id){const s=g.state();s.shopOpen=true;s.shopType='market';s.shopOffers=[id];s.marketBuys=[];s.cleared=true;s.intermissionResolved=false;s.nextShopType='market';return s}

check('roster replaces four legacy state/shape multipliers without expanding the 28-Mod archive',()=>{
  assert.deepEqual(['mint','toll','bank','broker','foundation','spend','long-run'].map(id=>M.get(id)?.category),Array(7).fill('economy'));
  assert.deepEqual(['broker','spend','bank','toll'].map(id=>M.get(id)?.collectionCode),['BO','SP','BK','TL']);
  for(const id of ['frame','frontier','resonator','forge'])assert.equal(M.get(id),null);
  assert.equal(M.collection().filter(slot=>slot.mod).length,28);
});

check('BANK snapshots the wallet at 10c and 20c thresholds',()=>{
  let r=replayEconomy('bank',9);assert.equal(r.output,15);assert.equal(r.events[0].bankMultiplier,1);
  r=replayEconomy('bank',10);assert.equal(r.output,30);assert.equal(r.events[0].bankMultiplier,2);
  r=replayEconomy('bank',20);assert.equal(r.output,45);assert.equal(r.events[0].bankMultiplier,3);
});

check('SPEND is active only below 5c at Move start',()=>{
  let r=replayEconomy('spend',4);assert.equal(r.output,45);assert.equal(r.events[0].spend,true);assert.equal(r.events[0].modMultiplier,3);
  r=replayEconomy('spend',5);assert.equal(r.output,15);assert.equal(r.events[0].spend,false);assert.equal(r.events[0].modMultiplier,1);
});

check('TOLL is explicit, costs one coin event, and repeats the actual operation once',()=>{
  let r=replayEconomy('toll',4,{tollArmed:false});assert.equal(r.output,15);assert.equal(r.events.some(e=>e.type==='toll-spend'),false);
  r=replayEconomy('toll',4,{tollArmed:true});const ops=r.events.filter(e=>e.type==='op');
  assert.equal(r.output,45);assert.equal(ops.length,2);assert.equal(ops[1].tollRepeat,true);assert.equal(r.events.filter(e=>e.type==='toll-spend').length,1);assert.equal(r.events.find(e=>e.type==='toll-spend').amount,1);
  r=replayEconomy('toll',0,{tollArmed:true});assert.equal(r.output,15);assert.equal(r.events.some(e=>e.type==='toll-spend'),false);
});

check('TOLL pays at most once even when the physical tile operates twice',()=>{
  const p=piece(2,3,2,2,0,1),base=rawResult([op(1,3),op(1,3)]);
  const r=E.replaySelectedScoring(base,5,{pieces:[p],modIdsByPiece:new Map([[1,new Set(['toll'])]]),economyCoins:4,tollArmed:true,tollCoins:1});
  assert.equal(r.output,135);assert.equal(r.events.filter(e=>e.tollRepeat).length,1);assert.equal(r.events.filter(e=>e.type==='toll-spend').length,1);
});

check('BROKER discounts exactly the next Market Mod purchase and then clears',()=>{
  const g=G.createGame(E,{seed:4701,STARTING_COINS:100}),s=setPlaced(g,['d1-4','d5-6']);s.brokerTileId='d1-4';s.brokerDiscountReady=true;
  fakeMarket(g,'mint');assert.equal(g.marketModPrice('mint'),7);const buy=g.buyMarketMod('mint');assert(buy.ok&&buy.pending);assert.equal(buy.cost,7);assert.equal(s.coins,93);assert.equal(s.inflation,1);assert.equal(s.brokerDiscountReady,false);
  assert(g.chooseMarketModTile('d5-6').ok);assert.equal(g.marketModPrice('mint'),9,'later Market pricing uses Inflation without a spent Broker discount');
  const discount=s.events.find(e=>e.type==='broker-discount');assert.equal(discount.amount,1);assert.equal(discount.mod,'mint');
});

check('BROKER activation prepares but never stacks the persistent discount',()=>{
  const g=G.createGame(E,{seed:4702,STARTING_COINS:5,TARGETS:Array(15).fill(1e9)}),s=setPlaced(g,['d1-4','d2-3']);
  s.brokerTileId='d1-4';const broker=s.pieces[0],placed=s.pieces[1],tile=s.set.find(t=>t.id==='d2-3');
  const sim=rawResult([op(broker.id,4)]);sim.output=9;sim.search={starts:1,leaves:1,expanded:1,truncated:false};
  let r=g.finishPlacement({ok:true,tile,p:placed,trigger:5,sim});assert(r.ok);assert.equal(r.brokerReady,true);assert.equal(s.brokerDiscountReady,true);
  r=g.finishPlacement({ok:true,tile,p:placed,trigger:5,sim});assert(r.ok);assert.equal(r.brokerReady,false);assert.equal(s.events.filter(e=>e.type==='broker-ready').length,1);
});

check('FOUNDATION pays +3c every third later Market and restarts its cycle',()=>{
  const g=G.createGame(E,{seed:4703,STARTING_COINS:100}),s=setPlaced(g,['d0-2','d3-4']);s.foundationTileId='d0-2';s.foundationAssignedMarket=0;s.foundationLastPayoutMarket=0;s.marketCount=2;
  s.cleared=true;s.intermissionResolved=false;s.nextShopType='market';s.shopOpen=false;s.coins=100;
  assert.equal(g.openIntermission(),true);assert.equal(s.marketCount,3);assert.equal(s.coins,103);assert.equal(s.foundationLastPayoutMarket,3);
  const event=s.events.find(e=>e.type==='foundation-coins');assert.equal(event.amount,3);assert.equal(event.cycles,1);
  assert.equal(g.snapshot().tileModState.foundationProgress,0);
});

check('TOLL arming and all Economy v2 state survive save/restore',()=>{
  const g=G.createGame(E,{seed:4704}),s=setPlaced(g,['d1-4','d3-5','d4-6','d5-5','d0-2','d5-6']);
  s.brokerTileId='d1-4';s.spendTileId='d3-5';s.bankTileId='d4-6';s.tollTileId='d5-5';s.foundationTileId='d0-2';s.mintTileId='d5-6';s.foundationAssignedMarket=2;s.foundationLastPayoutMarket=3;s.marketCount=4;s.brokerDiscountReady=true;
  assert(g.setTollArmed(true).ok);
  const restored=G.createGame(E,{seed:1});assert(restored.restoreState(g.exportState()));const rs=restored.state(),snap=restored.snapshot();
  assert.equal(rs.tollArmed,true);assert.equal(rs.brokerDiscountReady,true);assert.equal(rs.foundationLastPayoutMarket,3);
  assert.deepEqual(snap.tileMods.broker,['d1-4']);assert.deepEqual(snap.tileMods.spend,['d3-5']);assert.deepEqual(snap.tileMods.bank,['d4-6']);assert.deepEqual(snap.tileMods.toll,['d5-5']);
  assert.deepEqual(P.tileViewModel(rs.set.find(t=>t.id==='d5-5'),rs).modifiers.map(m=>m.label),['TL']);
  assert.equal(H.inspectTile(rs,'d0-2').currentMachineState.foundationProgress,1);
  assert.match(restored.debugText(),/BO=d1-4/);assert.match(restored.debugText(),/SP=d3-5/);assert.match(restored.debugText(),/BK=d4-6/);assert.match(restored.debugText(),/TL=d5-5/);
});

check('legacy Economy assignments migrate onto the same physical tile IDs with TOLL safely disarmed',()=>{
  const g=G.createGame(E,{seed:4705}),s=setPlaced(g,['d1-4','d3-5','d4-6','d5-5']);
  const saved=g.exportState();delete saved.state.brokerTileId;delete saved.state.spendTileId;delete saved.state.bankTileId;delete saved.state.tollTileId;delete saved.state.tollArmed;
  saved.state.frameTileId='d1-4';saved.state.frontierTileId='d3-5';saved.state.resonatorTileId='d4-6';saved.state.forgeTileId='d5-5';saved.state.pendingModPlacement={mod:'forge',stage:'target',eligibleTileIds:['d5-5'],sourceTileId:null,previousTileId:null,recordIndex:0};
  const restored=G.createGame(E,{seed:1});assert(restored.restoreState(saved));const rs=restored.state();
  assert.equal(rs.brokerTileId,'d1-4');assert.equal(rs.spendTileId,'d3-5');assert.equal(rs.bankTileId,'d4-6');assert.equal(rs.tollTileId,'d5-5');assert.equal(rs.tollArmed,false);assert.equal(rs.pendingModPlacement.mod,'toll');
  for(const field of ['frameTileId','frontierTileId','resonatorTileId','forgeTileId'])assert.equal(field in rs,false);
});

check('MINT and LONG CHAIN semantics remain present while protected route comparator is unchanged',()=>{
  assert.equal(M.get('mint').collectionCode,'MT');assert.equal(M.get('long-run').collectionCode,'LC');
  const source=fs.readFileSync(path.join(__dirname,'..','engine.js'),'utf8');
  assert.match(source,/const av=\[a\.traversals\|\|0,a\.output\|\|0,a\.rebounds\|\|0,\(a\.path\|\|\[\]\)\.length\]/);
});

console.log(`${checks} MONOID Economy v2 regressions passed`);
