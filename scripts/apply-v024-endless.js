const fs=require('fs');

function replaceOnce(path,from,to){
  const src=fs.readFileSync(path,'utf8');
  const i=src.indexOf(from);
  if(i<0)throw new Error(`Missing expected text in ${path}: ${from.slice(0,120)}`);
  if(src.indexOf(from,i+from.length)>=0)throw new Error(`Expected unique text in ${path}: ${from.slice(0,120)}`);
  fs.writeFileSync(path,src.slice(0,i)+to+src.slice(i+from.length));
}
function replaceBlock(path,start,end,replacement){
  const src=fs.readFileSync(path,'utf8');
  const a=src.indexOf(start),b=src.indexOf(end,a+start.length);
  if(a<0||b<0)throw new Error(`Missing block markers in ${path}: ${start} / ${end}`);
  fs.writeFileSync(path,src.slice(0,a)+replacement+src.slice(b));
}

replaceOnce('data.js',
  '    TOTAL_ROUNDS:15,\n    STAGE_SIZE:3,',
  '    TOTAL_ROUNDS:15,\n    ENDLESS_TARGET_MULTIPLIER:5,\n    STAGE_SIZE:3,'
);

replaceOnce('game.js',
  '  function target(){return cfg.TARGETS[s.round]}',
  "  function targetForRound(roundIndex=s.round){const targets=cfg.TARGETS||[],fixed=targets[roundIndex];if(Number.isFinite(fixed))return fixed;const lastIndex=Math.max(0,targets.length-1),last=Number(targets[lastIndex])||0,extra=Math.max(0,roundIndex-lastIndex);return last*Math.pow(cfg.ENDLESS_TARGET_MULTIPLIER||5,extra)}\n  function target(){return targetForRound(s.round)}"
);
replaceOnce('game.js',
  'idc:0,running:false,cleared:false',
  'idc:0,running:false,standardComplete:false,endlessMode:false,endlessStartedRound:null,cleared:false'
);
replaceOnce('game.js',
  "    if(s.round>=cfg.TOTAL_ROUNDS-1){s.nextShopType='none';s.intermissionResolved=true;return}",
  "    if(!s.endlessMode&&s.round>=cfg.TOTAL_ROUNDS-1){s.nextShopType='none';s.intermissionResolved=true;return}"
);
replaceOnce('game.js',
  "      s.events.push({type:'coins',round:s.round+1,amount:reward,breakdown:rewardBreakdown,coins:s.coins});scheduleIntermission()",
  "      if(!s.standardComplete&&s.round===cfg.TOTAL_ROUNDS-1){s.standardComplete=true;s.events.push({type:'run-complete',round:s.round+1,target:target(),output:s.score,coins:s.coins,inflation:s.inflation})}\n      s.events.push({type:'coins',round:s.round+1,amount:reward,breakdown:rewardBreakdown,coins:s.coins});scheduleIntermission()"
);
replaceOnce('game.js',
  "  function advance(){if(!s.cleared||s.round>=cfg.TOTAL_ROUNDS-1||s.shopOpen||!s.intermissionResolved)return false;s.round++;startRound(false);return true}\n  function status(){return s.cleared&&s.round===cfg.TOTAL_ROUNDS-1?'COMPLETE':s.blocked?'ROUND FAILED':'IN PROGRESS'}",
  "  function canStartEndless(){return !!s.standardComplete&&!s.endlessMode&&s.cleared&&s.round===cfg.TOTAL_ROUNDS-1&&!s.running&&!s.shopOpen}\n  function startEndless(){if(!canStartEndless())return false;s.endlessMode=true;s.endlessStartedRound=s.round+2;s.events.push({type:'endless-start',afterRound:s.round+1,nextRound:s.round+2,target:targetForRound(s.round+1)});s.round++;startRound(false);return true}\n  function advance(){if(!s.cleared||s.shopOpen||!s.intermissionResolved)return false;if(!s.endlessMode&&s.round>=cfg.TOTAL_ROUNDS-1)return false;s.round++;startRound(false);return true}\n  function status(){if(s.endlessMode)return s.blocked?'ENDLESS FAILED':s.cleared?'ENDLESS CLEAR':'ENDLESS';return s.standardComplete?'COMPLETE':s.blocked?'ROUND FAILED':'IN PROGRESS'}"
);
replaceOnce('game.js',
  'status:status(),failureReason:s.failureReason,round:',
  "status:status(),failureReason:s.failureReason,endless:{available:canStartEndless(),active:!!s.endlessMode,baseComplete:!!s.standardComplete,startedRound:s.endlessStartedRound,roundsCleared:Math.max(0,s.wins.length-cfg.TOTAL_ROUNDS),targetMultiplier:cfg.ENDLESS_TARGET_MULTIPLIER||5},round:"
);
replaceOnce('game.js',
  '`Stage: ${x.stage.index}/${x.stage.total} · round ${x.stage.round}/${x.stage.size}`',
  "`Stage: ${x.stage.index}/${x.endless.active?'∞':x.stage.total} · round ${x.stage.round}/${x.stage.size}`"
);
replaceOnce('game.js',
  '`Round: ${x.round.index}/${x.round.total} · target=${x.round.target} · moves=${x.round.placements}/${x.round.maxPlacements}`',
  "`Round: ${x.round.index}/${x.endless.active?'∞':x.round.total} · target=${x.round.target} · moves=${x.round.placements}/${x.round.maxPlacements}`"
);
replaceOnce('game.js',
  "`Machine Mods: ${x.longRun?'LONG RUN':'-'}`,`Next: ${x.shop.nextType} · open=${x.shop.open?'yes':'no'}${x.shop.open?` (${x.shop.type})`:''}`",
  "`Machine Mods: ${x.longRun?'LONG RUN':'-'}`,`Endless: ${x.endless.active?`active · baseComplete=${x.endless.baseComplete?'yes':'no'} · clears=${x.endless.roundsCleared}`:x.endless.baseComplete?'available · baseComplete=yes':'off'}`,`Next: ${x.shop.nextType} · open=${x.shop.open?'yes':'no'}${x.shop.open?` (${x.shop.type})`:''}`"
);
replaceOnce('game.js',
  "      if(v.type==='opening-double'){lines.push(`R1 OPENING DOUBLE [${v.tile.a}|${v.tile.b}]`);continue}",
  "      if(v.type==='run-complete'){lines.push(`RUN COMPLETE R${v.round} target=${v.target} output=${v.output} coins=${v.coins} inflation=${v.inflation}`);continue}\n      if(v.type==='endless-start'){lines.push(`ENDLESS START R${v.nextRound} target=${v.target}`);continue}\n      if(v.type==='opening-double'){lines.push(`R1 OPENING DOUBLE [${v.tile.a}|${v.tile.b}]`);continue}"
);
replaceOnce('game.js',
  'return{state:()=>s,config:cfg,target,stageIndex,boardSizeForStage,',
  'return{state:()=>s,config:cfg,target,targetForRound,stageIndex,boardSizeForStage,'
);
replaceOnce('game.js',
  'useUndo,canUndo,advance,rotateRoot,',
  'useUndo,canUndo,advance,startEndless,canStartEndless,rotateRoot,'
);

replaceOnce('ui.js',
  "versionEl.textContent=`v${D.VERSION} · ${D.TOTAL_ROUNDS} rounds`;",
  "versionEl.textContent=`v${D.VERSION} · ${D.TOTAL_ROUNDS} rounds + Endless`;"
);
replaceOnce('ui.js',
  'machine:x.board.length}',
  'machine:x.board.length,endless:x.endless}'
);
replaceOnce('ui.js',
  '<div class="sumCard"><div class="sumLabel">PROGRESS</div><div class="sumValue">${r.roundsCleared}/${r.totalRounds}</div><div class="sumSmall">Rounds cleared</div></div>',
  '<div class="sumCard"><div class="sumLabel">PROGRESS</div><div class="sumValue">${r.endless?.active?`${D.TOTAL_ROUNDS}/${D.TOTAL_ROUNDS} + ${r.endless.roundsCleared}`:`${r.roundsCleared}/${r.totalRounds}`}</div><div class="sumSmall">${r.endless?.active?\'Base complete · Endless clears\':\'Rounds cleared\'}</div></div>'
);
replaceOnce('ui.js',
  '  function showClear(){',
  "  function startEndless(){clearOutcomeDelay();if(!GAME.startEndless()){toast('Endless unavailable');return}GAME.save();hideOverlay();handFx.fill('normal');render();toast(`ENDLESS · ROUND ${GAME.state().round+1}`)}\n  function showClear(){"
);
replaceBlock('ui.js','  function showClear(){','\n  function showShop(){',`  function showClear(){
    resetOverlay();const s=GAME.state(),x=GAME.snapshot(),complete=x.status==='COMPLETE',endless=!!x.endless?.active,last=s.wins[s.wins.length-1];
    overlayTitle.textContent=complete?'RUN COMPLETE':endless?'ENDLESS ROUND CLEAR':'ROUND CLEAR';
    overlayBody.innerHTML=complete?\`<p>Base run complete · Final output \${fmt(s.score)} · Target \${fmt(GAME.target())}</p>\${summaryHtml()}<p class="shopFoot">Continue with the same machine. Endless Targets scale ×\${D.ENDLESS_TARGET_MULTIPLIER||5} every round; the completed base run remains recorded.</p>\`:\`<p>Output \${fmt(s.score)} · Target \${fmt(GAME.target())}<br>Clear +\${last?.reward||0}c\${last?.upgradeCoins?\` · ★ activations +\${last.upgradeCoins}c\`:''}</p>\`;
    if(complete){overlayPrimary.textContent='CONTINUE · ENDLESS';overlayPrimary.onclick=startEndless;overlaySecondary.style.display='inline-block';overlaySecondary.textContent='COPY RUN DATA';overlaySecondary.onclick=copyRun;setNewRunButton(overlayTertiary);return}
    const next=s.nextShopType;overlayPrimary.textContent=next==='market'?'MARKET':endless?'NEXT ENDLESS ROUND':'NEXT ROUND';overlayPrimary.onclick=()=>{if(next==='none'){advanceRound();return}if(GAME.openIntermission()){GAME.save();render()}else toast('Unavailable')};
    if(GAME.canUndo()){overlaySecondary.style.display='inline-block';overlaySecondary.textContent=\`UNDO · \${s.consumables.undo}\`;overlaySecondary.onclick=useUndo}
  }`);
replaceOnce('ui.js',
  "    const supply=x.availableTileCount,nextMarket=x.round.index<D.TOTAL_ROUNDS-(D.STAGE_SIZE||3)?`Next Market in ${D.STAGE_SIZE||3} rounds`:'Final stage · no later Market',offers=s.shopOffers.map(id=>GAME.marketOfferInfo(id));",
  "    const supply=x.availableTileCount,nextMarket=x.endless?.active?`Next Market in ${D.STAGE_SIZE||3} rounds`:x.round.index<D.TOTAL_ROUNDS-(D.STAGE_SIZE||3)?`Next Market in ${D.STAGE_SIZE||3} rounds`:'Final stage · no later Market',offers=s.shopOffers.map(id=>GAME.marketOfferInfo(id));"
);
replaceOnce('ui.js',
  "    resetOverlay();const s=GAME.state(),noTiles=s.failureReason==='no-tiles',limit=s.failureReason==='placement-limit';overlayTitle.textContent=noTiles?'NO TILES LEFT':'ROUND FAILED';",
  "    resetOverlay();const s=GAME.state(),x=GAME.snapshot(),endless=!!x.endless?.active,noTiles=s.failureReason==='no-tiles',limit=s.failureReason==='placement-limit';overlayTitle.textContent=endless?'ENDLESS OVER':noTiles?'NO TILES LEFT':'ROUND FAILED';"
);
replaceOnce('ui.js',
  "    overlayBody.innerHTML=`<p>${reason}</p>${summaryHtml()}<button id=\"copyFailedRun\" class=\"shopBuy secondary\">COPY RUN DATA</button>`;",
  "    overlayBody.innerHTML=`<p>${endless?`Base run complete · Endless reached Round ${s.round+1}.<br>`:''}${reason}</p>${summaryHtml()}<button id=\"copyFailedRun\" class=\"shopBuy secondary\">COPY RUN DATA</button>`;"
);
replaceOnce('ui.js',
  'stageEl.textContent=`${x.stage.index}/${x.stage.total}`;',
  "stageEl.textContent=`${x.stage.index}/${x.endless?.active?'∞':x.stage.total}`;"
);
replaceOnce('ui.js',
  'roundEl.textContent=`${s.round+1}/${D.TOTAL_ROUNDS}`;',
  "roundEl.textContent=`${s.round+1}/${x.endless?.active?'∞':D.TOTAL_ROUNDS}`;"
);
replaceOnce('ui.js',
  'stageRoundEl.textContent=`STAGE ${x.stage.index} · ROUND ${x.stage.round}/${x.stage.size}`;',
  "stageRoundEl.textContent=x.endless?.active?`ENDLESS · STAGE ${x.stage.index} · ROUND ${x.stage.round}/${x.stage.size}`:`STAGE ${x.stage.index} · ROUND ${x.stage.round}/${x.stage.size}`;"
);

replaceOnce('help.js',
  "The machine itself ${D.PERSIST_MACHINE_BETWEEN_ROUNDS?'stays on the board between rounds':'does not persist between rounds'}.",
  "The machine itself ${D.PERSIST_MACHINE_BETWEEN_ROUNDS?'stays on the board between rounds':'does not persist between rounds'}. After Round ${D.TOTAL_ROUNDS}, a completed run may continue in Endless. The base win stays recorded and each later Target is ×${D.ENDLESS_TARGET_MULTIPLIER||5} the previous one."
);

fs.writeFileSync('tests/v024-endless.test.js',`const assert=require('assert');
const D=require('../data.js');
const E=require('../engine.js');
const Game=require('../game.js');

function piece(tile,x,y,id){const p=E.pieceFrom(tile,x,y,0,0,id);p.tile={...tile};return p}
function fakeWin(round){return{round,target:D.TARGETS[Math.min(round-1,D.TARGETS.length-1)],output:1,placements:1,machineSize:2,setSize:28,reward:0,upgradeCoins:0,anchor:{a:6,b:6},upgradeTier:0}}

assert.strictEqual(D.ENDLESS_TARGET_MULTIPLIER,5);
assert.deepStrictEqual(D.BOARD_SIZES,[[18,24],[21,28],[24,32],[27,36],[30,40]],'Endless must not change canonical board dimensions');
E.setBoardSize(18,24);
const game=Game.createGame(E,{seed:2401}),s=game.state(),double=s.set.find(t=>t.id==='d6-6'),zero=s.set.find(t=>t.id==='d0-4');
assert.strictEqual(game.targetForRound(14),50000000000);
assert.strictEqual(game.targetForRound(15),250000000000);
assert.strictEqual(game.targetForRound(16),1250000000000);
assert.strictEqual(game.targetForRound(19),156250000000000);
assert.strictEqual(game.canStartEndless(),false,'Endless cannot start before the base run is complete');

const pd=piece(double,2,2,101),pz=piece(zero,8,2,102);s.pieces=[pd,pz];s.placedTileIds=[double.id,zero.id];s.reserve=s.set.filter(t=>!s.placedTileIds.includes(t.id));s.hand=[null,null,null,null,null];s.round=14;s.roundTurn=1;s.turn=23;s.coins=41;s.inflation=7;s.mods=['long-run'];s.doubleDoubleTileId=double.id;s.doubleEchoTileId=double.id;s.zeroMemoryTileId=zero.id;s.wins=Array.from({length:14},(_,i)=>fakeWin(i+1));
const clear=game.finishPlacement({ok:true,tile:double,p:pd,trigger:12,sim:{output:50000000000,events:[],reason:'test',rebounds:0,search:{starts:0,leaves:1,expanded:0}}});
assert.strictEqual(clear.cleared,true);
assert.strictEqual(s.standardComplete,true,'clearing R15 records the base victory');
assert.strictEqual(game.snapshot().status,'COMPLETE');
assert.strictEqual(game.snapshot().endless.available,true);
assert.strictEqual(s.nextShopType,'none','R15 completion does not insert an extra Market before Endless');
const preserved={coins:s.coins,inflation:s.inflation,setSize:s.set.length,mods:[...s.mods],dd:s.doubleDoubleTileId,de:s.doubleEchoTileId,zm:s.zeroMemoryTileId,ids:[...s.placedTileIds]};

assert.strictEqual(game.startEndless(),true);
assert.strictEqual(s.endlessMode,true);
assert.strictEqual(s.round,15,'Endless starts on R16');
assert.strictEqual(game.target(),250000000000);
assert.strictEqual(game.snapshot().status,'ENDLESS');
assert.strictEqual(game.snapshot().endless.baseComplete,true,'base victory remains recorded');
assert.strictEqual(game.snapshot().endless.roundsCleared,0);
assert.strictEqual(s.coins,preserved.coins);assert.strictEqual(s.inflation,preserved.inflation);assert.strictEqual(s.set.length,preserved.setSize);assert.deepStrictEqual(s.mods,preserved.mods);assert.strictEqual(s.doubleDoubleTileId,preserved.dd);assert.strictEqual(s.doubleEchoTileId,preserved.de);assert.strictEqual(s.zeroMemoryTileId,preserved.zm);assert.deepStrictEqual(s.placedTileIds,preserved.ids);
assert.strictEqual(new Set(s.placedTileIds).size,s.placedTileIds.length,'physical tile IDs remain unique in the machine');
assert.deepStrictEqual(E.getBoardSize(),{G:30,H:40},'Endless keeps the maximum canonical board size');
assert.strictEqual(game.startEndless(),false,'Endless can only be entered once');

s.round=17;s.roundTurn=1;s.score=0;s.cleared=false;s.blocked=false;s.failureReason=null;s.intermissionResolved=true;s.nextShopType='none';
const r18=game.finishPlacement({ok:true,tile:double,p:s.pieces.find(p=>p.tile.id===double.id),trigger:12,sim:{output:game.target(),events:[],reason:'test',rebounds:0,search:{starts:0,leaves:1,expanded:0}}});
assert.strictEqual(r18.cleared,true);assert.strictEqual(s.nextShopType,'market','Markets continue every three rounds in Endless');assert.strictEqual(s.intermissionResolved,false);assert.strictEqual(game.openIntermission(),true);assert.strictEqual(game.closeMarket(),true);
s.cleared=false;s.blocked=true;s.failureReason='no-legal-moves';
const failed=game.snapshot();assert.strictEqual(failed.status,'ENDLESS FAILED');assert.strictEqual(failed.endless.baseComplete,true);assert.match(game.debugText(),/Round: 18\/∞/);assert.match(game.debugText(),/Endless: active · baseComplete=yes/);assert(game.debugText().includes('ENDLESS START R16 target=250000000000'));
console.log('v0.24 Endless gameplay regression tests passed');
`);

fs.writeFileSync('tests/v024-endless-ui.test.js',`const assert=require('assert'),fs=require('fs'),path=require('path');
const ui=fs.readFileSync(path.join(__dirname,'..','ui.js'),'utf8'),game=fs.readFileSync(path.join(__dirname,'..','game.js'),'utf8'),help=fs.readFileSync(path.join(__dirname,'..','help.js'),'utf8'),engine=fs.readFileSync(path.join(__dirname,'..','engine.js'),'utf8');
assert.match(ui,/CONTINUE · ENDLESS/);assert.match(ui,/ENDLESS ROUND CLEAR/);assert.match(ui,/ENDLESS OVER/);assert.match(ui,/GAME\.startEndless\(\)/);assert.match(ui,/∞/);assert.match(help,/continue in Endless/);assert.match(game,/function targetForRound/);assert.match(game,/function canStartEndless/);assert.match(game,/function startEndless/);assert.match(engine,/const av=\[a\.traversals\|\|0,a\.output\|\|0,a\.rebounds\|\|0,\(a\.path\|\|\[\]\)\.length\]/,'route comparator must remain traversals → Output → rebounds → path length');
console.log('v0.24 Endless UI regression tests passed');
`);

fs.unlinkSync(__filename);
console.log('Applied v0.24 Endless patch');
