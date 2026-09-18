const fs=require('fs');
const path=require('path');
const assert=require('assert');
const ui=fs.readFileSync(path.join(__dirname,'..','ui.js'),'utf8');

assert.doesNotMatch(ui,/function showNoMoves\(\)/,'no-legal moves must not open a recovery-choice prompt');
assert.doesNotMatch(ui,/downloadNoMovesRun/,'obsolete no-moves recovery overlay must be removed');
assert.doesNotMatch(ui,/Use this round.s free Reroll/,'UI must not ask the player to confirm automatic reroll recovery');

const start=ui.indexOf('function showFailed(){'),end=ui.indexOf('\n\n  function render(){',start);assert(start>=0&&end>start);const failed=ui.slice(start,end);
assert.match(failed,/id="downloadFailedRun"/);assert.match(failed,/DOWNLOAD RUN \.TXT/);assert.match(failed,/NomonUiPolish\?\.shareDebug/);
assert.match(failed,/ENDLESS OVER/);assert.match(failed,/No legal placements remain and there are no Rerolls left/);
assert.match(failed,/recovery\.shopRescue/);assert.match(failed,/\+1 MOVE/);assert.match(failed,/UNDO/);assert.match(failed,/SHOP/);assert.match(failed,/setNewRunButton/);
console.log('ui failure export and automatic no-legal reroll regression: ok');
