const assert=require('assert');
const E=require('../engine.js');
const Game=require('../game.js');

const infiniteOptions={seed:3701,GAME_MODE:'infinite-endless',INFINITE_ENDLESS:true,INFINITE_BOARD_GROWTH:[3,4]};

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
  const s=game.state();s.cleared=true;s.nextShopType='none';s.intermissionResolved=true;
  assert.strictEqual(game.advance(),true)
}

{
  const{game,s}=completedBase(infiniteOptions);
  assert.strictEqual(s.gameMode,'infinite-endless');
  assert.strictEqual(s.scoringModel,undefined,'Infinite Endless uses canonical Classic scoring');
  assert.deepStrictEqual(game.boardSizeForStage(5),[30,40],'the board cannot grow before Endless is entered');
  const initialExpansionCount=s.events.filter(event=>event.type==='board-expand').length;

  assert.strictEqual(game.startEndless(),true);
  assert.strictEqual(s.shopType,'market');
  assert.deepStrictEqual(E.getBoardSize(),{G:30,H:40},'opening a Market does not grow the board');
  assert.deepStrictEqual(game.boardSizeForStage(5),[33,44]);
  assert.strictEqual(game.closeMarket(),true);
  assert.deepStrictEqual(E.getBoardSize(),{G:30,H:40},'closing a Market does not grow before the stage transition');
  assert.strictEqual(game.advance(),true);
  assert.deepStrictEqual(E.getBoardSize(),{G:33,H:44},'the first Endless Market unlocks one +3 x +4 step');
  assert.deepStrictEqual([s.pieces[0].cubes[0].x,s.pieces[0].cubes[0].y],[15,20],'the persistent machine remains centred during growth');
  assert.strictEqual(game.target(),250000000000,'Infinite Endless keeps canonical Endless target progression');
  assert.strictEqual(game.snapshot().circuits.tileLimit,4,'Infinite Endless keeps canonical Endless Circuit progression');

  clearWithoutMarket(game);
  assert.deepStrictEqual(E.getBoardSize(),{G:33,H:44},'ordinary Endless rounds do not grow the board');
  clearWithoutMarket(game);
  assert.deepStrictEqual(E.getBoardSize(),{G:33,H:44},'growth waits for the next Market');

  s.cleared=true;s.nextShopType='market';s.intermissionResolved=false;
  assert.strictEqual(game.advance(),false,'a scheduled Market cannot be skipped');
  assert.strictEqual(game.openIntermission(),true);
  assert.deepStrictEqual(E.getBoardSize(),{G:33,H:44});
  assert.strictEqual(game.closeMarket(),true);
  assert.deepStrictEqual(E.getBoardSize(),{G:33,H:44});
  assert.strictEqual(game.advance(),true);
  assert.deepStrictEqual(E.getBoardSize(),{G:36,H:48},'each later Market unlocks exactly one further step');
  assert.deepStrictEqual([s.pieces[0].cubes[0].x,s.pieces[0].cubes[0].y],[17,22]);
  const endlessExpansions=s.events.filter(event=>event.type==='board-expand').slice(initialExpansionCount);
  assert.strictEqual(endlessExpansions.length,2);
  assert(endlessExpansions.every(event=>event.to[0]*4===event.to[1]*3),'every expanded board preserves 3:4');

  const saved=game.exportState(),before=game.snapshot();
  const restored=Game.createGame(E,{...infiniteOptions,seed:3702});
  assert.strictEqual(restored.restoreState(saved),true);
  assert.deepStrictEqual(E.getBoardSize(),{G:36,H:48},'restore reconstructs the current infinite board without another expansion');
  assert.deepStrictEqual(restored.snapshot().board,before.board);
  assert.strictEqual(restored.state().events.filter(event=>event.type==='board-expand').length,initialExpansionCount+2);
  const restoredWithoutModeOptions=Game.createGame(E,{seed:3704});
  assert.strictEqual(restoredWithoutModeOptions.restoreState(saved),true);
  assert.strictEqual(restoredWithoutModeOptions.state().gameMode,'infinite-endless');
  assert.deepStrictEqual(E.getBoardSize(),{G:36,H:48},'the persisted mode remains authoritative when restoring');
}

{
  const{game}=completedBase();
  assert.strictEqual(game.startEndless(),true);assert.strictEqual(game.closeMarket(),true);assert.strictEqual(game.advance(),true);
  assert.deepStrictEqual(E.getBoardSize(),{G:30,H:40},'canonical Classic Endless remains capped');
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

console.log('v0.37 Infinite Endless Market-gated board growth regressions passed');
