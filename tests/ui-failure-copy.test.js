const fs=require('fs');
const path=require('path');
const assert=require('assert');
const ui=fs.readFileSync(path.join(__dirname,'..','ui.js'),'utf8');

assert.doesNotMatch(ui,/function showNoMoves\(\)/,'no-legal-moves must never return to a confirmation overlay');
assert.doesNotMatch(ui,/else if\(s\.needsReroll\)/,'render must not expose a needsReroll popup state');
assert.match(ui,/NO LEGAL MOVES · AUTO REROLL/,'automatic recovery should provide compact feedback');

const start=ui.indexOf('function showFailed(){'),end=ui.indexOf('\n\n  function render(){',start);assert(start>=0&&end>start);const failed=ui.slice(start,end);
assert.match(failed,/id="downloadFailedRun"/);assert.match(failed,/DOWNLOAD RUN \.TXT/);assert.match(failed,/NomonUiPolish\?\.shareDebug/);assert.match(failed,/MACHINE STALLED/);assert.match(failed,/ENDLESS OVER/);assert.match(failed,/recovery\.shopRescue/);assert.match(failed,/\+1 MOVE/);assert.match(failed,/!noLegal&&GAME\.canUndo\(\)/);assert.match(failed,/after all available Rerolls were used/);assert.match(failed,/setNewRunButton/);
console.log('ui failure export and auto-reroll popup regression: ok');
