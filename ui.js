(function(){
  const E=window.IterionEngine,D=window.IterionData,M=window.IterionMods,H=window.IterionHelp,GEST=window.IterionGesture,ARROW=E.ARROW;
  const ACTIVE_MODE_KEY='iterion.activeRunMode.v1';
  const normalizeMode=()=> 'classic';
  const gameOptions=()=>({GAME_MODE:'classic'});
  let GAME=window.IterionGame.createGame(E,gameOptions('classic'));
  const P={0:[],1:[[50,50]],2:[[28,28],[72,72]],3:[[28,28],[50,50],[72,72]],4:[[28,28],[72,28],[28,72],[72,72]],5:[[28,28],[72,28],[50,50],[28,72],[72,72]],6:[[28,23],[72,23],[28,50],[72,50],[28,77],[72,77]]};
  const $=id=>document.getElementById(id);
  const V=window.IterionPresentation,MG=window.MonoidModGuidance,BATCH_STORE=window.MonoidPlaytestBatchStore?.create(),PT=window.MonoidPlaytestTelemetry?.create({storage:localStorage}),gameMenu=$('gameMenu'),menuButton=$('menuButton');
  const app=document.querySelector('.app'),entryFlow=$('entryFlow'),titleCard=$('titleCard'),gameSelection=$('gameSelection'),firstRunChoice=$('firstRunChoice'),continueRun=$('continueRun'),tutorialPanel=$('tutorialPanel'),tutorialStep=$('tutorialStep'),tutorialInstruction=$('tutorialInstruction');
  let returnFocus=null;
  const circuitChoice=$('circuitChoice');
  const board=$('board'),scoreEl=$('score'),targetEl=$('target'),stageEl=$('stagestat'),roundEl=$('roundstat'),movesEl=$('moves'),tilesEl=$('tilesleft'),stageRoundEl=$('stageRound'),boardSizeEl=$('boardsize'),handEl=$('hand'),hint=$('hint'),shopBtn=$('shopButton'),moveBtn=$('moveTool'),rerollBtn=$('reroll'),undoBtn=$('undoTool'),resetBtn=$('reset'),helpBtn=$('helpButton'),viewBtn=$('viewrun'),copyBtn=$('copyrun'),runlog=$('runlog'),toastEl=$('toast'),overlay=$('overlay'),modalEl=overlay.querySelector('.modal'),overlayTitle=$('overlayTitle'),overlayBody=$('overlayBody'),overlayPrimary=$('overlayPrimary'),overlaySecondary=$('overlaySecondary'),overlayTertiary=$('overlayTertiary'),coinEl=$('coins'),versionEl=$('version'),machineModStatusEl=$('machineModStatus');
  let viewRun=false,outcomeOverlayNotBefore=0,outcomeTimer=0,uiBusy=false,auxOverlay=null,shopRevealTile=null;
  const performanceSamples=[];
  let entryState='title',tutorial=null,activeRun=null;
  let handFx=Array(D.HAND_SIZE).fill('normal');
  const MOD_FACE_REVEAL_MS=3000,modFaceRevealUntil=new Map(),modFaceRevealTimers=new Map();
  let drag={active:false,index:-1,tile:null,candidates:[],candidate:null,float:null,lastX:0,lastSign:0,switches:0,shakeStarted:0,lastRotate:0};
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const px=n=>n/E.G*100+'%',py=n=>n/E.H*100+'%';
  const fmt=n=>Number.isFinite(Number(n))?Number(n).toLocaleString('en-US'):`${n}`;
  const compact=V.compact;
  document.title=`NOMON v${D.VERSION}`;versionEl.textContent=`v${D.VERSION} · Classic → Endless → Infinite`;
  H.bindRun(GAME.state().runId);
  Object.defineProperty(window,'__monoidGame',{configurable:true,get:()=>GAME});
  Object.defineProperty(window,'__monoidFlow',{configurable:true,get:()=>({screen:entryState,tutorialStep:tutorial?.step??null})});
  Object.defineProperty(window,'__monoidPlaytestBatch',{configurable:true,get:()=>PT?.batchInfo?.()||null});
  Object.defineProperty(window,'__monoidPlaytestBatchStore',{configurable:true,get:()=>BATCH_STORE||null});
  Object.defineProperty(window,'__monoidSharePlaytestBatch',{configurable:true,value:()=>sharePlaytestBatch()});

  function playtestContext(){const x=GAME.snapshot();return{runId:GAME.state().runId,round:GAME.state().round+1,stage:x.stage.index}}
  function bindPlaytestRun(){if(!PT||tutorial)return;PT.bindRun(playtestContext())}
  function syncPlaytestContext(){if(!PT||tutorial)return;const c=playtestContext();PT.setContext(c.round,c.stage)}
  function armDecisionTiming(){if(!PT||tutorial||entryState!=='game'||document.visibilityState==='hidden'||uiBusy)return;const s=GAME.state();if(!s.running&&!s.shopOpen&&!s.pendingCircuit&&!s.pendingModPlacement&&!s.cleared&&!s.blocked&&GAME.canInteract())PT.startDecision()}
  function resumePlaytest(){if(!PT||tutorial||entryState!=='game'||document.visibilityState==='hidden')return;syncPlaytestContext();PT.resume();armDecisionTiming()}
  function pausePlaytest(){PT?.pause()}
  function storedState(){try{return JSON.parse(localStorage.getItem('iterion.activeRun.v1')||'null')}catch(_){return null}}
  function selectedMode(saved=null){return normalizeMode(saved?.state?.gameMode||localStorage.getItem(ACTIVE_MODE_KEY)||'classic')}
  function persistGame(){if(tutorial)return GAME.snapshot();const snap=GAME.save();try{localStorage.setItem('iterion.activeRun.v1',JSON.stringify(GAME.exportState()))}catch(_){}return snap}
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
    const saved=storedState(),choiceMade=localStorage.getItem('iterion.tutorialChoice.v1')==='made';continueRun.hidden=!saved;firstRunChoice.hidden=choiceMade;$('replayTutorial').hidden=false;$('startRun').textContent=saved?'NEW RUN':choiceMade?'START RUN':'SKIP · START RUN'
  }
  async function startNormal(continueSaved=false){
    clearModFaceReveals();tutorial=null;tutorialPanel.hidden=true;if(!continueSaved)await archiveSavedRun('new-run');const saved=continueSaved?storedState():null,mode=selectedMode(saved),next=window.IterionGame.createGame(E,gameOptions(mode));if(continueSaved&&!next.restoreState(saved))return;
    localStorage.setItem(ACTIVE_MODE_KEY,mode);window.__monoidActiveMode=mode;
    if(continueSaved&&next.state().needsReroll)next.assessContinuation();
    GAME=next;activeRun=GAME;H.bindRun(GAME.state().runId);bindPlaytestRun();localStorage.setItem('iterion.tutorialChoice.v1','made');persistGame();handFx.fill('normal');showGame()
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
    clearModFaceReveals();pausePlaytest();if(!tutorial)activeRun=GAME;tutorial={step:0,exitPending:false};GAME=window.IterionGame.createGame(E,{seed:3100,TARGETS:[1e9],STARTING_COINS:30});prepareTutorialHand('d2-2');H.bindRun(GAME.state().runId);localStorage.setItem('iterion.tutorialChoice.v1','made');handFx.fill('normal');showGame();updateTutorial()
  }
  function leaveTutorial(completed=false){
    clearModFaceReveals();tutorial=null;tutorialPanel.hidden=true;GAME=activeRun||window.IterionGame.createGame(E);activeRun=null;H.bindRun(GAME.state().runId);showSelection();if(completed)toast('Tutorial complete')
  }
  function advanceTutorial(result){
    if(!tutorial)return;const sequence=['d2-3','d3-4','d0-4','d0-0'];
    if(tutorial.step<4){tutorial.step++;if(tutorial.step===4)GAME.config.TARGETS[0]=0;prepareTutorialHand(tutorial.step===4?'d4-4':sequence[tutorial.step-1]);updateTutorial();return}
    if(tutorial.step===4&&result.cleared){tutorial.step=5;tutorialInstruction.textContent=tutorialCopy[5];tutorialStep.textContent='LEARN MONOID · 6/6';tutorialPanel.hidden=false;GAME.state().cleared=false;GAME.openShop()}
  }
  function cancelTutorialDrag(){if(!drag.active)return;press.cancel();drag.float?.remove();drag={active:false,index:-1,tile:null,candidates:[],candidate:null,float:null};renderBoard();renderHand()}
  function requestTutorialExit(){if(!tutorial)return;if(drag.active)cancelTutorialDrag();if(uiBusy||GAME.state().running){tutorial.exitPending=true;$('leaveTutorial').disabled=true;return}leaveTutorial(false)}

  function dots(n,s=false){return P[n].map(([x,y])=>`<i class="${s?'spip':'pip'}" style="left:${x}%;top:${y}%"></i>`).join('')}
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
  function circuitInspectorHtml(c){return c?`<section class="inspectSection"><div class="inspectLabel">Circuit</div><strong>RANK ${c.roman} · ${c.color.toUpperCase()}</strong><p>Resonance: +${c.bonus*100}%<br>Activates once per Move.</p></section>`:''}
  function powerInspectorHtml(power){return power?`<section class="inspectSection"><div class="inspectLabel">POWER SET</div><strong>SET ${power.generation} · ×${power.powerMultiplier}</strong><p>Printed values, matching and parity stay unchanged. Scoring operations use ×${power.powerMultiplier} magnitude.</p></section>`:''}
  function upgradeDot(t){const tier=tierFor(t);return tier?`<i class="upgradeDot u${tier}" aria-hidden="true"></i>`:''}
  function tileModMarks(t){const marks=tileView(t).modifiers;return marks.map((mark,i)=>`<i class="tileModMark ${mark.className}" style="--mod-offset:${i-(marks.length-1)/2};--mod-shift:${(i-(marks.length-1)/2)*5}px" aria-hidden="true"><span>${mark.label[0]}</span><span>${mark.label[1]}</span></i>`).join('')}
  function mini(t,fx='normal',compact=false){const cls=(fx==='back'?' back':fx==='reveal'?' reveal':'')+(compact?' compactPreview':''),mark=fx==='back'?'':upgradeDot(t)+tileModMarks(t)+circuitMark(t)+powerMark(t);return`<div class="domino${cls}${powerClass(t)}${circuitClass(t)}${modClass(t)}"><div class="half${t?.a===0?' zeroEndpoint':''}"><div class="spips">${dots(t?.a??0,true)}</div></div><div class="half${t?.b===0?' zeroEndpoint':''}"><div class="spips">${dots(t?.b??0,true)}</div></div>${mark}</div>`}
  function marketTileHtml(t,label=''){return`<span class="marketTile" aria-label="Domino ${t.a}|${t.b}${label?` · ${label}`:''}">${mini(t,'normal',true)}${label?`<small>${escapeHtml(label)}</small>`:''}</span>`}
  function renderMachineModStatus(model){machineModStatusEl.hidden=!model.visible;if(!model.visible){machineModStatusEl.innerHTML='';return}machineModStatusEl.innerHTML=`<span>LONG CHAIN</span><i><b style="width:${model.ratio*100}%"></b></i>`;machineModStatusEl.setAttribute('aria-label',model.ariaLabel)}
  function ordered(p){return[...p.cubes].sort((a,b)=>p.axis==='H'?a.x-b.x:a.y-b.y)}
  function pieceEl(p,cls='piece'){const d=document.createElement('div'),revealed=tileView(p.tile).modifiers.length>0&&modFaceRevealed(p.tile.id);d.className=cls+' '+(p.axis==='H'?'h':'v')+powerClass(p.tile)+circuitClass(p.tile)+(revealed?' modFaceRevealed':modClass(p.tile));d.dataset.tileId=p.tile.id;d.style.left=px(p.rect.minx);d.style.top=py(p.rect.miny);d.style.width=px(p.rect.maxx-p.rect.minx);d.style.height=py(p.rect.maxy-p.rect.miny);d.innerHTML=ordered(p).map(c=>`<div class="cube${c.v===0?' zeroEndpoint':''}"><div class="pips">${dots(c.v)}</div></div>`).join('')+upgradeDot(p.tile)+(revealed?'':tileModMarks(p.tile))+circuitMark(p.tile)+powerMark(p.tile);return d}
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

  function beginTilePress(e,meta){
    if(GAME.state().pendingCircuit||GAME.state().pendingModPlacement||auxOverlay||e.button!=null&&e.button!==0)return;
    e.preventDefault();press.begin(e,meta)
  }
  function renderBoard(){
    const s=GAME.state();board.innerHTML='';board.style.setProperty('--cell-x',`${100/E.G}%`);board.style.setProperty('--cell-y',`${100/E.H}%`);board.style.backgroundImage='none';board.style.backgroundColor='';addBoardCenterTicks();
    s.pieces.forEach(p=>{
      const el=pieceEl(p),circuitPending=s.pendingCircuit,modPending=s.pendingModPlacement,pending=circuitPending||modPending,eligible=!!pending?.eligibleTileIds?.includes(p.tile.id),power=powerMultiplier(p.tile),modded=tileView(p.tile).modifiers.length>0;
      el.classList.add('inspectable');el.setAttribute('role','button');
      el.setAttribute('aria-label',pending?`Choose domino ${p.tile.a}|${p.tile.b}${power>1?` · POWER ×${power}`:''}${circuitRank(p.tile)?` · Circuit rank ${D.CIRCUIT_RANKS[circuitRank(p.tile)-1].roman}`:''}`:`Domino ${p.tile.a}|${p.tile.b}${power>1?` · POWER ×${power}`:''}${circuitRank(p.tile)?` · Circuit rank ${D.CIRCUIT_RANKS[circuitRank(p.tile)-1].roman}`:''}.${modded?' Tap to reveal values.':''} Hold to inspect.`);
      if(pending){
        const member=circuitPending?circuitPending.tileIds.includes(p.tile.id):eligible;
        el.classList.toggle('circuitMember',!!member);el.classList.toggle('circuitEligible',eligible);el.classList.toggle('circuitDim',circuitPending?!member:!eligible);
        el.tabIndex=eligible?0:-1;el.setAttribute('aria-disabled',eligible?'false':'true');
        const kind=circuitPending?'circuit':'mod-target',choose=circuitPending?chooseCircuitTile:chooseMarketModTile;
        el.onpointerdown=e=>{if(!eligible||auxOverlay||uiBusy||e.button!=null&&e.button!==0)return;e.preventDefault();press.begin(e,{kind,tileId:p.tile.id,allowDrag:false})};
        el.onkeydown=e=>{if(eligible&&!auxOverlay&&!uiBusy&&(e.key==='Enter'||e.key===' ')){e.preventDefault();choose(p.tile.id)}};
      }else el.onpointerdown=e=>beginTilePress(e,{kind:'board',tileId:p.tile.id,allowDrag:false});
      board.appendChild(el)
    });
    if(drag.active&&drag.candidate){const c=drag.candidate,p=E.pieceFrom(drag.tile,c.x,c.y,0,c.rr,-1);p.tile={...drag.tile};board.appendChild(pieceEl(p,'piece dragCandidate'))}
    board.classList.toggle('dragging',drag.active)
  }
  function renderHand(){
    const s=GAME.state();handEl.innerHTML='';
    const canGrade=!s.pendingCircuit&&!s.pendingModPlacement&&!uiBusy&&!s.running&&!s.cleared&&!s.blocked&&!s.shopOpen&&!s.needsReroll;
    const mask=canGrade?GAME.legalHandMask():s.hand.map(Boolean);
    for(let i=0;i<s.hand.length;i++){
      const t=s.hand[i],slot=document.createElement('div');slot.className='handSlot';
      if(handFx[i]==='hidden'||(drag.active&&drag.index===i)){handEl.appendChild(slot);continue}
      if(handFx[i]==='back'){const shell=document.createElement('div');shell.innerHTML=mini(t||{a:0,b:0},'back');slot.appendChild(shell.firstChild);handEl.appendChild(slot);continue}
      if(t){const power=powerMultiplier(t),b=document.createElement('button');b.className='tile'+(mask[i]?'':' unplayable');b.disabled=uiBusy||!!s.pendingCircuit||!!s.pendingModPlacement;b.setAttribute('aria-disabled',b.disabled?'true':'false');b.setAttribute('aria-label',`Domino ${t.a}|${t.b}.${power>1?` POWER ×${power}.`:''}${mask[i]?'':' No legal placement.'} Hold to inspect.`);b.innerHTML=mini(t,handFx[i]);b.onpointerdown=e=>beginTilePress(e,{kind:'hand',index:i,tileId:t.id,allowDrag:true});slot.appendChild(b)}
      handEl.appendChild(slot)
    }
  }

  function hideOverlay(){overlay.className='overlay';modalEl.classList.remove('auxModal','commerceModal');overlay.onclick=null}
  function resetOverlay(){overlay.className='overlay show';modalEl.classList.remove('auxModal','commerceModal');overlay.onclick=null;overlayPrimary.onclick=overlaySecondary.onclick=overlayTertiary.onclick=null;overlayPrimary.disabled=overlaySecondary.disabled=overlayTertiary.disabled=false;overlayPrimary.style.display='inline-block';overlaySecondary.style.display=overlayTertiary.style.display='none'}
  function clearOutcomeDelay(){outcomeOverlayNotBefore=0;if(outcomeTimer){clearTimeout(outcomeTimer);outcomeTimer=0}}
  function armOutcomeDelay(){clearOutcomeDelay();outcomeOverlayNotBefore=performance.now()+D.OUTCOME_SCREEN_DELAY_MS;outcomeTimer=setTimeout(()=>{outcomeTimer=0;render()},D.OUTCOME_SCREEN_DELAY_MS+25)}
  async function newRun(){pausePlaytest();await archiveSavedRun('new-run');clearOutcomeDelay();auxOverlay=null;shopRevealTile=null;press.cancel();clearModFaceReveals();GAME.fresh();H.bindRun(GAME.state().runId);bindPlaytestRun();persistGame();handFx.fill('normal');hideOverlay();render();resumePlaytest()}
  function setNewRunButton(b){b.style.display='inline-block';b.textContent='NEW RUN';b.onclick=()=>{if(confirm('Start a new run?'))newRun()}}
  function useUndo(){const r=GAME.useUndo();if(!r.ok){toast('Undo unavailable');return}clearOutcomeDelay();persistGame();handFx.fill('normal');hideOverlay();toast(r.preservedPurchases?`Last move undone · ${r.preservedPurchases} purchase${r.preservedPurchases===1?'':'s'} kept`:'Last move undone');render();armDecisionTiming()}
  function useMove(){const r=GAME.useMove();if(!r.ok){toast('Move unavailable');return}clearOutcomeDelay();persistGame();hideOverlay();toast(`+1 Move · ${r.maxPlacements} max`);render();armDecisionTiming()}
  function openPermanentShop(){shopRevealTile=null;if(!GAME.openShop()){toast('Tile Shop unavailable');return}persistGame();render()}
  function openToolPurchase(id){
    if(!GAME.canBuyTool(id)){toast(`${M.get(id)?.name||'Tool'} purchase unavailable`);return}
    returnFocus=id==='move'?moveBtn:id==='reroll'?rerollBtn:undoBtn;press.cancel();auxOverlay={type:'tool-buy',id,quantity:1};renderAuxOverlay()
  }
  function activateMove(){if(GAME.canUseMove())useMove();else if(GAME.canBuyTool('move'))openToolPurchase('move');else toast('Move unavailable')}
  function activateUndo(){if(GAME.canUndo())useUndo();else if(GAME.canBuyTool('undo'))openToolPurchase('undo');else toast('Undo unavailable')}
  function activateReroll(){if(GAME.canUseReroll())doReroll();else if(GAME.canBuyTool('reroll'))openToolPurchase('reroll');else toast('Reroll unavailable')}

  function escapeHtml(value){return`${value}`.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
  function ruleVisual(section){return section.visual?`<div class="ruleVisual">${escapeHtml(section.visual)}</div>`:''}
  function closeAuxOverlay(){auxOverlay=null;render();(returnFocus?.isConnected?returnFocus:helpBtn).focus();returnFocus=null}
  function openScoreDetails(kind){if(GAME.state().running||uiBusy||drag.active)return;returnFocus=document.activeElement;press.cancel();auxOverlay={type:'score',kind};renderAuxOverlay()}
  function renderScoreDetails(){const s=GAME.state(),isTarget=auxOverlay.kind==='target',target=GAME.target(),value=isTarget?target:s.score,display=V.scoreDisplay(s.score,target),multiplier=!isTarget&&s.score>=target?`<p class="scoreMultiplierDetail${display.overdrive?' overdrive':''}">TARGET ×${escapeHtml(display.multiplier)}</p>`:'';overlayTitle.textContent=isTarget?'TARGET':'SCORE';overlayBody.innerHTML=`<div class="scoreExact${!isTarget&&display.overdrive?' overdrive':''}">${escapeHtml(V.exact(value))}</div>${multiplier}<p>${isTarget?'Reach or exceed this value to clear the round.':'Result of the last Move, including Echo and Circuit Resonance. It is not a running total.'}</p><p>K = thousand · M = million<br>B = billion · T = trillion</p>`;overlayPrimary.textContent='CLOSE';overlayPrimary.onclick=closeAuxOverlay}
  function renderToolPurchase(){
    const id=auxOverlay.id,m=M.get(id),qty=Math.max(1,auxOverlay.quantity||1),quote=GAME.toolPurchaseQuote(id,qty),next=GAME.toolPurchaseQuote(id,qty+1),name=(m?.displayName||m?.name||id).toUpperCase();
    overlayTitle.textContent=`BUY ${name}`;
    overlayBody.innerHTML=`<div class="toolPurchase"><p>Buy stored ${escapeHtml(m?.name||id)} directly from the gameplay controls.</p><div class="toolPurchaseRow"><div class="toolQuantityValue" aria-label="Quantity">${qty}</div><div class="toolQuantityArrows"><button type="button" data-tool-qty="up" aria-label="Increase quantity">↑</button><button type="button" data-tool-qty="down" aria-label="Decrease quantity" ${qty<=1?'disabled':''}>↓</button></div><div class="toolPurchaseTotal"><span>TOTAL</span><strong>${quote.total}c</strong><small>Inflation ${quote.inflationBefore} → ${quote.inflationAfter}${quote.systemStrain?` · Strain ${quote.systemStrain}`:''}</small></div></div></div>`;
    const up=overlayBody.querySelector('[data-tool-qty="up"]'),down=overlayBody.querySelector('[data-tool-qty="down"]');up.disabled=!next.canAfford;up.onclick=()=>{auxOverlay.quantity=qty+1;renderAuxOverlay()};down.onclick=()=>{auxOverlay.quantity=Math.max(1,qty-1);renderAuxOverlay()};
    overlayPrimary.textContent=`BUY ${qty} · ${quote.total}c`;overlayPrimary.disabled=!quote.canAfford;overlayPrimary.onclick=()=>{const r=GAME.buyTool(id,qty);if(!r.ok){toast(r.reason==='coins'?'Not enough coins':'Purchase unavailable');renderAuxOverlay();return}persistGame();auxOverlay=null;toast(`${m?.name||id} ×${r.quantity} stored · Inflation ${r.inflation}`);render()};
    overlaySecondary.style.display='inline-block';overlaySecondary.textContent='CANCEL';overlaySecondary.onclick=closeAuxOverlay
  }
  function openRulebook(){H.bindRun(GAME.state().runId);H.recordRulebookOpen();auxOverlay={type:'rulebook',sectionId:null};renderAuxOverlay()}
  function openRulebookSection(id){H.recordSectionOpen(id);auxOverlay={type:'rulebook',sectionId:id};renderAuxOverlay()}
  function operationLabel(op){if(op.type==='add')return`+${op.add}`;if(op.type==='multiply')return`×${op.factor}`;if(op.type==='zero')return'0 · rebound';return'—'}
  function openTileInspector(tileId){const model=H.inspectTile(GAME.state(),tileId);if(!model)return;auxOverlay={type:'inspector',tileId,model};renderAuxOverlay()}
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
  function renderInspector(){
    const state=GAME.state(),model=H.inspectTile(state,auxOverlay.tileId)||auxOverlay.model,b=model.baseTile,m=model.currentMachineState;
    auxOverlay.model=model;overlayTitle.textContent=`[${b.a}|${b.b}]`;
    const properties=[b.isDouble?'Double':'Standard domino',b.containsZero?'Contains zero':null,model.power?`POWER ×${model.power.powerMultiplier}`:null].filter(Boolean).join(' · ');
    const debugId=viewRun?`<div class="inspectDebug">ID ${escapeHtml(b.id)}</div>`:'';
    const modifierHtml=model.modifiers.length?model.modifiers.map(mod=>modifierGuideHtml(mod)).join(''):'<p class="inspectEmpty">No modifier is attached to this physical tile.</p>';
    const starLabel=m.upgradeTier?`★${m.upgradeTier} · can pay +${m.starCoins}c when activated`:'No stars · +0c';
    const bestLabel=`Best Score with this tile: ${m.bestOutput==null?'—':fmt(m.bestOutput)}`,longRun=model.machineModifiers.find(mod=>mod.id==='long-run');
    const longRunState=state.endlessMode?`LONG CHAIN · ${Math.max(0,(D.ENDLESS_LONG_RUN_ACTIVATIONS||7)-(state.endlessLongRunActivations||0))}/${D.ENDLESS_LONG_RUN_ACTIVATIONS||7} Endless activations remaining.`:'LONG CHAIN · at 10+ unique routed tiles, every activated star pays once.';
    const foundationState=m.foundationAge==null?null:`FOUNDATION · ${m.foundationAge} Market${m.foundationAge===1?'':'s'} survived · ${m.foundationAge>=3?'×3':m.foundationAge>=1?'×2':'dormant'}`,mintState=m.mintAvailable==null?null:`MINT · ${m.mintAvailable?'ready this round':'already paid this round'}`;
    const stateRows=[starLabel,bestLabel,`Recorded Move activations: ${m.activations||0}`,foundationState,mintState,longRun?longRunState:m.upgradeTier?'Normal star rule · only the highest activated tier pays.':'Round-clearing overkill can add stars to this physical tile.'].filter(Boolean);
    overlayBody.innerHTML=`<div class="inspector"><section class="inspectSection"><div class="inspectLabel">Base Tile</div><div class="inspectHero"><strong>[${b.a}|${b.b}]</strong><span>${escapeHtml(properties)}</span></div>${debugId}<div class="opPair"><span>${b.a}: ${operationLabel(b.operations[0])}</span><span>${b.b}: ${operationLabel(b.operations[1])}</span></div></section>${powerInspectorHtml(model.power)}${circuitInspectorHtml(model.circuit)}<section class="inspectSection"><div class="inspectLabel">Modifiers</div>${modifierHtml}</section><section class="inspectSection"><div class="inspectLabel">Current Machine State</div><div class="stateRows">${stateRows.map(row=>`<span>${escapeHtml(row)}</span>`).join('')}</div></section></div>`;
    overlayPrimary.textContent='CLOSE';overlayPrimary.onclick=closeAuxOverlay
  }
  function renderAuxOverlay(){
    if(!auxOverlay)return;resetOverlay();overlay.classList.add('aux');modalEl.classList.add('auxModal');overlay.onclick=e=>{if(e.target===overlay)closeAuxOverlay()};
    if(auxOverlay.type==='rulebook')renderRulebook();else if(auxOverlay.type==='score')renderScoreDetails();else if(auxOverlay.type==='tool-buy')renderToolPurchase();else renderInspector();
    if(!overlay.contains(document.activeElement)){if(!returnFocus)returnFocus=document.activeElement;overlayPrimary.focus()}
  }

  function runSummary(){
    const state=GAME.state(),x=GAME.snapshot(),turns=x.turns.filter(e=>Number.isInteger(e.turn)),mvp=turns.reduce((b,e)=>!b||e.output>b.output?e:b,null);let addOps=0,multOps=0,rebounds=0;
    for(const e of turns){addOps+=(e.ops.match(/:\+/g)||[]).length;multOps+=(e.ops.match(/:×/g)||[]).length;rebounds+=e.rebounds||0}
    return{roundsCleared:x.round.clears.length,totalRounds:x.round.total,tilesPlayed:x.turnCount,bestOutput:x.score.best,mvpTile:mvp?{a:mvp.tile.a,b:mvp.tile.b,output:mvp.output,round:mvp.round,placement:mvp.roundTurn}:null,addOps,multOps,rebounds,rerolls:x.turns.filter(e=>e.type==='reroll').length,purchases:x.turns.filter(e=>e.type==='shop-buy'||e.type==='tile-buy'||e.type==='double-double'||e.type==='market-mod-buy').length,coins:x.coins,inflation:x.inflation,systemStrain:state.systemStrain||0,longRunActivations:state.endlessLongRunActivations||0,consumables:x.consumables,setSize:x.setSize,setGeneration:x.powerSets?.generation||1,machine:x.board.length,endless:x.endless}
  }
  function summaryHtml(){const r=runSummary(),m=r.mvpTile;return`<div class="summary"><div class="sumCard wide"><div class="sumLabel">MVP TILE</div><div class="sumValue">${m?`[${m.a}|${m.b}] → ${fmt(m.output)}`:'—'}</div><div class="sumSmall">${m?`Best activation · Round ${m.round}, move ${m.placement}`:'No placement yet'}</div></div><div class="sumCard"><div class="sumLabel">PROGRESS</div><div class="sumValue">${r.endless?.active?`${D.TOTAL_ROUNDS}/${D.TOTAL_ROUNDS} + ${r.endless.roundsCleared}`:`${r.roundsCleared}/${r.totalRounds}`}</div><div class="sumSmall">${r.endless?.active?'Base complete · Endless clears':'Rounds cleared'}</div></div><div class="sumCard"><div class="sumLabel">MACHINE</div><div class="sumValue">${r.machine}</div><div class="sumSmall">${r.setSize} tiles · Set ${r.setGeneration}</div></div><div class="sumCard wide"><div class="sumLabel">SCORE SOURCES</div><div class="sumValue">${r.multOps} multipliers · ${r.addOps} additions</div><div class="sumSmall">${r.rebounds} rebounds · Best ${fmt(r.bestOutput)}</div></div><div class="sumCard wide"><div class="sumLabel">ECONOMY</div><div class="sumValue">${r.coins} coins · Inflation ${r.inflation}${r.endless?.active?` · Strain ${r.systemStrain}`:''}</div><div class="sumSmall">Move ${r.consumables.move} · Reroll ${r.consumables.reroll} · Undo ${r.consumables.undo} · ${r.purchases} purchases${r.endless?.active?` · Long Chain ${r.longRunActivations}/${D.ENDLESS_LONG_RUN_ACTIVATIONS||7}`:''}</div></div></div>`}

  function advanceRound(){
    const before=GAME.snapshot().stage.index;clearOutcomeDelay();const ok=GAME.advance();if(!ok){toast('Resolve Market first');return}
    syncPlaytestContext();persistGame();hideOverlay();handFx.fill('normal');render();armDecisionTiming();const after=GAME.snapshot().stage.index;toast(after>before?`STAGE ${after} · FREE REROLL · BOARD ${E.G}×${E.H}`:`ROUND ${GAME.state().round+1} · FREE REROLL`)
  }
  function startEndless(){clearOutcomeDelay();if(!GAME.startEndless()){toast('Endless unavailable');return}syncPlaytestContext();if(GAME.state().shopOpen&&GAME.state().shopType==='market')PT?.openMarket({offers:[...GAME.state().shopOffers]});persistGame();hideOverlay();handFx.fill('normal');render();armDecisionTiming();toast(GAME.state().shopOpen?'ENDLESS · STAGE MARKET':`ENDLESS · ROUND ${GAME.state().round+1}`)}
  function showClear(){
    resetOverlay();const s=GAME.state(),x=GAME.snapshot(),complete=x.status==='COMPLETE',endless=!!x.endless?.active,last=s.wins[s.wins.length-1],target=GAME.target(),display=V.scoreDisplay(s.score,target),scoreHero=`<div class="roundClearScore${display.overdrive?' overdrive':''}"><small>SCORE</small><strong>${escapeHtml(fmt(s.score))}</strong><span>TARGET ×${escapeHtml(display.multiplier)}</span></div>`;
    overlayTitle.textContent=complete?'RUN COMPLETE':endless?'ENDLESS ROUND CLEAR':'ROUND CLEAR';
    overlayBody.innerHTML=complete?`${scoreHero}<p>Base run complete · Target ${fmt(target)}</p>${summaryHtml()}<p class="shopFoot">Continue with the same machine. Endless Targets scale ×${D.ENDLESS_TARGET_MULTIPLIER||5} every round; the completed base run remains recorded.</p>`:`${scoreHero}<p>Target ${fmt(target)}<br>Clear +${last?.reward||0}c${last?.upgradeCoins?` · ★ activations +${last.upgradeCoins}c`:''}</p>`;
    if(complete){overlayPrimary.textContent='CONTINUE · ENDLESS';overlayPrimary.onclick=startEndless;overlaySecondary.style.display='inline-block';overlaySecondary.textContent='COPY RUN DATA';overlaySecondary.onclick=copyRun;setNewRunButton(overlayTertiary);return}
    const next=s.nextShopType;overlayPrimary.textContent=next==='market'?'MARKET':endless?'NEXT ENDLESS ROUND':'NEXT ROUND';overlayPrimary.onclick=()=>{if(next==='none'){advanceRound();return}if(GAME.openIntermission()){PT?.openMarket({offers:[...GAME.state().shopOffers]});persistGame();render()}else toast('Unavailable')};
    if(GAME.canUndo()){overlaySecondary.style.display='inline-block';overlaySecondary.textContent=`UNDO · ${s.consumables.undo}`;overlaySecondary.onclick=useUndo}
  }
  function showShop(){
    resetOverlay();const s=GAME.state(),x=GAME.snapshot(),randomCost=GAME.shopRandomPrice(),tileOffers=x.shop?.tileOffers||[],offerGeneration=x.shop?.tileOfferGeneration||Math.max(2,(s.setGeneration||1)+1),offerPower=tileOffers[0]?.tile?.powerMultiplier||1,strain=s.systemStrain||0;overlayTitle.textContent='TILE SHOP';modalEl.classList.add('commerceModal');
    const randomPreview=shopRevealTile?mini(shopRevealTile,'reveal',true):mini({a:0,b:0},'back',true);
    const tileOfferHtml=tileOffers.length?tileOffers.map(info=>{const t=info.tile;return `<div class="shopTileOffer"><div class="shopTileOfferTile">${marketTileHtml(t,`×${t.powerMultiplier||1}`)}</div><strong>[${t.a}|${t.b}]</strong><button class="shopBuy" data-shop-tile-offer="${t.id}" ${s.coins<info.price?'disabled':''}>BUY · ${info.price}c</button></div>`}).join(''):'<p class="inspectEmpty">No unclaimed tiles remain in the next set.</p>';
    overlayBody.innerHTML=`<div class="bigShop"><div class="shopHero"><div><div class="label">Always available</div><strong>${s.coins}c</strong><div class="shopInflation">Inflation ${s.inflation}${x.endless?.active?` · System Strain ${strain}`:''}</div></div><div class="label">Supply<br>${x.availableTileCount} tiles</div></div><div class="shopSection"><div class="randomOffer"><div class="randomTilePreview" aria-label="${shopRevealTile?`Revealed domino ${shopRevealTile.a}|${shopRevealTile.b}`:'Hidden random domino'}">${randomPreview}</div><div><h3>RANDOM DOMINO · NEXT SET ×${offerPower}</h3><p>Add one random new physical domino to the current set. It comes from Set ${offerGeneration}; visible Shop offers are reserved and cannot be drawn by Random.</p></div><button id="shopRandomBuy" class="shopBuy">BUY RANDOM TILE · ${randomCost}c</button></div></div><div class="shopSection"><h3>NEXT SET · CHOOSE A TILE</h3><p>Four seeded offers from Set ${offerGeneration}. Buying one gives you that exact physical tile now and removes it from the set when it later unlocks.</p><div class="shopTileOfferGrid">${tileOfferHtml}</div></div><div class="shopFoot">Tile Shop only sells physical dominoes. Random costs ${D.SHOP_RANDOM_TILE_COST||1}c base; choosing a visible tile costs ${D.SHOP_TILE_OFFER_COST||2}c base. Every purchase raises global Inflation by 1, including future Market prices.${x.endless?.active?' Every Endless placement adds +1 System Strain to all prices; Undo removes that placement’s Strain.':''}</div></div>`;
    const random=$('shopRandomBuy');random.disabled=s.coins<randomCost;random.onclick=()=>{const r=GAME.buyShopRandomTile();if(!r.ok){toast(r.reason==='no-tiles'?'No random next-set tiles remain':'Not enough coins');return}shopRevealTile=r.tile;persistGame();toast(`[${r.tile.a}|${r.tile.b}]${r.tile.powerMultiplier>1?` ×${r.tile.powerMultiplier}`:''} → ${r.delivery} · Inflation ${r.inflation}`);render()};
    overlayBody.querySelectorAll('[data-shop-tile-offer]').forEach(b=>{b.onclick=()=>{const r=GAME.buyShopTileOffer(b.dataset.shopTileOffer);if(!r.ok){toast(r.reason==='coins'?'Not enough coins':'Tile unavailable');return}persistGame();toast(`[${r.tile.a}|${r.tile.b}] ×${r.tile.powerMultiplier||1} → ${r.delivery} · Inflation ${r.inflation}`);render()}});
    if(tutorial?.step===5){
      const intro=document.createElement('p');intro.className='marketIntro';intro.innerHTML='<strong>This is the real Tile Shop.</strong> It sells physical dominoes during a round. Market appears only between stages and offers lasting machine changes.';overlayBody.prepend(intro);
      overlayPrimary.textContent='FINISH';overlayPrimary.onclick=()=>{GAME.closeShop();hideOverlay();leaveTutorial(true)};overlaySecondary.style.display='inline-block';overlaySecondary.textContent='TRY AGAIN';overlaySecondary.onclick=()=>{GAME.closeShop();hideOverlay();startTutorial()};return
    }
    overlayPrimary.textContent='CLOSE TILE SHOP';overlayPrimary.onclick=()=>{shopRevealTile=null;GAME.closeShop();persistGame();render()}
  }
  function showMarket(){
    resetOverlay();const s=GAME.state(),x=GAME.snapshot(),nextStage=x.stage.index+1,nextSize=GAME.boardSizeForStage(nextStage-1),strain=s.systemStrain||0;overlayTitle.textContent='MARKET';modalEl.classList.add('commerceModal');
    const supply=x.availableTileCount,nextMarket=x.endless?.active?`Next Market in ${D.STAGE_SIZE||3} rounds`:x.round.index<D.TOTAL_ROUNDS-(D.STAGE_SIZE||3)?`Next Market in ${D.STAGE_SIZE||3} rounds`:'Final stage · no later Market',offers=s.shopOffers.map(id=>GAME.marketOfferInfo(id)),tileById=id=>s.set.find(t=>t.id===id);
    const labels={'double-double':'DD','double-echo':'DE','triple-double':'TD','zero-port':'ZP','parity-exchange':'PX','corner':'CR','long-line':'LN','overload':'OV','terminal':'TE','sequence':'SQ','complement':'C6','twin':'TW','pair':'PR','bridge':'BR','gate':'GT','fan':'FN','frame':'FM','crown':'CW','frontier':'FT','relay':'RL','coupler':'CP','resonator':'RS','forge':'FG','foundation':'FD','knot':'KN','mirror':'MR','mint':'MT'},assignments=[];
    for(const [id,ids] of Object.entries(x.tileMods||{}))for(const tileId of ids||[]){const tile=tileById(tileId);if(tile)assignments.push([labels[id]||id.toUpperCase(),tile])}
    const assignedHtml=assignments.length?`<div class="marketAssignments"><div class="marketChoiceTitle">INSTALLED</div><div class="marketTileList">${assignments.map(([label,tile])=>marketTileHtml(tile,label)).join('')}</div></div>`:'';
    overlayBody.innerHTML=`<div class="bigShop"><div class="shopHero"><div><div class="label">Stage ${x.stage.index} complete</div><strong>${s.coins}c</strong><div class="shopInflation">Inflation ${s.inflation}${x.endless?.active?` · System Strain ${strain}`:''}</div><div class="shopSupply">SUPPLY ${supply} · ${nextMarket}</div></div><div class="label">Next board<br>${nextSize[0]} × ${nextSize[1]}</div></div>${assignedHtml}<div class="marketChoiceTitle">CHOOSE ONE</div><div class="marketOfferGrid">${offers.length?offers.map(info=>{const mod=info.mod,noTarget=info.targetCount<1,assigned=info.assignedTileIds||[],relocate=info.id==='zero-port'?assigned.length===2:assigned.length>0,label=noTarget?'NO VALID TARGET':`${relocate?'RELOCATE':'BUY'} · ${info.price}c`,target=mod.target==='machine'?'Machine modifier':`${info.targetCount} compatible physical tile${info.targetCount===1?'':'s'}`;return `<section class="marketOffer" data-market-offer="${info.id}"><div class="marketOfferHead"><strong>${escapeHtml(mod.displayName||mod.name)}</strong><span>${info.price}c</span></div><p>${escapeHtml(mod.shortDescription||mod.description)}</p><div class="marketTarget ${noTarget?'invalid':''}">${escapeHtml(target)}</div><button class="shopBuy" data-market-mod="${info.id}" ${noTarget||s.coins<info.price?'disabled':''}>${label}</button></section>`}).join(''):'<p class="inspectEmpty">No valid Market mods for the current machine.</p>'}</div><div class="shopFoot">Buy one Mod or continue. Tile Mods close the Market, then you choose a highlighted physical tile on the board. Each physical tile can hold one Tile Mod. ZP uses one slot on each endpoint and links two zero tiles; once paired, a later ZP purchase relocates one endpoint. Every purchase raises global Inflation by 1.${x.endless?.active?' Endless System Strain also applies to Market prices.':''}</div></div>`;
    overlayBody.querySelectorAll('[data-market-mod]').forEach(b=>{b.onclick=()=>{const id=b.dataset.marketMod,r=GAME.buyMarketMod(id),mod=M.get(id);if(!r.ok){toast(r.reason==='coins'?'Not enough coins':r.reason==='no-target'?'No valid target':'Market choice locked');return}if(!r.pending)PT?.closeMarket({outcome:`buy:${id}`});persistGame();if(r.pending)toast(r.stage==='source'?`${mod.displayName||mod.name} · CHOOSE PORT TO MOVE`:`${mod.displayName||mod.name} · CHOOSE A TILE`);else toast(`${mod.displayName||mod.name} installed`);render()}});
    overlayPrimary.textContent=`CONTINUE TO STAGE ${nextStage}`;overlayPrimary.onclick=()=>{GAME.closeMarket();PT?.closeMarket({outcome:'continue'});persistGame();advanceRound()}
  }

  function showFailed(){
    resetOverlay();const s=GAME.state(),x=GAME.snapshot(),endless=!!x.endless?.active,noTiles=s.failureReason==='no-tiles',limit=s.failureReason==='placement-limit',noLegal=s.failureReason==='no-legal-moves',recovery=GAME.recoveryOptions(),stalled=!noLegal&&!!recovery.recoverable;
    overlayTitle.textContent=stalled?(limit?'ROUND STALLED':'MACHINE STALLED'):endless?'ENDLESS OVER':noTiles?'SUPPLY ERROR':'ROUND FAILED';
    if(!stalled)PT?.finalizeCurrent(s.standardComplete?'completed':'failed',{reason:s.failureReason||'run-ended'});
    const reason=noTiles?'The automatic POWER set could not be generated. Download the run file so this can be diagnosed.':limit?(stalled?'You used every move, but a stored or purchased Move can continue this round.':'You used every move for this round.'):noLegal?'No legal continuation remains after all available Rerolls were used.':'No legal continuation remains.';
    overlayBody.innerHTML=`<p>${endless?`Base run complete · Endless reached Round ${s.round+1}.<br>`:''}${reason}</p>${summaryHtml()}<button id="downloadFailedRun" class="shopBuy secondary">DOWNLOAD RUN .TXT</button>`;
    overlayBody.querySelector('#downloadFailedRun').onclick=downloadRunBatch;
    let slot=0,buttons=[overlayPrimary,overlaySecondary,overlayTertiary];
    if(noTiles&&GAME.canOpenShop()&&recovery.shopRescue){const b=buttons[slot++];b.style.display='inline-block';b.textContent='TILE SHOP';b.onclick=openPermanentShop}
    if(limit&&GAME.canUseMove()){const b=buttons[slot++];b.style.display='inline-block';b.textContent=`+1 MOVE · ${s.consumables.move}`;b.onclick=useMove}
    else if(limit&&recovery.toolRescue){const b=buttons[slot++];b.style.display='inline-block';b.textContent=`BUY MOVE · ${recovery.prices.move}c`;b.onclick=()=>openToolPurchase('move')}
    if(!noLegal&&GAME.canUndo()&&slot<buttons.length){const b=buttons[slot++];b.style.display='inline-block';b.textContent=`UNDO · ${s.consumables.undo}`;b.onclick=useUndo}
    const b=buttons[slot++]||overlayTertiary;setNewRunButton(b)
  }

  function render(){
    const s=GAME.state(),x=GAME.snapshot(),view=V.hudViewModel(s,x,{target:GAME.target(),maxPlacements:GAME.maxPlacements(),totalRounds:D.TOTAL_ROUNDS,boardWidth:E.G,boardHeight:E.H,longChainCap:D.ENDLESS_LONG_RUN_ACTIVATIONS||7});document.body.dataset.stageRound=String(view.stageRoundIndex);document.body.classList.toggle('endlessPalette',view.endless);document.body.classList.toggle('infinitePalette',view.infinitePhase);H.bindRun(s.runId);renderMachineModStatus(view.longChain);renderBoard();renderHand();const scoreDetail=$('scoreDetail');scoreEl.textContent=view.score;targetEl.textContent=view.target;$('scoreNote').textContent=view.note;scoreDetail.classList.toggle('scoreOverdrive',!!view.scoreOverdrive);scoreDetail.dataset.scoreMode=view.scoreMode;scoreDetail.setAttribute('aria-label',`Score ${view.scoreExact}. ${view.scoreOverdrive?`${V.multiplierText(view.scoreRatio)} times target. `:''}${view.note}. Show exact value.`);$('targetDetail').setAttribute('aria-label',`Target ${view.targetExact}. Show exact value.`);stageEl.textContent=view.stage;roundEl.textContent=view.round;movesEl.textContent=view.moves;$('movesRemaining').textContent=view.movesRemaining;tilesEl.textContent=view.tilesLeft;coinEl.textContent=view.coins;stageRoundEl.textContent=view.stageRound;boardSizeEl.textContent=view.boardSize;
    shopBtn.innerHTML=`Shop<small>${compact(s.coins)} coins</small>`;shopBtn.disabled=!!tutorial||uiBusy||!GAME.canOpenShop();const canBuyMove=GAME.canBuyTool('move'),canBuyReroll=GAME.canBuyTool('reroll'),canBuyUndo=GAME.canBuyTool('undo');moveBtn.innerHTML=`${view.movesRemaining} MOVES<small>ADD +1 · ${s.consumables.move||0}</small>`;moveBtn.setAttribute('aria-label',`${view.movesRemaining} moves remaining. Add one move tool: ${s.consumables.move||0} owned.`);moveBtn.disabled=!!tutorial||uiBusy||!(GAME.canUseMove()||canBuyMove);const rerollLabel=s.freeReroll?`Reroll · FREE${s.consumables.reroll?` + ${s.consumables.reroll}`:''}`:`Reroll · ${s.consumables.reroll||'0 · BUY'}`;rerollBtn.innerHTML=`Reroll<small>${s.freeReroll?'FREE':s.consumables.reroll||0}</small>`;rerollBtn.setAttribute('aria-label',rerollLabel);rerollBtn.disabled=!!tutorial||uiBusy||!(GAME.canUseReroll()||canBuyReroll);undoBtn.innerHTML=`Undo<small>${s.consumables.undo||0}</small>`;undoBtn.setAttribute('aria-label',`Undo tools: ${s.consumables.undo||0}`);undoBtn.disabled=!!tutorial||uiBusy||!(GAME.canUndo()||canBuyUndo);menuButton.disabled=!!tutorial||s.running||uiBusy;$('leaveTutorial').disabled=!!tutorial&&(uiBusy||s.running);
    hint.textContent=view.hint;renderLog();
    const pendingCircuit=s.pendingCircuit,pendingMod=s.pendingModPlacement,pending=pendingCircuit||pendingMod;circuitChoice.hidden=!pending;if(pendingCircuit){hint.textContent='Choose one outlined tile to develop.';circuitChoice.textContent=`CIRCUIT CLOSED · ${pendingCircuit.size} TILES · +${pendingCircuit.reward} RANK${pendingCircuit.reward===1?'':'S'} · CHOOSE A TILE`}else if(pendingMod){const mod=M.get(pendingMod.mod),relocating=pendingMod.stage==='source';hint.textContent=relocating?'Choose which Zero Port endpoint to relocate.':'Choose one highlighted compatible tile.';circuitChoice.textContent=`${mod?.displayName||pendingMod.mod} · ${relocating?'CHOOSE PORT TO MOVE':'CHOOSE A TILE'}`}
    if(auxOverlay){renderAuxOverlay();return}if(pending){hideOverlay();return}if(uiBusy){hideOverlay();return}if(s.shopOpen){s.shopType==='market'?showMarket():showShop();return}if(tutorial)return;
    if(!s.running){const waiting=(s.cleared||s.blocked)&&performance.now()<outcomeOverlayNotBefore;if(waiting)hideOverlay();else if(s.cleared)showClear();else if(s.blocked)showFailed();else hideOverlay()}
  }

  function center(c,r){const p=E.pieceFrom(drag.tile,c.x,c.y,0,c.rr,-1);return{x:(p.rect.minx+p.rect.maxx)/2/E.G*r.width,y:(p.rect.miny+p.rect.maxy)/2/E.H*r.height}}
  function nearest(x,y){const r=board.getBoundingClientRect(),lx=x-r.left,ly=(y-D.DRAG_Y_OFFSET)-r.top;if(lx<0||ly<0||lx>r.width||ly>r.height)return null;let pick=null,d0=1e9;for(const c of drag.candidates){const q=center(c,r),d=Math.hypot(q.x-lx,q.y-ly);if(d<d0){d0=d;pick=c}}return d0<=82?pick:null}
  function maybeShakeRotate(e){const s=GAME.state();if(s.pieces.length)return;const now=performance.now(),dx=e.clientX-drag.lastX;if(Math.abs(dx)>=D.SHAKE_THRESHOLD){const sign=Math.sign(dx);if(drag.lastSign&&sign!==drag.lastSign){if(!drag.shakeStarted||now-drag.shakeStarted>D.SHAKE_WINDOW_MS){drag.switches=1;drag.shakeStarted=now}else drag.switches++;if(drag.switches>=D.SHAKE_SWITCHES&&now-drag.lastRotate>D.SHAKE_COOLDOWN_MS){GAME.rotateRoot();drag.candidates=GAME.candidatesForIndex(drag.index);drag.candidate=null;drag.lastRotate=now;drag.switches=0;drag.shakeStarted=now;if(navigator.vibrate)navigator.vibrate(12);updateFloatRotation();toast(`Opening tile ${ARROW[GAME.state().rootRR]}`)}}drag.lastSign=sign;drag.lastX=e.clientX}}
  function updateFloatRotation(){if(drag.float)drag.float.style.setProperty('--rr',GAME.state().rootRR)}
  function startDrag(e,i){if(uiBusy||auxOverlay||!GAME.canInteract())return;e.preventDefault();const s=GAME.state(),cs=placementCandidates(i);if(!cs.length)return;const f=document.createElement('div');f.className='dragFloat';f.innerHTML=mini(s.hand[i]);document.body.appendChild(f);drag={active:true,index:i,tile:{...s.hand[i]},candidates:cs,candidate:null,float:f,lastX:e.clientX,lastSign:0,switches:0,shakeStarted:performance.now(),lastRotate:0};renderHand();updateFloatRotation()}
  function moveDrag(e){if(!drag.active)return;e.preventDefault();maybeShakeRotate(e);if(drag.float){const r=board.getBoundingClientRect(),inside=e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom,boardTileWidth=r.width/E.G*2,scale=inside?Math.max(.18,Math.min(1.2,boardTileWidth/30)):1.2;drag.float.style.left=e.clientX+'px';drag.float.style.top=(e.clientY-D.DRAG_Y_OFFSET)+'px';drag.float.style.setProperty('--drag-scale',scale)}const c=nearest(e.clientX,e.clientY),o=drag.candidate,changed=(!c)!==(!o)||c&&(!o||c.x!==o.x||c.y!==o.y||c.rr!==o.rr);drag.candidate=c;if(drag.float)drag.float.style.opacity=c?'0':'0.96';if(changed)renderBoard()}
  async function animateDrawSlot(i){if(!GAME.state().hand[i]){handFx[i]='hidden';renderHand();await wait(100);handFx[i]='normal';renderHand();return}handFx[i]='back';renderHand();await wait(D.DRAW_BLACK_MS);handFx[i]='reveal';renderHand();await wait(390);handFx[i]='normal';renderHand()}
  async function endDrag(e){
    if(!drag.active)return;moveDrag(e);const i=drag.index,c=drag.candidate;if(drag.float)drag.float.remove();drag={active:false,index:-1,tile:null,candidates:[],candidate:null,float:null};renderBoard();if(!c){renderHand();return}
    const game=GAME,generationBefore=game.state().setGeneration||1;if(!tutorial)PT?.recordDecision();const decision=!tutorial?game.decisionTelemetry(i,c,{maxEvaluations:48,timeBudgetMs:32}):null,searchStarted=performance.now(),ctx=GAME.beginPlacement(i,c),searchMs=performance.now()-searchStarted;if(!ctx.ok){toast(ctx.reason==='tile-already-in-machine'?'Tile already in machine':'Invalid placement');render();armDecisionTiming();return}
    uiBusy=true;const drawAnim=animateDrawSlot(i);renderBoard();const camera=rootCamera(),animationStarted=performance.now();camera?.beginCascade(ctx.sim.events||[]);try{await animate(ctx.p,ctx.trigger,ctx.sim,game.moveResonance(ctx.sim,ctx.trigger).output)}finally{camera?.endCascade()}const animationMs=performance.now()-animationStarted,result=game.finishPlacement(ctx);window.NomonUiPolish?.snapScore?.(game.state().score);recordPerformance(ctx.sim,searchMs,animationMs);if(!tutorial&&decision){
      const topologyAfter=game.topologyTelemetry(),chosenOutput=result.resonance?.output??game.state().score,alternative=decision.bestEvaluatedOutput,bestLegalOutput=decision.evaluationComplete?(decision.evaluationStrategy==='root-equivalent'?decision.bestLegalOutput:(alternative==null?chosenOutput:Math.max(chosenOutput,alternative))):null,bestPlacement=decision.evaluationComplete?(decision.evaluationStrategy==='root-equivalent'?decision.bestPlacement:(alternative!=null&&alternative>chosenOutput?decision.bestEvaluatedPlacement:{tileId:ctx.tile.id,handIndex:i,x:c.x,y:c.y,z:0,rr:c.rr})):null,events=ctx.sim.events||[];
      const coverageSamples=decision.coverageIncludesChosen?[]:[...(decision.coverageSampleOutputs||[]),chosenOutput].filter(Number.isFinite).sort((a,b)=>a-b),pickCoverage=q=>coverageSamples[Math.min(coverageSamples.length-1,Math.max(0,Math.ceil(q*coverageSamples.length)-1))];
      const clearCoverageSampleCount=decision.coverageIncludesChosen?(decision.clearCoverageSampleCount||0):coverageSamples.length,clearCoverageClearCount=decision.coverageIncludesChosen?(decision.clearCoverageClearCount||0):(decision.clearCoverageClearCount||0)+(chosenOutput>=(decision.coverageTarget??game.target())?1:0),clearCoverage=clearCoverageSampleCount?clearCoverageClearCount/clearCoverageSampleCount:null,outputDistribution=decision.coverageIncludesChosen?decision.outputDistribution:(coverageSamples.length?{min:coverageSamples[0],median:pickCoverage(.5),p90:pickCoverage(.9),max:coverageSamples[coverageSamples.length-1]}:null),signal=game.signalTelemetry(ctx.sim,game.state().pieces),deckAfter=game.deckTelemetry(),{coverageSampleOutputs,...decisionMeta}=decision;
      PT?.recordPlacement({...decisionMeta,turn:game.state().turn,chosenOutput,chosenSelectionOutput:ctx.sim.output??ctx.trigger,bestLegalOutput,bestPlacement,chosenVsBestRatio:bestLegalOutput?chosenOutput/bestLegalOutput:null,evaluatedPlacementCount:(decision.evaluatedPlacementCount||0)+1,clearCoverageSampleCount,clearCoverageClearCount,clearCoverage,clearCoverageComplete:decision.coverageIncludesChosen?!!decision.clearCoverageComplete:!!decision.evaluationComplete,outputDistribution,deckAfter,topologyAfter,context:{...signal,rebounds:ctx.sim.rebounds||0,splits:events.filter(e=>e.type==='signal-fork').length,doubleEchoes:events.filter(e=>e.type==='double-echo-start').length,zeroPorts:events.filter(e=>e.type==='zero-port').length,powerActivations:events.filter(e=>e.type==='op'&&(e.powerMultiplier||1)>1).length,modActivations:events.filter(e=>e.type==='op'&&(e.modMultiplier||1)>1).length,resonanceMultiplier:result.resonance?.multiplier||1,newCircuits:Math.max(0,(topologyAfter.circuitCount||0)-(decision.topologyBefore?.circuitCount||0))}})
    }persistGame();
    const exitPending=!!tutorial?.exitPending;if(!exitPending)advanceTutorial(result);await drawAnim;uiBusy=false;
    if(exitPending){leaveTutorial(false);return}if(!tutorial&&(game.state().cleared||game.state().blocked))armOutcomeDelay();render();if(!tutorial)armDecisionTiming();
    if(!tutorial&&result.autoRerolls)toast(`NO LEGAL MOVES · AUTO REROLL${result.autoRerolls>1?` ×${result.autoRerolls}`:''}`);else if(!tutorial&&generationBefore<(game.state().setGeneration||1))toast(`POWER SET ${game.state().setGeneration} · ×${game.snapshot().powerSets.powerMultiplier} UNLOCKED`);else if(!tutorial&&game.state().cleared)toast(`Round clear · ${fmt(game.state().score)}`);else if(!tutorial&&result.upgradeCoins)toast(`★ +${result.upgradeCoins} coins`)
  }

  function chooseCircuitTile(tileId){const r=GAME.chooseCircuitTile(tileId);if(!r.ok)return;press.cancel();persistGame();clearOutcomeDelay();render();armDecisionTiming();toast(`CIRCUIT RANK ${D.CIRCUIT_RANKS[r.after-1].roman}`)}
  function chooseMarketModTile(tileId){const pending=GAME.state().pendingModPlacement,mod=M.get(pending?.mod),r=GAME.chooseMarketModTile(tileId);if(!r.ok){toast(r.reason==='no-target'?'No compatible relocation target':'Invalid Mod target');return}if(!r.pending)PT?.closeMarket({outcome:`buy:${pending?.mod||r.mod}`});press.cancel();persistGame();clearOutcomeDelay();render();if(r.pending)toast(`${mod?.displayName||r.mod} · CHOOSE NEW ZERO`);else toast(`${mod?.displayName||r.mod} → [${r.tile?.a}|${r.tile?.b}]`)}
  const press=GEST.createPressGesture({delay:D.LONG_PRESS_MS||500,tolerance:D.LONG_PRESS_MOVE_TOLERANCE_PX||10,onTap:meta=>{if(meta.kind==='circuit')chooseCircuitTile(meta.tileId);else if(meta.kind==='mod-target')chooseMarketModTile(meta.tileId);else if(meta.kind==='board')revealModFace(meta.tileId)},onLongPress:meta=>{if(meta.kind==='circuit'||meta.kind==='mod-target')return;if(navigator.vibrate)navigator.vibrate(8);openTileInspector(meta.tileId)},onDragStart:(meta,e)=>{if(meta.kind==='hand')startDrag(e,meta.index)}});
  function handlePointerMove(e){press.move(e);if(drag.active)moveDrag(e)}
  async function handlePointerUp(e){press.end(e);if(drag.active)await endDrag(e)}
  function handlePointerCancel(e){press.cancel();if(drag.active)endDrag(e)}
  window.addEventListener('pointermove',handlePointerMove,{passive:false});window.addEventListener('pointerup',handlePointerUp);window.addEventListener('pointercancel',handlePointerCancel);

  function pc(id){return GAME.state().pieces.find(p=>p.id===id)}
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
  function clearTransientFx(){board.querySelectorAll('.operationFlash').forEach(el=>el.remove())}
  function fx(x,y,t,value=0,kind='add',index=0,lane='',retain=false,durationOverride=null){
    const d=document.createElement('div'),duration=Math.max(1,Number(durationOverride)||V.effectLifetime(index)),size=kind.includes('operationFlash')?13:kind.includes('signal')?14:Math.min(34,24+magnitude(value));d.className=`opfx ${kind}${lane?` ${lane}`:''}`;d.style.left=px(x);d.style.top=py(y);d.style.fontSize=`${size}px`;d.style.animationDuration=`${duration}ms`;d.style.setProperty('--cascade-flash-ms',`${duration}ms`);d.style.setProperty('--cascade-structure-ms',`${duration}ms`);d.textContent=t;board.appendChild(d);
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
    const items=V.cascadeSettlementPlan(events,baseOutput,fallbackPiece,V.CASCADE.contributionLimit),cards=[];
    for(const item of items){cards.push({item,el:showCascadeSubtotal(item)});if(items.length>1)await wait(45)}
    const subtotalHoldMs=tutorial?240:V.CASCADE.subtotalHoldMs,settleItemMs=tutorial?220:V.CASCADE.settleItemMs,resonanceSettleMs=tutorial?300:V.CASCADE.resonanceSettleMs;
    await wait(subtotalHoldMs);
    const polish=window.NomonUiPolish,note=$('scoreNote'),detail=$('scoreDetail');detail?.setAttribute('aria-busy','true');polish?.snapScore?.(0);if(!polish?.snapScore)scoreEl.textContent='0';
    let running=0;
    for(const {item,el} of cards){
      running+=Number(item.output)||0;el.classList.add('cascadeToScore');note.textContent=`${item.label} · +${compact(item.output)}`;
      if(polish?.tweenScore)polish.tweenScore(running,settleItemMs);else scoreEl.textContent=V.scoreDisplay(running,GAME.target()).score;
      await wait(settleItemMs);el.remove()
    }
    const base=Number(baseOutput)||0,tolerance=Math.max(1,Math.abs(base))*1e-9;if(Math.abs(running-base)>tolerance){polish?.snapScore?.(base);if(!polish?.snapScore)scoreEl.textContent=V.scoreDisplay(base,GAME.target()).score;running=base}
    const resolved=Number(finalOutput);if(Number.isFinite(resolved)&&Math.abs(resolved-base)>tolerance){
      const ratio=base?resolved/base:1;note.textContent=`CIRCUIT ×${compact(ratio)}`;if(polish?.tweenScore)polish.tweenScore(resolved,resonanceSettleMs);else scoreEl.textContent=V.scoreDisplay(resolved,GAME.target()).score;await wait(resonanceSettleMs)
    }
    detail?.removeAttribute('aria-busy');const settled=Number.isFinite(resolved)?resolved:base;note.textContent=V.scoreDisplay(settled,GAME.target()).note
  }
  function reboundFx(x,y,angle=180,index=0,lane=''){const d=fx(x,y,'',0,'signal cascadeStructural reboundFx',index,lane,false,V.CASCADE.structuralFxMs);d.innerHTML='<span class="reboundArrow" aria-hidden="true">→</span><small>REBOUND</small>';d.firstChild.style.transform=`rotate(${angle}deg)`;fitBoardLabel(d);return d}
  async function animateSequence(events,lane,startIndex=0,startEcho=()=>{}){
    let lastOp=null,index=startIndex,i=0;
    while(i<events.length){const e=events[i];
      if(e.type==='signal-fork'){
        const block=V.forkBlock(events,i),pp=pc(e.piece);if(!block){i++;continue}
        if(pp){const splitLabel=e.splitKind==='triple-double'?'TRIPLE DOUBLE':e.splitKind==='zero-port'?'ZERO PORT':'SPLIT';fx((pp.rect.minx+pp.rect.maxx)/2,(pp.rect.miny+pp.rect.maxy)/2,lane.family==='echo'?`ECHO ${splitLabel}`:splitLabel,0,'signal cascadeStructural splitFx',index,lane.family==='echo'?'echoLane':'lane0',false,V.CASCADE.structuralFxMs);await wait(Math.max(150,V.cascadeDelay(index)/2))}
        await Promise.all(block.branches.map(branch=>animateSequence(branch.events,{family:lane.family,path:lane.path+(lane.path?'.':'')+V.armLabel(branch.arm)},index+1,startEcho)));
        if(pp){const d=fx((pp.rect.minx+pp.rect.maxx)/2,(pp.rect.miny+pp.rect.maxy)/2,'JOIN',0,'signal cascadeStructural joinFx',index+1,lane.family==='echo'?'echoLane':'lane0',false,V.CASCADE.structuralFxMs);d.dataset.family=lane.family;d.dataset.output=block.join.output;await wait(Math.max(220,V.cascadeDelay(index+1)))}
        i=block.next;index+=2;continue
      }
      if(e.type==='op'){lastOp=e;showOperation(e,lastOp,lane,index);if(events[i+1]?.type==='double-echo-start'){startEcho(events[i+1],index);i++}await wait(V.cascadeDelay(index));index++;i++;continue}
      if(e.type==='zero-port'){
        const pp=pc(e.piece),c=pp?.cubes.find(x=>x.half===e.fromHalf)||pp?.cubes.find(x=>x.v===0)||pp?.cubes[0];
        if(c){fx(c.x+1,c.y+1,'ZERO PORT',0,'signal cascadeStructural zeroPortFx',index,lane.family==='echo'?'echoLane':'lane0',false,V.CASCADE.structuralFxMs);await wait(Math.max(140,V.cascadeDelay(index)/2))}i++;continue
      }
      if(e.type==='rebound'){
        const pp=pc(e.piece),entry=pp&&lastOp?.piece===e.piece?pp.cubes.find(x=>x.half===lastOp.entryHalf):null,exit=pp&&lastOp?.piece===e.piece?pp.cubes.find(x=>x.half===lastOp.exitHalf):null,c=exit||pp?.cubes.find(x=>x.v===0)||pp?.cubes[0];
        if(c){const angle=entry&&exit?Math.atan2(entry.y-exit.y,entry.x-exit.x)*180/Math.PI:180;reboundFx(c.x+1,c.y+1,angle,index,lane.family==='echo'?'echoLane':'lane0');await wait(Math.max(160,V.cascadeDelay(index)))}i++;continue
      }
      if(e.type==='double-echo-start'){startEcho(e,index);i++;continue}i++
    }
    return index
  }
  async function animate(p,trigger,sim,finalOutput=sim.output??trigger){
    renderBoard();fx((p.rect.minx+p.rect.maxx)/2,(p.rect.miny+p.rect.maxy)/2,`+${compact(trigger)}`,trigger,'operationFlash add',0,'',false,tutorial?640:V.CASCADE.operationFlashMs);await wait(V.cascadeDelay(0));
    const plan=V.signalPlan(sim.events||[]);let echoTask=null;
    const startEcho=(e,index)=>{if(echoTask)return;const pp=pc(e.piece);if(pp)fx((pp.rect.minx+pp.rect.maxx)/2,(pp.rect.miny+pp.rect.maxy)/2,'ECHO',0,'signal cascadeStructural echoStart',index,'echoLane',false,V.CASCADE.structuralFxMs);echoTask=(async()=>{const lane={family:'echo',path:''};showOperation({type:'echo-copy',piece:e.piece,value:1,op:'add',add:0,after:e.startOutput},null,lane,index);await wait(V.cascadeDelay(index));return animateSequence(plan.echo,lane,index+1)})()};
    await animateSequence(plan.main,{family:'main',path:''},0,startEcho);if(echoTask)await echoTask;
    await settleCascadeScore(sim.events||[],sim.output??trigger,finalOutput,p.id)
  }

  async function doReroll(){if(uiBusy||!GAME.canUseReroll())return;uiBusy=true;hideOverlay();handFx.fill('hidden');renderHand();await wait(90);const r=GAME.reroll();if(!r.ok){uiBusy=false;handFx.fill('normal');render();return}persistGame();handFx.fill('back');renderHand();await wait(D.REROLL_BLACK_MS);for(let i=0;i<GAME.state().hand.length;i++){if(GAME.state().hand[i])handFx[i]='reveal';renderHand();await wait(D.HAND_REVEAL_STAGGER_MS)}await wait(300);handFx.fill('normal');uiBusy=false;if(GAME.state().blocked)armOutcomeDelay();render();if(r.autoRerolls)toast(`NO LEGAL MOVES · AUTO REROLL${r.autoRerolls>1?` ×${r.autoRerolls}`:''}`)}

  function rootCamera(){return window.MonoidBoardCamera}
  function recordPerformance(sim,searchMs,animationMs){const search=sim.search||{},events=(sim.events||[]).filter(event=>['op','signal-fork','rebound','double-echo-start'].includes(event.type)).length;performanceSamples.push({move:GAME.state().turn,searchMs:Math.round(searchMs),animationMs:Math.round(animationMs),eventsRendered:events,expanded:search.expanded||0,truncated:!!search.truncated,cameraScale:rootCamera()?.snapshot().scale||1});if(!tutorial)PT?.recordCascade(animationMs);while(performanceSamples.length>12)performanceSamples.shift()}
  function performanceText(){if(!performanceSamples.length)return'PERFORMANCE TELEMETRY\nNo recorded placements this session.';return`PERFORMANCE TELEMETRY\n${performanceSamples.map(s=>`Move ${s.move}: search ${s.searchMs}ms · animation ${s.animationMs}ms · events ${s.eventsRendered} · expanded ${s.expanded}${s.truncated?' TRUNCATED':''} · zoom ${s.cameraScale.toFixed(2)}x`).join('\n')}`}
  Object.defineProperty(window,'__monoidPerformance',{configurable:true,get:()=>performanceSamples.map(sample=>({...sample}))});
  Object.defineProperty(window,'__monoidPlaytest',{configurable:true,get:()=>PT?.snapshot()||null});
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
  menuButton.onclick=()=>{if(GAME.state().running||uiBusy||drag.active)return;press.cancel();gameMenu.showModal();menuButton.setAttribute('aria-expanded','true')};$('closeMenu').onclick=closeMenu;gameMenu.onclose=()=>menuButton.setAttribute('aria-expanded','false');gameMenu.onclick=e=>{if(e.target===gameMenu){const r=gameMenu.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeMenu()}};
  $('scoreDetail').onclick=()=>openScoreDetails('score');$('targetDetail').onclick=()=>openScoreDetails('target');
  overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','overlayTitle');
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')pausePlaytest();else resumePlaytest()});window.addEventListener('pagehide',pausePlaytest);
  document.addEventListener('keydown',e=>{if(!overlay.classList.contains('show'))return;if(e.key==='Escape'&&auxOverlay){e.preventDefault();closeAuxOverlay();return}if(e.key==='Tab'){const buttons=[...overlay.querySelectorAll('button:not(:disabled),[tabindex="0"]')].filter(b=>b.getClientRects().length);if(!buttons.length)return;const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&(document.activeElement===first||!overlay.contains(document.activeElement))){e.preventDefault();last.focus()}else if(!e.shiftKey&&(document.activeElement===last||!overlay.contains(document.activeElement))){e.preventDefault();first.focus()}}});
  shopBtn.onclick=openPermanentShop;moveBtn.onclick=activateMove;rerollBtn.onclick=activateReroll;undoBtn.onclick=activateUndo;resetBtn.onclick=()=>{if(uiBusy)return;if(!confirm('Start a new run?'))return;closeMenu();newRun()};helpBtn.onclick=openRulebook;copyBtn.onclick=()=>{closeMenu();copyRun()};viewBtn.onclick=()=>{closeMenu();viewRun=!viewRun;renderLog();if(auxOverlay?.type==='inspector')renderAuxOverlay()};
  titleCard.onclick=e=>{e.preventDefault();e.stopPropagation();showSelection()};
  titleCard.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showSelection()}};
  $('learnMonoid').onclick=startTutorial;$('replayTutorial').onclick=startTutorial;$('startRun').onclick=()=>{if(storedState()&&!confirm('Replace the saved run with a new run?'))return;startNormal(false)};continueRun.onclick=()=>startNormal(true);$('modeClassic').onclick=()=>storedState()?startNormal(true):startNormal(false);$('leaveTutorial').onclick=requestTutorialExit;$('gameSelectionButton').onclick=()=>{closeMenu();showSelection()};
  if(localStorage.getItem('iterion.entryBypass.v1')==='true')startNormal(false);else{app.inert=true;render()}
})();
