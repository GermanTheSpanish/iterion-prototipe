const assert=require('assert');
const fs=require('fs');
const path=require('path');
const D=require('../data.js');
const E=require('../engine.js');
const G=require('../game.js');

function create(seed=3401,extra={}){
  E.setBoardSize(18,24);
  const game=G.createGame(E,{...D,seed,FIRST_TILE_MUST_BE_DOUBLE:false,STARTING_COINS:100,TARGETS:Array(15).fill(1e15),...extra});
  return{game,s:game.state()};
}

{
  const{game,s}=create();
  assert.strictEqual(game.canBuyTool('move'),true,'empty Move can be bought from HUD');
  assert.strictEqual(game.canBuyTool('undo'),true,'empty Undo can be bought from HUD');
  assert.strictEqual(game.canBuyTool('reroll'),false,'free Reroll means Reroll is not exhausted yet');
  s.freeReroll=0;
  assert.strictEqual(game.canBuyTool('reroll'),true,'Reroll becomes purchasable only when free + stored are exhausted');

  const quote=game.toolPurchaseQuote('move',3);
  assert.deepStrictEqual(quote.unitCosts,[3,4,5],'batch quote must apply Inflation sequentially');
  assert.strictEqual(quote.total,12);
  assert.strictEqual(quote.inflationBefore,0);
  assert.strictEqual(quote.inflationAfter,3);

  const bought=game.buyTool('move',3);
  assert.strictEqual(bought.ok,true);
  assert.strictEqual(bought.quantity,3);
  assert.strictEqual(bought.total,12);
  assert.strictEqual(s.coins,88);
  assert.strictEqual(s.inflation,3);
  assert.strictEqual(s.consumables.move,3);
  assert.strictEqual(game.canBuyTool('move'),false,'owned Move must be used before topping up again');
  assert.strictEqual(s.events.filter(e=>e.type==='shop-buy'&&e.shop==='tool'&&e.item==='move').length,3);
}

{
  const{game,s}=create(3402);
  assert.strictEqual(game.openShop(),true);
  assert.deepStrictEqual(s.shopOffers,[],'Tile Shop must not expose tool offers');
  assert.strictEqual(game.buyShopItem('move').ok,false,'legacy Shop tool purchase path must be disabled');
  assert.strictEqual(game.buyShopItem('move').reason,'tools-moved');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(game.snapshot().shop,'itemPrices'),false,'Tile Shop snapshot must not carry tool prices');
}

{
  const{game,s}=create(3403);
  const c=game.candidatesForIndex(0)[0],ctx=game.beginPlacement(0,c);
  assert.strictEqual(ctx.ok,true);game.finishPlacement(ctx);
  assert.strictEqual(s.consumables.undo,0);
  const bought=game.buyTool('undo',2);assert.strictEqual(bought.ok,true);
  const coinsAfterBuy=s.coins,inflationAfterBuy=s.inflation;
  const undone=game.useUndo();assert.strictEqual(undone.ok,true);
  assert.strictEqual(game.state().consumables.undo,1,'Undo must preserve both purchased units then consume one');
  assert.strictEqual(game.state().coins,coinsAfterBuy,'Undo must not refund HUD tool purchases');
  assert.strictEqual(game.state().inflation,inflationAfterBuy,'Undo must preserve Inflation from HUD tool purchases');
}

{
  const{game,s}=create(3404);
  s.blocked=true;s.failureReason='placement-limit';s.freeReroll=0;s.consumables.move=0;
  assert.strictEqual(game.canBuyTool('move'),true,'placement-limit can still be rescued by buying Move directly');
  assert.strictEqual(game.buyTool('move',1).ok,true);
  assert.strictEqual(game.canUseMove(),true);

  const other=create(3405);other.s.blocked=true;other.s.failureReason='no-legal-moves';other.s.freeReroll=0;other.s.consumables.reroll=0;
  assert.strictEqual(other.game.canBuyTool('reroll'),true,'no-legal-moves can be rescued only by an explicit Reroll purchase');
  assert.strictEqual(other.game.recoveryOptions().rerollRescue,true);
}

{
  const ui=fs.readFileSync(path.join(__dirname,'..','ui.js'),'utf8');
  assert.match(ui,/overlayTitle\.textContent='TILE SHOP'/);
  assert.doesNotMatch(ui,/<h3>TOOLS<\/h3>/,'Tile Shop UI must contain only domino purchases');
  assert.match(ui,/data-tool-qty="up"/);
  assert.match(ui,/data-tool-qty="down"/);
  assert.match(ui,/GAME\.toolPurchaseQuote\(id,qty\)/);
  assert.match(ui,/GAME\.buyTool\(id,quantity,\{intent:'store'\}\)/);
  assert.match(ui,/GAME\.buyTool\(id,1,\{intent:'buy-use'\}\)/);
  assert.match(ui,/moveBtn\.onclick=activateMove;rerollBtn\.onclick=activateReroll;undoBtn\.onclick=activateUndo/);
}

console.log('v0.34 HUD tool purchase and Tile Shop regressions passed');
