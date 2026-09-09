const assert=require('assert');
const D=require('../data.js');const E=require('../engine.js');const Game=require('../game.js');
assert.strictEqual(D.VERSION,'0.25.1');assert.strictEqual(D.MARKET_ZERO_MEMORY_COST,9);
E.setBoardSize(18,24);const game=Game.createGame(E,{seed:2303,STARTING_COINS:100}),s=game.state(),by=id=>s.set.find(t=>t.id===id);
const placed=by('d0-5'),reserveZero=by('d0-6');function piece(t,x,id){const p=E.pieceFrom(t,x,0,0,0,id);p.tile={...t};return p}
s.pieces=[piece(placed,0,1)];s.placedTileIds=[placed.id];s.hand=[reserveZero,null,null,null,null];s.reserve=s.set.filter(t=>t.id!==reserveZero.id&&!s.placedTileIds.includes(t.id));s.cleared=true;s.round=2;s.nextShopType='market';s.intermissionResolved=false;s.coins=100;s.inflation=1;
assert.strictEqual(game.openIntermission(),true);assert(s.shopOffers.includes('zero-memory'));assert.strictEqual(game.marketTargetCount('zero-memory'),1,'only placed zero is eligible');
const buy=game.buyMarketMod('zero-memory');assert.strictEqual(buy.ok,true);assert.strictEqual(buy.tile.id,placed.id);assert.strictEqual(buy.cost,10);assert.strictEqual(s.zeroMemoryTileId,placed.id);assert.strictEqual(s.inflation,2);
assert.strictEqual(game.buyMarketMod('long-run').reason,'limit','one Market purchase limit still applies');
console.log('v0.23 Stage C Zero Memory Market tests passed');
