const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const D=require('../data.js'),E=require('../engine.js'),G=require('../game.js'),M=require('../mods.js'),C=require('../circuits.js'),P=require('../presentation.js'),H=require('../help.js');

E.setBoardSize(30,40);
function piece(a,b,x,y,rr,id){const p=E.pieceFrom({a,b},x,y,0,rr,id);p.tile={id:`tile-${id}`,a,b,upgrade:0,powerMultiplier:1};return p}
function op(pieceId,value){return{type:'op',piece:pieceId,entryHalf:0,exitHalf:1,entrySide:'L',exitSide:'R',value,op:value===0?'zero':value%2?'multiply':'add',before:10,after:10,add:0,factor:0,powerMultiplier:1}}
function replay(pieces,modId,pieceId,{value=2,foundationAge=0,knotCycles=0}={}){
  const base={output:10,gain:0,path:[{piece:pieceId}],segments:[{piece:pieceId}],events:[op(pieceId,value)],reason:'fixture',traversals:1,rebounds:0};
  const result=E.replaySelectedScoring(base,10,{pieces,modIdsByPiece:new Map([[pieceId,new Set([modId])]]),foundationAgeByPiece:new Map([[pieceId,foundationAge]]),knotCycleCountByPiece:new Map([[pieceId,knotCycles]]),foundationLowMarkets:D.FOUNDATION_LOW_MARKETS,foundationHighMarkets:D.FOUNDATION_HIGH_MARKETS,foundationLowMultiplier:D.FOUNDATION_LOW_MOD_MULTIPLIER,foundationHighMultiplier:D.FOUNDATION_HIGH_MOD_MULTIPLIER,knotMultiplier:D.KNOT_MOD_MULTIPLIER,mirrorMultiplier:D.MIRROR_MOD_MULTIPLIER});
  assert.deepEqual(result.path,base.path,'Batch D must not rewrite selected routing');
  assert.deepEqual(result.segments,base.segments,'Batch D must not rewrite selected route segments');
  return result
}
function fakeMarket(g,id){const s=g.state();s.shopOpen=true;s.shopType='market';s.shopOffers=[id];s.marketBuys=[];s.cleared=true;s.intermissionResolved=false;s.nextShopType='market';s.coins=100;return s}
function setPlaced(g,ids){const s=g.state();s.pieces=ids.map((id,i)=>{const t=s.set.find(t=>t.id===id),p=E.pieceFrom(t,2+i*6,8,0,0,i+1);p.tile={...t};return p});s.placedTileIds=[...ids];return s}

assert.equal(D.VERSION,'0.44.3');
assert.deepEqual(['foundation','knot','mirror','mint'].map(id=>M.get(id).collectionCode),['FD','KN','MR','MT']);
assert.deepEqual([D.FOUNDATION_LOW_MOD_MULTIPLIER,D.FOUNDATION_HIGH_MOD_MULTIPLIER,D.KNOT_MOD_MULTIPLIER,D.MIRROR_MOD_MULTIPLIER,D.MINT_COINS],[2,3,4,3,1]);

{
  const p=piece(2,4,6,8,0,1);
  let r=replay([p],'foundation',1,{foundationAge:0});assert.equal(r.events[0].foundation,false);assert.equal(r.events[0].modMultiplier,1);
  r=replay([p],'foundation',1,{foundationAge:1});assert.equal(r.events[0].foundation,true);assert.equal(r.events[0].modMultiplier,2);assert.equal(r.output,14);
  r=replay([p],'foundation',1,{foundationAge:3});assert.equal(r.events[0].modMultiplier,3);assert.equal(r.output,16);
}
{
  const graph=new Map([['k',new Set(['a','b','c'])],['a',new Set(['k','x'])],['b',new Set(['k','x'])],['c',new Set(['k','y'])],['x',new Set(['a','b','y'])],['y',new Set(['x','c'])]]);
  const sigs=C.cycleSignaturesThrough(graph,'k',4);assert(sigs.length>=2,'KNOT helper must expose two deterministic overlapping cycle signatures');assert.deepEqual(sigs,[...sigs].sort());
  const sharedPair=new Map([['k',new Set(['a','b'])],['a',new Set(['k','x','y'])],['b',new Set(['k','x','y'])],['x',new Set(['a','b'])],['y',new Set(['a','b'])]]);
  assert.equal(C.cycleSignaturesThrough(sharedPair,'k',4).length,2,'KNOT must count two distinct cycles even when they share the same two neighbours at the tile');
  let r=replay([piece(1,5,6,8,0,1)],'knot',1,{knotCycles:1});assert.equal(r.events[0].knot,false);assert.equal(r.events[0].modMultiplier,1);
  r=replay([piece(1,5,6,8,0,1)],'knot',1,{knotCycles:2});assert.equal(r.events[0].knot,true);assert.equal(r.events[0].modMultiplier,4);assert.equal(r.output,18);
}
{
  const target=piece(2,3,6,8,0,1),left=piece(2,5,4,8,2,2),right=piece(3,5,10,8,0,3);
  let r=replay([target,left,right],'mirror',1);assert.equal(r.events[0].mirror,true);assert.equal(r.events[0].modMultiplier,3);assert.equal(r.output,16);
  const mismatch=piece(3,6,10,8,0,4);r=replay([target,left,mismatch],'mirror',1);assert.equal(r.events[0].mirror,false);assert.equal(r.events[0].modMultiplier,1);
}
{
  const g=G.createGame(E,{seed:4101,STARTING_COINS:100}),s=setPlaced(g,['d0-2','d1-5','d2-6','d5-6']);
  s.cornerTileId='d1-5';s.marketCount=2;
  fakeMarket(g,'foundation');const buy=g.buyMarketMod('foundation');assert(buy.ok&&buy.pending);assert(g.chooseMarketModTile('d0-2').ok);assert.equal(s.foundationTileId,'d0-2');assert.equal(s.foundationAssignedMarket,2);
  fakeMarket(g,'mirror');const info=g.marketOfferInfo('mirror');assert(info.targetTiles.every(t=>t.a!==t.b),'MIRROR Market assignment excludes doubles');assert(!info.targetTiles.some(t=>t.id==='d1-5'),'one-Mod-per-tile remains enforced');
}
{
  const g=G.createGame(E,{seed:4102,STARTING_COINS:0}),s=setPlaced(g,['d5-6']);s.mintTileId='d5-6';
  const p=s.pieces[0],tile=s.set.find(t=>t.id==='d5-6'),sim={output:5,events:[{type:'op',piece:p.id,value:6,op:'add',before:0,after:5,add:5,factor:0,powerMultiplier:1}],reason:'fixture',rebounds:0,path:[],segments:[],search:{starts:1,leaves:1,expanded:1,truncated:false}};
  let r=g.finishPlacement({ok:true,tile,p,trigger:1,sim});assert.equal(r.mintCoins,1);assert.equal(s.coins,1);assert.equal(s.mintPaidRound,0);
  r=g.finishPlacement({ok:true,tile,p,trigger:1,sim});assert.equal(r.mintCoins,0);assert.equal(s.coins,1,'MINT must pay only once per round');
  s.round=1;r=g.finishPlacement({ok:true,tile,p,trigger:1,sim});assert.equal(r.mintCoins,1);assert.equal(s.coins,2,'MINT becomes available on the next round');
}
{
  const g=G.createGame(E,{seed:4103}),s=setPlaced(g,['d0-2','d1-5','d2-6','d5-6']);
  s.foundationTileId='d0-2';s.knotTileId='d1-5';s.mirrorTileId='d2-6';s.mintTileId='d5-6';s.marketCount=5;s.foundationAssignedMarket=2;s.mintPaidRound=0;
  const saved=g.exportState(),restored=G.createGame(E,{seed:1});assert(restored.restoreState(saved));
  const rs=restored.state(),snap=restored.snapshot();assert.equal(rs.foundationTileId,'d0-2');assert.equal(rs.knotTileId,'d1-5');assert.equal(rs.mirrorTileId,'d2-6');assert.equal(rs.mintTileId,'d5-6');assert.equal(rs.marketCount,5);assert.equal(rs.foundationAssignedMarket,2);assert.equal(rs.mintPaidRound,0);
  assert.deepEqual(snap.tileMods.foundation,['d0-2']);assert.deepEqual(snap.tileMods.knot,['d1-5']);assert.deepEqual(snap.tileMods.mirror,['d2-6']);assert.deepEqual(snap.tileMods.mint,['d5-6']);assert.equal(snap.tileModState.foundationAge,3);
  assert.match(restored.debugText(),/FD=d0-2 · KN=d1-5 · MR=d2-6 · MT=d5-6/);
  assert.deepEqual(P.tileViewModel(rs.set.find(t=>t.id==='d2-6'),rs).modifiers.map(m=>m.label),['MR']);assert.equal(H.inspectTile(rs,'d0-2').currentMachineState.foundationAge,3);assert.equal(H.inspectTile(rs,'d5-6').currentMachineState.mintAvailable,false,'restored MINT payout must remain spent for the current round');
}
{
  const g=G.createGame(E,{seed:4104}),s=g.state();s.cleared=true;s.intermissionResolved=false;s.nextShopType='market';assert.equal(s.marketCount,0);assert(g.openIntermission());assert.equal(s.marketCount,1,'opening one Market advances FOUNDATION age clock exactly once');
}
const engineSource=fs.readFileSync(path.join(__dirname,'..','engine.js'),'utf8');
assert.match(engineSource,/const av=\[a\.traversals\|\|0,a\.output\|\|0,a\.rebounds\|\|0,\(a\.path\|\|\[\]\)\.length\]/,'route comparator remains protected');
assert.doesNotMatch(engineSource,/mint.*output\s*[+*]=/i,'MINT must never change Score arithmetic');
console.log('v0.44.3 Batch D advanced Mod regressions passed');
