const assert=require('assert');
const E=require('../engine.js');
const D=require('../data.js');
const M=require('../mods.js');
const Game=require('../game.js');
const Help=require('../help.js');
const Gesture=require('../gesture.js');
const clone=x=>JSON.parse(JSON.stringify(x));

function testRulebookTelemetryDoesNotMutateGameState(){
  const game=Game.createGame(E,{seed:21});const before=clone(game.state());
  Help.bindRun(game.state().runId);Help.resetTelemetry();Help.recordRulebookOpen();Help.recordSectionOpen('placement');Help.recordSectionOpen('routing');Help.recordSectionOpen('routing');
  assert.deepStrictEqual(clone(game.state()),before);assert.deepStrictEqual(Help.telemetrySnapshot(),{help_open_count:1,help_section_opened:{placement:1,routing:2}});
  assert.match(Help.debugTelemetryText(),/help_open_count=1/);assert.match(Help.debugTelemetryText(),/placement=1, routing=2/);
}
function testInspectorIsReadOnlyAndPreservesPhysicalId(){
  const game=Game.createGame(E,{seed:22}),s=game.state(),tile=s.hand.find(Boolean),before=clone(s),id=tile.id,model=Help.inspectTile(s,id);
  assert(model);assert.strictEqual(model.baseTile.id,id);assert.strictEqual(model.currentMachineState.upgradeTier,tile.upgrade||0);assert.strictEqual(model.currentMachineState.starCoins,tile.upgrade||0);assert.deepStrictEqual(clone(s),before);
}
function testModifierBelongsToExactPhysicalInstance(){
  const game=Game.createGame(E,{seed:23}),s=game.state(),original=s.set.find(t=>t.id==='d3-3'),copy={id:'test-copy-3-3',a:3,b:3,upgrade:0,source:'test-copy'};
  s.set.push(copy);s.doubleDoubleTileId=original.id;const a=Help.inspectTile(s,original.id),b=Help.inspectTile(s,copy.id);
  assert.strictEqual(a.modifiers.length,1);assert.strictEqual(a.modifiers[0].id,'double-double');assert.strictEqual(b.modifiers.length,0);assert.notStrictEqual(a.baseTile.id,b.baseTile.id);
}
function testTileRecordTracksBestOutputAndStarsWithoutPositionData(){
  const game=Game.createGame(E,{seed:24}),s=game.state(),tile=s.set.find(t=>t.id==='d2-2');tile.upgrade=2;
  s.events.push({turn:1,round:1,roundTurn:1,tile:{...tile},output:120},{turn:2,round:1,roundTurn:2,tile:{...tile},output:450});
  const before=clone(s),model=Help.inspectTile(s,tile.id),record=model.currentMachineState;
  assert.strictEqual(record.bestOutput,450);assert.strictEqual(record.activations,2);assert.strictEqual(record.upgradeTier,2);assert.strictEqual(record.starCoins,2);
  assert.strictEqual(record.location,undefined);assert.strictEqual(record.rotation,undefined);assert.strictEqual(record.connectionCount,undefined);assert.deepStrictEqual(clone(s),before);
}
function testOperationProfileUsesEngineSemantics(){assert.strictEqual(Help.operationFor(2).type,'add');assert.strictEqual(Help.operationFor(2).add,2);assert.strictEqual(Help.operationFor(3).factor,3);assert.strictEqual(Help.operationFor(0).type,'zero');assert.strictEqual(Help.operationFor(5,true,true).factor,25);assert.strictEqual(Help.operationFor(5,true,true,2).factor,50)}
function testLongPressInspectsWithoutStartingDragOrPlacement(){
  const game=Game.createGame(E,{seed:25}),before=clone(game.state());let timer=null,inspects=0,drags=0;
  const gesture=Gesture.createPressGesture({delay:D.LONG_PRESS_MS,tolerance:D.LONG_PRESS_MOVE_TOLERANCE_PX,setTimer:fn=>{timer=fn;return 1},clearTimer:()=>{},onLongPress:()=>{inspects++},onDragStart:()=>{drags++}});
  gesture.begin({pointerId:7,clientX:10,clientY:10},{kind:'hand',index:0,tileId:game.state().hand[0].id,allowDrag:true});timer();assert.strictEqual(inspects,1);assert.strictEqual(drags,0);assert.strictEqual(gesture.end({pointerId:7}),'inspect');assert.deepStrictEqual(clone(game.state()),before);
}
function testMovementBeforeHoldStartsDragOnly(){let timer=null,inspects=0,drags=0;const gesture=Gesture.createPressGesture({delay:500,tolerance:10,setTimer:fn=>{timer=fn;return 1},clearTimer:()=>{},onLongPress:()=>{inspects++},onDragStart:()=>{drags++}});gesture.begin({pointerId:8,clientX:0,clientY:0},{kind:'hand',allowDrag:true});assert.strictEqual(gesture.move({pointerId:8,clientX:20,clientY:0}),'drag');timer();assert.strictEqual(drags,1);assert.strictEqual(inspects,0);assert.strictEqual(gesture.end({pointerId:8}),'drag')}
function testRulebookShape(){const sections=Help.rulebookSections();assert.deepStrictEqual(sections.map(s=>s.id),['goal','placement','rotation','hand','scoring','routing','doubles','zeros','parity','persistence','power','economy','modifiers','circuits']);for(const section of sections)assert(section.displayName&&section.shortDescription&&section.rulesDescription);assert.match(sections.find(s=>s.id==='economy').rulesDescription,/Shop is available during active rounds/);assert.match(sections.find(s=>s.id==='power').rulesDescription,/POWER/);const dd=M.get('double-double');assert(dd.displayName&&dd.shortDescription&&dd.rulesDescription)}

testRulebookTelemetryDoesNotMutateGameState();testInspectorIsReadOnlyAndPreservesPhysicalId();testModifierBelongsToExactPhysicalInstance();testTileRecordTracksBestOutputAndStarsWithoutPositionData();testOperationProfileUsesEngineSemantics();testLongPressInspectsWithoutStartingDragOrPlacement();testMovementBeforeHoldStartsDragOnly();testRulebookShape();
console.log('v0.21 help / inspector regression tests passed');
