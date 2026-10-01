const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const D=require('../data.js');
const E=require('../engine.js');
const G=require('../game.js');

function piece(a,b,x,y,rr,id){
  const p=E.pieceFrom({a,b},x,y,0,rr,id);
  p.tile={id:`signal-v055-${id}`,a,b};
  return p
}
const events=(result,type)=>(result.events||[]).filter(event=>event.type===type);

assert.equal(D.VERSION,'0.56.0');
assert.equal(D.ENGINE_VERSION,'0.20.2-core-signal-additive-v1');
assert.equal(D.CORE_SIGNAL_PURCHASE_COST,8);
assert.equal(D.CORE_SIGNAL_PURCHASE_STEP,3);

E.setBoardSize(30,40);
const reboundLine=[
  piece(1,2,0,8,0,1),
  piece(2,0,4,8,0,2)
];
const additiveCore={id:'additive-core',archetype:'relay',level:1,links:[]};
const additive=E.bestSignal(1,reboundLine,{
  initialOutput:3,
  signalEnabled:true,
  signalBase:4,
  signalCoreCharge:4,
  signalCoreIdsByPiece:new Map([[2,[additiveCore.id]]]),
  signalCoreById:new Map([[additiveCore.id,additiveCore]]),
  coreLevelStep:D.CORE_SIGNAL_LEVEL_STEP,
  reservoirBonus:D.CORE_RESERVOIR_BONUS
});
const activations=events(additive,'core-activate');
assert.equal(activations.length,1,'the same Core may add Signal only once per Move even when rebound revisits it');
assert.equal(activations[0].beforeSignal,3);
assert.equal(activations[0].signalAdded,4);
assert.equal(activations[0].afterSignal,7,'Core charge must be additive');
assert.equal(events(additive,'op').filter(event=>event.piece===2).length,2,'fixture must revisit the Core-connected tile after Zero rebound');
assert.equal(additive.signalRuntime.coreSignalAdded,4);
assert.equal(additive.signalRuntime.peak,7);

E.setBoardSize(18,24);
const game=G.createGame(E,{seed:55001,GAME_MODE:'frames'});
const state=game.state();
state.coins=50;
state.cleared=true;
state.intermissionResolved=false;
state.nextShopType='market';
assert.equal(game.openIntermission(),true,'Frames Market must open');
let snapshot=game.snapshot();
assert.equal(snapshot.signal.modeBase,4);
assert.equal(snapshot.signal.base,4,'starting Signal stays fixed until bought');
assert.equal(snapshot.signal.coreCharge,5,'first passed Market raises Core charge to +5');
assert.equal(snapshot.signal.purchasedSignal,0);
assert.equal(snapshot.shop.marketSignal.available,true);
assert.equal(snapshot.shop.marketSignal.price,8,'first Signal upgrade must cost 8c before Inflation');
assert.equal(snapshot.shop.marketSignal.current,4);
assert.equal(snapshot.shop.marketSignal.next,5);

const purchase=game.buyMarketSignal();
assert.equal(purchase.ok,true);
assert.equal(purchase.cost,8);
assert.equal(purchase.beforeSignal,4);
assert.equal(purchase.afterSignal,5);
assert.equal(state.signalUpgrades,1);
assert.equal(state.inflation,1,'Signal purchase participates in global Inflation');
assert.equal(state.shopOpen,false,'Signal purchase consumes the one Market purchase');
snapshot=game.snapshot();
assert.equal(snapshot.signal.base,5,'bought Signal permanently increases Move start');
assert.equal(snapshot.signal.coreCharge,5,'bought starting Signal must not multiply every Core charge');
assert.equal(snapshot.signal.purchasedSignal,1);
assert.equal(game.marketSignalPrice(),12,'next Signal upgrade follows 8, 12, 16, 20 base progression when only Signal is bought');
assert(state.events.some(event=>event.type==='market-signal-buy'&&event.beforeSignal===4&&event.afterSignal===5));

const saved=game.exportState();
const restored=G.createGame(E,{seed:1,GAME_MODE:'classic'});
assert.equal(restored.restoreState(saved),true);
assert.equal(restored.snapshot().signal.base,5,'purchased Signal must survive save/restore');
assert.equal(restored.snapshot().signal.purchasedSignal,1);

const classic=G.createGame(E,{seed:55002,GAME_MODE:'classic'});
assert.equal(classic.snapshot().shop.marketSignal.available,false,'Classic must not sell Signal');

const root=path.join(__dirname,'..');
const ui=fs.readFileSync(path.join(root,'ui.js'),'utf8');
const late=fs.readFileSync(path.join(root,'ui-late-polish.js'),'utf8');
assert.match(ui,/data-market-signal/);
assert.match(ui,/SIGNAL \+1/);
assert.match(ui,/CORE \+\$\{x\.signal\.coreCharge\}/);
assert.match(late,/id==='signal'/);

console.log('v0.55 additive Core Signal + Market Signal upgrade regressions passed');
