const fs=require('fs'),assert=require('assert');
const path=require('path');
const runtime=fs.readFileSync(path.join(__dirname,'..','ui-runtime-fixes.js'),'utf8');
const v2=fs.readFileSync(path.join(__dirname,'..','ui-gameplay-v2.css'),'utf8');
const ui=fs.readFileSync(path.join(__dirname,'..','ui.js'),'utf8');

assert.strictEqual(fs.existsSync(path.join(__dirname,'..','ui-phase-a.js')),false,'Phase A must remain consolidated into the runtime UI layer');
assert(runtime.includes('function installPhaseA()'),'runtime UI layer must own the consolidated Phase A installer');
assert(ui.includes('V.hudViewModel('),'gameplay HUD must consume the presentation view model');
assert(ui.includes('V.tileViewModel('),'tile rendering must consume the presentation view model');

assert(runtime.includes('aspect-ratio:3 / 4!important'),'runtime board must preserve canonical 3:4 geometry');
for(const side of ['top','right','bottom','left'])assert(runtime.includes(`'${side}'`),`missing ${side} board marker`);
assert(runtime.includes('left:50%;width:1px;height:10px;transform:translateX(-50%)'),'top/bottom marks must remain mathematically centred');
assert(runtime.includes('top:50%;width:10px;height:1px;transform:translateY(-50%)'),'left/right marks must remain mathematically centred');

assert(v2.includes('width:min(100cqw,75cqh)!important'),'V2 board must use the available gameplay width instead of the legacy 350px cap');
assert(v2.includes('height:min(100cqh,133.333333cqw)!important'),'V2 board must preserve 3:4 geometry while filling its viewport');
assert(v2.includes('grid-template-columns:1fr 1fr!important'),'V2 tools must use the approved 2x2 control cluster');
assert(v2.includes('flex-direction:row!important'),'V2 Hand must be horizontal');
assert(v2.includes('aspect-ratio:1/2!important')&&v2.includes('height:auto!important')&&v2.includes('box-sizing:border-box!important')&&v2.includes('height:50%!important')&&v2.includes('flex:1 1 50%!important'),'V2 Hand dominoes must keep a rigid physical 1:2 ratio even under horizontal compression');
assert(v2.includes('min-height:44px!important'),'compact V2 must preserve minimum mobile touch targets');
assert(v2.includes('#menuButton.wordmark'),'MONOID wordmark must be the interactive menu control');
assert(runtime.includes("menu.textContent!=='MONOID'"),'runtime sync must preserve MONOID as the menu label');
assert(runtime.includes("button.textContent='Rulebook'"),'Rulebook entry must live in MONOID menu');

assert(!runtime.includes('gameplay-ui-pass.js?v='),'gameplay pass must not create an extra runtime asset');
assert(!v2.includes('.scoreProgress{display:none!important}'),'score progress remains a visible canonical presentation cue');
assert(v2.includes('height:1px!important'),'V2 score instrument must stay quiet and visible');
assert(v2.includes('body:not(.endlessPalette) .app .railActions #shopButton'),'classic Shop keeps the approved black emphasis');
assert(v2.includes('background:#151515!important'),'classic Shop must remain visually distinct');
assert(v2.includes('body .gameMenu #helpButton[aria-hidden="true"]{display:none!important}'),'legacy Help proxy must not occupy gameplay space');

console.log('Gameplay Exploration V2 composition regression: ok');
