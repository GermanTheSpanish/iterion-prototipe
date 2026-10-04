const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const D=require('../data.js'),E=require('../engine.js'),G=require('../game.js'),M=require('../mods.js'),P=require('../presentation.js'),H=require('../help.js');

E.setBoardSize(30,40);
function piece(a,b,x,y,rr,id,upgrade=0){const p=E.pieceFrom({a,b},x,y,0,rr,id);p.tile={id:'tile-'+id,a,b,upgrade,powerMultiplier:1};return p}
function op(pieceId,value=2){return{type:'op',piece:pieceId,entryHalf:0,exitHalf:1,entrySide:'L',exitSide:'R',value,op:value%2?'multiply':'add',before:0,after:0,add:0,factor:0,powerMultiplier:1}}
function replayBank(coins,{circuitRank=0,upgrade=0}={}){
  const p=piece(2,3,6,8,0,1,upgrade),base={output:0,gain:0,path:[{piece:1}],segments:[{piece:1}],events:[op(1,2)],reason:'fixture',traversals:1,rebounds:0};
  return E.replaySelectedScoring(base,10,{pieces:[p],modIdsByPiece:new Map([[1,new Set(['bank'])]]),circuitRankByPiece:new Map([[1,circuitRank]]),economyCoins:coins,bankLowCoins:D.BANK_LOW_COINS,bankHighCoins:D.BANK_HIGH_COINS,bankLowMultiplier:D.BANK_LOW_MOD_MULTIPLIER,bankHighMultiplier:D.BANK_HIGH_MOD_MULTIPLIER})
}
function setPlaced(g,ids){const s=g.state();s.pieces=ids.map((id,i)=>{const t=s.set.find(t=>t.id===id),p=E.pieceFrom(t,2+i*6,8,0,0,i+1);p.tile={...t};return p});s.placedTileIds=[...ids];return s}

assert.equal(D.VERSION,'0.68.0');assert.equal(D.ENGINE_VERSION,'0.21.0-peaks-ridge-v1');
assert.equal(M.get('bank').collectionCode,'BK');assert.equal(M.get('toll'),null);assert.equal(D.MARKET_TOLL_COST,undefined);

{
  const low=replayBank(10,{circuitRank:0,upgrade:0}),developed=replayBank(10,{circuitRank:5,upgrade:3});
  assert.equal(low.events[0].bankMultiplier,2);assert.equal(developed.events[0].bankMultiplier,2);assert.equal(low.output,developed.output,'BANK must depend on wallet, not Circuit rank or Stars');
}
{
  const g=G.createGame(E,{seed:4002}),s=setPlaced(g,['d4-6','d5-5']);s.bankTileId='d4-6';s.circuitRanks['d4-6']=3;s.set.find(t=>t.id==='d5-5').upgrade=3;s.pieces.find(p=>p.tile.id==='d5-5').tile.upgrade=3;
  const saved=g.exportState();saved.state.tollTileId='d5-5';saved.state.tollArmed=true;
  const restored=G.createGame(E,{seed:1});assert(restored.restoreState(saved));const rs=restored.state(),snap=restored.snapshot();
  assert.equal(rs.bankTileId,'d4-6');assert.equal('tollTileId' in rs,false);assert.equal('tollArmed' in rs,false);
  assert.deepEqual(snap.tileMods.bank,['d4-6']);assert.deepEqual(P.tileViewModel(rs.set.find(t=>t.id==='d4-6'),rs).modifiers.map(m=>m.label),['BK']);
  assert.equal(H.inspectTile(rs,'d5-5').modifiers.length,0);assert.equal(H.inspectTile(rs,'d5-5').currentMachineState.upgradeTier,3,'retiring TOLL must not alter physical Star state');
}
const engineSource=fs.readFileSync(path.join(__dirname,'..','engine.js'),'utf8');
const traversalsIndex=engineSource.indexOf('const at=a.traversals||0,bt=b.traversals||0'),outputIndex=engineSource.indexOf('const scoreCmp=SCORE.compare('),tailIndex=engineSource.indexOf("const av=[a.rebounds||0,(a.path||[]).length]");
assert(traversalsIndex>=0&&outputIndex>traversalsIndex&&tailIndex>outputIndex,'route comparator remains protected: traversals → exact output → rebounds → path length');
console.log('v0.68.0 Economy replacement regressions passed');
