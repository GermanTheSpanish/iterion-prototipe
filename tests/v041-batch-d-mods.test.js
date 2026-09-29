const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const D=require('../data.js'),E=require('../engine.js'),G=require('../game.js'),M=require('../mods.js'),C=require('../circuits.js'),P=require('../presentation.js'),H=require('../help.js');

E.setBoardSize(30,40);
function piece(a,b,x,y,rr,id){const p=E.pieceFrom({a,b},x,y,0,rr,id);p.tile={id:`tile-${id}`,a,b,upgrade:0,powerMultiplier:1};return p}
function op(pieceId,value){return{type:'op',piece:pieceId,entryHalf:0,exitHalf:1,entrySide:'L',exitSide:'R',value,op:value===0?'zero':value%2?'multiply':'add',before:10,after:10,add:0,factor:0,powerMultiplier:1}}
function replay(pieces,modId,pieceId,{value=2,knotCycles=0}={}){
  const base={output:10,gain:0,path:[{piece:pieceId}],segments:[{piece:pieceId}],events:[op(pieceId,value)],reason:'fixture',traversals:1,rebounds:0};
  const result=E.replaySelectedScoring(base,10,{pieces,modIdsByPiece:new Map([[pieceId,new Set([modId])]]),knotCycleCountByPiece:new Map([[pieceId,knotCycles]]),knotMultiplier:D.KNOT_MOD_MULTIPLIER});
  assert.deepEqual(result.path,base.path);assert.deepEqual(result.segments,base.segments);return result
}
function fakeMarket(g,id){const s=g.state();s.shopOpen=true;s.shopType='market';s.shopOffers=[id];s.marketBuys=[];s.cleared=true;s.intermissionResolved=false;s.nextShopType='market';s.coins=100;return s}
function setPlaced(g,ids){const s=g.state();s.pieces=ids.map((id,i)=>{const t=s.set.find(t=>t.id===id),p=E.pieceFrom(t,2+i*6,8,0,0,i+1);p.tile={...t};return p});s.placedTileIds=[...ids];return s}

assert.deepEqual(['foundation','knot','mirror','mint'].map(id=>M.get(id).collectionCode),['FD','KN','MR','MT']);
assert.equal(M.get('mirror').category,'mutation');assert.equal(D.MIRROR_MOD_MULTIPLIER,undefined);
{
  const p=piece(2,4,6,8,0,1),r=replay([p],'foundation',1);assert.equal(r.events[0].foundation,true);assert.equal(r.events[0].modMultiplier,1);assert.equal(r.output,12);
}
{
  const graph=new Map([['k',new Set(['a','b','c'])],['a',new Set(['k','x'])],['b',new Set(['k','x'])],['c',new Set(['k','y'])],['x',new Set(['a','b','y'])],['y',new Set(['x','c'])]]);
  const sigs=C.cycleSignaturesThrough(graph,'k',4);assert(sigs.length>=2);assert.deepEqual(sigs,[...sigs].sort());
  let r=replay([piece(1,5,6,8,0,1)],'knot',1,{knotCycles:1});assert.equal(r.events[0].knot,false);assert.equal(r.events[0].modMultiplier,1);
  r=replay([piece(1,5,6,8,0,1)],'knot',1,{knotCycles:2});assert.equal(r.events[0].knot,true);assert.equal(r.events[0].modMultiplier,4);assert.equal(r.output,18);
}
{
  const target=piece(2,3,6,8,0,1),r=replay([target],'mirror',1);assert.equal(r.events[0].modMultiplier,1);assert.equal(r.output,12,'MIRROR is physical surgery and never a score multiplier');
}
{
  const g=G.createGame(E,{seed:4101,STARTING_COINS:100}),s=setPlaced(g,['d0-2','d1-5','d5-6']);s.cornerTileId='d1-5';s.marketCount=2;
  fakeMarket(g,'foundation');const buy=g.buyMarketMod('foundation');assert(buy.ok&&buy.pending);assert(g.chooseMarketModTile('d0-2').ok);assert.equal(s.foundationTileId,'d0-2');assert.equal(s.foundationAssignedMarket,2);assert.equal(s.foundationLastPayoutMarket,2);
}
{
  const g=G.createGame(E,{seed:4102,STARTING_COINS:0}),s=setPlaced(g,['d5-6']);s.mintTileId='d5-6';
  const p=s.pieces[0],tile=s.set.find(t=>t.id==='d5-6'),sim={output:5,events:[{type:'op',piece:p.id,value:6,op:'add',before:0,after:5,add:5,factor:0,powerMultiplier:1}],reason:'fixture',rebounds:0,path:[],segments:[],search:{starts:1,leaves:1,expanded:1,truncated:false}};
  let r=g.finishPlacement({ok:true,tile,p,trigger:1,sim});assert.equal(r.mintCoins,1);assert.equal(s.coins,1);assert.equal(s.mintPaidRound,0);
  r=g.finishPlacement({ok:true,tile,p,trigger:1,sim});assert.equal(r.mintCoins,0);assert.equal(s.coins,1);
  s.round=1;r=g.finishPlacement({ok:true,tile,p,trigger:1,sim});assert.equal(r.mintCoins,1);assert.equal(s.coins,2);
}
{
  const g=G.createGame(E,{seed:4103}),s=setPlaced(g,['d0-2','d2-6','d5-6']);s.foundationTileId='d0-2';s.mirrorTileId='d2-6';s.mintTileId='d5-6';s.marketCount=5;s.foundationAssignedMarket=2;s.foundationLastPayoutMarket=4;s.mintPaidRound=0;s.mutationUseRound.mirror=0;
  const restored=G.createGame(E,{seed:1});assert(restored.restoreState(g.exportState()));const rs=restored.state(),snap=restored.snapshot();
  assert.equal(rs.foundationTileId,'d0-2');assert.equal(rs.mirrorTileId,'d2-6');assert.equal(rs.mintTileId,'d5-6');assert.equal(rs.foundationLastPayoutMarket,4);assert.equal(rs.mutationUseRound.mirror,0);
  assert.deepEqual(snap.tileMods.foundation,['d0-2']);assert.equal(snap.tileModState.foundationProgress,1);
  assert.deepEqual(P.tileViewModel(rs.set.find(t=>t.id==='d2-6'),rs).modifiers.map(m=>m.label),['MR']);assert.equal(H.inspectTile(rs,'d0-2').currentMachineState.foundationProgress,1);
}
const engineSource=fs.readFileSync(path.join(__dirname,'..','engine.js'),'utf8');
const traversalsIndex=engineSource.indexOf('const at=a.traversals||0,bt=b.traversals||0'),outputIndex=engineSource.indexOf('const scoreCmp=SCORE.compare('),tailIndex=engineSource.indexOf("const av=[a.rebounds||0,(a.path||[]).length]");
assert(traversalsIndex>=0&&outputIndex>traversalsIndex&&tailIndex>outputIndex,'route comparator remains protected: traversals → exact output → rebounds → path length');
assert.doesNotMatch(engineSource,/mods\.has\('mirror'\).*modMultiplier/,'MIRROR must not alter scoring magnitude');
console.log('Mutation v2 retained Batch D and Foundation regressions passed');
