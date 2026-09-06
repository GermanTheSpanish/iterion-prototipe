const assert=require('assert');
const E=require('../engine.js');
const D=require('../data.js');
const M=require('../mods.js');
const Game=require('../game.js');
const Help=require('../help.js');
const Gesture=require('../gesture.js');

const clone=x=>JSON.parse(JSON.stringify(x));

function testRulebookTelemetryDoesNotMutateGameState(){
  const game=Game.createGame(E,{seed:21});
  const before=clone(game.state());
  Help.bindRun(game.state().runId);
  Help.resetTelemetry();
  Help.recordRulebookOpen();
  Help.recordSectionOpen('placement');
  Help.recordSectionOpen('routing');
  Help.recordSectionOpen('routing');
  assert.deepStrictEqual(clone(game.state()),before,'Rulebook telemetry must not mutate run/game state');
  assert.deepStrictEqual(Help.telemetrySnapshot(),{help_open_count:1,help_section_opened:{placement:1,routing:2}});
  assert.match(Help.debugTelemetryText(),/help_open_count=1/);
  assert.match(Help.debugTelemetryText(),/help_section_opened: placement=1, routing=2/);
}

function testInspectorIsReadOnlyAndPreservesPhysicalId(){
  const game=Game.createGame(E,{seed:22});
  const s=game.state(),tile=s.hand.find(Boolean);
  assert(tile,'fixture must have a hand tile');
  const before=clone(s),id=tile.id;
  const model=Help.inspectTile(s,id);
  assert(model,'hand tile must be inspectable');
  assert.strictEqual(model.baseTile.id,id,'inspector must preserve the physical tile id');
  assert.strictEqual(model.currentMachineState.location,'hand');
  assert.deepStrictEqual(clone(s),before,'inspecting a tile must not mutate game state');
}

function testModifierBelongsToExactPhysicalInstance(){
  const game=Game.createGame(E,{seed:23});
  const s=game.state(),original=s.set.find(t=>t.id==='d3-3');
  assert(original,'base [3|3] must exist');
  const copy={id:'test-copy-3-3',a:3,b:3,upgrade:0,source:'test-copy'};
  s.set.push(copy);s.doubleDoubleTileId=original.id;
  const a=Help.inspectTile(s,original.id),b=Help.inspectTile(s,copy.id);
  assert.strictEqual(a.modifiers.length,1,'active physical Double Double tile must expose its modifier');
  assert.strictEqual(a.modifiers[0].id,'double-double');
  assert.strictEqual(b.modifiers.length,0,'same-value physical copy must not inherit another tile instance modifier');
  assert.notStrictEqual(a.baseTile.id,b.baseTile.id,'physical copies must remain distinct');
}

function testBoardContextComesFromEngineState(){
  const game=Game.createGame(E,{seed:24});
  const s=game.state(),left=s.set.find(t=>t.id==='d2-2'),right=s.set.find(t=>t.id==='d2-4');
  const p1=E.pieceFrom(left,4,4,0,0,101);p1.tile={...left};
  const p2=E.pieceFrom(right,8,4,0,0,102);p2.tile={...right};
  s.pieces=[p1,p2];s.placedTileIds=[left.id,right.id];s.hand=s.hand.filter(t=>t&&t.id!==left.id&&t.id!==right.id);
  const before=clone(s),model=Help.inspectTile(s,left.id);
  assert.strictEqual(model.currentMachineState.location,'board');
  assert.strictEqual(model.currentMachineState.pieceId,101);
  assert(model.currentMachineState.connectionCount>=1,'board inspector must read actual engine connections');
  assert(model.currentMachineState.connectedPieceIds.includes(102),'connected physical piece must be reported from engine state');
  assert.deepStrictEqual(clone(s),before,'board inspection must remain read-only');
}

function testOperationProfileUsesEngineSemantics(){
  assert.strictEqual(Help.operationFor(2).type,'add');
  assert.strictEqual(Help.operationFor(2).add,2);
  assert.strictEqual(Help.operationFor(3).type,'multiply');
  assert.strictEqual(Help.operationFor(3).factor,3);
  assert.strictEqual(Help.operationFor(0).type,'zero');
  assert.strictEqual(Help.operationFor(5,true,true).factor,25,'Double Double inspection metadata must follow engine operation semantics');
}

function testLongPressInspectsWithoutStartingDragOrPlacement(){
  const game=Game.createGame(E,{seed:25});
  const before=clone(game.state());
  let timer=null,inspects=0,drags=0;
  const gesture=Gesture.createPressGesture({
    delay:D.LONG_PRESS_MS,
    tolerance:D.LONG_PRESS_MOVE_TOLERANCE_PX,
    setTimer:fn=>{timer=fn;return 1},
    clearTimer:()=>{},
    onLongPress:()=>{inspects++},
    onDragStart:()=>{drags++}
  });
  gesture.begin({pointerId:7,clientX:10,clientY:10},{kind:'hand',index:0,tileId:game.state().hand[0].id,allowDrag:true});
  timer();
  assert.strictEqual(inspects,1,'500ms hold must enter inspector path');
  assert.strictEqual(drags,0,'long press must not begin drag');
  assert.strictEqual(gesture.end({pointerId:7}),'inspect');
  assert.deepStrictEqual(clone(game.state()),before,'long press gesture must not place or mutate a tile');
}

function testMovementBeforeHoldStartsDragOnly(){
  let timer=null,inspects=0,drags=0;
  const gesture=Gesture.createPressGesture({
    delay:500,tolerance:10,
    setTimer:fn=>{timer=fn;return 1},clearTimer:()=>{},
    onLongPress:()=>{inspects++},onDragStart:()=>{drags++}
  });
  gesture.begin({pointerId:8,clientX:0,clientY:0},{kind:'hand',allowDrag:true});
  assert.strictEqual(gesture.move({pointerId:8,clientX:20,clientY:0}),'drag');
  timer();
  assert.strictEqual(drags,1,'movement before hold threshold must hand off to drag once');
  assert.strictEqual(inspects,0,'drag handoff must cancel long press');
  assert.strictEqual(gesture.end({pointerId:8}),'drag');
}

function testRulebookShape(){
  const sections=Help.rulebookSections();
  assert.deepStrictEqual(sections.map(s=>s.id),['goal','placement','rotation','hand','scoring','routing','doubles','zeros','parity','persistence','modifiers']);
  for(const section of sections){
    assert(section.displayName&&section.shortDescription&&section.rulesDescription,`${section.id} must expose structured rulebook copy`);
  }
  const dd=M.get('double-double');
  assert(dd.displayName&&dd.shortDescription&&dd.rulesDescription,'modifier metadata must expose displayName/shortDescription/rulesDescription');
}

testRulebookTelemetryDoesNotMutateGameState();
testInspectorIsReadOnlyAndPreservesPhysicalId();
testModifierBelongsToExactPhysicalInstance();
testBoardContextComesFromEngineState();
testOperationProfileUsesEngineSemantics();
testLongPressInspectsWithoutStartingDragOrPlacement();
testMovementBeforeHoldStartsDragOnly();
testRulebookShape();
console.log('v0.21 help / inspector regression tests passed');
