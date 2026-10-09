const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const source = readFileSync(require('node:path').join(__dirname, '../experiments/audio-lab/sequencer.js'), 'utf8');
(async () => { const { cascadeEvents, PIP_NOTES } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
assert.equal(PIP_NOTES.length, 7);
const input=[0,2,4,3,1,0];
assert.deepEqual(cascadeEvents(input,'forward',0.2).map(e=>e.pip),input);
assert.deepEqual(cascadeEvents(input,'reverse',0.2).map(e=>e.pip),[...input].reverse());
const branch=cascadeEvents(input,'branch',0.2);
assert.equal(branch.length,input.length*2);
assert.deepEqual(branch.filter(e=>e.branch==='A').map(e=>e.pip),input);
assert.deepEqual(branch.filter(e=>e.branch==='B').map(e=>e.pip),[...input].reverse());
assert.deepEqual(input,[0,2,4,3,1,0]);
assert.throws(()=>cascadeEvents([7]),RangeError);
assert.throws(()=>cascadeEvents([0],'unknown'),RangeError);
console.log('audio-lab sequencer tests passed');

})().catch(error => { console.error(error); process.exitCode = 1; });
