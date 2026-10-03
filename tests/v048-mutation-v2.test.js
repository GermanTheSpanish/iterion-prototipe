const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const E=require('../engine.js'),G=require('../game.js'),M=require('../mods.js'),P=require('../presentation.js');

E.setBoardSize(30,40);
let checks=0;
function check(name,fn){fn();checks++;console.log('Mutation: '+name)}
function placeFromSet(s,id,x,y,rr,pieceId){const tile=s.set.find(t=>t.id===id);assert(tile);const p=E.pieceFrom(tile,x,y,0,rr,pieceId);p.tile={...tile};return p}
function setMachine(g,specs){const s=g.state();s.pieces=specs.map((spec,i)=>placeFromSet(s,spec[0],spec[1],spec[2],spec[3],i+1));s.placedTileIds=specs.map(spec=>spec[0]);s.running=false;s.cleared=false;s.blocked=false;s.needsReroll=false;s.failureReason=null;s.pendingCircuit=null;s.pendingModPlacement=null;s.shopOpen=false;return s}
function byTile(s,id){return s.pieces.find(p=>p.tile.id===id)}

check('current Mutation roster keeps four distinct physical verbs',()=>{
  assert.deepEqual(['zero-port','parity-exchange','pivot','recall'].map(id=>M.get(id)?.category),Array(4).fill('mutation'));
  assert.deepEqual(['recall','pivot'].map(id=>M.get(id)?.collectionCode),['RC','PV']);
  for(const id of ['mirror','scrap','swap','twin','gate','fan','crown'])assert.equal(M.get(id),null);
});

check('PIVOT includes 180 FLIP and remains once per Round',()=>{
  const g=G.createGame(E,{seed:4801}),s=setMachine(g,[['d2-2',6,4,1],['d2-3',6,8,0]]);s.pivotTileId='d2-3';
  const info=g.mutationOptions('d2-3');assert(info.available);const option=info.options.find(x=>x.anchorHalf===0&&x.turn==='FLIP');assert(option,'half 0 should expose a legal 180° flip');
  const before=byTile(s,'d2-3'),pieceId=before.id,fixed={x:before.cubes[0].x,y:before.cubes[0].y};
  const r=g.applyMutation('d2-3',option.key);assert(r.ok);const after=byTile(s,'d2-3');
  assert.equal(after.id,pieceId);assert.deepEqual({x:after.cubes[0].x,y:after.cubes[0].y},fixed);assert.equal(after.rr,2);
  assert.equal(s.mutationUseRound.pivot,s.round);assert.equal(g.mutationOptions('d2-3').reason,'used');assert.equal(s.undoFrame,null);
});

check('PIVOT still exposes legal 90 degree moves and preserves tile ID',()=>{
  const g=G.createGame(E,{seed:4802}),s=setMachine(g,[['d2-2',6,4,1],['d2-3',6,8,0]]);s.pivotTileId='d2-3';
  const info=g.mutationOptions('d2-3'),option=info.options.find(x=>x.anchorHalf===0&&x.turn==='CW');assert(option);
  const pieceId=byTile(s,'d2-3').id,r=g.applyMutation('d2-3',option.key);assert(r.ok);assert.equal(byTile(s,'d2-3').id,pieceId);assert.equal(byTile(s,'d2-3').rr,1);
});

check('RECALL preserves physical identity and grants +1 Move once per Stage',()=>{
  const g=G.createGame(E,{seed:4803}),s=setMachine(g,[['d2-2',6,4,1],['d2-3',6,8,0]]);
  const tile=s.set.find(t=>t.id==='d2-3');tile.generation=2;tile.powerMultiplier=2;tile.upgrade=2;byTile(s,'d2-3').tile={...tile};
  s.recallTileId='d2-3';s.circuitRanks['d2-3']=3;s.hand[0]=null;s.undoFrame={sentinel:true};s.extraPlacements=0;
  const r=g.applyMutation('d2-3','recall');assert(r.ok);assert.equal(r.moveBonus,1);assert.equal(s.extraPlacements,1);
  assert.equal(byTile(s,'d2-3'),undefined);assert.equal(s.hand[0].id,'d2-3');assert.equal(s.hand[0].powerMultiplier,2);assert.equal(s.hand[0].upgrade,2);assert.equal(s.circuitRanks['d2-3'],3);assert.equal(s.recallTileId,'d2-3');
  assert.equal(s.recallUsedStage,0);assert.equal(g.mutationOptions('d2-3').reason,'used');assert.equal(s.undoFrame,null);
});

check('active HINGE tile and pivot are protected from PIVOT surgery',()=>{
  const g=G.createGame(E,{seed:4806}),s=setMachine(g,[['d2-2',6,4,1],['d2-3',6,8,0]]);s.pivotTileId='d2-3';s.hingeTileId='d4-5';s.hingeState={tileId:'d4-5',pivotTileId:'d2-3',positions:[],active:0};
  const info=g.mutationOptions('d2-3');assert.equal(info.available,false);assert.equal(info.options.length,0);
});

check('legacy MIRROR/TWIN/GATE state migrates without restoring SCRAP/SWAP',()=>{
  const g=G.createGame(E,{seed:4807}),saved=g.exportState();delete saved.state.pivotTileId;delete saved.state.recallTileId;
  saved.state.mirrorTileId='d2-6';saved.state.twinTileId='d1-6';saved.state.gateTileId='d0-5';saved.state.fanTileId='d1-3';saved.state.crownTileId='d3-4';saved.state.mutationUseRound={mirror:0,pivot:null,recall:null,swap:null};
  const restored=G.createGame(E,{seed:1});assert(restored.restoreState(saved));const rs=restored.state(),snap=restored.snapshot();
  assert.equal(rs.pivotTileId,'d2-6','MIRROR assignment wins when it exists');assert.equal(rs.recallTileId,'d1-6');assert.equal(rs.mutationUseRound.pivot,0);
  for(const field of ['mirrorTileId','twinTileId','gateTileId','fanTileId','crownTileId','scrapTileId','swapTileId'])assert.equal(field in rs,false);
  assert.deepEqual(snap.tileMods.recall,['d1-6']);assert.deepEqual(snap.tileMods.pivot,['d2-6']);assert.deepEqual(P.tileViewModel(rs.set.find(t=>t.id==='d1-6'),rs).modifiers.map(m=>m.label),['RC']);
});

check('protected route comparator and scoring arithmetic remain unchanged by physical Mutation mods',()=>{
  const source=fs.readFileSync(path.join(__dirname,'..','engine.js'),'utf8');
  const traversalsIndex=source.indexOf('const at=a.traversals||0,bt=b.traversals||0'),outputIndex=source.indexOf('const scoreCmp=SCORE.compare('),tailIndex=source.indexOf("const av=[a.rebounds||0,(a.path||[]).length]");
  assert(traversalsIndex>=0&&outputIndex>traversalsIndex&&tailIndex>outputIndex,'route comparator remains protected');
  for(const id of ['pivot','recall'])assert.doesNotMatch(source,new RegExp("mods\\\\.has\\\\('"+id+"'\\\\).*modMultiplier"));
});
console.log(checks+' current Mutation regressions passed');
