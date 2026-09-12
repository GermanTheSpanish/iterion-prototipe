const fs=require('fs');
const path=require('path');
const assert=require('assert');
const ui=fs.readFileSync(path.join(__dirname,'..','ui.js'),'utf8');
const start=ui.indexOf('function showFailed(){'),end=ui.indexOf('\n\n  function render(){',start);assert(start>=0&&end>start);const failed=ui.slice(start,end);
assert.match(failed,/id="downloadFailedRun"/);assert.match(failed,/DOWNLOAD RUN \.TXT/);assert.match(failed,/NomonUiPolish\?\.shareDebug/);assert.match(failed,/MACHINE STALLED/);assert.match(failed,/ENDLESS OVER/);assert.match(failed,/recovery\.shopRescue/);assert.match(failed,/\+1 MOVE/);assert.match(failed,/UNDO/);assert.match(failed,/SHOP/);assert.match(failed,/setNewRunButton/);
console.log('ui failure export and stalled-state regression: ok');
