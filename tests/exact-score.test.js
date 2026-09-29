const assert=require('assert');
const S=require('../score.js');
const E=require('../engine.js');
const C=require('../circuits.js');

const edge=String(Number.MAX_SAFE_INTEGER);
assert.equal(S.add(edge,1),'9007199254740992');
assert.equal(S.add(S.add(edge,1),1),'9007199254740993','adjacent integers above 2^53 stay distinct');
assert.equal(S.multiply('9007199254740993',5),'45035996273704965');
assert.equal(S.floorMultiply('9007199254740993',1.5),'13510798882111489','Circuit +50% preserves floor semantics exactly');
assert.equal(S.powMultiply('50000000000',5,20),'4768371582031250000000000');

const state={output:Number.MAX_SAFE_INTEGER,outputExact:String(Number.MAX_SAFE_INTEGER)};
const add=E.applyOp(2,false,state,false,1);
assert.equal(add.afterExact,'9007199254740993');
assert.equal(state.outputExact,'9007199254740993');
const mult=E.applyOp(5,false,state,false,1);
assert.equal(mult.afterExact,'45035996273704965');

const piece={id:1,tile:{id:'d1-1'}};
const cfg={CIRCUIT_RANKS:[{bonus:.5}]};
const resonance=C.resonance(Number('9007199254740993'),[{type:'op',piece:1}],[piece],{'d1-1':1},cfg,'9007199254740993');
assert.equal(resonance.baseOutputExact,'9007199254740993');
assert.equal(resonance.outputExact,'13510798882111489');
assert.equal(resonance.safeInteger,false);

console.log('exact score arithmetic regressions passed');
