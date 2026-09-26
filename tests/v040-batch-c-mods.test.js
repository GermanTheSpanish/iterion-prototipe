const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const D=require('../data.js'),E=require('../engine.js'),G=require('../game.js'),M=require('../mods.js'),P=require('../presentation.js'),H=require('../help.js');

E.setBoardSize(30,40);
function piece(a,b,x,y,rr,id,powerMultiplier=1,upgrade=0){const p=E.pieceFrom({a,b},x,y,0,rr,id);p.tile={id:`tile-${id}`,a,b,powerMultiplier,upgrade};return p}
function op(pieceId,value){return{type:'op',piece:pieceId,entryHalf:0,exitHalf:1,entrySide:'L',exitSide:'R',value,op:value===0?'zero':value%2?'multiply':'add',before:10,after:10,add:0,factor:0,powerMultiplier:1}}
function replay(pieces,modId,pieceId,{value=2,circuitRank=0}={}){
  const base={output:10,gain:0,path:[{piece:pieceId}],segments:[{piece:pieceId}],events:[op(pieceId,value)],reason:'fixture',traversals:1,rebounds:0};
  const result=E.replaySelectedScoring(base,10,{pieces,modIdsByPiece:new Map([[pieceId,new Set([modId])]]),circuitRankByPiece:new Map([[pieceId,circuitRank]]),resonatorLowMultiplier:D.RESONATOR_LOW_MOD_MULTIPLIER,resonatorHighMultiplier:D.RESONATOR_HIGH_MOD_MULTIPLIER,resonatorHighRankThreshold:D.RESONATOR_HIGH_RANK_THRESHOLD,forgeLowMultiplier:D.FORGE_LOW_MOD_MULTIPLIER,forgeHighMultiplier:D.FORGE_HIGH_MOD_MULTIPLIER,forgeHighUpgradeThreshold:D.FORGE_HIGH_UPGRADE_THRESHOLD});
  assert.deepEqual(result.path,base.path,'system synergy Mods must not rewrite selected routing');
  assert.deepEqual(result.segments,base.segments,'system synergy Mods must not rewrite route segments');
  return result
}
function fakeMarket(g,id){const s=g.state();s.shopOpen=true;s.shopType='market';s.shopOffers=[id];s.marketBuys=[];s.cleared=true;s.intermissionResolved=false;s.nextShopType='market';s.coins=100;return s}
function setPlaced(g,ids){const s=g.state();s.pieces=ids.map((id,i)=>{const t=s.set.find(t=>t.id===id),p=E.pieceFrom(t,2+i*6,8,0,0,i+1);p.tile={...t};return p});s.placedTileIds=[...ids];return s}

assert.equal(D.VERSION,'0.46.0');
assert.deepEqual([D.RESONATOR_LOW_MOD_MULTIPLIER,D.RESONATOR_HIGH_MOD_MULTIPLIER,D.FORGE_LOW_MOD_MULTIPLIER,D.FORGE_HIGH_MOD_MULTIPLIER],[2,3,2,3]);
assert.deepEqual(['resonator','forge'].map(id=>M.get(id).collectionCode),['RS','FG']);
for(const retired of ['relay','coupler'])assert.equal(M.get(retired),null,`${retired} was replaced by Signal v2`);

{
  const target=piece(2,3,6,8,0,1);
  const dormant=replay([target],'resonator',1,{circuitRank:0});assert.equal(dormant.events[0].resonator,false);assert.equal(dormant.events[0].modMultiplier,1);
  const low=replay([target],'resonator',1,{circuitRank:2});assert.equal(low.events[0].resonator,true);assert.equal(low.events[0].modMultiplier,2);assert.equal(low.output,14);
  const high=replay([target],'resonator',1,{circuitRank:3});assert.equal(high.events[0].modMultiplier,3);assert.equal(high.output,16);
}
{
  const star1=replay([piece(2,3,6,8,0,1,1,1)],'forge',1);assert.equal(star1.events[0].forge,true);assert.equal(star1.events[0].upgradeTier,1);assert.equal(star1.events[0].modMultiplier,2);
  const star3=replay([piece(2,3,6,8,0,1,1,3)],'forge',1);assert.equal(star3.events[0].modMultiplier,3);assert.equal(star3.output,16);
}
{
  const g=G.createGame(E,{seed:4001,STARTING_COINS:100}),s=g.state();
  s.set.find(t=>t.id==='d2-3').upgrade=2;setPlaced(g,['d1-1','d1-2','d2-3']);s.cornerTileId='d1-2';
  fakeMarket(g,'forge');const forge=g.marketOfferInfo('forge');assert.deepEqual(forge.targetTiles.map(t=>t.id),['d2-3'],'FORGE must target already-starred unmodified tiles only');
  fakeMarket(g,'resonator');const resonator=g.marketOfferInfo('resonator');assert(resonator.targetTiles.some(t=>t.id==='d1-1'),'RESONATOR may be assigned before Circuit rank appears');assert(!resonator.targetTiles.some(t=>t.id==='d1-2'));
}
{
  const g=G.createGame(E,{seed:4002}),s=setPlaced(g,['d4-6','d5-5']);
  s.resonatorTileId='d4-6';s.forgeTileId='d5-5';s.circuitRanks['d4-6']=3;s.set.find(t=>t.id==='d5-5').upgrade=3;s.pieces.find(p=>p.tile.id==='d5-5').tile.upgrade=3;
  const saved=g.exportState(),restored=G.createGame(E,{seed:1});assert(restored.restoreState(saved));
  const rs=restored.state(),snap=restored.snapshot();assert.equal(rs.resonatorTileId,'d4-6');assert.equal(rs.forgeTileId,'d5-5');
  assert.deepEqual(snap.tileMods.resonator,['d4-6']);assert.deepEqual(snap.tileMods.forge,['d5-5']);
  assert.match(restored.debugText(),/RS=d4-6 · FG=d5-5/);
  assert.deepEqual(P.tileViewModel(rs.set.find(t=>t.id==='d4-6'),rs).modifiers.map(m=>m.label),['RS']);
  assert.equal(H.inspectTile(rs,'d5-5').modifiers[0].id,'forge');
}
const engineSource=fs.readFileSync(path.join(__dirname,'..','engine.js'),'utf8');
assert.match(engineSource,/const av=\[a\.traversals\|\|0,a\.output\|\|0,a\.rebounds\|\|0,\(a\.path\|\|\[\]\)\.length\]/,'route comparator remains protected');
assert.doesNotMatch(engineSource,/circuitRanks\.set|tile\.upgrade\s*[+\-]?=/,'synergy scoring must observe Circuit/Stars without mutating them');
console.log('v0.46.0 retained system synergy Mod regressions passed');
