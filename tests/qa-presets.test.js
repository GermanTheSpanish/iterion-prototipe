const assert=require('assert');
const E=require('../engine.js');
const Game=require('../game.js');
const QA=require('../qa-presets.js');

function physicalAudit(game){
  const s=game.state(),occupied=new Map(),connected=new Set();
  for(const piece of s.pieces){
    assert(piece.tile?.id,'every QA piece keeps a physical tile id');
    for(const cube of piece.cubes)for(let dx=0;dx<E.S;dx++)for(let dy=0;dy<E.S;dy++){
      const key=`${cube.x+dx},${cube.y+dy}`;assert(!occupied.has(key),`overlap at ${key}: ${occupied.get(key)} / ${piece.tile.id}`);occupied.set(key,piece.tile.id)
    }
  }
  const overlap=(a0,a1,b0,b1)=>Math.max(0,Math.min(a1,b1)-Math.max(a0,b0));
  const touches=(a,b)=>{
    if(a.x+E.S===b.x||b.x+E.S===a.x)return overlap(a.y,a.y+E.S,b.y,b.y+E.S)>0;
    if(a.y+E.S===b.y||b.y+E.S===a.y)return overlap(a.x,a.x+E.S,b.x,b.x+E.S)>0;
    return false
  };
  for(let i=0;i<s.pieces.length;i++)for(let j=i+1;j<s.pieces.length;j++){
    const a=s.pieces[i],b=s.pieces[j];let pairTouch=false;
    for(const ca of a.cubes)for(const cb of b.cubes)if(touches(ca,cb)){pairTouch=true;assert.strictEqual(ca.v,cb.v,`mismatched physical contact ${a.tile.id}/${b.tile.id}`)}
    if(pairTouch){connected.add(a.tile.id);connected.add(b.tile.id)}
  }
  assert.strictEqual(connected.size,s.pieces.length,'QA machine must be one connected physical structure');
}

for(const [id,preset] of Object.entries(QA.PRESETS)){
  E.setBoardSize(18,24);
  const game=Game.createGame(E,{seed:id==='classic14'?140014:160016});
  QA.applyPreset(game,E,id);
  const s=game.state(),snap=game.snapshot(),ids=s.pieces.map(p=>p.tile.id),activeIds=[...ids,...s.hand.filter(Boolean).map(t=>t.id),...s.reserve.map(t=>t.id)];
  assert.strictEqual(s.round,preset.round,`${id}: internal round`);
  assert.strictEqual(snap.round.index,preset.round+1,`${id}: visible round`);
  assert.strictEqual(snap.endless.active,preset.endless,`${id}: endless flag`);
  assert.strictEqual(s.setGeneration,preset.generation,`${id}: POWER generation`);
  assert.strictEqual(s.gameMode,'classic',`${id}: every fixture uses the integrated Classic progression`);
  assert.strictEqual(ids.length,new Set(ids).size,`${id}: physical piece ids are unique`);
  assert.strictEqual(s.placedTileIds.length,new Set(s.placedTileIds).size,`${id}: placed ids are unique`);
  assert.strictEqual(activeIds.length,new Set(activeIds).size,`${id}: one physical tile cannot exist twice across machine, Hand and reserve`);
  assert.strictEqual(s.hand.filter(Boolean).length,id==='klausOuroboros'?0:5,`${id}: phase-appropriate hand`);
  assert(ids.some(tileId=>tileId.startsWith(`g${preset.powerGeneration}-`))||preset.powerGeneration===1,`${id}: current POWER material is represented`);
  assert(Math.max(s.score,s.best)>=50000,`${id}: large-number UI threshold is exercised`);
  if(id==='klausOuroboros')assert(game.canInteract(),`${id}: R49 must be interactive`);
  else{assert(game.legalHandMask().some(Boolean),`${id}: preset remains playable`);physicalAudit(game)}

  if(id==='klausOuroboros'){
    assert.strictEqual(preset.sourceRunId,'mv1hi61f-r68xcg');
    assert.strictEqual(s.runId,'qa-mv1hi61f-r68xcg-ouroboros');assert.strictEqual(s.roundTurn,0);
    assert.strictEqual(s.turn,84);assert.strictEqual(s.idc,84);
    assert.strictEqual(snap.round.index,49);assert.strictEqual(snap.stage.index,17);
    assert.equal(snap.endless.phase,'ouroboros');assert.equal(s.ouroborosMode,true);
    assert.deepStrictEqual(snap.boardSize,{width:45,height:60});
    assert.deepStrictEqual(s.ouroborosBoardSize,[45,60]);
    assert.strictEqual(s.set.length,84);assert.strictEqual(s.pieces.length,84);
    assert.strictEqual(s.wins.length,48);assert.equal(game.availableTileCount(),0);
    assert.strictEqual(s.seed,1643080912);assert.strictEqual(s.coins,163);
    assert.strictEqual(s.inflation,16);assert.strictEqual(s.systemStrain,49);
    assert.strictEqual(s.marketCount,16);assert.strictEqual(s.score,0);
    assert.strictEqual(game.targetExact(),'29103830456733703613281250000000000');
    assert.strictEqual(s.bestExact,'5619772630459987517896604029846414363600277946');
    assert.strictEqual(s.anchorId,'g3-d4-6');
    assert.deepStrictEqual(s.consumables,{move:0,reroll:0,undo:0});
    assert.deepStrictEqual(s.circuitRanks,{'d2-2':2,'g2-d6-6':1,'g3-d4-4':3});
    assert.equal(s.doubleDoubleTileId,'g2-d6-6');assert.equal(s.tripleDoubleTileId,'g3-d6-6');
    assert.deepStrictEqual(s.zeroPortTileIds,['d0-3','d0-6']);
    assert.equal(s.overloadTileId,'d3-3');assert.equal(s.bridgeTileId,'d5-5');
    assert.equal(s.hingeTileId,'g2-d2-5');assert.equal(s.hingeState,null);
    assert.deepStrictEqual(s.mods,['long-run']);
    for(const[id,x,y,rr]of [
      ['g3-d0-5',38,4,2],['g3-d3-6',32,43,1],['g3-d2-5',4,40,3],
      ['g3-d4-6',28,53,1],['g3-d0-6',26,3,1]
    ]){const piece=s.pieces.find(piece=>piece.tile.id===id);assert(piece,id);
      assert.deepStrictEqual([piece.cubes[0].x,piece.cubes[0].y,piece.rr],[x,y,rr],`${id}: pre-FIRE source coordinates`)}
    const occupied=new Set();for(const piece of s.pieces)for(const cube of piece.cubes)
      for(let dx=0;dx<E.S;dx++)for(let dy=0;dy<E.S;dy++){
        const key=`${cube.x+dx},${cube.y+dy}`;assert(!occupied.has(key),`overlap ${key}`);occupied.add(key)
      }
    assert.equal(game.canUndoOuroborosRebuild(),false);
    const moved=game.moveOuroborosTile('g3-d0-5',{x:37,y:4,rr:2});
    assert(moved.ok,'first Klaus debug rebuild is legal');
    assert.equal(game.canUndoOuroborosRebuild(),true);
    assert(game.undoOuroborosRebuild().ok);
    const reverted=game.state().pieces.find(piece=>piece.tile.id==='g3-d0-5');
    assert.deepStrictEqual([reverted.cubes[0].x,reverted.cubes[0].y,reverted.rr],[38,4,2]);
    const restored=Game.createGame(E,{seed:14});assert(restored.restoreState(game.exportState()));
    assert.equal(restored.state().roundTurn,0);assert.equal(restored.state().pieces.length,84);
    assert.equal(restored.state().ouroborosMode,true);
  }else if(id==='classic14'){
    assert.strictEqual(preset.sourceRunId,'mu66e4fp-116me8o');
    assert.strictEqual(s.runId,'qa-mu66e4fp-116me8o');
    assert.strictEqual(snap.stage.index,5);assert.strictEqual(game.target(),10000000000);assert.strictEqual(s.endlessMode,false);
    assert.strictEqual(s.pieces.length,30);assert.strictEqual(game.availableTileCount(),26);
    assert.strictEqual(s.score,0);assert.strictEqual(s.best,57863119300);assert.strictEqual(s.coins,165);assert.strictEqual(s.inflation,8);
    assert.deepStrictEqual(s.zeroPortTileIds,[],'source run has no Zero Port; do not invent one for QA');
    assert.deepStrictEqual(s.hand.map(t=>t.id),['g2-d0-2','g2-d0-1','g2-d1-3','g2-d1-1','g2-d1-5']);
    assert.deepStrictEqual(game.handPlacementDiagnostics().map(x=>x.legalPlacements),[9,12,16,13,22]); // [1|1] regains its full-side parallel-double placement
    assert.deepStrictEqual(s.circuitRanks,{'d3-3':4,'d4-5':2,'d2-2':5});
    assert.strictEqual(s.circuitSignatures.length,6);assert.strictEqual(s.wins.length,13);assert.strictEqual(s.anchorId,'g2-d3-5');
    assert.deepStrictEqual(s.consumables,{move:0,reroll:0,undo:0});assert.strictEqual(s.freeReroll,1)
  }else if(id==='german9Endless'){
    assert.strictEqual(preset.sourceRunId,'mudyrg2r-1960frf');
    assert.strictEqual(s.runId,'qa-mudyrg2r-1960frf-endless');
    assert.strictEqual(snap.stage.index,6);assert.strictEqual(game.target(),250000000000);assert.strictEqual(s.endlessMode,true);assert.strictEqual(s.standardComplete,true);
    assert.deepStrictEqual(snap.boardSize,{width:30,height:40});
    assert.strictEqual(s.pieces.length,33);assert.strictEqual(game.availableTileCount(),23);assert.strictEqual(s.wins.length,15);
    assert.strictEqual(s.coins,35);assert.strictEqual(s.inflation,9);assert.strictEqual(s.marketCount,5);assert.strictEqual(s.foundationAssignedMarket,4);
    assert.strictEqual(s.anchorId,'g2-d2-5');assert.strictEqual(s.best,2.1114853892231e36);
    assert.deepStrictEqual(s.hand.map(t=>t.id),['g2-d1-6','g2-d0-5','g2-d0-6','g2-d1-2','g2-d4-5']);
    assert.deepStrictEqual(s.circuitRanks,{'d2-2':2,'d5-5':2,'d6-6':5});assert.strictEqual(s.circuitSignatures.length,5);
    assert.deepStrictEqual(s.zeroPortTileIds,['d0-3']);assert.strictEqual(s.bridgeTileId,'d5-6');assert.strictEqual(s.brokerTileId,'d3-4');assert.strictEqual(s.foundationTileId,'d4-5');for(const field of ['swapTileId','crownTileId','frameTileId','terminalTileId','mirrorTileId'])assert.strictEqual(field in s,false,field+' must stay retired');
    assert.deepStrictEqual(s.consumables,{move:0,reroll:0,undo:0});assert.strictEqual(s.freeReroll,1);assert.strictEqual(s.mods.includes('long-run'),false)
  }else{
    assert(s.mods.includes('long-run'),`${id}: synthetic late-game fixture keeps Long Chain`);
    assert(s.doubleDoubleTileId&&ids.includes(s.doubleDoubleTileId),`${id}: DD is on the machine`);
    assert(s.doubleEchoTileId&&ids.includes(s.doubleEchoTileId),`${id}: DE is on the machine`);
    assert.deepStrictEqual(new Set(s.zeroPortTileIds),new Set(['d0-4','d0-5']),`${id}: Zero Port pair is on the machine`);
    assert(s.zeroPortTileIds.every(tileId=>ids.includes(tileId)),`${id}: both ZP endpoints are physical placed tiles`);
    assert.strictEqual(snap.stage.index,6);assert.strictEqual(game.target(),250000000000);assert.strictEqual(s.standardComplete,true);
    assert.strictEqual(s.scoringModel,undefined);assert.deepStrictEqual(snap.boardSize,{width:30,height:40},'Endless no longer grows immediately on entry')
  }
}
console.log('MONOID late-game QA preset regressions passed');
