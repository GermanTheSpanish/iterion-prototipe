const assert=require('assert');
const E=require('../engine.js');
const Game=require('../game.js');

E.setBoardSize(18,24);
const game=Game.createGame(E,{seed:42,STARTING_COINS:100});
const s=game.state();
const tile=s.set.find(t=>t.id==='d6-6');
const p=E.pieceFrom(tile,8,10,0,0,1);p.tile={...tile};
s.pieces=[p];s.placedTileIds=[tile.id];s.turn=1;
const expected=[[18,24],[21,28],[24,32],[27,36],[30,40]];
const expectedX=[8,9,11,12,14],expectedY=[10,12,14,16,18];
for(let stage=1;stage<5;stage++){
  s.round=stage*3-1;s.cleared=true;s.nextShopType='market';s.intermissionResolved=false;s.shopOpen=false;s.shopType=null;
  assert.strictEqual(game.openIntermission(),true);assert.strictEqual(game.closeMarket(),true);assert.strictEqual(game.advance(),true);
  assert.deepStrictEqual(E.getBoardSize(),{G:expected[stage][0],H:expected[stage][1]});
  assert.strictEqual(s.pieces[0].tile.id,tile.id,'physical tile identity must survive board expansion');
  assert.strictEqual(s.pieces[0].cubes[0].x,expectedX[stage]);
  assert.strictEqual(s.pieces[0].cubes[0].y,expectedY[stage]);
  assert(s.pieces[0].rect.minx>=0&&s.pieces[0].rect.maxx<=E.G&&s.pieces[0].rect.miny>=0&&s.pieces[0].rect.maxy<=E.H);
}
console.log('v0.22 real-engine board expansion regression passed');
