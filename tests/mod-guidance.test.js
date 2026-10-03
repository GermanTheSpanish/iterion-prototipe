const assert=require('node:assert/strict');
const E=require('../engine.js'),G=require('../mod-guidance.js'),M=require('../mods.js');

assert.equal(G.all().length,19,'all 19 Market Mods need player-facing guidance');
for(const guide of G.all()){
  assert.ok(guide.market&&guide.build&&guide.reward&&guide.note,guide.id+' guidance must be complete');
  const mod=M.get(guide.id);assert.ok(mod,guide.id+' must exist in the Mod registry');
  assert.equal(guide.market,mod.shortDescription,guide.id+' Market copy must use canonical copy');
  assert.ok(guide.market.length<=36,guide.id+' Market copy must fit the compact mobile budget');
  assert.match(G.diagramHtml(guide.id,false),/modDiagram/,guide.id+' needs a schematic');
}
for(const id of ['diode','terminal','toll','scrap','spend','merge','return','swap','mirror'])assert.equal(G.get(id),null);
assert.equal(G.get('corner').reward,'Its operation becomes ×3.');assert.match(G.get('corner').build,/right angle/i);assert.doesNotMatch(G.get('corner').build,/route/i);
assert.match(G.get('long-line').build,/physical line/i);assert.match(G.get('pair').reward,/Both dominoes/i);assert.match(G.get('bridge').reward,/\+2 Signal/);

E.setBoardSize(30,40);
function piece(a,b,x,y,rr,id,tileId){const p=E.pieceFrom({a,b},x,y,0,rr,id);p.tile={id:tileId,a,b,upgrade:0,powerMultiplier:1};return p}
const target=piece(2,3,6,8,0,1,'target'),west=piece(2,2,2,8,0,2,'west'),north=piece(3,3,8,4,1,3,'north');
const state={pieces:[target,west,north],cornerTileId:'target',circuitRanks:{},zeroPortTileIds:[],round:0,coins:0,marketCount:0,foundationAssignedMarket:null,foundationLastPayoutMarket:null,brokerPreparedMarket:false,brokerDiscountStored:0,recallUsedStage:null,mintPaidRound:null,mutationUseRound:{pivot:null}};
let status=G.status('corner',state,'target');assert.equal(status.state,'active');assert.equal(status.label,'ACTIVE ×3');
state.pieces=[target];state.foundationAssignedMarket=2;state.marketCount=5;status=G.status('foundation',state,'target');assert.equal(status.label,'SURVIVED 3 MARKETS');assert.match(status.detail,/\+3c/);
state.coins=20;status=G.status('bank',state,'target');assert.equal(status.label,'ACTIVE ×3');
state.brokerDiscountStored=4;status=G.status('broker',state,'target');assert.equal(status.label,'STORED · −4c');
state.brokerPreparedMarket=true;status=G.status('broker',state,'target');assert.equal(status.label,'PRIMED · SKIP MOD');
state.mintPaidRound=0;state.round=0;status=G.status('mint',state,'target');assert.equal(status.label,'SPENT THIS ROUND');state.round=1;status=G.status('mint',state,'target');assert.equal(status.label,'READY · +1c');
console.log('Current Mod guidance and live status regressions passed');
