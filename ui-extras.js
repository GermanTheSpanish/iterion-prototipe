(function(root){
  'use strict';
  const doc=root.document;
  if(!doc||root.__monoidUiExtrasInstalled)return;
  root.__monoidUiExtrasInstalled=true;

  const BUILD_ID='20260915.3';
  const $=id=>doc.getElementById(id);
  const titleCard=$('titleCard'),selection=$('gameSelection'),entryFlow=$('entryFlow'),firstRunChoice=$('firstRunChoice');
  const learn=$('learnMonoid'),replay=$('replayTutorial'),systems=$('systemsTutorial'),leaveTutorial=$('leaveTutorial');
  const overlay=$('overlay'),overlayTitle=$('overlayTitle'),overlayPrimary=$('overlayPrimary');
  const coach=$('monoidBoardCoach');
  const version=`v${root.IterionData?.VERSION||'dev'} · build ${BUILD_ID}`;
  root.__MONOID_BUILD=BUILD_ID;

  const style=doc.createElement('style');
  style.id='monoid-ui-extras';
  style.textContent=`
    #devBuildStamp{position:absolute;right:14px;bottom:max(8px,env(safe-area-inset-bottom));z-index:3;color:var(--muted);font:600 9px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.04em;opacity:.62;pointer-events:none}
    .menuBuildStamp{margin:12px 0 0!important;color:var(--muted)!important;font:600 10px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace!important;letter-spacing:.04em}
    #replayTutorial,#systemsTutorial{display:none!important}
    .titleCard h1{white-space:nowrap;transform:translateX(-.6vw)}
    .titleCard h1 .titleLetter{display:inline-block;opacity:0;filter:blur(4px);animation:monoidLetterReveal .24s ease-out forwards}
    .titleCard h1 .titleLetter:nth-child(1){animation-delay:.36s}
    .titleCard h1 .titleLetter:nth-child(2){animation-delay:.18s}
    .titleCard h1 .titleLetter:nth-child(3){animation-delay:.72s}
    .titleCard h1 .titleLetter:nth-child(4){animation-delay:.90s}
    .titleCard h1 .titleLetter:nth-child(5){animation-delay:.54s}
    .titleCard h1 .titleLetter:nth-child(6){animation-delay:0s}
    @keyframes monoidLetterReveal{to{opacity:1;filter:blur(0)}}
    .tutorialHub .tutorialHubIntro{margin:10px 0 12px;color:var(--muted);font-size:13px;line-height:1.45}
    .tutorialHub .tutorialChoice{display:block;width:100%;padding:13px 0;border:0;border-top:1px solid var(--line);background:none;color:inherit;text-align:left}
    .tutorialHub .tutorialChoice strong{display:block;font-size:15px;letter-spacing:.05em}
    .tutorialHub .tutorialChoice small{display:block;margin-top:4px;color:var(--muted);font-size:12px;line-height:1.35}
    #modifierTutorialDialog{width:min(390px,calc(100% - 24px));padding:20px;border:1px solid var(--line);border-radius:6px;background:var(--paper);color:var(--ink)}
    #modifierTutorialDialog::backdrop{background:rgba(245,245,241,.92)}
    .modifierTutorKicker{display:block;color:var(--muted);font-size:10px;font-weight:800;letter-spacing:.13em;text-transform:uppercase}
    .modifierTutorTitle{margin:7px 0 0;font-size:26px;line-height:1;letter-spacing:.05em}
    .modifierTutorVisual{display:flex;align-items:center;justify-content:center;min-height:146px;margin:18px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
    .modifierTutorDomino{position:relative;display:flex;flex-direction:column;width:62px;height:122px;border:2px solid var(--ink);border-radius:5px;background:#fff;color:#151515;overflow:hidden}
    .modifierTutorDomino>span{display:flex;align-items:center;justify-content:center;flex:1;font:750 22px/1 ui-monospace,SFMono-Regular,Menlo,monospace}.modifierTutorDomino>span+span{border-top:2px solid #151515}
    .modifierTutorMark{position:absolute;inset:0;display:grid;place-items:center;font:900 18px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.02em;pointer-events:none}
    .modifierTutorRoute{display:grid;gap:8px;width:min(280px,86%);font:750 13px/1.25 ui-monospace,SFMono-Regular,Menlo,monospace;text-align:center}.modifierTutorRoute b{font-size:20px;letter-spacing:.12em}.modifierTutorRoute i{height:2px;background:var(--ink);opacity:.7}
    .modifierTutorBody{min-height:90px;margin:0;color:var(--muted);font-size:15px;line-height:1.48}
    .modifierTutorActions{display:grid;grid-template-columns:auto 1fr;gap:7px;margin-top:16px}.modifierTutorActions button{min-height:46px;border:1px solid var(--line);border-radius:4px;background:transparent;color:inherit;font:750 12px/1 inherit}.modifierTutorActions .modifierNext{background:var(--ink);color:var(--paper);border-color:var(--ink)}
    .boardCoachLayer.tour .boardCoachActions{grid-template-columns:1fr auto!important;align-items:center!important}
    .boardCoachLayer.tour .boardCoachActions span{order:1!important;color:var(--ink)!important;font-size:12px!important;font-weight:850!important;letter-spacing:.09em!important;text-align:left!important}
    .boardCoachLayer.tour .boardCoachActions button[data-ux-action="leave"]{order:2!important;min-height:36px!important;padding:5px 7px!important;border:0!important;color:var(--muted)!important;font-size:9px!important;font-weight:650!important;opacity:.48}
    .tutorialPanel button{border-color:transparent!important;background:transparent!important;color:var(--muted)!important;font-size:9px!important;font-weight:650!important;opacity:.48!important}
    #nextGameMechanics,#nextModifiersTutorial{letter-spacing:.04em}
    @media(prefers-reduced-motion:reduce){.titleCard h1 .titleLetter{opacity:1;filter:none;animation:none}}
  `;
  doc.head.appendChild(style);

  function installBuildStamp(){
    if(entryFlow&&!$('devBuildStamp')){const stamp=doc.createElement('div');stamp.id='devBuildStamp';stamp.textContent=version;entryFlow.appendChild(stamp)}
    const menu=$('gameMenu');if(menu&&!menu.querySelector('.menuBuildStamp')){const p=doc.createElement('p');p.className='menuBuildStamp';p.textContent=version;menu.appendChild(p)}
  }

  function animateTitle(){
    const h1=titleCard?.querySelector('h1');if(!h1||h1.dataset.monoidAnimated)return;
    h1.dataset.monoidAnimated='true';h1.setAttribute('aria-label','MONOID');h1.innerHTML='MONOID'.split('').map(letter=>`<span class="titleLetter" aria-hidden="true">${letter}</span>`).join('')
  }

  let tutorialHub=null,modifierDialog=null,modifierStep=0;
  const modifierSteps=[
    {abbr:'DD',title:'DOUBLE DOUBLE',values:['4','4'],body:'A physical non-zero Double can carry DD. On its first activation each Move, both halves apply. Later passes in that Move use the normal Double operation.'},
    {abbr:'DE',title:'DOUBLE ECHO',values:['3','3'],body:'On this physical non-zero Double’s first activation each Move, an Echo copies the current Score and follows the already chosen downstream route once. Final Score is Main + Echo. Echoes cannot create Echoes.'},
    {abbr:'ZM',title:'ZERO MEMORY',values:['0','5'],body:'On this physical Zero’s first rebound each Move, repeat the immediately preceding non-zero scoring operation exactly once, then continue the normal rebound.'},
    {abbr:'LC',title:'LONG CHAIN',route:true,body:'LONG CHAIN modifies the whole machine. At 10+ unique routed tiles, every starred physical tile activated on that route pays its tier once. In Endless, the full payout lasts 7 qualifying Moves.'}
  ];

  function ensureTutorialHub(){
    if(tutorialHub)return tutorialHub;
    tutorialHub=doc.createElement('dialog');tutorialHub.id='tutorialHub';tutorialHub.className='gameMenu tutorialHub';
    tutorialHub.innerHTML='<div class="menuHead"><h2>Tutorials</h2><button class="iconButton" aria-label="Close tutorials">×</button></div><p class="tutorialHubIntro">Choose what you want to learn.</p><button class="tutorialChoice" data-tutorial="basics"><strong>BASICS · 2 MIN</strong><small>Placement, routing, Zero, rebound and T-Split.</small></button><button class="tutorialChoice" data-tutorial="systems"><strong>GAME MECHANICS · 3 MIN</strong><small>Circuits, machine modifiers and POWER.</small></button><button class="tutorialChoice" data-tutorial="modifiers"><strong>MODIFIERS · 2 MIN</strong><small>DD, DE, ZM and Long Chain.</small></button>';
    doc.body.appendChild(tutorialHub);
    tutorialHub.querySelector('.iconButton').addEventListener('click',()=>tutorialHub.close());
    tutorialHub.addEventListener('click',event=>{
      const choice=event.target.closest('[data-tutorial]')?.dataset.tutorial;if(!choice)return;
      tutorialHub.close();
      if(choice==='basics')replay?.click();
      else if(choice==='systems')systems?.click();
      else openModifierTutorial(0)
    });
    return tutorialHub
  }
  function openTutorialHub(){ensureTutorialHub();if(!tutorialHub.open)tutorialHub.showModal()}

  function renderModifierTutorial(){
    if(!modifierDialog)return;const step=modifierSteps[modifierStep];
    const visual=step.route?'<div class="modifierTutorRoute"><b>★ — ★ — ★ — ★</b><i></i><span>10+ UNIQUE TILES</span></div>':`<div class="modifierTutorDomino"><span>${step.values[0]}</span><span>${step.values[1]}</span><b class="modifierTutorMark">${step.abbr}</b></div>`;
    modifierDialog.querySelector('.modifierTutorKicker').textContent=`MODIFIERS · ${modifierStep+1}/${modifierSteps.length}`;
    modifierDialog.querySelector('.modifierTutorTitle').textContent=step.title;
    modifierDialog.querySelector('.modifierTutorVisual').innerHTML=visual;
    modifierDialog.querySelector('.modifierTutorBody').textContent=step.body;
    const back=modifierDialog.querySelector('.modifierBack'),next=modifierDialog.querySelector('.modifierNext');
    back.textContent=modifierStep?'BACK':'CLOSE';next.textContent=modifierStep===modifierSteps.length-1?'DONE':'NEXT';
  }
  function ensureModifierDialog(){
    if(modifierDialog)return modifierDialog;
    modifierDialog=doc.createElement('dialog');modifierDialog.id='modifierTutorialDialog';
    modifierDialog.innerHTML='<span class="modifierTutorKicker"></span><h2 class="modifierTutorTitle"></h2><div class="modifierTutorVisual"></div><p class="modifierTutorBody"></p><div class="modifierTutorActions"><button class="modifierBack">BACK</button><button class="modifierNext">NEXT</button></div>';
    doc.body.appendChild(modifierDialog);
    modifierDialog.querySelector('.modifierBack').addEventListener('click',()=>{if(modifierStep===0){modifierDialog.close();return}modifierStep--;renderModifierTutorial()});
    modifierDialog.querySelector('.modifierNext').addEventListener('click',()=>{if(modifierStep===modifierSteps.length-1){modifierDialog.close();return}modifierStep++;renderModifierTutorial()});
    return modifierDialog
  }
  function openModifierTutorial(step=0){modifierStep=Math.max(0,Math.min(modifierSteps.length-1,step));ensureModifierDialog();renderModifierTutorial();if(!modifierDialog.open)modifierDialog.showModal()}

  function installTutorialHubButton(){
    if(!selection||!replay||!systems)return;
    replay.hidden=true;systems.hidden=true;
    let button=$('tutorialHubButton');if(!button){button=doc.createElement('button');button.id='tutorialHubButton';button.className='entrySecondary';button.textContent='TUTORIALS';selection.insertBefore(button,replay);button.addEventListener('click',openTutorialHub)}
    if(learn){learn.textContent='TUTORIALS';learn.onclick=event=>{event?.preventDefault?.();openTutorialHub()}}
    syncTutorialEntryButtons()
  }
  function syncTutorialEntryButtons(){const button=$('tutorialHubButton');if(!button)return;const hidden=!!firstRunChoice&&!firstRunChoice.hidden;if(button.hidden!==hidden)button.hidden=hidden}

  function waitForSelectionThen(action){
    leaveTutorial?.click();let tries=0;const tick=()=>{if(selection&&!selection.hidden){action();return}if(tries++<30)setTimeout(tick,40)};setTimeout(tick,0)
  }

  function syncTutorialContinuations(){
    syncTutorialEntryButtons();
    const ux=root.__monoidUx||{};
    const basicsDone=ux.tutorialKind==='basics'&&overlay?.classList.contains('show')&&overlayTitle?.textContent.trim()==='SHOP'&&overlayPrimary?.textContent.trim()==='FINISH';
    let next=$('nextGameMechanics');
    if(basicsDone&&!next){next=doc.createElement('button');next.id='nextGameMechanics';next.className='secondary';next.textContent='NEXT · GAME MECHANICS';overlayPrimary.parentElement?.insertBefore(next,overlayPrimary.nextSibling);next.addEventListener('click',()=>waitForSelectionThen(()=>systems?.click()))}
    if(!basicsDone&&next)next.remove();

    if(coach){const kicker=coach.querySelector('.boardCoachKicker');if(kicker?.textContent.startsWith('SYSTEMS ·'))kicker.textContent=kicker.textContent.replace(/^SYSTEMS/,'GAME MECHANICS')}
    const systemsDone=ux.tutorialKind==='systems'&&ux.systemsPhase==='complete'&&coach&&!coach.hidden;
    let nextMods=$('nextModifiersTutorial');
    if(systemsDone&&!nextMods){const actions=coach.querySelector('.boardCoachActions');if(actions){nextMods=doc.createElement('button');nextMods.id='nextModifiersTutorial';nextMods.className='primary';nextMods.textContent='NEXT · MODIFIERS';actions.prepend(nextMods);nextMods.addEventListener('click',event=>{event.stopPropagation();waitForSelectionThen(()=>openModifierTutorial(0))});const finish=actions.querySelector('[data-ux-action="systems-finish"]');finish?.classList.remove('primary')}}
    if(!systemsDone&&nextMods)nextMods.remove()
  }

  installBuildStamp();animateTitle();installTutorialHubButton();
  ensureTutorialHub();ensureModifierDialog();
  new MutationObserver(syncTutorialContinuations).observe(doc.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden'],characterData:true});
  syncTutorialContinuations();
})(window);
