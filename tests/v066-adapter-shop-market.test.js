const assert=require('node:assert/strict');
const D=require('../data.js');
const E=require('../engine.js');
const Game=require('../game.js');

function create(seed=6601,opts={}){
  E.setBoardSize(18,24);
  return Game.createGame(E,{
    seed,
    STARTING_COINS:200,
    FIRST_TILE_MUST_BE_DOUBLE:false,
    TARGETS:Array(15).fill(1e15),
    ...opts
  })
}
function makeHandSpace(game){
  const s=game.state(),index=s.hand.findIndex(Boolean);
  if(index<0)return 0;
  const tile=s.hand[index];s.hand[index]=null;s.reserve.unshift(tile);return 1
}
function adapterTile(id='adapter-test',phase='landing'){
  return{id,a:null,b:null,upgrade:0,source:'special',special:'adapter',adapterResolved:false,adapterPhase:phase}
}

assert.equal(D.SHOP_ADAPTER_TILE_COST,8);

{
  const left=E.pieceFrom({a:1,b:6},2,4,0,0,1);
  const right=E.pieceFrom({a:3,b:4},10,4,0,0,2);
  const adapter=adapterTile();
  const oneEnd=E.validatePlacement(adapter,6,4,0,0,[left]);
  assert.equal(oneEnd.ok,true,'Adapter now accepts one touched physical value');
  assert.deepEqual([oneEnd.resolvedTile.a,oneEnd.resolvedTile.b],[6,6]);
  assert.equal(oneEnd.resolvedTile.adapterResolved,true);
  assert.equal(oneEnd.piece.double,true,'resolved Adapter uses physical double topology');

  const bridge=E.validatePlacement(adapter,6,4,0,0,[left,right]);
  assert.equal(bridge.ok,true,'Adapter bridges two distinct physical ends');
  assert.deepEqual([bridge.resolvedTile.a,bridge.resolvedTile.b],[6,3]);
  assert.equal(bridge.resolvedTile.special,'adapter');
  assert.equal(bridge.resolvedTile.adapterResolved,true);

  const third=E.pieceFrom({a:6,b:6},6,2,0,0,3);
  const crowded=E.validatePlacement(adapter,6,4,0,0,[left,right,third]);
  assert.equal(crowded.ok,false);
  assert.equal(crowded.reason,'adapter-needs-two-ends','Adapter is not a three-way wildcard connector');

  const locked={...bridge.resolvedTile};
  assert.equal(E.validatePlacement(locked,6,4,0,0,[left,right]).ok,true);
  const wrong=E.pieceFrom({a:5,b:4},10,4,0,0,4);
  assert.equal(E.validatePlacement(locked,6,4,0,0,[left,wrong]).reason,'value-mismatch','resolved Adapter obeys normal matching forever');
}


{
  const adapter=adapterTile('adapter-t-branch');
  const stem=E.pieceFrom({a:1,b:5},6,4,0,1,11);
  const t=E.validatePlacement(adapter,5,8,0,0,[stem]);
  assert.equal(t.ok,true,'one-value Adapter centres across the stem to make a physical T');
  assert.deepEqual([t.resolvedTile.a,t.resolvedTile.b],[5,5]);
  assert.equal(t.piece.double,true);
  assert.equal(t.contacts.length,1,'both Adapter halves touch the same physical stem');
  assert.equal(t.contacts[0].kind,'double-centered','T placement inherits the canonical double-centred geometry');
  const physical=E.pieceFrom(t.resolvedTile,5,8,0,0,12);
  assert.equal(E.connectionsForPiece(physical,[stem,physical]).length,2,'centred T has two physical half contacts');
  const arm=E.pieceFrom({a:5,b:2},9,8,0,0,13);
  assert.equal(E.validatePlacement(arm.tile,9,8,0,0,[stem,physical]).ok,true,'the new double can extend its crossbar normally');

  const conflicting=E.pieceFrom({a:2,b:3},6,4,0,0,14);
  assert.equal(E.validatePlacement(adapter,6,6,0,0,[conflicting]).ok,false,'one physical neighbour with two different values is ambiguous');
  const zero=E.pieceFrom({a:1,b:0},2,4,0,0,15);
  const zeroDouble=E.validatePlacement(adapter,6,4,0,0,[zero]);
  assert.deepEqual([zeroDouble.resolvedTile?.a,zeroDouble.resolvedTile?.b],[0,0],'zero is a printed value, not an exception');
  assert.equal(E.validatePlacement(adapter,4,4,0,0,[]).ok,false,'Adapter cannot be the first tile');
}

{
  const game=create(6610,{STARTING_UNDO_CONSUMABLES:1}),s=game.state(),existing=s.set.find(t=>t.id==='d1-6'),adapter=adapterTile('adapter-one-value');
  s.set.push(adapter);
  const piece=E.pieceFrom(existing,2,4,0,0,1);piece.tile={...existing};
  s.pieces=[piece];s.placedTileIds=[existing.id];s.idc=1;s.turn=1;s.hand=[adapter,null,null,null,null];
  s.reserve=s.reserve.filter(t=>t.id!==existing.id);
  const candidate=game.candidatesForIndex(0).find(p=>p.x===6&&p.y===4&&p.rr===0);
  assert(candidate,'the playable Hand offers a single-contact Adapter');
  assert.deepEqual([candidate.resolvedTile.a,candidate.resolvedTile.b],[6,6]);
  const preview=game.previewPlacement(0,candidate);
  assert.equal(preview.ok,true);assert.deepEqual([preview.tile.a,preview.tile.b],[6,6]);
  assert.equal(preview.trigger,12,'preview scores using the real double');
  assert.equal(s.hand[0].adapterResolved,false,'preview never materializes the Adapter');
  const placed=game.beginPlacement(0,candidate);assert.equal(placed.ok,true);
  assert.equal(placed.p.double,true,'runtime placement has canonical double topology');
  assert.equal(placed.trigger,12);
  game.finishPlacement(placed);
  const owned=s.set.find(t=>t.id===adapter.id);
  assert.deepEqual([owned.a,owned.b],[6,6]);assert.equal(owned.adapterResolved,true);
  const board=game.snapshot().board.find(p=>p.tileId===adapter.id);
  assert.deepEqual([board.a,board.b],[6,6]);assert.equal(board.adapterResolved,true);
  const restored=create(6611);assert.equal(restored.restoreState(game.exportState()),true);
  const restoredAdapter=restored.state().set.find(t=>t.id===adapter.id);
  assert.deepEqual([restoredAdapter.a,restoredAdapter.b],[6,6],'save/restore keeps the resolved values');
  assert.equal(restoredAdapter.adapterResolved,true);
  const undone=game.useUndo();assert.equal(undone.ok,true);
  const restoredFrame=game.state(),undoneAdapter=restoredFrame.set.find(t=>t.id===adapter.id);
  assert.equal(undoneAdapter.adapterResolved,false,'Undo restores the unresolved Adapter');
  assert.deepEqual([undoneAdapter.a,undoneAdapter.b],[null,null]);
  assert.equal(restoredFrame.hand.filter(t=>t?.id===adapter.id).length,1,'Undo returns the same physical Adapter instance to Hand');
}

{
  const game=create(6602),s=game.state(),before=s.hand.filter(Boolean).length;
  const availability=game.shopPurchaseAvailability();
  assert.equal(availability.blockedByHand,false,'fresh full base Hand still allows purchase overflow');
  assert.equal(availability.handCount,5);assert.equal(availability.handLimit,8);
  assert.equal(game.openShop(),true);
  const bought=game.buyShopRandomTile();
  assert.equal(bought.ok,true);assert.equal(bought.delivery,'hand');assert.equal(bought.delivery,'hand');
  assert.equal(s.hand.filter(Boolean).length,before+1,'full Hand expands temporarily for a physical purchase');
  assert.equal(s.hand.find(t=>t?.id===bought.tile.id)?.shopPinned,true,'purchased tile is pinned against Reroll until used');
  game.closeShop();
}

{
  const game=create(6603),s=game.state();makeHandSpace(game);
  const chosen=game.snapshot().shop.tileOffers[0].tile;
  assert.equal(game.openShop(),true);
  const bought=game.buyShopTileOffer(chosen.id);
  assert.equal(bought.ok,true);assert.equal(bought.delivery,'hand');
  assert(s.hand.some(tile=>tile?.id===chosen.id),'visible tile is delivered directly to Hand');
  assert.equal(s.reserve.some(tile=>tile?.id===chosen.id),false,'visible tile never falls through to Reserve at purchase time');
  game.closeShop();
}

{
  const game=create(6604),s=game.state();makeHandSpace(game);
  assert.equal(game.openShop(),true);
  const bought=game.buyShopRandomTile();
  assert.equal(bought.ok,true);assert.equal(bought.delivery,'hand');
  assert(s.hand.some(tile=>tile?.id===bought.tile.id),'Random tile is delivered directly to Hand');
  assert.equal(s.reserve.some(tile=>tile?.id===bought.tile.id),false);
  game.closeShop();
}

{
  const game=create(6605),s=game.state();
  makeHandSpace(game);assert.equal(game.openShop(),true);
  const landing=game.buyShopAdapter();assert.equal(landing.ok,true);assert.equal(landing.phase,'landing');assert.equal(landing.delivery,'hand');assert.equal(landing.cost,8);
  assert.equal(landing.tile.powerMultiplier,undefined,'Adapter is an architectural tile, never free POWER');
  assert(s.hand.some(tile=>tile?.id===landing.tile.id));assert.equal(s.reserve.some(tile=>tile?.id===landing.tile.id),false);
  assert.equal(s.set.filter(tile=>tile.id===landing.tile.id).length,1,'Adapter has one persistent physical instance');
  game.closeShop();

  makeHandSpace(game);assert.equal(game.openShop(),true);
  const secondLanding=game.buyShopAdapter();assert.equal(secondLanding.ok,false);assert.equal(secondLanding.reason,'phase-limit');
  game.closeShop();

  s.endlessMode=true;makeHandSpace(game);assert.equal(game.openShop(),true);
  const endless=game.buyShopAdapter();assert.equal(endless.ok,true);assert.equal(endless.phase,'endless');assert.equal(endless.cost,9);
  game.closeShop();

  s.round=game.infinitePhaseStartRound();makeHandSpace(game);assert.equal(game.openShop(),true);
  const infinite=game.buyShopAdapter();assert.equal(infinite.ok,true);assert.equal(infinite.phase,'infinite');assert.equal(infinite.cost,10);
  game.closeShop();

  assert.deepEqual(s.adapterPurchasedPhases,['landing','endless','infinite']);
  assert.equal(new Set([landing.tile.id,endless.tile.id,infinite.tile.id]).size,3,'each Adapter purchase gets a unique physical ID');

  const saved=game.exportState(),restored=create(9999);
  assert.equal(restored.restoreState(saved),true);
  assert.deepEqual(restored.state().adapterPurchasedPhases,['landing','endless','infinite'],'save/restore preserves per-phase quota');
  for(const id of [landing.tile.id,endless.tile.id,infinite.tile.id])assert.equal(restored.state().set.filter(tile=>tile.id===id).length,1,'save/restore preserves one physical Adapter instance');
}

{
  const game=create(6606),s=game.state(),left=s.set.find(t=>t.id==='d1-6'),right=s.set.find(t=>t.id==='d3-4'),adapter=adapterTile('adapter-placement');
  s.set.push(adapter);
  s.pieces=[
    (()=>{const p=E.pieceFrom(left,2,4,0,0,1);p.tile={...left};return p})(),
    (()=>{const p=E.pieceFrom(right,10,4,0,0,2);p.tile={...right};return p})()
  ];
  s.placedTileIds=[left.id,right.id];s.idc=2;s.turn=2;s.hand=[adapter,null,null,null,null];
  s.reserve=s.reserve.filter(t=>![left.id,right.id].includes(t.id));
  const candidate=game.candidatesForIndex(0).find(p=>p.x===6&&p.y===4&&p.rr===0);
  assert(candidate,'game exposes the physical Adapter bridge as a legal placement');
  assert.deepEqual([candidate.resolvedTile.a,candidate.resolvedTile.b],[6,3]);

  const ctx=game.beginPlacement(0,candidate);
  assert.equal(ctx.ok,true);assert.deepEqual([ctx.tile.a,ctx.tile.b],[6,3]);
  assert.equal(ctx.tile.special,'adapter');assert.equal(ctx.tile.adapterResolved,true);
  assert.deepEqual([ctx.p.tile.a,ctx.p.tile.b],[6,3]);
  const owned=s.set.find(t=>t.id===adapter.id);assert.deepEqual([owned.a,owned.b],[6,3]);assert.equal(owned.adapterResolved,true,'physical Adapter locks its printed values in authoritative state');
  game.finishPlacement(ctx);
  const board=game.snapshot().board.find(item=>item.tileId===adapter.id);
  assert.deepEqual([board.a,board.b],[6,3]);assert.equal(board.special,'adapter');assert.equal(board.adapterResolved,true);
}

{
  const game=create(6607,{STARTING_UNDO_CONSUMABLES:1}),s=game.state();
  const first=game.candidatesForIndex(0)[0],ctx=game.beginPlacement(0,first);assert.equal(ctx.ok,true);game.finishPlacement(ctx);
  makeHandSpace(game);assert.equal(game.openShop(),true);
  const bought=game.buyShopAdapter();assert.equal(bought.ok,true);game.closeShop();
  assert.equal(game.useUndo().ok,true);
  const restored=game.state();
  assert(restored.set.some(tile=>tile.id===bought.tile.id),'Undo preserves Adapter ownership');
  assert(restored.adapterPurchasedPhases.includes('landing'),'Undo preserves consumed phase allowance');
  const physical=[...restored.hand,...restored.reserve,...restored.pieces.map(p=>p.tile)].filter(Boolean).filter(tile=>tile.id===bought.tile.id);
  assert.equal(physical.length,1,'Undo never duplicates the purchased Adapter physical instance');
}

console.log('v0.66.0 Adapter, direct-to-Hand Shop and phase quota regressions passed');
