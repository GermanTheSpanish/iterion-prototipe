const assert=require('assert');
const fs=require('fs');
const path=require('path');

const data=fs.readFileSync(path.join(__dirname,'..','data.js'),'utf8');
const help=fs.readFileSync(path.join(__dirname,'..','help.js'),'utf8');
const gesture=fs.readFileSync(path.join(__dirname,'..','gesture.js'),'utf8');
const ui=fs.readFileSync(path.join(__dirname,'..','ui.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');

assert.match(data,/VERSION:'0\.21\.0'/,'Rulebook / Inspector build must be v0.21.0');
assert.match(data,/LONG_PRESS_MS:500/,'long press timing must be config-driven');
assert.match(html,/id="helpButton"[^>]*>\?<\/button>/,'gameplay must expose a discrete ? Rulebook button');
assert.match(html,/script src="help\.js"/,'Rulebook/Inspector data module must load before UI');
assert.match(html,/script src="gesture\.js"/,'gesture controller must load before UI');
assert.match(ui,/window\.IterionHelp/,'UI must consume the shared help/inspector module');
assert.match(ui,/window\.IterionGesture/,'UI must consume the long-press controller');
assert.match(ui,/H\.inspectTile\(GAME\.state\(\),tileId\)/,'inspector must read the exact current game state');
assert.match(help,/E\.connectionsForPiece\(piece,state\.pieces\|\|\[\]\)/,'board context must be sourced from the engine connection model');
assert.match(help,/E\.applyOp\(value,isDouble,state,doubleDouble\)/,'operation descriptions must be derived from engine operations');
assert.doesNotMatch(ui,/E\.applyOp\(/,'UI must not duplicate scoring operation logic');
assert.match(help,/help_open_count/,'help telemetry must include help_open_count');
assert.match(help,/help_section_opened/,'help telemetry must include help_section_opened');
assert.match(ui,/fullDebugText\(\)/,'ITERION DEBUG output must append help telemetry without replacing game debug output');
assert.match(ui,/b\.disabled=uiBusy/,'unplayable hand tiles must remain inspectable');
assert.doesNotMatch(ui,/b\.disabled=!mask\[i\]\|\|uiBusy/,'legality styling must not block inspection pointer events');
assert.match(ui,/onDragStart:\(meta,e\)=>\{if\(meta\.kind==='hand'\)startDrag/,'drag must begin only after gesture disambiguation');
assert.strictEqual((ui.match(/GAME\.beginPlacement/g)||[]).length,1,'placement entry point must remain only in endDrag');
assert.match(ui,/kind:'board',tileId:p\.tile\.id,allowDrag:false/,'placed board tiles must support inspector long press without drag');
assert.match(html,/html,body\{[^}]*overflow:hidden/,'page scrolling must remain disabled');
assert.match(html,/\.app\{[^}]*overflow:hidden/,'gameplay viewport must remain clipped to one mobile screen');

const inspectorStart=ui.indexOf('function openTileInspector('),inspectorEnd=ui.indexOf('\n  function renderRulebook()',inspectorStart);
assert(inspectorStart>=0&&inspectorEnd>inspectorStart,'openTileInspector() must exist');
assert.doesNotMatch(ui.slice(inspectorStart,inspectorEnd),/beginPlacement|finishPlacement|bestSignal/,'opening inspector must be read-only');
assert(gesture.includes("press.mode='inspect'"),'gesture controller must have an explicit inspect state');

console.log('v0.21 UI regression tests passed');
