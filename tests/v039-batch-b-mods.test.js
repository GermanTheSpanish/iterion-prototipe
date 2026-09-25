const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const D=require('../data.js'),E=require('../engine.js'),G=require('../game.js'),M=require('../mods.js');

E.setBoardSize(30,40);
function piece(a,b,x,y,rr,id){const p=E.pieceFrom({a,b},x,y,0,rr,id);p.tile={id:`tile-${id}`,a,b};return p}
function op(pieceId,value){return{type:'op',piece:pieceId,entryHalf:0,exitHalf:1,entrySide:'L',exitSide:'R',value,op:value===0?'zero':value%2?'multiply':'add',before:0,after:0,add:0,factor:0,powerMultiplier:1}}
function replay(pieces,modId,pieceId,value=2,initial=0){
  const base={output:0,gain:0,path:[{piece:pieceId}],segments:[{piece:pieceId}],events:[op(pieceId,value)],reason:'fixture',traversals:1,rebounds:0};
  const result=E.replaySelectedScoring(base,initial,{pieces,modIdsByPiece:new Map([[pieceId,new Set([modId])]]),bridgeMultiplier:D.BRIDGE_MOD_MULTIPLIER,gateMultiplier:D.GATE_MOD_MULTIPLIER,fanMultiplier:D.FAN_MOD_MULTIPLIER,frameMultiplier:D.FRAME_MOD_MULTIPLIER,crownMultiplier:D.CROWN_MOD_MULTIPLIER,frontierMultiplier:D.FRONTIER_MOD_MULTIPLIER});
  assert.deepEqual(result.path,base.path,'Batch B must not rewrite selected routing');
  assert.deepEqual(result.segments,base.segments,'Batch B must not rewrite selected route segments');
  return result
}
function fakeMarket(g,id){
  const s=g.state();s.shopOpen=true;s.shopType='market';s.shopOffers=[id];s.marketBuys=[];s.cleared=true;s.intermissionResolved=false;s.nextShopType='market';s.coins=100;return s
}
function setPlaced(g,ids){
  const s=g.state();s.pieces=ids.map((id,i)=>{const t=s.set.find(t=>t.id===id),p=E.pieceFrom(t,2+i*6,8,0,0,i+1);p.tile={...t};return p});s.placedTileIds=[...ids];return s
}

assert.equal(D.VERSION,'0.44.4');
assert.deepEqual(
  [D.BRIDGE_MOD_MULTIPLIER,D.GATE_MOD_MULTIPLIER,D.FAN_MOD_MULTIPLIER,D.FRAME_MOD_MULTIPLIER,D.CROWN_MOD_MULTIPLIER,D.FRONTIER_MOD_MULTIPLIER],
  [3,2,4,2,4,2]
);
assert.deepEqual(['bridge','gate','fan','frame','crown','frontier'].map(id=>M.get(id).collectionCode),['BR','GT','FN','FM','CW','FT']);

{
  const line=[piece(2,2,2,8,0,1),piece(2,2,6,8,0,2),piece(2,2,10,8,0,3)];
  const r=replay(line,'bridge',2);assert.equal(r.events[0].bridge,true);assert.equal(r.events[0].modMultiplier,3);assert.equal(r.output,6);
  const end=replay(line,'bridge',1);assert.equal(end.events[0].bridge,false);assert.equal(end.events[0].modMultiplier,1);
}
{
  const target=piece(2,3,6,8,0,1),left=piece(2,2,2,8,0,2),topRight=piece(3,3,8,4,1,3);
  const active=replay([target,left,topRight],'gate',1);assert.equal(active.events[0].gate,true);assert.equal(active.events[0].modMultiplier,2);
  const topLeft=piece(2,2,6,4,1,4),inactive=replay([target,left,topLeft],'gate',1);assert.equal(inactive.events[0].gate,false);
}
{
  const target=piece(2,3,6,8,0,1),left=piece(2,2,2,8,0,2),top=piece(2,2,6,4,1,3),bottom=piece(2,2,6,10,1,4);
  const fan=replay([target,left,top,bottom],'fan',1);assert.equal(fan.events[0].fan,true);assert.equal(fan.events[0].crown,false);assert.equal(fan.events[0].modMultiplier,4);
}
{
  const cycle=[piece(2,2,6,6,0,1),piece(2,2,10,6,1,2),piece(2,2,10,10,2,3),piece(2,2,6,10,3,4)];
  const frame=replay(cycle,'frame',1);assert.equal(frame.events[0].frame,true);assert.equal(frame.events[0].bridge,false);assert.equal(frame.events[0].modMultiplier,2);
  const line=[piece(2,2,2,20,0,1),piece(2,2,6,20,0,2),piece(2,2,10,20,0,3)];
  assert.equal(replay(line,'frame',2).events[0].frame,false);
}
{
  const target=piece(2,3,6,8,0,1),left=piece(2,2,2,8,0,2),top=piece(2,2,6,4,1,3),right=piece(3,3,10,8,0,4);
  const crown=replay([target,left,top,right],'crown',1);assert.equal(crown.events[0].crown,true);assert.equal(crown.events[0].fan,false);assert.equal(crown.events[0].modMultiplier,4);
}
{
  const target=piece(2,3,6,8,0,1),left=piece(2,2,2,8,0,2),right=piece(3,3,10,8,0,3);
  const frontier=replay([target,left,right],'frontier',1);assert.equal(frontier.events[0].frontier,true);assert.equal(frontier.events[0].modMultiplier,2);
  const top=piece(2,2,6,4,1,4),bottomRight=piece(3,3,8,10,1,5);
  const packed=replay([target,left,right,top,bottomRight],'frontier',1);assert.equal(packed.events[0].frontier,false);
}

{
  const g=G.createGame(E,{seed:3901,STARTING_COINS:100}),s=setPlaced(g,['d2-2','d2-3','d0-5','d3-3']);
  s.cornerTileId='d2-3';
  fakeMarket(g,'gate');const info=g.marketOfferInfo('gate');
  assert(info.targetTiles.every(t=>t.a!==t.b),'Gate Market assignment must exclude doubles');
  assert(!info.targetTiles.some(t=>t.id==='d2-3'),'Gate must still respect the one-Mod slot');
  assert(info.targetTiles.some(t=>t.id==='d0-5'));
  const buy=g.buyMarketMod('gate');assert(buy.ok&&buy.pending);assert.equal(s.shopOpen,false);assert(g.chooseMarketModTile('d0-5').ok);assert.equal(s.gateTileId,'d0-5');
}
{
  const g=G.createGame(E,{seed:3902}),s=setPlaced(g,['d0-4','d0-5','d1-3','d1-4','d3-4','d3-5']);
  s.bridgeTileId='d0-4';s.gateTileId='d0-5';s.fanTileId='d1-3';s.frameTileId='d1-4';s.crownTileId='d3-4';s.frontierTileId='d3-5';
  const saved=g.exportState(),restored=G.createGame(E,{seed:1});assert(restored.restoreState(saved));
  const rs=restored.state(),snap=restored.snapshot();
  assert.equal(rs.bridgeTileId,'d0-4');assert.equal(rs.gateTileId,'d0-5');assert.equal(rs.fanTileId,'d1-3');assert.equal(rs.frameTileId,'d1-4');assert.equal(rs.crownTileId,'d3-4');assert.equal(rs.frontierTileId,'d3-5');
  assert.deepEqual(snap.tileMods.bridge,['d0-4']);assert.deepEqual(snap.tileMods.gate,['d0-5']);assert.deepEqual(snap.tileMods.fan,['d1-3']);assert.deepEqual(snap.tileMods.frame,['d1-4']);assert.deepEqual(snap.tileMods.crown,['d3-4']);assert.deepEqual(snap.tileMods.frontier,['d3-5']);
  assert.match(restored.debugText(),/BR=d0-4 · GT=d0-5 · FN=d1-3 · FM=d1-4 · CW=d3-4 · FT=d3-5/);
}
const source=fs.readFileSync(path.join(__dirname,'..','engine.js'),'utf8');
assert.match(source,/let topologyGraph=null;const graph=/,'expensive topology graph must remain lazy per replay');
assert.match(source,/const av=\[a\.traversals\|\|0,a\.output\|\|0,a\.rebounds\|\|0,\(a\.path\|\|\[\]\)\.length\]/,'route comparator remains protected');
console.log('v0.44.4 Batch B topology Mod regressions passed');
