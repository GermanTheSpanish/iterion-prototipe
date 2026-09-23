const assert=require('assert');
const E=require('../engine.js');
const Game=require('../game.js');

const infiniteOptions={
  seed:3701,
  GAME_MODE:'infinite-endless',
  INFINITE_ENDLESS:true,
  INFINITE_BOARD_GROWTH:[3,4],
  INFINITE_BOARD_STAGE_INTERVAL:2,
  INFINITE_PHASE_AFTER_STAGES:15,
  INFINITE_HAND_SIZE:3
};

function completedBase(options={}){
  E.setBoardSize(30,40);
  const game=Game.createGame(E,{seed:3701,...options}),s=game.state(),tile=s.set.find(t=>t.id==='d6-6');
  E.setBoardSize(30,40);
  const piece=E.pieceFrom(tile,14,18,0,0,1);piece.tile={...tile};
  s.pieces=[piece];s.placedTileIds=[tile.id];s.idc=1;s.turn=1;
  s.round=14;s.boardStage=4;s.cleared=true;s.standardComplete=true;s.running=false;
  s.nextShopType='none';s.intermissionResolved=true;s.shopOpen=false;s.shopType=null;
  return{game,s}
}

function clearWithoutMarket(game){
  const s=game.state();s.cleared=true;s.nextShopType='none';s.intermissionResolved=true;s.shopOpen=false;
  assert.strictEqual(game.advance(),true)
}

function marketThenAdvance(game){
  const s=game.state();s.cleared=true;s.nextShopType='market';s.intermissionResolved=false;s.shopOpen=false;s.shopType=null;
  assert.strictEqual(game.advance(),false,'a scheduled Market cannot be skipped');
  assert.strictEqual(game.openIntermission(),true);
  assert.strictEqual(game.closeMarket(),true);
  assert.strictEqual(game.advance(),true)
}

{
  const{game,s}=completedBase(infiniteOptions);
  assert.strictEqual(s.gameMode,'infinite-endless');
  assert.strictEqual(s.scoringModel,undefined,'Infinite Endless uses canonical Classic scoring');
  assert.deepStrictEqual(game.boardSizeForStage(5),[30,40],'entering Endless no longer grows the board immediately');

  assert.strictEqual(game.startEndless(),true);
  assert.strictEqual(s.shopType,'market');
  assert.deepStrictEqual(E.getBoardSize(),{G:30,H:40},'the base-complete Market does not grow the board');
  assert.strictEqual(game.closeMarket(),true);
  assert.strictEqual(game.advance(),true);
  assert.strictEqual(s.round,15,'the run enters R16');
  assert.deepStrictEqual(E.getBoardSize(),{G:30,H:40});
  assert.strictEqual(s.hand.length,5,'Endless keeps the normal five-tile Hand before Infinite phase');
  assert.deepStrictEqual(game.boardSizeForStage(5),[30,40]);
  assert.deepStrictEqual(game.boardSizeForStage(6),[30,40],'one completed Endless stage is not enough to grow');
  assert.deepStrictEqual(game.boardSizeForStage(7),[33,44],'growth occurs after two completed Endless stages');
  assert.deepStrictEqual(game.boardSizeForStage(8),[33,44]);
  assert.deepStrictEqual(game.boardSizeForStage(9),[36,48],'each two-stage interval unlocks one +3 x +4 step');

  // R16 -> R18, then the Stage 1 Market: still no growth entering R19.
  clearWithoutMarket(game);clearWithoutMarket(game);
  assert.strictEqual(s.round,17);
  marketThenAdvance(game);
  assert.strictEqual(s.round,18);
  assert.deepStrictEqual(E.getBoardSize(),{G:30,H:40},'the first Endless Stage Market does not grow the board');

  // R19 -> R21, then the Stage 2 Market: first growth entering R22.
  clearWithoutMarket(game);clearWithoutMarket(game);
  assert.strictEqual(s.round,20);
  marketThenAdvance(game);
  assert.strictEqual(s.round,21);
  assert.deepStrictEqual(E.getBoardSize(),{G:33,H:44},'the second Endless Stage Market unlocks the first growth step');
  assert.deepStrictEqual([s.pieces[0].cubes[0].x,s.pieces[0].cubes[0].y],[15,20],'the persistent machine stays centred during growth');
  assert.strictEqual(game.target(),250000000000*Math.pow(5,6),'target progression remains canonical and independent of board cadence');
  assert.strictEqual(game.snapshot().circuits.tileLimit,6,'Circuit slots still progress every Endless stage');
}

{
  const{game,s}=completedBase(infiniteOptions);
  s.endlessMode=true;s.standardComplete=true;s.round=59;s.cleared=true;s.intermissionResolved=true;s.shopOpen=false;s.nextShopType='none';
  const expectedBefore=game.boardSizeForStage(19),expectedInfinite=game.boardSizeForStage(20);
  assert.deepStrictEqual(expectedBefore,[51,68]);
  assert.deepStrictEqual(expectedInfinite,[51,68],'15 Endless stages produce seven growth steps, not fifteen');
  E.setBoardSize(expectedBefore[0],expectedBefore[1]);

  assert.strictEqual(game.infinitePhase(),false);
  assert.strictEqual(game.infinitePhaseStartRound(),60);
  assert.strictEqual(game.handSizeForRound(),5);
  assert.strictEqual(game.advance(),true,'R60 clear advances into the Infinite phase at R61');
  assert.strictEqual(s.round,60);
  assert.strictEqual(game.infinitePhase(),true);
  assert.strictEqual(game.handSizeForRound(),3);
  assert.strictEqual(s.hand.length,3,'Infinite phase creates a real three-tile Hand');
  const snap=game.snapshot();
  assert.strictEqual(snap.endless.phase,'infinite');
  assert.strictEqual(snap.endless.infinitePhase,true);
  assert.strictEqual(snap.endless.infinitePhaseStartRound,61);
  assert.strictEqual(snap.endless.endlessStagesCompleted,15);
  assert.strictEqual(snap.endless.handSize,3);
  assert.strictEqual(snap.endless.boardGrowthStageInterval,2);
  assert.deepStrictEqual(snap.boardSize,{width:51,height:68});
  assert(s.events.some(event=>event.type==='infinite-phase-start'&&event.round===61&&event.handSize===3),'phase transition is preserved in telemetry');
  assert.match(game.debugText(),/phase=infinite/);
  assert.match(game.debugText(),/hand=3/);

  const saved=game.exportState(),legacy=JSON.parse(JSON.stringify(saved));
  legacy.state.hand.push(legacy.state.reserve.shift(),legacy.state.reserve.shift());
  assert.strictEqual(legacy.state.hand.length,5);
  const restored=Game.createGame(E,{...infiniteOptions,seed:3702});
  assert.strictEqual(restored.restoreState(legacy),true);
  assert.strictEqual(restored.state().hand.length,3,'restoring an older five-tile Infinite-phase save normalizes to three tiles');
  assert.strictEqual(restored.snapshot().endless.infinitePhase,true);
  assert.deepStrictEqual(E.getBoardSize(),{G:51,H:68});
  const activeIds=[...restored.state().hand,...restored.state().reserve,...restored.state().pieces.map(p=>p.tile)].filter(Boolean).map(t=>t.id);
  assert.strictEqual(new Set(activeIds).size,activeIds.length,'Hand normalization must not duplicate physical tile IDs');
}

{
  const{game,s}=completedBase();
  assert.strictEqual(game.startEndless(),true);assert.strictEqual(game.closeMarket(),true);assert.strictEqual(game.advance(),true);
  assert.deepStrictEqual(E.getBoardSize(),{G:30,H:40},'canonical Classic Endless remains capped');
  s.round=60;s.endlessMode=true;
  assert.strictEqual(game.infinitePhase(),false,'Classic Endless never enters the Infinite Endless final phase');
  assert.strictEqual(game.handSizeForRound(),5);
}

{
  const{game}=completedBase(infiniteOptions),legacy=game.exportState();
  legacy.state.gameMode='prototype';legacy.state.scoringModel='deferred-v1';legacy.state.scoringFormula='legacy';
  const restored=Game.createGame(E,{...infiniteOptions,seed:3703});
  assert.strictEqual(restored.restoreState(legacy),true);
  assert.strictEqual(restored.state().gameMode,'infinite-endless');
  assert.strictEqual(restored.state().scoringModel,undefined);
  assert.strictEqual(restored.state().scoringFormula,undefined);
}

console.log('Infinite Endless slower growth and R61 Infinite-phase regressions passed');
