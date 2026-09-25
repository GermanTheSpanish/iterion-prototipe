(function(root){
  'use strict';
  const doc=root.document;
  if(!doc||doc.getElementById('monoid-ui-runtime-fixes'))return;
  const style=doc.createElement('style');
  style.id='monoid-ui-runtime-fixes';
  style.textContent=`
    /* Preserve the established physical modifier rendering in gameplay. */
    .app .tileModMark{font-weight:900!important;line-height:.9!important;color:rgba(21,21,21,.68)!important}
    .app .piece>.tileModMark{font-size:8px!important}
    .app .domino>.tileModMark{font-size:11px!important}
    .app .powerTile:not(.circuitTile)>.tileModMark{color:rgba(21,21,21,.72)!important}
    .app .circuitTile>.tileModMark{color:rgba(255,255,255,.82)!important}

    /* Compact visually without sacrificing 44px mobile touch targets. */
    .app{grid-template-rows:44px minmax(80px,auto) 30px minmax(0,1fr) auto!important}
    .gameHeader{min-height:44px!important}
    .headerActions{height:44px!important}
    .gameHeader .helpButton{width:44px!important;height:44px!important}
    #menuButton{min-width:44px!important;height:44px!important}
    .app .label,.app .hint,.app .scoreCaption{font-size:max(11px,1em)}
    .app .btn{min-height:44px!important}

    /* Mod guidance: one compact visual language shared by Inspector and Market. */
    .modGuideCard{margin:0!important;padding:0 0 12px!important;border:0!important;background:transparent!important}
    .modGuideCard+ .modGuideCard{padding-top:12px!important;border-top:1px solid var(--line)!important}
    .modGuideCard>header{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:6px}
    .modGuideCard>header>strong{font-size:15px;letter-spacing:.035em}
    .modGuideStatus{font-size:10px;font-weight:850;line-height:1;letter-spacing:.1em;white-space:nowrap}
    .modGuideStatus.inactive,.modGuideStatus.spent{opacity:.48}.modGuideStatus.ready,.modGuideStatus.machine{opacity:.72}
    .modGuideRules{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:9px}
    .modGuideRules small{display:block;margin-bottom:3px;color:var(--muted);font-size:9px;font-weight:850;letter-spacing:.13em}
    .modGuideRules p{margin:0!important;font-size:12px!important;line-height:1.32!important}
    .modGuideLive{margin:8px 0 0!important;padding:7px 8px!important;border-left:2px solid var(--ink);font-size:11px!important;line-height:1.3!important}
    .modGuideNote{margin:7px 0 0!important;color:var(--muted);font-size:10px!important;line-height:1.3!important}
    .modExactRule{margin-top:8px;font-size:10px;color:var(--muted)}
    .modExactRule summary{min-height:32px;display:flex;align-items:center;cursor:pointer;font-weight:750;letter-spacing:.05em}
    .modExactRule p{margin:2px 0 0!important;font-size:10px!important;line-height:1.35!important}
    .modDiagram{position:relative;display:flex;align-items:center;justify-content:center;width:100%;height:76px;margin:8px 0 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);overflow:hidden;color:var(--ink)}
    .modDiagram.compact{height:42px;margin:5px 0 7px;border-top:0;border-bottom:0}
    .modDiagramLine{gap:8px;font-size:11px;letter-spacing:.02em}.modDiagramLine b{font-size:12px;font-weight:850}.modDiagramLine i{font-style:normal;color:var(--muted)}
    .modDiagramShape .modCore{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:grid;place-items:center;width:34px;height:28px;border:1px solid var(--ink);border-radius:3px;font-size:11px;font-weight:900;letter-spacing:-.04em;background:var(--paper);z-index:2}
    .modDiagramShape .modNode{position:absolute;display:grid;place-items:center;width:19px;height:15px;border:1px solid var(--line);border-radius:2px;background:var(--paper);font-style:normal;font-size:8px;font-weight:900}
    .modDiagramShape .modNode.n{left:50%;top:5px;transform:translateX(-50%)}.modDiagramShape .modNode.s{left:50%;bottom:5px;transform:translateX(-50%)}
    .modDiagramShape .modNode.w{left:calc(50% - 58px);top:50%;transform:translateY(-50%)}.modDiagramShape .modNode.e{right:calc(50% - 58px);top:50%;transform:translateY(-50%)}
    .modDiagramShape .modNode.ww{left:calc(50% - 88px);top:50%;transform:translateY(-50%)}.modDiagramShape .modNode.ee{right:calc(50% - 88px);top:50%;transform:translateY(-50%)}
    .modDiagramShape:before,.modDiagramShape:after{content:'';position:absolute;left:50%;top:50%;width:104px;height:1px;background:var(--line);transform:translate(-50%,-50%)}
    .pattern-corner:after,.pattern-overload:after,.pattern-fan:after,.pattern-frame:after,.pattern-crown:after,.pattern-knot:after{width:1px;height:56px}
    .pattern-terminal:before,.pattern-coupler:before{width:52px;transform:translate(-100%,-50%)}
    .pattern-pair:before{width:1px;height:36px;transform:translate(-50%,0)}
    .pattern-frontier:after{content:'OPEN';width:auto;height:auto;left:50%;top:6px;background:transparent;color:var(--muted);font-size:7px;font-weight:800;letter-spacing:.12em;transform:translateX(-50%)}
    .pattern-relay .modNode,.pattern-coupler .modNode{border-width:2px}
    .modDiagram.compact .modCore{width:28px;height:22px;font-size:9px}.modDiagram.compact .modNode{width:15px;height:12px;font-size:7px}
    .modDiagram.compact .modNode.n{top:2px}.modDiagram.compact .modNode.s{bottom:2px}.modDiagram.compact .modNode.w{left:calc(50% - 47px)}.modDiagram.compact .modNode.e{right:calc(50% - 47px)}
    .modDiagram.compact .modNode.ww{left:calc(50% - 70px)}.modDiagram.compact .modNode.ee{right:calc(50% - 70px)}
    @media(max-width:390px),(max-height:700px){.modGuideRules{gap:8px}.modGuideRules p{font-size:11px!important}.modDiagram{height:66px}.modGuideLive{font-size:10px!important}}
    @media(max-height:700px){
      .app{grid-template-rows:44px minmax(70px,auto) 28px minmax(0,1fr) auto!important}
      .gameHeader,.headerActions{min-height:44px!important;height:44px!important}
      .gameHeader .helpButton,#menuButton{height:44px!important}
      .app .label,.app .hint,.app .scoreCaption{font-size:11px!important}
      .app .btn{min-height:44px!important}
    }
  `;
  doc.head.appendChild(style);

  function installGameplayUi(){
    if(root.__monoidGameplayUiPassInstalled)return;
    root.__monoidGameplayUiPassInstalled=true;
    const $=id=>doc.getElementById(id);

    const gameplayStyle=doc.createElement('style');
    gameplayStyle.id='monoid-gameplay-ui-pass';
    gameplayStyle.textContent=`
      /* Figma-approved gameplay composition. Presentation only: no engine geometry changes. */
      .app{width:min(100%,430px)!important;padding:calc(8px + env(safe-area-inset-top)) 10px calc(10px + env(safe-area-inset-bottom))!important;grid-template-rows:44px 122px 38px minmax(0,1fr) auto!important;gap:0!important}
      .gameHeader{position:relative!important;min-height:44px!important;height:44px!important;display:flex!important;align-items:center!important;justify-content:flex-start!important}
      .wordmark{position:fixed!important;left:50vw!important;top:calc(8px + env(safe-area-inset-top) + 22px)!important;transform:translate(-50%,-50%)!important;width:clamp(118px,30vw,132px)!important;display:flex!important;align-items:center!important;justify-content:space-between!important;font-size:16px!important;font-weight:700!important;letter-spacing:0!important;line-height:1!important;color:#171717!important;pointer-events:none!important}
      .headerActions{position:relative!important;z-index:3!important;width:100%!important;height:44px!important;display:flex!important;align-items:center!important;justify-content:flex-start!important}
      #menuButton{width:92px!important;min-width:92px!important;height:44px!important;min-height:44px!important;padding:0 16px!important;border:4px solid transparent!important;border-radius:16px!important;background:#111!important;background-clip:padding-box!important;color:#fff!important;font-size:15px!important;font-weight:750!important;line-height:36px!important;letter-spacing:.055em!important;text-align:center!important}
      /* Compatibility target for old automated flows; real Help lives inside MENU. */
      .gameHeader #helpButton{position:absolute!important;left:auto!important;right:0!important;top:0!important;width:44px!important;min-width:44px!important;height:44px!important;min-height:44px!important;padding:0!important;border:0!important;opacity:0!important;overflow:hidden!important}

      .scoreStrip{display:grid!important;grid-template-columns:1fr 1fr!important;gap:20px!important;align-items:stretch!important}
      .scoreCard{position:relative!important;min-width:0!important;min-height:0!important;padding:17px 0 8px!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;text-align:right!important}
      .targetCard{text-align:left!important}
      .scoreCard .label{display:block!important;font-size:11px!important;font-weight:500!important;line-height:1!important;letter-spacing:.23em!important;color:#65635f!important}
      .scoreValue{display:block!important;margin:17px 0 0!important;font-size:clamp(46px,14vw,62px)!important;font-weight:390!important;line-height:.82!important;letter-spacing:-.035em!important;overflow:visible!important;text-overflow:clip!important}
      .scoreCard:not(.targetCard) .scoreValue{padding-bottom:0!important;border-bottom:0!important}
      .scoreCaption{display:block!important;margin-top:5px!important;min-height:16px!important;font-size:14px!important;font-weight:400!important;line-height:1.15!important;color:#67645f!important}
      .scoreProgress{display:block!important;position:relative!important;height:1px!important;margin:8px 0 0!important;background:#d4d2cc!important;overflow:hidden!important}
      .scoreProgressTrack{display:block!important;height:1px!important;background:#d4d2cc!important;overflow:hidden!important}
      .scoreProgressFill{display:block!important;height:1px!important}
      .scoreProgressNext{display:none!important}

      .metaStrip{display:block!important;min-height:38px!important;padding:8px 0 7px!important;border-top:0!important;border-bottom:1px solid #d4d2cc!important}
      .roundMeta{display:flex!important;align-items:baseline!important;gap:22px!important;font-size:14px!important;font-weight:500!important;line-height:1!important;letter-spacing:.01em!important;white-space:nowrap!important}
      .roundMeta>strong,.stageMeta>strong{font-size:14px!important;font-weight:500!important}
      .stageMeta{color:#67645f!important}
      .movesMeta{display:none!important}

      .gameArea{min-height:0!important;display:grid!important;grid-template-columns:minmax(0,1fr) 52px!important;gap:8px!important;align-items:start!important;overflow:hidden!important;padding-top:10px!important}
      .boardShell{position:relative!important;min-width:0!important;min-height:0!important;width:100%!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;overflow:visible!important;display:block!important}
      .boardTop{display:none!important}
      .boardTop:has(.machineModStatus:not([hidden])){position:absolute!important;left:0!important;right:0!important;top:-20px!important;z-index:18!important;display:flex!important;justify-content:center!important;padding:0!important;pointer-events:none!important}
      .boardTop>strong,.boardTop>#boardsize{display:none!important}
      .boardFrame{display:block!important;width:100%!important;min-height:0!important;overflow:visible!important}
      .board{position:relative!important;width:min(100%,350px,calc((100dvh - 280px) * .75))!important;max-width:350px!important;height:auto!important;max-height:none!important;flex:none!important;aspect-ratio:3 / 4!important;margin:0!important;border:1px solid #d4d2cc!important;border-radius:0!important;background-color:#fff!important;background-image:none!important;box-shadow:none!important;overflow:hidden!important}
      body.endlessPalette .board{background-color:rgb(214,211,203)!important}
      .board.dragging{box-shadow:inset 0 0 0 1px rgba(17,17,17,.15)!important}
      .boardCenterMark{position:absolute;z-index:3;display:block;background:#aaa8a2;pointer-events:none}
      .boardCenterMark[data-side="top"],.boardCenterMark[data-side="bottom"]{left:50%;width:1px;height:10px;transform:translateX(-50%)}
      .boardCenterMark[data-side="top"]{top:-1px}.boardCenterMark[data-side="bottom"]{bottom:-1px}
      .boardCenterMark[data-side="left"],.boardCenterMark[data-side="right"]{top:50%;width:10px;height:1px;transform:translateY(-50%)}
      .boardCenterMark[data-side="left"]{left:-1px}.boardCenterMark[data-side="right"]{right:-1px}
      .circuitChoice{pointer-events:none!important}

      .handRail{min-height:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;overflow:visible!important;display:flex!important;flex-direction:column!important;align-items:stretch!important}
      .handHeader{height:22px!important;padding:0!important;display:flex!important;align-items:flex-start!important;justify-content:center!important}
      .handHeader .label{font-size:11px!important;font-weight:500!important;letter-spacing:.21em!important;color:#65635f!important}
      .hand{display:flex!important;flex:1!important;min-height:0!important;flex-direction:column!important;justify-content:flex-start!important;gap:7px!important}
      .handSlot{height:71px!important;min-height:71px!important;flex:0 0 71px!important;display:flex!important;align-items:flex-start!important;justify-content:center!important;border-radius:0!important}
      .handRail .tile{width:48px!important;padding:0!important}
      .handRail .domino{width:40px!important;border-radius:6px!important}
      .handRail .domino>.half{width:38px!important;height:38px!important;max-height:none!important}

      .bottomBar{display:grid!important;grid-template-columns:1fr!important;grid-template-rows:auto auto!important;gap:10px!important;align-items:stretch!important;min-height:0!important;padding-top:10px!important}
      .hint{display:block!important;min-height:22px!important;margin:0!important;overflow:visible!important;text-align:center!important;font-size:14px!important;font-weight:400!important;line-height:1.25!important;color:#67645f!important;-webkit-line-clamp:unset!important}
      .railActions{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr)) minmax(0,1.25fr)!important;gap:6px!important;width:100%!important}
      .railActions .btn{min-width:0!important;min-height:60px!important;height:60px!important;padding:8px 4px!important;border:1px solid #d4d2cc!important;border-radius:6px!important;background:transparent!important;color:#171717!important;font-size:15px!important;font-weight:750!important;line-height:1.05!important;text-transform:uppercase!important;box-shadow:none!important}
      .railActions .btn small{display:block!important;margin-top:6px!important;font-size:11px!important;font-weight:450!important;line-height:1!important;text-transform:none!important;color:#67645f!important}
      .railActions .btn:disabled{opacity:1!important}
      .railActions .btn:disabled small{color:#96938d!important}
      #shopButton{border-color:#111!important;background:#111!important;color:#fff!important}
      #shopButton small{color:#e5e5e1!important}

      @media(max-height:720px){
        .app{padding-top:calc(5px + env(safe-area-inset-top))!important;padding-bottom:calc(6px + env(safe-area-inset-bottom))!important;grid-template-rows:40px 86px 32px minmax(0,1fr) auto!important}
        .gameHeader,.headerActions{height:40px!important;min-height:40px!important}
        #menuButton{height:44px!important;min-height:44px!important;line-height:36px!important}
        .wordmark{top:calc(5px + env(safe-area-inset-top) + 20px)!important;font-size:14px!important;width:118px!important}
        .scoreCard{padding-top:8px!important}.scoreValue{margin-top:9px!important;font-size:38px!important}.scoreCaption{font-size:11px!important;margin-top:3px!important}.scoreProgress{margin-top:5px!important}
        .metaStrip{min-height:32px!important;padding:6px 0!important}.roundMeta,.roundMeta>strong,.stageMeta>strong{font-size:12px!important}
        .gameArea{grid-template-columns:minmax(0,1fr) 48px!important;gap:6px!important;padding-top:7px!important}.board{width:min(100%,350px,calc((100dvh - 255px) * .75))!important}
        .handHeader{height:18px!important}.handHeader .label{font-size:11px!important}.hand{gap:4px!important}.handSlot{height:58px!important;min-height:58px!important;flex-basis:58px!important}.handRail .tile{width:44px!important}.handRail .domino{width:34px!important}.handRail .domino>.half{width:32px!important;height:32px!important}
        .bottomBar{gap:6px!important;padding-top:6px!important}.hint{min-height:18px!important;font-size:11px!important}.railActions{gap:5px!important}.railActions .btn{height:48px!important;min-height:48px!important;font-size:12px!important}.railActions .btn small{margin-top:4px!important;font-size:9px!important}
      }
    `;
    doc.head.appendChild(gameplayStyle);

    function ensureBoardMarks(){
      const board=$('board');if(!board)return;
      for(const side of ['top','right','bottom','left'])if(!board.querySelector(`.boardCenterMark[data-side="${side}"]`)){
        const mark=doc.createElement('i');mark.className='boardCenterMark';mark.dataset.side=side;mark.setAttribute('aria-hidden','true');board.appendChild(mark)
      }
    }
    function ensureMenuHelp(){
      const menu=$('gameMenu'),legacy=$('helpButton'),anchor=$('gameSelectionButton');if(!menu||!legacy||!anchor)return;
      legacy.tabIndex=-1;legacy.setAttribute('aria-hidden','true');
      let button=$('menuHelpButton');if(!button){button=doc.createElement('button');button.id='menuHelpButton';button.className='menuAction';button.textContent='Rulebook';menu.insertBefore(button,anchor);button.addEventListener('click',()=>{if(menu.open)menu.close();legacy.click()})}
    }
    function syncActionLabels(){
      const game=root.__monoidGame;if(!game?.state)return;const state=game.state(),remaining=Math.max(0,(game.maxPlacements?.()||0)-(state.roundTurn||0));
      const move=$('moveTool'),reroll=$('reroll'),undo=$('undoTool'),shop=$('shopButton');
      const moveHtml=`${remaining} MOVES<small>ADD +1 · ${state.consumables?.move||0}</small>`;
      const rerollSub=state.freeReroll?'FREE':String(state.consumables?.reroll||0),rerollHtml=`REROLL<small>${rerollSub}</small>`;
      const undoHtml=`UNDO<small>${state.consumables?.undo||0}</small>`,shopHtml=`SHOP<small>${state.coins||0} coins</small>`;
      if(move&&move.innerHTML!==moveHtml)move.innerHTML=moveHtml;if(reroll&&reroll.innerHTML!==rerollHtml)reroll.innerHTML=rerollHtml;if(undo&&undo.innerHTML!==undoHtml)undo.innerHTML=undoHtml;if(shop&&shop.innerHTML!==shopHtml)shop.innerHTML=shopHtml
    }
    function syncMenu(){const menu=$('menuButton');if(menu&&menu.textContent!=='MONOID')menu.textContent='MONOID'}
    let queued=false;
    function sync(){queued=false;ensureBoardMarks();ensureMenuHelp();syncMenu();syncActionLabels()}
    function schedule(){if(queued)return;queued=true;root.requestAnimationFrame(sync)}
    new MutationObserver(schedule).observe(doc.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','hidden','disabled']});
    root.addEventListener('resize',schedule);root.addEventListener('pageshow',schedule);
    root.MonoidGameplayUi=Object.freeze({sync,ensureBoardMarks});
    sync();installPhaseA()
  }

  function installPhaseA(){
    if(root.__monoidPhaseAInstalled)return;
    root.__monoidPhaseAInstalled=true;
    const BUILD_ID='20260925.1';
    const COMPACT_THRESHOLD=50000;
    const UNITS=['K','M','B','T','Qa','Qi','Sx','Sp','Oc','No','Dc'];
    const $=id=>doc.getElementById(id);
  
    function exact(value){
      value=Number(value);
      return Number.isFinite(value)?Math.round(value).toLocaleString('en-US',{maximumFractionDigits:0}):String(value)
    }
    function scientific(value){
      value=Number(value);
      return Number.isFinite(value)?value.toExponential(2).replace(/\.00e/,'e').replace(/(\.\d)0e/,'$1e').replace('e+','e'):String(value)
    }
    function trimNumber(value,decimals){
      return Number(value.toFixed(decimals)).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:decimals})
    }
    function compactPrimary(value){
      value=Number(value);if(!Number.isFinite(value))return String(value);
      const sign=value<0?'-':'',n=Math.abs(value);if(n<COMPACT_THRESHOLD)return exact(value);
      if(n>=1e27)return sign+scientific(n);
      let tier=Math.max(0,Math.min(UNITS.length-1,Math.floor(Math.log10(n)/3)-1));
      let divisor=10**((tier+1)*3),scaled=n/divisor;
      if(scaled>=999.5&&tier<UNITS.length-1){tier++;divisor*=1000;scaled=n/divisor}
      const decimals=scaled<10?2:scaled<100?1:0;
      return sign+trimNumber(scaled,decimals)+UNITS[tier]
    }
    function parseVisibleNumber(text){
      const raw=String(text||'').trim();if(!raw)return NaN;
      if(/^-?[\d,]+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(raw))return Number(raw.replace(/,/g,''));
      const match=raw.match(/^(-?[\d,]+(?:\.\d+)?)(K|M|B|T|Qa|Qi|Sx|Sp|Oc|No|Dc)$/);
      if(!match)return NaN;
      const tier=UNITS.indexOf(match[2]);if(tier<0)return NaN;
      return Number(match[1].replace(/,/g,''))*10**((tier+1)*3)
    }
  
    const style=doc.createElement('style');
    style.id='monoid-phase-a-ui';
    style.textContent=`
      /* Phase A: stable mobile hierarchy. Presentation only. */
      .gameHeader{position:relative!important}
      .gameHeader .wordmark{position:absolute!important;left:var(--phase-a-wordmark-x,50%)!important;top:50%!important;transform:translate(-50%,-50%)!important;color:var(--ink)!important}
  
      .scoreValue{max-width:100%!important;white-space:nowrap!important;font-variant-numeric:tabular-nums!important}
      .scoreCaption{color:var(--muted)!important}
      .scoreCard .label{color:var(--muted)!important}
      .scoreProgress{height:4px!important;margin-top:8px!important;background:var(--line)!important;overflow:hidden!important}
      .scoreProgressTrack{height:4px!important;background:var(--line)!important}
      .scoreProgressFill{height:4px!important;min-height:4px!important}
  
      /* Tile identity remains primary: large, quiet modifier letters sit behind full-strength pips. */
      .app .tileModMark{z-index:5!important;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif!important;font-weight:950!important;line-height:.76!important;letter-spacing:-.065em!important;color:rgba(17,17,17,.40)!important;text-shadow:none!important}
      .app .piece>.tileModMark{font-size:clamp(16px,4.6vw,20px)!important}
      .app .domino>.tileModMark{font-size:24px!important}
      .app .piece:has(>.tileModMark)>.cube,.app .domino:has(>.tileModMark)>.half{z-index:6!important}
      .app .piece:has(>.tileModMark) .pips,.app .domino:has(>.tileModMark) .spips{opacity:1!important;z-index:7!important}
      .app .circuitTile>.tileModMark{color:rgba(255,255,255,.40)!important;text-shadow:none!important}
  
      /* Shop is contextual, not the dominant gameplay CTA. */
      .railActions #shopButton{background:transparent!important;color:var(--ink)!important;border-color:currentColor!important}
      .railActions #shopButton small{color:var(--muted)!important}
  
      /* Market: current assignment belongs with the action, not inside the random pool. */
      .commerceModal .marketOfferAction .marketAssignedGroup{width:100%!important;align-items:flex-end!important;gap:4px!important;margin:0 0 4px!important}
      .commerceModal .marketOfferAction .marketAssignedGroup .marketContextLabel{width:100%!important;text-align:right!important}
      .commerceModal .marketOfferAction .marketAssignedGroup .marketContextTiles{width:100%!important;justify-content:flex-end!important}
      .commerceModal .marketOfferAction .marketAssignedGroup .marketTile{padding:2px!important;border-radius:4px!important}
  
      /* Endless inversion: restore contrast in the HUD and make POWER a dark coloured material. */
      body.endlessPalette .wordmark,body.endlessPalette .scoreValue,body.endlessPalette .roundMeta,body.endlessPalette .roundMeta>strong{color:var(--ink)!important}
      body.endlessPalette .scoreCard .label,body.endlessPalette .scoreCaption,body.endlessPalette .stageMeta,body.endlessPalette .handHeader .label,body.endlessPalette .hint{color:var(--muted)!important}
      body.endlessPalette .railActions .btn{background:transparent!important;color:var(--ink)!important;border-color:#66665f!important}
      body.endlessPalette .railActions .btn small{color:var(--muted)!important}
      body.endlessPalette .railActions .btn:disabled{color:#8b8a83!important;border-color:#3f3f3a!important}
      body.endlessPalette .railActions .btn:disabled small{color:#72716b!important}
      body.endlessPalette .powerTile.power2{--power-pale:#243d55!important}
      body.endlessPalette .powerTile.power3{--power-pale:#45304f!important}
      body.endlessPalette .powerTile.power4{--power-pale:#66551f!important}
      body.endlessPalette .domino.powerTile:not(.circuitTile),body.endlessPalette .piece.powerTile:not(.circuitTile){color:#f5f2e9!important;border-color:#807c73!important}
      body.endlessPalette .powerTile:not(.circuitTile) .pip,body.endlessPalette .powerTile:not(.circuitTile) .spip{background:#f5f2e9!important}
      body.endlessPalette .powerTile:not(.circuitTile) .half+.half,body.endlessPalette .piece.powerTile:not(.circuitTile).h .cube+.cube,body.endlessPalette .piece.powerTile:not(.circuitTile).v .cube+.cube{border-color:#8e897f!important}
      body.endlessPalette .app .powerTile:not(.circuitTile)>.tileModMark{color:rgba(255,255,255,.40)!important}
  
      body.endlessPalette.monoidCommerceActive .commerceModal{background:#171716!important;color:var(--ink)!important;border-color:#41413c!important}
      body.endlessPalette .commerceModal .shopHero,body.endlessPalette .commerceModal .marketStructuredOffer,body.endlessPalette .commerceModal .marketDesc,body.endlessPalette .commerceModal .randomOffer{border-color:#41413c!important}
      body.endlessPalette .commerceModal .marketOfferDescription,body.endlessPalette .commerceModal .marketContextLabel,body.endlessPalette .commerceModal .marketActionReason,body.endlessPalette .commerceModal .shopFoot,body.endlessPalette .commerceModal .shopInflation,body.endlessPalette .commerceModal .shopSupply{color:#aaa9a1!important}
      body.endlessPalette .commerceModal .marketContextTiles .marketTile,body.endlessPalette .commerceModal .marketOfferAction .marketAssignedGroup .marketTile,body.endlessPalette .commerceModal .randomTilePreview{background:#d8d5cc!important;border-radius:4px!important}
      body.endlessPalette .commerceModal .marketContextTiles .marketTile{padding:2px!important}
      body.endlessPalette .commerceModal .randomTilePreview{padding:4px!important}
      body.endlessPalette .commerceModal .marketOfferAction .shopBuy:not(:disabled){background:#f0eee7!important;color:#171715!important;border-color:#f0eee7!important}
      body.endlessPalette .commerceModal .marketOfferAction .shopBuy:disabled{background:transparent!important;color:#85847d!important;border-color:#55554f!important}
  
      @media(max-width:390px),(max-height:720px){
        .app .piece>.tileModMark{font-size:15px!important}.app .domino>.tileModMark{font-size:21px!important}
        .scoreProgress,.scoreProgressTrack,.scoreProgressFill{height:3px!important;min-height:3px!important}
      }
  
      /* Phase A accidentally changed the approved viewport-centred wordmark back to
         header-relative positioning. Keep both its box and visible glyphs centred on
         the physical phone; the wordmark has a wider fixed measure than its text. */
      .gameHeader .wordmark{
        position:fixed!important;
        left:50vw!important;
        top:calc(8px + env(safe-area-inset-top) + 22px)!important;
        transform:translate(-50%,-50%)!important;
        text-align:center!important;
      }
      /* Header: keep MONOID centred, move MENU to the clean top-right control. */
      .gameHeader .headerActions{justify-content:flex-end!important}
      .gameHeader #menuButton{
        width:auto!important;min-width:58px!important;height:44px!important;min-height:44px!important;
        padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;
        color:var(--ink)!important;font-size:14px!important;font-weight:750!important;line-height:44px!important;
        letter-spacing:.07em!important;text-align:right!important;box-shadow:none!important
      }
      .gameHeader #helpButton{pointer-events:none!important}
  
      /* ROUND is one readable unit; STAGE remains secondary. Long Chain shares this status band. */
      .metaStrip{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:0!important}
      .roundMeta{gap:4px!important}
      .roundMeta .stageMeta{margin-left:16px!important}
      .metaStrip>.machineModStatus{
        margin-left:auto!important;width:106px!important;min-width:90px!important;color:var(--ink)!important;
        text-align:right!important;align-self:center!important;pointer-events:none!important
      }
      .metaStrip>.machineModStatus>span{font-size:8px!important;font-weight:800!important;line-height:1!important;letter-spacing:.12em!important}
      .metaStrip>.machineModStatus>i{height:2px!important;margin-top:3px!important;background:var(--line)!important}
      .boardTop:has(.machineModStatus:not([hidden])){display:none!important}
  
      /* Modifier identity is large but deliberately quiet. Values/pips keep visual priority. */
      .app .piece>.tileModMark{font-size:clamp(18px,5vw,22px)!important;color:rgba(17,17,17,.20)!important}
      .app .domino>.tileModMark{font-size:26px!important;color:rgba(17,17,17,.20)!important}
      .app .circuitTile>.tileModMark{color:rgba(255,255,255,.30)!important}
      .commerceModal .domino.compactPreview>.tileModMark{
        font-size:11px!important;font-weight:950!important;color:rgba(17,17,17,.20)!important;text-shadow:none!important
      }
      .commerceModal .domino.compactPreview.circuitTile>.tileModMark{color:rgba(255,255,255,.30)!important}
  
      /* Endless: charcoal, not black. The three stage tones stay distinct without crushing the UI. */
      body.endlessPalette{
        --bg:#292927!important;--paper:#32322f!important;--paper2:#3a3a36!important;
        --ink:#f2f1eb!important;--muted:#bbb8b0!important;--line:#55534d!important
      }
      body.endlessPalette[data-stage-round="2"]{--bg:#252523!important;--paper:#2e2e2b!important;--paper2:#373733!important}
      body.endlessPalette[data-stage-round="3"]{--bg:#222220!important;--paper:#2b2b28!important;--paper2:#343430!important}
      body.endlessPalette.infinitePalette{--bg:#350b09!important;--paper:#43100d!important;--paper2:#551713!important;--ink:#f7eee8!important;--muted:#c8aaa3!important;--line:#6f2a24!important}
      body.endlessPalette.infinitePalette[data-stage-round="2"]{--bg:#2c0807!important;--paper:#3b0d0b!important;--paper2:#4a120f!important}
      body.endlessPalette.infinitePalette[data-stage-round="3"]{--bg:#230605!important;--paper:#320a08!important;--paper2:#40100d!important}
      body.endlessPalette .overlay,body.endlessPalette .gameMenu::backdrop{background:rgba(24,24,22,.78)!important}
      body.endlessPalette.infinitePalette .overlay,body.endlessPalette.infinitePalette .gameMenu::backdrop{background:rgba(35,6,5,.92)!important}
      body.endlessPalette.monoidCommerceActive .commerceModal{
        background:var(--paper)!important;color:var(--ink)!important;border-color:var(--line)!important
      }
  
      /* POWER keeps its material colour in Endless. Circuit+POWER keeps the dark tinted body. */
      body.endlessPalette .powerTile.power2{--power-pale:#b4c4cb!important}
      body.endlessPalette .powerTile.power3{--power-pale:#c1b4c6!important}
      body.endlessPalette .powerTile.power4{--power-pale:#c5b780!important}
      body.endlessPalette .domino.powerTile:not(.circuitTile),body.endlessPalette .piece.powerTile:not(.circuitTile){
        color:#171717!important;border-color:#504f4a!important
      }
      body.endlessPalette .powerTile:not(.circuitTile) .pip,body.endlessPalette .powerTile:not(.circuitTile) .spip{background:#171717!important}
      body.endlessPalette .powerTile:not(.circuitTile) .half+.half,
      body.endlessPalette .piece.powerTile:not(.circuitTile).h .cube+.cube,
      body.endlessPalette .piece.powerTile:not(.circuitTile).v .cube+.cube{border-color:#5f5d57!important}
      body.endlessPalette .domino.powerTile.circuitTile,body.endlessPalette .piece.powerTile.circuitTile{background:var(--power-circuit)!important}


      /* Tile Mods read as the reverse face of the same physical domino.
         Values remain in state/ARIA but disappear visually; zero endpoints retain one white datum. */
      .app .modTile,.commerceModal .domino.modTile{
        --mod-body:#11110f;--mod-ink:#f4f3ee;background:var(--mod-body)!important;color:var(--mod-ink)!important;border-color:#2e2e2a!important
      }
      .app .piece.modTile>.tileModMark,
      .app .domino.modTile>.tileModMark,
      .app .piece.modTile.powerTile:not(.circuitTile)>.tileModMark,
      .app .domino.modTile.powerTile:not(.circuitTile)>.tileModMark,
      .commerceModal .domino.modTile>.tileModMark,
      .commerceModal .domino.compactPreview.modTile>.tileModMark{
        color:rgba(255,255,255,.92)!important;text-shadow:none!important;z-index:9!important
      }
      /* Circuit rank colour remains visible on the Mod reverse without changing its material. */
      .app .circuitTile.modTile>.tileModMark,
      .commerceModal .domino.compactPreview.circuitTile.modTile>.tileModMark{
        color:var(--circuit-pip,#fff)!important;text-shadow:none!important;z-index:10!important
      }
      .app .piece.modTile:has(>.tileModMark) .pips,
      .app .domino.modTile:has(>.tileModMark) .spips,
      .commerceModal .domino.compactPreview.modTile:has(>.tileModMark) .spips{opacity:0!important}
      .app .domino.modTile>.half+.half,
      body.endlessPalette .app .domino.modTile>.half+.half,
      .commerceModal .domino.modTile>.half+.half,
      body.endlessPalette .commerceModal .domino.modTile>.half+.half{border-top-color:transparent!important}
      .app .piece.modTile.h>.cube+.cube,
      body.endlessPalette .app .piece.modTile.h>.cube+.cube{border-left-color:transparent!important}
      .app .piece.modTile.v>.cube+.cube,
      body.endlessPalette .app .piece.modTile.v>.cube+.cube{border-top-color:transparent!important}
      .app .domino.powerTile.modTile::before,.app .piece.powerTile.modTile::before,.commerceModal .domino.powerTile.modTile::before{background:transparent!important}

      /* POWER survives on a Mod as a near-black material tint; it does not restore face values. */
      .app .modTile.power2,.commerceModal .domino.modTile.power2{--mod-body:#172127}
      .app .modTile.power3,.commerceModal .domino.modTile.power3{--mod-body:#211a24}
      .app .modTile.power4,.commerceModal .domino.modTile.power4{--mod-body:#292516}

      /* Circuit material is grey. A Circuit that also carries a Mod becomes the darker reverse. */
      .app .piece.circuitTile:not(.modTile),.app .domino.circuitTile:not(.modTile),.commerceModal .domino.circuitTile:not(.modTile){
        background:#70706b!important;border-color:#565652!important
      }
      .app .circuitTile.modTile,.commerceModal .domino.circuitTile.modTile{--mod-body:#383835}
      .app .circuitTile.modTile.power2,.commerceModal .domino.circuitTile.modTile.power2{--mod-body:#323a3e}
      .app .circuitTile.modTile.power3,.commerceModal .domino.circuitTile.modTile.power3{--mod-body:#39333b}
      .app .circuitTile.modTile.power4,.commerceModal .domino.circuitTile.modTile.power4{--mod-body:#3d392d}

      /* Existing Star tier line moves from the physical centre to the whole perimeter. */
      .app .modTile:has(>.upgradeDot.u1),.commerceModal .domino.modTile:has(>.upgradeDot.u1){border-color:#4f86b7!important;border-width:2px!important}
      .app .modTile:has(>.upgradeDot.u2),.commerceModal .domino.modTile:has(>.upgradeDot.u2){border-color:#9a70b5!important;border-width:2px!important}
      .app .modTile:has(>.upgradeDot.u3),.commerceModal .domino.modTile:has(>.upgradeDot.u3){border-color:#d39a2f!important;border-width:2px!important}

      /* Zero is the only printed value retained on the reverse: one short white endpoint line. */
      .modTile>.zeroEndpoint::after{content:"";position:absolute;display:block;background:#f4f3ee;z-index:8;border-radius:999px;pointer-events:none}
      .domino.modTile>.half.zeroEndpoint:first-child::after{left:20%;right:20%;top:2px;height:2px}
      .domino.modTile>.half.zeroEndpoint:last-child::after{left:20%;right:20%;bottom:2px;height:2px}
      .piece.modTile.h>.cube.zeroEndpoint:first-child::after{top:20%;bottom:20%;left:2px;width:2px}
      .piece.modTile.h>.cube.zeroEndpoint:last-child::after{top:20%;bottom:20%;right:2px;width:2px}
      .piece.modTile.v>.cube.zeroEndpoint:first-child::after{left:20%;right:20%;top:2px;height:2px}
      .piece.modTile.v>.cube.zeroEndpoint:last-child::after{left:20%;right:20%;bottom:2px;height:2px}
  
      @media(max-height:720px){
        .gameHeader .wordmark{top:calc(5px + env(safe-area-inset-top) + 20px)!important}
        .app .piece>.tileModMark{font-size:17px!important}.app .domino>.tileModMark{font-size:23px!important}
        .metaStrip>.machineModStatus{width:96px!important}
      }
  
    `;
  
    function placeMachineStatus(){
      const meta=doc.querySelector('.metaStrip'),status=doc.getElementById('machineModStatus');
      if(meta&&status&&status.parentElement!==meta)meta.appendChild(status)
    }
    function syncBuildStamp(){
      const text=`v${root.IterionData?.VERSION||'dev'} · build ${BUILD_ID}`;
      const entry=doc.getElementById('devBuildStamp'),menu=doc.querySelector('.menuBuildStamp');
      if(entry&&entry.textContent!==text)entry.textContent=text;
      if(menu&&menu.textContent!==text)menu.textContent=text
    }
    function installLast(){
      if(doc.getElementById('monoid-phase-a-ui'))return;
      if(!doc.getElementById('monoid-gameplay-ui-pass')||!doc.getElementById('monoid-late-polish')){root.requestAnimationFrame(installLast);return}
      doc.head.appendChild(style);placeMachineStatus();syncBuildStamp();schedule()
    }
  
    function syncWordmark(){
      const header=doc.querySelector('.gameHeader'),wordmark=header?.querySelector('.wordmark');if(!header||!wordmark)return;
      const rect=header.getBoundingClientRect(),scale=header.offsetWidth?rect.width/header.offsetWidth:1;
      const localX=(root.innerWidth/2-rect.left)/(scale||1);
      if(Number.isFinite(localX))header.style.setProperty('--phase-a-wordmark-x',`${localX}px`)
    }
    function syncNumbers(fromState=false){
      const score=$('score'),target=$('target');
      if(fromState){
        const game=root.__monoidGame,state=game?.state?.();
        const scoreValue=Number(state?.score),targetValue=Number(game?.target?.());
        if(score&&Number.isFinite(scoreValue))score.textContent=compactPrimary(scoreValue);
        if(target&&Number.isFinite(targetValue))target.textContent=compactPrimary(targetValue);
        return
      }
      for(const el of[score,target]){
        if(!el)continue;const value=parseVisibleNumber(el.textContent);if(!Number.isFinite(value))continue;
        const text=compactPrimary(value);if(el.textContent!==text)el.textContent=text
      }
    }
    function alignMarketAssignments(){
      doc.querySelectorAll('.marketStructuredOffer').forEach(offer=>{
        const context=offer.querySelector(':scope > .marketContextRow'),physical=context?.querySelector(':scope > .marketPhysicalContext'),action=context?.querySelector(':scope > .marketOfferAction'),assigned=physical?.querySelector(':scope > .marketAssignedGroup');
        if(assigned&&action){action.insertBefore(assigned,action.firstChild);assigned.querySelector('.marketAssignedTile')?.setAttribute('aria-label',(assigned.querySelector('.marketAssignedTile')?.getAttribute('aria-label')||'Assigned domino')+' · current assignment')}
      })
    }
    function syncFinalFx(){
      const number=doc.querySelector('.finalfx>span');if(!number)return;const value=parseVisibleNumber(number.textContent);if(!Number.isFinite(value)||Math.abs(value)<COMPACT_THRESHOLD)return;
      const text=compactPrimary(value);if(number.textContent!==text)number.textContent=text
    }
    function sync(fromState=true){queued=false;syncWordmark();syncNumbers(fromState);alignMarketAssignments();syncFinalFx();syncBuildStamp()}
    let queued=false;
    function schedule(){if(queued)return;queued=true;root.requestAnimationFrame(()=>sync(false))}
    new MutationObserver(schedule).observe(doc.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','aria-label','hidden']});
    root.addEventListener('resize',schedule);root.addEventListener('pageshow',schedule);
    root.MonoidPhaseA=Object.freeze({BUILD_ID,COMPACT_THRESHOLD,compactPrimary,parseVisibleNumber,sync,syncWordmark,alignMarketAssignments,syncBuildStamp,placeMachineStatus});
    installLast()
  }

  /* ui-late-polish is appended after this file by pwa.js. Install the approved
     composition only once that layer exists so these deliberate overrides win. */
  let tries=0;
  function installGameplayUiLast(){
    if(doc.getElementById('monoid-late-polish')||tries++>120){installGameplayUi();return}
    root.requestAnimationFrame(installGameplayUiLast)
  }
  installGameplayUiLast()
})(window);
