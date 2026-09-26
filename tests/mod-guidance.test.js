const assert=require('node:assert/strict');
const E=require('../engine.js'),G=require('../mod-guidance.js');

assert.equal(G.all().length,28,'all 28 market Mods need player-facing guidance');
for(const guide of G.all()){
  assert.ok(guide.market&&guide.build&&guide.reward&&guide.note,guide.id+' guidance must be complete');
  assert.match(G.diagramHtml(guide.id,false),/modDiagram/,guide.id+' needs a schematic');
}
assert.equal(G.get('corner').reward,'Its operation becomes ×3.');
assert.match(G.get('corner').build,/right angle/i);
assert.doesNotMatch(G.get('corner').build,/route/i);
assert.match(G.get('long-line').build,/physical line/i);
assert.doesNotMatch(G.get('long-line').build,/streak|traversal/i);

E.setBoardSize(30,40);
function piece(a,b,x,y,rr,id,tileId){
  const p=E.pieceFrom({a,b},x,y,0,rr,id);p.tile={id:tileId,a,b,upgrade:0,powerMultiplier:1};return p
}
const target=piece(2,3,6,8,0,1,'target'),west=piece(2,2,2,8,0,2,'west'),north=piece(3,3,8,4,1,3,'north');
const state={pieces:[target,west,north],cornerTileId:'target',circuitRanks:{},zeroPortTileIds:[],round:0,coins:0,marketCount:0,foundationAssignedMarket:null,foundationLastPayoutMarket:null,brokerDiscountReady:false,tollArmed:false,mintPaidRound:null};
const facts=E.modGeometryFacts(target,state.pieces);assert.equal(facts.corner,true);assert.equal(facts.connectionCount,2);
let status=G.status('corner',state,'target');assert.equal(status.state,'active');assert.equal(status.label,'ACTIVE ×3');
state.pieces=[target,west];status=G.status('corner',state,'target');assert.equal(status.state,'inactive');

state.pieces=[target];state.foundationAssignedMarket=2;state.foundationLastPayoutMarket=4;state.marketCount=5;
status=G.status('foundation',state,'target');assert.equal(status.label,'MATURITY 1/3');assert.match(status.detail,/Pays \+3c/);
state.coins=20;status=G.status('bank',state,'target');assert.equal(status.label,'ACTIVE ×3');
state.coins=4;status=G.status('spend',state,'target');assert.equal(status.label,'ACTIVE ×3');
state.tollArmed=true;state.coins=1;status=G.status('toll',state,'target');assert.equal(status.label,'ARMED · −1c');
state.brokerDiscountReady=true;status=G.status('broker',state,'target');assert.equal(status.label,'READY · −1c');
state.mintPaidRound=0;state.round=0;status=G.status('mint',state,'target');assert.equal(status.label,'SPENT THIS ROUND');
state.round=1;status=G.status('mint',state,'target');assert.equal(status.label,'READY · +1c');

console.log('Mod guidance and live status regressions passed');
