const assert=require('assert');
const fs=require('fs');
const path=require('path');
const E=require('../engine.js');
const D=require('../data.js');
const Game=require('../game.js');

function testEmergencyShopPurchasesSurviveUndo(){
  E.setBoardSize(18,24);
  const game=Game.createGame(E,{seed:4242,STARTING_COINS:20,TARGETS:Array(15).fill(1e15)});
  const s=game.state();
  const i=s.hand.findIndex(t=>t&&t.a===t.b);
  assert(i>=0,'opening hand must contain a double');
  const c=game.candidatesForIndex(i)[0];
  const begun=game.beginPlacement(i,c);
  assert.strictEqual(begun.ok,true);
  game.finishPlacement(begun);
  assert.strictEqual(s.turn,1);
  assert(game.canUndo()===false,'no Undo is stored before the emergency purchase');

  assert.strictEqual(game.openShop(),true);
  const undoBuy=game.buyShopItem('undo');
  assert.strictEqual(undoBuy.ok,true);
  const tileBuy=game.buyShopRandomTile();
  assert.strictEqual(tileBuy.ok,true);
  const purchasedId=tileBuy.tile.id;
  assert.strictEqual(s.coins,14,'Undo 4c + inflated random tile 2c must remain spent');
  assert.strictEqual(s.inflation,2);
  assert.strictEqual(game.closeShop(),true);
  assert.strictEqual(game.canUndo(),true);

  const result=game.useUndo();
  assert.strictEqual(result.ok,true);
  assert.strictEqual(result.preservedPurchases,2);
  assert.strictEqual(game.state().turn,0,'gameplay move must be reverted');
  assert.strictEqual(game.state().pieces.length,0,'placed domino must be removed by Undo');
  assert.strictEqual(game.state().coins,14,'emergency Shop spend must not be refunded');
  assert.strictEqual(game.state().inflation,2,'purchase Inflation must not be rewound');
  assert.strictEqual(game.state().consumables.undo,0,'the purchased Undo must be consumed');
  assert(game.state().set.some(t=>t.id===purchasedId),'purchased physical tile must remain owned');
  const physicalCopies=[...game.state().hand.filter(Boolean),...game.state().reserve].filter(t=>t.id===purchasedId);
  assert.strictEqual(physicalCopies.length,1,'purchased physical tile must exist exactly once after Undo');
  assert.match(game.debugText(),/preservedShop=2 spend=6/,'debug telemetry must report preserved rescue purchases');
}

function testPatchUxContracts(){
  const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
  const data=read('data.js'),ui=read('ui.js'),help=read('help.js'),mods=read('mods.js');
  assert.match(data,/VERSION:'0\.22\.1'/);
  assert.match(ui,/close\.textContent='CLOSE'/,'Data panel must have an internal close control');
  assert.match(ui,/className='runDataText'/,'Data panel must expose selectable run text');
  assert.match(ui,/board\.style\.backgroundImage='none'/,'visible board grid must be disabled');
  assert.match(ui,/board\.style\.backgroundColor='#fff'/,'board must render white');
  assert.match(ui,/boardCenterTick/,'board must render four centre-edge guide ticks');
  assert.match(ui,/Best Output with this tile:/,'tile inspector must show best Output across Moves involving this physical tile');
  assert.match(ui,/can pay \+\$\{m\.starCoins\}c when activated/,'tile inspector must show star coin value');
  assert.doesNotMatch(ui,/Location: \$\{m\.location\}|Orientation: \$\{m\.axis\}|Connections: \$\{m\.connectionCount\}/,'tile inspector must not show position metadata');
  assert.match(help,/starCoins:tier/);
  assert.match(help,/bestOutput/);
  assert.match(mods,/emergency Shop purchases made afterwards are not refunded/,'Undo copy must explain transaction persistence');
}

testEmergencyShopPurchasesSurviveUndo();
testPatchUxContracts();
console.log('v0.22.1 regression tests passed');
