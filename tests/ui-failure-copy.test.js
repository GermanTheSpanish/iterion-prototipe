const fs=require('fs');
const path=require('path');
const assert=require('assert');
const ui=fs.readFileSync(path.join(__dirname,'..','ui.js'),'utf8');

assert.doesNotMatch(ui,/function showNoMoves\(\)/,'no-legal state must not expose the old confirmation overlay');
const autoStart=ui.indexOf('async function autoResolveRequiredRerolls(){'),autoEnd=ui.indexOf('\n\n  function fullDebugText',autoStart);assert(autoStart>=0&&autoEnd>autoStart);
const auto=ui.slice(autoStart,autoEnd);
assert.match(auto,/GAME\.resolveRequiredRerolls\(\)/);assert.match(auto,/NO LEGAL MOVES · REROLL USED/);assert.match(auto,/REROLLS USED/);assert.match(auto,/persistGame\(\)/);

const start=ui.indexOf('function showFailed(){'),end=ui.indexOf('\n\n  function render(){',start);assert(start>=0&&end>start);const failed=ui.slice(start,end);
assert.match(failed,/id="downloadFailedRun"/);assert.match(failed,/DOWNLOAD RUN \.TXT/);assert.match(failed,/NomonUiPolish\?\.shareDebug/);assert.match(failed,/ENDLESS OVER/);assert.match(failed,/All available Rerolls were consumed automatically/);
assert.match(failed,/recovery\.shopRescue/);assert.match(failed,/recovery\.undo/);assert.match(failed,/\+1 MOVE/);assert.match(failed,/setNewRunButton/);
console.log('ui automatic reroll and terminal failure export regression: ok');
