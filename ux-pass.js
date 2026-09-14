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
  let coachKey='',pendingEndlessAction=null,commerceRectKey='',syncQueued=false;

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
    {title:'REBOUND',body:'Send the signal through Zero.\nWatch where it goes.'},
    {title:'THE MACHINE GROWS',body:'Shops buy supplies.\nMarkets change the build.'}
  ];

  function gameFlow(){return root.__monoidFlow||{screen:null,tutorialStep:null}}
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

  function renderTutorialCoach(){
    const flow=gameFlow();
    if(flow.screen!=='tutorial'){if(ux.mode==='tutorial')hideCoach();return}
    if(ux.mode==='tour')return;
    const commerce=overlay.classList.contains('show')&&modal.classList.contains('commerceModal');if(commerce){if(ux.mode==='tutorial')coach.hidden=true;return}
    const step=Math.max(0,Math.min(tutorialCopy.length-1,Number(flow.tutorialStep)||0)),copy=tutorialCopy[step];
    ux.mode='tutorial';highlight(document.querySelector('#hand .tile'));
    showCoach('tutorial',step,`LEARN MONOID · ${step+1}/${tutorialCopy.length}`,copy.title,copy.body,'<button id="monoidCoachLeave" data-ux-action="leave">LEAVE</button>')
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
    button.__monoidUxWrapped=true;button.onclick=function(e){const needsTour=localStorage.getItem(TOUR_KEY)!=='seen';const value=original.call(this,e);requestAnimationFrame(()=>{if(gameFlow().screen!=='tutorial')return;if(needsTour)startTour();else{ux.mode='tutorial';renderTutorialCoach()}});return value}
  }
  function wrapNewRunTrigger(button,{skipWhenSaved=false}={}){
    if(!button||button.__monoidBriefWrapped)return;const original=button.onclick;if(typeof original!=='function')return;
    button.__monoidBriefWrapped=true;button.onclick=function(e){const hadSaved=!!localStorage.getItem('iterion.activeRun.v1');const value=original.call(this,e);setTimeout(()=>{if(app.hidden||gameFlow().screen!=='game')return;if(skipWhenSaved&&hadSaved)return;showFirstBrief()},0);return value}
  }
  wrapTutorialTrigger(learn);wrapTutorialTrigger(replay);wrapNewRunTrigger(startRun);wrapNewRunTrigger(modeClassic,{skipWhenSaved:true});

  app.addEventListener('pointerdown',e=>{if(ux.mode==='firstBrief'&&!coach.contains(e.target))acknowledgeFirstBrief()},true);

  function wrapEndlessButton(){
    if(!overlay.classList.contains('show')||overlayTitle?.textContent.trim()!=='RUN COMPLETE'||!overlayPrimary?.textContent.includes('ENDLESS'))return;
    const current=overlayPrimary.onclick;if(typeof current!=='function'||current.__monoidEndlessWrapper)return;
    const wrapper=function(e){e?.preventDefault?.();e?.stopPropagation?.();showEndlessBrief(()=>current.call(overlayPrimary,e))};wrapper.__monoidEndlessWrapper=true;overlayPrimary.onclick=wrapper
  }

  function setText(el,text){if(el&&el.textContent.trim()!==text)el.textContent=text}
  function enhanceCommerceCopy(title){
    if(title==='SHOP'){
      setText(document.querySelector('.randomOffer p'),'Adds one new physical domino to your set.');
      const sections=[...document.querySelectorAll('.shopSection')],toolsIntro=sections[1]?.querySelector(':scope > p');setText(toolsIntro,'Stored until you use them. Each round already gives one free Reroll.');
      const intro=document.querySelector('.marketIntro');if(intro)intro.innerHTML='<strong>This is the real Shop.</strong> Supplies for this run. Market appears only between stages.';
      const foot=document.querySelector('.shopFoot');if(foot){const endless=document.body.classList.contains('endlessPalette');setText(foot,endless?'Each purchase raises Inflation. Endless Strain also raises prices.':'Each purchase raises Inflation by 1.')}
    }
    if(title==='MARKET'){
      const foot=document.querySelector('.shopFoot');if(foot){const endless=document.body.classList.contains('endlessPalette');setText(foot,endless?'Buy one mod, or leave it. Inflation and Endless Strain raise prices.':'Buy one mod, or leave it. Each purchase raises Inflation by 1.')}
    }
  }
  function clearCommerce(){document.body.classList.remove('monoidCommerceActive');ux.commerce=null;commerceRectKey=''}
  function syncCommerce(){
    const title=overlayTitle?.textContent.trim(),active=overlay.classList.contains('show')&&modal.classList.contains('commerceModal')&&(title==='SHOP'||title==='MARKET');
    if(!active){clearCommerce();return}
    const r=boardShell.getBoundingClientRect(),key=[title,r.left,r.top,r.width,r.height].map(v=>typeof v==='number'?Math.round(v*10)/10:v).join(':');
    document.body.classList.add('monoidCommerceActive');ux.commerce=title.toLowerCase();
    if(commerceRectKey!==key){commerceRectKey=key;modal.style.setProperty('--commerce-left',r.left+'px');modal.style.setProperty('--commerce-top',r.top+'px');modal.style.setProperty('--commerce-width',r.width+'px');modal.style.setProperty('--commerce-height',r.height+'px')}
    enhanceCommerceCopy(title);if(ux.mode==='tutorial')coach.hidden=true
  }

  function syncExperience(){
    document.title=document.title.replace(/^NOMON\b/,'MONOID');if(wordmark&&wordmark.textContent.trim()==='NOMON')wordmark.textContent='MONOID';
    if(app.hidden&&ux.mode!=='idle'&&ux.mode!=='endlessBrief')hideCoach();
    wrapEndlessButton();syncCommerce();
    if(gameFlow().screen==='tutorial'&&ux.mode!=='tour')renderTutorialCoach();else if(gameFlow().screen!=='tutorial'&&ux.mode==='tutorial')hideCoach();
    if(!coach.hidden)syncCoachRect()
  }
  function scheduleSync(){if(syncQueued)return;syncQueued=true;requestAnimationFrame(()=>{syncQueued=false;syncExperience()})}
  new MutationObserver(scheduleSync).observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});
  window.addEventListener('resize',scheduleSync);window.addEventListener('orientationchange',scheduleSync);
  scheduleSync()
})(window);
