const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const D=require('../data.js'),E=require('../engine.js'),M=require('../mods.js');

E.setBoardSize(30,40);
function piece(a,b,x,y,rr,id){const p=E.pieceFrom({a,b},x,y,0,rr,id);p.tile={id:`tile-${id}`,a,b};return p}
function op(pieceId,value){return{type:'op',piece:pieceId,entryHalf:0,exitHalf:1,entrySide:'L',exitSide:'R',value,op:value===0?'zero':value%2?'multiply':'add',before:0,after:0,add:0,factor:0,powerMultiplier:1}}
function replay(pieces,modId,pieceId,value,initial=5){
  const base={output:0,gain:0,path:[{piece:pieceId}],segments:[{piece:pieceId}],events:[op(pieceId,value)],reason:'fixture',traversals:1,rebounds:0};
  const result=E.replaySelectedScoring(base,initial,{pieces,modIdsByPiece:new Map([[pieceId,new Set([modId])]]),pairMultiplier:D.PAIR_MOD_MULTIPLIER});
  assert.deepEqual(result.path,base.path,'retained scoring Mods must not rewrite the selected route');
  assert.deepEqual(result.segments,base.segments,'retained scoring Mods must not rewrite route segments');
  return result
}

assert.equal(D.VERSION,'0.47.1');
assert.equal(D.TWIN_MOD_MULTIPLIER,undefined);
assert.equal(D.PAIR_MOD_MULTIPLIER,3);
assert.equal(M.get('twin'),null);assert.equal(M.get('recall').collectionCode,'RC');assert.equal(M.get('pair').collectionCode,'PR');
for(const retired of ['sequence','complement'])assert.equal(M.get(retired),null,`${retired} was replaced by Signal v2`);

{
  const pair=[piece(2,3,2,2,0,1),piece(2,3,2,4,0,2)];
  const r=replay(pair,'pair',1,3);assert.equal(r.events[0].pair,true);assert.equal(r.events[0].modMultiplier,3);assert.equal(r.output,45);
  const inactive=replay([piece(2,3,2,2,0,1)],'pair',1,3);assert.equal(inactive.events[0].pair,false);assert.equal(inactive.events[0].modMultiplier,1);
}
{
  const a=piece(2,3,2,2,0,1),b=piece(2,3,2,4,0,2);
  assert.equal(E.modGeometryFacts(a,[a,b]).twin,true,'duplicate printed tiles remain legitimate distinct physical instances');
  assert.notEqual(a.id,b.id,'duplicate values never imply duplicate physical identity');
}
const engineSource=fs.readFileSync(path.join(__dirname,'..','engine.js'),'utf8');
assert.match(engineSource,/const av=\[a\.traversals\|\|0,a\.output\|\|0,a\.rebounds\|\|0,\(a\.path\|\|\[\]\)\.length\]/,'route comparator remains protected');
assert.doesNotMatch(engineSource,/mods\.has\('twin'\)/,'TWIN scoring behavior is retired');
console.log('Mutation v2 retained PAIR and physical-identity regressions passed');
