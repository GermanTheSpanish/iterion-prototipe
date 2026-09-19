const assert=require('node:assert/strict');
const E=require('../engine.js'),G=require('../game.js'),M=require('../mods.js'),D=require('../data.js');
let checks=0;
function check(name,fn){fn();checks++;console.log(`Mods: ${name}`)}
const clone=x=>JSON.parse(JSON.stringify(x));
function piece(a,b,x,y,rr,id){const p=E.pieceFrom({a,b},x,y,0,rr,id);p.tile={id:`tile-${id}`,a,b};return p}
function fakeMarket(g,id){
  const s=g.state();s.shopOpen=true;s.shopType='market';s.shopOffers=[id];s.marketBuys=[];s.cleared=true;s.intermissionResolved=false;s.nextShopType='market';s.coins=100;return s
}
E.setBoardSize(30,40);

check('registry exposes nine targeted tile Mods and removes Zero Memory',()=>{
  const tileMods=M.all().filter(m=>m.kind==='market-tile-mod').map(m=>m.id).sort();
  assert.deepEqual(tileMods,['corner','double-double','double-echo','long-line','overload','parity-exchange','terminal','triple-double','zero-port']);
  assert.equal(M.get('zero-memory'),null);
  assert.equal(D.MARKET_ZERO_MEMORY_COST,undefined);
});

check('Market purchase closes before exact player assignment',()=>{
  const g=G.createGame(E,{seed:3501,STARTING_COINS:100}),s=g.state();
  const ids=['d3-3','d5-5','d0-3'];
  s.pieces=ids.map((id,i)=>{const t=s.set.find(t=>t.id===id),p=E.pieceFrom(t,2+i*6,8,0,0,i+1);p.tile={...t};return p});s.placedTileIds=[...ids];
  fakeMarket(g,'double-double');const r=g.buyMarketMod('double-double');
  assert(r.ok&&r.pending);assert.equal(s.shopOpen,false);assert.equal(s.doubleDoubleTileId,null);assert(s.pendingModPlacement.eligibleTileIds.includes('d5-5'));
  const chosen=g.chooseMarketModTile('d5-5');assert(chosen.ok&&!chosen.pending);assert.equal(s.doubleDoubleTileId,'d5-5');assert.equal(s.pendingModPlacement,null);assert.equal(s.intermissionResolved,true);
  assert.equal(s.inflation,1);assert.equal(s.coins,92);
});

check('one physical tile can hold only one Tile Mod',()=>{
  const g=G.createGame(E,{seed:3502,STARTING_COINS:100}),s=g.state(),ids=['d3-3','d5-5','d2-4','d0-3'];
  s.pieces=ids.map((id,i)=>{const t=s.set.find(t=>t.id===id),p=E.pieceFrom(t,2+i*6,8,0,0,i+1);p.tile={...t};return p});s.placedTileIds=[...ids];s.doubleDoubleTileId='d3-3';s.parityExchangeTileId='d2-4';s.terminalTileId='d0-3';
  fakeMarket(g,'corner');const info=g.marketOfferInfo('corner');assert(!info.targetTiles.some(t=>['d3-3','d2-4','d0-3'].includes(t.id)));assert(info.targetTiles.some(t=>t.id==='d5-5'));
  const r=g.buyMarketMod('corner');assert(r.ok);assert(g.chooseMarketModTile('d5-5').ok);assert.equal(s.cornerTileId,'d5-5');
  fakeMarket(g,'triple-double');assert.equal(g.marketOfferInfo('triple-double').targetCount,0);
  fakeMarket(g,'zero-port');assert(!g.marketOfferInfo('zero-port').targetTiles.some(t=>t.id==='d0-3'));
});

check('Triple Double Market purchase targets one exact non-zero double',()=>{
  const g=G.createGame(E,{seed:3505,STARTING_COINS:100}),s=g.state(),ids=['d0-0','d3-3','d5-5'];
  s.pieces=ids.map((id,i)=>{const t=s.set.find(t=>t.id===id),p=E.pieceFrom(t,2+i*6,8,0,0,i+1);p.tile={...t};return p});s.placedTileIds=[...ids];s.doubleEchoTileId='d3-3';
  fakeMarket(g,'triple-double');const info=g.marketOfferInfo('triple-double');assert.deepEqual(info.targetTiles.map(t=>t.id),['d5-5']);assert.equal(info.price,12);
  const bought=g.buyMarketMod('triple-double');assert(bought.ok&&bought.pending);assert.deepEqual(bought.eligibleTileIds,['d5-5']);assert(g.chooseMarketModTile('d5-5').ok);assert.equal(s.tripleDoubleTileId,'d5-5');
});

check('Zero Port builds a pair then relocates exactly one chosen endpoint',()=>{
  const g=G.createGame(E,{seed:3503,STARTING_COINS:200}),s=g.state(),ids=['d0-2','d0-3','d0-4','d5-5'];
  s.pieces=ids.map((id,i)=>{const t=s.set.find(t=>t.id===id),p=E.pieceFrom(t,2+i*6,8,0,0,i+1);p.tile={...t};return p});s.placedTileIds=[...ids];
  fakeMarket(g,'zero-port');let r=g.buyMarketMod('zero-port');assert.equal(r.stage,'target');assert(g.chooseMarketModTile('d0-2').ok);assert.deepEqual(s.zeroPortTileIds,['d0-2']);
  fakeMarket(g,'zero-port');r=g.buyMarketMod('zero-port');assert.equal(r.stage,'target');assert(g.chooseMarketModTile('d0-3').ok);assert.deepEqual(s.zeroPortTileIds,['d0-2','d0-3']);
  fakeMarket(g,'zero-port');r=g.buyMarketMod('zero-port');assert.equal(r.stage,'source');assert.deepEqual(new Set(r.eligibleTileIds),new Set(['d0-2','d0-3']));
  const source=g.chooseMarketModTile('d0-2');assert(source.ok&&source.pending);assert.equal(source.stage,'target');assert.deepEqual(source.eligibleTileIds,['d0-4']);
  const moved=g.chooseMarketModTile('d0-4');assert(moved.ok&&!moved.pending);assert.deepEqual(s.zeroPortTileIds,['d0-4','d0-3']);assert.equal(new Set(s.zeroPortTileIds).size,2);
});

check('Zero Port replaces rebound with teleport',()=>{
  const ps=[piece(3,3,6,8,0,1),piece(0,3,2,8,0,2),piece(3,0,10,8,0,3),piece(3,2,7,10,1,4)];
  const base=E.bestSignal(4,ps,{initialOutput:5,bifurcate:true}),zp=E.bestSignal(4,ps,{initialOutput:5,bifurcate:true,zeroPortPieceIds:[2,3]});
  assert(base.rebounds>0);assert.equal(zp.rebounds,0);assert(zp.events.some(e=>e.type==='zero-port'&&e.piece===2&&e.toPieceId===3));assert(zp.events.some(e=>e.type==='zero-port'&&e.piece===3&&e.toPieceId===2));
});

check('Zero Port into [0|0] duplicates through both physical ends',()=>{
  const ps=[piece(2,3,2,8,0,1),piece(3,0,6,8,0,2),piece(0,0,10,8,0,3),piece(0,5,14,8,0,4)];
  const r=E.bestSignal(1,ps,{initialOutput:5,bifurcate:true,zeroPortPieceIds:[2,3]});
  const fork=r.events.find(e=>e.type==='signal-fork'&&e.splitKind==='zero-port');
  assert(fork);assert.equal(fork.piece,3);assert.equal(r.events.filter(e=>e.type==='signal-start'&&e.fork===3).length,2);assert.equal(r.events.filter(e=>e.type==='signal-end'&&e.fork===3).length,2);
});

function replay(events,pieces,mods,initial=5){
  return E.replaySelectedScoring({output:0,gain:0,path:[],segments:[],events,reason:'fixture',traversals:events.length,rebounds:0},initial,{pieces,modIdsByPiece:mods,cornerMultiplier:3,longLineThreshold:3,longLineHighThreshold:5,longLineMultiplier:2,longLineHighMultiplier:3,overloadMaxMultiplier:4,terminalMultiplier:3});
}
const op=(piece,value,entrySide='L',exitSide='R')=>({type:'op',piece,entryHalf:0,exitHalf:1,entrySide,exitSide,value,op:value===0?'zero':value%2?'multiply':'add',before:0,after:0,add:0,factor:0,powerMultiplier:1});

check('Parity Exchange swaps operation families without changing printed value',()=>{
  const ps=[piece(2,4,2,2,0,1)],mods=new Map([[1,new Set(['parity-exchange'])]]);
  const even=replay([op(1,4)],ps,mods);assert.equal(even.events[0].op,'multiply');assert.equal(even.events[0].factor,4);assert.equal(even.output,20);
  const odd=replay([op(1,3)],ps,mods);assert.equal(odd.events[0].op,'add');assert.equal(odd.events[0].add,3);assert.equal(odd.output,8);
});

check('Corner is x3 for exactly two perpendicular physical neighbours regardless of routed turn',()=>{
  const elbow=[piece(3,4,6,8,0,1),piece(5,3,2,8,0,2),piece(4,2,8,10,1,3)],mods=new Map([[1,new Set(['corner'])]]);
  const active=replay([op(1,3,'L','R')],elbow,mods);assert.equal(active.events[0].connectionCount,2);assert.equal(active.events[0].corner,true);assert.equal(active.events[0].modMultiplier,3);assert.equal(active.output,45);
  const three=[...elbow,piece(4,6,10,8,0,4)],inactive=replay([op(1,3,'L','D')],three,mods);assert.equal(inactive.events[0].connectionCount,3);assert.equal(inactive.events[0].corner,false);assert.equal(inactive.events[0].modMultiplier,1);
});

check('Long Line reads the physical straight chain instead of route history',()=>{
  const line3=[1,2,3].map((id,i)=>piece(2,2,2+i*4,20,0,id)),line5=[1,2,3,4,5].map((id,i)=>piece(2,2,2+i*4,20,0,id));
  const at3=replay([op(2,2,'L','D')],line3,new Map([[2,new Set(['long-line'])]]),0),at5=replay([op(3,2,'U','R')],line5,new Map([[3,new Set(['long-line'])]]),0);
  assert.equal(at3.events[0].straightLineLength,3);assert.equal(at3.events[0].modMultiplier,2);assert.equal(at5.events[0].straightLineLength,5);assert.equal(at5.events[0].modMultiplier,3);
});

check('Triple Double forks a complete non-zero double cross through the other three exits once',()=>{
  const cross=[piece(3,3,6,8,0,1),piece(5,3,2,8,0,2),piece(3,4,10,8,0,3),piece(3,2,7,10,1,4),piece(2,3,7,4,1,5)];
  cross[0].tile.powerMultiplier=2;
  const active=E.bestSignal(2,cross,{initialOutput:5,bifurcate:true,tripleDoublePieceId:1,modIdsByPiece:new Map([[1,new Set(['triple-double'])]])});
  assert.equal(active.events.filter(e=>e.type==='signal-fork'&&e.piece===1&&e.splitKind==='triple-double').length,1);assert.equal(active.events.filter(e=>e.type==='signal-start'&&e.fork===1).length,3);assert.equal(active.selectionOutput,53);assert.equal(active.output,98);
  const incomplete=E.bestSignal(4,cross.slice(0,4),{initialOutput:5,bifurcate:true,tripleDoublePieceId:1});assert(!incomplete.events.some(e=>e.type==='signal-fork'&&e.splitKind==='triple-double'));
});

check('Overload uses physical neighbour count and a cross double reaches x4',()=>{
  const ps=[piece(3,3,6,8,0,1),piece(5,3,2,8,0,2),piece(3,4,10,8,0,3),piece(3,2,7,10,1,4),piece(2,3,7,4,1,5)];
  const r=replay([op(1,3)],ps,new Map([[1,new Set(['overload'])]]));
  assert.equal(r.events[0].connectionCount,4);assert.equal(r.events[0].modMultiplier,4);assert.equal(r.events[0].factor,12);assert.equal(r.output,60);
});

check('Terminal is x3 with exactly one physical neighbour and inactive otherwise',()=>{
  const ps=[piece(3,3,6,8,0,1),piece(5,3,2,8,0,2),piece(3,4,10,8,0,3)];
  const terminal=replay([op(2,5)],ps,new Map([[2,new Set(['terminal'])]])),center=replay([op(1,3)],ps,new Map([[1,new Set(['terminal'])]]));
  assert.equal(terminal.events[0].connectionCount,1);assert.equal(terminal.events[0].modMultiplier,3);assert.equal(terminal.output,75);
  assert.equal(center.events[0].connectionCount,2);assert.equal(center.events[0].modMultiplier,1);
});

check('snapshot and restore persist physical Mod assignments and pending targeting',()=>{
  const g=G.createGame(E,{seed:3504,STARTING_COINS:100}),s=g.state(),ids=['d0-2','d3-3','d2-4','d4-5'];
  s.pieces=ids.map((id,i)=>{const t=s.set.find(t=>t.id===id),p=E.pieceFrom(t,2+i*6,8,0,0,i+1);p.tile={...t};return p});s.placedTileIds=[...ids];s.cornerTileId='d2-4';s.tripleDoubleTileId='d3-3';s.zeroPortTileIds=['d0-2'];s.pendingModPlacement={mod:'terminal',stage:'target',eligibleTileIds:['d4-5'],sourceTileId:null,previousTileId:null,recordIndex:0};
  const exported=g.exportState(),restored=G.createGame(E,{seed:99});assert(restored.restoreState(exported));
  assert.equal(restored.state().cornerTileId,'d2-4');assert.equal(restored.state().tripleDoubleTileId,'d3-3');assert.deepEqual(restored.state().zeroPortTileIds,['d0-2']);assert.deepEqual(restored.state().pendingModPlacement,s.pendingModPlacement);
  assert(restored.snapshot().board.find(p=>p.tileId==='d2-4').modifiers.includes('corner'));assert(restored.snapshot().board.find(p=>p.tileId==='d3-3').modifiers.includes('triple-double'));assert.match(restored.debugText(),/TD=d3-3/);assert.match(restored.debugText(),/ZP=d0-2/);assert.doesNotMatch(restored.debugText(),/ZM=/);
});

console.log(`${checks} MONOID topology Tile Mod checks passed`);
