const assert=require('assert');
const D=require('../data.js');
const E=require('../engine.js');
const Game=require('../game.js');

function piece(tile,x,y,id){const p=E.pieceFrom(tile,x,y,0,0,id);p.tile={...tile};return p}
function fakeWin(round){return{round,target:D.TARGETS[Math.min(round-1,D.TARGETS.length-1)],output:1,placements:1,machineSize:2,setSize:28,reward:0,upgradeCoins:0,anchor:{a:6,b:6},upgradeTier:0}}

assert.strictEqual(D.ENDLESS_TARGET_MULTIPLIER,5);
assert.deepStrictEqual(D.BOARD_SIZES,[[18,24],[21,28],[24,32],[27,36],[30,40]],'Endless must not change canonical board dimensions');
E.setBoardSize(18,24);
const game=Game.createGame(E,{seed:2401}),s=game.state(),double=s.set.find(t=>t.id==='d6-6'),zero=s.set.find(t=>t.id==='d0-4');
assert.strictEqual(game.targetForRound(14),50000000000);
assert.strictEqual(game.targetForRound(15),250000000000);
assert.strictEqual(game.targetForRound(16),1250000000000);
assert.strictEqual(game.targetForRound(19),156250000000000);
assert.strictEqual(game.canStartEndless(),false,'Endless cannot start before the base run is complete');

const pd=piece(double,2,2,101),pz=piece(zero,8,2,102);s.pieces=[pd,pz];s.placedTileIds=[double.id,zero.id];s.reserve=s.set.filter(t=>!s.placedTileIds.includes(t.id));s.hand=[null,null,null,null,null];s.round=14;s.roundTurn=1;s.turn=23;s.coins=41;s.inflation=7;s.mods=['long-run'];s.doubleDoubleTileId=double.id;s.doubleEchoTileId=double.id;s.zeroMemoryTileId=zero.id;s.wins=Array.from({length:14},(_,i)=>fakeWin(i+1));
const clear=game.finishPlacement({ok:true,tile:double,p:pd,trigger:12,sim:{output:50000000000,events:[],reason:'test',rebounds:0,search:{starts:0,leaves:1,expanded:0}}});
assert.strictEqual(clear.cleared,true);
assert.strictEqual(s.standardComplete,true,'clearing R15 records the base victory');
assert.strictEqual(game.snapshot().status,'COMPLETE');
assert.strictEqual(game.snapshot().endless.available,true);
assert.strictEqual(s.nextShopType,'none','R15 completion does not insert an extra Market before Endless');
const preserved={coins:s.coins,inflation:s.inflation,setSize:s.set.length,mods:[...s.mods],dd:s.doubleDoubleTileId,de:s.doubleEchoTileId,zm:s.zeroMemoryTileId,ids:[...s.placedTileIds]};

assert.strictEqual(game.startEndless(),true);
assert.strictEqual(s.endlessMode,true);
assert.strictEqual(s.round,15,'Endless starts on R16');
assert.strictEqual(game.target(),250000000000);
assert.strictEqual(game.snapshot().status,'ENDLESS');
assert.strictEqual(game.snapshot().endless.baseComplete,true,'base victory remains recorded');
assert.strictEqual(game.snapshot().endless.roundsCleared,0);
assert.strictEqual(s.coins,preserved.coins);assert.strictEqual(s.inflation,preserved.inflation);assert.strictEqual(s.set.length,preserved.setSize);assert.deepStrictEqual(s.mods,preserved.mods);assert.strictEqual(s.doubleDoubleTileId,preserved.dd);assert.strictEqual(s.doubleEchoTileId,preserved.de);assert.strictEqual(s.zeroMemoryTileId,preserved.zm);assert.deepStrictEqual(s.placedTileIds,preserved.ids);
assert.strictEqual(new Set(s.placedTileIds).size,s.placedTileIds.length,'physical tile IDs remain unique in the machine');
assert.deepStrictEqual(E.getBoardSize(),{G:30,H:40},'Endless keeps the maximum canonical board size');
assert.strictEqual(game.startEndless(),false,'Endless can only be entered once');

s.round=17;s.roundTurn=1;s.score=0;s.cleared=false;s.blocked=false;s.failureReason=null;s.intermissionResolved=true;s.nextShopType='none';
const r18=game.finishPlacement({ok:true,tile:double,p:s.pieces.find(p=>p.tile.id===double.id),trigger:12,sim:{output:game.target(),events:[],reason:'test',rebounds:0,search:{starts:0,leaves:1,expanded:0}}});
assert.strictEqual(r18.cleared,true);assert.strictEqual(s.nextShopType,'market','Markets continue every three rounds in Endless');assert.strictEqual(s.intermissionResolved,false);assert.strictEqual(game.openIntermission(),true);assert.strictEqual(game.closeMarket(),true);
s.cleared=false;s.blocked=true;s.failureReason='no-legal-moves';
const failed=game.snapshot();assert.strictEqual(failed.status,'ENDLESS FAILED');assert.strictEqual(failed.endless.baseComplete,true);assert(game.debugText().includes('Round: 18/∞'));assert.match(game.debugText(),/Endless: active · baseComplete=yes/);assert(game.debugText().includes('ENDLESS START R16 target=250000000000'));
console.log('v0.24 Endless gameplay regression tests passed');
