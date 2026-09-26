const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const D=require('../data.js'),E=require('../engine.js'),G=require('../game.js'),M=require('../mods.js');

E.setBoardSize(30,40);
function piece(a,b,x,y,rr,id){const p=E.pieceFrom({a,b},x,y,0,rr,id);p.tile={id:`tile-${id}`,a,b};return p}
function op(pieceId,value){return{type:'op',piece:pieceId,entryHalf:0,exitHalf:1,entrySide:'L',exitSide:'R',value,op:value===0?'zero':value%2?'multiply':'add',before:0,after:0,add:0,factor:0,powerMultiplier:1}}
function replay(pieces,modId,pieceId,value,initial=5){
  const base={output:0,gain:0,path:[{piece:pieceId}],segments:[{piece:pieceId}],events:[op(pieceId,value)],reason:'fixture',traversals:1,rebounds:0};
  const result=E.replaySelectedScoring(base,initial,{pieces,modIdsByPiece:new Map([[pieceId,new Set([modId])]]),twinMultiplier:D.TWIN_MOD_MULTIPLIER,pairMultiplier:D.PAIR_MOD_MULTIPLIER});
  assert.deepEqual(result.path,base.path,'retained scoring Mods must not rewrite the selected route');
  assert.deepEqual(result.segments,base.segments,'retained scoring Mods must not rewrite route segments');
  return result
}
function setPlaced(g,ids){const s=g.state();s.pieces=ids.map((id,i)=>{const t=s.set.find(t=>t.id===id),p=E.pieceFrom(t,2+(i%3)*8,8+Math.floor(i/3)*8,0,0,i+1);p.tile={...t};return p});s.placedTileIds=[...ids];return s}

assert.equal(D.VERSION,'0.46.0');
assert.deepEqual([D.TWIN_MOD_MULTIPLIER,D.PAIR_MOD_MULTIPLIER],[3,3]);
assert.deepEqual(['twin','pair'].map(id=>M.get(id).collectionCode),['TW','PR']);
for(const retired of ['sequence','complement'])assert.equal(M.get(retired),null,`${retired} was replaced by Signal v2`);

{
  const twins=[piece(2,3,2,2,0,1),piece(2,3,8,2,2,2)];
  const r=replay(twins,'twin',1,3);assert.equal(r.events[0].twin,true);assert.equal(r.events[0].pair,false);assert.equal(r.events[0].modMultiplier,3);assert.equal(r.output,45);
  const inactive=replay([piece(2,3,2,2,0,1),piece(3,4,6,2,0,2)],'twin',1,3);
  assert.equal(inactive.events[0].twin,false);assert.equal(inactive.events[0].modMultiplier,1);
}
{
  const pair=[piece(2,3,2,2,0,1),piece(2,3,2,4,0,2)];
  const r=replay(pair,'pair',1,3);assert.equal(r.events[0].pair,true);assert.equal(r.events[0].twin,true);assert.equal(r.events[0].modMultiplier,3);assert.equal(r.output,45);
  const inactive=replay([piece(2,3,2,2,0,1)],'pair',1,3);assert.equal(inactive.events[0].pair,false);assert.equal(inactive.events[0].modMultiplier,1);
}
{
  const g=G.createGame(E,{seed:3802}),s=setPlaced(g,['d1-5','d0-3']);
  const twinTile=s.set.find(t=>t.id==='d1-5'),pairTile=s.set.find(t=>t.id==='d0-3');
  const twinPiece=E.pieceFrom(twinTile,2,2,0,0,1);twinPiece.tile={...twinTile};
  const pairPiece=E.pieceFrom(pairTile,2,4,0,0,2);pairPiece.tile={...pairTile};
  s.pieces=[twinPiece,pairPiece];assert.equal(E.modGeometryFacts(pairPiece,s.pieces).pair,true,'PAIR persistence fixture must satisfy the active topology lifecycle');
  s.twinTileId='d1-5';s.pairTileId='d0-3';
  const saved=g.exportState(),restored=G.createGame(E,{seed:9});assert(restored.restoreState(saved));
  const rs=restored.state(),snap=restored.snapshot();
  assert.equal(rs.twinTileId,'d1-5');assert.equal(rs.pairTileId,'d0-3');
  assert.deepEqual(snap.tileMods.twin,['d1-5']);assert.deepEqual(snap.tileMods.pair,['d0-3']);
  assert.match(restored.debugText(),/TW=d1-5 · PR=d0-3/);
}
const engineSource=fs.readFileSync(path.join(__dirname,'..','engine.js'),'utf8');
assert.match(engineSource,/const av=\[a\.traversals\|\|0,a\.output\|\|0,a\.rebounds\|\|0,\(a\.path\|\|\[\]\)\.length\]/,'route comparator remains protected');
console.log('v0.46.0 retained Batch A Mod regressions passed');
