const assert=require('assert');
const D=require('../data.js');
const E=require('../engine.js');
const Game=require('../game.js');

assert.strictEqual(D.VERSION,'0.44.1');
assert.strictEqual(D.SHOP_TILE_OFFER_COUNT,4);
assert.strictEqual(D.SHOP_TILE_OFFER_COST,2);

function create(seed,opts={}){
  E.setBoardSize(18,24);
  const game=Game.createGame(E,{
    seed,
    FIRST_TILE_MUST_BE_DOUBLE:false,
    STARTING_COINS:100,
    TARGETS:Array(15).fill(1e15),
    ...opts
  });
  return{game,s:game.state(),shop:game.snapshot().shop};
}

{
  const a=create(401),b=create(401),c=create(402);
  const idsA=a.shop.tileOffers.map(x=>x.tile.id),idsB=b.shop.tileOffers.map(x=>x.tile.id),idsC=c.shop.tileOffers.map(x=>x.tile.id);
  assert.strictEqual(idsA.length,4,'Shop exposes four next-set tile offers');
  assert.strictEqual(new Set(idsA).size,4,'Shop offers are unique physical tiles');
  assert(idsA.every(id=>/^g2-d[0-6]-[0-6]$/.test(id)),'initial Shop offers come from Set II');
  assert.deepStrictEqual(idsA,idsB,'same run seed produces the same four Shop tile offers');
  assert.notDeepStrictEqual(idsA,idsC,'different run seeds should change the four Shop tile offers');
  assert(a.shop.tileOffers.every(x=>x.tile.generation===2&&x.tile.powerMultiplier===2));
}

{
  const{game,shop}=create(403);
  const reserved=new Set(shop.tileOffers.map(x=>x.tile.id));
  assert.strictEqual(game.openShop(),true);
  const random=game.buyShopRandomTile();
  assert.strictEqual(random.ok,true);
  assert(!reserved.has(random.tile.id),'RANDOM DOMINO must not consume one of the four visible reserved offers');
}

{
  const{game,s,shop}=create(404);
  const chosen=shop.tileOffers[0].tile;
  assert(!s.set.some(t=>t.id===chosen.id));
  assert.strictEqual(game.openShop(),true);
  const bought=game.buyShopTileOffer(chosen.id);
  assert.strictEqual(bought.ok,true);
  assert.strictEqual(bought.cost,2,'visible tile choice carries a 1c information premium over RANDOM');
  assert.strictEqual(bought.tile.id,chosen.id);
  assert.strictEqual(s.setGeneration,1,'buying a next-set tile must not unlock the set early');
  assert.strictEqual(s.set.filter(t=>t.id===chosen.id).length,1,'purchase creates exactly one physical instance');
  assert(!game.snapshot().shop.tileOffers.some(x=>x.tile.id===chosen.id),'bought offer disappears from the Shop');

  game.closeShop();
  s.placedTileIds=s.set.filter(t=>(t.generation||1)===1).map(t=>t.id);
  s.reserve=[];
  s.hand=[bought.tile,null,null,null,null];
  s.pieces=[];
  const candidate=game.candidatesForIndex(0)[0],ctx=game.beginPlacement(0,candidate);
  assert.strictEqual(ctx.ok,true);game.finishPlacement(ctx);
  assert.strictEqual(s.setGeneration,2,'Set II unlocks when Set I is exhausted');
  assert.strictEqual(s.set.filter(t=>(t.generation||1)===2).length,28,'Set II still contains exactly 28 physical tiles total');
  assert.strictEqual(s.set.filter(t=>t.id===chosen.id).length,1,'purchased tile is not re-added when Set II unlocks');
  assert.strictEqual(s.reserve.filter(t=>t.id===chosen.id).length,0,'future reserve contains no duplicate of the purchased tile');
  assert.strictEqual(game.snapshot().shop.tileOfferGeneration,3,'Shop refreshes to the next future set after POWER unlock');
}

{
  const{game}=create(405);
  const before=game.snapshot().shop.tileOffers.map(x=>x.tile.id);
  const saved=game.exportState();
  const restored=Game.createGame(E,{seed:999,FIRST_TILE_MUST_BE_DOUBLE:false,STARTING_COINS:100,TARGETS:Array(15).fill(1e15)});
  assert.strictEqual(restored.restoreState(saved),true);
  assert.deepStrictEqual(restored.snapshot().shop.tileOffers.map(x=>x.tile.id),before,'save/restore preserves the same four visible offers');
}

{
  const{game,s,shop}=create(406,{STARTING_UNDO_CONSUMABLES:1});
  const first=game.candidatesForIndex(0)[0],ctx=game.beginPlacement(0,first);
  assert.strictEqual(ctx.ok,true);game.finishPlacement(ctx);
  const chosen=shop.tileOffers[0].tile;
  assert.strictEqual(game.openShop(),true);
  const bought=game.buyShopTileOffer(chosen.id);assert.strictEqual(bought.ok,true);game.closeShop();
  assert.strictEqual(game.useUndo().ok,true);
  const restored=game.state();
  assert.strictEqual(restored.set.filter(t=>t.id===chosen.id).length,1,'Undo preserves a Shop tile purchase');
  assert(!restored.shopTileOffers.some(t=>t.id===chosen.id),'Undo must not put a purchased Shop offer back on sale');
}

{
  const fs=require('fs'),path=require('path'),ui=fs.readFileSync(path.join(__dirname,'..','ui.js'),'utf8');
  assert.match(ui,/NEXT SET · CHOOSE A TILE/,'Shop UI must expose the four visible next-set choices');
  assert.match(ui,/data-shop-tile-offer/);
  assert.match(ui,/GAME\.buyShopTileOffer\(/);
}

console.log('v0.44.1 next-set Shop tile offer regression tests passed');
