const assert=require('assert');
const E=require('../engine.js');
const Game=require('../game.js');

function testDoubleDoubleReboundOnlyAmplifiesFirstPass(){
  E.setBoardSize(18,24);
  const entry=E.pieceFrom({a:1,b:5},0,0,0,0,3);
  entry.tile={id:'entry',a:1,b:5,upgrade:0,source:'test'};
  const dd=E.pieceFrom({a:5,b:5},4,0,0,0,1);
  dd.tile={id:'dd',a:5,b:5,upgrade:0,source:'test'};
  const zero=E.pieceFrom({a:5,b:0},8,0,0,0,2);
  zero.tile={id:'zero',a:5,b:0,upgrade:0,source:'test'};

  const normal=E.bestSignal(entry.id,[entry,dd,zero],{initialOutput:6});
  const boosted=E.bestSignal(entry.id,[entry,dd,zero],{initialOutput:6,doubleDoublePieceId:dd.id});

  assert.strictEqual(normal.output,750,'normal [5|5] rebound route should remain x5 on both passes');
  assert.strictEqual(boosted.output,3750,'Double Double should use x25 on first pass and x5 on the rebound pass');
  const ddOps=boosted.events.filter(e=>e.type==='op'&&e.piece===dd.id);
  assert.strictEqual(ddOps.length,2,'the Double Double tile should be traversed twice in this rebound route');
  assert.strictEqual(ddOps[0].factor,25,'first activation must use the Double Double operation');
  assert.strictEqual(ddOps[0].doubleDouble,true);
  assert.strictEqual(ddOps[1].factor,5,'later activation in the same Move must return to the normal double operation');
  assert.strictEqual(ddOps[1].doubleDouble,false);
}

function testUnlimitedMysteryDominoPurchases(){
  const game=Game.createGame(E,{STARTING_COINS:100});
  const s=game.state();
  s.shopOpen=true;
  s.shopType='market';
  s.coins=100;
  s.inflation=0;
  s.marketRandomStock=null;

  const bought=[];
  for(let i=0;i<5;i++){
    const r=game.buyMarketRandomTile();
    assert.strictEqual(r.ok,true,`Mystery Domino purchase ${i+1} should succeed`);
    bought.push(r.tile.id);
  }

  assert.strictEqual(new Set(bought).size,5,'every purchased domino must be a new physical tile instance');
  assert.strictEqual(s.set.length,33,'five Mystery Domino purchases must add five physical tiles');
  assert.strictEqual(s.inflation,5,'each purchase must increase global Inflation');
  assert.strictEqual(s.coins,85,'prices should be 1+2+3+4+5 with starting Inflation 0');
  assert.strictEqual(s.marketRandomStock,null,'Mystery Domino stock must remain unlimited');
}


testDoubleDoubleReboundOnlyAmplifiesFirstPass();
testUnlimitedMysteryDominoPurchases();
console.log('retained v0.19 gameplay regression tests passed');
