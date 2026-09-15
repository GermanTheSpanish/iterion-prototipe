(function(root){
  'use strict';
  const $=id=>document.getElementById(id);
  const app=document.querySelector('.app'),board=$('board'),boardShell=document.querySelector('.boardShell'),handRail=document.querySelector('.handRail'),overlay=$('overlay'),modal=overlay?.querySelector('.modal'),overlayTitle=$('overlayTitle'),overlayPrimary=$('overlayPrimary');
  const learn=$('learnMonoid'),replay=$('replayTutorial'),startRun=$('startRun'),modeClassic=$('modeClassic'),leaveTutorial=$('leaveTutorial');
  if(!app||!board||!boardShell||!overlay||!modal)return;

  const TOUR_KEY='monoid.uiTour.v1',FIRST_BRIEF_KEY='monoid.firstRunBriefing.v1';
  const ux={mode:'idle',tourStep:null,commerce:null};
  Object.defineProperty(root,'__monoidUx',{configurable:true,get:()=>({...ux})});

  document.title=document.title.replace(/^NOMON\b/,'MONOID');
  const wordmark=document.querySelector('.wordmark');if(wordmark&&wordmark.textContent.trim()==='NOMON')wordmark.textContent='MONOID';

  const coach=document.createElement('section');
  coach.id='monoidBoardCoach';coach.className='boardCoachLayer';coach.hidden=true;coach.setAttribute('role','dialog');coach.setAttribute('aria-live','polite');
  document.body.appendChild(coach);
  let coachKey='',pendingEndlessAction=null,syncQueued=false,lastTutorialGame=null,tutorialPatch=null;

  const tour=[
    {title:'THE MACHINE',body:'This is your machine.\nEverything you build stays here.',target:()=>board},
    {title:'TARGET',body:'Beat this number before you run out of moves.',target:()=>$('targetDetail')},
    {title:'SCORE',body:'Every tile you place sends a signal through the machine.',target:()=>$('scoreDetail')},
    {title:'MOVES',body:'Seven moves. Make them count.',target:()=>document.querySelector('.movesMeta')},
    {title:'HAND',body:'These are the tiles you can play.',target:()=>handRail}
  ];
  const tutorialCopy=[
    {title:'THE FIRST TILE',body:'Every machine starts with a Double.\nPlace it.'},
    {title:'MAKE A CONNECTION',body:'Matching numbers touch.\nConnect the 2.'},
    {title:'BUILD THE SIGNAL',body:'EVEN adds. ODD multiplies.\nConnect the 3.'},
    {title:'ZERO',body:"Zero doesn't score.\nIt turns the signal back. Connect the 4."},
    {title:'REBOUND',body:'Start from the other end.\nHit Zero — then watch the signal come all the way back.'},
    {title:'EXTEND THE ARM',body:'Keep building from the rebound end.\nMake the machine longer.'},
    {title:'T-SPLIT',body:'Now enter the Double from the side.\nWith both ends connected, the signal splits in two.'}
  ];
  const tutorialTileIds=new Set(['d2-2','d2-3','d3-4','d0-4','d2-5','d5-6','d2-6']);

  function gameFlow(){return root.__monoidFlow||{screen:null,tutorialStep:null}}
  function currentGame(){return root.__monoidGame||null}
  function tutorialRoot(game){return game?.state?.().pieces.find(p=>p.tile?.id==='d2-2')||null}
  function tutorialSim(game,tile,c,n=0){
    const E=root.IterionEngine,D=root.IterionData,s=game.state(),p=E.pieceFrom(tile,c.x,c.y,0,c.rr,100000+n);p.tile={...tile};
    return E.bestSignal(p.id,[...s.pieces,p],{initialOutput:tile.a+tile.b,bifurcate:D.BIFURCATION_ENABLED})
  }
  function tutorialPlacement(step,E){
    const x=Math.floor(E.G/2)-1;
    return[
      {tileId:'d2-2',x,y:4,rr:1},
      {tileId:'d2-3',x,y:8,rr:1},
      {tileId:'d3-4',x,y:12,rr:1},
      {tileId:'d0-4',x,y:18,rr:3},
      {tileId:'d2-5',x,y:2,rr:3}
    ][step]||null
  }
  function prepareTutorialHand(game,tileId){
    const D=root.IterionData,s=game.state(),tile=s.set.find(t=>t.id===tileId);if(!tile)return;
    const placed=new Set((s.pieces||[]).map(p=>p.tile?.id).filter(Boolean));
    const primaryPool=s.set.filter(t=>!placed.has(t.id)&&t.id!==tileId&&!tutorialTileIds.has(t.id));
    const fallbackPool=s.set.filter(t=>!placed.has(t.id)&&t.id!==tileId&&tutorialTileIds.has(t.id));
    const decoys=[...primaryPool,...fallbackPool].slice(0,Math.max(0,D.HAND_SIZE-1));
    s.hand=[tile,...decoys];while(s.hand.length<D.HAND_SIZE)s.hand.push(null);
    const inHand=new Set(s.hand.filter(Boolean).map(t=>t.id));
    s.reserve=s.set.filter(t=>!placed.has(t.id)&&!inHand.has(t.id));
    s.blocked=false;s.needsReroll=false;s.cleared=false;s.running=false
  }
  function restoreTutorialPatch(){
    if(!tutorialPatch)return;const{game,candidates,openShop,finishPlacement}=tutorialPatch;
    game.candidatesForIndex=candidates;game.openShop=openShop;game.finishPlacement=finishPlacement;tutorialPatch=null
  }
  function ensureTutorialPatch(){
    const flow=gameFlow(),game=currentGame();if(flow.screen!=='tutorial'||!game)return;
    if(tutorialPatch?.game===game)return;restoreTutorialPatch();
    const candidates=game.candidatesForIndex,openShop=game.openShop,finishPlacement=game.finishPlacement;
    tutorialPatch={game,candidates,openShop,finishPlacement};
    game.candidatesForIndex=function(i){
      const E=root.IterionEngine,step=gameFlow().tutorialStep,s=game.state(),tile=s.hand[i],rootPiece=tutorialRoot(game);
      if(i!==0)return[];
      if(step===0&&!rootPiece&&tile&&s.rootRR!==1)game.setRootRotation(1);
      const list=candidates(i),spec=tutorialPlacement(step,E);
      if(!tile)return[];
      if(spec&&tile.id===spec.tileId)return list.filter(c=>c.x===spec.x&&c.y===spec.y&&c.rr===spec.rr);
      if(step===5&&s.turn<6&&tile.id==='d5-6'){
        const rebound=s.pieces.find(p=>p.tile?.id==='d2-5');if(!rebound)return[];
        return list.filter(c=>E.axis(c.rr)===rebound.axis&&(c.contacts||[]).some(contact=>contact.piece?.id===rebound.id&&contact.kind==='full')&&!(c.contacts||[]).some(contact=>contact.piece?.id===rootPiece?.id))
      }
      if(step===5&&s.turn>=6&&tile.id==='d2-6'){
        return list.filter((c,n)=>{
          const sideEntry=E.axis(c.rr)!==rootPiece?.axis&&(c.contacts||[]).some(contact=>contact.piece?.id===rootPiece?.id&&String(contact.kind||'').startsWith('double-'));
          const sim=sideEntry?tutorialSim(game,tile,c,n):null;
          return sideEntry&&!!sim?.events?.some(e=>e.type==='signal-fork'&&e.piece===rootPiece?.id)
        })
      }
      return[]
    };
    game.openShop=function(...args){
      if(gameFlow().screen==='tutorial'&&gameFlow().tutorialStep===5&&game.state().turn<7)return true;
      return openShop(...args)
    };
    game.finishPlacement=function(ctx){
      const step=gameFlow().tutorialStep,result=finishPlacement(ctx);
      if(gameFlow().screen!=='tutorial'||!result?.ok)return result;
      if(step===3)queueMicrotask(()=>{if(gameFlow().tutorialStep===4&&currentGame()===game)prepareTutorialHand(game,'d2-5')});
      if(step===4)queueMicrotask(()=>{if(gameFlow().tutorialStep===5&&currentGame()===game){game.config.TARGETS[0]=1e9;prepareTutorialHand(game,'d5-6')}});
      if(step===5){
        const rootPiece=tutorialRoot(game),split=ctx?.sim?.events?.some(e=>e.type==='signal-fork'&&e.piece===rootPiece?.id);
        if(split){const state=game.state();state.cleared=false;openShop()}
        else if(game.state().turn===6)queueMicrotask(()=>{if(gameFlow().tutorialStep===5&&currentGame()===game)prepareTutorialHand(game,'d2-6')})
      }
      return result
    }
  }

  let drawTrack={game:null,running:false,stable:[],pending:new Set(),revealScheduled:false};
  function handIds(game){return(game?.state?.().hand||[]).map(t=>t?.id||null)}
  function pendingDomino(slotIndex){return document.querySelectorAll('#hand .handSlot')[slotIndex]?.querySelector('.domino')||null}
  function forcePendingDrawBack(){
    for(const i of drawTrack.pending){const domino=pendingDomino(i);if(domino){domino.classList.add('back');domino.classList.remove('reveal')}}
  }
  function syncPendingDraw(){
    const game=currentGame();if(!game)return;const s=game.state(),ids=handIds(game),running=!!s.running;
    if(drawTrack.game!==game){drawTrack={game,running,stable:ids.slice(),pending:new Set(),revealScheduled:false};return}
    if(running){
      ids.forEach((id,i)=>{if(id!==drawTrack.stable[i])drawTrack.pending.add(i)});
      forcePendingDrawBack();drawTrack.revealScheduled=false
    }else if(drawTrack.running||drawTrack.pending.size){
      forcePendingDrawBack();
      if(!drawTrack.revealScheduled){
        drawTrack.revealScheduled=true;
        requestAnimationFrame(()=>{
          const live=currentGame();if(!live||live!==drawTrack.game||live.state().running){drawTrack.revealScheduled=false;return}
          const slots=[...drawTrack.pending];drawTrack.pending.clear();drawTrack.stable=handIds(live);drawTrack.running=false;drawTrack.revealScheduled=false;
          for(const i of slots){const domino=pendingDomino(i);if(!domino)continue;domino.classList.remove('back');domino.classList.add('reveal');setTimeout(()=>domino.classList.remove('reveal'),420)}
        })
      }
    }else drawTrack.stable=ids.slice();
    drawTrack.running=running
  }
  function clearHighlights(){document.querySelectorAll('.monoidTourHighlight').forEach(el=>el.classList.remove('monoidTourHighlight'))}
  function highlight(el){clearHighlights();if(el)el.classList.add('monoidTourHighlight')}
  function syncCoachRect(){
    if(coach.hidden)return;const r=board.getBoundingClientRect(),key=[r.left,r.top,r.width,r.height].map(n=>Math.round(n*10)/10).join(':');
    if(coach.dataset.rectKey===key)return;coach.dataset.rectKey=key;Object.assign(coach.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'})
  }
  function coachMarkup(kicker,title,body,actions=''){
    return `<div class="boardCoachCard"><span class="boardCoachKicker">${kicker}</span><h2>${title}</h2><p>${body}</p>${actions?`<div class="boardCoachActions">${actions}</div>`:''}</div>`
  }
  function showCoach(mode,key,kicker,title,body,actions=''){
    ux.mode=mode;coach.hidden=false;coach.className=`boardCoachLayer ${mode}`;
    const nextKey=`${mode}:${key}`;if(coachKey!==nextKey){coachKey=nextKey;coach.innerHTML=coachMarkup(kicker,title,body,actions)}
    syncCoachRect();
  }
  function hideCoach(nextMode='idle'){
    coach.hidden=true;coachKey='';ux.mode=nextMode;if(nextMode!=='tour')ux.tourStep=null;clearHighlights();document.body.classList.remove('monoidTourActive')
  }

  function renderTour(){
    const step=tour[ux.tourStep];if(!step)return finishTour();
    document.body.classList.add('monoidTourActive');highlight(step.target());
    showCoach('tour',ux.tourStep,`LEARN MONOID · ${ux.tourStep+1}/${tour.length}`,step.title,step.body,'<button data-ux-action="leave">LEAVE</button><span>TAP TO CONTINUE</span>')
  }
  function startTour(){ux.tourStep=0;renderTour()}
  function advanceTour(){if(ux.mode!=='tour')return;if(ux.tourStep<tour.length-1){ux.tourStep++;renderTour();return}finishTour()}
  function finishTour(){localStorage.setItem(TOUR_KEY,'seen');document.body.classList.remove('monoidTourActive');ux.mode='tutorial';ux.tourStep=null;renderTutorialCoach()}

  function syncTutorialHandLocks(){
    const active=gameFlow().screen==='tutorial';
    document.querySelectorAll('#hand .tile').forEach((button,index)=>{
      const locked=active&&index!==0;button.classList.toggle('tutorialLocked',locked);
      if(locked){button.disabled=true;button.setAttribute('aria-disabled','true');button.setAttribute('aria-label',(button.getAttribute('aria-label')||'Domino')+' Tutorial: use the highlighted tile.')}
    })
  }
  function positionTutorialCoach(game){
    const E=root.IterionEngine,tile=game?.state?.().hand?.[0],candidate=game?.candidatesForIndex?.(0)?.[0];
    if(!tile||!candidate)return;const p=E.pieceFrom(tile,candidate.x,candidate.y,0,candidate.rr,-1),centreY=(p.rect.miny+p.rect.maxy)/2;
    coach.classList.toggle('coachBottom',centreY<E.H*.56)
  }
  function renderTutorialCoach(){
    const flow=gameFlow();
    if(flow.screen!=='tutorial'){if(ux.mode==='tutorial')hideCoach();return}
    if(ux.mode==='tour')return;
    const commerce=overlay.classList.contains('show')&&modal.classList.contains('commerceModal');if(commerce){if(ux.mode==='tutorial')coach.hidden=true;return}
    const game=currentGame(),step=Math.max(0,Math.min(5,Number(flow.tutorialStep)||0)),turn=game?.state?.().turn||0,copyIndex=step===5?(turn<6?5:6):step,copy=tutorialCopy[copyIndex];
    ux.mode='tutorial';syncTutorialHandLocks();highlight(document.querySelector('#hand .tile:not(.tutorialLocked)')||document.querySelector('#hand .tile'));
    showCoach('tutorial',copyIndex,`LEARN MONOID · ${copyIndex+1}/${tutorialCopy.length}`,copy.title,copy.body,'<button id="monoidCoachLeave" data-ux-action="leave">LEAVE</button>');
    positionTutorialCoach(game)
  }

  function showFirstBrief(){
    if(localStorage.getItem(FIRST_BRIEF_KEY)==='seen'||app.hidden)return;
    highlight(board);
    showCoach('firstBrief','rules','FIRST RUN','BUILD. ROUTE. SCORE.','Match equal numbers to build the machine.\nEvery move sends a signal through it.\n\nEVEN adds. ODD multiplies. ZERO rebounds.\n\nBeat the TARGET before your moves run out.\nYour machine survives the round.','<button class="primary" data-ux-action="start-first">START</button><small>? opens the Rulebook anytime.</small>')
  }
  function acknowledgeFirstBrief(){localStorage.setItem(FIRST_BRIEF_KEY,'seen');hideCoach()}

  function showEndlessBrief(action){
    pendingEndlessAction=action;overlay.classList.add('monoidUxSuppressed');highlight(board);
    showCoach('endlessBrief','endless','ENDLESS','THE MACHINE CONTINUES.','You beat MONOID. There is no finish line now.\n\nTargets grow ×5 every round.\nYour machine, tiles, modifiers and coins carry on.\n\nWhen the set runs dry, stronger POWER tiles enter.','<button class="primary" data-ux-action="enter-endless">ENTER ENDLESS</button><button data-ux-action="back-endless">BACK</button>')
  }
  function enterEndless(){const action=pendingEndlessAction;pendingEndlessAction=null;overlay.classList.remove('monoidUxSuppressed');hideCoach();if(action)action()}
  function backEndless(){pendingEndlessAction=null;overlay.classList.remove('monoidUxSuppressed');hideCoach()}

  coach.addEventListener('click',e=>{
    const action=e.target.closest('[data-ux-action]')?.dataset.uxAction;
    if(action==='leave'){e.stopPropagation();leaveTutorial?.click();return}
    if(action==='start-first'){acknowledgeFirstBrief();return}
    if(action==='enter-endless'){enterEndless();return}
    if(action==='back-endless'){backEndless();return}
    if(ux.mode==='tour')advanceTour()
  });

  function wrapTutorialTrigger(button){
    if(!button||button.__monoidUxWrapped)return;const original=button.onclick;if(typeof original!=='function')return;
    button.__monoidUxWrapped=true;button.onclick=function(e){const value=original.call(this,e);requestAnimationFrame(scheduleSync);return value}
  }
  function wrapNewRunTrigger(button,{skipWhenSaved=false}={}){
    if(!button||button.__monoidBriefWrapped)return;const original=button.onclick;if(typeof original!=='function')return;
    button.__monoidBriefWrapped=true;button.onclick=function(e){const hadSaved=!!localStorage.getItem('iterion.activeRun.v1');const value=original.call(this,e);setTimeout(()=>{if(app.hidden||gameFlow().screen!=='game')return;if(skipWhenSaved&&hadSaved)return;showFirstBrief()},0);return value}
  }
  wrapTutorialTrigger(learn);wrapTutorialTrigger(replay);wrapNewRunTrigger(startRun);wrapNewRunTrigger(modeClassic,{skipWhenSaved:true});

  app.addEventListener('pointerdown',e=>{
    if(ux.mode==='firstBrief'&&!coach.contains(e.target)){acknowledgeFirstBrief();return}
    if(ux.mode==='tour'&&handRail.contains(e.target))finishTour()
  },true);

  function wrapEndlessButton(){
    if(localStorage.getItem('iterion.entryBypass.v1')==='true')return;
    if(!overlay.classList.contains('show')||overlayTitle?.textContent.trim()!=='RUN COMPLETE'||!overlayPrimary?.textContent.includes('ENDLESS'))return;
    const current=overlayPrimary.onclick;if(typeof current!=='function'||current.__monoidEndlessWrapper)return;
    const wrapper=function(e){e?.preventDefault?.();e?.stopPropagation?.();showEndlessBrief(()=>current.call(overlayPrimary,e))};wrapper.__monoidEndlessWrapper=true;overlayPrimary.onclick=wrapper
  }

  function setText(el,text){if(el&&el.textContent.trim()!==text)el.textContent=text}
  function enhanceCommerceCopy(title){
    if(title==='SHOP'){
      setText(document.querySelector('.randomOffer p'),'Adds one new physical domino to your set.');
      const sections=[...document.querySelectorAll('.shopSection')],toolsIntro=sections[1]?.querySelector(':scope > p');setText(toolsIntro,'Stored until you use them. Each round already gives one free Reroll.');
      const intro=document.querySelector('.marketIntro'),introText='This is the real Shop. Supplies for this run. Market appears only between stages.';if(intro&&intro.textContent.trim()!==introText)intro.innerHTML='<strong>This is the real Shop.</strong> Supplies for this run. Market appears only between stages.';
      const foot=document.querySelector('.shopFoot');if(foot){const endless=document.body.classList.contains('endlessPalette');setText(foot,endless?'Each purchase raises Inflation. Endless Strain raises prices; Undo removes that placement’s Strain.':'Each purchase raises Inflation by 1.')}
    }
    if(title==='MARKET'){
      const foot=document.querySelector('.shopFoot');if(foot){const endless=document.body.classList.contains('endlessPalette');setText(foot,endless?'Buy one mod, or leave it. Inflation and Endless Strain raise prices.':'Buy one mod, or leave it. Each purchase raises Inflation by 1.')}
    }
  }
  function clearCommerce(){document.body.classList.remove('monoidCommerceActive');ux.commerce=null}
  function syncCommerce(){
    const title=overlayTitle?.textContent.trim(),active=overlay.classList.contains('show')&&modal.classList.contains('commerceModal')&&(title==='SHOP'||title==='MARKET');
    document.body.classList.remove('monoidCommerceActive');
    if(!active){ux.commerce=null;return}
    ux.commerce=title.toLowerCase();enhanceCommerceCopy(title);if(ux.mode==='tutorial')coach.hidden=true
  }

  function syncExperience(){
    document.title=document.title.replace(/^NOMON\b/,'MONOID');if(wordmark&&wordmark.textContent.trim()==='NOMON')wordmark.textContent='MONOID';
    const flow=gameFlow(),game=currentGame();
    if(flow.screen==='tutorial'&&game&&game!==lastTutorialGame){lastTutorialGame=game;ensureTutorialPatch();prepareTutorialHand(game,'d2-2');startTour()}
    else if(flow.screen!=='tutorial'&&lastTutorialGame){lastTutorialGame=null;restoreTutorialPatch()}
    if(app.hidden&&ux.mode!=='idle'&&ux.mode!=='endlessBrief')hideCoach();
    ensureTutorialPatch();syncPendingDraw();syncTutorialHandLocks();wrapEndlessButton();syncCommerce();
    if(flow.screen==='tutorial'&&ux.mode!=='tour')renderTutorialCoach();else if(flow.screen!=='tutorial'&&ux.mode==='tutorial')hideCoach();
    if(!coach.hidden)syncCoachRect()
  }
  function scheduleSync(){if(syncQueued)return;syncQueued=true;requestAnimationFrame(()=>{syncQueued=false;syncExperience()})}
  new MutationObserver(scheduleSync).observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});
  window.addEventListener('resize',scheduleSync);window.addEventListener('orientationchange',scheduleSync);
  scheduleSync()
})(window);
