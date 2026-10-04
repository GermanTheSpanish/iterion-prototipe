const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const ui=read('ui.js'),theme=read('ui-theme.css'),runtime=read('ui-runtime-fixes.js'),html=read('index.html');

assert.match(ui,/PLACEMENT_LOCK_MS=100,PLACEMENT_LOCK_TOLERANCE_PX=12/);
assert.match(ui,/function latchedPlacementCandidate\(raw,e,now=performance\.now\(\)\)/);
assert.match(ui,/const raw=nearest\(e\.clientX,e\.clientY\),o=drag\.candidate,c=latchedPlacementCandidate\(raw,e\)/);
assert.match(ui,/if\(dwell>=PLACEMENT_LOCK_MS&&Math\.hypot\(dx,dy\)<=PLACEMENT_LOCK_TOLERANCE_PX\)/);

assert.match(ui,/hole\.className='boardVoid inspectable'/);
assert.match(ui,/kind:'void',voidId:voidItem\.id,allowDrag:false/);
assert.match(ui,/function openVoidInspector\(voidId\).*type:'void-inspector'/);
assert.match(ui,/voidInspectorWord\" tabindex=\"-1\">VOID<\/div>/);
assert.match(ui,/auxOverlay\.type==='void-inspector'\)renderVoidInspector\(\)/);

assert.doesNotMatch(ui,/el\.onpointerup=.*openCoreInspector/);
assert.match(ui,/function beginTilePress\(e,meta\)\{\s*if\(uiBusy\|\|drag\.active/);
assert.match(ui,/function openCoreInspector\(coreId\)\{if\(drag\.active\|\|uiBusy\)return/);

assert.match(theme,/\.boardVoid\{[^}]*background:var\(--bg\)[^}]*box-shadow:inset 0 0 12px/);
assert.match(theme,/\.boardVoid::after\{content:none\}/);
assert.match(theme,/\.voidInspectorModal>h2,\.voidInspectorModal>\.modalActions\{display:none!important\}/);
assert.match(theme,/\.voidInspectorWord\{/);

assert.match(html,/id="signalHud" class="signalHud" role="button" tabindex="0"/);
assert.match(html,/class="signalHudIcon" aria-hidden="true"/);
assert.doesNotMatch(html,/signalHudLabel">SIGNAL/);
assert.match(ui,/function openSignalInspector\(\).*type:'signal-inspector'/);
assert.match(ui,/auxOverlay\.type==='signal-inspector'\)renderSignalInspector\(\)/);
assert.match(runtime,/\.signalHud\{[^}]*pointer-events:auto!important[^}]*touch-action:manipulation!important/);
assert.match(runtime,/\.signalHudIcon\{[^}]*clip-path:polygon/);
assert.match(runtime,/\.board\{[^}]*box-shadow:0 4px 12px rgba\(25,23,19,\.10\)!important/);

console.log('v0.66.0 board touch, Void inspector and placement-lock regressions passed');
