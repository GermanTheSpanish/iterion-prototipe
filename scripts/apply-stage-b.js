const fs=require('fs');

function replace(path,from,to,label){let src=fs.readFileSync(path,'utf8');if(!src.includes(from))throw new Error(`${label} baseline mismatch`);src=src.replace(from,to);fs.writeFileSync(path,src)}

replace('data.js',`    MARKET_PURCHASE_LIMIT:1,\n    MARKET_DOUBLE_DOUBLE_COST:8,`,`    MARKET_PURCHASE_LIMIT:1,\n    MARKET_DOUBLE_DOUBLE_COST:8,\n    MARKET_LONG_RUN_COST:8,\n    LONG_RUN_UNIQUE_THRESHOLD:10,`,'Stage B data');

replace('mods.js',`  register({id:'double-double',displayName:'DOUBLE DOUBLE',name:'DOUBLE DOUBLE',kind:'market-tile-mod',market:true,target:'double',marketCostKey:'MARKET_DOUBLE_DOUBLE_COST',shortDescription:'Amplify one double already built into the machine.',rulesDescription:'The Market randomly selects one eligible non-zero physical double already placed in the machine. Its first activation each Move applies both halves; later passes in the same Move use the normal double operation.',description:'Randomly modifies one placed non-zero double. Its first activation each Move is amplified.'});\n  return{register,get,all};`,`  register({id:'double-double',displayName:'DOUBLE DOUBLE',name:'DOUBLE DOUBLE',kind:'market-tile-mod',market:true,target:'double',marketCostKey:'MARKET_DOUBLE_DOUBLE_COST',shortDescription:'Amplify one double already built into the machine.',rulesDescription:'The Market randomly selects one eligible non-zero physical double already placed in the machine. Its first activation each Move applies both halves; later passes in the same Move use the normal double operation.',description:'Randomly modifies one placed non-zero double. Its first activation each Move is amplified.'});\n  register({id:'long-run',displayName:'LONG RUN',name:'LONG RUN',kind:'market-machine-mod',market:true,target:'machine',marketCostKey:'MARKET_LONG_RUN_COST',shortDescription:'Long routes pay every activated star once.',rulesDescription:'When the chosen route traverses at least 10 unique physical tiles in one Move, every starred physical tile activated on that route pays its tier once. Otherwise the normal highest-star-wins rule remains.',description:'At 10+ unique routed tiles, all activated stars pay once instead of only the highest tier.'});\n  return{register,get,all};`,'Stage B mods');

replace('game.js',`  function upgradeIncomeFor(sim){\n    const seen=new Set(),activations=[];\n    for(const e of sim.events||[]){\n      if(e.type!=='op'||seen.has(e.piece))continue;\n      seen.add(e.piece);const p=s.pieces.find(x=>x.id===e.piece),tier=p?.tile?.upgrade||0;\n      if(tier>0)activations.push({pieceId:e.piece,tileId:p.tile.id,a:p.tile.a,b:p.tile.b,tier,coins:tier})\n    }\n    return{activations,total:activations.reduce((best,a)=>Math.max(best,a.tier),0)}\n  }\n  function awardUpgradeIncome(income){\n    if(!income.total)return 0;\n    s.coins+=income.total;s.roundUpgradeCoins+=income.total;\n    s.events.push({type:'upgrade-coins',round:s.round+1,roundTurn:s.roundTurn,amount:income.total,activations:income.activations,coins:s.coins});return income.total\n  }`,`  function upgradeIncomeFor(sim){\n    const seen=new Set(),activations=[];\n    for(const e of sim.events||[]){\n      if(e.type!=='op'||seen.has(e.piece))continue;\n      seen.add(e.piece);const p=s.pieces.find(x=>x.id===e.piece),tier=p?.tile?.upgrade||0;\n      if(tier>0)activations.push({pieceId:e.piece,tileId:p.tile.id,a:p.tile.a,b:p.tile.b,tier,coins:tier})\n    }\n    const uniquePieces=seen.size,longRunOwned=s.mods.includes('long-run'),longRunActive=longRunOwned&&uniquePieces>=(cfg.LONG_RUN_UNIQUE_THRESHOLD||10);\n    const total=longRunActive?activations.reduce((sum,a)=>sum+a.tier,0):activations.reduce((best,a)=>Math.max(best,a.tier),0);\n    return{activations,total,uniquePieces,longRunOwned,longRunActive}\n  }\n  function awardUpgradeIncome(income){\n    if(!income.total)return 0;\n    s.coins+=income.total;s.roundUpgradeCoins+=income.total;\n    s.events.push({type:'upgrade-coins',round:s.round+1,roundTurn:s.roundTurn,amount:income.total,activations:income.activations,uniquePieces:income.uniquePieces,longRunOwned:income.longRunOwned,longRunActive:income.longRunActive,coins:s.coins});return income.total\n  }`,'Stage B star economy');

replace('game.js',`  function marketTargetCount(id){return marketTargetTiles(id).length}`,`  function marketTargetCount(id){const m=M.get(id);if(!m)return 0;if(m.target==='machine')return s.mods.includes(id)?0:1;return marketTargetTiles(id).length}`,'Stage B market target count');

replace('game.js',`  function buyMarketMod(id){\n    if(!s.shopOpen||s.shopType!=='market')return{ok:false,reason:'shop'};\n    if(!s.shopOffers.includes(id))return{ok:false,reason:'offer'};\n    if(s.marketBuys.length>=(cfg.MARKET_PURCHASE_LIMIT||1))return{ok:false,reason:'limit'};\n    const m=M.get(id);if(!m?.market)return{ok:false,reason:'item'};\n    const candidates=marketTargetTiles(id);if(!candidates.length)return{ok:false,reason:'no-target'};\n    const cost=marketModPrice(id);if(s.coins<cost)return{ok:false,reason:'coins'};\n    const tile=candidates[Math.floor(rnd()*candidates.length)],previousTileId=id==='double-double'?(s.doubleDoubleTileId||null):null,purchase=applyPurchase(cost);\n    if(id==='double-double')s.doubleDoubleTileId=tile.id;else return{ok:false,reason:'unsupported'};\n    const record={mod:id,tile:cloneTile(tile),targetTileId:tile.id,cost,inflationBefore:purchase.inflationBefore,inflationAfter:purchase.inflationAfter};s.marketBuys.push(record);\n    s.events.push({type:'double-double',mod:id,round:s.round+1,shop:'market',tile:cloneTile(tile),targetTileId:tile.id,previousTileId,candidateCount:candidates.length,baseCost:Number(cfg[m.marketCostKey])||0,cost,coins:s.coins,...purchase});\n    return{ok:true,mod:id,tile:cloneTile(tile),targetTileId:tile.id,previousTileId,candidateCount:candidates.length,cost,inflation:s.inflation}\n  }`,`  function buyMarketMod(id){\n    if(!s.shopOpen||s.shopType!=='market')return{ok:false,reason:'shop'};\n    if(!s.shopOffers.includes(id))return{ok:false,reason:'offer'};\n    if(s.marketBuys.length>=(cfg.MARKET_PURCHASE_LIMIT||1))return{ok:false,reason:'limit'};\n    const m=M.get(id);if(!m?.market)return{ok:false,reason:'item'};\n    if(marketTargetCount(id)<1)return{ok:false,reason:'no-target'};\n    const cost=marketModPrice(id);if(s.coins<cost)return{ok:false,reason:'coins'};\n    let tile=null,previousTileId=null,candidateCount=1;\n    if(m.target==='double'){const candidates=marketTargetTiles(id);candidateCount=candidates.length;tile=candidates[Math.floor(rnd()*candidates.length)];previousTileId=id==='double-double'?(s.doubleDoubleTileId||null):null}\n    if(id!=='double-double'&&id!=='long-run')return{ok:false,reason:'unsupported'};\n    const purchase=applyPurchase(cost);\n    if(id==='double-double')s.doubleDoubleTileId=tile.id;\n    if(id==='long-run'&&!s.mods.includes(id))s.mods.push(id);\n    const record={mod:id,tile:cloneTile(tile),targetTileId:tile?.id||null,cost,inflationBefore:purchase.inflationBefore,inflationAfter:purchase.inflationAfter};s.marketBuys.push(record);\n    const type=id==='double-double'?'double-double':'market-mod-buy';\n    s.events.push({type,mod:id,round:s.round+1,shop:'market',tile:cloneTile(tile),targetTileId:tile?.id||null,previousTileId,candidateCount,baseCost:Number(cfg[m.marketCostKey])||0,cost,coins:s.coins,...purchase});\n    return{ok:true,mod:id,tile:cloneTile(tile),targetTileId:tile?.id||null,previousTileId,candidateCount,cost,inflation:s.inflation}\n  }`,'Stage B Market purchase');

let stageA=fs.readFileSync('tests/v023-stage-a.test.js','utf8');stageA=stageA.replace(`  assert.deepStrictEqual(s.shopOffers,['double-double'],'Stage A has one valid Market mod, so the Market may present one of up to three offers');`,`  assert(s.shopOffers.includes('double-double'),'Double Double must remain a valid Market offer when it has a placed target');\n  assert(s.shopOffers.length<=D.MARKET_OFFER_COUNT);`).replace(`  assert.deepStrictEqual(s.shopOffers,['double-double'],'Double Double may be offered again when another placed target exists');`,`  assert(s.shopOffers.includes('double-double'),'Double Double may be offered again when another placed target exists');`);fs.writeFileSync('tests/v023-stage-a.test.js',stageA);

const test=`const assert=require('assert');
const D=require('../data.js');
const E=require('../engine.js');
const Game=require('../game.js');

assert.strictEqual(D.VERSION,'0.22.1');
assert.strictEqual(D.ENGINE_VERSION,'0.13.0-double-double');
assert.strictEqual(D.LONG_RUN_UNIQUE_THRESHOLD,10);
assert.strictEqual(D.MARKET_LONG_RUN_COST,8);

function makePiece(id,upgrade){const tile={id:'lr-'+id,a:2,b:2,upgrade,source:'test'},p=E.pieceFrom(tile,(id%5)*4,Math.floor(id/5)*4,0,0,id);p.tile=tile;return p}
function economyCase(uniqueCount,stars,longRun,repeats=[]){
  E.setBoardSize(30,40);const game=Game.createGame(E,{seed:2302,TARGETS:Array(15).fill(1e15)}),s=game.state();
  s.mods=longRun?['long-run']:[];s.pieces=[];
  for(let i=1;i<=uniqueCount;i++)s.pieces.push(makePiece(i,stars[i]||0));
  s.hand=[s.set.find(t=>t.id==='d1-2'),null,null,null,null];s.reserve=s.set.filter(t=>t.id!=='d1-2');s.running=true;s.roundTurn=1;s.turn=1;s.blocked=false;s.failureReason=null;
  const events=[];for(let i=1;i<=uniqueCount;i++)events.push({type:'op',piece:i,op:'add',add:2,before:i,after:i+2});for(const id of repeats)events.push({type:'op',piece:id,op:'add',add:2,before:1,after:3});
  const p=s.pieces[0],result=game.finishPlacement({ok:true,tile:{id:'ctx',a:1,b:2,upgrade:0,source:'test'},p,trigger:3,sim:{output:10,events,reason:'test',rebounds:repeats.length,search:{starts:1,leaves:1,expanded:1}}});
  const income=[...s.events].reverse().find(e=>e.type==='upgrade-coins');return{result,income,s}
}

{
  const {result,income}=economyCase(9,{1:3,2:2,3:1},true);
  assert.strictEqual(result.upgradeCoins,3,'9 unique tiles must keep highest-star-wins');
  assert.strictEqual(income.longRunActive,false);
  assert.strictEqual(income.uniquePieces,9);
}
{
  const {result,income}=economyCase(10,{1:3,2:2,3:1},true);
  assert.strictEqual(result.upgradeCoins,6,'Long Run must sum each activated star tier once');
  assert.strictEqual(income.longRunActive,true);
  assert.strictEqual(income.uniquePieces,10);
}
{
  const {result,income}=economyCase(10,{1:3,2:2,3:1},true,[2,2,2]);
  assert.strictEqual(result.upgradeCoins,6,'repeated traversal/rebound of one physical star must not pay twice');
  assert.strictEqual(income.activations.filter(a=>a.pieceId===2).length,1);
}
{
  const {result,income}=economyCase(10,{1:3,2:2,3:1},false);
  assert.strictEqual(result.upgradeCoins,3,'without Long Run the existing highest-star-wins rule must remain');
  assert.strictEqual(income.longRunActive,false);
}
{
  const game=Game.createGame(E,{seed:44,STARTING_COINS:100}),s=game.state();s.cleared=true;s.round=2;s.nextShopType='market';s.intermissionResolved=false;s.coins=100;
  assert.strictEqual(game.openIntermission(),true);assert(s.shopOffers.includes('long-run'),'Long Run must be a valid machine-mod offer while unowned');
  const buy=game.buyMarketMod('long-run');assert.strictEqual(buy.ok,true);assert(s.mods.includes('long-run'));assert.strictEqual(buy.cost,8);assert.strictEqual(s.inflation,1);
  game.closeMarket();s.cleared=true;s.round=5;s.nextShopType='market';s.intermissionResolved=false;s.shopOpen=false;
  assert.strictEqual(game.openIntermission(),true);assert(!s.shopOffers.includes('long-run'),'an owned permanent machine mod must not be offered again');
}
console.log('v0.23 Stage B Long Run regression tests passed');
`;
fs.writeFileSync('tests/v023-stage-b.test.js',test);fs.unlinkSync(__filename);
