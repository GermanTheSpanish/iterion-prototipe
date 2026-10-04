const assert=require('node:assert/strict');
const E=require('../engine.js');

E.setBoardSize(18,24);
const tile=value=>({a:value,b:value});
const horizontal=E.pieceFrom(tile(4),4,4,0,0,1);
const parallelHorizontal=E.pieceFrom(tile(4),4,6,0,0,2);
const vertical=E.pieceFrom(tile(5),10,4,0,1,3);
const parallelVertical=E.pieceFrom(tile(5),8,4,0,1,4);

const horizontalContact=E.contactBetweenPieces(parallelHorizontal,horizontal);
assert.equal(horizontalContact.ok,true);
assert.equal(horizontalContact.kind,'double-parallel');
assert.equal(horizontalContact.contacts.length,2);
assert.equal(E.validatePlacement(tile(4),4,6,0,0,[horizontal]).ok,true);

const verticalContact=E.contactBetweenPieces(parallelVertical,vertical);
assert.equal(verticalContact.ok,true);
assert.equal(verticalContact.kind,'double-parallel');
assert.equal(verticalContact.contacts.length,2);
assert.equal(E.validatePlacement(tile(5),8,4,0,1,[vertical]).ok,true);

const wrongValue=E.validatePlacement(tile(3),4,6,0,0,[horizontal]);
assert.equal(wrongValue.ok,false);
assert.equal(wrongValue.reason,'value-mismatch');

const partial=E.validatePlacement(tile(4),5,6,0,0,[horizontal]);
assert.equal(partial.ok,false);
assert.equal(partial.reason,'off-centre-double-port');

console.log('v0.65.1 placement feel and parallel-double regressions passed');
