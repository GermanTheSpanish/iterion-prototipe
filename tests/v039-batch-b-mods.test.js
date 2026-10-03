const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const D=require('../data.js'),E=require('../engine.js'),G=require('../game.js'),M=require('../mods.js');

E.setBoardSize(30,40);
function piece(a,b,x,y,rr,id){const p=E.pieceFrom({a,b},x,y,0,rr,id);p.tile={id:'tile-'+id,a,b};return p}
function op(pieceId,value=2){return{type:'op',piece:pieceId,entryHalf:0,exitHalf:1,entrySide:'L',exitSide:'R',value,op:'add',before:0,after:0,add:0,factor:0,powerMultiplier:1}}
function replay(pieces,modId,pieceId){
  const base={output:0,gain:0,path:[{piece:pieceId}],segments:[{piece:pieceId}],events:[op(pieceId)],reason:'fixture',traversals:1,rebounds:0};
  return E.replaySelectedScoring(base,0,{pieces,modIdsByPiece:new Map([[pieceId,new Set([modId])]]),bridgeMultiplier:D.BRIDGE_MOD_MULTIPLIER})
}
function setPlaced(g,ids){const s=g.state();s.pieces=ids.map((id,i)=>{const t=s.set.find(t=>t.id===id),p=E.pieceFrom(t,2+i*6,8,0,0,i+1);p.tile={...t};return p});s.placedTileIds=[...ids];return s}

assert.deepEqual(['recall','pivot'].map(id=>M.get(id).collectionCode),['RC','PV']);
assert.deepEqual(['recall','pivot'].map(id=>M.get(id).category),['mutation','mutation']);
for(const retired of ['scrap','swap','twin','gate','fan','crown'])assert.equal(M.get(retired),null,retired+' must not be in the active roster');

{
  const line=[piece(2,2,2,8,0,1),piece(2,2,6,8,0,2),piece(2,2,10,8,0,3)];
  const r=replay(line,'bridge',2);assert.equal(r.events[0].bridge,true);assert.equal(r.events[0].modMultiplier,2);assert.equal(r.output,4);
  const end=replay(line,'bridge',1);assert.equal(end.events[0].bridge,false);assert.equal(end.events[0].modMultiplier,1);
}
{
  const g=G.createGame(E,{seed:3902}),s=setPlaced(g,['d1-6','d0-5','d1-3','d3-4']),saved=g.exportState();
  delete saved.state.recallTileId;delete saved.state.pivotTileId;
  saved.state.twinTileId='d1-6';saved.state.gateTileId='d0-5';saved.state.fanTileId='d1-3';saved.state.crownTileId='d3-4';
  saved.state.pendingModPlacement={mod:'gate',stage:'target',eligibleTileIds:['d0-5'],sourceTileId:null,previousTileId:null,recordIndex:0};
  const restored=G.createGame(E,{seed:1});assert(restored.restoreState(saved));const rs=restored.state(),snap=restored.snapshot();
  assert.equal(rs.recallTileId,'d1-6');assert.equal(rs.pivotTileId,'d0-5');assert.equal(rs.pendingModPlacement.mod,'pivot');
  for(const field of ['twinTileId','gateTileId','fanTileId','crownTileId','scrapTileId','swapTileId'])assert.equal(field in rs,false);
  assert.deepEqual(snap.tileMods.recall,['d1-6']);assert.deepEqual(snap.tileMods.pivot,['d0-5']);
}
const source=fs.readFileSync(path.join(__dirname,'..','engine.js'),'utf8');
assert.match(source,/let topologyGraph=null;const graph=/,'expensive topology graph must remain lazy per replay');
const traversalsIndex=source.indexOf('const at=a.traversals||0,bt=b.traversals||0'),outputIndex=source.indexOf('const scoreCmp=SCORE.compare('),tailIndex=source.indexOf("const av=[a.rebounds||0,(a.path||[]).length]");
assert(traversalsIndex>=0&&outputIndex>traversalsIndex&&tailIndex>outputIndex,'route comparator remains protected: traversals → exact output → rebounds → path length');
console.log('Current Mutation roster and Bridge regressions passed');
