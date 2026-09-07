const fs=require('fs');
const path=require('path');
const assert=require('assert');
const ui=fs.readFileSync(path.join(__dirname,'..','ui.js'),'utf8');
const start=ui.indexOf('function showFailed(){'),end=ui.indexOf('\n\n  function render(){',start);assert(start>=0&&end>start);const failed=ui.slice(start,end);
assert.match(failed,/id="copyFailedRun"/);assert.match(failed,/querySelector\('#copyFailedRun'\)\.onclick=copyRun/);assert.match(failed,/\+1 MOVE/);assert.match(failed,/UNDO/);assert.match(failed,/SHOP/);assert.match(failed,/setNewRunButton/);
console.log('ui failure copy regression: ok');
