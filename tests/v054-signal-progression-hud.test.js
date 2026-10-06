const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const E=require('../engine.js');
const D=require('../data.js');
const G=require('../game.js');
const H=require('../help.js');
const P=require('../presentation.js');

function piece(a,b,x,y,rr,id){
  const p=E.pieceFrom({a,b},x,y,0,rr,id);
  p.tile={id:`signal-v054-${id}`,a,b};
  return p
}
const events=(result,type)=>(result.events||[]).filter(event=>event.type===type);

assert.equal(D.VERSION,'0.70.0');
assert.equal(D.CORE_SIGNAL_MARKET_STEP,1);
assert.equal(D.CORE_SIGNAL_PURCHASE_COST,8);
assert.equal(D.CORE_SIGNAL_PURCHASE_STEP,3);
assert.deepEqual(D.CORE_SIGNAL_BY_MODE,{eyes:6,frames:4,river:3,loom:2,peaks:2,islands:2});

E.setBoardSize(30,40);
const rescueLine=[
  piece(1,2,0,8,0,1),
  piece(2,3,4,8,0,2),
  piece(3,4,8,8,0,3),
  piece(4,5,12,8,0,4)
];
const rescueCore={id:'rescue-core',archetype:'relay',level:1,links:[]};
const rescued=E.bestSignal(1,rescueLine,{
  initialOutput:2,
  signalEnabled:true,
  signalBase:1,
  signalMax:1,
  signalCoreIdsByPiece:new Map([[3,[rescueCore.id]]]),
  signalCoreById:new Map([[rescueCore.id,rescueCore]]),
  coreLevelStep:D.CORE_SIGNAL_LEVEL_STEP,
  reservoirBonus:D.CORE_RESERVOIR_BONUS
});
const rescueActivation=events(rescued,'core-activate')[0];
const rescueOp=events(rescued,'op').find(event=>event.piece===3);
assert(rescueActivation,'a first visit at 0 Signal must be allowed to reach an unactivated connected Core');
assert.equal(rescueActivation.beforeSignal,0);
assert.equal(rescueActivation.afterSignal,1);
assert(rescueOp,'the Core-connected tile must still process after emergency recharge');
assert.equal(rescueOp.signalBefore,1);
assert.equal(rescueOp.signalAfter,0);
assert((rescued.events||[]).indexOf(rescueActivation)<(rescued.events||[]).indexOf(rescueOp),'emergency Core recharge must occur before the paid tile visit');
assert.equal(events(rescued,'signal-depleted').some(event=>event.piece===3),false,'Signal must not die on the Core-connected tile it has reached');

E.setBoardSize(18,24);
const frames=G.createGame(E,{seed:54001,GAME_MODE:'frames'});
assert.equal(frames.snapshot().signal.base,4);
assert.equal(frames.snapshot().signal.max,4);
frames.state().marketCount=3;
const progressed=frames.snapshot();
assert.equal(progressed.signal.base,4,'Markets must not increase starting Signal');
assert.equal(progressed.signal.max,7,'each passed Market must add +1 to Core refill');
assert.equal(progressed.signal.marketBonus,3);
assert.equal(progressed.signal.markets,3);

const core=frames.state().cores[0];
const inspected=H.inspectCore(frames.state(),core.id,frames.coreShadowTelemetry());
assert.equal(inspected.recharge,7+(Math.max(1,Number(core.level)||1)-1)*D.CORE_SIGNAL_LEVEL_STEP,'Inspector recharge must include Market progression');

const hud=P.hudViewModel(frames.state(),progressed,{target:frames.target(),maxPlacements:frames.maxPlacements(),totalRounds:D.TOTAL_ROUNDS,boardWidth:E.G,boardHeight:E.H,longChainCap:D.ENDLESS_LONG_RUN_ACTIVATIONS});
assert.equal(hud.signal.visible,true);
assert.equal(hud.signal.start,4);
assert.equal(hud.signal.recharge,7);
assert.equal(hud.signal.marketBonus,3);

const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const ui=fs.readFileSync(path.join(root,'ui.js'),'utf8');
const runtime=fs.readFileSync(path.join(root,'ui-runtime-fixes.js'),'utf8');
const onboarding=fs.readFileSync(path.join(root,'ux-pass.js'),'utf8');
assert.match(html,/id="signalHud"/,'board HUD must expose a Signal readout');
assert.match(ui,/function setSignalHudLane/);
assert.match(ui,/function splitSignalHud/);
assert.match(ui,/function joinSignalHud/);
assert.match(ui,/e\.signalAfter/,'HUD must consume live cascade Signal telemetry');
assert.match(runtime,/\.signalHudLane\.low/);
assert.match(runtime,/#b3261e/,'low Signal must use the gameplay warning red');
assert.match(onboarding,/Each Market expands the Core network\./);

console.log('v0.54 Signal progression + board HUD regression passed');
