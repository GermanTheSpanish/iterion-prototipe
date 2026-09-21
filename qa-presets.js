(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.MonoidQaPresets=api;
  if(root?.document){api.installMenuAccess(root);api.autoStart(root);api.autoResumeReturn(root);}
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const BUILD_ID='20260921.4';
  const ACTIVE_RUN_KEY='iterion.activeRun.v1';
  const ACTIVE_MODE_KEY='iterion.activeRunMode.v1';
  const LATEST_RUN_KEY='iterion.latestRun.v9';
  const TUTORIAL_KEY='iterion.tutorialChoice.v1';
  const PROTECTED_KEYS=new Set([ACTIVE_RUN_KEY,ACTIVE_MODE_KEY,LATEST_RUN_KEY,TUTORIAL_KEY]);
  const PRESETS=Object.freeze({
    classic14:Object.freeze({id:'classic14',mode:'classic',round:13,generation:2,score:0,best:57863119300,coins:165,inflation:8,endless:false,powerGeneration:2,sourceRunId:'mu66e4fp-116me8o'}),
    infinite16:Object.freeze({id:'infinite16',mode:'infinite-endless',round:15,generation:3,score:125000000000,best:610000000000,coins:142,inflation:9,endless:true,powerGeneration:3})
  });

  const REAL_CLASSIC14=Object.freeze({
    seed:2248371096,
    runId:'mu66e4fp-116me8o',
    hand:Object.freeze(['g2-d0-2','g2-d0-1','g2-d1-3','g2-d1-1','g2-d1-5']),
    pieces:Object.freeze([
      ['d3-3',22,18,1,0],['d3-5',22,22,1,0],['d3-6',22,16,3,0],['d4-5',18,24,0,0],['d5-6',18,14,0,0],
      ['d1-4',14,24,0,0],['d1-3',12,24,3,0],['d0-4',18,20,1,0],['d2-5',14,14,0,3],['d2-2',12,14,1,3],
      ['d2-3',12,18,1,2],['d2-4',10,15,2,3],['d4-4',6,14,1,1],['d0-3',16,20,2,3],['d3-4',24,19,0,0],
      ['d4-6',6,12,3,0],['d2-6',6,6,1,0],['d1-2',8,4,2,0],['d0-5',16,18,3,3],['d1-1',10,4,0,0],
      ['d1-5',14,4,0,0],['d5-5',18,4,0,0],['d6-6',22,10,1,0],['d0-2',12,10,1,0],['d0-1',12,8,3,0],
      ['d0-0',14,8,1,0],['d0-6',10,10,2,3],['d1-6',10,24,2,0],['g2-d5-6',22,6,1,0],['g2-d3-5',24,4,2,2]
    ]),
    wins:Object.freeze([
      {round:1,target:20,output:24,turn:2,placements:2,reward:4,machineSize:2,setSize:28,setGeneration:1,upgradeCoins:0,anchor:{a:3,b:5},upgradeTier:0},
      {round:2,target:100,output:135,turn:3,placements:1,reward:4,machineSize:3,setSize:28,setGeneration:1,upgradeCoins:0,anchor:{a:3,b:6},upgradeTier:0},
      {round:3,target:500,output:1155,turn:6,placements:3,reward:4,machineSize:6,setSize:28,setGeneration:1,upgradeCoins:0,anchor:{a:1,b:4},upgradeTier:0},
      {round:4,target:2500,output:133455,turn:9,placements:3,reward:4,machineSize:9,setSize:28,setGeneration:1,upgradeCoins:0,anchor:{a:2,b:5},upgradeTier:3},
      {round:5,target:10000,output:265082,turn:10,placements:1,reward:4,machineSize:10,setSize:28,setGeneration:1,upgradeCoins:3,anchor:{a:2,b:2},upgradeTier:3},
      {round:6,target:50000,output:416959,turn:11,placements:1,reward:4,machineSize:11,setSize:28,setGeneration:1,upgradeCoins:3,anchor:{a:2,b:3},upgradeTier:2},
      {round:7,target:250000,output:2844170,turn:12,placements:1,reward:4,machineSize:12,setSize:28,setGeneration:1,upgradeCoins:3,anchor:{a:2,b:4},upgradeTier:3},
      {round:8,target:1000000,output:3856690,turn:13,placements:1,reward:4,machineSize:13,setSize:28,setGeneration:1,upgradeCoins:3,anchor:{a:4,b:4},upgradeTier:1},
      {round:9,target:5000000,output:11014154385,turn:14,placements:1,reward:4,machineSize:14,setSize:28,setGeneration:1,upgradeCoins:3,anchor:{a:0,b:3},upgradeTier:3},
      {round:10,target:25000000,output:13677371394,turn:19,placements:5,reward:3,machineSize:19,setSize:28,setGeneration:1,upgradeCoins:52,anchor:{a:0,b:5},upgradeTier:3},
      {round:11,target:100000000,output:149511656,turn:26,placements:7,reward:3,machineSize:26,setSize:28,setGeneration:1,upgradeCoins:73,anchor:{a:0,b:0},upgradeTier:0},
      {round:12,target:500000000,output:57863119300,turn:27,placements:1,reward:4,machineSize:27,setSize:28,setGeneration:1,upgradeCoins:12,anchor:{a:0,b:6},upgradeTier:3},
      {round:13,target:2500000000,output:19914158600,turn:30,placements:3,reward:4,machineSize:30,setSize:56,setGeneration:2,upgradeCoins:32,anchor:{a:3,b:5},upgradeTier:2}
    ]),
    circuitRanks:Object.freeze({'d3-3':4,'d4-5':2,'d2-2':5}),
    circuitSignatures:Object.freeze([
      '[["d1-3","d1-4"],["d1-3","d2-3"],["d1-4","d4-5"],["d2-2","d2-3"],["d2-2","d2-5"],["d2-5","d5-6"],["d3-3","d3-5"],["d3-3","d3-6"],["d3-5","d4-5"],["d3-6","d5-6"]]',
      '[["d0-3","d0-4"],["d0-3","d2-3"],["d0-4","d4-5"],["d1-3","d1-4"],["d1-3","d2-3"],["d1-4","d4-5"]]',
      '[["d0-3","d0-5"],["d0-3","d2-3"],["d0-5","d2-5"],["d2-2","d2-3"],["d2-2","d2-5"]]',
      '[["d0-1","d0-2"],["d0-1","d1-1"],["d0-2","d2-2"],["d1-1","d1-2"],["d1-2","d2-6"],["d2-2","d2-4"],["d2-4","d4-4"],["d2-6","d4-6"],["d4-4","d4-6"]]',
      '[["d0-2","d0-6"],["d0-2","d2-2"],["d0-6","d4-6"],["d2-2","d2-4"],["d2-4","d4-4"],["d4-4","d4-6"]]',
      '[["d0-1","d0-2"],["d0-1","d1-1"],["d0-2","d2-2"],["d1-1","d1-5"],["d1-5","d5-5"],["d2-2","d2-5"],["d2-5","d5-6"],["d3-6","d5-6"],["d3-6","d6-6"],["d5-5","g2-d3-5"],["d6-6","g2-d5-6"],["g2-d3-5","g2-d5-6"]]'
    ])
  });

  const clone=value=>JSON.parse(JSON.stringify(value));
  const powerForGeneration=generation=>Math.min(4,Math.max(1,generation));
  function makeSet(maxGeneration=1){
    const out=[];
    for(let a=0;a<=6;a++)for(let b=a;b<=6;b++)out.push({id:`d${a}-${b}`,a,b,upgrade:0,source:'base'});
    for(let generation=2;generation<=maxGeneration;generation++)for(let a=0;a<=6;a++)for(let b=a;b<=6;b++)out.push({id:`g${generation}-d${a}-${b}`,a,b,upgrade:0,source:'power-set',generation,powerMultiplier:powerForGeneration(generation)});
    return out
  }
  function pieceSpecs(generation){
    const p=(a,b)=>`g${generation}-d${Math.min(a,b)}-${Math.max(a,b)}`;
    return[
      ['d1-2',6,26,0],['d2-3',10,26,0],['d3-4',14,26,0],['d4-5',18,26,0],['d5-6',22,26,0],
      ['d1-6',26,24,1],['d1-5',26,22,3],[p(5,6),26,18,3],[p(6,6),26,14,3],[p(2,6),24,10,0],['d0-2',20,10,0],
      ['d1-4',4,26,1],['d4-4',4,30,1],[p(4,6),4,34,1],
      ['d0-4',16,22,1],['d0-5',16,20,3],['d5-5',16,16,3],[p(2,5),14,12,0],[p(1,2),10,12,0]
    ]
  }
  function winHistory(count){return Array.from({length:count},(_,i)=>({round:i+1,target:0,output:0,turn:(i+1)*4,placements:4,reward:3,machineSize:Math.min(19,i+1)}))}
  function handIds(preset){
    return preset.endless?[`g3-d1-1`,`g3-d3-6`,`d0-3`,`g2-d1-5`,`d4-6`]:[`g2-d1-1`,`d3-6`,`d0-3`,`g2-d1-5`,`d4-6`]
  }
  function applyPreset(game,engine,presetId){
    const preset=PRESETS[presetId];if(!preset)throw new Error(`Unknown MONOID QA preset: ${presetId}`);
    if(!game?.exportState||!game?.restoreState)throw new Error('MONOID game state API required');
    const saved=game.exportState(),s=saved.state,set=makeSet(preset.generation),byId=new Map(set.map(tile=>[tile.id,tile]));
    if(presetId==='classic14'){
      for(const[id,,, ,upgrade]of REAL_CLASSIC14.pieces){const tile=byId.get(id);if(!tile)throw new Error(`Missing real QA tile ${id}`);tile.upgrade=upgrade||0}
      const placedIds=REAL_CLASSIC14.pieces.map(spec=>spec[0]),hands=REAL_CLASSIC14.hand.map(id=>byId.get(id));
      if(hands.some(tile=>!tile))throw new Error('Real Classic R14 QA fixture has an incomplete hand');
      const unavailable=new Set([...placedIds,...REAL_CLASSIC14.hand]);
      s.set=set;s.setGeneration=2;s.pieces=REAL_CLASSIC14.pieces.map(([id,x,y,rr],index)=>({id:index+1,tile:clone(byId.get(id)),x,y,rr}));
      s.placedTileIds=placedIds.slice();s.hand=hands.map(clone);s.reserve=set.filter(t=>!unavailable.has(t.id)).map(clone);
      s.round=13;s.roundTurn=0;s.turn=30;s.idc=30;s.rootRR=0;s.score=0;s.best=57863119300;s.coins=165;s.inflation=8;
      s.wins=clone(REAL_CLASSIC14.wins);s.events=[{type:'qa-preset',preset:preset.id,round:14,mode:'classic',sourceRunId:REAL_CLASSIC14.runId}];
      s.running=false;s.cleared=false;s.blocked=false;s.needsReroll=false;s.failureReason=null;s.extraPlacements=0;s.upgradeCoinsClaimed=[];s.roundUpgradeCoins=0;s.undoFrame=null;
      s.anchorId='g2-d3-5';s.freeReroll=1;s.consumables={move:0,reroll:0,undo:0};s.roundZero={drawn:2,placed:0,endHand:0};
      s.doubleDoubleTileId='d2-2';s.doubleEchoTileId='d4-4';s.zeroPortTileIds=[];s.parityExchangeTileId=null;s.cornerTileId=null;s.longLineTileId=null;s.overloadTileId=null;s.terminalTileId=null;s.pendingModPlacement=null;s.mods=['long-run'];
      s.circuitRanks=clone(REAL_CLASSIC14.circuitRanks);s.circuitSignatures=clone(REAL_CLASSIC14.circuitSignatures);s.pendingCircuit=null;
      s.nextShopType='none';s.intermissionResolved=true;s.shopOpen=false;s.shopType=null;s.shopOffers=[];s.marketBuys=[];
      s.standardComplete=false;s.endlessMode=false;s.endlessStartedRound=null;s.systemStrain=0;s.endlessLongRunActivations=0;s.boardStage=4;
      s.seed=REAL_CLASSIC14.seed;s.rngState=REAL_CLASSIC14.seed|0;s.runId=`qa-${REAL_CLASSIC14.runId}`;s.startedAt='2026-09-18T00:00:00.000Z';s.tileSerial=0;
      if(!game.restoreState(saved))throw new Error('Could not restore real Classic R14 QA fixture');
      return game
    }
    const specs=pieceSpecs(preset.powerGeneration),placedIds=specs.map(spec=>spec[0]);
    const upgrades=new Map([['d2-3',1],['d4-4',2],[`g${preset.powerGeneration}-d6-6`,3],[`g${preset.powerGeneration}-d2-5`,1]]);
    for(const[id,tier]of upgrades){const tile=byId.get(id);if(tile)tile.upgrade=tier}
    const hands=handIds(preset).map(id=>byId.get(id)).filter(Boolean);
    if(hands.length!==5)throw new Error(`QA preset ${presetId} has an incomplete hand`);
    const unavailable=new Set([...placedIds,...hands.map(t=>t.id)]);
    s.set=set;s.setGeneration=preset.generation;s.pieces=specs.map(([id,x,y,rr],index)=>({id:index+1,tile:clone(byId.get(id)),x,y,rr}));
    s.placedTileIds=placedIds.slice();s.hand=hands.map(clone);s.reserve=set.filter(t=>!unavailable.has(t.id)).map(clone);
    s.round=preset.round;s.roundTurn=4;s.turn=68;s.idc=specs.length;s.rootRR=0;s.score=preset.score;s.best=preset.best;s.coins=preset.coins;s.inflation=preset.inflation;
    s.wins=winHistory(preset.round);s.events=[{type:'qa-preset',preset:preset.id,round:preset.round+1,mode:preset.mode}];
    s.running=false;s.cleared=false;s.blocked=false;s.needsReroll=false;s.failureReason=null;s.extraPlacements=0;s.upgradeCoinsClaimed=[];s.roundUpgradeCoins=0;s.undoFrame=null;
    s.anchorId='d5-6';s.freeReroll=1;s.consumables={move:2,reroll:1,undo:1};s.roundZero={drawn:1,placed:1,endHand:0};
    s.doubleDoubleTileId='d4-4';s.doubleEchoTileId='d5-5';s.zeroPortTileIds=['d0-4','d0-5'];s.parityExchangeTileId=null;s.cornerTileId=null;s.longLineTileId=null;s.overloadTileId=null;s.terminalTileId=null;s.pendingModPlacement=null;s.mods=['long-run'];
    s.circuitRanks={'d4-4':2,'d5-5':3,[`g${preset.powerGeneration}-d6-6`]:5};s.circuitSignatures=['qa-loop-a','qa-loop-b'];s.pendingCircuit=null;
    s.nextShopType='none';s.intermissionResolved=true;s.shopOpen=false;s.shopType=null;s.shopOffers=[];s.marketBuys=[];
    s.standardComplete=true;s.endlessMode=true;s.endlessStartedRound=15;s.systemStrain=8;s.endlessLongRunActivations=3;
    s.runId=`qa-${preset.id}`;s.startedAt='2026-09-17T20:00:00.000Z';s.tileSerial=0;s.gameMode='infinite-endless';delete s.scoringModel;delete s.scoringFormula;
    if(!game.restoreState(saved))throw new Error(`Could not restore QA preset ${presetId}`);
    return game
  }
  function installStorageSandbox(root,mode){
    const storage=root.localStorage,proto=Object.getPrototypeOf(storage),raw={getItem:proto.getItem,setItem:proto.setItem,removeItem:proto.removeItem,clear:proto.clear};
    const original=new Map([...PROTECTED_KEYS].map(key=>[key,raw.getItem.call(storage,key)]));
    const shadow=new Map(original);shadow.set(ACTIVE_RUN_KEY,null);shadow.set(LATEST_RUN_KEY,null);shadow.set(ACTIVE_MODE_KEY,mode);shadow.set(TUTORIAL_KEY,'made');
    proto.getItem=function(key){key=String(key);if(this===storage&&PROTECTED_KEYS.has(key))return shadow.get(key)??null;return raw.getItem.call(this,key)};
    proto.setItem=function(key,value){key=String(key);if(this===storage&&PROTECTED_KEYS.has(key)){shadow.set(key,String(value));return}return raw.setItem.call(this,key,value)};
    proto.removeItem=function(key){key=String(key);if(this===storage&&PROTECTED_KEYS.has(key)){shadow.set(key,null);return}return raw.removeItem.call(this,key)};
    proto.clear=function(){if(this!==storage)return raw.clear.call(this);for(let i=this.length-1;i>=0;i--){const key=this.key(i);if(key&&!PROTECTED_KEYS.has(key))raw.removeItem.call(this,key)};for(const key of PROTECTED_KEYS)shadow.set(key,null)};
    return Object.freeze({original:Object.fromEntries(original),shadow,protectedKeys:[...PROTECTED_KEYS]})
  }
  function addQaStamp(root,preset){
    const menu=root.document.getElementById('gameMenu');if(!menu||menu.querySelector('.qaPresetStamp'))return;
    const p=root.document.createElement('p');p.className='qaPresetStamp';p.textContent=`QA PRESET · ${preset.mode.toUpperCase()} · R${preset.round+1} · SAVED RUN SAFE`;p.style.cssText='margin:8px 0 0;color:var(--muted);font:700 9px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.04em';menu.appendChild(p)
  }
  function persistCurrentRun(root){
    if(new URL(root.location.href).searchParams.has('qa'))return;
    const game=root.__monoidGame,flow=root.__monoidFlow;
    if(flow?.screen!=='game'||!game?.exportState)return;
    try{root.localStorage.setItem(ACTIVE_RUN_KEY,JSON.stringify(game.exportState()))}catch(_){ }
  }
  function qaUrl(root,id){
    const url=new URL(root.location.href);url.search='';url.searchParams.set('qa',id);url.searchParams.set('cb',BUILD_ID);return url.href
  }
  function normalUrl(root){
    const url=new URL(root.location.href);url.search='';url.searchParams.set('qaReturn','1');url.searchParams.set('cb',BUILD_ID);return url.href
  }
  function autoResumeReturn(root){
    const url=new URL(root.location.href);if(url.searchParams.get('qaReturn')!=='1'||url.searchParams.has('qa'))return false;
    let tries=0,entered=false;
    const resume=()=>{
      const title=root.document.getElementById('titleCard'),continueRun=root.document.getElementById('continueRun'),app=root.document.querySelector('.app');
      if(app&&!app.hidden){
        url.searchParams.delete('qaReturn');url.searchParams.delete('cb');root.history.replaceState(root.history.state,'',url.href);return
      }
      if(!entered&&title&&!title.hidden){entered=true;title.click();root.requestAnimationFrame(resume);return}
      if(continueRun&&!continueRun.hidden){continueRun.click();root.requestAnimationFrame(resume);return}
      if(tries++<360)root.requestAnimationFrame(resume)
    };
    root.requestAnimationFrame(resume);return true
  }
  function installMenuAccess(root){
    const doc=root.document,menu=doc?.getElementById('gameMenu'),anchor=doc?.querySelector('#gameMenu p');if(!doc||!menu||menu.querySelector('#qaTestRunsButton'))return false;
    const style=doc.createElement('style');style.id='monoid-qa-menu-style';style.textContent=`
      #qaTestRunsButton{margin-top:10px!important;border-top:1px solid var(--line)!important}
      #qaTestRunsDialog{width:min(420px,94vw);padding:18px}
      #qaTestRunsDialog .qaMenuIntro{margin:2px 0 12px;color:var(--muted);font-size:11px;line-height:1.4}
      #qaTestRunsDialog .qaPresetChoice{display:grid;width:100%;min-height:58px;padding:10px 12px;border:0;border-top:1px solid var(--line);background:transparent;color:var(--ink);text-align:left}
      #qaTestRunsDialog .qaPresetChoice strong{font-size:13px;letter-spacing:.04em}
      #qaTestRunsDialog .qaPresetChoice small{margin-top:4px;color:var(--muted);font-size:10px;line-height:1.3}
      #qaTestRunsDialog .qaReturn{display:block;margin-top:12px;padding:12px;text-align:center;text-decoration:none;background:#151515;color:#fff;border:1px solid #151515}
    `;doc.head.appendChild(style);
    const button=doc.createElement('button');button.id='qaTestRunsButton';button.className='menuAction';button.textContent='QA / TEST RUNS';menu.insertBefore(button,anchor||null);
    const dialog=doc.createElement('dialog');dialog.id='qaTestRunsDialog';dialog.className='gameMenu';
    const inQa=new URL(root.location.href).searchParams.has('qa');
    dialog.innerHTML=`<div class="menuHead"><h2>QA / Test runs</h2><button class="iconButton" aria-label="Close QA test runs">×</button></div>
      <p class="qaMenuIntro">Prepared late-game states. Your real saved run is protected.</p>
      <button class="qaPresetChoice" data-qa-preset="classic14"><strong>CLASSIC · ROUND 14</strong><small>Real R14 · 30 tiles · DD · DE · C5 · POWER ×2 · 2 clears from Endless</small></button>
      <button class="qaPresetChoice" data-qa-preset="infinite16"><strong>INFINITE ENDLESS · ROUND 16</strong><small>Classic scoring · 33 × 44 board · POWER ×3</small></button>
      ${inQa?`<a class="menuAction qaReturn" data-qa-return href="${normalUrl(root)}">RETURN TO SAVED RUN</a>`:''}`;
    doc.body.appendChild(dialog);
    const close=()=>dialog.close();dialog.querySelector('.iconButton').addEventListener('click',close);
    button.addEventListener('click',()=>{if(menu.open)menu.close();if(!dialog.open)dialog.showModal()});
    dialog.addEventListener('click',event=>{
      const choice=event.target.closest('[data-qa-preset]')?.dataset.qaPreset;
      if(choice&&PRESETS[choice]){persistCurrentRun(root);root.location.assign(qaUrl(root,choice));return}
    });
    return true
  }
  function autoStart(root){
    const id=new URL(root.location.href).searchParams.get('qa'),preset=PRESETS[id];if(!preset)return false;
    const sandbox=installStorageSandbox(root,preset.mode);root.__monoidActiveMode=preset.mode;
    root.document.body.dataset.qaPreset=id;
    root.__monoidQa={preset:id,mode:preset.mode,build:BUILD_ID,sourceRunId:preset.sourceRunId||null,savedRunProtected:true,originalStorage:sandbox.original};
    let tries=0;
    const start=()=>{
      const modes=root.__monoidModes,flow=root.__monoidFlow,ready=modes?.select&&root.IterionGame?.createGame&&flow;
      if(!ready){if(tries++<360)root.requestAnimationFrame(start);return}
      modes.select(preset.mode==='infinite-endless'?1:0);root.__monoidActiveMode=preset.mode;
      const baseCreate=root.IterionGame.createGame;let armed=true;
      root.IterionGame.createGame=function(engine,options){
        const game=baseCreate.call(this,engine,options);
        if(!armed)return game;armed=false;root.IterionGame.createGame=baseCreate;return applyPreset(game,engine,id)
      };
      const title=root.document.getElementById('titleCard'),startButton=root.document.getElementById('startRun');
      if(!title?.hidden)title.click();modes.select(preset.mode==='infinite-endless'?1:0);root.__monoidActiveMode=preset.mode;startButton?.click();
      const finish=()=>{const app=root.document.querySelector('.app');if(app&&!app.hidden){addQaStamp(root,preset);root.MonoidPhaseA?.sync?.();root.MonoidPhaseAMobileFix?.syncBuildStamp?.();return}root.requestAnimationFrame(finish)};finish()
    };
    root.requestAnimationFrame(start);return true
  }
  return{BUILD_ID,PRESETS,ACTIVE_RUN_KEY,ACTIVE_MODE_KEY,LATEST_RUN_KEY,TUTORIAL_KEY,makeSet,pieceSpecs,applyPreset,installStorageSandbox,persistCurrentRun,qaUrl,normalUrl,installMenuAccess,autoStart,autoResumeReturn};
});
