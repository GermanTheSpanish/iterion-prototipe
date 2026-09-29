const assert=require('assert');
const fs=require('fs');
const E=require('../engine.js');

E.setBoardSize(30,40);
function piece(a,b,x,y,rr,id){const p=E.pieceFrom({a,b},x,y,0,rr,id);p.tile={id:`tile-${id}`,a,b};return p}
const pieces=[
  piece(3,3,6,8,0,1),
  piece(0,3,2,8,0,2),
  piece(3,0,10,8,0,3),
  piece(3,2,7,10,1,4)
];
const normal=E.bestSignal(4,pieces,{initialOutput:5,bifurcate:true});
const ported=E.bestSignal(4,pieces,{initialOutput:5,bifurcate:true,zeroPortPieceIds:[2,3]});
assert(normal.rebounds>0,'canonical zero fixture must rebound without Zero Port');
assert.strictEqual(ported.rebounds,0,'paired Zero Ports replace the zero rebound');
assert(ported.events.some(e=>e.type==='zero-port'&&e.piece===2&&e.toPieceId===3));
assert(ported.events.some(e=>e.type==='zero-port'&&e.piece===3&&e.toPieceId===2));
assert(!ported.events.some(e=>e.type==='zero-memory'),'Zero Memory no longer exists in scoring');
const source=fs.readFileSync(require.resolve('../engine.js'),'utf8');
const traversalsIndex=source.indexOf('const at=a.traversals||0,bt=b.traversals||0'),outputIndex=source.indexOf('const scoreCmp=SCORE.compare('),tailIndex=source.indexOf("const av=[a.rebounds||0,(a.path||[]).length]");
assert(traversalsIndex>=0&&outputIndex>traversalsIndex&&tailIndex>outputIndex,'route comparator must remain traversals → exact output → rebounds → path length');
console.log('v0.23 Stage C Zero Port isolated engine tests passed');
