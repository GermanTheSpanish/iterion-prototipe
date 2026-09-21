(function(root){
  'use strict';
  const doc=root.document;
  if(!doc||root.__monoidUiExtrasInstalled)return;
  root.__monoidUiExtrasInstalled=true;

  const BUILD_ID='20260915.4',MG=root.MonoidModGuidance;
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
    .titleCard h1{white-space:nowrap;transform:translate(-.6vw,-5.5dvh)}
    .titleCard h1 .titleLetter{display:inline-block;opacity:0;filter:blur(3px);animation:monoidLetterReveal .32s ease-out forwards}
    .titleCard h1 .titleLetter:nth-child(1){animation-delay:.52s}
    .titleCard h1 .titleLetter:nth-child(2){animation-delay:.26s}
    .titleCard h1 .titleLetter:nth-child(3){animation-delay:1.04s}
    .titleCard h1 .titleLetter:nth-child(4){animation-delay:1.30s}
    .titleCard h1 .titleLetter:nth-child(5){animation-delay:.78s}
    .titleCard h1 .titleLetter:nth-child(6){animation-delay:0s}
    @keyframes monoidLetterReveal{to{opacity:1;filter:blur(0)}}
    .tutorialHub .tutorialHubIntro{margin:10px 0 12px;color:var(--muted);font-size:13px;line-height:1.45}
    .tutorialHub .tutorialChoice{display:block;width:100%;padding:13px 0;border:0;border-top:1px solid var(--line);background:none;color:inherit;text-align:left}
    .tutorialHub .tutorialChoice strong{display:block;font-size:15px;letter-spacing:.05em}
    .tutorialHub .tutorialChoice small{display:block;margin-top:4px;color:var(--muted);font-size:12px;line-height:1.35}
    #modifierTutorialDialog{position:fixed;inset:0;width:100vw;max-width:none;height:100dvh;max-height:none;margin:0;padding:calc(24px + env(safe-area-inset-top)) max(20px,calc((100vw - 390px)/2)) calc(18px + env(safe-area-inset-bottom));border:0;border-radius:0;background:var(--bg);color:var(--ink);overflow:hidden}
    #modifierTutorialDialog[open]{display:grid;grid-template-rows:auto auto minmax(128px,1fr) auto auto auto;align-content:stretch}
    #modifierTutorialDialog::backdrop{background:var(--bg)}
    .modifierTutorKicker{display:block;color:var(--muted);font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}
    .modifierTutorTitle{margin:7px 0 0;font-size:clamp(28px,8vw,34px);font-weight:760;line-height:1;letter-spacing:.035em}
    .modifierTutorVisual{display:flex;align-items:center;justify-content:center;min-height:0;margin:15px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);overflow:hidden}
    .modifierTutorGameTile{display:grid;place-items:center;width:110px;height:150px}
    .modifierTutorGameTile .domino{transform:scale(1.55);transform-origin:center}
    .modifierTutorGameTile .tileModMark{font-size:14px!important;font-weight:950!important;color:rgba(21,21,21,.86)!important}
    .modifierTutorMachine{display:grid;grid-template-columns:54px 12px 54px 12px 54px 12px 54px;grid-template-rows:54px auto;align-items:center;justify-content:center;column-gap:2px;row-gap:8px;width:100%}
    .modifierTutorMachineTile{display:grid;place-items:center;width:54px;height:54px;overflow:visible}
    .modifierTutorMachineTile .domino{transform:rotate(90deg) scale(.68);transform-origin:center}
    .modifierTutorLink{width:12px;height:1px;background:var(--ink);opacity:.45}
    .modifierTutorMachine strong{grid-column:1/-1;color:var(--muted);font-size:10px;letter-spacing:.12em;text-align:center}
    .modifierTutorBody{margin:0;color:var(--ink);font-size:16px;line-height:1.42}
    .modifierTutorNote{margin:9px 0 0;color:var(--muted);font-size:12px;line-height:1.38}
    .modifierTutorActions{display:grid;grid-template-columns:auto 1fr;gap:8px;margin-top:16px;padding-top:10px;border-top:1px solid var(--line)}
    .modifierTutorActions button{appearance:none;min-height:48px;padding:9px 14px;border:0;border-radius:3px;background:transparent;color:inherit;font:750 12px/1 inherit;letter-spacing:.04em}
    .modifierTutorActions .modifierBack{padding-left:2px;padding-right:12px;color:var(--muted);text-align:left}
    .modifierTutorActions .modifierNext{background:var(--ink);color:var(--paper)}
    .modifierTutorActions button:focus{outline:none}
    .modifierTutorActions button:focus-visible{outline:1px solid var(--ink);outline-offset:2px}
    .boardCoachLayer.tour .boardCoachActions{grid-template-columns:1fr auto!important;align-items:center!important}
    .boardCoachLayer.tour .boardCoachActions span{order:1!important;color:var(--ink)!important;font-size:12px!important;font-weight:850!important;letter-spacing:.09em!important;text-align:left!important}
    .boardCoachLayer.tour .boardCoachActions button[data-ux-action="leave"]{order:2!important;min-height:36px!important;padding:5px 7px!important;border:0!important;color:var(--muted)!important;font-size:9px!important;font-weight:650!important;opacity:.48}
    .tutorialPanel button{border-color:transparent!important;background:transparent!important;color:var(--muted)!important;font-size:9px!important;font-weight:650!important;opacity:.48!important}
    #nextModifiersFromBasics,#nextModifiersTutorial{letter-spacing:.04em}
    @media(max-height:700px){
      .titleCard h1{transform:translate(-.6vw,-4.5dvh)}
      #modifierTutorialDialog{padding-top:calc(16px + env(safe-area-inset-top));padding-bottom:calc(12px + env(safe-area-inset-bottom))}
      #modifierTutorialDialog[open]{grid-template-rows:auto auto minmax(104px,1fr) auto auto auto}
      .modifierTutorTitle{font-size:27px}.modifierTutorVisual{margin:10px 0}.modifierTutorGameTile{height:112px}.modifierTutorGameTile .domino{transform:scale(1.35)}.modifierTutorBody{font-size:14px}.modifierTutorActions{margin-top:10px}.modifierTutorActions button{min-height:44px}
    }
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

  function tuneGameplayChrome(){const menu=$('menuButton');if(menu){menu.textContent='MENU';menu.setAttribute('aria-label','Open game menu')}}

  let tutorialHub=null,modifierDialog=null,modifierStep=0;
  const modifierSteps=[
    {id:'terminal',title:'MODS LIVE ON TILES',body:'A Market Mod belongs to one physical tile. It stays installed even if its condition later turns off.',note:'Hold any Modded tile to see BUILD, REWARD and whether it is active now.'},
    {id:'corner',title:'BUILD → REWARD',body:'Build the condition around the tile, then the Mod changes what that tile contributes when the signal activates it.',note:'CORNER uses physical neighbours: exactly two at a right angle gives ×3.'},
    {id:'zero-port',title:'SOME MODS CHANGE SIGNALS',body:'Not every Mod is a multiplier. ZERO PORT links two Zero tiles so the signal teleports instead of rebounding.',note:'The Inspector shows the exact rule and the live state.'},
    {id:'long-run',title:'SOME MODS CHANGE THE MACHINE',body:'LONG CHAIN belongs to the machine, not one domino. A route through 10+ unique tiles makes every activated Star pay once.',note:'You do not need to memorise 28 Mods. Read the Market, then inspect what you install.'}
  ];
  const P={0:[],1:[[50,50]],2:[[28,28],[72,72]],3:[[28,28],[50,50],[72,72]],4:[[28,28],[72,28],[28,72],[72,72]],5:[[28,28],[72,28],[50,50],[28,72],[72,72]],6:[[28,23],[72,23],[28,50],[72,50],[28,77],[72,77]]};
  const pips=n=>(P[n]||[]).map(([x,y])=>`<i class="spip" style="left:${x}%;top:${y}%"></i>`).join('');
  function dominoMarkup(a,b,abbr='',cls=''){
    const mark=abbr?`<i class="tileModMark ${cls}" style="--mod-shift:0px" aria-hidden="true"><span>${abbr[0]}</span><span>${abbr[1]}</span></i>`:'';
    return`<div class="domino"><div class="half"><div class="spips">${pips(a)}</div></div><div class="half"><div class="spips">${pips(b)}</div></div>${mark}</div>`
  }
  function modifierVisual(step){
    return MG?.diagramHtml?.(step.id,false)||`<div class="modifierTutorGameTile"><strong>${step.title}</strong></div>`
  }

  function ensureTutorialHub(){
    if(tutorialHub)return tutorialHub;
    tutorialHub=doc.createElement('dialog');tutorialHub.id='tutorialHub';tutorialHub.className='gameMenu tutorialHub';
    tutorialHub.innerHTML='<div class="menuHead"><h2>Tutorials</h2><button class="iconButton" aria-label="Close tutorials">×</button></div><p class="tutorialHubIntro">Learn the language, then discover the systems as you need them.</p><button class="tutorialChoice" data-tutorial="basics"><strong>BASICS · 2 MIN</strong><small>Placement, signal, parity, Zero, rebound and T-Split.</small></button><button class="tutorialChoice" data-tutorial="modifiers"><strong>MODIFIERS · 2 MIN</strong><small>How Market Mods live on tiles: BUILD → REWARD.</small></button><button class="tutorialChoice" data-tutorial="systems"><strong>GAME MECHANICS · 3 MIN</strong><small>Circuits, machine modifiers and POWER.</small></button>';
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
    modifierDialog.querySelector('.modifierTutorKicker').textContent=`MODIFIERS · ${modifierStep+1}/${modifierSteps.length}`;
    modifierDialog.querySelector('.modifierTutorTitle').textContent=step.title;
    modifierDialog.querySelector('.modifierTutorVisual').innerHTML=modifierVisual(step);
    modifierDialog.querySelector('.modifierTutorBody').textContent=step.body;
    modifierDialog.querySelector('.modifierTutorNote').textContent=step.note;
    const back=modifierDialog.querySelector('.modifierBack'),next=modifierDialog.querySelector('.modifierNext');
    back.textContent=modifierStep?'BACK':'CLOSE';next.textContent=modifierStep===modifierSteps.length-1?'DONE':'NEXT';
  }
  function ensureModifierDialog(){
    if(modifierDialog)return modifierDialog;
    modifierDialog=doc.createElement('dialog');modifierDialog.id='modifierTutorialDialog';
    modifierDialog.innerHTML='<span class="modifierTutorKicker"></span><h2 class="modifierTutorTitle"></h2><div class="modifierTutorVisual"></div><p class="modifierTutorBody"></p><p class="modifierTutorNote"></p><div class="modifierTutorActions"><button class="modifierBack">BACK</button><button class="modifierNext">NEXT</button></div>';
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
    const basicsDone=ux.tutorialKind==='basics'&&overlay?.classList.contains('show')&&overlayTitle?.textContent.trim()==='TILE SHOP'&&overlayPrimary?.textContent.trim()==='FINISH';
    let next=$('nextModifiersFromBasics');
    if(basicsDone&&!next){next=doc.createElement('button');next.id='nextModifiersFromBasics';next.className='secondary';next.textContent='NEXT · MODIFIERS';overlayPrimary.parentElement?.insertBefore(next,overlayPrimary.nextSibling);next.addEventListener('click',()=>waitForSelectionThen(()=>openModifierTutorial(0)))}
    if(!basicsDone&&next)next.remove();

    if(coach){const kicker=coach.querySelector('.boardCoachKicker');if(kicker?.textContent.startsWith('SYSTEMS ·'))kicker.textContent=kicker.textContent.replace(/^SYSTEMS/,'GAME MECHANICS')}
    const systemsDone=ux.tutorialKind==='systems'&&ux.systemsPhase==='complete'&&coach&&!coach.hidden;
    let nextMods=$('nextModifiersTutorial');
    if(systemsDone&&!nextMods){const actions=coach.querySelector('.boardCoachActions');if(actions){nextMods=doc.createElement('button');nextMods.id='nextModifiersTutorial';nextMods.className='primary';nextMods.textContent='NEXT · MODIFIERS';actions.prepend(nextMods);nextMods.addEventListener('click',event=>{event.stopPropagation();waitForSelectionThen(()=>openModifierTutorial(0))});const finish=actions.querySelector('[data-ux-action="systems-finish"]');finish?.classList.remove('primary')}}
    if(!systemsDone&&nextMods)nextMods.remove()
  }

  installBuildStamp();animateTitle();tuneGameplayChrome();installTutorialHubButton();
  ensureTutorialHub();ensureModifierDialog();
  new MutationObserver(syncTutorialContinuations).observe(doc.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden'],characterData:true});
  syncTutorialContinuations();
})(window);
