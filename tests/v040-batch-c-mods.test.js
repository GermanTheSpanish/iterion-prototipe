const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const D=require('../data.js'),E=require('../engine.js'),G=require('../game.js'),M=require('../mods.js'),P=require('../presentation.js'),H=require('../help.js');

E.setBoardSize(30,40);
function piece(a,b,x,y,rr,id,upgrade=0){const p=E.pieceFrom({a,b},x,y,0,rr,id);p.tile={id:`tile-${id}`,a,b,upgrade,powerMultiplier:1};return p}
function op(pieceId,value=2){return{type:'op',piece:pieceId,entryHalf:0,exitHalf:1,entrySide:'L',exitSide:'R',value,op:value%2?'multiply':'add',before:0,after:0,add:0,factor:0,powerMultiplier:1}}
function replay(modId,{coins=0,circuitRank=0,upgrade=0,tollArmed=false}={}){
  const p=piece(2,3,6,8,0,1,upgrade),base={output:0,gain:0,path:[{piece:1}],segments:[{piece:1}],events:[op(1,2)],reason:'fixture',traversals:1,rebounds:0};
  return E.replaySelectedScoring(base,10,{pieces:[p],modIdsByPiece:new Map([[1,new Set([modId])]]),circuitRankByPiece:new Map([[1,circuitRank]]),economyCoins:coins,bankLowCoins:D.BANK_LOW_COINS,bankHighCoins:D.BANK_HIGH_COINS,bankLowMultiplier:D.BANK_LOW_MOD_MULTIPLIER,bankHighMultiplier:D.BANK_HIGH_MOD_MULTIPLIER,tollArmed,tollCoins:D.TOLL_COINS})
}
function fakeMarket(g,id){const s=g.state();s.shopOpen=true;s.shopType='market';s.shopOffers=[id];s.marketBuys=[];s.cleared=true;s.intermissionResolved=false;s.nextShopType='market';s.coins=100;return s}
function setPlaced(g,ids){const s=g.state();s.pieces=ids.map((id,i)=>{const t=s.set.find(t=>t.id===id),p=E.pieceFrom(t,2+i*6,8,0,0,i+1);p.tile={...t};return p});s.placedTileIds=[...ids];return s}

assert.equal(D.VERSION,'0.47.0');assert.equal(D.ENGINE_VERSION,'0.17.0-economy-v2');
assert.equal(M.get('resonator'),null);assert.equal(M.get('forge'),null);
assert.deepEqual(['bank','toll'].map(id=>M.get(id).collectionCode),['BK','TL']);

{
  const low=replay('bank',{coins:10,circuitRank:0,upgrade:0}),developed=replay('bank',{coins:10,circuitRank:5,upgrade:3});
  assert.equal(low.events[0].bankMultiplier,2);assert.equal(developed.events[0].bankMultiplier,2);assert.equal(low.output,developed.output,'BANK must depend on wallet, not Circuit rank or Stars');
}
{
  const disarmed=replay('toll',{coins:10,tollArmed:false,upgrade:3}),armed=replay('toll',{coins:10,tollArmed:true,upgrade:0});
  assert.equal(disarmed.events.filter(e=>e.tollRepeat).length,0);assert.equal(armed.events.filter(e=>e.tollRepeat).length,1);assert.equal(armed.events.find(e=>e.type==='toll-spend').amount,1);
}
{
  const g=G.createGame(E,{seed:4001,STARTING_COINS:100}),s=setPlaced(g,['d0-2','d2-3','d5-5']);
  s.set.find(t=>t.id==='d2-3').upgrade=3;s.pieces.find(p=>p.tile.id==='d2-3').tile.upgrade=3;
  fakeMarket(g,'toll');const toll=g.marketOfferInfo('toll');
  assert(toll.targetTiles.some(t=>t.id==='d5-5'),'TOLL can target an unstarred non-zero tile');
  assert(!toll.targetTiles.some(t=>t.id==='d0-2'),'TOLL excludes tiles containing zero');
}
{
  const g=G.createGame(E,{seed:4002}),s=setPlaced(g,['d4-6','d5-5']);s.bankTileId='d4-6';s.tollTileId='d5-5';s.circuitRanks['d4-6']=3;s.set.find(t=>t.id==='d5-5').upgrade=3;s.pieces.find(p=>p.tile.id==='d5-5').tile.upgrade=3;assert(g.setTollArmed(true).ok);
  const restored=G.createGame(E,{seed:1});assert(restored.restoreState(g.exportState()));const rs=restored.state(),snap=restored.snapshot();
  assert.equal(rs.bankTileId,'d4-6');assert.equal(rs.tollTileId,'d5-5');assert.equal(rs.tollArmed,true);
  assert.deepEqual(snap.tileMods.bank,['d4-6']);assert.deepEqual(snap.tileMods.toll,['d5-5']);assert.match(restored.debugText(),/BK=d4-6 · TL=d5-5/);
  assert.deepEqual(P.tileViewModel(rs.set.find(t=>t.id==='d4-6'),rs).modifiers.map(m=>m.label),['BK']);
  assert.equal(H.inspectTile(rs,'d5-5').modifiers[0].id,'toll');assert.equal(H.inspectTile(rs,'d5-5').currentMachineState.upgradeTier,3,'Stars remain physical tile state even though FORGE is retired');
}
const engineSource=fs.readFileSync(path.join(__dirname,'..','engine.js'),'utf8');
assert.match(engineSource,/const av=\[a\.traversals\|\|0,a\.output\|\|0,a\.rebounds\|\|0,\(a\.path\|\|\[\]\)\.length\]/,'route comparator remains protected');
console.log('v0.47.0 Economy replacement regressions passed');
