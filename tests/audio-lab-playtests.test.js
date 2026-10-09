const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
(async () => {
  const file = readFileSync(join(__dirname, '../experiments/audio-lab/playtest-cascades.js'), 'utf8');
  const { PLAYTEST_CASCADES } = await import('data:text/javascript;base64,' + Buffer.from(file).toString('base64'));
  assert.deepEqual(PLAYTEST_CASCADES.map(item => item.id), ['short','medium','long','monstrous']);
  assert.deepEqual(PLAYTEST_CASCADES.map(item => item.operations), [2,5,16,32]);
  for (const item of PLAYTEST_CASCADES) {
    assert.equal(item.operations,item.pips.length);
    assert.ok(item.pips.every(pip => Number.isInteger(pip) && pip >= 0 && pip <= 6));
    assert.match(item.source,/MONOID_PLAYTEST/);
  }
  assert.deepEqual(PLAYTEST_CASCADES.map(item => item.rebounds),[0,0,1,2]);
  console.log('Audio Lab playtest fixtures passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
