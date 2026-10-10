const assert=require('node:assert/strict');
const E=require('../engine.js');
const G=require('../game.js');
const SCORE=require('../score.js');

function ready(seed=7550){
  E.setBoardSize(18,24);
  const game=G.createGame(E,{seed,TARGETS:Array(15).fill(100),ENDLESS_TARGET_MULTIPLIER:5,FIRST_TILE_MUST_BE_DOUBLE:false});
  const s=game.state(),tile=s.set.find(t=>t.id==='d2-2');
  const piece=E.pieceFrom(tile,6,8,0,0,1);piece.tile={...tile};
  s.pieces=[piece];s.placedTileIds=[tile.id];s.idc=1;s.turn=1;s.round=15;s.roundTurn=1;
  s.ouroborosMode=true;s.ouroborosStartedRound=16;s.ouroborosBoardSize=[18,24];
  s.endlessMode=true;s.standardComplete=true;s.cleared=false;s.running=true;s.blocked=false;
  s.pendingCircuit=null;s.pendingModPlacement=null;s.shopOpen=false;s.shopType=null;
  s.coins=100000;s.inflation=0;s.marketCount=5;s.circuitRanks={};s.circuitSignatures=[];
  return{game,s,tile,piece}
}
function fireResult(game,s,tile,piece,outputExact){
  const output=Number(outputExact);
  return game.finishPlacement({ok:true,ouroboros:true,tile,p:piece,trigger:2,
    sim:{output,outputExact,events:[],segments:[],reason:'test',rebounds:0}});
}
{
  const{game,s,tile,piece}=ready(7551),initialCoins=s.coins;
  const result=fireResult(game,s,tile,piece,'10000000000');
  assert.equal(result.ok,true);assert.equal(result.cleared,true);
  const overflow=s.ouroborosOverflow;assert(overflow);
  const covered=[];for(let r=15;SCORE.compare('10000000000',game.targetExactForRound(r))>=0;r++)covered.push(r);
  assert.equal(overflow.fromRound,15);assert.equal(overflow.throughRound,covered.at(-1));
  assert.equal(overflow.nextRound,covered.at(-1)+1);
  assert.deepEqual(overflow.markets,covered.filter(index=>(index+1)%3===0));
  assert(overflow.markets.length>=3);
  assert.deepEqual(s.wins.filter(w=>w.overflowSkipped).map(w=>w.round),covered.slice(1).map(i=>i+1));
  assert.equal(s.wins.filter(w=>w.reward>0).length,1,'Only FIRE pays a clear reward');
  assert.equal(s.events.filter(e=>e.type==='ouroboros-fire').length,0,'Synthetic test does not fabricate FIRE');
  assert.equal(s.events.filter(e=>e.type==='ouroboros-overflow').length,1,'One overflow telemetry event');
  assert.equal(s.coins,initialCoins+result.upgradeCoins+(s.wins[0].reward||0)+ (result.mintCoins||0)-(result.tollCoins||0));

  const totalMarkets=overflow.markets.length,marketRounds=overflow.markets.map(x=>x+1),beginCount=s.marketCount;
  assert.equal(game.openIntermission(),true,'First queued Market opens after single score');
  assert.equal(s.shopOpen,true);assert.equal(s.round+1,marketRounds[0]);
  assert.equal(s.marketCount,beginCount+1);
  const saved=game.exportState(),restored=G.createGame(E,{seed:9999,TARGETS:Array(15).fill(100),ENDLESS_TARGET_MULTIPLIER:5});
  assert(restored.restoreState(saved));const rs=restored.state();
  assert.equal(rs.ouroborosOverflow.marketCursor,1,'Market queue survives save and restore');
  assert.equal(rs.shopOpen,true);assert.equal(rs.round+1,marketRounds[0]);
  for(let i=0;i<totalMarkets;i++){
    assert.equal(rs.shopOpen,true);assert.equal(rs.round+1,marketRounds[i]);
    assert.equal(restored.closeMarket(),true);
    assert.equal(restored.advance(),true);
    if(i<totalMarkets-1){
      assert.equal(rs.shopOpen,true,'Next Market opens without replaying Round Complete');
      assert.equal(rs.round+1,marketRounds[i+1]);assert.equal(rs.marketCount,beginCount+i+2);
    }
  }
  assert.equal(rs.shopOpen,false);assert.equal(rs.ouroborosOverflow,null);
  assert.equal(rs.round,covered.at(-1)+1,'Advance to the first unbeatably high target');
  assert.equal(restored.targetExact(),game.targetExactForRound(rs.round));
  assert.equal(rs.score,0);assert.equal(rs.ouroborosMode,true);
  assert.equal(rs.pieces.length,1);assert.equal(rs.pieces[0].tile.id,tile.id);
  assert.equal(rs.events.filter(e=>e.type==='ouroboros-overflow').length,1);
  assert.equal(rs.events.filter(e=>e.type==='shop-open'&&e.shop==='market').length,totalMarkets);
  assert.equal(rs.events.filter(e=>e.type==='ouroboros-overflow-advance').length,1);
}
{
  const{game,s,tile,piece}=ready(7552);
  const r=fireResult(game,s,tile,piece,'500');
  assert.equal(r.cleared,true);assert.equal(s.ouroborosOverflow,null,'Exact current target does not skip a round');
  assert.equal(game.advance(),true);assert.equal(s.round,16);
}
{
  const{game,s,tile}=ready(7553);
  s.running=false;s.roundTurn=3;s.cleared=false;
  assert.equal(game.previewOuroborosFire(tile.id).reason,'fire-limit');
  assert.equal(game.beginOuroborosFire(tile.id).reason,'fire-limit');
}
console.log('Ouroboros OVERFLOW and sequential Market regressions passed');
