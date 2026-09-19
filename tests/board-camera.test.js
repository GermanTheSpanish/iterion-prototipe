const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const camera=fs.readFileSync(path.join(root,'board-camera.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'ui.js'),'utf8');
const pwa=fs.readFileSync(path.join(root,'pwa.js'),'utf8');

test('board camera remains a presentation-only runtime layer',()=>{
  assert.match(camera,/MIN_SCALE=1,PINCH_SENSITIVITY=\.6/);
  assert.match(camera,/Math\.min\(gx\/bg,hy\/bh\)/);
  assert.match(camera,/overflow:hidden!important/);
  assert.doesNotMatch(camera,/MAX_SCALE|EDGE_PAD/);
  assert.match(camera,/pointerType/);
  assert.match(camera,/signal-fork/);
  assert.match(camera,/--board-cell-px/);
  assert.doesNotMatch(camera,/finishPlacement|restoreState|exportState\s*\(/);
  assert.match(pwa,/board-camera\.js/);
});

test('placement telemetry separates synchronous search from animation',()=>{
  assert.match(ui,/searchStarted=performance\.now\(\)/);
  assert.match(ui,/animationStarted=performance\.now\(\)/);
  assert.match(ui,/eventsRendered/);
  assert.match(ui,/PERFORMANCE TELEMETRY/);
  assert.match(ui,/--drag-scale/);
});
