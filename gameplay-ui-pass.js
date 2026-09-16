(function(root){
  'use strict';
  const doc=root.document;
  if(!doc||root.__monoidGameplayUiPassInstalled)return;
  root.__monoidGameplayUiPassInstalled=true;
  const $=id=>doc.getElementById(id);

  const style=doc.createElement('style');
  style.id='monoid-gameplay-ui-pass';
  style.textContent=`
    /* Figma-approved gameplay composition. Presentation only: no engine geometry changes. */
    .app{width:min(100%,430px)!important;padding:calc(8px + env(safe-area-inset-top)) 10px calc(10px + env(safe-area-inset-bottom))!important;grid-template-rows:44px 122px 38px minmax(0,1fr) auto!important;gap:0!important;background:#f7f7f4!important}
    .gameHeader{position:relative!important;min-height:44px!important;height:44px!important;display:flex!important;align-items:center!important;justify-content:flex-end!important}
    .wordmark{position:absolute!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%)!important;width:clamp(118px,30vw,132px)!important;display:flex!important;align-items:center!important;justify-content:space-between!important;font-size:16px!important;font-weight:700!important;letter-spacing:0!important;line-height:1!important;color:#171717!important;pointer-events:none!important}
    .headerActions{position:relative!important;z-index:3!important;width:auto!important;height:44px!important;display:flex!important;align-items:center!important;justify-content:flex-end!important}
    #menuButton{width:84px!important;min-width:84px!important;height:36px!important;min-height:36px!important;padding:0 16px!important;border:0!important;border-radius:12px!important;background:#111!important;color:#fff!important;font-size:15px!important;font-weight:750!important;line-height:36px!important;letter-spacing:.055em!important;text-align:center!important}
    /* Compatibility target for old automated flows; real Help lives inside MENU. */
    .gameHeader #helpButton{position:absolute!important;left:0!important;top:0!important;width:1px!important;min-width:1px!important;height:1px!important;min-height:1px!important;padding:0!important;border:0!important;opacity:0!important;overflow:hidden!important}

    .scoreStrip{display:grid!important;grid-template-columns:1fr 1fr!important;gap:20px!important;align-items:stretch!important}
    .scoreCard{position:relative!important;min-width:0!important;min-height:0!important;padding:17px 0 8px!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;text-align:right!important}
    .targetCard{text-align:left!important}
    .scoreCard .label{display:block!important;font-size:11px!important;font-weight:500!important;line-height:1!important;letter-spacing:.23em!important;color:#65635f!important}
    .scoreValue{display:block!important;margin:17px 0 0!important;font-size:clamp(46px,14vw,62px)!important;font-weight:390!important;line-height:.82!important;letter-spacing:-.035em!important;overflow:visible!important;text-overflow:clip!important}
    .scoreCard:not(.targetCard) .scoreValue{padding-bottom:5px!important;border-bottom:1px solid #d4d2cc!important}
    .scoreCaption{display:block!important;margin-top:5px!important;min-height:16px!important;font-size:14px!important;font-weight:400!important;line-height:1.15!important;color:#67645f!important}
    .scoreProgress{display:none!important}

    .metaStrip{display:block!important;min-height:38px!important;padding:8px 0 7px!important;border-top:0!important;border-bottom:1px solid #d4d2cc!important}
    .roundMeta{display:flex!important;align-items:baseline!important;gap:22px!important;font-size:14px!important;font-weight:500!important;line-height:1!important;letter-spacing:.01em!important;white-space:nowrap!important}
    .roundMeta>strong,.stageMeta>strong{font-size:14px!important;font-weight:500!important}
    .stageMeta{color:#67645f!important}
    .movesMeta{display:none!important}

    .gameArea{min-height:0!important;display:grid!important;grid-template-columns:minmax(0,1fr) 52px!important;gap:8px!important;align-items:start!important;overflow:hidden!important;padding-top:10px!important}
    .boardShell{position:relative!important;min-width:0!important;min-height:0!important;width:100%!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;overflow:visible!important;display:block!important}
    .boardTop{display:none!important}
    .boardTop:has(.machineModStatus:not([hidden])){position:absolute!important;left:0!important;right:0!important;top:6px!important;z-index:18!important;display:flex!important;justify-content:center!important;padding:0!important;pointer-events:none!important}
    .boardTop>strong,.boardTop>#boardsize{display:none!important}
    .boardFrame{display:block!important;width:100%!important;min-height:0!important;overflow:visible!important}
    .board{position:relative!important;width:min(100%,350px,calc((100dvh - 280px) * .75))!important;max-width:350px!important;max-height:100%!important;aspect-ratio:3 / 4!important;margin:0!important;border:1px solid #d4d2cc!important;border-radius:0!important;background:#fff!important;background-image:none!important;box-shadow:none!important;overflow:hidden!important}
    .board.dragging{box-shadow:inset 0 0 0 1px rgba(17,17,17,.15)!important}
    .boardCenterMark{position:absolute;z-index:3;display:block;background:#aaa8a2;pointer-events:none}
    .boardCenterMark[data-side="top"],.boardCenterMark[data-side="bottom"]{left:50%;width:1px;height:10px;transform:translateX(-50%)}
    .boardCenterMark[data-side="top"]{top:-1px}.boardCenterMark[data-side="bottom"]{bottom:-1px}
    .boardCenterMark[data-side="left"],.boardCenterMark[data-side="right"]{top:50%;width:10px;height:1px;transform:translateY(-50%)}
    .boardCenterMark[data-side="left"]{left:-1px}.boardCenterMark[data-side="right"]{right:-1px}

    .handRail{min-height:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;overflow:visible!important;display:flex!important;flex-direction:column!important;align-items:stretch!important}
    .handHeader{height:22px!important;padding:0!important;display:flex!important;align-items:flex-start!important;justify-content:center!important}
    .handHeader .label{font-size:11px!important;font-weight:500!important;letter-spacing:.21em!important;color:#65635f!important}
    .hand{display:flex!important;flex:1!important;min-height:0!important;flex-direction:column!important;justify-content:flex-start!important;gap:7px!important}
    .handSlot{height:71px!important;min-height:71px!important;flex:0 0 71px!important;display:flex!important;align-items:flex-start!important;justify-content:center!important;border-radius:0!important}
    .tile{width:48px!important;padding:0!important}
    .domino{width:42px!important;border-radius:6px!important}
    .half{width:39px!important;height:34px!important;max-height:none!important}

    .bottomBar{display:grid!important;grid-template-columns:1fr!important;grid-template-rows:auto auto!important;gap:10px!important;align-items:stretch!important;min-height:0!important;padding-top:10px!important}
    .hint{display:block!important;min-height:22px!important;margin:0!important;overflow:visible!important;text-align:center!important;font-size:14px!important;font-weight:400!important;line-height:1.25!important;color:#67645f!important;-webkit-line-clamp:unset!important}
    .railActions{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr)) minmax(0,1.25fr)!important;gap:6px!important;width:100%!important}
    .railActions .btn{min-width:0!important;min-height:60px!important;height:60px!important;padding:8px 4px!important;border:1px solid #d4d2cc!important;border-radius:6px!important;background:transparent!important;color:#171717!important;font-size:15px!important;font-weight:750!important;line-height:1.05!important;text-transform:uppercase!important;box-shadow:none!important}
    .railActions .btn small{display:block!important;margin-top:6px!important;font-size:11px!important;font-weight:450!important;line-height:1!important;text-transform:none!important;color:#67645f!important}
    .railActions .btn:disabled{opacity:1!important}
    .railActions .btn:disabled small{color:#96938d!important}
    .shopRailButton{border-color:#111!important;background:#111!important;color:#fff!important}
    .shopRailButton small{color:#e5e5e1!important}

    @media(max-height:720px){
      .app{padding-top:calc(5px + env(safe-area-inset-top))!important;padding-bottom:calc(6px + env(safe-area-inset-bottom))!important;grid-template-rows:40px 86px 32px minmax(0,1fr) auto!important}
      .gameHeader,.headerActions{height:40px!important;min-height:40px!important}
      #menuButton{height:34px!important;min-height:34px!important;line-height:34px!important}
      .wordmark{font-size:14px!important;width:118px!important}
      .scoreCard{padding-top:8px!important}.scoreValue{margin-top:9px!important;font-size:38px!important}.scoreCaption{font-size:11px!important;margin-top:3px!important}
      .metaStrip{min-height:32px!important;padding:6px 0!important}.roundMeta,.roundMeta>strong,.stageMeta>strong{font-size:12px!important}
      .gameArea{grid-template-columns:minmax(0,1fr) 48px!important;gap:6px!important;padding-top:7px!important}.board{width:min(100%,350px,calc((100dvh - 255px) * .75))!important}
      .handHeader{height:18px!important}.handHeader .label{font-size:10px!important}.hand{gap:4px!important}.handSlot{height:58px!important;min-height:58px!important;flex-basis:58px!important}.tile{width:44px!important}.domino{width:36px!important}.half{width:33px!important;height:28px!important}
      .bottomBar{gap:6px!important;padding-top:6px!important}.hint{min-height:18px!important;font-size:11px!important}.railActions{gap:5px!important}.railActions .btn{height:48px!important;min-height:48px!important;font-size:12px!important}.railActions .btn small{margin-top:4px!important;font-size:9px!important}
    }
  `;
  doc.head.appendChild(style);

  function ensureBoardMarks(){
    const board=$('board');if(!board)return;
    for(const side of ['top','right','bottom','left'])if(!board.querySelector(`.boardCenterMark[data-side="${side}"]`)){
      const mark=doc.createElement('i');mark.className='boardCenterMark';mark.dataset.side=side;mark.setAttribute('aria-hidden','true');board.appendChild(mark)
    }
  }
  function ensureMenuHelp(){
    const menu=$('gameMenu'),legacy=$('helpButton'),anchor=$('gameSelectionButton');if(!menu||!legacy||!anchor)return;
    legacy.tabIndex=-1;legacy.setAttribute('aria-hidden','true');
    let button=$('menuHelpButton');if(!button){button=doc.createElement('button');button.id='menuHelpButton';button.className='menuAction';button.textContent='How to play';menu.insertBefore(button,anchor);button.addEventListener('click',()=>{if(menu.open)menu.close();legacy.click()})}
  }
  function syncActionLabels(){
    const game=root.__monoidGame;if(!game?.state)return;const state=game.state(),remaining=Math.max(0,(game.maxPlacements?.()||0)-(state.roundTurn||0));
    const move=$('moveTool'),reroll=$('reroll'),undo=$('undoTool'),shop=$('shopButton');
    const moveHtml=`${remaining} MOVES<small>ADD +1 · ${state.consumables?.move||0}</small>`;
    const rerollSub=state.freeReroll?'FREE':String(state.consumables?.reroll||0),rerollHtml=`REROLL<small>${rerollSub}</small>`;
    const undoHtml=`UNDO<small>${state.consumables?.undo||0}</small>`,shopHtml=`SHOP<small>${state.coins||0} coins</small>`;
    if(move&&move.innerHTML!==moveHtml)move.innerHTML=moveHtml;if(reroll&&reroll.innerHTML!==rerollHtml)reroll.innerHTML=rerollHtml;if(undo&&undo.innerHTML!==undoHtml)undo.innerHTML=undoHtml;if(shop&&shop.innerHTML!==shopHtml)shop.innerHTML=shopHtml
  }
  function syncMenu(){const menu=$('menuButton');if(menu&&menu.textContent!=='MENU')menu.textContent='MENU'}
  let queued=false;
  function sync(){queued=false;ensureBoardMarks();ensureMenuHelp();syncMenu();syncActionLabels()}
  function schedule(){if(queued)return;queued=true;root.requestAnimationFrame(sync)}
  new MutationObserver(schedule).observe(doc.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','hidden','disabled']});
  root.addEventListener('resize',schedule);root.addEventListener('pageshow',schedule);
  root.MonoidGameplayUi=Object.freeze({sync,ensureBoardMarks});
  sync()
})(window);
