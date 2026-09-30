const assert=require('node:assert/strict');
const E=require('../engine.js'),G=require('../game.js');

E.setBoardSize(18,24);
const tile=(id,a,b)=>({id,a,b,generation:1,powerMultiplier:1,upgrade:0});
const piece=(id,t,x,y,rr)=>{const p=E.pieceFrom(t,x,y,0,rr,id);p.tile={...t};return p};
const sourceTile=tile('route-src',1,2),junctionTile=tile('route-junction',2,3),upTile=tile('route-up-1',3,4),upEndTile=tile('route-up-2',4,5),rightTile=tile('route-right',3,6);
const pieces=[
  piece(1,sourceTile,0,8,0),
  piece(2,junctionTile,4,8,0),
  piece(3,upTile,6,6,3),
  piece(4,upEndTile,6,2,3),
  piece(5,rightTile,8,8,0)
];

const sim=E.bestSignal(1,pieces,{initialOutput:3});
const choice=sim.events.find(event=>event.type==='route'&&event.piece===2&&event.choiceReason);
assert(choice,'selected route must expose a decision reason when multiple exits were compared');
assert.equal(choice.toPieceId,3,'the longer upward branch remains the selected route');
assert.equal(choice.choiceDirection,'U');
assert.equal(choice.choiceReason,'traversals');
assert.equal(choice.choiceCount,2);
assert(sim.events.some(event=>event.type==='op'&&event.piece===4),'winning branch still reaches the second upward tile');
assert(!sim.events.some(event=>event.type==='op'&&event.piece===5),'rejected right branch must not enter the selected event stream');

const routeSignature=result=>({
  segments:(result?.segments||[]).map(segment=>({piece:segment.piece,from:segment.from,to:segment.to,reverse:!!segment.reverse,entryHalf:segment.entryHalf,exitHalf:segment.exitHalf})),
  events:(result?.events||[]).filter(event=>['start','route','move','zero-port','core-relay','rebound'].includes(event.type)).map(event=>({type:event.type,piece:event.piece,toPieceId:event.toPieceId,fromPiece:event.fromPiece,toPiece:event.toPiece,fromHalf:event.fromHalf,toHalf:event.toHalf,exitHalf:event.exitHalf,retrace:!!event.retrace,choiceReason:event.choiceReason||null,choiceCount:event.choiceCount||null,choiceDirection:event.choiceDirection||null}))
});
assert.deepEqual(routeSignature(E.bestSignal(1,pieces,{initialOutput:3})),routeSignature(sim),'route observability metadata must remain deterministic');

const game=G.createGame(E,{seed:530301});
const s=game.state();
s.pieces=pieces.map(p=>piece(p.id,{...p.tile},p.cubes[0].x,p.cubes[0].y,p.rr));
s.placedTileIds=s.pieces.map(p=>p.tile.id);s.idc=5;s.turn=5;s.roundTurn=5;s.anchorId=sourceTile.id;s.hand=[];s.reserve=[];
s.ouroborosMode=true;s.ouroborosStartedRound=s.round+1;s.ouroborosBoardSize=[18,24];s.running=false;s.cleared=false;s.blocked=false;s.needsReroll=false;s.failureReason=null;s.shopOpen=false;s.pendingCircuit=null;s.pendingModPlacement=null;
const before=JSON.stringify(game.exportState()),turnBefore=s.turn,preview=game.previewOuroborosFire(sourceTile.id);
assert(preview.ok);
assert.equal(JSON.stringify(game.exportState()),before,'Ouroboros signal preview must be completely read-only');
const ctx=game.beginOuroborosFire(sourceTile.id);assert(ctx.ok);
assert.deepEqual(routeSignature(ctx.sim),routeSignature(preview.sim),'Ouroboros preview and committed FIRE must use identical routing');
assert.equal(s.turn,turnBefore+1,'only committed FIRE advances turn state');

console.log('signal route observability and Ouroboros preview regressions passed');
