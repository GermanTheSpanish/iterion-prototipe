const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const D=require('../data.js'),E=require('../engine.js'),G=require('../game.js'),M=require('../mods.js');

E.setBoardSize(30,40);
function piece(a,b,x,y,rr,id){const p=E.pieceFrom({a,b},x,y,0,rr,id);p.tile={id:`tile-${id}`,a,b};return p}
function op(pieceId,value){return{type:'op',piece:pieceId,entryHalf:0,exitHalf:1,entrySide:'L',exitSide:'R',value,op:value===0?'zero':value%2?'multiply':'add',before:0,after:0,add:0,factor:0,powerMultiplier:1}}
function replay(pieces,modId,pieceId,value,initial=5){
  const base={output:0,gain:0,path:[{piece:pieceId}],segments:[{piece:pieceId}],events:[op(pieceId,value)],reason:'fixture',traversals:1,rebounds:0};
  const result=E.replaySelectedScoring(base,initial,{pieces,modIdsByPiece:new Map([[pieceId,new Set([modId])]]),sequenceMultiplier:D.SEQUENCE_MOD_MULTIPLIER,complementMultiplier:D.COMPLEMENT_MOD_MULTIPLIER,twinMultiplier:D.TWIN_MOD_MULTIPLIER,pairMultiplier:D.PAIR_MOD_MULTIPLIER});
  assert.deepEqual(result.path,base.path,'Batch A scoring must not rewrite the selected route');
  assert.deepEqual(result.segments,base.segments,'Batch A scoring must not rewrite route segments');
  return result
}
function fakeMarket(g,id){
  const s=g.state();s.shopOpen=true;s.shopType='market';s.shopOffers=[id];s.marketBuys=[];s.cleared=true;s.intermissionResolved=false;s.nextShopType='market';s.coins=100;return s
}
function placeStateTiles(g,ids){
  const s=g.state();s.pieces=ids.map((id,i)=>{const t=s.set.find(t=>t.id===id),p=E.pieceFrom(t,2+(i%3)*8,8+Math.floor(i/3)*8,0,0,i+1);p.tile={...t};return p});s.placedTileIds=[...ids];return s
}

assert.equal(D.VERSION,'0.41.1');
assert.deepEqual([D.MARKET_SEQUENCE_COST,D.MARKET_COMPLEMENT_COST,D.MARKET_TWIN_COST,D.MARKET_PAIR_COST],[8,8,8,8]);
assert.deepEqual([D.SEQUENCE_MOD_MULTIPLIER,D.COMPLEMENT_MOD_MULTIPLIER,D.TWIN_MOD_MULTIPLIER,D.PAIR_MOD_MULTIPLIER],[2,2,3,3]);
assert.deepEqual(['sequence','complement','twin','pair'].map(id=>M.get(id).collectionCode),['SQ','C6','TW','PR']);

{
  const r=replay([piece(2,3,2,2,0,1)],'sequence',1,3);
  assert.equal(r.events[0].sequence,true);assert.equal(r.events[0].modMultiplier,2);assert.equal(r.events[0].factor,6);assert.equal(r.output,30);
}
{
  const r=replay([piece(1,5,2,2,0,1)],'complement',1,5);
  assert.equal(r.events[0].complement,true);assert.equal(r.events[0].modMultiplier,2);assert.equal(r.events[0].factor,10);assert.equal(r.output,50);
}
{
  const twins=[piece(2,3,2,2,0,1),piece(2,3,8,2,2,2)];
  const r=replay(twins,'twin',1,3);
  assert.equal(r.events[0].twin,true);assert.equal(r.events[0].pair,false);assert.equal(r.events[0].modMultiplier,3);assert.equal(r.output,45);
  const inactive=replay([piece(2,3,2,2,0,1),piece(3,4,6,2,0,2)],'twin',1,3);
  assert.equal(inactive.events[0].twin,false);assert.equal(inactive.events[0].modMultiplier,1);
}
{
  const pair=[piece(2,3,2,2,0,1),piece(2,3,2,4,0,2)];
  const r=replay(pair,'pair',1,3);
  assert.equal(r.events[0].pair,true);assert.equal(r.events[0].twin,true);assert.equal(r.events[0].modMultiplier,3);assert.equal(r.output,45);
  const inactive=replay([piece(2,3,2,2,0,1)],'pair',1,3);
  assert.equal(inactive.events[0].pair,false);assert.equal(inactive.events[0].modMultiplier,1);
}

{
  const g=G.createGame(E,{seed:3801,STARTING_COINS:100}),s=placeStateTiles(g,['d2-3','d4-5','d2-4','d1-5']);
  s.cornerTileId='d2-3';
  fakeMarket(g,'sequence');const sequence=g.marketOfferInfo('sequence');
  assert.deepEqual(sequence.targetTiles.map(t=>t.id),['d4-5'],'Sequence eligibility is intrinsic and still respects the one-Mod slot');
  const buy=g.buyMarketMod('sequence');assert(buy.ok&&buy.pending);assert.equal(s.shopOpen,false);assert.deepEqual(buy.eligibleTileIds,['d4-5']);
  assert(g.chooseMarketModTile('d4-5').ok);assert.equal(s.sequenceTileId,'d4-5');
  fakeMarket(g,'complement');const complement=g.marketOfferInfo('complement');
  assert.deepEqual(new Set(complement.targetTiles.map(t=>t.id)),new Set(['d2-4','d1-5']));
}

{
  const g=G.createGame(E,{seed:3802}),s=placeStateTiles(g,['d2-3','d2-4','d1-5','d4-5']);
  s.sequenceTileId='d2-3';s.complementTileId='d2-4';s.twinTileId='d1-5';s.pairTileId='d4-5';
  const saved=g.exportState(),restored=G.createGame(E,{seed:9});assert(restored.restoreState(saved));
  const rs=restored.state(),snap=restored.snapshot();
  assert.equal(rs.sequenceTileId,'d2-3');assert.equal(rs.complementTileId,'d2-4');assert.equal(rs.twinTileId,'d1-5');assert.equal(rs.pairTileId,'d4-5');
  assert.deepEqual(snap.tileMods.sequence,['d2-3']);assert.deepEqual(snap.tileMods.complement,['d2-4']);assert.deepEqual(snap.tileMods.twin,['d1-5']);assert.deepEqual(snap.tileMods.pair,['d4-5']);
  assert.match(restored.debugText(),/SQ=d2-3 · C6=d2-4 · TW=d1-5 · PR=d4-5/);
}
const engineSource=fs.readFileSync(path.join(__dirname,'..','engine.js'),'utf8');
assert.match(engineSource,/const av=\[a\.traversals\|\|0,a\.output\|\|0,a\.rebounds\|\|0,\(a\.path\|\|\[\]\)\.length\]/,'route comparator remains protected');
console.log('v0.38.0 Batch A Tile Mod regressions passed');
