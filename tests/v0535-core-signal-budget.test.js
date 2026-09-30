const assert=require('node:assert/strict');
const D=require('../data.js');
const E=require('../engine.js');
const G=require('../game.js');
const H=require('../help.js');

E.setBoardSize(18,24);

assert.deepEqual({...D.CORE_SIGNAL_BY_MODE},{eyes:10,frames:8},'Core modes must expose explicit Signal budgets');

function primePreview(game){
  const s=game.state(),root=s.set.find(tile=>tile.id==='d2-2'),next=s.set.find(tile=>tile.id==='d2-3');
  assert(root&&next,'Signal budget fixture requires d2-2 and d2-3');
  const piece=E.pieceFrom(root,2,10,0,0,1);piece.tile={...root};
  s.pieces=[piece];s.placedTileIds=[root.id];s.turn=1;s.roundTurn=1;s.idc=1;
  s.hand=[next,null,null,null,null];
  s.reserve=(s.reserve||[]).filter(tile=>tile.id!==root.id&&tile.id!==next.id);
  const candidate=game.candidatesForIndex(0)[0];
  assert(candidate,'Signal budget fixture must expose a legal second placement');
  const preview=game.previewPlacement(0,candidate);
  assert.equal(preview.ok,true);
  return preview
}

for(const [mode,budget,seed] of [['eyes',10,5351],['frames',8,5352]]){
  const game=G.createGame(E,{seed,GAME_MODE:mode,TARGETS:Array(15).fill(Number.MAX_SAFE_INTEGER)});
  const snapshot=game.snapshot();
  assert.equal(snapshot.signal.enabled,true,mode+' must keep runtime Signal enabled');
  assert.equal(snapshot.signal.base,budget,mode+' must expose the correct opening Signal');
  assert.equal(snapshot.signal.max,budget,mode+' Core recharge must use the same mode budget');

  const preview=primePreview(game),start=preview.sim.events.find(event=>event.type==='start');
  assert(start,mode+' preview must include a Signal start event');
  assert.equal(start.signalRemaining,budget,mode+' routing must actually start from the configured budget');

  const shadow=game.signalShadowTelemetry(preview.sim);
  assert.equal(shadow.baseSignal,budget);
  assert.equal(shadow.maxSignal,budget);

  const core=game.state().cores[0];
  const inspected=H.inspectCore(game.state(),core.id,game.coreShadowTelemetry());
  const expectedRecharge=budget+(Math.max(1,Number(core.level)||1)-1)*D.CORE_SIGNAL_LEVEL_STEP;
  assert.equal(inspected.recharge,expectedRecharge,mode+' Core Inspector must report the real mode recharge');
  if(core.archetype==='reservoir')assert.equal(inspected.leadRecharge,expectedRecharge+D.CORE_RESERVOIR_BONUS);
}

const classic=G.createGame(E,{seed:5353,GAME_MODE:'classic'});
assert.equal(classic.snapshot().signal.enabled,false,'Classic remains outside the Core Signal system');

console.log('mode-specific Core Signal budget regressions passed');
