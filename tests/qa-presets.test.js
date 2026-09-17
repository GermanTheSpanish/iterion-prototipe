const assert=require('assert');
const E=require('../engine.js');
const D=require('../data.js');
const Game=require('../game.js');
const QA=require('../qa-presets.js');

function physicalAudit(game){
  const s=game.state(),occupied=new Map(),connected=new Set();
  for(const piece of s.pieces){
    assert(piece.tile?.id,'every QA piece keeps a physical tile id');
    for(const cube of piece.cubes){
      for(let dx=0;dx<E.S;dx++)for(let dy=0;dy<E.S;dy++){
        const key=`${cube.x+dx},${cube.y+dy}`;assert(!occupied.has(key),`overlap at ${key}: ${occupied.get(key)} / ${piece.tile.id}`);occupied.set(key,piece.tile.id)
      }
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
    for(const ca of a.cubes)for(const cb of b.cubes)if(touches(ca,cb)){
      pairTouch=true;assert.strictEqual(ca.v,cb.v,`mismatched physical contact ${a.tile.id}/${b.tile.id}`)
    }
    if(pairTouch){connected.add(a.tile.id);connected.add(b.tile.id)}
  }
  assert.strictEqual(connected.size,s.pieces.length,'QA machine must be one connected physical structure');
}

for(const [id,preset] of Object.entries(QA.PRESETS)){
  E.setBoardSize(18,24);
  const game=Game.createGame(E,{seed:id==='classic14'?140014:160016});
  QA.applyPreset(game,E,id);
  const s=game.state(),snap=game.snapshot(),ids=s.pieces.map(p=>p.tile.id);
  assert.strictEqual(s.round,preset.round,`${id}: internal round`);
  assert.strictEqual(snap.round.index,preset.round+1,`${id}: visible round`);
  assert.strictEqual(snap.endless.active,preset.endless,`${id}: endless flag`);
  assert.strictEqual(s.setGeneration,preset.generation,`${id}: POWER generation`);
  assert.strictEqual(ids.length,new Set(ids).size,`${id}: physical piece ids are unique`);
  assert.strictEqual(s.placedTileIds.length,new Set(s.placedTileIds).size,`${id}: placed ids are unique`);
  assert.strictEqual(s.hand.filter(Boolean).length,5,`${id}: full visible hand`);
  assert(s.mods.includes('long-run'),`${id}: Long Run present`);
  assert(s.doubleDoubleTileId&&ids.includes(s.doubleDoubleTileId),`${id}: DD is on the machine`);
  assert(s.doubleEchoTileId&&ids.includes(s.doubleEchoTileId),`${id}: DE is on the machine`);
  assert(s.zeroMemoryTileId&&ids.includes(s.zeroMemoryTileId),`${id}: ZM is on the machine`);
  assert(Object.keys(s.circuitRanks).length>=3,`${id}: circuit ranks present`);
  assert(ids.some(tileId=>tileId.startsWith(`g${preset.powerGeneration}-`)),`${id}: current POWER material is visible`);
  assert(game.target()>=50000&&s.score>=50000,`${id}: compact-number UI threshold is exercised`);
  assert(game.legalHandMask().some(Boolean),`${id}: preset remains playable`);
  physicalAudit(game);
  if(id==='classic14'){
    assert.strictEqual(snap.stage.index,5);assert.strictEqual(game.target(),10000000000);assert.strictEqual(s.endlessMode,false)
  }else{
    assert.strictEqual(snap.stage.index,6);assert.strictEqual(game.target(),250000000000);assert.strictEqual(s.standardComplete,true);assert.strictEqual(s.gameMode,'prototype');assert.strictEqual(s.scoringModel,'deferred-v1')
  }
}
console.log('MONOID late-game QA preset regressions passed');
