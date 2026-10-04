const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const D=require('../data.js'),E=require('../engine.js'),G=require('../game.js'),M=require('../mods.js');
E.setBoardSize(30,40);
let checks=0;function check(name,fn){fn();checks++;console.log('v0.65 Mods: '+name)}
function piece(a,b,x,y,rr,id,tileId){const p=E.pieceFrom({a,b},x,y,0,rr,id);p.tile={id:tileId||'tile-'+id,a,b,upgrade:0,powerMultiplier:1};return p}
function setPlaced(g,ids){const s=g.state();s.pieces=ids.map((id,i)=>{const t=s.set.find(t=>t.id===id),p=E.pieceFrom(t,2+i*8,8,0,0,i+1);p.tile={...t};return p});s.placedTileIds=[...ids];return s}
function fakeMarket(g,id){const s=g.state();s.shopOpen=true;s.shopType='market';s.shopOffers=[id];s.marketBuys=[];s.cleared=true;s.intermissionResolved=false;s.nextShopType='market';s.coins=100;return s}

check('final Market roster is exactly 19',()=>{
  const ids=M.all().filter(m=>m.market).map(m=>m.id).sort();assert.equal(ids.length,19);assert.equal(D.VERSION,'0.68.0');
  for(const id of ['diode','terminal','toll','scrap','spend','merge','return','swap','mirror'])assert.equal(M.get(id),null);
});
check('PAIR gives both physical dominoes x2',()=>{
  const a=piece(2,3,4,4,0,1,'a'),b=piece(2,3,4,6,0,2,'b'),raw={output:0,gain:0,path:[],segments:[],reason:'fixture',traversals:2,rebounds:0,events:[{type:'op',piece:1,value:2,op:'add',before:0,after:0,powerMultiplier:1},{type:'op',piece:2,value:3,op:'multiply',before:0,after:0,powerMultiplier:1}]};
  const r=E.replaySelectedScoring(raw,1,{pieces:[a,b],modIdsByPiece:new Map([[1,new Set(['pair'])]]),pairMultiplier:2}),ops=r.events.filter(e=>e.type==='op');
  assert(ops.every(e=>e.pair&&e.modMultiplier===2));assert.equal(r.output,30);
});
check('BRIDGE gives x2 and adds +2 Signal once per Move',()=>{
  const a=piece(1,2,2,4,0,1,'a'),b=piece(2,3,6,4,0,2,'b'),c=piece(3,4,10,4,0,3,'c');
  const r=E.bestSignal(1,[a,b,c],{initialOutput:1,signalEnabled:true,signalBase:2,signalMax:2,bridgePieceId:2,bridgeSignalBonus:2,modIdsByPiece:new Map([[2,new Set(['bridge'])]]),bridgeMultiplier:2});
  assert.equal(r.events.filter(e=>e.type==='bridge-signal').length,1);assert.equal(r.signalRuntime.bridgeSignalAdded,2);
  const bridgeOp=r.events.find(e=>e.type==='op'&&e.piece===2);assert(bridgeOp);assert.equal(bridgeOp.bridge,true);assert.equal(bridgeOp.modMultiplier,2);
});
check('PIVOT exposes 180 degree FLIP in the same once-per-Round tool',()=>{
  const g=G.createGame(E,{seed:6501}),s=g.state(),a=s.set.find(t=>t.id==='d2-2'),b=s.set.find(t=>t.id==='d2-3');
  s.pieces=[piece(a.a,a.b,6,4,1,1,a.id),piece(b.a,b.b,6,8,0,2,b.id)];s.placedTileIds=[a.id,b.id];s.pivotTileId=b.id;
  assert(g.mutationOptions(b.id).options.some(o=>o.turn==='FLIP'));
});
check('RECALL is once per Stage and grants +1 Move while preserving the tile',()=>{
  const g=G.createGame(E,{seed:6502}),s=g.state(),a=s.set.find(t=>t.id==='d2-2'),b=s.set.find(t=>t.id==='d2-3');
  b.upgrade=2;b.powerMultiplier=2;s.pieces=[piece(a.a,a.b,6,4,1,1,a.id),piece(b.a,b.b,6,8,0,2,b.id)];s.pieces[1].tile={...b};s.placedTileIds=[a.id,b.id];s.recallTileId=b.id;s.circuitRanks[b.id]=3;s.hand=[null,null,null,null,null];s.extraPlacements=0;
  const r=g.applyMutation(b.id,'recall');assert(r.ok);assert.equal(r.moveBonus,1);assert.equal(s.extraPlacements,1);assert.equal(s.hand[0].id,b.id);assert.equal(s.hand[0].upgrade,2);assert.equal(s.circuitRanks[b.id],3);assert.equal(g.mutationOptions(b.id).reason,'used');
});
check('FOUNDATION payout ramps 1/2/3 and stays at 3',()=>{
  const g=G.createGame(E,{seed:6503}),s=setPlaced(g,['d0-2','d3-4']);s.foundationTileId='d0-2';s.foundationAssignedMarket=0;s.foundationLastPayoutMarket=0;s.marketCount=0;
  const payouts=[];for(let i=0;i<4;i++){s.cleared=true;s.intermissionResolved=false;s.nextShopType='market';s.shopOpen=false;s.coins=100;const before=s.coins;g.openIntermission();payouts.push(s.coins-before);g.closeMarket();s.intermissionResolved=false;s.nextShopType='market'}assert.deepEqual(payouts,[1,2,3,3]);
});
check('BROKER banks skipped Markets, caps at 6c, ignores Signal and is spent by the next Mod',()=>{
  const g=G.createGame(E,{seed:6504,STARTING_COINS:100}),s=setPlaced(g,['d1-4','d5-6']);s.brokerTileId='d1-4';
  for(let i=0;i<4;i++){s.brokerPreparedMarket=true;s.shopOpen=true;s.shopType='market';s.marketBuys=[];g.closeMarket()}assert.equal(s.brokerDiscountStored,6);
  s.gameMode='eyes';s.inflation=2;assert.equal(g.marketSignalPrice(),(D.CORE_SIGNAL_PURCHASE_COST||8)+2);assert.equal(s.brokerDiscountStored,6);
  s.inflation=0;fakeMarket(g,'mint');assert.equal(g.marketModPrice('mint'),2);const buy=g.buyMarketMod('mint');assert(buy.ok);assert.equal(s.brokerDiscountStored,0);
});
check('legacy saves preserve useful identities and prune retired Mod state',()=>{
  const g=G.createGame(E,{seed:6505}),saved=g.exportState();delete saved.state.pivotTileId;saved.state.mirrorTileId='d2-6';saved.state.diodeTileId='d2-4';saved.state.tollTileId='d5-5';saved.state.shopOffers=['diode','mint','toll'];saved.state.pendingModPlacement={mod:'return',stage:'target',eligibleTileIds:['d2-5'],sourceTileId:null,previousTileId:null,recordIndex:0};
  const restored=G.createGame(E,{seed:1});assert(restored.restoreState(saved));const rs=restored.state();assert.equal(rs.pivotTileId,'d2-6');for(const f of ['mirrorTileId','diodeTileId','tollTileId'])assert.equal(f in rs,false);assert.equal(rs.pendingModPlacement,null);assert.deepEqual(rs.shopOffers,['mint']);
});
check('MOD PERFORMANCE survives in snapshot and debug export',()=>{
  const g=G.createGame(E,{seed:6506}),s=g.state();
  s.events.push({type:'shop-open',shop:'market',offers:['mint','bank'],round:3},{type:'market-mod-buy',mod:'mint',pending:true},{type:'market-mod-assign',mod:'mint'},{type:'mod-alive',round:4,mods:['mint']},{type:'mint-coins',amount:1},{type:'test-mod-performance',modPerformance:{mint:{activations:2,effectiveActivations:1,scoreContributionExact:'0'}}});
  const p=g.snapshot().modPerformance.mint;assert.equal(p.offered,1);assert.equal(p.purchased,1);assert.equal(p.assigned,1);assert.equal(p.roundsAlive,1);assert.equal(p.activations,2);assert.equal(p.effectiveActivations,1);assert.equal(p.coinsGeneratedOrSaved,1);assert.match(g.debugText(),/MOD PERFORMANCE/);assert.match(g.debugText(),/mint offered=1 bought=1/);
});
check('protected route comparator remains unchanged',()=>{
  const source=fs.readFileSync(path.join(__dirname,'..','engine.js'),'utf8'),a=source.indexOf('const at=a.traversals||0,bt=b.traversals||0'),b=source.indexOf('const scoreCmp=SCORE.compare('),c=source.indexOf("const av=[a.rebounds||0,(a.path||[]).length]");assert(a>=0&&b>a&&c>b);
});
console.log(checks+' v0.65 Mod roster regressions passed');
