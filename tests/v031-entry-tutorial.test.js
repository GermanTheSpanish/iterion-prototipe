const assert=require('assert');
const fs=require('fs');
const path=require('path');
const D=require('../data.js');
const E=require('../engine.js');
const G=require('../game.js');

assert.strictEqual(D.VERSION,'0.31.0');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const ui=fs.readFileSync(path.join(__dirname,'..','ui.js'),'utf8');
assert.match(html,/id="titleCard"[^>]*role="button"[^>]*tabindex="0"/);
assert.match(html,/LEARN MONOID · 2 MIN/);
assert.match(html,/SKIP · START RUN/);
assert.match(html,/id="continueRun"/);
assert.match(html,/id="replayTutorial"/);
assert.match(html,/class="selectionDouble"/);
assert.match(ui,/e\.stopPropagation\(\);showSelection\(\)/,'entry activation must consume the event');
assert.match(ui,/if\(tutorial\)return GAME\.snapshot\(\)/,'tutorial must never write normal-run storage');

const normal=G.createGame(E,{seed:3101});
const before=normal.exportState();
const tutorial=G.createGame(E,{seed:3100,TARGETS:[1e9],STARTING_COINS:30});
assert.notStrictEqual(normal.state().runId,tutorial.state().runId);
assert.notStrictEqual(normal.state().rngState,tutorial.state().rngState);
assert.deepStrictEqual(normal.exportState(),before,'creating and playing a tutorial sandbox must not mutate the normal run');

const restored=G.createGame(E,{seed:9});
assert.strictEqual(restored.restoreState(before),true);
assert.deepStrictEqual(restored.exportState(),before,'active run state and RNG must round-trip exactly');
assert.strictEqual(restored.state().hand[0].a,restored.state().hand[0].b,'continued opening hand retains the real first-double rule');
assert.strictEqual(restored.beginPlacement(1,{x:0,y:0,rr:0}).reason,'first-double','normal run opening rules remain authoritative');
assert.strictEqual(restored.restoreState({schema:'wrong'}),false);
console.log('v0.31 entry, persistence and tutorial isolation regression tests passed');
