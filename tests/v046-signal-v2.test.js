const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const D=require('../data.js'),E=require('../engine.js'),G=require('../game.js'),M=require('../mods.js'),P=require('../presentation.js');

E.setBoardSize(30,40);
let checks=0;
function check(name,fn){fn();checks++;console.log(`Signal v2: ${name}`)}
function piece(a,b,x,y,rr,id){const p=E.pieceFrom({a,b},x,y,0,rr,id);p.tile={id:`tile-${id}`,a,b};return p}
function fakeMarket(g,id){const s=g.state();s.shopOpen=true;s.shopType='market';s.shopOffers=[id];s.marketBuys=[];s.cleared=true;s.intermissionResolved=false;s.nextShopType='market';s.coins=100;return s}

check('roster replaces four generic multipliers without expanding the 28-Mod collection',()=>{
  assert.equal(D.VERSION,'0.47.0');assert.equal(D.ENGINE_VERSION,'0.17.0-economy-v2');
  assert.deepEqual(['diode','return','merge','hinge'].map(id=>M.get(id).collectionCode),['DI','RT','MG','HG']);
  assert.deepEqual(['diode','return','merge','hinge'].map(id=>M.get(id).category),['signal','signal','signal','signal']);
  for(const id of ['sequence','complement','relay','coupler'])assert.equal(M.get(id),null);
  assert.equal(M.collection().filter(slot=>slot.mod).length,28);
});

check('DIODE allows IN entry and terminates reverse entry before operating',()=>{
  const ps=[piece(2,3,2,8,0,1),piece(3,4,6,8,0,2),piece(4,5,10,8,0,3)];
  const forward=E.bestSignal(1,ps,{initialOutput:1,diodePieceId:3,diodeInHalf:0,modIdsByPiece:new Map([[3,new Set(['diode'])]])});
  assert(forward.events.some(e=>e.type==='op'&&e.piece===3));assert(!forward.events.some(e=>e.type==='diode-block'));assert.equal(forward.traversals,2);
  const blocked=E.bestSignal(1,ps,{initialOutput:1,diodePieceId:3,diodeInHalf:1,modIdsByPiece:new Map([[3,new Set(['diode'])]])});
  assert(blocked.events.some(e=>e.type==='diode-block'&&e.piece===3));assert(!blocked.events.some(e=>e.type==='op'&&e.piece===3));assert.equal(blocked.output,5);
});

check('RETURN resets to its post-operation checkpoint and traverses a second exit once',()=>{
  const ps=[piece(2,3,2,8,0,1),piece(3,4,6,8,0,2),piece(4,5,10,8,0,3),piece(4,2,8,10,1,4)];
  const base=E.bestSignal(1,ps,{initialOutput:2}),returned=E.bestSignal(1,ps,{initialOutput:2,returnPieceId:2,modIdsByPiece:new Map([[2,new Set(['return'])]])});
  assert(!base.events.some(e=>e.type==='return'));assert.equal(returned.events.filter(e=>e.type==='return').length,1);
  assert(returned.traversals>base.traversals);assert.equal(new Set(returned.events.filter(e=>e.type==='op').map(e=>e.piece)).size,3);
  const marker=returned.events.find(e=>e.type==='return');assert.equal(marker.piece,2);assert.equal(marker.output,6);
});

check('MERGE replay sums sibling branch Scores then operates the tile once',()=>{
  const ps=[piece(3,3,6,8,0,1),piece(2,4,2,8,0,2),piece(3,5,10,8,0,3),piece(5,1,14,8,0,4)];
  const op=(id,value)=>({type:'op',piece:id,entryHalf:0,exitHalf:1,value,op:value%2?'multiply':'add',before:0,after:0,add:0,factor:0,powerMultiplier:1});
  const events=[
    {type:'signal-fork',piece:1,output:10},
    {type:'signal-start',fork:1,arm:0,output:10},op(2,2),{type:'signal-end',fork:1,arm:0,output:12},
    {type:'signal-start',fork:1,arm:1,output:10},op(3,3),{type:'signal-end',fork:1,arm:1,output:30},
    {type:'signal-merge',fork:1,piece:4,entryHalf:0,output:42},op(4,5),{type:'die',reason:'no-exit'}
  ];
  const raw={output:210,gain:200,path:[],segments:[],events,reason:'no-exit',traversals:4,rebounds:0};
  const replay=E.replaySelectedScoring(raw,10,{pieces:ps,modIdsByPiece:new Map([[4,new Set(['merge'])]])});
  assert.equal(replay.events.find(e=>e.type==='signal-merge').output,42);assert.equal(replay.events.filter(e=>e.type==='op'&&e.piece===4).length,1);assert.equal(replay.output,210);
  const block=P.forkBlock(replay.events,0);assert(block?.merged);assert.equal(block.join.piece,4);assert.equal(block.next,8);
});

check('HINGE exposes a deterministic mirrored state and moves once during routing',()=>{
  const input=piece(1,2,2,8,0,1),hinge=piece(2,4,6,8,0,2),pivot=piece(4,4,10,8,0,3),ps=[input,hinge,pivot];
  const alternates=E.hingeAlternates(hinge,ps);assert(alternates.length>0);const alt=alternates[0];assert.equal(alt.pivotPieceId,3);
  const r=E.bestSignal(1,ps,{initialOutput:1,hingePieceId:2,hingePivotPieceId:3,hingeTargetPlacement:alt.placement,modIdsByPiece:new Map([[2,new Set(['hinge'])]])});
  assert.equal(r.events.filter(e=>e.type==='hinge-move').length,1);assert(r.hingeFinalPlacement);assert.deepEqual(r.hingeFinalPlacement,alt.placement);assert(r.events.some(e=>e.type==='op'&&e.piece===3));
});

check('DIODE Market assignment requires an explicit IN half and survives restore',()=>{
  const g=G.createGame(E,{seed:4601,STARTING_COINS:100}),s=g.state(),ids=['d2-4','d3-5'];
  s.pieces=ids.map((id,i)=>{const t=s.set.find(t=>t.id===id),p=E.pieceFrom(t,2+i*6,8,0,0,i+1);p.tile={...t};return p});s.placedTileIds=[...ids];
  fakeMarket(g,'diode');const buy=g.buyMarketMod('diode');assert(buy.ok&&buy.pending);assert(buy.eligibleTileIds.includes('d2-4'));
  const tile=g.chooseMarketModTile('d2-4');assert(tile.ok&&tile.pending);assert.equal(tile.stage,'direction');assert.equal(s.diodeTileId,null);
  const direction=g.chooseMarketModHalf('d2-4',1);assert(direction.ok&&!direction.pending);assert.equal(s.diodeTileId,'d2-4');assert.equal(s.diodeInHalf,1);
  const restored=G.createGame(E,{seed:1});assert(restored.restoreState(g.exportState()));assert.equal(restored.state().diodeTileId,'d2-4');assert.equal(restored.state().diodeInHalf,1);assert.match(restored.debugText(),/DI=d2-4:IN1/);
});

check('HINGE Market stores pivot and both physical states deterministically',()=>{
  const g=G.createGame(E,{seed:4602,STARTING_COINS:100}),s=g.state(),hingeTile=s.set.find(t=>t.id==='d2-4'),pivotTile=s.set.find(t=>t.id==='d4-4');
  const hinge=E.pieceFrom(hingeTile,6,8,0,0,1);hinge.tile={...hingeTile};const pivot=E.pieceFrom(pivotTile,10,8,0,0,2);pivot.tile={...pivotTile};s.pieces=[hinge,pivot];s.placedTileIds=[hingeTile.id,pivotTile.id];
  fakeMarket(g,'hinge');const info=g.marketOfferInfo('hinge');assert(info.targetTiles.some(t=>t.id===hingeTile.id));assert(g.buyMarketMod('hinge').ok);const installed=g.chooseMarketModTile(hingeTile.id);assert(installed.ok);
  assert.equal(s.hingeTileId,hingeTile.id);assert.equal(s.hingeState.tileId,hingeTile.id);assert.equal(s.hingeState.pivotTileId,pivotTile.id);assert.equal(s.hingeState.positions.length,2);
  const restored=G.createGame(E,{seed:1});assert(restored.restoreState(g.exportState()));assert.deepEqual(restored.state().hingeState,s.hingeState);
});

check('old Signal-v1 replacement fields are migration-only and protected comparator is unchanged',()=>{
  const source=fs.readFileSync(path.join(__dirname,'..','engine.js'),'utf8'),game=fs.readFileSync(path.join(__dirname,'..','game.js'),'utf8');
  assert.match(source,/const av=\[a\.traversals\|\|0,a\.output\|\|0,a\.rebounds\|\|0,\(a\.path\|\|\[\]\)\.length\]/);
  assert.doesNotMatch(source,/mods\.has\('sequence'\)|mods\.has\('complement'\)|mods\.has\('relay'\)|mods\.has\('coupler'\)/);
  assert.match(game,/\['zeroMemoryTileId','sequenceTileId','complementTileId','relayTileId','couplerTileId'\]/);
});

console.log(`${checks} MONOID Signal v2 regressions passed`);
