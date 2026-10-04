const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const D=require('../data.js'),E=require('../engine.js'),G=require('../game.js'),M=require('../mods.js');

E.setBoardSize(30,40);
let checks=0;
function check(name,fn){fn();checks++;console.log('Signal: '+name)}
function piece(a,b,x,y,rr,id){const p=E.pieceFrom({a,b},x,y,0,rr,id);p.tile={id:'tile-'+id,a,b};return p}
function fakeMarket(g,id){const s=g.state();s.shopOpen=true;s.shopType='market';s.shopOffers=[id];s.marketBuys=[];s.cleared=true;s.intermissionResolved=false;s.nextShopType='market';s.coins=100;return s}

check('active Signal roster keeps distinct double and HINGE identities',()=>{
  assert.equal(D.VERSION,'0.66.0');
  assert.deepEqual(['double-double','double-echo','triple-double','hinge'].map(id=>M.get(id).category),Array(4).fill('signal'));
  assert.deepEqual(['double-double','double-echo','triple-double','hinge'].map(id=>M.get(id).collectionCode),['DD','DE','TD','HG']);
  for(const id of ['diode','return','merge','sequence','complement','relay','coupler'])assert.equal(M.get(id),null);
});

check('HINGE exposes a deterministic mirrored state and moves once during routing',()=>{
  const input=piece(1,2,2,8,0,1),hinge=piece(2,4,6,8,0,2),pivot=piece(4,4,10,8,0,3),ps=[input,hinge,pivot];
  const alternates=E.hingeAlternates(hinge,ps);assert(alternates.length>0);const alt=alternates[0];assert.equal(alt.pivotPieceId,3);
  const r=E.bestSignal(1,ps,{initialOutput:1,hingePieceId:2,hingePivotPieceId:3,hingeTargetPlacement:alt.placement,modIdsByPiece:new Map([[2,new Set(['hinge'])]])});
  assert.equal(r.events.filter(e=>e.type==='hinge-move').length,1);assert(r.hingeFinalPlacement);assert.deepEqual(r.hingeFinalPlacement,alt.placement);assert(r.events.some(e=>e.type==='op'&&e.piece===3));
});

check('HINGE Market stores pivot and both physical states deterministically',()=>{
  const g=G.createGame(E,{seed:4602,STARTING_COINS:100}),s=g.state(),hingeTile=s.set.find(t=>t.id==='d2-4'),pivotTile=s.set.find(t=>t.id==='d4-4');
  const hinge=E.pieceFrom(hingeTile,6,8,0,0,1);hinge.tile={...hingeTile};const pivot=E.pieceFrom(pivotTile,10,8,0,0,2);pivot.tile={...pivotTile};s.pieces=[hinge,pivot];s.placedTileIds=[hingeTile.id,pivotTile.id];
  fakeMarket(g,'hinge');const info=g.marketOfferInfo('hinge');assert(info.targetTiles.some(t=>t.id===hingeTile.id));assert(g.buyMarketMod('hinge').ok);const installed=g.chooseMarketModTile(hingeTile.id);assert(installed.ok);
  assert.equal(s.hingeTileId,hingeTile.id);assert.equal(s.hingeState.tileId,hingeTile.id);assert.equal(s.hingeState.pivotTileId,pivotTile.id);assert.equal(s.hingeState.positions.length,2);
  const restored=G.createGame(E,{seed:1});assert(restored.restoreState(g.exportState()));assert.deepEqual(restored.state().hingeState,s.hingeState);
});

check('retired Signal assignments and pending targets are pruned without changing the route comparator',()=>{
  const g=G.createGame(E,{seed:4603}),saved=g.exportState();saved.state.diodeTileId='d2-4';saved.state.diodeInHalf=1;saved.state.returnTileId='d2-5';saved.state.mergeTileId='d3-6';
  saved.state.pendingModPlacement={mod:'return',stage:'target',eligibleTileIds:['d2-5'],sourceTileId:null,previousTileId:null,recordIndex:0};saved.state.shopOffers=['diode','hinge','merge'];
  const restored=G.createGame(E,{seed:1});assert(restored.restoreState(saved));const rs=restored.state();
  for(const field of ['diodeTileId','diodeInHalf','returnTileId','mergeTileId'])assert.equal(field in rs,false);
  assert.equal(rs.pendingModPlacement,null);assert.deepEqual(rs.shopOffers,['hinge']);
  const source=fs.readFileSync(path.join(__dirname,'..','engine.js'),'utf8');
  const traversalsIndex=source.indexOf('const at=a.traversals||0,bt=b.traversals||0'),outputIndex=source.indexOf('const scoreCmp=SCORE.compare('),tailIndex=source.indexOf("const av=[a.rebounds||0,(a.path||[]).length]");
  assert(traversalsIndex>=0&&outputIndex>traversalsIndex&&tailIndex>outputIndex,'route comparator remains protected');
});
console.log(checks+' current Signal regressions passed');
