const assert=require('assert');
const fs=require('fs');
const path=require('path');

const ui=fs.readFileSync(path.join(__dirname,'..','ui.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');

assert.match(ui,/DOUBLE DOUBLE/,'Market UI must expose Double Double by name');
assert.match(ui,/No stock limit; coins and Inflation set the limit\./,'Mystery Domino must communicate unlimited stock');
assert.match(ui,/SUPPLY \$\{supply\} · \$\{nextMarket\}/,'Market must show physical tile supply and next Market timing');
assert.match(ui,/doubleDoubleMark/,'Double Double tiles must have a visual marker');

assert.match(ui,/function magnitude\(v\)/,'cascade FX must scale from numeric magnitude');
assert.match(ui,/CASCADE_FX_PER_DIGIT_PX/,'operation FX size must grow with digit count');
assert.match(ui,/CASCADE_FX_PER_DIGIT_MS/,'operation FX lifetime must grow with digit count');
assert.match(ui,/CASCADE_FINAL_MS/,'final cascade value must have an extended lifetime');

assert.match(ui,/reboundArrow/,'rebound FX must use the simple directional arrow');
assert.match(ui,/Math\.atan2\(entry\.y-exit\.y,entry\.x-exit\.x\)/,'rebound arrow direction must derive from the actual rebound vector');
assert.doesNotMatch(html,/reboundGlyph/,'legacy curved rebound glyph CSS must not remain');
assert.match(html,/\.reboundArrow\{/,'directional rebound arrow CSS must exist');

assert.match(html,/\.doubleDoubleMark\{/,'Double Double tile marker CSS must exist');
assert.match(html,/animation:pop 1\.2s forwards/,'operation numbers must remain visible longer than the old 0.72s effect');
assert.match(html,/animation:final 1\.8s forwards/,'final output must remain visible longer than the old 1s effect');

console.log('retained v0.19 UI regression tests passed');
