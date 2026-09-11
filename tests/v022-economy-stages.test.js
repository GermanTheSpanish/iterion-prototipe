const assert=require('assert');
const Data=require('../data.js');
const Game=require('../game.js');

function mockEngine(){
  let G=18,H=24;
  return {
    S:2,ARROW:['→','↓','←','↑'],
    get G(){return G},get H(){return H},
    setBoardSize(g,h){G=g;H=h;return{G,H}},
    getBoardSize(){return{G,H}},
    pieceFrom(tile,x=0,y=0,z=0,rr=0,id=1){
      const dx=rr%2===0?(rr===0?2:-2):0,dy=rr%2===1?(rr===1?2:-2):0;
      const cubes=[{x,y,z,v:tile.a,half:0},{x:x+dx,y:y+dy,z,v:tile.b,half:1}];
      return{id,tile:{...tile},rr,axis:rr%2===0?'H':'V',cubes,rect:{minx:Math.min(...cubes.map(c=>c.x)),miny:Math.min(...cubes.map(c=>c.y)),maxx:Math.max(...cubes.map(c=>c.x+2)),maxy:Math.max(...cubes.map(c=>c.y+2))}}
    },
    hasLegalMove(hand){return hand.length>0},
    hasAnyPlacement(){return true},
    allPlacements(){return[{x:0,y:0,z:0,rr:0}]},
    validatePlacement(){return{ok:true}},
    bestSignal(_id,_pieces,opts){return{output:opts.initialOutput||0,events:[],reason:'test',rebounds:0,search:{starts:1,leaves:1,expanded:1}}}
  }
}

function forceClear(roundIndex){
  const E=mockEngine(),game=Game.createGame(E,{seed:123,STARTING_COINS:100});
  const s=game.state();s.round=roundIndex;s.roundTurn=1;s.running=true;s.cleared=false;s.blocked=false;s.failureReason=null;
  const tile=s.set[0],p=E.pieceFrom(tile,0,0,0,0,999);p.tile={...tile};
  game.finishPlacement({ok:true,tile,p,trigger:1,sim:{output:1e15,events:[],reason:'test',rebounds:0,search:{starts:1,leaves:1,expanded:1}}});
  return{E,game,s}
}

assert.strictEqual(Data.VERSION,'0.28.0');
assert.strictEqual(Data.STAGE_SIZE,3);
assert.deepStrictEqual(Data.BOARD_SIZES,[[18,24],[21,28],[24,32],[27,36],[30,40]]);
assert.strictEqual(Data.SHOP_CHANCE,undefined,'random inter-round Shop scheduling must be removed');
assert.strictEqual(Data.MARKET_RANDOM_TILE_COST,undefined,'random tile supply must no longer belong to Market config');
assert.strictEqual(Data.SHOP_RANDOM_TILE_COST,1);

for(const round of [0,1,3,4,6,7,9,10,12,13]){
  const {s}=forceClear(round);
  assert.strictEqual(s.nextShopType,'none',`R${round+1} must not schedule an inter-round Shop/Market`);
  assert.strictEqual(s.intermissionResolved,true);
}
for(const round of [2,5,8,11]){
  const {s}=forceClear(round);
  assert.strictEqual(s.nextShopType,'market',`R${round+1} must schedule a Market`);
  assert.strictEqual(s.intermissionResolved,false);
}
assert.strictEqual(forceClear(14).s.nextShopType,'none','final round must not schedule a Market');

{
  const E=mockEngine(),game=Game.createGame(E,{seed:1,STARTING_COINS:100});
  const s=game.state();
  assert.strictEqual(game.canOpenShop(),true,'Shop must be available during active play');
  assert.strictEqual(game.openShop(),true);
  const setBefore=s.set.length,availableBefore=game.availableTileCount();
  const buy=game.buyShopRandomTile();
  assert.strictEqual(buy.ok,true);
  assert.strictEqual(buy.cost,1);
  assert.strictEqual(s.set.length,setBefore+1,'Shop random purchase creates a new physical tile');
  assert.strictEqual(game.availableTileCount(),availableBefore+1);
  assert.strictEqual(s.inflation,1);
  assert.strictEqual(s.shopOpen,true,'Shop remains open after a purchase');
  const tool=game.buyShopItem('move');
  assert.strictEqual(tool.ok,true);
  assert.strictEqual(tool.cost,4,'global Inflation applies to tool purchases');
  assert.strictEqual(s.consumables.move,1);
  assert.strictEqual(s.inflation,2);
  assert.strictEqual(s.shopOpen,true,'multiple Shop purchases are allowed before closing');
  assert.strictEqual(game.closeShop(),true);
  assert.strictEqual(s.shopOpen,false);
}

{
  const E=mockEngine(),game=Game.createGame(E,{seed:7,STARTING_COINS:20});
  const s=game.state(),base=s.set[0];
  const p=E.pieceFrom(base,0,0,0,0,1);p.tile={...base};
  s.pieces=[p];s.placedTileIds=[base.id];s.turn=1;s.hand=Array(Data.HAND_SIZE).fill(null);s.reserve=[];s.blocked=true;s.failureReason='no-tiles';s.needsReroll=false;
  assert.strictEqual(game.openShop(),true,'Shop must still open from a no-tiles failure state');
  const buy=game.buyShopRandomTile();
  assert.strictEqual(buy.ok,true);
  assert.strictEqual(buy.delivery,'hand','a no-tiles rescue should deliver into the empty hand');
  assert(s.hand.some(Boolean));
  game.closeShop();
  assert.strictEqual(s.failureReason,null,'closing Shop must reassess and rescue the no-tiles state when a legal tile exists');
  assert.strictEqual(s.blocked,false);
}

{
  const E=mockEngine(),game=Game.createGame(E,{seed:9,STARTING_COINS:100});
  const s=game.state();
  game.openShop();game.buyShopRandomTile();game.closeShop();
  assert.strictEqual(s.inflation,1);
  s.cleared=true;s.round=2;s.nextShopType='market';s.intermissionResolved=false;
  assert.strictEqual(game.openIntermission(),true);
  assert.strictEqual(game.marketDoubleDoublePrice(),9,'Shop inflation must carry into Market prices');
  assert.strictEqual(game.buyMarketRandomTile,undefined,'Market must no longer sell random supply tiles');
  game.closeMarket();
  assert.strictEqual(game.advance(),true);
  assert.deepStrictEqual(E.getBoardSize(),{G:21,H:28},'Stage 2 board must expand to 21x28');
  assert(game.state().events.some(e=>e.type==='stage-start'&&e.stage===2),'stage entry telemetry must be recorded');
}

{
  const E=mockEngine(),game=Game.createGame(E,{seed:5,STARTING_COINS:100});
  const s=game.state();
  const expected=[[18,24],[21,28],[24,32],[27,36],[30,40]];
  for(let stage=1;stage<5;stage++){
    s.round=stage*3-1;s.cleared=true;s.nextShopType='market';s.intermissionResolved=false;s.shopOpen=false;s.shopType=null;
    game.openIntermission();game.closeMarket();
    assert.strictEqual(game.advance(),true);
    assert.deepStrictEqual(E.getBoardSize(),{G:expected[stage][0],H:expected[stage][1]},`Stage ${stage+1} board size`);
  }
}

console.log('v0.22 economy/stage regression tests passed');
