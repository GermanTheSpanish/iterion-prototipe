(function(root){
  'use strict';
  const $=id=>document.getElementById(id);
  const app=document.querySelector('.app'),board=$('board'),boardShell=document.querySelector('.boardShell'),handRail=document.querySelector('.handRail'),machineModStatus=$('machineModStatus'),overlay=$('overlay'),modal=overlay?.querySelector('.modal'),overlayTitle=$('overlayTitle'),overlayPrimary=$('overlayPrimary');
  const learn=$('learnMonoid'),replay=$('replayTutorial'),systems=$('systemsTutorial'),startRun=$('startRun'),modeClassic=$('modeClassic'),leaveTutorial=$('leaveTutorial');
  if(!app||!board||!boardShell||!overlay||!modal)return;

  const TOUR_KEY='monoid.uiTour.v1',FIRST_BRIEF_KEY='monoid.firstRunBriefing.v1',SYSTEMS_POWER_ID='g2-d1-2';
  const ux={mode:'idle',tourStep:null,commerce:null,tutorialKind:null,systemsPhase:null,rotationSeen:false};
  Object.defineProperty(root,'__monoidUx',{configurable:true,get:()=>({...ux})});

  document.title=document.title.replace(/^NOMON\b/,'MONOID');
  const wordmark=document.querySelector('.wordmark');if(wordmark&&wordmark.textContent.trim()==='NOMON')wordmark.textContent='MONOID';

  const coach=document.createElement('section');
  coach.id='monoidBoardCoach';coach.className='boardCoachLayer';coach.hidden=true;coach.setAttribute('role','dialog');coach.setAttribute('aria-live','polite');
  document.body.appendChild(coach);
  let coachKey='',pendingEndlessAction=null,syncQueued=false,lastTutorialGame=null,rotationStart=0;

  const tour=[
    {title:'THE MACHINE',body:'This is your machine.\nEverything you build stays here.',target:()=>board},
    {title:'TARGET',body:'Beat this number before you run out of moves.',target:()=>$('targetDetail')},
    {title:'SCORE',body:'Every placement sends one signal through the machine.\nSCORE shows that Move’s resolved result — not a running total.',target:()=>$('scoreDetail')},
    {title:'MOVES',body:'Seven moves. Make them count.',target:()=>$('moveTool')},
    {title:'HAND',body:'These are the tiles you can play.',target:()=>handRail}
  ];
  const tutorialCopy=[
    {title:'THE FIRST TILE',body:()=>ux.rotationSeen?'Rotated. Now place the Double anywhere.':'Drag the Double, then shake left ↔ right to rotate it.\nRelease it anywhere on the board.'},
    {title:'MAKE A CONNECTION',body:()=> 'Matching numbers touch.\nConnect the 2 wherever you want.'},
    {title:'BUILD THE SIGNAL',body:()=> 'EVEN adds. ODD multiplies.\nConnect the 3.'},
    {title:'ZERO',body:()=> "Zero doesn't score.\nIt turns the signal back. Connect the 4."},
    {title:'REBOUND',body:()=> 'Build from the other end.\nWhen the route reaches Zero, the signal rebounds.'},
    {title:'EXTEND THE ARM',body:()=> 'Keep building from that arm.\nMake the machine longer.'},
    {title:'T-SPLIT',body:()=> 'A Double can split a signal when both ends are connected.\nTry entering the Double from the side.'}
  ];
  const tutorialPips={0:[],1:[[50,50]],2:[[28,28],[72,72]],3:[[28,28],[50,50],[72,72]],4:[[28,28],[72,28],[28,72],[72,72]],5:[[28,28],[72,28],[50,50],[28,72],[72,72]],6:[[28,23],[72,23],[28,50],[72,50],[28,77],[72,77]]};

  function gameFlow(){return root.__monoidFlow||{screen:null,tutorialStep:null}}
  function currentGame(){return root.__monoidGame||null}
  const tutorialController=root.MonoidTutorialController?.create({gameFlow,currentGame,getTutorialKind:()=>ux.tutorialKind,scheduleSync,systemsPowerId:SYSTEMS_POWER_ID});
  if(!tutorialController)throw new Error('MONOID tutorial controller failed to initialise');


  let drawTrack={game:null,running:false,stable:[],pending:new Set(),revealScheduled:false};
  function handIds(game){return(game?.state?.().hand||[]).map(t=>t?.id||null)}
  function pendingDomino(slotIndex){return document.querySelectorAll('#hand .handSlot')[slotIndex]?.querySelector('.domino')||null}
  function forcePendingDrawBack(){for(const i of drawTrack.pending){const domino=pendingDomino(i);if(domino){domino.classList.add('back');domino.classList.remove('reveal')}}}
  function syncPendingDraw(){
    const game=currentGame();if(!game)return;const s=game.state(),ids=handIds(game),running=!!s.running;
    if(drawTrack.game!==game){drawTrack={game,running,stable:ids.slice(),pending:new Set(),revealScheduled:false};return}
    if(running){ids.forEach((id,i)=>{if(id!==drawTrack.stable[i])drawTrack.pending.add(i)});forcePendingDrawBack();drawTrack.revealScheduled=false}
    else if(drawTrack.running||drawTrack.pending.size){forcePendingDrawBack();if(!drawTrack.revealScheduled){drawTrack.revealScheduled=true;requestAnimationFrame(()=>{const live=currentGame();if(!live||live!==drawTrack.game||live.state().running){drawTrack.revealScheduled=false;return}const slots=[...drawTrack.pending];drawTrack.pending.clear();drawTrack.stable=handIds(live);drawTrack.running=false;drawTrack.revealScheduled=false;for(const i of slots){const domino=pendingDomino(i);if(!domino)continue;domino.classList.remove('back');domino.classList.add('reveal');setTimeout(()=>domino.classList.remove('reveal'),420)}})}}
    else drawTrack.stable=ids.slice();drawTrack.running=running
  }

  function tutorialDots(n){return(tutorialPips[n]||[]).map(([x,y])=>`<i class="spip" style="left:${x}%;top:${y}%"></i>`).join('')}
  function tutorialDomino(tile){return`<div class="domino"><div class="half"><div class="spips">${tutorialDots(tile?.a??0)}</div></div><div class="half"><div class="spips">${tutorialDots(tile?.b??0)}</div></div></div>`}
  function syncTutorialHandVisuals(){
    const active=gameFlow().screen==='tutorial',game=currentGame();if(!active||!game){document.querySelectorAll('.tutorialVisualDecoy').forEach(el=>el.remove());return}
    const s=game.state(),slots=[...document.querySelectorAll('#hand .handSlot')],primary=slots[0]?.querySelector('.tile');
    if(primary&&s.hand[0]&&primary.dataset.tutorialVisualId!==s.hand[0].id){primary.innerHTML=tutorialDomino(s.hand[0]);primary.dataset.tutorialVisualId=s.hand[0].id}
    const used=new Set((s.pieces||[]).map(p=>p.tile?.id).filter(Boolean));if(s.hand[0]?.id)used.add(s.hand[0].id);
    const decoys=(s.reserve||[]).filter(t=>!used.has(t.id)).slice(0,Math.max(0,(root.IterionData?.HAND_SIZE||5)-1));
    for(let i=1;i<slots.length;i++){
      if(slots[i].querySelector('.tile:not(.tutorialVisualDecoy)'))continue;let button=slots[i].querySelector('.tutorialVisualDecoy'),tile=decoys[i-1];if(!tile){button?.remove();continue}
      if(!button){button=document.createElement('button');button.type='button';button.className='tile tutorialLocked tutorialVisualDecoy';button.disabled=true;button.setAttribute('aria-disabled','true');slots[i].appendChild(button)}
      if(button.dataset.tileId!==tile.id){button.dataset.tileId=tile.id;button.innerHTML=tutorialDomino(tile);button.setAttribute('aria-label',`Domino ${tile.a}|${tile.b}. Tutorial: use the highlighted tile.`)}
    }
  }
  function clearHighlights(){document.querySelectorAll('.monoidTourHighlight').forEach(el=>el.classList.remove('monoidTourHighlight'))}
  function highlight(el){clearHighlights();if(el)el.classList.add('monoidTourHighlight')}
  function syncCoachRect(){if(coach.hidden)return;const r=board.getBoundingClientRect(),key=[r.left,r.top,r.width,r.height].map(n=>Math.round(n*10)/10).join(':');if(coach.dataset.rectKey===key)return;coach.dataset.rectKey=key;Object.assign(coach.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'})}
  function coachMarkup(kicker,title,body,actions=''){return `<div class="boardCoachCard"><span class="boardCoachKicker">${kicker}</span><h2>${title}</h2><p>${body}</p>${actions?`<div class="boardCoachActions">${actions}</div>`:''}</div>`}
  function showCoach(mode,key,kicker,title,body,actions=''){ux.mode=mode;coach.hidden=false;coach.className=`boardCoachLayer ${mode}`;const nextKey=`${mode}:${key}`;if(coachKey!==nextKey){coachKey=nextKey;coach.innerHTML=coachMarkup(kicker,title,body,actions)}syncCoachRect()}
  function hideCoach(nextMode='idle'){coach.hidden=true;coachKey='';ux.mode=nextMode;if(nextMode!=='tour')ux.tourStep=null;clearHighlights();document.body.classList.remove('monoidTourActive')}

  function renderTour(){const step=tour[ux.tourStep];if(!step)return finishTour();document.body.classList.add('monoidTourActive');highlight(step.target());showCoach('tour',ux.tourStep,`LEARN MONOID · ${ux.tourStep+1}/${tour.length}`,step.title,step.body,'<button data-ux-action="leave">LEAVE</button><span>TAP TO CONTINUE</span>')}
  function startTour(){ux.tourStep=0;renderTour()}
  function advanceTour(){if(ux.mode!=='tour')return;if(ux.tourStep<tour.length-1){ux.tourStep++;renderTour();return}finishTour()}
  function finishTour(){localStorage.setItem(TOUR_KEY,'seen');document.body.classList.remove('monoidTourActive');ux.mode='tutorial';ux.tourStep=null;renderTutorialCoach()}

  function syncTutorialHandLocks(){
    const active=gameFlow().screen==='tutorial';document.querySelectorAll('#hand .tile').forEach((button,index)=>{const locked=active&&index!==0;button.classList.toggle('tutorialLocked',locked);if(locked){if(!button.disabled)button.disabled=true;if(button.getAttribute('aria-disabled')!=='true')button.setAttribute('aria-disabled','true');if(!button.getAttribute('aria-label')?.includes('Tutorial: use the highlighted tile.'))button.setAttribute('aria-label',(button.getAttribute('aria-label')||'Domino')+' Tutorial: use the highlighted tile.')}})
  }
  function positionTutorialCoach(game){const E=root.IterionEngine,tile=game?.state?.().hand?.[0],candidate=game?.candidatesForIndex?.(0)?.[0];if(!tile||!candidate)return;const p=E.pieceFrom(tile,candidate.x,candidate.y,0,candidate.rr,-1),centreY=(p.rect.miny+p.rect.maxy)/2;coach.classList.toggle('coachBottom',centreY<E.H*.56)}
  function renderSystemsCoach(){
    const game=currentGame(),s=game?.state?.();if(!game||!s)return;
    if(ux.systemsPhase==='circuit'){
      highlight($('circuitChoice'));showCoach('tutorial','systems-circuit','SYSTEMS · 1/4','CIRCUITS','A closed physical loop creates a Circuit.\nChoose one outlined tile to develop.');coach.classList.add('coachBottom','coachCircuit');return
    }
    if(ux.systemsPhase==='mod'){
      highlight(machineModStatus||board);showCoach('tutorial','systems-mod','SYSTEMS · 2/4','MODIFIERS','Markets can change one physical tile or the whole machine.\nLONG CHAIN is active here.','<button class="primary" data-ux-action="systems-next">NEXT · POWER</button>');coach.classList.add('coachBottom');return
    }
    if(ux.systemsPhase==='power'){
      highlight(document.querySelector('#hand .tile:not(.tutorialLocked)')||document.querySelector('#hand .tile'));showCoach('tutorial','systems-power','SYSTEMS · 3/4','POWER','POWER tiles keep their printed numbers, matching and parity.\nTheir scoring operations use ×2 magnitude. Place this tile anywhere legal.');positionTutorialCoach(game);return
    }
    highlight(board);showCoach('tutorial','systems-complete','SYSTEMS · 4/4','MACHINE EVOLUTION','Circuits reward structure. Mods reshape behaviour. POWER raises operation magnitude.','<button class="primary" data-ux-action="systems-finish">FINISH</button><button data-ux-action="systems-retry">TRY AGAIN</button>');coach.classList.add('coachBottom')
  }
  function renderTutorialCoach(){
    const flow=gameFlow();if(flow.screen!=='tutorial'){if(ux.mode==='tutorial')hideCoach();return}if(ux.mode==='tour')return;
    const commerce=overlay.classList.contains('show')&&modal.classList.contains('commerceModal');if(commerce){if(ux.mode==='tutorial')coach.hidden=true;return}
    if(ux.tutorialKind==='systems'){syncTutorialHandVisuals();syncTutorialHandLocks();renderSystemsCoach();return}
    const game=currentGame(),step=Math.max(0,Math.min(5,Number(flow.tutorialStep)||0)),turn=game?.state?.().turn||0,copyIndex=step===5?(turn<6?5:6):step,copy=tutorialCopy[copyIndex];
    if(step===0&&!game?.state?.().pieces.length&&game.state().rootRR!==rotationStart)ux.rotationSeen=true;
    ux.mode='tutorial';syncTutorialHandVisuals();syncTutorialHandLocks();highlight(document.querySelector('#hand .tile:not(.tutorialLocked)')||document.querySelector('#hand .tile'));
    showCoach('tutorial',`${copyIndex}-${ux.rotationSeen?'rotated':'ready'}`,`BASICS · ${copyIndex+1}/${tutorialCopy.length}`,copy.title,copy.body(),'<button id="monoidCoachLeave" data-ux-action="leave">LEAVE</button>');positionTutorialCoach(game)
  }

  function showFirstBrief(){if(localStorage.getItem(FIRST_BRIEF_KEY)==='seen'||app.hidden)return;highlight(board);showCoach('firstBrief','rules','FIRST RUN','BUILD. ROUTE. SCORE.','Match equal numbers to build the machine.\nEvery move sends a signal through it.\n\nEVEN adds. ODD multiplies. ZERO rebounds.\n\nBeat the TARGET before your moves run out.\nYour machine survives the round.','<button class="primary" data-ux-action="start-first">START</button><small>MONOID opens the menu and Rulebook anytime.</small>')}
  function acknowledgeFirstBrief(){localStorage.setItem(FIRST_BRIEF_KEY,'seen');hideCoach()}
  function showEndlessBrief(action){pendingEndlessAction=action;overlay.classList.add('monoidUxSuppressed');highlight(board);showCoach('endlessBrief','endless','ENDLESS','THE MACHINE CONTINUES.','You beat MONOID. There is no finish line now.\n\nTargets grow ×5 every round.\nYour machine, tiles, modifiers and coins carry on.\n\nWhen the set runs dry, stronger POWER tiles enter.','<button class="primary" data-ux-action="enter-endless">ENTER ENDLESS</button><button data-ux-action="back-endless">BACK</button>')}
  function enterEndless(){const action=pendingEndlessAction;pendingEndlessAction=null;overlay.classList.remove('monoidUxSuppressed');hideCoach();if(action)action()}
  function backEndless(){pendingEndlessAction=null;overlay.classList.remove('monoidUxSuppressed');hideCoach()}

  const replayOriginal=replay?.onclick;
  function startSystemsTutorial(e){if(typeof replayOriginal!=='function')return;tutorialController.setNextKind('systems');replayOriginal.call(replay,e);requestAnimationFrame(scheduleSync)}
  coach.addEventListener('click',e=>{
    const action=e.target.closest('[data-ux-action]')?.dataset.uxAction;
    if(action==='leave'){e.stopPropagation();leaveTutorial?.click();return}
    if(action==='start-first'){acknowledgeFirstBrief();return}
    if(action==='enter-endless'){enterEndless();return}
    if(action==='back-endless'){backEndless();return}
    if(action==='systems-next'){ux.systemsPhase='power';renderTutorialCoach();return}
    if(action==='systems-finish'){leaveTutorial?.click();return}
    if(action==='systems-retry'){startSystemsTutorial(e);return}
    if(ux.mode==='tour')advanceTour()
  });

  function wrapTutorialTrigger(button){if(!button||button.__monoidUxWrapped)return;const original=button.onclick;if(typeof original!=='function')return;button.__monoidUxWrapped=true;button.onclick=function(e){tutorialController.setNextKind('basics');const value=original.call(this,e);requestAnimationFrame(scheduleSync);return value}}
  function wrapNewRunTrigger(button,{skipWhenSaved=false}={}){if(!button||button.__monoidBriefWrapped)return;const original=button.onclick;if(typeof original!=='function')return;button.__monoidBriefWrapped=true;button.onclick=function(e){const hadSaved=!!localStorage.getItem('iterion.activeRun.v1');const value=original.call(this,e);setTimeout(()=>{if(app.hidden||gameFlow().screen!=='game')return;if(skipWhenSaved&&hadSaved)return;showFirstBrief()},0);return value}}
  wrapTutorialTrigger(learn);wrapTutorialTrigger(replay);if(systems)systems.onclick=startSystemsTutorial;wrapNewRunTrigger(startRun);wrapNewRunTrigger(modeClassic,{skipWhenSaved:true});

  app.addEventListener('pointerdown',e=>{
    if(ux.mode==='firstBrief'&&!coach.contains(e.target)){acknowledgeFirstBrief();return}
    if(ux.mode==='tour'&&handRail.contains(e.target)){finishTour();return}
    if(ux.tutorialKind==='systems'&&(ux.systemsPhase==='circuit'||ux.systemsPhase==='mod')&&handRail.contains(e.target)){e.preventDefault();e.stopImmediatePropagation()}
  },true);

  function wrapEndlessButton(){if(localStorage.getItem('iterion.entryBypass.v1')==='true')return;if(!overlay.classList.contains('show')||overlayTitle?.textContent.trim()!=='RUN COMPLETE'||!overlayPrimary?.textContent.includes('ENDLESS'))return;const current=overlayPrimary.onclick;if(typeof current!=='function'||current.__monoidEndlessWrapper)return;const wrapper=function(e){e?.preventDefault?.();e?.stopPropagation?.();showEndlessBrief(()=>current.call(overlayPrimary,e))};wrapper.__monoidEndlessWrapper=true;overlayPrimary.onclick=wrapper}

  function setText(el,text){if(el&&el.textContent.trim()!==text)el.textContent=text}
  function enhanceCommerceCopy(title){
    if(title==='TILE SHOP'){
      const intro=document.querySelector('.marketIntro'),introText='This is the real Tile Shop. Physical dominoes for this run. Market appears only between stages.';if(intro&&intro.textContent.trim()!==introText)intro.innerHTML='<strong>This is the real Tile Shop.</strong> Physical dominoes for this run. Market appears only between stages.'
    }
    if(title==='MARKET'){const foot=document.querySelector('.shopFoot');if(foot){const endless=document.body.classList.contains('endlessPalette');setText(foot,endless?'Buy one mod, or leave it. Inflation and Endless Strain raise prices.':'Buy one mod, or leave it. Each purchase raises Inflation by 1.')}}
  }
  function syncCommerce(){const title=overlayTitle?.textContent.trim(),active=overlay.classList.contains('show')&&modal.classList.contains('commerceModal')&&(title==='TILE SHOP'||title==='MARKET');document.body.classList.remove('monoidCommerceActive');if(!active){ux.commerce=null;return}ux.commerce=title.toLowerCase();enhanceCommerceCopy(title);if(ux.mode==='tutorial')coach.hidden=true}

  function syncSystemsPhase(game){if(ux.tutorialKind!=='systems'||!game)return;const s=game.state();if(ux.systemsPhase==='circuit'&&!s.pendingCircuit&&Object.keys(s.circuitRanks||{}).length)ux.systemsPhase='mod';if(ux.systemsPhase==='power'&&s.pieces.some(p=>p.tile?.id===SYSTEMS_POWER_ID))ux.systemsPhase='complete'}
  function syncExperience(){
    document.title=document.title.replace(/^NOMON\b/,'MONOID');if(wordmark&&wordmark.textContent.trim()==='NOMON')wordmark.textContent='MONOID';
    const flow=gameFlow(),game=currentGame();
    if(flow.screen==='tutorial'&&game&&game!==lastTutorialGame){lastTutorialGame=game;ux.tutorialKind=tutorialController.kindFor(game)||'basics';ux.systemsPhase=ux.tutorialKind==='systems'?'circuit':null;ux.rotationSeen=false;rotationStart=game.state().rootRR||0;tutorialController.ensurePatch();if(ux.tutorialKind==='basics'){tutorialController.prepareHand(game,'d2-2');startTour()}else{hideCoach('tutorial');renderSystemsCoach()}}
    else if(flow.screen!=='tutorial'&&lastTutorialGame){lastTutorialGame=null;tutorialController.restorePatch();ux.tutorialKind=null;ux.systemsPhase=null;ux.rotationSeen=false}
    if(app.hidden&&ux.mode!=='idle'&&ux.mode!=='endlessBrief')hideCoach();
    tutorialController.ensurePatch();syncPendingDraw();syncTutorialHandVisuals();syncTutorialHandLocks();syncSystemsPhase(game);wrapEndlessButton();syncCommerce();
    if(flow.screen==='tutorial'&&ux.mode!=='tour')renderTutorialCoach();else if(flow.screen!=='tutorial'&&ux.mode==='tutorial')hideCoach();if(!coach.hidden)syncCoachRect()
  }
  function scheduleSync(){if(syncQueued)return;syncQueued=true;requestAnimationFrame(()=>{syncQueued=false;syncExperience()})}
  new MutationObserver(scheduleSync).observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});
  window.addEventListener('resize',scheduleSync);window.addEventListener('orientationchange',scheduleSync);scheduleSync()
})(window);
