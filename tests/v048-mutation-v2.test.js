const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const D=require('../data.js'),E=require('../engine.js'),G=require('../game.js'),M=require('../mods.js'),P=require('../presentation.js');

E.setBoardSize(30,40);
let checks=0;
function check(name,fn){fn();checks++;console.log(`Mutation v2: ${name}`)}
function placeFromSet(s,id,x,y,rr,pieceId){
  const tile=s.set.find(t=>t.id===id);assert(tile,`missing tile ${id}`);
  const p=E.pieceFrom(tile,x,y,0,rr,pieceId);p.tile={...tile};return p
}
function setMachine(g,specs){
  const s=g.state();s.pieces=specs.map((spec,i)=>placeFromSet(s,spec[0],spec[1],spec[2],spec[3],i+1));s.placedTileIds=specs.map(spec=>spec[0]);
  s.running=false;s.cleared=false;s.blocked=false;s.needsReroll=false;s.failureReason=null;s.pendingCircuit=null;s.pendingModPlacement=null;s.shopOpen=false;
  return s
}
function addDuplicate(s,sourceId,newId,{generation=2,powerMultiplier=2,upgrade=0}={}){
  const source=s.set.find(t=>t.id===sourceId);assert(source);
  const tile={...source,id:newId,source:'power-set',generation,powerMultiplier,upgrade};s.set.push(tile);return tile
}
function byTile(s,id){return s.pieces.find(p=>p.tile.id===id)}
function placement(p){return{x:p.cubes[0].x,y:p.cubes[0].y,rr:p.rr}}

check('roster uses seven distinct Mutation verbs without expanding the 28-Mod archive',()=>{
  const ids=['zero-port','parity-exchange','mirror','pivot','recall','scrap','swap'];
  assert.deepEqual(ids.map(id=>M.get(id)?.category),Array(7).fill('mutation'));
  assert.deepEqual(['recall','pivot','scrap','swap'].map(id=>M.get(id)?.collectionCode),['RC','PV','SC','SW']);
  for(const id of ['twin','gate','fan','crown'])assert.equal(M.get(id),null);
  assert.equal(M.collection().filter(slot=>slot.mod).length,28);
});

check('MIRROR swings 180 degrees around one anchored half and is limited to once per Round',()=>{
  const g=G.createGame(E,{seed:4801}),s=setMachine(g,[['d2-2',6,4,1],['d2-3',6,8,0]]);s.mirrorTileId='d2-3';
  const info=g.mutationOptions('d2-3');assert.equal(info.mod,'mirror');assert.equal(info.available,true);
  const option=info.options.find(x=>x.anchorHalf===0);assert(option,'half 0 should have a legal 180 degree mirror');
  const before=byTile(s,'d2-3'),fixed={x:before.cubes[0].x,y:before.cubes[0].y};
  const r=g.applyMutation('d2-3',option.key);assert(r.ok);const after=byTile(s,'d2-3');
  assert.deepEqual({x:after.cubes[0].x,y:after.cubes[0].y},fixed,'anchored half stays fixed');
  assert.equal(after.rr,2);assert.deepEqual({x:after.cubes[1].x,y:after.cubes[1].y},{x:4,y:8});
  assert.equal(s.mutationUseRound.mirror,s.round);assert.equal(g.mutationOptions('d2-3').reason,'used');assert.equal(s.undoFrame,null);
});

check('PIVOT rotates 90 degrees around a physical half and preserves the tile ID',()=>{
  const g=G.createGame(E,{seed:4802}),s=setMachine(g,[['d2-2',6,4,1],['d2-3',6,8,0]]);s.pivotTileId='d2-3';
  const info=g.mutationOptions('d2-3');assert(info.available);const option=info.options.find(x=>x.anchorHalf===0&&x.turn==='CW');assert(option);
  const pieceId=byTile(s,'d2-3').id,r=g.applyMutation('d2-3',option.key);assert(r.ok);const after=byTile(s,'d2-3');
  assert.equal(after.id,pieceId);assert.equal(after.rr,1);assert.deepEqual({x:after.cubes[0].x,y:after.cubes[0].y},{x:6,y:8});assert.deepEqual({x:after.cubes[1].x,y:after.cubes[1].y},{x:6,y:10});
  assert.equal(s.mutationUseRound.pivot,s.round);
});

check('RECALL returns the same physical tile and preserves POWER, Star, Circuit and Mod state',()=>{
  const g=G.createGame(E,{seed:4803}),s=setMachine(g,[['d2-2',6,4,1],['d2-3',6,8,0]]);
  const tile=s.set.find(t=>t.id==='d2-3');tile.generation=2;tile.powerMultiplier=2;tile.upgrade=2;byTile(s,'d2-3').tile={...tile};
  s.recallTileId='d2-3';s.circuitRanks['d2-3']=3;s.hand[0]=null;s.undoFrame={sentinel:true};
  const info=g.mutationOptions('d2-3');assert(info.available);const r=g.applyMutation('d2-3','recall');assert(r.ok);
  assert.equal(byTile(s,'d2-3'),undefined);assert.equal(s.placedTileIds.includes('d2-3'),false);assert.equal(s.hand[0].id,'d2-3');
  assert.equal(s.hand[0].powerMultiplier,2);assert.equal(s.hand[0].upgrade,2);assert.equal(s.circuitRanks['d2-3'],3);assert.equal(s.recallTileId,'d2-3');
  assert(s.set.some(t=>t.id==='d2-3'),'recalled tile stays in the run set');assert.equal(s.undoFrame,null);
});

check('SCRAP permanently removes one neighbour with its Star, Circuit and Tile Mod',()=>{
  const g=G.createGame(E,{seed:4804}),s=setMachine(g,[['d2-2',6,4,1],['d2-3',6,8,0]]);
  s.scrapTileId='d2-2';const target=s.set.find(t=>t.id==='d2-3');target.upgrade=2;byTile(s,'d2-3').tile.upgrade=2;s.circuitRanks['d2-3']=4;s.mintTileId='d2-3';s.marketCount=3;s.undoFrame={sentinel:true};
  const info=g.mutationOptions('d2-2');assert(info.available);const option=info.options.find(x=>x.targetTileId==='d2-3');assert(option);assert.equal(option.consequences.upgrade,2);assert.equal(option.consequences.circuitRank,4);assert.deepEqual(option.consequences.mods,['mint']);
  const r=g.applyMutation('d2-2',option.key);assert(r.ok);assert.equal(r.destroyed.tile.id,'d2-3');
  assert.equal(byTile(s,'d2-3'),undefined);assert.equal(s.placedTileIds.includes('d2-3'),false);assert.equal(s.set.some(t=>t.id==='d2-3'),false);assert.equal(s.circuitRanks['d2-3'],undefined);assert.equal(s.mintTileId,null);
  assert.equal(s.scrapUsedMarket,3);assert.equal(g.mutationOptions('d2-2').reason,'used');assert.equal(s.undoFrame,null);
});

check('SWAP exchanges physical placements while identity, POWER, Star, Circuit and Mods stay with each tile',()=>{
  const g=G.createGame(E,{seed:4805}),s=g.state();const dup=addDuplicate(s,'d2-3','g2-d2-3',{generation:2,powerMultiplier:2,upgrade:3});
  s.pieces=[placeFromSet(s,'d2-3',2,8,0,1),placeFromSet(s,dup.id,8,8,2,2)];s.placedTileIds=['d2-3',dup.id];s.swapTileId='d2-3';s.bankTileId=dup.id;s.circuitRanks[dup.id]=5;
  const a0=placement(byTile(s,'d2-3')),b0=placement(byTile(s,dup.id)),info=g.mutationOptions('d2-3');assert(info.available);const option=info.options.find(x=>x.targetTileId===dup.id);assert(option);
  const r=g.applyMutation('d2-3',option.key);assert(r.ok);const a=byTile(s,'d2-3'),b=byTile(s,dup.id);
  assert.deepEqual(placement(a),b0);assert.deepEqual(placement(b),a0);assert.equal(a.tile.id,'d2-3');assert.equal(b.tile.id,dup.id);
  assert.equal(b.tile.powerMultiplier,2);assert.equal(b.tile.upgrade,3);assert.equal(s.circuitRanks[dup.id],5);assert.equal(s.bankTileId,dup.id);assert.equal(s.swapTileId,'d2-3');
});

check('active HINGE tile and pivot are protected from destructive Mutation targets',()=>{
  const g=G.createGame(E,{seed:4806}),s=setMachine(g,[['d2-2',6,4,1],['d2-3',6,8,0]]);s.scrapTileId='d2-2';s.hingeTileId='d4-5';s.hingeState={tileId:'d4-5',pivotTileId:'d2-3',positions:[],active:0};
  const info=g.mutationOptions('d2-2');assert.equal(info.available,false);assert.equal(info.options.length,0);
});

check('Mutation usage and assignments survive save/restore while legacy fields migrate to the same IDs',()=>{
  const g=G.createGame(E,{seed:4807}),s=setMachine(g,[['d2-2',6,4,1],['d2-3',6,8,0]]);s.pivotTileId='d2-3';s.mutationUseRound.pivot=0;s.scrapUsedMarket=2;s.marketCount=2;
  const saved=g.exportState();delete saved.state.recallTileId;delete saved.state.swapTileId;saved.state.twinTileId='d2-2';saved.state.crownTileId='d2-3';
  const restored=G.createGame(E,{seed:1});assert(restored.restoreState(saved));const rs=restored.state(),snap=restored.snapshot();
  assert.equal(rs.recallTileId,'d2-2');assert.equal(rs.swapTileId,'d2-3');assert.equal(rs.pivotTileId,'d2-3');assert.equal(rs.mutationUseRound.pivot,0);assert.equal(rs.scrapUsedMarket,2);
  for(const field of ['twinTileId','gateTileId','fanTileId','crownTileId'])assert.equal(field in rs,false);
  assert.equal(snap.tileModState.mutationUseRound.pivot,0);assert.equal(snap.tileModState.scrapUsedMarket,2);
  assert.deepEqual(P.tileViewModel(rs.set.find(t=>t.id==='d2-2'),rs).modifiers.map(m=>m.label),['RC']);
});

check('protected route comparator and scoring arithmetic remain unchanged by physical Mutation mods',()=>{
  const source=fs.readFileSync(path.join(__dirname,'..','engine.js'),'utf8');
  const traversalsIndex=source.indexOf('const at=a.traversals||0,bt=b.traversals||0'),outputIndex=source.indexOf('const scoreCmp=SCORE.compare('),tailIndex=source.indexOf("const av=[a.rebounds||0,(a.path||[]).length]");
  assert(traversalsIndex>=0&&outputIndex>traversalsIndex&&tailIndex>outputIndex,'route comparator remains protected: traversals → exact output → rebounds → path length');
  for(const id of ['mirror','pivot','recall','scrap','swap'])assert.doesNotMatch(source,new RegExp(`mods\\.has\\('${id}'\\).*modMultiplier`));
});

console.log(`${checks} MONOID Mutation v2 regressions passed`);
