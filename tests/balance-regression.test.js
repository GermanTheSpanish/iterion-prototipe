const assert=require('assert');
const E=require('../engine.js');
const Game=require('../game.js');

function testDoubleArithmetic(){
  let state={output:10};
  let op=E.applyOp(5,true,state);
  assert.strictEqual(op.factor,5);
  assert.strictEqual(state.output,50,'[5|5] traversal must be x5, not x25');

  state={output:10};
  op=E.applyOp(3,true,state);
  assert.strictEqual(op.factor,3);
  assert.strictEqual(state.output,30,'[3|3] traversal must be x3, not x9');

  state={output:10};
  op=E.applyOp(4,true,state);
  assert.strictEqual(op.add,4);
  assert.strictEqual(state.output,14,'[4|4] traversal must add 4, not 8');

  state={output:10};
  E.applyOp(6,false,state);
  assert.strictEqual(state.output,16,'non-double operations must remain unchanged');
}

function testUpgradeIncomePerMove(){
  const game=Game.createGame(E,{TARGETS:Array(15).fill(1e15)});
  const s=game.state();

  function makePiece(id,a,b,upgrade,x){
    const p=E.pieceFrom({a,b},x,0,0,0,id);
    p.tile={id:`t${id}`,a,b,upgrade,source:'test'};
    return p;
  }

  const p1=makePiece(101,1,2,1,0);
  const p2=makePiece(102,3,4,3,4);
  const p3=makePiece(103,5,6,2,8);
  const placed=makePiece(200,2,2,0,12);
  s.pieces=[p1,p2,p3,placed];
  s.hand=[{id:'h',a:1,b:1,upgrade:0,source:'test'}];
  s.reserve=[{id:'r',a:2,b:3,upgrade:0,source:'test'}];
  s.placedTileIds=['t101','t102','t103','t200'];
  s.running=true;s.blocked=false;s.cleared=false;s.failureReason=null;s.roundTurn=1;s.turn=1;

  const sim={output:100,rebounds:1,reason:'test',search:{starts:1,leaves:1,expanded:1},events:[
    {type:'op',piece:101,op:'multiply',factor:1,before:1,after:1},
    {type:'op',piece:102,op:'multiply',factor:3,before:1,after:3},
    {type:'op',piece:103,op:'multiply',factor:2,before:3,after:6},
    {type:'op',piece:102,op:'multiply',factor:3,before:6,after:18}
  ]};

  let r=game.finishPlacement({ok:true,tile:{id:'placed',a:2,b:2,upgrade:0,source:'test'},p:placed,trigger:4,sim});
  assert.strictEqual(r.upgradeCoins,3,'one Move pays only the highest activated star tier');
  assert.strictEqual(s.coins,3);
  assert.strictEqual(s.roundUpgradeCoins,3);
  assert.strictEqual(s.events.find(e=>e.type==='upgrade-coins').activations.length,3,'telemetry keeps all unique upgraded activations');

  s.running=true;s.blocked=false;s.failureReason=null;s.roundTurn=2;s.turn=2;
  r=game.finishPlacement({ok:true,tile:{id:'placed2',a:2,b:3,upgrade:0,source:'test'},p:placed,trigger:5,sim:{...sim,output:200}});
  assert.strictEqual(r.upgradeCoins,3,'a later Move can earn from the route again');
  assert.strictEqual(s.coins,6);
  assert.strictEqual(s.roundUpgradeCoins,6);
}

testDoubleArithmetic();
testUpgradeIncomePerMove();
console.log('balance regression tests passed');
