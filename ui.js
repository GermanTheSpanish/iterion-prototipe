(function(){
  const E=window.IterionEngine,D=window.IterionData,M=window.IterionMods,H=window.IterionHelp,GEST=window.IterionGesture,ARROW=E.ARROW;
  const PROFILE=window.MonoidProfile,scopeKey=key=>PROFILE?.storageKey?.(key)||key;
  const ACTIVE_MODE_KEY=scopeKey('iterion.activeRunMode.v1'),ACTIVE_RUN_KEY=scopeKey('iterion.activeRun.v1'),LEGACY_RUN_KEY=scopeKey('iterion.latestRun.v9'),TUTORIAL_KEY=scopeKey('iterion.tutorialChoice.v1');
  const ROUTE_PREVIEW_KEY='iterion.routePreview.v1',ROUTE_PREVIEW_MODES=new Set(['full','preview','off']);
  const normalizeMode=mode=>['eyes','frames','river','loom','peaks','islands'].includes(mode)?mode:'classic';
  const gameOptions=mode=>({GAME_MODE:normalizeMode(mode)});
  let GAME=window.IterionGame.createGame(E,gameOptions('classic'));
  const P={0:[],1:[[50,50]],2:[[28,28],[72,72]],3:[[28,28],[50,50],[72,72]],4:[[28,28],[72,28],[28,72],[72,72]],5:[[28,28],[72,28],[50,50],[28,72],[72,72]],6:[[28,23],[72,23],[28,50],[72,50],[28,77],[72,77]]};
  const $=id=>document.getElementById(id);
  const V=window.IterionPresentation,MG=window.MonoidModGuidance,BATCH_STORE=window.MonoidPlaytestBatchStore?.create(),PT=window.MonoidPlaytestTelemetry?.create({storage:localStorage,...(PROFILE?.telemetryOptions?.()||{})}),gameMenu=$('gameMenu'),menuButton=$('menuButton'),modeIndicatorEl=$('modeIndicator');
  const app=document.querySelector('.app'),entryFlow=$('entryFlow'),titleCard=$('titleCard'),gameSelection=$('gameSelection'),selectionTitle=$('selectionTitle'),firstRunChoice=$('firstRunChoice'),continueRun=$('continueRun'),tutorialPanel=$('tutorialPanel'),tutorialStep=$('tutorialStep'),tutorialInstruction=$('tutorialInstruction');
  let returnFocus=null;
  const circuitChoice=$('circuitChoice');
  const board=$('board'),signalHudEl=$('signalHud'),scoreEl=$('score'),targetEl=$('target'),stageEl=$('stagestat'),roundEl=$('roundstat'),movesEl=$('moves'),tilesEl=$('tilesleft'),stageRoundEl=$('stageRound'),boardSizeEl=$('boardsize'),handEl=$('hand'),hint=$('hint'),shopBtn=$('shopButton'),moveBtn=$('moveTool'),rerollBtn=$('reroll'),undoBtn=$('undoTool'),resetBtn=$('reset'),helpBtn=$('helpButton'),viewBtn=$('viewrun'),copyBtn=$('copyrun'),runlog=$('runlog'),toastEl=$('toast'),overlay=$('overlay'),modalEl=overlay.querySelector('.modal'),overlayTitle=$('overlayTitle'),overlayBody=$('overlayBody'),overlayPrimary=$('overlayPrimary'),overlaySecondary=$('overlaySecondary'),overlayTertiary=$('overlayTertiary'),coinEl=$('coins'),versionEl=$('version'),machineModStatusEl=$('machineModStatus'),routePreviewSetting=$('routePreviewSetting'),routePreviewHelp=$('routePreviewHelp');
  let viewRun=false,outcomeOverlayNotBefore=0,outcomeTimer=0,uiBusy=false,auxOverlay=null,shopRevealTile=null,persistenceFault=false,framesRevealRunId=null,framesRevealEventCursor=0,framesRevealFx=[];
  const inspectorHoldSuppressed=new WeakSet();
  const performanceSamples=[];
  let entryState='title',tutorial=null,activeRun=null;
  let handFx=Array(Math.max(D.HAND_SIZE,D.SHOP_HAND_MAX||D.HAND_SIZE)).fill('normal'),ouroborosSelection=null;
  const MOD_FACE_REVEAL_MS=3000,modFaceRevealUntil=new Map(),modFaceRevealTimers=new Map();
  const PLACEMENT_LOCK_MS=100,PLACEMENT_LOCK_TOLERANCE_PX=12;
  let drag={active:false,kind:null,index:-1,tileId:null,tile:null,candidates:[],candidate:null,candidateSince:null,candidatePointerX:null,candidatePointerY:null,candidateLocked:false,topologyBreaks:[],preview:null,float:null,grabOffsetX:0,grabOffsetY:0,lastX:0,lastSign:0,switches:0,shakeStarted:0,lastRotate:0};
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  function explicitRoutePreviewMode(){
    try{const value=localStorage.getItem(ROUTE_PREVIEW_KEY);return ROUTE_PREVIEW_MODES.has(value)?value:null}catch(_){return null}
  }
  function routePreviewMode(){
    if(tutorial)return'off';
    const explicit=explicitRoutePreviewMode();if(explicit)return explicit;
    const s=GAME.state(),earlyClassic=(s.gameMode||'classic')==='classic'&&!s.endlessMode&&(Number(s.round)||0)<3;
    return earlyClassic?'full':'preview'
  }
  function syncRoutePreviewSetting(){
    if(!routePreviewSetting)return;const explicit=explicitRoutePreviewMode(),mode=routePreviewMode();
    routePreviewSetting.querySelectorAll('[data-route-preview]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.routePreview===mode?'true':'false'));
    if(routePreviewHelp)routePreviewHelp.textContent=!explicit?'Automatic · Full for Classic Rounds 1–3, then Preview.':mode==='full'?'Shows route events and why a chosen exit wins.':mode==='preview'?'Shows the route and route events without choice coaching.':'No route assistance.'
  }
  function setRoutePreviewMode(mode){
    if(!ROUTE_PREVIEW_MODES.has(mode))return false;try{localStorage.setItem(ROUTE_PREVIEW_KEY,mode)}catch(_){}
    syncRoutePreviewSetting();toast(`ROUTE PREVIEW · ${mode.toUpperCase()}`);return true
  }
  const cascadeControl={active:false,phase:'idle',skipCascade:false,skipSummary:false,lastTap:0,waiters:new Set()};
  const signalHudState={active:false,lanes:new Map(),rechargeTimer:0};
  let cascadeSkipHintTimer=0;
  function clearCascadeSkipHint(){if(cascadeSkipHintTimer){clearTimeout(cascadeSkipHintTimer);cascadeSkipHintTimer=0}board.querySelector('.cascadeSkipHint')?.remove()}
  function armCascadeSkipHint(){
    clearCascadeSkipHint();if(tutorial)return;
    cascadeSkipHintTimer=setTimeout(()=>{cascadeSkipHintTimer=0;if(!cascadeControl.active||cascadeControl.phase==='final')return;const d=document.createElement('div');d.className='cascadeSkipHint';d.setAttribute('role','status');d.setAttribute('aria-live','polite');d.textContent='TAP SCREEN TO SKIP';board.appendChild(d)},V.CASCADE.skipHintAfterMs||6000)
  }
  function beginCascadeControl(){cascadeControl.active=true;cascadeControl.phase='cascade';cascadeControl.skipCascade=false;cascadeControl.skipSummary=false;cascadeControl.lastTap=0;cascadeControl.waiters.clear();board.dataset.cascadePhase='cascade';armCascadeSkipHint()}
  function endCascadeControl(){for(const waiter of [...cascadeControl.waiters])waiter.done();cascadeControl.waiters.clear();clearCascadeSkipHint();cascadeControl.active=false;cascadeControl.phase='idle';cascadeControl.lastTap=0;signalHudState.active=false;delete board.dataset.cascadePhase}
  function cascadePhaseSkipped(phase){return phase==='cascade'?cascadeControl.skipCascade:phase==='summary'?cascadeControl.skipSummary:false}
  function releaseCascadeWaiters(phase){for(const waiter of [...cascadeControl.waiters])if(waiter.phase===phase)waiter.done()}
  function cascadeWait(ms,phase=cascadeControl.phase){
    ms=Math.max(0,Number(ms)||0);if(!cascadeControl.active||!ms||cascadePhaseSkipped(phase))return Promise.resolve();
    return new Promise(resolve=>{const waiter={phase,timer:0,done:null};waiter.done=()=>{if(!cascadeControl.waiters.has(waiter))return;cascadeControl.waiters.delete(waiter);clearTimeout(waiter.timer);resolve()};waiter.timer=setTimeout(waiter.done,ms);cascadeControl.waiters.add(waiter)})
  }
  function handleCascadeSkip(e){
    if(!cascadeControl.active)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    const now=performance.now();if(now-cascadeControl.lastTap<(V.CASCADE.skipDebounceMs||120))return;
    cascadeControl.lastTap=now;
    if(cascadeControl.phase==='cascade'&&!cascadeControl.skipCascade){cascadeControl.skipCascade=true;releaseCascadeWaiters('cascade');return}
    if(cascadeControl.phase==='summary'&&!cascadeControl.skipSummary){cascadeControl.skipSummary=true;clearCascadeSkipHint();releaseCascadeWaiters('summary')}
  }
  window.addEventListener('pointerdown',handleCascadeSkip,{capture:true,passive:false});
  const px=n=>n/E.G*100+'%',py=n=>n/E.H*100+'%';
  const fmt=n=>Number.isFinite(Number(n))?Number(n).toLocaleString('en-US'):`${n}`;
  const compact=V.compact;
  document.title=`MONOID v${D.VERSION}`;versionEl.textContent=`v${D.VERSION} · Classic → Endless → Infinite → Ouroboros`;
  H.bindRun(GAME.state().runId);
  Object.defineProperty(window,'__monoidGame',{configurable:true,get:()=>GAME});
  Object.defineProperty(window,'__monoidFlow',{configurable:true,get:()=>({screen:entryState,tutorialStep:tutorial?.step??null})});
  Object.defineProperty(window,'__monoidPlaytestBatch',{configurable:true,get:()=>PT?.batchInfo?.()||null});
  Object.defineProperty(window,'__monoidPlaytestBatchStore',{configurable:true,get:()=>BATCH_STORE||null});
  Object.defineProperty(window,'__monoidPersistence',{configurable:true,get:()=>({ok:!persistenceFault,key:ACTIVE_RUN_KEY})});
  Object.defineProperty(window,'__monoidSharePlaytestBatch',{configurable:true,value:()=>sharePlaytestBatch()});
  Object.defineProperty(window,'__monoidInspectMode',{configurable:true,value:modeId=>openModeInspector(modeId)});

  function playtestContext(){const x=GAME.snapshot();return{runId:GAME.state().runId,round:GAME.state().round+1,stage:x.stage.index}}
  function bindPlaytestRun(){if(!PT||tutorial)return;PT.bindRun(playtestContext())}
  function syncPlaytestContext(){if(!PT||tutorial)return;const c=playtestContext();PT.setContext(c.round,c.stage)}
  function armDecisionTiming(){if(!PT||tutorial||entryState!=='game'||document.visibilityState==='hidden'||uiBusy)return;const s=GAME.state();if(!s.running&&!s.shopOpen&&!s.pendingCircuit&&!s.pendingModPlacement&&!s.cleared&&!s.blocked&&GAME.canInteract())PT.startDecision()}
  function resumePlaytest(){if(!PT||tutorial||entryState!=='game'||document.visibilityState==='hidden')return;syncPlaytestContext();PT.resume();armDecisionTiming()}
  function pausePlaytest(){PT?.pause()}
  function storedState(){try{return JSON.parse(localStorage.getItem(ACTIVE_RUN_KEY)||'null')}catch(_){return null}}
  function selectedMode(saved=null){return normalizeMode(saved?.state?.gameMode||window.__monoidSelectedMode||localStorage.getItem(ACTIVE_MODE_KEY)||'classic')}
  function queueProgressionReward(detail){
    if(!detail?.unlockedModes?.length&&!detail?.completedModes?.length)return;
    queueMicrotask(()=>{if(typeof window.MonoidLatePolish?.enqueueProgressionReward==='function')window.MonoidLatePolish.enqueueProgressionReward(detail);else(window.__monoidProgressionRewardQueue||(window.__monoidProgressionRewardQueue=[])).push(detail)})
  }
  function persistGame(options={}){
    if(tutorial)return GAME.snapshot();
    const snap=GAME.snapshot(),unlockResult=PROFILE?.evaluateRun?.(GAME.state(),snap),unlockedModes=unlockResult?.unlocked||[],completedModes=unlockResult?.completed||[],payload=JSON.stringify(GAME.exportState());
    if(!options.suppressProgressionReward&&(unlockedModes.length||completedModes.length))queueProgressionReward({unlockedModes:[...unlockedModes],completedModes:[...completedModes]});
    try{
      localStorage.removeItem(LEGACY_RUN_KEY);
      localStorage.setItem(ACTIVE_RUN_KEY,payload);
      persistenceFault=false
    }catch(error){
      if(!persistenceFault){
        persistenceFault=true;
        console.error('MONOID active run save failed',error);
        toast('SAVE FAILED · DOWNLOAD RUN DATA')
      }
    }
    return snap
  }
  function lifecycleStatus(game=GAME){
    const s=game.state(),recovery=game.recoveryOptions?.()||{};if(s.blocked&&!recovery.recoverable)return s.standardComplete?'completed':'failed';if(s.standardComplete&&!s.endlessMode&&s.cleared)return'completed';return'abandoned'
  }
  function exportStatus(game=GAME){
    const s=game.state(),recovery=game.recoveryOptions?.()||{};if(s.blocked&&!recovery.recoverable)return s.standardComplete?'completed':'failed';if(s.cleared&&s.standardComplete&&!s.endlessMode)return'completed';return'active'
  }
  function singleRunDebugText(game=GAME,includePerformance=game===GAME){
    H.bindRun(game.state().runId);return`${game.debugText()}\n\n${PT?.text()||'PLAYTEST TELEMETRY\nUnavailable'}\n\n${H.debugTelemetryText()}\n\n${includePerformance?performanceText():'PERFORMANCE TELEMETRY\nUnavailable after reload.'}`
  }
  async function archiveSavedRun(reason='new-run'){
    const saved=storedState();if(!saved?.state?.runId||!PT||!BATCH_STORE)return false;let game=GAME;
    if(game.state().runId!==saved.state.runId){game=window.IterionGame.createGame(E,gameOptions(selectedMode(saved)));if(!game.restoreState(saved))return false}
    const snap=game.snapshot(),current=PT.snapshot?.();if(current?.runId!==game.state().runId)PT.bindRun({runId:game.state().runId,round:game.state().round+1,stage:snap.stage.index});PT.setContext(game.state().round+1,snap.stage.index);
    const status=lifecycleStatus(game),statusReason=status==='failed'?(game.state().failureReason||reason):status==='completed'&&game.state().blocked?`endless-${game.state().failureReason||'ended'}`:reason;PT.finalizeCurrent(status,{reason:statusReason});
    const telemetry=PT.summary?.()||null,debugText=singleRunDebugText(game,game===GAME);await BATCH_STORE.archive({runId:game.state().runId,playerId:telemetry?.playerId||PT.identity?.().playerId,runSequence:telemetry?.runSequence||null,status,statusReason,gameVersion:D.VERSION,seed:game.state().seed,debugText,telemetry});return true
  }
  function currentRunRecord(){
    const telemetry=PT?.summary?.()||null,status=exportStatus(GAME);return{runId:GAME.state().runId,playerId:telemetry?.playerId||PT?.identity?.().playerId,runSequence:telemetry?.runSequence||null,status,statusReason:status==='failed'?(GAME.state().failureReason||null):null,gameVersion:D.VERSION,seed:GAME.state().seed,debugText:singleRunDebugText(GAME,true),telemetry}
  }
  async function buildPlaytestBatch(){
    const info=PT?.batchInfo?.(),current=currentRunRecord(),pending=BATCH_STORE&&info?await BATCH_STORE.pending(info.playerId):[],byId=new Map();for(const record of pending)byId.set(record.runId,record);byId.set(current.runId,current);const runs=[...byId.values()].sort((a,b)=>(a.runSequence||0)-(b.runSequence||0)),batchId=info?.batchId||`B-${Date.now().toString(36).toUpperCase()}`;
    const header=[`MONOID PLAYTEST BATCH v1`,`Version: ${D.VERSION}`,`Batch ID: ${batchId}`,`Player ID: ${info?.playerId||current.playerId||'-'}`,`Runs: ${runs.length}`,`Exported: ${new Date().toISOString()}`].join('\n');
    const sections=runs.map((record,index)=>`===== RUN ${index+1}/${runs.length} · ${String(record.status||'active').toUpperCase()} · Run #${record.runSequence??'?'} · ${record.runId} =====\n${record.debugText}`);return{text:[header,...sections].join('\n\n'),batchId,runIds:runs.map(r=>r.runId),currentRecord:current}
  }
  async function markBatchShared(batch){
    if(!batch||!PT)return;if(BATCH_STORE){await BATCH_STORE.archive(batch.currentRecord);await BATCH_STORE.markExported(batch.runIds,batch.batchId)}PT.markBatchExported?.({includedRunIds:batch.runIds})
  }
  async function sharePlaytestBatch(){
    persistGame();const batch=await buildPlaytestBatch(),share=window.NomonUiPolish?.shareDebug;if(typeof share!=='function')return false;const ok=await share(batch.text);if(ok)await markBatchShared(batch);return ok
  }
  function showGame(){entryFlow.hidden=true;titleCard.hidden=true;gameSelection.hidden=true;app.hidden=false;app.removeAttribute('aria-hidden');app.inert=false;entryState=tutorial?'tutorial':'game';render();if(!tutorial)resumePlaytest()}
  function showSelection(){
    pausePlaytest();press?.cancel?.();if(gameMenu.open)gameMenu.close();hideOverlay();app.hidden=true;entryState='selection';entryFlow.hidden=false;titleCard.hidden=true;gameSelection.hidden=false;app.setAttribute('aria-hidden','true');app.inert=true;
    const saved=storedState(),choiceMade=localStorage.getItem(TUTORIAL_KEY)==='made',mode=selectedMode(saved),modeIndex=window.__monoidModes?.modes?.findIndex(item=>item.id===mode)??-1;if(modeIndex>=0)window.__monoidModes.select(modeIndex);continueRun.hidden=!saved;firstRunChoice.hidden=choiceMade;$('replayTutorial').hidden=false;$('startRun').textContent=saved?'NEW RUN':choiceMade?'START RUN':'SKIP · START RUN'
  }
  async function startNormal(continueSaved=false){
    clearModFaceReveals();tutorial=null;tutorialPanel.hidden=true;if(!continueSaved)await archiveSavedRun('new-run');const saved=continueSaved?storedState():null,mode=selectedMode(saved),next=window.IterionGame.createGame(E,gameOptions(mode));if(continueSaved&&!next.restoreState(saved))return;
    localStorage.setItem(ACTIVE_MODE_KEY,mode);window.__monoidActiveMode=mode;window.__monoidSelectedMode=mode;
    if(continueSaved&&next.state().needsReroll)next.assessContinuation();
    GAME=next;activeRun=GAME;H.bindRun(GAME.state().runId);bindPlaytestRun();localStorage.setItem(TUTORIAL_KEY,'made');persistGame({suppressProgressionReward:true});handFx.fill('normal');showGame()
  }
  const tutorialCopy=[
    'Place the double. Every machine opens with one.',
    'Connect the 2 to a matching 2.',
    'Connect the 3. Even values add; the odd branch multiplies on the next signal.',
    'Connect the 4 side of the zero tile. It becomes a return point.',
    'Route back through zero: watch multiplication, rebound, then clear.',
    'Shop sells supplies during a round. Market offers lasting changes between stages.'
  ];
  function prepareTutorialHand(tileId){const s=GAME.state(),tile=s.set.find(t=>t.id===tileId);s.hand=Array(D.HAND_SIZE).fill(null);s.hand[0]=tile;s.reserve=s.reserve.filter(t=>t.id!==tileId);s.blocked=false;s.needsReroll=false;s.cleared=false;s.running=false}
  function placementCandidates(i){
    const candidates=GAME.candidatesForIndex(i);if(!tutorial||tutorial.step!==4)return candidates;
    const s=GAME.state(),tile=s.hand[i];return candidates.filter((c,n)=>{const p=E.pieceFrom(tile,c.x,c.y,0,c.rr,100000+n);p.tile={...tile};return E.bestSignal(p.id,[...s.pieces,p],{initialOutput:tile.a+tile.b,bifurcate:D.BIFURCATION_ENABLED}).rebounds>0})
  }
  function updateTutorial(){if(!tutorial)return;tutorialStep.textContent=`LEARN MONOID · ${tutorial.step+1}/6`;tutorialInstruction.textContent=tutorialCopy[tutorial.step];tutorialPanel.hidden=false;renderHand();renderBoard()}
  function startTutorial(){
    clearModFaceReveals();pausePlaytest();if(!tutorial)activeRun=GAME;tutorial={step:0,exitPending:false};GAME=window.IterionGame.createGame(E,{seed:3100,TARGETS:[1e9],STARTING_COINS:30});prepareTutorialHand('d2-2');H.bindRun(GAME.state().runId);localStorage.setItem(TUTORIAL_KEY,'made');handFx.fill('normal');showGame();updateTutorial()
  }
  function leaveTutorial(completed=false){
    clearModFaceReveals();tutorial=null;tutorialPanel.hidden=true;GAME=activeRun||window.IterionGame.createGame(E);activeRun=null;H.bindRun(GAME.state().runId);showSelection();if(completed)toast('Tutorial complete')
  }
  function advanceTutorial(result){
    if(!tutorial)return;const sequence=['d2-3','d3-4','d0-4','d0-0'];
    if(tutorial.step<4){tutorial.step++;if(tutorial.step===4)GAME.config.TARGETS[0]=0;prepareTutorialHand(tutorial.step===4?'d4-4':sequence[tutorial.step-1]);updateTutorial();return}
    if(tutorial.step===4&&result.cleared){tutorial.step=5;tutorialInstruction.textContent=tutorialCopy[5];tutorialStep.textContent='LEARN MONOID · 6/6';tutorialPanel.hidden=false;GAME.state().cleared=false;GAME.openShop()}
  }
  function cancelTutorialDrag(){if(!drag.active)return;press.cancel();drag.float?.remove();drag={active:false,kind:null,index:-1,tileId:null,tile:null,candidates:[],candidate:null,candidateSince:null,candidatePointerX:null,candidatePointerY:null,candidateLocked:false,topologyBreaks:[],preview:null,float:null};renderBoard();renderHand()}
  function requestTutorialExit(){if(!tutorial)return;if(drag.active)cancelTutorialDrag();if(uiBusy||GAME.state().running){tutorial.exitPending=true;$('leaveTutorial').disabled=true;return}leaveTutorial(false)}

  function dots(n,s=false){if(!Number.isInteger(n)||!P[n])return`<b class="${s?'swildPip':'wildPip'}" aria-hidden="true">•</b>`;return P[n].map(([x,y])=>`<i class="${s?'spip':'pip'}" style="left:${x}%;top:${y}%"></i>`).join('')}
  function tileView(t){return V.tileViewModel(t,GAME.state())}
  function clearModFaceReveals(){for(const timer of modFaceRevealTimers.values())clearTimeout(timer);modFaceRevealTimers.clear();modFaceRevealUntil.clear()}
  function modFaceRevealed(tileId){const until=modFaceRevealUntil.get(tileId)||0;if(until<=performance.now()){if(until)modFaceRevealUntil.delete(tileId);return false}return true}
  function revealModFace(tileId){const piece=GAME.state().pieces.find(p=>p.tile?.id===tileId);if(!piece||!tileView(piece.tile).modifiers.length)return false;const already=modFaceRevealed(tileId),previous=modFaceRevealTimers.get(tileId);if(previous)clearTimeout(previous);modFaceRevealUntil.set(tileId,performance.now()+MOD_FACE_REVEAL_MS);modFaceRevealTimers.set(tileId,setTimeout(()=>{modFaceRevealTimers.delete(tileId);modFaceRevealUntil.delete(tileId);renderBoard()},MOD_FACE_REVEAL_MS));if(!already)renderBoard();return true}
  function modClass(t){return tileView(t).modifiers.length?' modTile':''}
  function tierFor(t){return tileView(t).upgrade}
  function powerMultiplier(t){return tileView(t).powerMultiplier}
  function powerClass(t){const power=powerMultiplier(t);return power>1?` powerTile power${Math.min(4,power)}`:''}
  function powerMark(t){const power=powerMultiplier(t);return power>1?`<i class="powerMark" aria-hidden="true">×${power}</i>`:''}
  function circuitRank(t){return tileView(t).circuitRank}
  function circuitClass(t){const rank=circuitRank(t);return rank?` circuitTile circuitRank${rank}`:''}
  function circuitMark(t){const rank=circuitRank(t);return rank?`<i class="circuitRankMark">${D.CIRCUIT_RANKS[rank-1].roman}</i>`:''}
  function specialTileMark(t){return t?.special==='adapter'?'<i class="specialTileMark" aria-hidden="true">AD</i>':''}
  function circuitInspectorHtml(c){return c?`<section class="inspectSection"><div class="inspectLabel">Circuit</div><strong>RANK ${c.roman} · ${c.color.toUpperCase()}</strong><p>Resonance: +${c.bonus*100}%<br>Activates once per Move.</p></section>`:''}
  function powerInspectorHtml(power){return power?`<section class="inspectSection"><div class="inspectLabel">POWER SET</div><strong>SET ${power.generation} · ×${power.powerMultiplier}</strong><p>Printed values, matching and parity stay unchanged. Scoring operations use ×${power.powerMultiplier} magnitude.</p></section>`:''}
  function upgradeDot(t){const tier=tierFor(t);return tier?`<i class="upgradeDot u${tier}" aria-hidden="true"></i>`:''}
  function tileModMarks(t){const marks=tileView(t).modifiers;return marks.map((mark,i)=>`<i class="tileModMark ${mark.className}" style="--mod-offset:${i-(marks.length-1)/2};--mod-shift:${(i-(marks.length-1)/2)*5}px" aria-hidden="true"><span>${mark.label[0]}</span><span>${mark.label[1]}</span></i>`).join('')}
  function mini(t,fx='normal',compact=false){const cls=(fx==='back'?' back':fx==='reveal'?' reveal':'')+(compact?' compactPreview':''),mark=fx==='back'?'':upgradeDot(t)+tileModMarks(t)+circuitMark(t)+powerMark(t)+specialTileMark(t),wild=t?.special==='adapter'&&!t.adapterResolved,wildFace='<b class="swildPip adapterQuestion" aria-hidden="true">?</b>',a=wild?wildFace:dots(t?.a??0,true),b=wild?wildFace:dots(t?.b??0,true);return`<div class="domino${cls}${powerClass(t)}${circuitClass(t)}${modClass(t)}"><div class="half${t?.a===0?' zeroEndpoint':''}"><div class="spips">${a}</div></div><div class="half${t?.b===0?' zeroEndpoint':''}"><div class="spips">${b}</div></div>${mark}</div>`}
  function marketTileHtml(t,label=''){const name=t?.special==='adapter'&&!t.adapterResolved?'Adapter':`Domino ${t.a}|${t.b}`;return`<span class="marketTile" aria-label="${name}${label?` · ${label}`:''}">${mini(t,'normal',true)}${label?`<small>${escapeHtml(label)}</small>`:''}</span>`}
  function marketOfferMarkHtml(code,machine=false,extraClass=''){const text=String(code||'').trim().toUpperCase(),className=`marketOfferMark ${machine?'marketMachineModMark':'marketTileModMark'}${extraClass?` ${extraClass}`:''}`;if(machine)return`<span class="${className}">${escapeHtml(text)}</span>`;return`<span class="${className}" aria-hidden="true"><span>${escapeHtml(text[0]||'')}</span><span>${escapeHtml(text[1]||'')}</span></span>`}
  function renderMachineModStatus(model){machineModStatusEl.hidden=!model.visible;if(!model.visible){machineModStatusEl.innerHTML='';return}machineModStatusEl.innerHTML=`<span>LONG CHAIN</span><i><b style="width:${model.ratio*100}%"></b></i>`;machineModStatusEl.setAttribute('aria-label',model.ariaLabel)}
  const MODE_PIP_POSITIONS=Object.freeze({1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]});
  function renderModeIndicator(model){
    if(!modeIndicatorEl)return;
    const visible=!!model?.visible;modeIndicatorEl.hidden=!visible;
    if(!visible){modeIndicatorEl.innerHTML='';modeIndicatorEl.removeAttribute('aria-label');return}
    const halves=(model.pips||[]).map(value=>{const pips=(MODE_PIP_POSITIONS[value]||[]).map(position=>`<i class="modePip p${position}"></i>`).join('');return `<span class="modeIndicatorHalf" data-value="${value}">${pips}</span>`}),between=model.phasePosition==='between'&&halves.length===2,phase=model.phaseSymbol?`<span class="modeIndicatorPhase${between?' modeIndicatorInfinityBridge':''}" aria-hidden="true">${model.phaseSymbol}</span>`:'';
    const pipGroup=halves.length?`<span class="modeIndicatorPips" aria-hidden="true">${between?`${halves[0]}${phase}${halves[1]}`:halves.join('')}</span>`:'',trailingPhase=between?'':phase;
    modeIndicatorEl.classList.toggle('hasPips',halves.length>0);modeIndicatorEl.classList.toggle('hasInfinityBridge',between);modeIndicatorEl.innerHTML=pipGroup+trailingPhase;modeIndicatorEl.setAttribute('aria-label',model.ariaLabel||'Game mode')
  }
  function ordered(p){return[...p.cubes].sort((a,b)=>p.axis==='H'?a.x-b.x:a.y-b.y)}
  function pieceEl(p,cls='piece'){const d=document.createElement('div'),revealed=tileView(p.tile).modifiers.length>0&&modFaceRevealed(p.tile.id);d.className=cls+' '+(p.axis==='H'?'h':'v')+powerClass(p.tile)+circuitClass(p.tile)+(revealed?' modFaceRevealed':modClass(p.tile));d.dataset.tileId=p.tile.id;d.style.left=px(p.rect.minx);d.style.top=py(p.rect.miny);d.style.width=px(p.rect.maxx-p.rect.minx);d.style.height=py(p.rect.maxy-p.rect.miny);d.innerHTML=ordered(p).map(c=>`<div class="cube${c.v===0?' zeroEndpoint':''}" data-half="${c.half}"><div class="pips">${dots(c.v)}</div></div>`).join('')+upgradeDot(p.tile)+(revealed?'':tileModMarks(p.tile))+circuitMark(p.tile)+powerMark(p.tile)+specialTileMark(p.tile);return d}
  function toast(t){toastEl.textContent=t;toastEl.classList.add('show');setTimeout(()=>toastEl.classList.remove('show'),1300)}
  function boardMessage(text,ms=900){const d=document.createElement('div');d.className='boardMessage';d.textContent=text;board.appendChild(d);setTimeout(()=>d.remove(),ms)}
  function addBoardCenterTicks(){
    const specs=[
      {left:'50%',top:'0',width:'1px',height:'8px',transform:'translateX(-50%)'},
      {left:'50%',bottom:'0',width:'1px',height:'8px',transform:'translateX(-50%)'},
      {left:'0',top:'50%',width:'8px',height:'1px',transform:'translateY(-50%)'},
      {right:'0',top:'50%',width:'8px',height:'1px',transform:'translateY(-50%)'}
    ];
    for(const spec of specs){const tick=document.createElement('i');tick.className='boardCenterTick';tick.setAttribute('aria-hidden','true');Object.assign(tick.style,{position:'absolute',display:'block',background:'rgba(17,17,17,.34)',zIndex:'2',pointerEvents:'none',...spec});board.appendChild(tick)}
  }

  function modeGeometryVisible(item){const size=Math.max(1,Number(item?.size)||Number(E.S)||2);return!!item&&item.x>=0&&item.y>=0&&item.x+size<=E.G&&item.y+size<=E.H}
  function syncFramesRevealFx(s){
    if(s.gameMode!=='frames'){framesRevealRunId=null;framesRevealEventCursor=0;framesRevealFx=[];return}
    const events=s.events||[];
    if(framesRevealRunId!==s.runId){framesRevealRunId=s.runId;framesRevealEventCursor=events.length;framesRevealFx=[];return}
    for(const event of events.slice(framesRevealEventCursor))if(event?.type==='mode-geometry-reveal'&&event.mode==='frames')for(const half of new Set((event.items||[]).map(item=>item.half).filter(Boolean)))framesRevealFx.push({half,until:performance.now()+560});
    framesRevealEventCursor=events.length;framesRevealFx=framesRevealFx.filter(fx=>fx.until>performance.now())
  }
  function renderFramesTrace(s){
    if(s.gameMode!=='frames'||!framesRevealFx.length)return;
    const all=[...(s.cores||[]).map(item=>({...item,kind:'core'})),...(s.voids||[]).map(item=>({...item,kind:'void'}))].filter(modeGeometryVisible);
    for(const fx of framesRevealFx){
      const items=all.filter(item=>(item.half||item.slot)===fx.half);if(items.length<2)continue;
      const pad=Math.max(1,Number(E.S)||2),minX=Math.max(0,Math.min(...items.map(item=>item.x))-pad),minY=Math.max(0,Math.min(...items.map(item=>item.y))-pad),maxX=Math.min(E.G,Math.max(...items.map(item=>item.x+(item.size||E.S)))+pad),maxY=Math.min(E.H,Math.max(...items.map(item=>item.y+(item.size||E.S)))+pad),trace=document.createElement('i');
      trace.className='frameRevealTrace';trace.dataset.half=fx.half;trace.setAttribute('aria-hidden','true');Object.assign(trace.style,{left:px(minX),top:py(minY),width:px(maxX-minX),height:py(maxY-minY)});board.appendChild(trace)
    }
  }

  const ROUTE_SVG_NS='http://www.w3.org/2000/svg',ROUTE_RETURN_OFFSET=.18;
  const ROUTE_SIDE_ARROW={U:'↑',R:'→',D:'↓',L:'←'},ROUTE_REASON_LABEL={traversals:'MORE PASSES',output:'HIGHER OUTPUT',rebounds:'MORE REBOUNDS',path:'LONGER PATH',stable:'TIE · FIXED ROUTE'};
  function routePreviewPoint(piece,half){
    const cube=piece?.cubes?.find(item=>item.half===half);return cube?E.cubeCenter(cube):null
  }
  function routePreviewPieceCenter(piece){return piece?{x:(piece.rect.minx+piece.rect.maxx)/2,y:(piece.rect.miny+piece.rect.maxy)/2}:null}
  function routePreviewOffset(from,to,amount){
    const dx=to.x-from.x,dy=to.y-from.y,len=Math.hypot(dx,dy);if(!len||!amount)return{from,to};
    const ox=-dy/len*amount,oy=dx/len*amount;return{from:{...from,x:from.x+ox,y:from.y+oy},to:{...to,x:to.x+ox,y:to.y+oy}}
  }
  function appendRoutePreviewLine(svg,from,to,kind='physical'){
    if(!from||!to||![from.x,from.y,to.x,to.y].every(Number.isFinite))return;
    const shifted=kind==='retrace'?routePreviewOffset(from,to,ROUTE_RETURN_OFFSET):{from,to},attrs={x1:shifted.from.x,y1:shifted.from.y,x2:shifted.to.x,y2:shifted.to.y},halo=document.createElementNS(ROUTE_SVG_NS,'line'),line=document.createElementNS(ROUTE_SVG_NS,'line'),pulse=document.createElementNS(ROUTE_SVG_NS,'line');
    for(const [name,value] of Object.entries(attrs)){halo.setAttribute(name,value);line.setAttribute(name,value);pulse.setAttribute(name,value)}
    halo.setAttribute('class',`routePreviewHalo ${kind}`);line.setAttribute('class',`routePreviewLine ${kind}`);pulse.setAttribute('class',`routePreviewPulse ${kind}`);svg.append(halo,line,pulse)
  }
  function appendRoutePreviewMarker(point,label,className){
    if(!point)return null;const marker=document.createElement('i');marker.className=className;marker.textContent=label;marker.setAttribute('aria-hidden','true');marker.style.left=px(point.x);marker.style.top=py(point.y);board.appendChild(marker);return marker
  }
  function appendRouteEventMarker(point,label,className,seen){
    if(!point)return null;const key=`${label}:${point.x.toFixed(2)}:${point.y.toFixed(2)}`;if(seen.has(key))return null;seen.add(key);return appendRoutePreviewMarker(point,label,`routePreviewEvent ${className}`)
  }
  function routePreviewChoice(event,point){
    const reason=ROUTE_REASON_LABEL[event.choiceReason];if(!point||!reason)return;
    const side=point.x/E.G>.72?'Left':'Right',safeY=Math.max(1.5,Math.min(E.H-1.5,point.y)),rule=document.createElement('div'),arrow=ROUTE_SIDE_ARROW[event.choiceDirection||event.fromSide]||'';
    rule.className=`routePreviewRule routePreviewRule${side}`;rule.setAttribute('role','status');rule.style.left=px(point.x);rule.style.top=py(safeY);rule.textContent=`${arrow} ${reason}`.trim();board.appendChild(rule)
  }
  function renderRoutePreview(sourcePiece,previewOverride=null,source='placement'){
    const mode=routePreviewMode(),preview=previewOverride||drag.preview;if(mode==='off'||!preview?.ok||!sourcePiece||source==='placement'&&drag.kind!=='hand')return;
    const sim=preview.sim,segments=sim?.segments||[],events=sim?.events||[];if(!segments.length)return;
    const live=new Map([...GAME.state().pieces,sourcePiece].map(piece=>[piece.id,piece])),point=(pieceId,half)=>routePreviewPoint(live.get(pieceId),half);
    const svg=document.createElementNS(ROUTE_SVG_NS,'svg');svg.classList.add('routePreviewSvg');svg.dataset.previewMode=mode;svg.dataset.previewSource=source;svg.setAttribute('viewBox',`0 0 ${E.G} ${E.H}`);svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');
    for(const segment of segments)appendRoutePreviewLine(svg,segment.from,segment.to,segment.reverse?'retrace':'physical');
    for(const event of events){
      if(event.type==='hinge-move'&&event.to){const current=live.get(event.piece);if(current){const moved=E.pieceFrom(current.tile,event.to.x,event.to.y,event.to.z||0,event.to.rr,current.id);moved.tile={...current.tile};live.set(current.id,moved)}continue}
      if(event.type==='start'){appendRoutePreviewLine(svg,point(sourcePiece.id,event.fromHalf),point(event.toPieceId,event.toHalf),'connector');continue}
      if(event.type==='route'){appendRoutePreviewLine(svg,point(event.piece,event.exitHalf),point(event.toPieceId,event.toHalf),'connector');continue}
      if(event.type==='move'){appendRoutePreviewLine(svg,point(event.fromPiece,event.fromHalf),point(event.toPiece,event.toHalf),event.retrace?'retrace':'connector');continue}
      if(event.type==='core-relay'){appendRoutePreviewLine(svg,point(event.fromPieceId,event.fromHalf),point(event.toPieceId,event.toHalf),'relay');continue}
      if(event.type==='zero-port'){const destination=live.get(event.toPieceId),zero=destination?.cubes?.find(cube=>cube.v===0);appendRoutePreviewLine(svg,point(event.piece,event.fromHalf),zero?E.cubeCenter(zero):null,'teleport')}
    }
    if(!svg.querySelector('.routePreviewLine'))return;board.appendChild(svg);board.classList.add('routePreviewActive');
    const routeTileIds=new Set([String(sourcePiece.tile.id)]);
    for(const segment of segments){const piece=live.get(segment.piece);if(piece?.tile?.id!=null)routeTileIds.add(String(piece.tile.id))}
    board.querySelectorAll('.piece[data-tile-id]').forEach(el=>{const active=routeTileIds.has(String(el.dataset.tileId));el.classList.toggle('routePreviewActiveTile',active);el.classList.toggle('routePreviewDim',!active)});
    const activeCoreIds=new Set(events.filter(event=>event.type==='core-activate'&&event.coreId!=null).map(event=>String(event.coreId)));
    board.querySelectorAll('.coreNode[data-core-id]').forEach(el=>el.classList.toggle('routePreviewDim',!activeCoreIds.has(String(el.dataset.coreId))));

    const markerSeen=new Set(),lastOpByPiece=new Map(),coreById=new Map((GAME.state().cores||[]).map(core=>[String(core.id),core]));
    for(const event of events){
      if(event.type==='op'&&!event.tollRepeat){lastOpByPiece.set(event.piece,event);continue}
      if(event.type==='rebound'){const op=lastOpByPiece.get(event.piece);appendRouteEventMarker(op?point(event.piece,op.exitHalf):routePreviewPieceCenter(live.get(event.piece)),'REBOUND','routePreviewRebound',markerSeen);continue}
      if(event.type==='zero-port'){appendRouteEventMarker(point(event.piece,event.fromHalf),'TELEPORT','routePreviewTeleport',markerSeen);continue}
      if(event.type==='core-relay'){appendRouteEventMarker(point(event.fromPieceId,event.fromHalf),'RELAY','routePreviewRelay',markerSeen);continue}
      if(event.type==='core-activate'&&Number(event.afterSignal)>Number(event.beforeSignal)){const core=coreById.get(String(event.coreId)),center=core?{x:core.x+(core.size||E.S)/2,y:core.y+(core.size||E.S)/2}:routePreviewPieceCenter(live.get(event.piece)),label=`${event.peak?'PEAK':'CORE'} +${Math.max(0,Number(event.signalAdded)||Number(event.afterSignal)-Number(event.beforeSignal)||0)}`;appendRouteEventMarker(center,label,'routePreviewRecharge',markerSeen);continue}
      if(event.type==='peak-ridge'){const a=coreById.get(String(event.fromCoreId)),b=coreById.get(String(event.toCoreId)),center=a&&b?{x:(a.x+(a.size||E.S)/2+b.x+(b.size||E.S)/2)/2,y:(a.y+(a.size||E.S)/2+b.y+(b.size||E.S)/2)/2}:routePreviewPieceCenter(live.get(event.toPieceId));appendRouteEventMarker(center,`RIDGE ×${event.multiplier}`,'routePreviewRecharge',markerSeen);continue}
      if(event.type==='signal-depleted'){appendRouteEventMarker(routePreviewPieceCenter(live.get(event.piece)),'SIGNAL OUT','routePreviewDepleted',markerSeen)}
    }

    const choices=events.filter(event=>event.type==='route'&&event.choiceReason&&event.choiceCount>1);
    for(const choice of choices){const choicePoint=point(choice.piece,choice.exitHalf);if(!choicePoint)continue;const ring=document.createElementNS(ROUTE_SVG_NS,'circle');ring.setAttribute('cx',choicePoint.x);ring.setAttribute('cy',choicePoint.y);ring.setAttribute('r','.34');ring.setAttribute('class','routePreviewJunctionRing');svg.appendChild(ring);if(mode==='full')routePreviewChoice(choice,choicePoint)}
    if(mode!=='full')return;
    const sourceCenter=routePreviewPieceCenter(sourcePiece),startBelow=sourcePiece.rect.miny<1.5,startPoint=sourceCenter?{x:sourceCenter.x,y:startBelow?sourcePiece.rect.maxy:sourcePiece.rect.miny}:null;appendRoutePreviewMarker(startPoint,'START',`routePreviewEndpoint routePreviewStart${startBelow?' routePreviewStartBelow':''}`);
    const ends=[];let lastOpPoint=null;
    for(const event of events){if(event.type==='signal-start'){lastOpPoint=null;continue}if(event.type==='op'&&!event.tollRepeat){lastOpPoint=point(event.piece,event.exitHalf);continue}if(event.type==='signal-end'&&lastOpPoint){ends.push(lastOpPoint);lastOpPoint=null}}
    if(!ends.length&&lastOpPoint)ends.push(lastOpPoint);const endKeys=new Set();for(const end of ends){const key=`${end.x}:${end.y}`;if(endKeys.has(key))continue;endKeys.add(key);appendRoutePreviewMarker(end,'END','routePreviewEndpoint routePreviewEnd')}
  }

  function beginTilePress(e,meta){
    if(uiBusy||drag.active||GAME.state().pendingCircuit||GAME.state().pendingModPlacement||auxOverlay||e.button!=null&&e.button!==0)return;
    e.preventDefault();press.begin(e,meta)
  }
  function renderBoard(){
    const s=GAME.state();board.innerHTML='';board.classList.remove('routePreviewActive');board.style.setProperty('--cell-x',`${100/E.G}%`);board.style.setProperty('--cell-y',`${100/E.H}%`);board.style.backgroundImage='none';board.style.backgroundColor='';addBoardCenterTicks();syncFramesRevealFx(s);
    for(const voidItem of s.voids||[]){if(!modeGeometryVisible(voidItem))continue;const hole=document.createElement('div');hole.className='boardVoid inspectable';hole.dataset.voidId=voidItem.id;hole.dataset.half=voidItem.half||'';hole.setAttribute('role','button');hole.tabIndex=0;hole.setAttribute('aria-label','Void. Tap or hold to inspect.');Object.assign(hole.style,{left:px(voidItem.x),top:py(voidItem.y),width:px(voidItem.size||E.S),height:py(voidItem.size||E.S)});hole.onpointerdown=e=>{e.stopPropagation();beginTilePress(e,{kind:'void',voidId:voidItem.id,allowDrag:false})};hole.onkeydown=e=>{if(!auxOverlay&&!uiBusy&&!drag.active&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openVoidInspector(voidItem.id)}};board.appendChild(hole)}
    const coreTelemetry=GAME.coreShadowTelemetry?GAME.coreShadowTelemetry():null,coreTelemetryById=new Map((coreTelemetry?.cores||[]).map(core=>[core.id,core])),islandState=GAME.islandTelemetry?GAME.islandTelemetry():null,islandActivePieces=new Set(islandState?.activePieceIds||[]),islandDormantPieces=new Set(islandState?.dormantPieceIds||[]),islandCoreStates=new Map((islandState?.cores||[]).map(core=>[core.id,core.state])),lastCoreSignal=[...(s.events||[])].reverse().find(event=>event?.signal?.activations?.length)?.signal||null,lastCoreRoles=new Map((lastCoreSignal?.activations||[]).map(activation=>[activation.coreId,activation.role])),coreIntroduced=(s.events||[]).some(event=>(event?.coreActivations||event?.signal?.activations||[]).length);
    for(const core of s.cores||[]){
      if(!modeGeometryVisible(core))continue;
      const live=coreTelemetryById.get(core.id),role=lastCoreRoles.get(core.id)||null,el=document.createElement('div'),roman=['I','II','III','IV','V'][Math.max(0,Math.min(4,(Number(core.level)||1)-1))]||'I',connected=!!live?.connectedTileIds?.length,peak=!!core.peak||core.kind==='peak',islandCoreState=islandCoreStates.get(core.id)||null;el.className='coreNode corePhysical inspectable';if(peak)el.classList.add('corePeak');if(islandCoreState==='active')el.classList.add('islandActiveCore');if(islandCoreState==='dormant')el.classList.add('islandDormantCore');el.dataset.coreId=core.id;el.dataset.coreType=core.archetype||'';el.dataset.coreKind=peak?'peak':'core';if(islandCoreState)el.dataset.islandState=islandCoreState;if(role)el.dataset.lastRole=role;
      el.setAttribute('role','button');el.tabIndex=0;el.setAttribute('aria-label',`${peak?'Peak ':''}${String(core.archetype||'Core').toUpperCase()} Core ${roman}. ${connected?'Connected':'Disconnected'}. Tap or hold to inspect.`);
      el.classList.toggle('isConnected',connected);el.classList.toggle('isDisconnected',!connected);el.classList.toggle('coreNeedsConnection',!coreIntroduced);if(live?.overlapTileIds?.length)el.classList.add('isObstructed');if(role)el.classList.add(`lastRole${role[0].toUpperCase()+role.slice(1)}`);
      Object.assign(el.style,{left:px(core.x),top:py(core.y),width:px(core.size||2),height:py(core.size||2)});
      const connectedPorts=new Set(live?.connectedPorts||[]);
      for(const side of core.ports||[]){const port=document.createElement('i');port.className=`corePort corePort${side}`;if(connectedPorts.has(side))port.classList.add('isConnected');el.appendChild(port)}
      const level=document.createElement('b');level.textContent=roman;el.appendChild(level);
      el.onpointerdown=e=>{e.stopPropagation();beginTilePress(e,{kind:'core',coreId:core.id,allowDrag:false})};el.onkeydown=e=>{if(!auxOverlay&&!uiBusy&&!drag.active&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openCoreInspector(core.id)}};
      board.appendChild(el)
    }
    renderFramesTrace(s);
    const topologyBreakByTile=new Map((drag.topologyBreaks||[]).map(loss=>[loss.tileId,loss]));
    s.pieces.forEach(p=>{
      const el=pieceEl(p),circuitPending=s.pendingCircuit,modPending=s.pendingModPlacement,pending=circuitPending||modPending,eligible=!!pending?.eligibleTileIds?.includes(p.tile.id),power=powerMultiplier(p.tile),modded=tileView(p.tile).modifiers.length>0,topologyBreak=topologyBreakByTile.get(p.tile.id);
      el.classList.add('inspectable');if(islandDormantPieces.has(p.id))el.classList.add('islandDormant');else if(islandActivePieces.has(p.id))el.classList.add('islandActive');el.setAttribute('role','button');
      el.setAttribute('aria-label',pending?`Choose domino ${p.tile.a}|${p.tile.b}${power>1?` · POWER ×${power}`:''}${circuitRank(p.tile)?` · Circuit rank ${D.CIRCUIT_RANKS[circuitRank(p.tile)-1].roman}`:''}`:`Domino ${p.tile.a}|${p.tile.b}${power>1?` · POWER ×${power}`:''}${circuitRank(p.tile)?` · Circuit rank ${D.CIRCUIT_RANKS[circuitRank(p.tile)-1].roman}`:''}.${modded?' Tap to reveal values.':''} Hold to inspect.`);
      if(pending){
        const member=circuitPending?circuitPending.tileIds.includes(p.tile.id):eligible,directionChoice=!!modPending&&modPending.mod==='diode'&&modPending.stage==='direction'&&eligible;
        el.classList.toggle('circuitMember',!!member);el.classList.toggle('circuitEligible',eligible);el.classList.toggle('circuitDim',circuitPending?!member:!eligible);el.classList.toggle('diodeDirectionChoice',directionChoice);
        el.tabIndex=directionChoice?-1:eligible?0:-1;el.setAttribute('aria-disabled',eligible?'false':'true');
        if(directionChoice){
          el.querySelectorAll('.cube').forEach(cube=>{const half=Number(cube.dataset.half),value=p.cubes.find(c=>c.half===half)?.v;cube.tabIndex=0;cube.setAttribute('role','button');cube.setAttribute('aria-label',`Choose half ${half+1}, value ${value}, as DIODE IN`);cube.onpointerdown=e=>{if(auxOverlay||uiBusy||e.button!=null&&e.button!==0)return;e.stopPropagation();e.preventDefault();press.begin(e,{kind:'mod-half',tileId:p.tile.id,half,allowDrag:false})};cube.onkeydown=e=>{if(!auxOverlay&&!uiBusy&&(e.key==='Enter'||e.key===' ')){e.preventDefault();chooseMarketModHalf(p.tile.id,half)}}})
        }else{
          const kind=circuitPending?'circuit':'mod-target',choose=circuitPending?chooseCircuitTile:chooseMarketModTile;
          el.onpointerdown=e=>{if(!eligible||auxOverlay||uiBusy||e.button!=null&&e.button!==0)return;e.preventDefault();press.begin(e,{kind,tileId:p.tile.id,allowDrag:false})};
          el.onkeydown=e=>{if(eligible&&!auxOverlay&&!uiBusy&&(e.key==='Enter'||e.key===' ')){e.preventDefault();choose(p.tile.id)}}
        }
      }else{
        const ouroboros=!!s.ouroborosMode;el.classList.toggle('ouroborosSelected',ouroboros&&ouroborosSelection===p.tile.id);el.classList.toggle('ouroborosMoving',ouroboros&&drag.kind==='ouroboros'&&drag.tileId===p.tile.id);
        el.onpointerdown=e=>beginTilePress(e,{kind:ouroboros?'ouroboros-board':'board',tileId:p.tile.id,allowDrag:ouroboros})
      }
      if(topologyBreak){el.classList.add('topologyBreakWarning');el.setAttribute('aria-label',`${el.getAttribute('aria-label')} Placement will remove ${topologyBreak.label}.`);const warning=document.createElement('i');warning.className='topologyBreakMark';warning.textContent=`LOSE ${topologyBreak.label}`;warning.setAttribute('aria-hidden','true');el.appendChild(warning)}
      board.appendChild(el)
    });
    if(drag.active&&drag.candidate){const c=drag.candidate,previewTile=c.resolvedTile||drag.tile,p=E.pieceFrom(previewTile,c.x,c.y,0,c.rr,(s.idc||0)+1);p.tile={...previewTile};const candidate=pieceEl(p,'piece dragCandidate');if((drag.topologyBreaks||[]).length)candidate.classList.add('breaksTopology');board.appendChild(candidate);renderRoutePreview(p)}
    else if(s.ouroborosMode&&!uiBusy&&!auxOverlay){if(!ouroborosSelection){const selected=s.pieces.find(p=>p.tile.id===s.anchorId)||s.pieces.at(-1)||null;ouroborosSelection=selected?.tile.id||null}const preview=ouroborosSelection?GAME.previewOuroborosFire?.(ouroborosSelection):null;if(preview?.ok)renderRoutePreview(preview.p,preview,'ouroboros')}
    board.classList.toggle('dragging',drag.active)
  }
  function renderOuroborosHand(){
    const s=GAME.state();let piece=s.pieces.find(p=>p.tile.id===ouroborosSelection);
    if(!piece){piece=s.pieces.find(p=>p.tile.id===s.anchorId)||s.pieces.at(-1)||null;ouroborosSelection=piece?.tile.id||null}
    const preview=document.createElement('div');preview.className='handSlot ouroborosSelectionSlot';if(piece){const shell=document.createElement('div');shell.innerHTML=mini(piece.tile);preview.appendChild(shell.firstChild)}else preview.textContent='SELECT';handEl.appendChild(preview);
    const fire=document.createElement('button');fire.className='ouroborosAction ouroborosFire';fire.type='button';fire.textContent='FIRE';fire.disabled=!piece||uiBusy;fire.setAttribute('aria-label','Fire signal from selected Ouroboros tile');fire.onclick=()=>fireOuroborosSelection();handEl.appendChild(fire)
  }
  function renderHand(){
    const s=GAME.state();handEl.innerHTML='';if(s.ouroborosMode){handEl.classList.remove('handOverflow');delete handEl.dataset.handCount;renderOuroborosHand();return}
    const handCount=s.hand.filter(Boolean).length,normalSize=GAME.handSizeForRound();handEl.classList.toggle('handOverflow',handCount>normalSize);handEl.dataset.handCount=String(handCount);
    const canGrade=!s.pendingCircuit&&!s.pendingModPlacement&&!uiBusy&&!s.running&&!s.cleared&&!s.blocked&&!s.shopOpen&&!s.needsReroll;
    const mask=canGrade?GAME.legalHandMask():s.hand.map(Boolean);
    for(let i=0;i<s.hand.length;i++){
      const t=s.hand[i],slot=document.createElement('div');slot.className='handSlot';
      if(handFx[i]==='hidden'||(drag.active&&drag.index===i)){handEl.appendChild(slot);continue}
      if(handFx[i]==='back'){const shell=document.createElement('div');shell.innerHTML=mini(t||{a:0,b:0},'back');slot.appendChild(shell.firstChild);handEl.appendChild(slot);continue}
      if(t){const power=powerMultiplier(t),b=document.createElement('button'),startPress=e=>beginTilePress(e,{kind:'hand',index:i,tileId:t.id,allowDrag:true});b.className='tile'+(mask[i]?'':' unplayable');b.disabled=uiBusy||!!s.pendingCircuit||!!s.pendingModPlacement;b.setAttribute('aria-disabled',b.disabled?'true':'false');b.setAttribute('aria-label',`${t.special==='adapter'&&!t.adapterResolved?'Adapter. Adapts to two existing ends.':`Domino ${t.a}|${t.b}.`}${power>1?` POWER ×${power}.`:''}${mask[i]?'':' No legal placement.'} Hold to inspect.`);b.innerHTML=mini(t,handFx[i]);b.onpointerdown=e=>{e.stopPropagation();startPress(e)};slot.onpointerdown=e=>{if(b.disabled)return;startPress(e)};slot.dataset.handTouch='true';slot.appendChild(b)}
      handEl.appendChild(slot)
    }
  }

  function hideOverlay(){overlay.className='overlay';modalEl.classList.remove('auxModal','commerceModal','compactCommerceModal','outcomeModal','voidInspectorModal');overlay.onclick=null;overlayBody.onclick=null}
  function resetOverlay(){overlay.className='overlay show';delete overlay.dataset.action;modalEl.classList.remove('auxModal','commerceModal','compactCommerceModal','outcomeModal','voidInspectorModal');overlay.onclick=null;overlayBody.onclick=null;overlayPrimary.onclick=overlaySecondary.onclick=overlayTertiary.onclick=null;overlayPrimary.disabled=overlaySecondary.disabled=overlayTertiary.disabled=false;overlayPrimary.style.display='inline-block';overlaySecondary.style.display=overlayTertiary.style.display='none'}
  function clearOutcomeDelay(){outcomeOverlayNotBefore=0;if(outcomeTimer){clearTimeout(outcomeTimer);outcomeTimer=0}}
  function armOutcomeDelay(){clearOutcomeDelay();outcomeOverlayNotBefore=performance.now()+D.OUTCOME_SCREEN_DELAY_MS;outcomeTimer=setTimeout(()=>{outcomeTimer=0;render()},D.OUTCOME_SCREEN_DELAY_MS+25)}
  async function newRun(){pausePlaytest();await archiveSavedRun('new-run');clearOutcomeDelay();auxOverlay=null;shopRevealTile=null;press.cancel();clearModFaceReveals();GAME.fresh();H.bindRun(GAME.state().runId);bindPlaytestRun();persistGame({suppressProgressionReward:true});handFx.fill('normal');hideOverlay();render();resumePlaytest()}
  function setNewRunButton(b){b.style.display='inline-block';b.textContent='NEW RUN';b.onclick=()=>{if(confirm('Start a new run?'))newRun()}}
  function useUndo(){const r=GAME.useUndo();if(!r.ok){toast('Undo unavailable');return}clearOutcomeDelay();persistGame();handFx.fill('normal');hideOverlay();toast(r.preservedPurchases?`Last move undone · ${r.preservedPurchases} purchase${r.preservedPurchases===1?'':'s'} kept`:'Last move undone');render();armDecisionTiming()}
  function useMove(){const r=GAME.useMove();if(!r.ok){toast('Move unavailable');return}clearOutcomeDelay();persistGame();hideOverlay();toast(`+1 Move · ${r.maxPlacements} max`);render();armDecisionTiming()}
  function openPermanentShop(){shopRevealTile=null;if(!GAME.openShop()){const availability=GAME.shopPurchaseAvailability?.();toast(availability?.blockedByCoins?'TILE SHOP CLOSED · INSUFFICIENT COINS':'Tile Shop unavailable');persistGame();return}persistGame();render()}
  function openToolPurchase(id,options={}){
    if(!GAME.canBuyTool(id)){toast(`${M.get(id)?.name||'Tool'} purchase unavailable`);return}
    returnFocus=id==='move'?moveBtn:id==='reroll'?rerollBtn:undoBtn;press.cancel();auxOverlay={type:'tool-buy',id,quantity:1,preferUse:!!options.preferUse};renderAuxOverlay()
  }
  function activateMove(){if(GAME.canUseMove())useMove();else if(GAME.canBuyTool('move'))openToolPurchase('move');else toast('Move unavailable')}
  function activateUndo(){if(GAME.canUndo())useUndo();else if(GAME.canBuyTool('undo'))openToolPurchase('undo');else toast('Undo unavailable')}
  function activateReroll(){if(GAME.canUseReroll())doReroll();else if(GAME.canBuyTool('reroll'))openToolPurchase('reroll');else toast('Reroll unavailable')}

  function escapeHtml(value){return`${value}`.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
  function ruleVisual(section){return section.visual?`<div class="ruleVisual">${escapeHtml(section.visual)}</div>`:''}
  function closeAuxOverlay(){const closingEntryInspector=auxOverlay?.type==='monoid-inspector'||auxOverlay?.type==='mode-inspector';auxOverlay=null;if(closingEntryInspector){inspectorHoldSuppressed.delete(titleCard);inspectorHoldSuppressed.delete(selectionTitle);inspectorHoldSuppressed.delete(menuButton)}render();(returnFocus?.isConnected?returnFocus:helpBtn).focus();returnFocus=null}
  function openScoreDetails(kind){if(GAME.state().running||uiBusy||drag.active)return;returnFocus=document.activeElement;press.cancel();auxOverlay={type:'score',kind};renderAuxOverlay()}
  function renderScoreDetails(){const s=GAME.state(),isTarget=auxOverlay.kind==='target',target=GAME.target(),value=isTarget?target:s.score,display=V.scoreDisplay(s.score,target),multiplier=!isTarget&&s.score>=target?`<p class="scoreMultiplierDetail${display.overdrive?' overdrive':''}">TARGET ×${escapeHtml(display.multiplier)}</p>`:'';overlayTitle.textContent=isTarget?'TARGET':'SCORE';overlayBody.innerHTML=`<div class="scoreExact${!isTarget&&display.overdrive?' overdrive':''}">${escapeHtml(V.exact(value))}</div>${multiplier}<p>${isTarget?'Reach or exceed this value to clear the round.':'Result of the last Move, including Echo and Circuit Resonance. It is not a running total.'}</p><p>K = thousand · M = million<br>B = billion · T = trillion</p>`;overlayPrimary.textContent='CLOSE';overlayPrimary.onclick=closeAuxOverlay}
  function buyToolOnly(id,quantity=1){
    const m=M.get(id),r=GAME.buyTool(id,quantity,{intent:'store'});if(!r.ok){toast(r.reason==='coins'?'Not enough coins':'Purchase unavailable');renderAuxOverlay();return false}
    persistGame();auxOverlay=null;toast(`${m?.name||id} ×${r.quantity} stored · Inflation ${r.inflation}`);render();return true
  }
  async function buyToolAndUse(id){
    const m=M.get(id),r=GAME.buyTool(id,1,{intent:'buy-use'});if(!r.ok){toast(r.reason==='coins'?'Not enough coins':'Purchase unavailable');if(auxOverlay)renderAuxOverlay();return false}
    persistGame();auxOverlay=null;hideOverlay();
    if(id==='move'){useMove();return true}
    if(id==='reroll'){await doReroll();return true}
    if(id==='undo'){useUndo();return true}
    toast(`${m?.name||id} stored`);render();return true
  }
  function renderToolPurchase(){
    const id=auxOverlay.id,m=M.get(id),qty=Math.max(1,auxOverlay.quantity||1),quote=GAME.toolPurchaseQuote(id,qty),next=GAME.toolPurchaseQuote(id,qty+1),useQuote=GAME.toolPurchaseQuote(id,1),canUseNow=!!GAME.canUsePurchasedTool?.(id)&&!!useQuote.canAfford,name=(m?.displayName||m?.name||id).toUpperCase();
    overlayTitle.textContent=`BUY ${name}`;
    overlayBody.innerHTML=`<div class="toolPurchase"><p>${canUseNow?`Buy one and use it immediately, or store ${escapeHtml(m?.name||id)} for later.`:`Buy stored ${escapeHtml(m?.name||id)} directly from the gameplay controls.`}</p><div class="toolPurchaseRow"><div class="toolQuantityValue" aria-label="Quantity">${qty}</div><div class="toolQuantityArrows"><button type="button" data-tool-qty="up" aria-label="Increase quantity">↑</button><button type="button" data-tool-qty="down" aria-label="Decrease quantity" ${qty<=1?'disabled':''}>↓</button></div><div class="toolPurchaseTotal"><span>TOTAL</span><strong>${quote.total}c</strong><small>Inflation ${quote.inflationBefore} → ${quote.inflationAfter}${quote.systemStrain?` · Strain ${quote.systemStrain}`:''}</small></div></div>${canUseNow?'<div class="toolUseNote">BUY & USE always buys exactly one.</div>':''}</div>`;
    const up=overlayBody.querySelector('[data-tool-qty="up"]'),down=overlayBody.querySelector('[data-tool-qty="down"]');up.disabled=!next.canAfford;up.onclick=()=>{auxOverlay.quantity=qty+1;renderAuxOverlay()};down.onclick=()=>{auxOverlay.quantity=Math.max(1,qty-1);renderAuxOverlay()};
    if(canUseNow){
      overlayPrimary.textContent=`BUY & USE · ${useQuote.total}c`;overlayPrimary.disabled=false;overlayPrimary.onclick=()=>buyToolAndUse(id);
      overlaySecondary.style.display='inline-block';overlaySecondary.textContent=`BUY ${qty} · ${quote.total}c`;overlaySecondary.disabled=!quote.canAfford;overlaySecondary.onclick=()=>buyToolOnly(id,qty);
      overlayTertiary.style.display='inline-block';overlayTertiary.textContent='CANCEL';overlayTertiary.onclick=closeAuxOverlay
    }else{
      overlayPrimary.textContent=`BUY ${qty} · ${quote.total}c`;overlayPrimary.disabled=!quote.canAfford;overlayPrimary.onclick=()=>buyToolOnly(id,qty);
      overlaySecondary.style.display='inline-block';overlaySecondary.textContent='CANCEL';overlaySecondary.onclick=closeAuxOverlay
    }
  }
  function openRulebook(){H.bindRun(GAME.state().runId);H.recordRulebookOpen();auxOverlay={type:'rulebook',sectionId:null};renderAuxOverlay()}
  function openRulebookSection(id){H.recordSectionOpen(id);auxOverlay={type:'rulebook',sectionId:id};renderAuxOverlay()}
  function operationLabel(op){if(op.type==='add')return`+${op.add}`;if(op.type==='multiply')return`×${op.factor}`;if(op.type==='zero')return'0 · rebound';return'—'}
  function openTileInspector(tileId){if(drag.active||uiBusy)return;const model=H.inspectTile(GAME.state(),tileId);if(!model)return;auxOverlay={type:'inspector',tileId,model};renderAuxOverlay()}
  function openCoreInspector(coreId){if(drag.active||uiBusy)return;const model=H.inspectCore?.(GAME.state(),coreId,GAME.coreShadowTelemetry?.());if(!model)return;auxOverlay={type:'core-inspector',coreId,model};renderAuxOverlay()}
  function openVoidInspector(voidId){if(drag.active||uiBusy)return;const voidItem=(GAME.state().voids||[]).find(item=>item.id===voidId);if(!voidItem)return;auxOverlay={type:'void-inspector',voidId};renderAuxOverlay()}
  function openSignalInspector(){if(drag.active||uiBusy)return;const signal=GAME.snapshot().signal;if(!signal?.enabled)return;auxOverlay={type:'signal-inspector'};renderAuxOverlay()}
  function openModeInspector(modeId){
    const progress=PROFILE?.modeProgress?.(modeId);if(!progress?.requirement)return;
    returnFocus=document.activeElement;press.cancel();auxOverlay={type:'mode-inspector',modeId,progress};renderAuxOverlay()
  }
  function openMonoidInspector(){
    returnFocus=document.activeElement;press.cancel();auxOverlay={type:'monoid-inspector'};renderAuxOverlay()
  }
  function renderModeInspector(){
    const progress=PROFILE?.modeProgress?.(auxOverlay.modeId)||auxOverlay.progress;if(!progress?.requirement){closeAuxOverlay();return}
    auxOverlay.progress=progress;const descriptor=window.MonoidModeCarousel?.MODES?.find(item=>item.id===auxOverlay.modeId),status=progress.completed?'COMPLETE':progress.unlocked?'UNLOCKED':'LOCKED',unlockState=progress.unlocked?'MET':'PENDING',completeState=progress.completed?'COMPLETE':'INCOMPLETE';
    overlayTitle.textContent=progress.requirement.name;
    overlayBody.innerHTML=`<div class="inspector modeProgressInspector"><section class="inspectSection"><div class="inspectLabel">Status</div><div class="inspectHero"><strong>${escapeHtml(status)}</strong><span>${escapeHtml(descriptor?.description||'Game mode')}</span></div></section><section class="inspectSection"><div class="inspectLabel">Unlock · ${escapeHtml(unlockState)}</div><p>${escapeHtml(progress.requirement.unlock)}</p></section><section class="inspectSection"><div class="inspectLabel">Complete · ${escapeHtml(completeState)}</div><p>${escapeHtml(progress.requirement.complete)}</p></section></div>`;
    overlayPrimary.textContent='CLOSE';overlayPrimary.onclick=closeAuxOverlay
  }
  function renderMonoidInspector(){
    overlayTitle.textContent='MONOID';
    overlayBody.innerHTML=`<article class="dictionaryInspector"><header><strong>monoid</strong><span>/ˈmɒnɔɪd/ · noun</span></header><section><b>1. Mathematics.</b><p>An algebraic structure consisting of a set together with a binary operation that combines any two elements of the set to produce another element of the same set. The operation is associative, and the set contains an identity element that leaves every element unchanged when combined with it.</p><p class="dictionaryExample">Example: the integers under addition, with 0 as the identity.</p></section><section><b>2. Video games.</b><p>A videogame about dominoes, machines, and increasingly unreasonable numbers.</p></section><footer>See also: domino, signal, bad decisions.</footer></article>`;
    overlayPrimary.textContent='CLOSE';overlayPrimary.onclick=closeAuxOverlay
  }
  function bindInspectorHold(element,open){
    if(!element)return;let hold=null;
    const cancel=()=>{if(hold?.timer)clearTimeout(hold.timer);hold=null};
    element.addEventListener('pointerdown',event=>{if(event.button!=null&&event.button!==0)return;cancel();const state={id:event.pointerId,x:event.clientX,y:event.clientY,timer:0};state.timer=setTimeout(()=>{if(hold!==state)return;inspectorHoldSuppressed.add(element);setTimeout(()=>inspectorHoldSuppressed.delete(element),800);open()},Math.max(300,Number(D.LONG_PRESS_MS)||500));hold=state});
    element.addEventListener('pointermove',event=>{if(!hold||hold.id!==event.pointerId)return;if(Math.hypot(event.clientX-hold.x,event.clientY-hold.y)>Math.max(4,Number(D.LONG_PRESS_MOVE_TOLERANCE_PX)||10))cancel()});
    element.addEventListener('pointerup',cancel);element.addEventListener('pointercancel',cancel)
  }
  function consumeInspectorHoldClick(element,event){if(!inspectorHoldSuppressed.has(element))return false;inspectorHoldSuppressed.delete(element);event?.preventDefault?.();event?.stopPropagation?.();return true}
  function bindInspectorTap(element,open){if(!element)return;bindInspectorHold(element,open);element.onclick=event=>{if(consumeInspectorHoldClick(element,event))return;event.preventDefault();event.stopPropagation();open()}}
  function modifierGuideHtml(mod){
    const guide=mod.guidance||MG?.get(mod.id),status=mod.status||MG?.status(mod.id,GAME.state(),auxOverlay?.tileId);
    if(!guide)return`<div class="inspectModifier"><strong>${escapeHtml(mod.displayName)}</strong><span>${escapeHtml(mod.shortDescription)}</span><p>${escapeHtml(mod.rulesDescription)}</p></div>`;
    const diagram=MG?.diagramHtml?.(mod.id,false)||'',stateClass=escapeHtml(status?.state||'ready'),stateLabel=escapeHtml(status?.label||'INSTALLED'),stateDetail=status?.detail?`<p class="modGuideLive">${escapeHtml(status.detail)}</p>`:'';
    return`<article class="inspectModifier modGuideCard"><header><strong>${escapeHtml(mod.displayName)}</strong><span class="modGuideStatus ${stateClass}">${stateLabel}</span></header>${diagram}<div class="modGuideRules"><div><small>${escapeHtml(guide.verb||'BUILD')}</small><p>${escapeHtml(guide.build)}</p></div><div><small>REWARD</small><p><strong>${escapeHtml(guide.reward)}</strong></p></div></div>${stateDetail}<p class="modGuideNote">${escapeHtml(guide.note||'')}</p><details class="modExactRule"><summary>Exact rule</summary><p>${escapeHtml(mod.rulesDescription)}</p></details></article>`
  }
  function renderRulebook(){
    const sections=H.rulebookSections(),selected=sections.find(s=>s.id===auxOverlay.sectionId)||null;
    overlayTitle.textContent=selected?selected.displayName:'HOW TO PLAY';
    if(selected){
      overlayBody.innerHTML=`<div class="ruleDetail">${ruleVisual(selected)}<strong>${escapeHtml(selected.shortDescription)}</strong><p>${escapeHtml(selected.rulesDescription)}</p></div>`;
      overlayPrimary.textContent='BACK';overlayPrimary.onclick=()=>{auxOverlay={type:'rulebook',sectionId:null};renderAuxOverlay()};
      overlaySecondary.style.display='inline-block';overlaySecondary.textContent='CLOSE';overlaySecondary.onclick=closeAuxOverlay;return
    }
    overlayBody.innerHTML=`<div class="rulebookList">${sections.map(s=>`<button class="rulebookItem" data-rule="${s.id}"><strong>${escapeHtml(s.displayName)}</strong><span>${escapeHtml(s.shortDescription)}</span></button>`).join('')}</div><div class="rulebookFoot">Hold any domino for about ${Math.round((D.LONG_PRESS_MS||500)/100)/10}s to inspect that physical tile.</div>`;
    overlayBody.querySelectorAll('[data-rule]').forEach(b=>b.onclick=()=>openRulebookSection(b.dataset.rule));overlayPrimary.textContent='CLOSE';overlayPrimary.onclick=closeAuxOverlay
  }
  function mutationOptionLabel(option,state){
    if(option.kind==='recall')return'RETURN TO HAND';
    if(option.kind==='pivot')return`ANCHOR ${(option.anchorHalf||0)+1} · ${option.turn||'90°'}`;
    return String(option.kind||'MUTATE').toUpperCase()
  }
  function mutationWarning(option){
    const warnings=[];
    if(option.topologyLosses?.length)warnings.push(`LOSE ${option.topologyLosses.map(x=>x.label||String(x.mod||'').toUpperCase()).join(', ')}`);
    const c=option.consequences;
    if(c){
      if(c.upgrade)warnings.push(`DESTROY ★${c.upgrade}`);
      if(c.circuitRank)warnings.push(`DESTROY CIRCUIT ${D.CIRCUIT_RANKS?.[c.circuitRank-1]?.roman||c.circuitRank}`);
      if(c.mods?.length)warnings.push(`DESTROY MOD ${c.mods.map(id=>M.get(id)?.displayName||id.toUpperCase()).join(', ')}`)
    }
    return warnings
  }
  function applyInspectorMutation(optionKey){
    const tileId=auxOverlay?.tileId,info=tileId&&GAME.mutationOptions?.(tileId),option=info?.options?.find(x=>x.key===optionKey);if(!option){toast('Mutation unavailable');renderAuxOverlay();return}
    const warnings=mutationWarning(option);
    if(warnings.length&&!confirm(`${warnings.join(' · ')}. Continue?`))return;
    const r=GAME.applyMutation(tileId,optionKey);if(!r.ok){toast(r.reason==='used'?'Mutation already used':'Mutation unavailable');renderAuxOverlay();return}
    persistGame();closeAuxOverlay();render();
    const mod=M.get(r.mod),suffix=r.delivery?` · ${r.delivery.location.toUpperCase()}`:'';
    toast(`${mod?.displayName||String(r.mod).toUpperCase()}${suffix}${r.moveBonus?' · +1 MOVE':''}`)
  }
  function mutationInspectorHtml(tileId,state){
    const info=GAME.mutationOptions?.(tileId);if(!info?.mod)return'';
    const mod=M.get(info.mod),cadence=info.mod==='recall'?'STAGE':'ROUND';
    if(!info.available){
      const reason=info.reason==='used'?`USED THIS ${cadence}`:info.reason==='state'?'AVAILABLE BETWEEN MOVES':'NO LEGAL ACTION';
      return`<section class="inspectSection"><div class="inspectLabel">Mutation</div><p class="inspectEmpty">${escapeHtml(reason)}</p></section>`
    }
    return`<section class="inspectSection"><div class="inspectLabel">Mutation · ${escapeHtml(mod?.displayName||info.mod)}</div><div class="mutationActions">${info.options.map(option=>{const warnings=mutationWarning(option),warning=warnings.length?`<small>${escapeHtml(warnings.join(' · '))}</small>`:'';return`<button class="shopBuy mutationAction" data-mutation-action="${escapeHtml(option.key)}"><strong>${escapeHtml(mutationOptionLabel(option,state))}</strong>${warning}</button>`}).join('')}</div><p class="inspectEmpty">1 use per ${cadence.toLowerCase()}. Using a Mutation commits the machine and clears the current Undo frame.</p></section>`
  }
  function renderVoidInspector(){overlayTitle.textContent='';overlayBody.innerHTML='<div class="voidInspectorWord" tabindex="-1">VOID</div>';overlayPrimary.style.display=overlaySecondary.style.display=overlayTertiary.style.display='none';modalEl.classList.add('voidInspectorModal');overlayBody.onclick=closeAuxOverlay}
  function renderSignalInspector(){
    const signal=GAME.snapshot().signal;if(!signal?.enabled){closeAuxOverlay();return}
    const start=Math.max(0,Number(signal.base)||0),modeBase=Math.max(0,Number(signal.modeBase)||0),coreCharge=Math.max(0,Number(signal.coreCharge)||0),purchased=Math.max(0,Number(signal.purchasedSignal)||0),discovered=Math.max(0,Number(signal.discoveredCoreBonus)||0),islandLinks=Math.max(0,Number(signal.islandSignalBonus)||0),marketBonus=Math.max(0,Number(signal.marketBonus)||0),peakCharge=GAME.state().gameMode==='peaks'?coreCharge*Math.max(1,Number(D.CORE_PEAK_SIGNAL_MULTIPLIER)||2):0;
    overlayTitle.textContent='SIGNAL';
    overlayBody.innerHTML=`<div class="inspector signalInspector"><section class="inspectSection"><div class="inspectHero"><strong>${start}</strong><span>START THIS RUN</span></div><div class="stateRows"><span>MODE BASE · ${modeBase}</span><span>CORE I · +${coreCharge}</span>${peakCharge?`<span>PEAK CORE I · +${peakCharge}</span>`:''}${discovered?`<span>DISCOVERED CORES · +${discovered}</span>`:''}${islandLinks?`<span>ISLAND LINKS · +${islandLinks}</span>`:''}${purchased?`<span>BOUGHT · +${purchased}</span>`:''}${marketBonus?`<span>MARKET CORE · +${marketBonus}</span>`:''}</div></section><section class="inspectSection"><div class="inspectLabel">Route cost</div><div class="stateRows"><span>FIRST VISIT · −1</span><span>RETRACE · 0</span><span>REACH CORE · ADD ITS CHARGE</span></div></section></div>`;
    overlayPrimary.textContent='CLOSE';overlayPrimary.onclick=closeAuxOverlay
  }
  function renderCoreInspector(){
    const state=GAME.state(),model=H.inspectCore?.(state,auxOverlay.coreId,GAME.coreShadowTelemetry?.())||auxOverlay.model;if(!model){closeAuxOverlay();return}
    auxOverlay.model=model;overlayTitle.textContent=`${model.displayName.toUpperCase()} · ${model.roman}`;
    const status=model.ready?'READY':model.connected?'CONNECTED':'DISCONNECTED',ports=model.ports.join(' · ')||'—',connectedPorts=model.connectedPorts.join(' · ')||'—',role=model.lastRole?String(model.lastRole).toUpperCase():'NOT ACTIVATED',debugId=viewRun?`<div class="inspectDebug">ID ${escapeHtml(model.id)}</div>`:'';
    const configuredMarketStep=Number(D.CORE_SIGNAL_MARKET_STEP),marketStep=Math.max(0,Number.isFinite(configuredMarketStep)?configuredMarketStep:1),marketBonus=Math.max(0,Number(state.marketCount)||0)*marketStep,abilityRole=model.paired?'LEAD / LINK':'LEAD',peakNote=model.peak?` · PEAK ×${Math.max(1,Number(D.CORE_PEAK_SIGNAL_MULTIPLIER)||2)}`:'',recharge=model.archetype==='reservoir'?`Charge +${model.recharge}${peakNote} · ${abilityRole} +${model.leadRecharge} · Markets +${marketBonus}`:`Charge +${model.recharge}${peakNote} · Markets +${marketBonus}`,next=model.level<model.maxLevel?`Next level: +${D.CORE_SIGNAL_LEVEL_STEP||4} base Signal`:'MAX LEVEL',evolution=(()=>{if(state.gameMode==='islands')return`The run opens with 12 Cores and seeded Voids. Stages add 1 Core + ${D.CORE_DISCOVERY_VOID_COUNT_BY_MODE?.islands||5} Voids; Endless adds ${D.ISLANDS_ENDLESS_VOID_COUNT||11} Voids plus a Core or Void node, rising to ${D.ISLANDS_INFINITE_VOID_COUNT||22} Voids in Infinite. A free Core can found a dormant island; link it for +${D.ISLAND_LINK_SIGNAL_STEP||2} Signal.`;const voids=Math.max(0,Number(D.CORE_DISCOVERY_VOID_COUNT_BY_MODE?.[state.gameMode])||0),stages=(D.CORE_DISCOVERY_STAGES||[2,3,4,5]).join(', '),growth=voids?`Each discovery adds 1 Core + ${voids} Void${voids===1?'':'s'}.`:'Each discovery adds 1 Core and no Voids.',endless=state.gameMode==='peaks'?` Endless keeps growing: ${D.PEAKS_ENDLESS_VOID_COUNT||4} Voids plus a Core or Void node.`:'';return`Stages ${stages}: ${growth}${endless} From Stage ${D.CORE_UPGRADE_START_STAGE||10}, one Core levels every ${D.CORE_UPGRADE_STAGE_INTERVAL||3} Stages.`})();
    const relayNeed=model.archetype==='relay'&&model.connectedPorts.length<2?'Relay needs two connected ports to bridge.':null,lastSignal=model.lastAfterSignal==null?'No activation recorded last Move.':`Last Move: ${role} · Signal ${model.lastBeforeSignal} → ${model.lastAfterSignal}.`,activationStates=model.paired?'<span>LEAD · first Core reached; its ability applies.</span><span>LINK · second distinct Core; its own ability also applies.</span><span>FOLLOW · later Core; adds Signal only.</span><span>LAST · final Core reached; may also be LINK.</span>':'<span>LEAD · first Core reached; its ability controls the Move.</span><span>FOLLOW · later Core; adds Signal only.</span><span>LAST · final Core reached; adds Signal only.</span>';
    overlayBody.innerHTML=`<div class="inspector coreInspector"><section class="inspectSection"><div class="inspectLabel">${model.peak?'Peak Core':'Core'}</div><div class="inspectHero"><strong>${escapeHtml(model.displayName)} ${model.roman}</strong><span>${escapeHtml(status)} · ${escapeHtml(recharge)}</span></div>${debugId}<div class="stateRows"><span>Ports: ${escapeHtml(ports)}</span><span>Connected: ${escapeHtml(connectedPorts)}</span><span>${escapeHtml(next)}</span></div></section><section class="inspectSection"><div class="inspectLabel">${escapeHtml(abilityRole)} Ability</div><strong>${escapeHtml(model.ability.short)}</strong><p>${escapeHtml(model.ability.rule)}</p>${relayNeed?`<p class="inspectEmpty">${escapeHtml(relayNeed)}</p>`:''}</section><section class="inspectSection"><div class="inspectLabel">Last Move</div><div class="stateRows"><span>${escapeHtml(lastSignal)}</span></div></section><section class="inspectSection"><div class="inspectLabel">Activation States</div><div class="stateRows">${activationStates}</div></section><section class="inspectSection"><div class="inspectLabel">Evolution</div><p>${escapeHtml(evolution)}</p></section></div>`;
    overlayPrimary.textContent='CLOSE';overlayPrimary.onclick=closeAuxOverlay
  }

  function renderInspector(){
    const state=GAME.state(),model=H.inspectTile(state,auxOverlay.tileId)||auxOverlay.model,b=model.baseTile,m=model.currentMachineState,adapter=b.special==='adapter';
    auxOverlay.model=model;overlayTitle.textContent=adapter&&!b.adapterResolved?'ADAPTER':`[${b.a}|${b.b}]`;
    const properties=[adapter?'Adapter':b.isDouble?'Double':'Standard domino',b.containsZero?'Contains zero':null,model.power?`POWER ×${model.power.powerMultiplier}`:null].filter(Boolean).join(' · ');
    const debugId=viewRun?`<div class="inspectDebug">ID ${escapeHtml(b.id)}</div>`:'';
    const modifierHtml=model.modifiers.length?model.modifiers.map(mod=>modifierGuideHtml(mod)).join(''):'<p class="inspectEmpty">No modifier is attached to this physical tile.</p>';
    const starLabel=m.upgradeTier?`★${m.upgradeTier} · can pay +${m.starCoins}c when activated`:'No stars · +0c';
    const bestLabel=`Best Score with this tile: ${m.bestOutput==null?'—':fmt(m.bestOutput)}`,longRun=model.machineModifiers.find(mod=>mod.id==='long-run');
    const longRunState=state.endlessMode?`LONG CHAIN · ${Math.max(0,(D.ENDLESS_LONG_RUN_ACTIVATIONS||7)-(state.endlessLongRunActivations||0))}/${D.ENDLESS_LONG_RUN_ACTIVATIONS||7} Endless activations remaining.`:'LONG CHAIN · at 10+ unique routed tiles, every activated star pays once.';
    const foundationState=m.foundationAge==null?null:`FOUNDATION · survived ${m.foundationAge} Market${m.foundationAge===1?'':'s'} · tier +${m.foundationTier||1}c`,mintState=m.mintAvailable==null?null:`MINT · ${m.mintAvailable?'ready this Round':'already paid this Round'}`,bankState=m.bankMultiplier==null?null:`BANK · current wallet ×${m.bankMultiplier}`,brokerState=m.brokerDiscountStored==null?null:`BROKER · ${m.brokerPrepared?'primed · skip next Mod purchase':m.brokerDiscountStored?'stored −'+m.brokerDiscountStored+'c':'activate before Market'}`;
    const stateRows=[starLabel,bestLabel,`Recorded Move activations: ${m.activations||0}`,bankState,brokerState,foundationState,mintState,longRun?longRunState:m.upgradeTier?'Normal star rule · only the highest activated tier pays.':'Round-clearing overkill can add stars to this physical tile.'].filter(Boolean);
    const mutationHtml=mutationInspectorHtml(auxOverlay.tileId,state);
    const baseHero=adapter&&!b.adapterResolved?'<strong>[?|?]</strong><span>ADAPTER · UNRESOLVED</span>':`<strong>[${b.a}|${b.b}]</strong><span>${escapeHtml(properties)}</span>`,opPair=adapter&&!b.adapterResolved?'<div class="opPair"><span>? copies one touched value</span><span>? copies the other</span></div>':`<div class="opPair"><span>${b.a}: ${operationLabel(b.operations[0])}</span><span>${b.b}: ${operationLabel(b.operations[1])}</span></div>`,adapterHtml=adapter?`<section class="inspectSection"><div class="inspectLabel">Adapter</div><strong>${b.adapterResolved?'LOCKED':'READY'}</strong><p>${b.adapterResolved?'This physical Adapter has permanently become ['+b.a+'|'+b.b+']. Matching and scoring now use those values normally.':'Place it only where both halves touch existing physical ends. Each half copies the value it touches, then the values lock permanently.'}</p><div class="stateRows"><span>PHASE · ${escapeHtml(String(b.adapterPhase||'').toUpperCase())}</span><span>LIMIT · 1 PURCHASE PER PHASE</span></div></section>`:'';
    overlayBody.innerHTML=`<div class="inspector"><section class="inspectSection"><div class="inspectLabel">Base Tile</div><div class="inspectHero">${baseHero}</div>${debugId}${opPair}</section>${adapterHtml}${powerInspectorHtml(model.power)}${circuitInspectorHtml(model.circuit)}<section class="inspectSection"><div class="inspectLabel">Modifiers</div>${modifierHtml}</section>${mutationHtml}<section class="inspectSection"><div class="inspectLabel">Current Machine State</div><div class="stateRows">${stateRows.map(row=>`<span>${escapeHtml(row)}</span>`).join('')}</div></section></div>`;
    overlayBody.querySelectorAll('[data-mutation-action]').forEach(button=>button.onclick=()=>applyInspectorMutation(button.dataset.mutationAction));
    overlayPrimary.textContent='CLOSE';overlayPrimary.onclick=closeAuxOverlay;
  }
  function openShopOfferInspector(kind,tile=null){
    returnFocus=document.activeElement;press.cancel();auxOverlay={type:'shop-offer-inspector',kind,tile:tile?{...tile}:null};renderAuxOverlay()
  }
  function renderShopOfferInspector(){
    const x=GAME.snapshot(),kind=auxOverlay.kind,tile=auxOverlay.tile,phase=(x.shop?.adapter?.phase||'landing').toUpperCase();
    if(kind==='adapter'){
      const info=x.shop?.adapter;overlayTitle.textContent='ADAPTER';
      overlayBody.innerHTML=`<div class="inspector commerceInspector"><section class="inspectSection"><div class="inspectHero"><strong>[?|?]</strong><span>SPECIAL PHYSICAL TILE</span></div><div class="stateRows"><span>${escapeHtml(phase)} · ${info?.purchased?'USED':'AVAILABLE'}</span><span>PRICE · ${info?.price??GAME.shopAdapterPrice?.()}c</span><span>PURCHASE → HAND</span></div></section><section class="inspectSection"><div class="inspectLabel">Rule</div><p>Place it only between two existing physical ends. Each half copies the value it touches, then those values become permanent.</p></section><section class="inspectSection"><div class="inspectLabel">Limit</div><p>One Adapter can be purchased in Landing, one in Endless and one in Infinite. Unused allowance does not carry forward.</p></section></div>`
    }else if(kind==='random'){
      overlayTitle.textContent='RANDOM DOMINO';const generation=x.shop?.tileOfferGeneration||2,power=x.shop?.tileOffers?.[0]?.tile?.powerMultiplier||1;
      overlayBody.innerHTML=`<div class="inspector commerceInspector"><section class="inspectSection"><div class="inspectHero"><strong>?</strong><span>SET ${generation} · POWER ×${power}</span></div><div class="stateRows"><span>PRICE · ${x.shop?.randomTilePrice}c</span><span>PURCHASE → HAND</span></div></section><section class="inspectSection"><div class="inspectLabel">Rule</div><p>Draws one unclaimed physical domino from the next POWER set. Visible Shop offers remain reserved and cannot be drawn by Random.</p></section></div>`
    }else{
      if(!tile){closeAuxOverlay();return}overlayTitle.textContent=`[${tile.a}|${tile.b}]`;const power=powerMultiplier(tile),ops=[H.operationFor(tile.a,false,tile.a===tile.b,power),H.operationFor(tile.b,false,tile.a===tile.b,power)];
      overlayBody.innerHTML=`<div class="inspector commerceInspector"><section class="inspectSection"><div class="inspectHero"><strong>[${tile.a}|${tile.b}]</strong><span>${power>1?`POWER ×${power}`:'STANDARD'} · PHYSICAL TILE</span></div><div class="opPair"><span>${tile.a}: ${operationLabel(ops[0])}</span><span>${tile.b}: ${operationLabel(ops[1])}</span></div><div class="stateRows"><span>PRICE · ${GAME.shopTileOfferPrice()}c</span><span>PURCHASE → HAND</span></div></section><section class="inspectSection"><div class="inspectLabel">Supply</div><p>Buying this exact tile removes its physical ID from the future POWER set so it cannot appear twice.</p></section></div>`
    }
    overlayPrimary.textContent='BACK';overlayPrimary.onclick=closeAuxOverlay
  }
  function openMarketOfferInspector(id){
    returnFocus=document.activeElement;press.cancel();auxOverlay={type:'market-offer-inspector',id};renderAuxOverlay()
  }
  function renderMarketOfferInspector(){
    const id=auxOverlay.id;
    if(id==='signal'){
      const info=GAME.marketSignalUpgradeInfo?.();overlayTitle.textContent='SIGNAL +1';
      overlayBody.innerHTML=`<div class="inspector commerceInspector marketInspector"><section class="inspectSection"><div class="inspectHero marketInspectorHero"><span class="marketInspectorSignalMark" aria-hidden="true"><i class="marketSignalBolt"></i></span><span>PERMANENT THIS RUN · ${info?.price??'—'}c</span></div></section><section class="inspectSection marketInspectorDemoSection"><div class="inspectLabel">Example</div><div class="marketInspectorDemo marketInspectorSignalDemo" role="img" aria-label="Starting Signal increases by one"><b>${info?.current??0}</b><i>→</i><b>${info?.next??0}</b></div></section><section class="inspectSection"><div class="inspectLabel">Rule</div><p>Raises starting Signal by 1 for the rest of this run. Core charge is unchanged by this purchase.</p><div class="stateRows"><span>START ${info?.current??0} → ${info?.next??0}</span><span>CORE +${info?.coreCharge??0}</span></div></section></div>`
    }else{
      const info=GAME.marketOfferInfo(id),mod=info?.mod,guide=mod&&(mod.guidance||MG?.get?.(id));if(!mod){closeAuxOverlay();return}
      overlayTitle.textContent=(mod.displayName||mod.name||id).toUpperCase();
      const code=mod.collectionCode||info.id.slice(0,2).toUpperCase(),machine=mod.target==='machine',target=machine?'MACHINE':`COMPATIBLE · ${info.targetCount}`,build=guide?.build||mod.shortDescription||mod.description||'',reward=guide?.reward||mod.shortDescription||'',note=guide?.note||'',demo=MG?.demoHtml?.(id),diagram=demo||MG?.diagramHtml?.(id,false)||`<div class="modDiagram modDiagramLine"><b>${escapeHtml(code)}</b></div>`,identity=marketOfferMarkHtml(code,machine,'marketInspectorCode');
      overlayBody.innerHTML=`<div class="inspector commerceInspector marketInspector"><section class="inspectSection"><div class="inspectHero marketInspectorHero">${identity}<span>${escapeHtml(target)} · ${info.price}c</span></div></section><section class="inspectSection marketInspectorDemoSection"><div class="inspectLabel">Example</div><div class="marketInspectorDemo ${demo?'hasScene':''}" data-market-demo="${escapeHtml(id)}">${diagram}</div></section><section class="inspectSection"><div class="inspectLabel">Build</div><p>${escapeHtml(build)}</p></section><section class="inspectSection"><div class="inspectLabel">Reward</div><p><strong>${escapeHtml(reward)}</strong></p>${note?`<p class="inspectEmpty">${escapeHtml(note)}</p>`:''}</section><section class="inspectSection"><details class="modExactRule"><summary>Exact rule</summary><p>${escapeHtml(mod.rulesDescription||mod.description||'')}</p></details></section></div>`
    }
    overlayPrimary.textContent='BACK';overlayPrimary.onclick=closeAuxOverlay
  }
  function renderAuxOverlay(){
    if(!auxOverlay)return;resetOverlay();overlay.classList.add('aux');if(auxOverlay.type==='mode-inspector'||auxOverlay.type==='monoid-inspector')overlay.classList.add('entryInspectorOverlay');modalEl.classList.add('auxModal');overlay.onclick=e=>{if(e.target===overlay)closeAuxOverlay()};
    if(auxOverlay.type==='rulebook')renderRulebook();else if(auxOverlay.type==='score')renderScoreDetails();else if(auxOverlay.type==='tool-buy')renderToolPurchase();else if(auxOverlay.type==='core-inspector')renderCoreInspector();else if(auxOverlay.type==='void-inspector')renderVoidInspector();else if(auxOverlay.type==='signal-inspector')renderSignalInspector();else if(auxOverlay.type==='mode-inspector')renderModeInspector();else if(auxOverlay.type==='monoid-inspector')renderMonoidInspector();else if(auxOverlay.type==='shop-offer-inspector')renderShopOfferInspector();else if(auxOverlay.type==='market-offer-inspector')renderMarketOfferInspector();else renderInspector();
    if(!overlay.contains(document.activeElement)){if(!returnFocus)returnFocus=document.activeElement;const focusTarget=auxOverlay.type==='void-inspector'?overlayBody.querySelector('.voidInspectorWord'):overlayPrimary;focusTarget?.focus()}
  }

  function runSummary(){
    const state=GAME.state(),x=GAME.snapshot(),turns=x.turns.filter(e=>Number.isInteger(e.turn)),mvp=turns.reduce((b,e)=>!b||e.output>b.output?e:b,null);let addOps=0,multOps=0,rebounds=0;
    for(const e of turns){addOps+=(e.ops.match(/:\+/g)||[]).length;multOps+=(e.ops.match(/:×/g)||[]).length;rebounds+=e.rebounds||0}
    return{roundsCleared:x.round.clears.length,totalRounds:x.round.total,tilesPlayed:x.turnCount,bestOutput:x.score.best,mvpTile:mvp?{a:mvp.tile.a,b:mvp.tile.b,output:mvp.output,round:mvp.round,placement:mvp.roundTurn}:null,addOps,multOps,rebounds,rerolls:x.turns.filter(e=>e.type==='reroll').length,purchases:x.turns.filter(e=>e.type==='shop-buy'||e.type==='tile-buy'||e.type==='double-double'||e.type==='market-mod-buy').length,coins:x.coins,inflation:x.inflation,systemStrain:state.systemStrain||0,longRunActivations:state.endlessLongRunActivations||0,consumables:x.consumables,setSize:x.setSize,setGeneration:x.powerSets?.generation||1,machine:x.board.length,endless:x.endless}
  }
  function summaryHtml(){const r=runSummary(),m=r.mvpTile;return`<div class="summary"><div class="sumCard wide"><div class="sumLabel">MVP TILE</div><div class="sumValue">${m?`[${m.a}|${m.b}] → ${fmt(m.output)}`:'—'}</div><div class="sumSmall">${m?`Best activation · Round ${m.round}, move ${m.placement}`:'No placement yet'}</div></div><div class="sumCard"><div class="sumLabel">PROGRESS</div><div class="sumValue">${r.endless?.active?`${D.TOTAL_ROUNDS}/${D.TOTAL_ROUNDS} + ${r.endless.roundsCleared}`:`${r.roundsCleared}/${r.totalRounds}`}</div><div class="sumSmall">${r.endless?.active?'Base complete · Endless clears':'Rounds cleared'}</div></div><div class="sumCard"><div class="sumLabel">MACHINE</div><div class="sumValue">${r.machine}</div><div class="sumSmall">${r.setSize} tiles · Set ${r.setGeneration}</div></div><div class="sumCard wide"><div class="sumLabel">SCORE SOURCES</div><div class="sumValue">${r.multOps} multipliers · ${r.addOps} additions</div><div class="sumSmall">${r.rebounds} rebounds · Best ${fmt(r.bestOutput)}</div></div><div class="sumCard wide"><div class="sumLabel">ECONOMY</div><div class="sumValue">${r.coins} coins · Inflation ${r.inflation}${r.endless?.active?` · Strain ${r.systemStrain}`:''}</div><div class="sumSmall">Move ${r.consumables.move} · Reroll ${r.consumables.reroll} · Undo ${r.consumables.undo} · ${r.purchases} purchases${r.endless?.active?` · Long Chain ${r.longRunActivations}/${D.ENDLESS_LONG_RUN_ACTIVATIONS||7}`:''}</div></div></div>`}

  function announceCoreProgress(events=[]){
    const coreEvent=[...(events||[])].reverse().find(event=>event.type==='peaks-endless-growth'||event.type==='islands-endless-growth'||event.type==='core-discover'||event.type==='core-upgrade');if(!coreEvent)return null;
    if(coreEvent.type==='peaks-endless-growth'||coreEvent.type==='islands-endless-growth'){const label=coreEvent.nodeKind==='core'?`NEW CORE · +${coreEvent.voidCount} VOIDS`:`EROSION · +${coreEvent.voidCount} VOIDS`;boardMessage(label,1800);toast(label)}
    else if(coreEvent.type==='core-discover'){const archetype=String(coreEvent.core?.archetype||'CORE').toUpperCase(),node=board.querySelector(`.coreNode[data-core-id="${CSS.escape(coreEvent.core?.id||'')}"]`);node?.classList.add('coreDiscovered');if(node)setTimeout(()=>node.isConnected&&node.classList.remove('coreDiscovered'),1800);boardMessage(`NEW CORE · ${archetype} I`,1800);toast(`CORE DISCOVERED · ${archetype} I`)}
    else toast(`CORE ${String(coreEvent.archetype||'CORE').toUpperCase()} · ${['I','II','III','IV','V'][Math.max(0,(coreEvent.after||1)-1)]}`);
    return coreEvent
  }
  function advanceRound(){
    const beforeSnapshot=GAME.snapshot(),before=beforeSnapshot.stage.index,beforeInfinite=!!beforeSnapshot.endless?.infinitePhase,eventCursor=GAME.state().events.length;clearOutcomeDelay();const ok=GAME.advance();if(!ok){toast('Resolve Market first');return}
    syncPlaytestContext();persistGame();hideOverlay();handFx.fill('normal');render();armDecisionTiming();const afterSnapshot=GAME.snapshot(),after=afterSnapshot.stage.index,newEvents=GAME.state().events.slice(eventCursor),coreEvent=announceCoreProgress(newEvents);
    if(!coreEvent)toast(!beforeInfinite&&afterSnapshot.endless?.infinitePhase?`INFINITE · 3 TILE HAND · BOARD ${E.G}×${E.H}`:after>before?`STAGE ${after} · FREE REROLL · BOARD ${E.G}×${E.H}`:`ROUND ${GAME.state().round+1} · FREE REROLL`)
  }
  function startEndless(){clearOutcomeDelay();const eventCursor=GAME.state().events.length;if(!GAME.startEndless()){toast('Endless unavailable');return}const state=GAME.state(),marketClosed=state.events.slice(eventCursor).some(e=>e.type==='shop-close'&&e.shop==='market'&&e.reason==='insufficient-coins');syncPlaytestContext();if(state.shopOpen&&state.shopType==='market')PT?.openMarket({offers:[...state.shopOffers]});persistGame();hideOverlay();handFx.fill('normal');render();armDecisionTiming();toast(marketClosed?`MARKET CLOSED · INSUFFICIENT COINS · ENDLESS ROUND ${state.round+1}`:state.shopOpen?'ENDLESS · STAGE MARKET':`ENDLESS · ROUND ${state.round+1}`)}
  function showClear(){
    resetOverlay();const s=GAME.state(),x=GAME.snapshot(),complete=x.status==='COMPLETE',endless=!!x.endless?.active,last=s.wins[s.wins.length-1],target=GAME.target(),display=V.scoreDisplay(s.score,target),scoreHero=`<div class="roundClearScore${display.overdrive?' overdrive':''}"><small>SCORE</small><strong>${escapeHtml(fmt(s.score))}</strong><span>TARGET ×${escapeHtml(display.multiplier)}</span></div>`;
    overlayTitle.textContent=complete?'CLASSIC COMPLETE':endless?'ENDLESS ROUND CLEAR':'ROUND CLEAR';
    overlayBody.innerHTML=complete?`${scoreHero}<p>Classic complete · Target ${fmt(target)}</p>${summaryHtml()}<p class="shopFoot">Enter Endless with the same persistent machine. Targets continue scaling ×${D.ENDLESS_TARGET_MULTIPLIER||5} every round.</p>`:`${scoreHero}<p>Target ${fmt(target)}<br>Clear +${last?.reward||0}c${last?.upgradeCoins?` · ★ activations +${last.upgradeCoins}c`:''}</p>`;
    if(complete){overlay.dataset.action='enter-endless';overlayPrimary.textContent='ENTER ENDLESS';overlayPrimary.onclick=startEndless;overlaySecondary.style.display='inline-block';overlaySecondary.textContent='COPY RUN DATA';overlaySecondary.onclick=copyRun;setNewRunButton(overlayTertiary);return}
    const next=s.nextShopType;overlayPrimary.textContent=next==='market'?'MARKET':endless?'NEXT ENDLESS ROUND':'NEXT ROUND';overlayPrimary.onclick=()=>{if(next==='none'){advanceRound();return}const beforeRound=GAME.state().round,eventCursor=GAME.state().events.length;if(GAME.openIntermission()){const state=GAME.state(),marketClosed=state.events.slice(eventCursor).some(e=>e.type==='shop-close'&&e.shop==='market'&&e.reason==='insufficient-coins');if(marketClosed&&!state.shopOpen&&state.round>beforeRound){syncPlaytestContext();persistGame();hideOverlay();handFx.fill('normal');render();armDecisionTiming();toast(`MARKET CLOSED · INSUFFICIENT COINS · ROUND ${state.round+1}`);announceCoreProgress(state.events.slice(eventCursor));return}PT?.openMarket({offers:[...state.shopOffers]});persistGame();render()}else toast('Unavailable')};
    if(GAME.canUndo()){overlaySecondary.style.display='inline-block';overlaySecondary.textContent=`UNDO · ${s.consumables.undo}`;overlaySecondary.onclick=useUndo}
  }
  function showShop(){
    resetOverlay();const s=GAME.state(),x=GAME.snapshot(),availability=GAME.shopPurchaseAvailability(),randomCost=GAME.shopRandomPrice(),tileOffers=x.shop?.tileOffers||[],adapter=x.shop?.adapter||GAME.adapterShopInfo?.(),offerGeneration=x.shop?.tileOfferGeneration||Math.max(2,(s.setGeneration||1)+1),strain=s.systemStrain||0,handSpace=!!x.shop?.handSpace,handCount=x.shop?.handCount??s.hand.filter(Boolean).length,handLimit=x.shop?.handLimit??D.SHOP_HAND_MAX??8;overlayTitle.textContent='TILE SHOP';modalEl.classList.add('commerceModal','compactCommerceModal');
    const randomPreview=shopRevealTile?mini(shopRevealTile,'reveal',true):mini({a:0,b:0},'back',true),handState=handSpace?`PURCHASE → HAND · ${handCount}/${handLimit}`:`HAND FULL · ${handCount}/${handLimit}`;
    const tileOfferHtml=tileOffers.length?tileOffers.map(info=>{const t=info.tile,disabled=!handSpace||s.coins<info.price;return `<div class="shopTileOffer shopCompactOffer exactShopOffer"><button type="button" class="shopOfferInspect" data-shop-inspect="tile" data-shop-tile-id="${t.id}" aria-label="Domino ${t.a}|${t.b}. Tap to inspect.">${marketTileHtml(t)}</button><button class="shopBuy" data-shop-tile-offer="${t.id}" ${disabled?'disabled':''}>${!handSpace?'HAND FULL':`BUY · ${info.price}c`}</button></div>`}).join(''):'<p class="inspectEmpty">No next-set tiles remain.</p>';
    const adapterDisabled=!adapter?.available||!handSpace||s.coins<(adapter?.price??Infinity),adapterState=adapter?.purchased?'USED THIS PHASE':!handSpace?'HAND FULL':adapter?.available?`BUY · ${adapter.price}c`:'UNAVAILABLE';
    const adapterHtml=`<div class="shopTileOffer shopCompactOffer adapterShopOffer ${adapter?.purchased?'isUsed':''}"><button type="button" class="shopOfferInspect" data-shop-inspect="adapter" aria-label="Tap to inspect Adapter">${mini({id:'adapter-preview',a:null,b:null,source:'special',special:'adapter'},'normal',true)}</button><strong>ADAPTER</strong><button id="shopAdapterBuy" class="shopBuy" ${adapterDisabled?'disabled':''}>${adapterState}</button><small>${String(adapter?.phase||'landing').toUpperCase()} · 1/PHASE</small></div>`;
    overlayBody.innerHTML=`<div class="bigShop compactShop"><div class="shopHero"><div><div class="label">${handState}</div><strong>${s.coins}c</strong><div class="shopInflation">INFLATION ${s.inflation}${x.endless?.active?` · STRAIN ${strain}`:''}</div></div><div class="label">SUPPLY<br>${x.availableTileCount}</div></div><div class="shopOfferGrid"><div class="shopTileOffer shopCompactOffer randomCompactOffer"><button type="button" class="shopOfferInspect randomTilePreview" data-shop-inspect="random" aria-label="Tap to inspect Random Domino">${randomPreview}</button><strong>RANDOM</strong><button id="shopRandomBuy" class="shopBuy" ${!availability.randomAvailable||!handSpace||s.coins<randomCost?'disabled':''}>${!handSpace?'HAND FULL':availability.randomAvailable?`BUY · ${randomCost}c`:'SOLD OUT'}</button><small>SET ${offerGeneration}</small></div>${adapterHtml}</div><div class="marketChoiceTitle">NEXT SET</div><div class="shopTileOfferGrid">${tileOfferHtml}</div><div class="shopFoot">TAP AN OFFER TO INSPECT · PURCHASE → HAND · INFLATION +1</div></div>`;
    const random=$('shopRandomBuy');if(random)random.onclick=()=>{const r=GAME.buyShopRandomTile();if(!r.ok){toast(r.reason==='hand-full'?'HAND FULL':r.reason==='no-tiles'?'No random next-set tiles remain':'Not enough coins');return}shopRevealTile=r.tile;persistGame();toast(`[${r.tile.a}|${r.tile.b}] → HAND · Inflation ${r.inflation}`);render()};
    overlayBody.querySelectorAll('[data-shop-tile-offer]').forEach(b=>{b.onclick=()=>{const r=GAME.buyShopTileOffer(b.dataset.shopTileOffer);if(!r.ok){toast(r.reason==='hand-full'?'HAND FULL':r.reason==='coins'?'Not enough coins':'Tile unavailable');return}persistGame();toast(`[${r.tile.a}|${r.tile.b}] → HAND · Inflation ${r.inflation}`);render()}});
    const adapterBuy=$('shopAdapterBuy');if(adapterBuy)adapterBuy.onclick=()=>{const r=GAME.buyShopAdapter();if(!r.ok){toast(r.reason==='hand-full'?'HAND FULL':r.reason==='phase-limit'?'ADAPTER USED THIS PHASE':r.reason==='coins'?'Not enough coins':'Adapter unavailable');return}persistGame();toast(`ADAPTER → HAND · ${String(r.phase).toUpperCase()} · Inflation ${r.inflation}`);render()};
    overlayBody.querySelectorAll('[data-shop-inspect]').forEach(el=>{const kind=el.dataset.shopInspect,tileId=el.dataset.shopTileId,tile=tileId?tileOffers.find(info=>info.tile.id===tileId)?.tile:null;bindInspectorTap(el,()=>openShopOfferInspector(kind,tile));el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openShopOfferInspector(kind,tile)}}});
    if(tutorial?.step===5){const intro=document.createElement('p');intro.className='marketIntro';intro.innerHTML='<strong>This is the real Tile Shop.</strong> Buy physical pieces here; tap an offer for details.';overlayBody.prepend(intro);overlayPrimary.textContent='FINISH';overlayPrimary.onclick=()=>{GAME.closeShop();hideOverlay();leaveTutorial(true)};overlaySecondary.style.display='inline-block';overlaySecondary.textContent='TRY AGAIN';overlaySecondary.onclick=()=>{GAME.closeShop();hideOverlay();startTutorial()};return}
    overlayPrimary.textContent='CLOSE';overlayPrimary.onclick=()=>{shopRevealTile=null;GAME.closeShop();persistGame();render()}
  }
  function showMarket(){
    resetOverlay();const s=GAME.state(),x=GAME.snapshot(),nextStage=x.stage.index+1,nextSize=GAME.boardSizeForStage(nextStage-1),strain=s.systemStrain||0;overlayTitle.textContent='MARKET';modalEl.classList.add('commerceModal','compactCommerceModal');
    const signalOffer=x.shop?.marketSignal,offers=s.shopOffers.map(id=>GAME.marketOfferInfo(id));
    const signalOfferHtml=signalOffer?.available?`<section class="marketOffer marketCompactOffer" data-market-offer="signal" data-market-kind="signal"><button type="button" class="marketOfferIdentity marketInspectTarget" data-market-inspect="signal" aria-label="Signal. Plus one. Tap for details."><strong class="marketOfferName">SIGNAL</strong><span class="marketOfferSignalMark" aria-hidden="true"><i class="marketSignalBolt"></i></span></button><button class="shopBuy" data-market-signal ${s.coins<signalOffer.price?'disabled':''}>BUY · ${signalOffer.price}c</button></section>`:'';
    const modHtml=offers.map(info=>{const mod=info.mod,noTarget=info.targetCount<1,assigned=(info.assignedTileIds||[]).length,relocate=info.id==='zero-port'?assigned===2:assigned>0,code=mod.collectionCode||info.id.slice(0,2).toUpperCase(),name=mod.displayName||mod.name,machine=mod.target==='machine',kind=machine?'machine':'tile',mark=marketOfferMarkHtml(code,machine),action=noTarget?'NO TARGET':relocate?'RELOCATE':'BUY';return `<section class="marketOffer marketCompactOffer" data-market-offer="${info.id}" data-market-target-count="${info.targetCount}" data-market-machine="${machine?'true':'false'}" data-market-kind="${kind}"><button type="button" class="marketOfferIdentity marketInspectTarget" data-market-inspect="${info.id}" aria-label="${escapeHtml(name)}. ${escapeHtml(code)}. ${machine?'Machine Mod':'Tile Mod'}. Tap for details."><strong class="marketOfferName">${escapeHtml(name)}</strong>${mark}</button><button class="shopBuy" data-market-mod="${info.id}" ${noTarget||s.coins<info.price?'disabled':''}>${action}${noTarget?'':` · ${info.price}c`}</button></section>`}).join('');
    overlayBody.innerHTML=`<div class="bigShop compactMarket"><div class="shopHero"><div><div class="label">CHOOSE ONE</div><strong>${s.coins}c</strong><div class="shopInflation">INFLATION ${s.inflation}${x.endless?.active?` · STRAIN ${strain}`:''}</div></div><div class="label">NEXT BOARD<br>${nextSize[0]} × ${nextSize[1]}</div></div><div class="marketOfferGrid">${signalOfferHtml}${modHtml||(!signalOfferHtml?'<p class="inspectEmpty">No valid Market choices.</p>':'')}</div><div class="shopFoot">TAP A MOD = DETAILS · BUY ONE · INFLATION +1</div></div>`;
    overlayBody.querySelector('[data-market-signal]')?.addEventListener('click',()=>{const r=GAME.buyMarketSignal();if(!r.ok){toast(r.reason==='coins'?'Not enough coins':'Market choice locked');return}PT?.closeMarket({outcome:'buy:signal'});persistGame();toast(`SIGNAL ${r.beforeSignal} → ${r.afterSignal}`);render()});
    overlayBody.querySelectorAll('[data-market-mod]').forEach(b=>{b.onclick=()=>{const eventCursor=GAME.state().events.length,id=b.dataset.marketMod,r=GAME.buyMarketMod(id),mod=M.get(id);if(!r.ok){toast(r.reason==='coins'?'Not enough coins':r.reason==='no-target'?'No valid target':'Market choice locked');return}if(!r.pending)PT?.closeMarket({outcome:`buy:${id}`});persistGame();if(r.pending)toast(r.stage==='source'?`${mod.displayName||mod.name} · CHOOSE PORT TO MOVE`:`${mod.displayName||mod.name} · CHOOSE A TILE`);else toast(`${mod.displayName||mod.name} installed`);render();announceCoreProgress(GAME.state().events.slice(eventCursor))}});
    overlayBody.querySelectorAll('[data-market-inspect]').forEach(el=>{const id=el.dataset.marketInspect;bindInspectorTap(el,()=>openMarketOfferInspector(id));el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openMarketOfferInspector(id)}}});
    overlayPrimary.textContent=`CONTINUE TO STAGE ${nextStage}`;overlayPrimary.onclick=()=>{GAME.closeMarket();PT?.closeMarket({outcome:'continue'});persistGame();advanceRound()}
  }

  function showFailed(){
    resetOverlay();modalEl.classList.add('outcomeModal');const s=GAME.state(),x=GAME.snapshot(),endless=!!x.endless?.active,noTiles=s.failureReason==='no-tiles',limit=s.failureReason==='placement-limit',noLegal=s.failureReason==='no-legal-moves',recovery=GAME.recoveryOptions(),stalled=!!recovery.recoverable;
    overlayTitle.textContent=stalled?(limit?'ROUND STALLED':'MACHINE STALLED'):endless?'ENDLESS OVER':noTiles?'SUPPLY ERROR':'ROUND FAILED';
    if(!stalled)PT?.finalizeCurrent(s.standardComplete?'completed':'failed',{reason:s.failureReason||'run-ended'});
    const reason=noTiles?'The automatic POWER set could not be generated. Download the run file so this can be diagnosed.':limit?(stalled?'You used every move, but a stored or purchased Move can continue this round.':'You used every move for this round.'):noLegal?(stalled?'No legal continuation remains. Buy & use a Reroll to redraw the Hand.':'No legal continuation remains and a Reroll cannot be purchased.'):'No legal continuation remains.',inlineDownload=stalled?'<button id="downloadFailedRun" class="failureDownloadButton" type="button">DOWNLOAD RUN .TXT</button>':'';
    overlayBody.innerHTML=`<p>${endless?`Classic complete · Endless reached Round ${s.round+1}.<br>`:''}${reason}</p>${summaryHtml()}${inlineDownload}`;
    overlayBody.querySelector('#downloadFailedRun')?.addEventListener('click',downloadRunBatch);
    let slot=0,buttons=[overlayPrimary,overlaySecondary,overlayTertiary];
    if(!stalled){const b=buttons[slot++];b.style.display='inline-block';b.textContent='DOWNLOAD RUN .TXT';b.onclick=downloadRunBatch}
    if(noTiles&&GAME.canOpenShop()&&recovery.shopRescue){const b=buttons[slot++];b.style.display='inline-block';b.textContent='TILE SHOP';b.onclick=openPermanentShop}
    if(limit&&GAME.canUseMove()){const b=buttons[slot++];b.style.display='inline-block';b.textContent=`+1 MOVE · ${s.consumables.move}`;b.onclick=useMove}
    else if(limit&&recovery.toolRescue){const b=buttons[slot++];b.style.display='inline-block';b.textContent=`BUY & USE MOVE · ${recovery.prices.move}c`;b.onclick=()=>buyToolAndUse('move')}
    if(noLegal&&recovery.rerollRescue&&slot<buttons.length){const b=buttons[slot++];b.style.display='inline-block';b.textContent=`BUY & REROLL · ${recovery.prices.reroll}c`;b.onclick=()=>buyToolAndUse('reroll')}
    if(!noLegal&&GAME.canUndo()&&slot<buttons.length){const b=buttons[slot++];b.style.display='inline-block';b.textContent=`UNDO · ${s.consumables.undo}`;b.onclick=useUndo}
    const b=buttons[slot++]||overlayTertiary;setNewRunButton(b)
  }

  function render(){
    const s=GAME.state(),x=GAME.snapshot(),view=V.hudViewModel(s,x,{target:GAME.target(),maxPlacements:GAME.maxPlacements(),totalRounds:D.TOTAL_ROUNDS,boardWidth:E.G,boardHeight:E.H,longChainCap:D.ENDLESS_LONG_RUN_ACTIVATIONS||7});document.body.dataset.stageRound=String(view.stageRoundIndex);document.body.classList.toggle('endlessPalette',view.endless);document.body.classList.toggle('infinitePalette',view.infinitePhase);document.body.classList.toggle('ouroborosPalette',view.ouroboros);H.bindRun(s.runId);renderModeIndicator(view.modeIndicator);renderMachineModStatus(view.longChain);renderBoard();renderHand();const scoreDetail=$('scoreDetail');scoreEl.textContent=view.score;targetEl.textContent=view.target;$('scoreNote').textContent=view.note;scoreDetail.classList.toggle('scoreOverdrive',!!view.scoreOverdrive);scoreDetail.dataset.scoreMode=view.scoreMode;scoreDetail.setAttribute('aria-label',`Score ${view.scoreExact}. ${view.scoreOverdrive?`${V.multiplierText(view.scoreRatio)} times target. `:''}${view.note}. Show exact value.`);$('targetDetail').setAttribute('aria-label',`Target ${view.targetExact}. Show exact value.`);stageEl.textContent=view.stage;roundEl.textContent=view.round;movesEl.textContent=view.moves;$('movesRemaining').textContent=view.movesRemaining;tilesEl.textContent=view.tilesLeft;coinEl.textContent=view.coins;stageRoundEl.textContent=view.stageRound;boardSizeEl.textContent=view.boardSize;
    shopBtn.innerHTML=`Shop<small>${compact(s.coins)} coins</small>`;shopBtn.disabled=!!tutorial||uiBusy||!GAME.canOpenShop();const canBuyMove=GAME.canBuyTool('move'),canBuyReroll=GAME.canBuyTool('reroll'),canBuyUndo=GAME.canBuyTool('undo');moveBtn.innerHTML=`${view.movesRemaining} MOVES<small>ADD +1 · ${s.consumables.move||0}</small>`;moveBtn.setAttribute('aria-label',`${view.movesRemaining} moves remaining. Add one move tool: ${s.consumables.move||0} owned.`);moveBtn.disabled=!!tutorial||uiBusy||!(GAME.canUseMove()||canBuyMove);const rerollLabel=s.freeReroll?`Reroll · FREE${s.consumables.reroll?` + ${s.consumables.reroll}`:''}`:`Reroll · ${s.consumables.reroll||'0 · BUY'}`;rerollBtn.innerHTML=`Reroll<small>${s.freeReroll?'FREE':s.consumables.reroll||0}</small>`;rerollBtn.setAttribute('aria-label',rerollLabel);rerollBtn.disabled=!!tutorial||uiBusy||!(GAME.canUseReroll()||canBuyReroll);undoBtn.innerHTML=`Undo<small>${s.consumables.undo||0}</small>`;undoBtn.setAttribute('aria-label',`Undo tools: ${s.consumables.undo||0}`);undoBtn.disabled=!!tutorial||uiBusy||!(GAME.canUndo()||canBuyUndo);menuButton.disabled=!!tutorial||s.running||uiBusy;$('leaveTutorial').disabled=!!tutorial&&(uiBusy||s.running);
    renderSignalHudIdle(view.signal);hint.textContent=view.hint;renderLog();
    const pendingCircuit=s.pendingCircuit,pendingMod=s.pendingModPlacement,pending=pendingCircuit||pendingMod;circuitChoice.hidden=!pending;if(pendingCircuit){hint.textContent='Choose one outlined tile to develop.';circuitChoice.textContent=`CIRCUIT CLOSED · ${pendingCircuit.size} TILES · +${pendingCircuit.reward} RANK${pendingCircuit.reward===1?'':'S'} · CHOOSE A TILE`}else if(pendingMod){const mod=M.get(pendingMod.mod),relocating=pendingMod.stage==='source';hint.textContent=relocating?'Choose which Zero Port endpoint to relocate.':'Choose one highlighted compatible tile.';circuitChoice.textContent=`${mod?.displayName||pendingMod.mod} · ${relocating?'CHOOSE PORT TO MOVE':'CHOOSE A TILE'}`}
    if(auxOverlay){renderAuxOverlay();return}if(pending){hideOverlay();return}if(uiBusy){hideOverlay();return}if(s.shopOpen){s.shopType==='market'?showMarket():showShop();return}if(tutorial)return;
    if(!s.running){const waiting=(s.cleared||s.blocked)&&performance.now()<outcomeOverlayNotBefore;if(waiting)hideOverlay();else if(s.cleared)showClear();else if(s.blocked)showFailed();else hideOverlay()}
  }

  function center(c,r){const p=E.pieceFrom(drag.tile,c.x,c.y,0,c.rr,-1);return{x:(p.rect.minx+p.rect.maxx)/2/E.G*r.width,y:(p.rect.miny+p.rect.maxy)/2/E.H*r.height}}
  function nearest(x,y){const r=board.getBoundingClientRect(),lx=x-r.left,ly=(y-D.DRAG_Y_OFFSET)-r.top;if(lx<0||ly<0||lx>r.width||ly>r.height)return null;let pick=null,d0=1e9;for(const c of drag.candidates){const q=center(c,r),d=Math.hypot(q.x-lx,q.y-ly);if(d<d0){d0=d;pick=c}}return d0<=82?pick:null}
  function samePlacementCandidate(a,b){return!!a===!!b&&(!a||a.x===b.x&&a.y===b.y&&a.rr===b.rr)}
  function latchedPlacementCandidate(raw,e,now=performance.now()){const current=drag.candidate;if(!current){drag.candidateSince=raw?now:null;drag.candidatePointerX=raw?e.clientX:null;drag.candidatePointerY=raw?e.clientY:null;drag.candidateLocked=false;return raw}if(samePlacementCandidate(raw,current)){if(drag.candidateSince==null)drag.candidateSince=now;drag.candidatePointerX=e.clientX;drag.candidatePointerY=e.clientY;return current}const dwell=now-(drag.candidateSince??now),dx=e.clientX-(drag.candidatePointerX??e.clientX),dy=e.clientY-(drag.candidatePointerY??e.clientY);if(dwell>=PLACEMENT_LOCK_MS&&Math.hypot(dx,dy)<=PLACEMENT_LOCK_TOLERANCE_PX){drag.candidateLocked=true;return current}drag.candidateSince=raw?now:null;drag.candidatePointerX=raw?e.clientX:null;drag.candidatePointerY=raw?e.clientY:null;drag.candidateLocked=false;return raw}
  function maybeShakeRotate(e){
    const s=GAME.state(),ouroboros=drag.kind==='ouroboros';if(!ouroboros&&s.pieces.length)return;const now=performance.now(),dx=e.clientX-drag.lastX;
    if(Math.abs(dx)>=D.SHAKE_THRESHOLD){const sign=Math.sign(dx);if(drag.lastSign&&sign!==drag.lastSign){if(!drag.shakeStarted||now-drag.shakeStarted>D.SHAKE_WINDOW_MS){drag.switches=1;drag.shakeStarted=now}else drag.switches++;if(drag.switches>=D.SHAKE_SWITCHES&&now-drag.lastRotate>D.SHAKE_COOLDOWN_MS){if(ouroboros){drag.rr=((drag.rr??0)+1)%4;drag.candidate=null;drag.preview=null;if(drag.float)drag.float.style.setProperty('--rr',drag.rr);toast(`ROTATE ${ARROW[drag.rr]}`)}else{GAME.rotateRoot();drag.candidates=GAME.candidatesForIndex(drag.index);drag.candidate=null;drag.preview=null;updateFloatRotation();toast(`Opening tile ${ARROW[GAME.state().rootRR]}`)}drag.lastRotate=now;drag.switches=0;drag.shakeStarted=now;if(navigator.vibrate)navigator.vibrate(12)}}drag.lastSign=sign;drag.lastX=e.clientX}
  }
  function updateFloatRotation(){if(drag.float)drag.float.style.setProperty('--rr',GAME.state().rootRR)}
  function startDrag(e,i){if(uiBusy||auxOverlay||!GAME.canInteract())return;e.preventDefault();const s=GAME.state(),cs=placementCandidates(i);if(!cs.length)return;const f=document.createElement('div');f.className='dragFloat';f.innerHTML=mini(s.hand[i]);document.body.appendChild(f);drag={active:true,kind:'hand',index:i,tileId:s.hand[i].id,tile:{...s.hand[i]},candidates:cs,candidate:null,candidateSince:null,candidatePointerX:null,candidatePointerY:null,candidateLocked:false,topologyBreaks:[],preview:null,float:f,lastX:e.clientX,lastSign:0,switches:0,shakeStarted:performance.now(),lastRotate:0};renderHand();updateFloatRotation()}
  function startOuroborosDrag(e,tileId){
    if(uiBusy||auxOverlay||!GAME.canInteract()||!GAME.state().ouroborosMode)return;e.preventDefault();const piece=GAME.state().pieces.find(p=>p.tile.id===tileId);if(!piece)return;
    const gesture=press.state?.(),startX=gesture?.startX??e.clientX,startY=gesture?.startY??e.clientY,r=board.getBoundingClientRect(),originX=r.left+(piece.cubes[0].x/E.G)*r.width,originY=r.top+(piece.cubes[0].y/E.H)*r.height,f=document.createElement('div');f.className='dragFloat ouroborosDragFloat';f.innerHTML=mini(piece.tile);document.body.appendChild(f);
    drag={active:true,kind:'ouroboros',index:-1,tileId,tile:{...piece.tile},candidates:[],candidate:{x:piece.cubes[0].x,y:piece.cubes[0].y,z:0,rr:piece.rr},rr:piece.rr,topologyBreaks:[],preview:null,float:f,pointerId:e.pointerId??gesture?.pointerId??null,grabOffsetX:startX-originX,grabOffsetY:(startY-D.DRAG_Y_OFFSET)-originY,lastX:e.clientX,lastSign:0,switches:0,shakeStarted:performance.now(),lastRotate:0};ouroborosSelection=tileId;f.style.setProperty('--rr',piece.rr);
    try{if(drag.pointerId!=null&&board.setPointerCapture)board.setPointerCapture(drag.pointerId)}catch{}
    renderBoard();renderHand()
  }
  function ouroborosCandidate(e){
    const r=board.getBoundingClientRect(),x=Math.round(((e.clientX-drag.grabOffsetX)-r.left)/r.width*E.G),y=Math.round((((e.clientY-D.DRAG_Y_OFFSET)-drag.grabOffsetY)-r.top)/r.height*E.H),piece=GAME.state().pieces.find(p=>p.tile.id===drag.tileId),rr=drag.rr??piece?.rr??0,preview=GAME.ouroborosPlacementPreview?.(drag.tileId,{x,y,z:0,rr});
    return preview?.ok?{candidate:preview.placement,topologyBreaks:preview.topologyLosses||[],reason:null}:{candidate:null,topologyBreaks:[],reason:preview?.reason||'invalid'}
  }
  function moveDrag(e){
    if(!drag.active)return;e.preventDefault();maybeShakeRotate(e);if(drag.float){const r=board.getBoundingClientRect(),inside=e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom,boardTileWidth=r.width/E.G*2,scale=inside?Math.max(.18,Math.min(1.2,boardTileWidth/30)):1.2;drag.float.style.left=e.clientX+'px';drag.float.style.top=(e.clientY-D.DRAG_Y_OFFSET)+'px';drag.float.style.setProperty('--drag-scale',scale)}
    if(drag.kind==='ouroboros'){const next=ouroborosCandidate(e),c=next.candidate,o=drag.candidate,changed=(!c)!==(!o)||c&&(!o||c.x!==o.x||c.y!==o.y||c.rr!==o.rr);drag.candidate=c;drag.topologyBreaks=next.topologyBreaks;drag.invalidReason=next.reason;if(drag.float)drag.float.style.opacity=c?'0':'0.96';if(changed)renderBoard();return}
    const raw=nearest(e.clientX,e.clientY),o=drag.candidate,c=latchedPlacementCandidate(raw,e),changed=(!c)!==(!o)||c&&(!o||c.x!==o.x||c.y!==o.y||c.rr!==o.rr);drag.candidate=c;
    if(changed){drag.topologyBreaks=c?(GAME.topologyBreaksForPlacement?.(drag.index,c)||[]):[];drag.preview=c&&routePreviewMode()!=='off'?(GAME.previewPlacement?.(drag.index,c)||null):null}
    if(drag.float)drag.float.style.opacity=c?'0':'0.96';if(changed)renderBoard()
  }
  async function animateDrawSlot(i){if(!GAME.state().hand[i]){handFx[i]='hidden';renderHand();await wait(100);handFx[i]='normal';renderHand();return}handFx[i]='back';renderHand();await wait(D.DRAW_BLACK_MS);handFx[i]='reveal';renderHand();await wait(390);handFx[i]='normal';renderHand()}
  async function endDrag(e){
    if(!drag.active)return;moveDrag(e);const kind=drag.kind,i=drag.index,tileId=drag.tileId,c=drag.candidate,invalidReason=drag.invalidReason,pointerId=drag.pointerId;if(drag.float)drag.float.remove();try{if(pointerId!=null&&board.hasPointerCapture?.(pointerId))board.releasePointerCapture(pointerId)}catch{}drag={active:false,kind:null,index:-1,tileId:null,tile:null,candidates:[],candidate:null,candidateSince:null,candidatePointerX:null,candidatePointerY:null,candidateLocked:false,topologyBreaks:[],preview:null,float:null};renderBoard();if(!c){if(kind==='ouroboros')toast(invalidReason==='overlap'?'SPACE OCCUPIED':invalidReason==='bounds'?'OUTSIDE BOARD':invalidReason==='core-overlap'?'CORE OCCUPIED':'INVALID REBUILD');renderHand();return}
    if(kind==='ouroboros'){const r=GAME.moveOuroborosTile(tileId,c);if(!r.ok){toast('Invalid rebuild');render();return}ouroborosSelection=tileId;PT?.recordOuroborosRebuild?.({tileId,from:r.from,to:r.to,rotated:r.from?.rr!==r.to?.rr,relocated:r.from?.x!==r.to?.x||r.from?.y!==r.to?.y});persistGame();render();if(r.topologyLosses?.length)toast(`REBUILD · LOST ${r.topologyLosses.map(x=>x.label).join(', ')}`);return}
    const game=GAME,generationBefore=game.state().setGeneration||1,ouroborosBefore=!!game.state().ouroborosMode;if(!tutorial)PT?.recordDecision();const decision=!tutorial?game.decisionTelemetry(i,c,{maxEvaluations:48,timeBudgetMs:32}):null,searchStarted=performance.now(),ctx=GAME.beginPlacement(i,c),searchMs=performance.now()-searchStarted;if(!ctx.ok){toast(ctx.reason==='tile-already-in-machine'?'Tile already in machine':'Invalid placement');render();armDecisionTiming();return}
    uiBusy=true;beginCascadeControl();const drawAnim=animateDrawSlot(i);renderBoard();const camera=rootCamera(),animationStarted=performance.now();let result=null,animationMeta={skippedCascade:false,skippedSummary:false},exitPending=false;
    try{
      camera?.beginCascade(ctx.sim.events||[]);try{animationMeta=await animate(ctx.p,ctx.trigger,ctx.sim,game.moveResonance(ctx.sim,ctx.trigger).output)}finally{camera?.endCascade()}
      const animationMs=performance.now()-animationStarted;result=game.finishPlacement(ctx);window.NomonUiPolish?.snapScore?.(game.state().score);recordPerformance(ctx.sim,searchMs,animationMs,animationMeta);if(!tutorial&&decision){
        const scoreMath=window.MonoidScore,topologyAfter=game.topologyTelemetry(),chosenOutput=result.resonance?.output??game.state().score,chosenOutputExact=result.resonance?.outputExact??game.state().scoreExact??scoreMath.exact(chosenOutput),alternative=decision.bestEvaluatedOutput,alternativeExact=decision.bestEvaluatedOutputExact,bestLegalOutputExact=decision.evaluationComplete?(decision.evaluationStrategy==='root-equivalent'?decision.bestLegalOutputExact:(alternativeExact==null?chosenOutputExact:(scoreMath.compare(chosenOutputExact,alternativeExact)>=0?chosenOutputExact:alternativeExact))):null,bestLegalOutput=bestLegalOutputExact==null?null:Number(bestLegalOutputExact),bestPlacement=decision.evaluationComplete?(decision.evaluationStrategy==='root-equivalent'?decision.bestPlacement:(alternativeExact!=null&&scoreMath.compare(alternativeExact,chosenOutputExact)>0?decision.bestEvaluatedPlacement:{tileId:ctx.tile.id,handIndex:i,x:c.x,y:c.y,z:0,rr:c.rr})):null,events=ctx.sim.events||[];
        const coverageSamples=decision.coverageIncludesChosen?[]:[...(decision.coverageSampleOutputs||[]),chosenOutput].filter(Number.isFinite).sort((a,b)=>a-b),pickCoverage=q=>coverageSamples[Math.min(coverageSamples.length-1,Math.max(0,Math.ceil(q*coverageSamples.length)-1))];
        const clearCoverageSampleCount=decision.coverageIncludesChosen?(decision.clearCoverageSampleCount||0):coverageSamples.length,clearCoverageClearCount=decision.coverageIncludesChosen?(decision.clearCoverageClearCount||0):(decision.clearCoverageClearCount||0)+(scoreMath.compare(chosenOutputExact,decision.coverageTargetExact??game.targetExact())>=0?1:0),clearCoverage=clearCoverageSampleCount?clearCoverageClearCount/clearCoverageSampleCount:null,outputDistribution=decision.coverageIncludesChosen?decision.outputDistribution:(coverageSamples.length?{min:coverageSamples[0],median:pickCoverage(.5),p90:pickCoverage(.9),max:coverageSamples[coverageSamples.length-1]}:null),signal=game.signalTelemetry(ctx.sim,game.state().pieces),route=routeTelemetryForSim(ctx.sim,game.state().pieces),deckAfter=game.deckTelemetry(),{coverageSampleOutputs,...decisionMeta}=decision;
        PT?.recordPlacement({...decisionMeta,turn:game.state().turn,chosenOutput,chosenOutputExact,chosenSelectionOutput:ctx.sim.output??ctx.trigger,chosenSelectionOutputExact:ctx.sim.outputExact??scoreMath.exact(ctx.sim.output??ctx.trigger),routeTileIds:route.routeTileIds,routeLength:route.routeLength,bestLegalOutput,bestLegalOutputExact,bestPlacement,chosenVsBestRatio:bestLegalOutput?chosenOutput/bestLegalOutput:null,evaluatedPlacementCount:(decision.evaluatedPlacementCount||0)+1,clearCoverageSampleCount,clearCoverageClearCount,clearCoverage,clearCoverageComplete:decision.coverageIncludesChosen?!!decision.clearCoverageComplete:!!decision.evaluationComplete,outputDistribution,deckAfter,topologyAfter,context:{...signal,rebounds:ctx.sim.rebounds||0,splits:events.filter(e=>e.type==='signal-fork').length,doubleEchoes:events.filter(e=>e.type==='double-echo-start').length,zeroPorts:events.filter(e=>e.type==='zero-port').length,powerActivations:events.filter(e=>e.type==='op'&&(e.powerMultiplier||1)>1).length,modActivations:events.filter(e=>e.type==='op'&&(e.modMultiplier||1)>1).length,resonanceMultiplier:result.resonance?.multiplier||1,newCircuits:Math.max(0,(topologyAfter.circuitCount||0)-(decision.topologyBefore?.circuitCount||0))}})
      }
      persistGame();exitPending=!!tutorial?.exitPending;if(!exitPending)advanceTutorial(result);await drawAnim
    }finally{endCascadeControl();uiBusy=false}
    if(exitPending){leaveTutorial(false);return}if(game.state().ouroborosMode&&!ouroborosSelection)ouroborosSelection=ctx.tile.id;if(!tutorial&&(game.state().cleared||game.state().blocked))armOutcomeDelay();render();if(!tutorial)armDecisionTiming();
    if(!tutorial&&!ouroborosBefore&&game.state().ouroborosMode){boardMessage('OUROBOROS · REBUILD',1800);toast('OUROBOROS · REBUILD THE MACHINE')}else if(!tutorial&&result.autoRerolls)toast(`NO LEGAL MOVES · AUTO REROLL${result.autoRerolls>1?` ×${result.autoRerolls}`:''}`);else if(!tutorial&&generationBefore<(game.state().setGeneration||1))toast(`POWER SET ${game.state().setGeneration} · ×${game.snapshot().powerSets.powerMultiplier} UNLOCKED`);else if(!tutorial&&game.state().cleared)toast(`Round clear · ${fmt(game.state().score)}`);else if(!tutorial&&result.upgradeCoins)toast(`★ +${result.upgradeCoins} coins`)
  }
  function selectOuroborosTile(tileId){if(!GAME.state().ouroborosMode)return;ouroborosSelection=tileId;renderBoard();renderHand()}
  function routeTelemetryForSim(sim,pieces=GAME.state().pieces){
    const byPieceId=new Map((pieces||[]).map(piece=>[piece.id,piece.tile?.id||piece.id])),events=sim?.events||[],physicalOps=events.filter(event=>event.type==='op'&&!event.tollRepeat),routeTileIds=[...new Set(physicalOps.map(event=>byPieceId.get(event.piece)).filter(Boolean))];
    return{routeTileIds,routeLength:events.filter(event=>event.type==='move').length}
  }
  function ouroborosLayoutTelemetry(){return GAME.state().pieces.map(piece=>({tileId:piece.tile?.id||piece.id,x:piece.cubes?.[0]?.x??0,y:piece.cubes?.[0]?.y??0,rr:piece.rr??0}))}
  async function fireOuroborosSelection(){
    if(!ouroborosSelection||uiBusy||auxOverlay)return;const game=GAME,ctx=game.beginOuroborosFire?.(ouroborosSelection);if(!ctx?.ok){toast('FIRE unavailable');return}const decisionMs=PT?.recordDecision?.('ouroboros')||0;
    uiBusy=true;beginCascadeControl();renderBoard();const camera=rootCamera(),animationStarted=performance.now();let result=null,animationMeta={skippedCascade:false,skippedSummary:false};
    try{camera?.beginCascade(ctx.sim.events||[]);try{animationMeta=await animate(ctx.p,ctx.trigger,ctx.sim,game.moveResonance(ctx.sim,ctx.trigger).output)}finally{camera?.endCascade()}result=game.finishPlacement(ctx);window.NomonUiPolish?.snapScore?.(game.state().score);recordPerformance(ctx.sim,0,performance.now()-animationStarted,animationMeta);const signal=game.signalTelemetry(ctx.sim,game.state().pieces),route=routeTelemetryForSim(ctx.sim,game.state().pieces);PT?.recordOuroborosFire?.({decisionMs,turn:game.state().turn,tileId:ctx.tile.id,output:result?.resonance?.output??game.state().score,outputExact:result?.resonance?.outputExact??game.state().scoreExact,selectionOutput:ctx.sim.output??ctx.trigger,selectionOutputExact:ctx.sim.outputExact??window.MonoidScore.exact(ctx.sim.output??ctx.trigger),routeLength:route.routeLength,routeTileIds:route.routeTileIds,operationCount:signal.operationCount,uniqueVisitedPieceCount:signal.uniqueVisitedPieceCount,reentryOperationCount:signal.reentryOperationCount,retraceMoveCount:signal.retraceMoveCount,layout:ouroborosLayoutTelemetry()});persistGame()}
    finally{endCascadeControl();uiBusy=false}
    if(game.state().cleared||game.state().blocked)armOutcomeDelay();render();armDecisionTiming();if(game.state().cleared)toast(`Round clear · ${fmt(game.state().score)}`);else if(result?.upgradeCoins)toast(`★ +${result.upgradeCoins} coins`)
  }

  function chooseCircuitTile(tileId){const r=GAME.chooseCircuitTile(tileId);if(!r.ok)return;press.cancel();persistGame();clearOutcomeDelay();render();armDecisionTiming();toast(`CIRCUIT RANK ${D.CIRCUIT_RANKS[r.after-1].roman}`)}
  function chooseMarketModTile(tileId){const eventCursor=GAME.state().events.length,pending=GAME.state().pendingModPlacement,mod=M.get(pending?.mod),r=GAME.chooseMarketModTile(tileId);if(!r.ok){toast(r.reason==='no-target'?'No compatible Mod target':'Invalid Mod target');return}if(!r.pending)PT?.closeMarket({outcome:`buy:${pending?.mod||r.mod}`});press.cancel();persistGame();clearOutcomeDelay();render();if(r.pending)toast(`${mod?.displayName||r.mod} · CHOOSE NEW ZERO`);else toast(`${mod?.displayName||r.mod} → [${r.tile?.a}|${r.tile?.b}]`);announceCoreProgress(GAME.state().events.slice(eventCursor))}
  function chooseMarketModHalf(tileId,half){const eventCursor=GAME.state().events.length,r=GAME.chooseMarketModHalf(tileId,half);if(!r.ok){toast('Invalid DIODE direction');return}PT?.closeMarket({outcome:'buy:diode'});press.cancel();persistGame();clearOutcomeDelay();render();toast(`DIODE IN → ${half+1}`);announceCoreProgress(GAME.state().events.slice(eventCursor))}
  const press=GEST.createPressGesture({delay:D.LONG_PRESS_MS||500,tolerance:D.LONG_PRESS_MOVE_TOLERANCE_PX||10,onTap:meta=>{if(meta.kind==='circuit')chooseCircuitTile(meta.tileId);else if(meta.kind==='mod-target')chooseMarketModTile(meta.tileId);else if(meta.kind==='mod-half')chooseMarketModHalf(meta.tileId,meta.half);else if(meta.kind==='ouroboros-board')selectOuroborosTile(meta.tileId);else if(meta.kind==='board')revealModFace(meta.tileId);else if(meta.kind==='core')openCoreInspector(meta.coreId);else if(meta.kind==='void')openVoidInspector(meta.voidId)},onLongPress:meta=>{if(meta.kind==='circuit'||meta.kind==='mod-target')return;if(navigator.vibrate)navigator.vibrate(8);if(meta.kind==='core')openCoreInspector(meta.coreId);else if(meta.kind==='void')openVoidInspector(meta.voidId);else openTileInspector(meta.tileId)},onDragStart:(meta,e)=>{if(meta.kind==='hand')startDrag(e,meta.index);else if(meta.kind==='ouroboros-board')startOuroborosDrag(e,meta.tileId)}});
  function handlePointerMove(e){press.move(e);if(drag.active)moveDrag(e)}
  async function handlePointerUp(e){press.end(e);if(drag.active)await endDrag(e)}
  function handlePointerCancel(e){press.cancel();if(drag.active)endDrag(e)}
  window.addEventListener('pointermove',handlePointerMove,{passive:false});window.addEventListener('pointerup',handlePointerUp);window.addEventListener('pointercancel',handlePointerCancel);

  function pc(id){return GAME.state().pieces.find(p=>p.id===id)}
  function setCascadeHighlight(pathPieceIds=[],activePieceIds=[]){
    const path=new Set((pathPieceIds||[]).map(id=>pc(id)?.tile?.id).filter(Boolean)),active=new Set((activePieceIds||[]).map(id=>pc(id)?.tile?.id).filter(Boolean)),enabled=path.size>0;board.classList.toggle('cascadeSummaryMode',enabled);
    board.querySelectorAll('.piece').forEach(el=>{const inPath=enabled&&path.has(el.dataset.tileId),on=inPath&&active.has(el.dataset.tileId);el.classList.toggle('cascadeSummaryActive',on);el.classList.toggle('cascadeSummaryPath',inPath&&!on);el.classList.toggle('cascadeSummaryDim',enabled&&!inPath)})
  }
  function clearCascadeHighlight(){board.classList.remove('cascadeSummaryMode');board.querySelectorAll('.cascadeSummaryActive,.cascadeSummaryPath,.cascadeSummaryDim').forEach(el=>el.classList.remove('cascadeSummaryActive','cascadeSummaryPath','cascadeSummaryDim'))}
  function magnitude(v){const n=Math.abs(Number(v)||0);return n<1?1:Math.floor(Math.log10(n))+1}
  function fitBoardLabel(d){
    const width=Math.max(1,board.clientWidth-16),style=getComputedStyle(d),inner=Math.max(1,width-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight));
    d.style.setProperty('font-size',V.fitFontSize(parseFloat(style.fontSize),d.scrollWidth,inner)+'px','important');
    const w=d.getBoundingClientRect().width,h=d.getBoundingClientRect().height,x=parseFloat(d.style.left)/100*board.clientWidth,y=parseFloat(d.style.top)/100*board.clientHeight;
    d.style.left=Math.max(w/2+4,Math.min(board.clientWidth-w/2-4,x))+'px';d.style.top=Math.max(h/2+4,Math.min(board.clientHeight-h/2-4,y))+'px';
  }
  function trimCascadeHistory(){
    const kept=[...board.querySelectorAll('.cascadeRetained')];while(kept.length>V.CASCADE.retainedLabels)(kept.shift())?.remove()
  }
  function retainCascadeFx(d){if(!d)return d;d.classList.add('cascadeRetained');d.style.animationDuration='';trimCascadeHistory();return d}
  let operationFlashLayer=0;
  function clearTransientFx(){board.querySelectorAll('.operationFlash').forEach(el=>el.remove());operationFlashLayer=0}
  function fx(x,y,t,value=0,kind='add',index=0,lane='',retain=false,durationOverride=null){
    const d=document.createElement('div'),duration=Math.max(1,Number(durationOverride)||V.effectLifetime(index)),size=kind.includes('operationFlash')?13:kind.includes('signal')?14:Math.min(34,24+magnitude(value));d.className=`opfx ${kind}${lane?` ${lane}`:''}`;d.style.left=px(x);d.style.top=py(y);d.style.fontSize=`${size}px`;d.style.animationDuration=`${duration}ms`;d.style.setProperty('--cascade-flash-ms',`${duration}ms`);d.style.setProperty('--cascade-structure-ms',`${duration}ms`);if(kind.includes('operationFlash')){const shift=V.operationOffset(index,Math.round(x*17+y*31));d.style.setProperty('--op-shift-x',`${shift.x}px`);d.style.setProperty('--op-shift-y',`${shift.y}px`);board.querySelector('.operationFlash.cascadeNewest')?.classList.remove('cascadeNewest');d.classList.add('cascadeNewest');d.style.setProperty('--op-z',String(42+(++operationFlashLayer)))}d.textContent=t;board.appendChild(d);
    if(kind.includes('signal'))fitBoardLabel(d);
    if(retain)return retainCascadeFx(d);
    while(board.querySelectorAll('.opfx:not(.signalValue):not(.cascadeRetained)').length>V.CASCADE.maxLabels)board.querySelector('.opfx:not(.signalValue):not(.cascadeRetained)')?.remove();setTimeout(()=>d.remove(),duration);return d
  }
  const activePulses=new Map();
  function pulsePiece(pp,lane,index){
    if(!pp)return;const el=board.querySelector(`[data-tile-id="${pp.tile.id}"]`);if(!el)return;
    const cls=lane.family==='echo'?'signalEcho':lane.path.endsWith('B')?'signalLane1':'signalLane0',token={};let owners=activePulses.get(el);if(!owners){owners=new Map();activePulses.set(el,owners)}owners.set(token,cls);el.classList.add('signalActive',cls);
    setTimeout(()=>{owners.delete(token);if(![...owners.values()].includes(cls))el.classList.remove(cls);if(!owners.size){el.classList.remove('signalActive');activePulses.delete(el)}},V.effectLifetime(index));
  }
  function laneId(lane){return lane.family+(lane.path?'.'+lane.path:'')}
  function laneLabel(lane){return(lane.family==='echo'?'ECHO':'MAIN')+(lane.path?' '+lane.path:'')}
  function signalHudLaneLabel(key){const parts=String(key||'main').split('.'),path=parts.slice(1).join('');if(path)return path;if(parts[0]==='echo')return'E';return'M'}
  function renderSignalHud(){
    if(!signalHudEl)return;
    const values=signalHudEl.querySelector('.signalHudValues'),entries=[...signalHudState.lanes.entries()].sort((a,b)=>String(a[0]).localeCompare(String(b[0])));
    signalHudEl.hidden=!entries.length;if(!entries.length){if(values)values.innerHTML='';return}
    const multiple=entries.length>1;
    if(values)values.innerHTML=entries.map(([key,raw])=>{const value=Math.max(0,Math.floor(Number(raw)||0)),label=signalHudLaneLabel(key),cls=value<=1?' critical':value<=3?' low':'';return`<span class="signalHudLane${cls}">${multiple&&label?`<small>${label}</small>`:''}<b>${value}</b></span>`}).join(multiple?'<i class="signalHudDivider">|</i>':'');
    signalHudEl.setAttribute('aria-label',`Signal ${entries.map(([key,value])=>`${multiple&&signalHudLaneLabel(key)?signalHudLaneLabel(key)+' ':''}${Math.max(0,Math.floor(Number(value)||0))}`).join(', ')}. Tap to inspect.`)
  }
  function renderSignalHudIdle(model){
    if(!signalHudEl)return;if(signalHudState.active)return renderSignalHud();
    signalHudState.lanes.clear();if(model?.visible)signalHudState.lanes.set('main',Math.max(0,Number(model.start)||0));renderSignalHud()
  }
  if(signalHudEl){signalHudEl.onclick=e=>{e.stopPropagation();openSignalInspector()};signalHudEl.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openSignalInspector()}}}
  function startSignalHud(value){
    if(!signalHudEl)return;const signal=GAME.snapshot().signal;if(!signal?.enabled){signalHudState.active=false;signalHudState.lanes.clear();renderSignalHud();return}signalHudState.active=true;signalHudState.lanes.clear();signalHudState.lanes.set('main',Math.max(0,Number(value)||0));renderSignalHud()
  }
  function pulseSignalHudRecharge(){
    if(!signalHudEl)return;if(signalHudState.rechargeTimer)clearTimeout(signalHudState.rechargeTimer);signalHudEl.classList.remove('signalHudRecharge');void signalHudEl.offsetWidth;signalHudEl.classList.add('signalHudRecharge');signalHudState.rechargeTimer=setTimeout(()=>{signalHudEl.classList.remove('signalHudRecharge');signalHudState.rechargeTimer=0},520)
  }
  function setSignalHudLane(lane,value,{recharge=false}={}){
    if(!signalHudEl||!Number.isFinite(Number(value)))return;signalHudState.active=true;signalHudState.lanes.set(laneId(lane),Math.max(0,Number(value)));renderSignalHud();if(recharge)pulseSignalHudRecharge()
  }
  function splitSignalHud(lane,branches,budgets){
    if(!signalHudEl)return;const parent=laneId(lane);signalHudState.lanes.delete(parent);for(const branch of branches||[]){const child={family:lane.family,path:lane.path+(lane.path?'.':'')+V.armLabel(branch.arm)},value=Number(budgets?.[branch.arm]);signalHudState.lanes.set(laneId(child),Number.isFinite(value)?Math.max(0,value):0)}renderSignalHud()
  }
  function joinSignalHud(lane,branches,remaining){
    if(!signalHudEl)return;let fallback=0;for(const branch of branches||[]){const child={family:lane.family,path:lane.path+(lane.path?'.':'')+V.armLabel(branch.arm)},key=laneId(child);fallback=Math.max(fallback,Number(signalHudState.lanes.get(key))||0);signalHudState.lanes.delete(key)}const next=Number(remaining);signalHudState.lanes.set(laneId(lane),Math.max(0,Number.isFinite(next)?next:fallback));renderSignalHud()
  }
  function settleSignalValue(el){if(el?.isConnected)el.remove()}
  function clearLane(lane){board.querySelectorAll('.signalValue:not(.cascadeRetained)').forEach(el=>{if(el.dataset.lane===laneId(lane))settleSignalValue(el)})}
  function placeCascadeLabel(d,c,lane=null){
    const w=Math.min(d.getBoundingClientRect().width,board.clientWidth-12),h=d.getBoundingClientRect().height;d.style.maxWidth=(board.clientWidth-12)+'px';
    const bx=c?(c.x+1)/E.G*board.clientWidth+(lane?.family==='echo'?28:lane?.family==='main'?-28:0):board.clientWidth*.5,by=c?(c.y+1)/E.H*board.clientHeight:board.clientHeight*.82;
    const occupied=[...board.querySelectorAll('.signalValue,.cascadeSubtotal')].filter(el=>el!==d).map(el=>({x:parseFloat(el.style.left),y:parseFloat(el.style.top),w:el.offsetWidth,h:el.offsetHeight})).filter(o=>Number.isFinite(o.x)&&Number.isFinite(o.y));
    let selected=null,best=Infinity;for(let dy=-4;dy<=4;dy++)for(let dx=-2;dx<=2;dx++){
      const x=Math.max(w/2+4,Math.min(board.clientWidth-w/2-4,bx+dx*(w+6))),y=Math.max(h/2+4,Math.min(board.clientHeight-h/2-4,by+dy*(h+6)));
      const overlaps=occupied.filter(o=>Math.abs(o.x-x)<(o.w+w)/2+3&&Math.abs(o.y-y)<(o.h+h)/2+3).length,cost=overlaps*100000+Math.hypot(x-bx,y-by);
      if(cost<best){best=cost;selected={x,y}}
    }
    d.style.left=selected.x+'px';d.style.top=selected.y+'px'
  }
  function showOperation(e,lastOp,lane,index){
    const half=V.operationHalf(e,lastOp),pp=pc(e.piece),cube=pp?.cubes.find(x=>x.half===half)||pp?.cubes[0];pulsePiece(pp,lane,index);if(!cube||e.value===0)return;
    const kind=e.op==='multiply'?'multiply':'add',operation=e.type==='echo-copy'?'COPY':(kind==='multiply'?'×'+compact(e.factor):'+'+compact(e.add))+(e.doubleDouble?' DD':'');
    return fx(cube.x+1,cube.y+1,operation,e.after,`operationFlash ${kind}`,index,lane.family==='echo'?'echoLane':lane.path.endsWith('B')?'lane1':'lane0',false,tutorial?560:V.CASCADE.operationFlashMs)
  }
  function showCascadeSubtotal(item){
    const pp=item.piece!=null?pc(item.piece):null,cube=pp?.cubes.find(x=>x.half===item.half)||pp?.cubes[0],d=document.createElement('div');
    d.className=`opfx cascadeSubtotal cascadeRetained${item.family==='echo'?' echoContribution':''}`;d.dataset.output=item.output;d.dataset.label=item.label;d.dataset.family=item.family;d.dataset.lane=item.family+(item.path?'.'+item.path:'');d.dataset.piece=item.piece??'';
    const label=document.createElement('small'),number=document.createElement('strong');label.textContent=item.label;number.textContent=compact(item.output);d.append(label,number);board.appendChild(d);placeCascadeLabel(d,cube,{family:item.family,path:item.path||''});return d
  }
  async function settleCascadeScore(events,baseOutput,finalOutput,fallbackPiece){
    clearTransientFx();board.querySelectorAll('.cascadeSubtotal').forEach(el=>el.remove());board.querySelectorAll('.signalActive,.signalLane0,.signalLane1,.signalEcho').forEach(el=>el.classList.remove('signalActive','signalLane0','signalLane1','signalEcho'));activePulses.clear();
    const items=V.cascadeSettlementPlan(events,baseOutput,fallbackPiece,tutorial?8:V.CASCADE.contributionLimit),cards=[],allPieceIds=[...new Set(items.flatMap(item=>item.pieceIds||[]))];
    let firstCard=null;if(items[0]){firstCard=showCascadeSubtotal(items[0]);cards.push(firstCard);setCascadeHighlight(items[0].pieceIds||[],[])}
    cascadeControl.phase='summary';board.dataset.cascadePhase='summary';
    const subtotalHoldMs=tutorial?240:V.CASCADE.subtotalHoldMs,settleItemMs=tutorial?220:V.CASCADE.settleItemMs,resonanceSettleMs=tutorial?300:V.CASCADE.resonanceSettleMs,targetSettleMs=tutorial?260:V.CASCADE.targetSettleMs,pathMs=tutorial?0:V.CASCADE.summaryPathMs,segmentMs=tutorial?0:V.CASCADE.summarySegmentMs,resolveMs=tutorial?0:V.CASCADE.summaryResolveMs;
    await cascadeWait(subtotalHoldMs,'summary');
    const polish=window.NomonUiPolish,note=$('scoreNote'),detail=$('scoreDetail');detail?.setAttribute('aria-busy','true');polish?.snapScore?.(0);if(!polish?.snapScore)scoreEl.textContent='0';
    let running=0;const target=GAME.target();
    for(let index=0;index<items.length;index++){
      if(cascadeControl.skipSummary)break;
      const item=items[index],el=index===0?firstCard:showCascadeSubtotal(item);if(index>0)cards.push(el);
      setCascadeHighlight(item.pieceIds||[],[]);await cascadeWait(pathMs,'summary');if(cascadeControl.skipSummary)break;
      const segments=item.segments?.length?item.segments:V.cascadePathSegments(item.pieceIds||[]);
      for(const segment of segments){setCascadeHighlight(item.pieceIds||[],segment);await cascadeWait(segmentMs,'summary');if(cascadeControl.skipSummary)break}
      if(cascadeControl.skipSummary)break;
      setCascadeHighlight(item.pieceIds||[],item.pieceIds||[]);await cascadeWait(resolveMs,'summary');if(cascadeControl.skipSummary)break;
      const nextRunning=running+(Number(item.output)||0),crossesTarget=running<target&&nextRunning>=target,duration=crossesTarget?targetSettleMs:settleItemMs;
      el.classList.add('cascadeToScore');note.textContent=`${item.label} · +${compact(item.output)}`;
      if(polish?.tweenScore)polish.tweenScore(nextRunning,duration);else scoreEl.textContent=V.scoreDisplay(nextRunning,target).score;
      running=nextRunning;await cascadeWait(duration,'summary');el.remove()
    }
    const base=Number(baseOutput)||0,tolerance=Math.max(1,Math.abs(base))*1e-9;
    if(cascadeControl.skipSummary){
      for(const el of cards)el?.remove();running=base;polish?.snapScore?.(base);if(!polish?.snapScore)scoreEl.textContent=V.scoreDisplay(base,target).score;setCascadeHighlight(allPieceIds,allPieceIds)
    }else if(Math.abs(running-base)>tolerance){polish?.snapScore?.(base);if(!polish?.snapScore)scoreEl.textContent=V.scoreDisplay(base,target).score;running=base}
    const resolved=Number(finalOutput);if(Number.isFinite(resolved)&&Math.abs(resolved-base)>tolerance){
      const ratio=base?resolved/base:1;note.textContent=`CIRCUIT ×${compact(ratio)}`;
      if(cascadeControl.skipSummary){polish?.snapScore?.(resolved);if(!polish?.snapScore)scoreEl.textContent=V.scoreDisplay(resolved,target).score}
      else{setCascadeHighlight(allPieceIds,allPieceIds);if(polish?.tweenScore)polish.tweenScore(resolved,resonanceSettleMs);else scoreEl.textContent=V.scoreDisplay(resolved,target).score;await cascadeWait(resonanceSettleMs,'summary')}
    }
    detail?.removeAttribute('aria-busy');const settled=Number.isFinite(resolved)?resolved:base;note.textContent=V.scoreDisplay(settled,target).note;setCascadeHighlight(allPieceIds,allPieceIds);
    cascadeControl.phase='final';board.dataset.cascadePhase='final';clearCascadeSkipHint();if(!tutorial)await cascadeWait(V.CASCADE.finalHoldMs,'final');clearCascadeHighlight();return settled
  }
  function reboundFx(x,y,angle=180,index=0,lane=''){const d=fx(x,y,'',0,'signal cascadeStructural reboundFx',index,lane,false,V.CASCADE.structuralFxMs);d.innerHTML='<span class="reboundArrow" aria-hidden="true">→</span><small>REBOUND</small>';d.firstChild.style.transform=`rotate(${angle}deg)`;fitBoardLabel(d);return d}
  async function animateSequence(events,lane,startIndex=0,startEcho=()=>{}){
    let lastOp=null,index=startIndex,i=0;
    while(i<events.length){const e=events[i];
      if(e.type==='signal-fork'){
        const block=V.forkBlock(events,i),pp=pc(e.piece);if(!block){i++;continue}
        splitSignalHud(lane,block.branches,e.signalBudgets);
        if(pp){const splitLabel=e.distributorCoreId?'DISTRIBUTE':e.splitKind==='triple-double'?'TRIPLE DOUBLE':e.splitKind==='zero-port'?'ZERO PORT':'SPLIT';fx((pp.rect.minx+pp.rect.maxx)/2,(pp.rect.miny+pp.rect.maxy)/2,lane.family==='echo'?`ECHO ${splitLabel}`:splitLabel,0,'signal cascadeStructural splitFx',index,lane.family==='echo'?'echoLane':'lane0',false,V.CASCADE.structuralFxMs);await cascadeWait(Math.max(150,V.cascadeDelay(index)/2),'cascade')}
        await Promise.all(block.branches.map(branch=>animateSequence(branch.events,{family:lane.family,path:lane.path+(lane.path?'.':'')+V.armLabel(branch.arm)},index+1,startEcho)));
        joinSignalHud(lane,block.branches,block.join.signalRemaining);
        const joinPiece=block.merged?pc(block.join.piece):pp;if(joinPiece){const d=fx((joinPiece.rect.minx+joinPiece.rect.maxx)/2,(joinPiece.rect.miny+joinPiece.rect.maxy)/2,block.merged?'MERGE':'JOIN',0,'signal cascadeStructural joinFx',index+1,lane.family==='echo'?'echoLane':'lane0',false,V.CASCADE.structuralFxMs);d.dataset.family=lane.family;d.dataset.output=block.join.output;await cascadeWait(Math.max(220,V.cascadeDelay(index+1)),'cascade')}
        i=block.next;index+=2;continue
      }
      if(e.type==='op'){lastOp=e;if(Number.isFinite(e.signalAfter))setSignalHudLane(lane,e.signalAfter);showOperation(e,lastOp,lane,index);if(events[i+1]?.type==='double-echo-start'){startEcho(events[i+1],index);i++}await cascadeWait(V.cascadeDelay(index),'cascade');index++;i++;continue}
      if(e.type==='zero-port'){
        const pp=pc(e.piece),c=pp?.cubes.find(x=>x.half===e.fromHalf)||pp?.cubes.find(x=>x.v===0)||pp?.cubes[0];
        if(c){fx(c.x+1,c.y+1,'ZERO PORT',0,'signal cascadeStructural zeroPortFx',index,lane.family==='echo'?'echoLane':'lane0',false,V.CASCADE.structuralFxMs);await cascadeWait(Math.max(140,V.cascadeDelay(index)/2),'cascade')}i++;continue
      }
      if(e.type==='rebound'){
        const pp=pc(e.piece),entry=pp&&lastOp?.piece===e.piece?pp.cubes.find(x=>x.half===lastOp.entryHalf):null,exit=pp&&lastOp?.piece===e.piece?pp.cubes.find(x=>x.half===lastOp.exitHalf):null,c=exit||pp?.cubes.find(x=>x.v===0)||pp?.cubes[0];
        if(c){const angle=entry&&exit?Math.atan2(entry.y-exit.y,entry.x-exit.x)*180/Math.PI:180;reboundFx(c.x+1,c.y+1,angle,index,lane.family==='echo'?'echoLane':'lane0');await cascadeWait(Math.max(160,V.cascadeDelay(index)),'cascade')}i++;continue
      }
      if(['diode-block','return','hinge-move','hinge-blocked','toll-spend'].includes(e.type)){
        const pp=pc(e.piece),label=e.type==='diode-block'?'DIODE · BLOCK':e.type==='return'?'RETURN':e.type==='hinge-move'?'HINGE':e.type==='toll-spend'?'TOLL · −1c':'HINGE · BLOCKED';
        if(pp){fx((pp.rect.minx+pp.rect.maxx)/2,(pp.rect.miny+pp.rect.maxy)/2,label,0,'signal cascadeStructural',index,lane.family==='echo'?'echoLane':'lane0',false,V.CASCADE.structuralFxMs);await cascadeWait(Math.max(150,V.cascadeDelay(index)/2),'cascade')}i++;continue
      }
      if(e.type==='core-activate'){
        const core=GAME.state().cores?.find(core=>core.id===e.coreId),el=core&&board.querySelector(`[data-core-id="${e.coreId}"]`),role=String(e.role||'follow').toUpperCase(),ability=e.abilityApplied?String(e.abilityApplied).toUpperCase():null,after=e.afterSignal??GAME.snapshot().signal.coreCharge,added=Math.max(0,Number(e.signalAdded)||Number(after)-Number(e.beforeSignal)||0),recharge=Number.isFinite(e.beforeSignal)&&Number.isFinite(after)?`+${added} SIGNAL · ${e.beforeSignal}→${after}`:`+${added} SIGNAL`,prefix=e.peak?'PEAK · ':'',label=ability?`${prefix}${role} · ${ability} · ${recharge}`:`${prefix}${role} · ${recharge}`;
        if(Number.isFinite(Number(after)))setSignalHudLane(lane,Number(after),{recharge:Number(after)>Number(e.beforeSignal)});
        if(core){el?.classList.add('coreActivated',`coreRole${role}`);fx(core.x+(core.size||2)/2,core.y+(core.size||2)/2,label,0,'signal cascadeStructural coreActivationFx',index,lane.family==='echo'?'echoLane':'lane0',false,V.CASCADE.structuralFxMs);setTimeout(()=>el?.classList.remove('coreActivated',`coreRole${role}`),V.CASCADE.structuralFxMs);await cascadeWait(Math.max(220,V.cascadeDelay(index)),'cascade')}i++;continue
      }
      if(e.type==='core-relay'){
        const core=GAME.state().cores?.find(core=>core.id===e.coreId);if(core){fx(core.x+(core.size||2)/2,core.y+(core.size||2)/2,'RELAY',0,'signal cascadeStructural coreActivationFx',index,lane.family==='echo'?'echoLane':'lane0',false,V.CASCADE.structuralFxMs);await cascadeWait(Math.max(220,V.cascadeDelay(index)),'cascade')}i++;continue
      }
      if(e.type==='peak-ridge'){
        const cores=GAME.state().cores||[],from=cores.find(core=>core.id===e.fromCoreId),to=cores.find(core=>core.id===e.toCoreId),x=from&&to?(from.x+(from.size||2)/2+to.x+(to.size||2)/2)/2:E.G/2,y=from&&to?(from.y+(from.size||2)/2+to.y+(to.size||2)/2)/2:E.H/2;
        fx(x,y,`RIDGE · ${e.tileCount} TILES · ×${e.multiplier}`,0,'signal cascadeStructural peakRidgeFx',index,lane.family==='echo'?'echoLane':'lane0',false,V.CASCADE.structuralFxMs);await cascadeWait(Math.max(260,V.cascadeDelay(index)),'cascade');i++;continue
      }
      if(e.type==='island-dormant'){
        const pp=pc(e.piece),x=pp?(pp.rect.minx+pp.rect.maxx)/2:E.G/2,y=pp?(pp.rect.miny+pp.rect.maxy)/2:E.H/2;fx(x,y,'ISLAND · DORMANT',0,'signal cascadeStructural coreActivationFx',index,lane.family==='echo'?'echoLane':'lane0',false,V.CASCADE.structuralFxMs);await cascadeWait(Math.max(260,V.cascadeDelay(index)),'cascade');i++;continue
      }
      if(e.type==='island-link'){
        const pp=pc(e.piece),x=pp?(pp.rect.minx+pp.rect.maxx)/2:E.G/2,y=pp?(pp.rect.miny+pp.rect.maxy)/2:E.H/2;fx(x,y,`ISLANDS LINKED · +${e.signalAdded} SIGNAL`,0,'signal cascadeStructural coreActivationFx',index,lane.family==='echo'?'echoLane':'lane0',false,V.CASCADE.structuralFxMs);await cascadeWait(Math.max(300,V.cascadeDelay(index)),'cascade');i++;continue
      }
      if(e.type==='signal-depleted'){
        setSignalHudLane(lane,0);const pp=pc(e.piece),c=pp?.cubes?.[0];if(c){fx(c.x+1,c.y+1,'SIGNAL 0',0,'signal cascadeStructural signalDepletedFx',index,lane.family==='echo'?'echoLane':'lane0',false,V.CASCADE.structuralFxMs);await cascadeWait(Math.max(260,V.cascadeDelay(index)),'cascade')}i++;continue
      }
      if(e.type==='double-echo-start'){startEcho(e,index);i++;continue}i++
    }
    return index
  }
  async function animate(p,trigger,sim,finalOutput=sim.output??trigger){
    cascadeControl.phase='cascade';board.dataset.cascadePhase='cascade';renderBoard();startSignalHud(sim?.signalRuntime?.base??GAME.snapshot().signal.base);const dormantIsland=sim?.reason==='island-dormant';fx((p.rect.minx+p.rect.maxx)/2,(p.rect.miny+p.rect.maxy)/2,dormantIsland?'ISLAND':`+${compact(trigger)}`,dormantIsland?0:trigger,dormantIsland?'signal cascadeStructural coreActivationFx':'operationFlash add',0,'',false,tutorial?640:V.CASCADE.operationFlashMs);await cascadeWait(V.cascadeDelay(0),'cascade');
    const plan=V.signalPlan(sim.events||[]);let echoTask=null;
    const startEcho=(e,index)=>{if(echoTask)return;const pp=pc(e.piece);if(pp)fx((pp.rect.minx+pp.rect.maxx)/2,(pp.rect.miny+pp.rect.maxy)/2,'ECHO',0,'signal cascadeStructural echoStart',index,'echoLane',false,V.CASCADE.structuralFxMs);echoTask=(async()=>{const lane={family:'echo',path:''};showOperation({type:'echo-copy',piece:e.piece,value:1,op:'add',add:0,after:e.startOutput},null,lane,index);await cascadeWait(V.cascadeDelay(index),'cascade');return animateSequence(plan.echo,lane,index+1)})()};
    await animateSequence(plan.main,{family:'main',path:''},0,startEcho);if(echoTask)await echoTask;
    await settleCascadeScore(sim.events||[],sim.output??trigger,finalOutput,p.id);
    return{skippedCascade:!!cascadeControl.skipCascade,skippedSummary:!!cascadeControl.skipSummary}
  }

  async function doReroll(){if(uiBusy||!GAME.canUseReroll())return;uiBusy=true;hideOverlay();handFx.fill('hidden');renderHand();await wait(90);const r=GAME.reroll();if(!r.ok){uiBusy=false;handFx.fill('normal');render();return}persistGame();handFx.fill('back');renderHand();await wait(D.REROLL_BLACK_MS);for(let i=0;i<GAME.state().hand.length;i++){if(GAME.state().hand[i])handFx[i]='reveal';renderHand();await wait(D.HAND_REVEAL_STAGGER_MS)}await wait(300);handFx.fill('normal');uiBusy=false;if(GAME.state().blocked)armOutcomeDelay();render();if(r.autoRerolls)toast(`NO LEGAL MOVES · AUTO REROLL${r.autoRerolls>1?` ×${r.autoRerolls}`:''}`)}

  function rootCamera(){return window.MonoidBoardCamera}
  function recordPerformance(sim,searchMs,animationMs,animationMeta={}){
    const search=sim.search||{},events=(sim.events||[]).filter(event=>['op','signal-fork','rebound','double-echo-start'].includes(event.type)).length,skip=animationMeta.skippedCascade?(animationMeta.skippedSummary?'cascade+summary':'cascade'):animationMeta.skippedSummary?'summary':'none';performanceSamples.push({move:GAME.state().turn,searchMs:Math.round(searchMs),animationMs:Math.round(animationMs),eventsRendered:events,expanded:search.expanded||0,truncated:!!search.truncated,cameraScale:rootCamera()?.snapshot().scale||1,skip});if(!tutorial)PT?.recordCascade(animationMs);while(performanceSamples.length>12)performanceSamples.shift()
  }
  function performanceText(){if(!performanceSamples.length)return'PERFORMANCE TELEMETRY\nNo recorded placements this session.';return`PERFORMANCE TELEMETRY\n${performanceSamples.map(s=>`Move ${s.move}: search ${s.searchMs}ms · animation ${s.animationMs}ms · events ${s.eventsRendered} · expanded ${s.expanded}${s.truncated?' TRUNCATED':''} · zoom ${s.cameraScale.toFixed(2)}x · skip=${s.skip||'none'}`).join('\n')}`}

  Object.defineProperty(window,'__monoidPerformance',{configurable:true,get:()=>performanceSamples.map(sample=>({...sample}))});
  Object.defineProperty(window,'__monoidPlaytest',{configurable:true,get:()=>PT?.snapshot()||null});
  Object.defineProperty(window,'__monoidCascade',{configurable:true,get:()=>({active:cascadeControl.active,phase:cascadeControl.phase,skipCascade:cascadeControl.skipCascade,skipSummary:cascadeControl.skipSummary})});
  function fullDebugText(){return singleRunDebugText(GAME,true)}
  function renderLog(){
    runlog.innerHTML='';runlog.classList.toggle('show',viewRun);if(!viewRun)return;runlog.style.zIndex='610';
    const controls=document.createElement('div');Object.assign(controls.style,{position:'sticky',top:'0',display:'flex',justifyContent:'flex-end',gap:'4px',paddingBottom:'6px',background:'rgba(248,245,237,.98)',zIndex:'2'});
    const copy=document.createElement('button');copy.className='tool';copy.textContent='COPY';copy.onclick=copyRun;
    const close=document.createElement('button');close.className='tool';close.textContent='CLOSE';close.onclick=()=>{viewRun=false;renderLog()};
    const text=document.createElement('textarea');text.className='runDataText';text.readOnly=true;text.value=fullDebugText();Object.assign(text.style,{display:'block',width:'100%',height:'calc(46dvh - 42px)',minHeight:'120px',resize:'none',border:'0',outline:'0',padding:'0',margin:'0',background:'transparent',color:'inherit',font:'inherit',lineHeight:'1.45',whiteSpace:'pre-wrap'});
    controls.append(copy,close);runlog.append(controls,text)
  }
  async function copyRun(){
    persistGame();const batch=await buildPlaytestBatch(),text=batch.text;let ok=false;
    if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(text);ok=true}catch(_){}}
    if(!ok){const ta=document.createElement('textarea');ta.value=text;ta.readOnly=true;Object.assign(ta.style,{position:'fixed',left:'0',top:'0',width:'1px',height:'1px',opacity:'0.01',zIndex:'700'});document.body.appendChild(ta);ta.focus();ta.select();try{ta.setSelectionRange(0,ta.value.length)}catch(_){}try{ok=!!document.execCommand?.('copy')}catch(_){}ta.remove()}
    if(ok){await markBatchShared(batch);toast(`Playtest batch copied · ${batch.runIds.length} run${batch.runIds.length===1?'':'s'}`);return true}
    viewRun=true;renderLog();const ta=runlog.querySelector('.runDataText');if(ta){ta.value=text;ta.focus();ta.select();try{ta.setSelectionRange(0,ta.value.length)}catch(_){}}toast('Copy blocked · batch data selected');return false
  }
  async function downloadRunBatch(){
    persistGame();const batch=await buildPlaytestBatch(),blob=new Blob([batch.text],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`MONOID_PLAYTEST_v${D.VERSION}_${batch.batchId}.txt`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);await markBatchShared(batch);toast(`Playtest batch downloaded · ${batch.runIds.length} run${batch.runIds.length===1?'':'s'}`);return true
  }
  function closeMenu(){gameMenu.close();menuButton.setAttribute('aria-expanded','false')}
  menuButton.onclick=e=>{if(consumeInspectorHoldClick(menuButton,e))return;if(GAME.state().running||uiBusy||drag.active)return;press.cancel();syncRoutePreviewSetting();gameMenu.showModal();menuButton.setAttribute('aria-expanded','true')};$('closeMenu').onclick=closeMenu;gameMenu.onclose=()=>menuButton.setAttribute('aria-expanded','false');gameMenu.onclick=e=>{if(e.target===gameMenu){const r=gameMenu.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeMenu()}};
  $('scoreDetail').onclick=()=>openScoreDetails('score');$('targetDetail').onclick=()=>openScoreDetails('target');
  overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','overlayTitle');
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')pausePlaytest();else resumePlaytest()});window.addEventListener('pagehide',pausePlaytest);
  document.addEventListener('keydown',e=>{if(!overlay.classList.contains('show'))return;if(e.key==='Escape'&&auxOverlay){e.preventDefault();closeAuxOverlay();return}if(e.key==='Tab'){const buttons=[...overlay.querySelectorAll('button:not(:disabled),[tabindex="0"]')].filter(b=>b.getClientRects().length);if(!buttons.length)return;const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&(document.activeElement===first||!overlay.contains(document.activeElement))){e.preventDefault();last.focus()}else if(!e.shiftKey&&(document.activeElement===last||!overlay.contains(document.activeElement))){e.preventDefault();first.focus()}}});
  routePreviewSetting?.querySelectorAll('[data-route-preview]').forEach(button=>button.addEventListener('click',()=>setRoutePreviewMode(button.dataset.routePreview)));
  shopBtn.onclick=openPermanentShop;moveBtn.onclick=activateMove;rerollBtn.onclick=activateReroll;undoBtn.onclick=activateUndo;resetBtn.onclick=()=>{if(uiBusy)return;if(!confirm('Start a new run?'))return;closeMenu();newRun()};helpBtn.onclick=openRulebook;copyBtn.onclick=()=>{closeMenu();copyRun()};viewBtn.onclick=()=>{closeMenu();viewRun=!viewRun;renderLog();if(auxOverlay?.type==='inspector')renderAuxOverlay()};
  bindInspectorHold(titleCard,openMonoidInspector);bindInspectorHold(selectionTitle,openMonoidInspector);bindInspectorHold(menuButton,openMonoidInspector);
  if(selectionTitle){selectionTitle.tabIndex=0;selectionTitle.setAttribute('role','button');selectionTitle.setAttribute('aria-label','MONOID. Tap or press Enter to inspect the definition.');selectionTitle.onclick=e=>{e.preventDefault();e.stopPropagation();openMonoidInspector()};selectionTitle.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openMonoidInspector()}}}
  titleCard.onclick=e=>{if(consumeInspectorHoldClick(titleCard,e))return;e.preventDefault();e.stopPropagation();showSelection()};
  titleCard.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showSelection()}};
  $('learnMonoid').onclick=startTutorial;$('replayTutorial').onclick=startTutorial;$('startRun').onclick=()=>{if(storedState()&&!confirm('Replace the saved run with a new run?'))return;startNormal(false)};continueRun.onclick=()=>startNormal(true);$('modeClassic').onclick=()=>storedState()?startNormal(true):startNormal(false);$('leaveTutorial').onclick=requestTutorialExit;$('gameSelectionButton').onclick=()=>{closeMenu();showSelection()};
  if(localStorage.getItem('iterion.entryBypass.v1')==='true')startNormal(false);else{app.inert=true;render()}
})();
