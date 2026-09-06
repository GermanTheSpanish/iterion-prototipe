const fs=require('fs');
const path=require('path');
const assert=require('assert');

const ui=fs.readFileSync(path.join(__dirname,'..','ui.js'),'utf8');
const start=ui.indexOf('function showFailed(){');
const end=ui.indexOf('\n  function render(){',start);
assert(start>=0&&end>start,'showFailed() must exist');
const failed=ui.slice(start,end);
assert.match(failed,/id="copyFailedRun"/,'failed-run overlay must expose a copy control');
assert.match(failed,/querySelector\('#copyFailedRun'\)\.onclick=copyRun/,'failed-run copy control must call copyRun()');
assert.match(failed,/\+1 MOVE/,'failure rescue Move action must remain available');
assert.match(failed,/UNDO/,'failure rescue Undo action must remain available');
assert.match(failed,/setNewRunButton/,'New Run action must remain available');
console.log('ui failure copy regression: ok');
