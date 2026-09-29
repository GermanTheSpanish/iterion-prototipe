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

const seedExact='9007199254740993',armA=S.add(seedExact,2),armB=S.add(seedExact,4),joined=S.add(armA,armB);
const branchReplay=E.replaySelectedScoring({
  output:Number(joined),outputExact:joined,gain:Number(S.subtract(joined,seedExact)),gainExact:S.subtract(joined,seedExact),
  path:[],segments:[],reason:'fixture',traversals:2,rebounds:0,
  events:[
    {type:'signal-fork',piece:99,output:Number(seedExact),outputExact:seedExact},
    {type:'signal-start',fork:99,arm:0,output:Number(seedExact),outputExact:seedExact},
    {type:'op',piece:1,value:2,op:'add',doubleDouble:false,powerMultiplier:1,before:Number(seedExact),after:Number(armA)},
    {type:'signal-end',fork:99,arm:0,output:Number(armA),outputExact:armA},
    {type:'signal-start',fork:99,arm:1,output:Number(seedExact),outputExact:seedExact},
    {type:'op',piece:2,value:4,op:'add',doubleDouble:false,powerMultiplier:1,before:Number(seedExact),after:Number(armB)},
    {type:'signal-end',fork:99,arm:1,output:Number(armB),outputExact:armB},
    {type:'signal-join',piece:99,output:Number(joined),outputExact:joined}
  ]
},Number(seedExact),{initialOutputExact:seedExact,pieces:[],modIdsByPiece:new Map([[1,new Set(['fixture-replay'])]])});
assert.equal(branchReplay.outputExact,joined,'fork arms sum as exact integers');
assert.equal(branchReplay.events.find(event=>event.type==='signal-join').outputExact,joined);

const echoStart=S.add(seedExact,2),mainExact=S.multiply(echoStart,5),doubleEchoExact=S.add(mainExact,mainExact);
const echoReplay=E.replaySelectedEcho({
  output:Number(mainExact),outputExact:mainExact,gain:Number(S.subtract(mainExact,seedExact)),gainExact:S.subtract(mainExact,seedExact),
  path:[],segments:[],reason:'fixture',traversals:2,rebounds:0,
  events:[
    {type:'op',piece:7,value:2,op:'add',after:Number(echoStart),afterExact:echoStart,powerMultiplier:1,modMultiplier:1},
    {type:'op',piece:8,value:5,op:'multiply',after:Number(mainExact),afterExact:mainExact,powerMultiplier:1,modMultiplier:1}
  ]
},{doubleEchoPieceId:7,initialOutput:Number(seedExact),initialOutputExact:seedExact});
assert.equal(echoReplay.echoOutputExact,mainExact,'Double Echo replay preserves exact downstream arithmetic');
assert.equal(echoReplay.outputExact,doubleEchoExact,'Main + Echo uses exact addition');
assert.equal(echoReplay.events.find(event=>event.type==='double-echo-result').finalOutputExact,doubleEchoExact);

console.log('exact score arithmetic regressions passed');
