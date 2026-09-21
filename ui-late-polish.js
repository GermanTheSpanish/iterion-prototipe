(function(root){
  'use strict';
  const doc=root.document;
  if(!doc||root.__monoidLatePolishInstalled)return;
  root.__monoidLatePolishInstalled=true;

  const BUILD_ID='20260921.1',EXTREME_THRESHOLD=1e27,MAX_MARKET_TILES=3,MG=root.MonoidModGuidance;
  const $=id=>doc.getElementById(id);
  const OFFER_COPY={};


  const style=doc.createElement('style');
  style.id='monoid-late-polish';
  style.textContent=`
    /* Header: MONOID is centred against the phone, not against its neighbours. */
    .gameHeader{position:relative!important;justify-content:flex-end!important}
    .wordmark{position:absolute!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%)!important;width:clamp(108px,29.3vw,126px)!important;display:flex!important;align-items:center!important;justify-content:space-between!important;font-size:14px!important;font-weight:780!important;letter-spacing:0!important;white-space:nowrap!important;pointer-events:none}
    .wordmark>span{display:block;line-height:1}
    .headerActions{position:relative!important;z-index:2!important}
    .gameHeader .helpButton,#menuButton{min-width:44px!important;height:44px!important;min-height:44px!important}

    /* Physical tile modifiers: the code wins over pips and reads at board distance. */
    .app .tileModMark{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif!important;font-weight:950!important;line-height:.78!important;letter-spacing:-.06em!important;color:rgba(17,17,17,.94)!important;text-shadow:0 0 1px rgba(255,255,255,.78)!important}
    .app .piece>.tileModMark{font-size:clamp(12px,3.4vw,15px)!important}
    .app .domino>.tileModMark{font-size:20px!important}
    .app .piece:has(>.tileModMark) .pips,.app .domino:has(>.tileModMark) .spips{opacity:.28}
    .app .circuitTile>.tileModMark{color:var(--circuit-pip,#fff)!important;text-shadow:none!important}
    .app .piece.modFaceRevealed{animation:modFaceReveal .24s cubic-bezier(.2,.75,.25,1);backface-visibility:hidden;transform-style:preserve-3d}
    @keyframes modFaceReveal{0%{transform:rotateY(90deg)}100%{transform:rotateY(0)}}
    @media(prefers-reduced-motion:reduce){.app .piece.modFaceRevealed{animation:none!important}}
    .modifierTutorGameTile .domino>.tileModMark{font-size:23px!important;font-weight:950!important;color:rgba(17,17,17,.96)!important}
    /* Compact commerce previews: equal halves, centred values, secondary seam code.
       Board/hand miniatures do not opt into this mode. Keep material and tier edges. */
    .domino.compactPreview{height:62px}
    .domino.compactPreview>.half{width:100%!important;min-width:0!important;height:auto!important;max-height:none!important;min-height:0;flex:1 1 0!important}
    .domino.compactPreview>.half>.spips{inset:16%!important;opacity:1!important;transform:none!important}
    .domino.compactPreview>.tileModMark{inset:auto!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%)!important;display:flex!important;align-items:center;justify-content:center;gap:0;padding:0 1px!important;height:10px;white-space:nowrap;font-size:9px!important;font-weight:800!important;line-height:1!important;letter-spacing:0!important;font-style:normal;color:rgba(17,17,17,.96)!important;background:inherit!important;text-shadow:none!important}
    .domino.compactPreview.powerTile:not(.circuitTile)>.tileModMark{background:var(--power-pale)!important}
    .domino.compactPreview.circuitTile>.tileModMark{color:var(--circuit-pip,#fff)!important}

    /* Long Chain is a machine state: one quiet horizontal instrument above the board. */
    .boardTop:has(.machineModStatus:not([hidden])){display:flex!important;justify-content:center!important}
    .machineModStatus{width:min(180px,62%)!important;color:var(--ink)!important;text-align:center!important}
    .machineModStatus>span{font-size:9px!important;font-weight:850!important;line-height:1!important;letter-spacing:.16em!important}
    .machineModStatus>i{height:3px!important;margin-top:4px!important;background:var(--line)!important}

    /* Extreme Endless values remain readable and never ellipsise. */
    .scoreValue.extremeValue{font-size:clamp(28px,8.8vw,46px)!important;letter-spacing:-.045em!important;overflow:visible!important;text-overflow:clip!important}
    .finalfx{max-width:calc(100% - 16px)!important;min-width:0!important;padding:6px 9px!important;border:1px solid var(--line)!important;background:var(--paper)!important;color:var(--ink)!important;box-shadow:none!important;text-shadow:none!important;overflow:visible!important}
    .finalfx>span{display:block;max-width:100%;white-space:nowrap}

    /* Market: one authoritative three-band row for BUY and REASSIGN states. */
    .commerceModal .marketAssignments{display:none!important}
    .commerceModal .marketChoiceTitle{margin:10px 0 2px!important}
    .commerceModal .marketOfferGrid{display:block!important}
    .commerceModal .marketOffer.marketStructuredOffer{display:flex!important;flex-direction:column!important;gap:0!important;padding:12px 0!important;border:0!important;border-bottom:1px solid var(--line)!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;opacity:1!important;min-width:0!important}
    .commerceModal .marketStructuredOffer>.marketOfferHead{display:flex!important;align-items:baseline!important;justify-content:space-between!important;gap:10px!important;width:100%!important}
    .commerceModal .marketStructuredOffer>.marketOfferHead strong{font-size:15px!important;line-height:1.12!important;letter-spacing:.035em!important}
    .commerceModal .marketStructuredOffer>.marketOfferHead span{font-size:16px!important;line-height:1!important;font-variant-numeric:tabular-nums!important;white-space:nowrap!important}
    .commerceModal .marketOfferDescription{width:100%!important;margin:6px 0 2px!important;font-size:13px!important;line-height:1.3!important;color:var(--muted)!important;display:block!important;overflow:visible!important}
    .commerceModal .marketModDiagram{width:100%;min-height:40px;margin:0 0 6px;overflow:hidden}.commerceModal .marketModDiagram .modDiagram{pointer-events:none}
    .commerceModal .marketContextRow{display:grid!important;grid-template-columns:minmax(0,1fr) 112px!important;gap:10px!important;align-items:end!important;min-width:0!important}
    .commerceModal .marketPhysicalContext{display:flex!important;align-items:flex-end!important;gap:12px!important;min-width:0!important;overflow:hidden!important}
    .commerceModal .marketContextGroup{display:flex!important;flex-direction:column!important;gap:5px!important;min-width:0!important}
    .commerceModal .marketAssignedGroup{flex:0 0 auto!important}
    .commerceModal .marketPoolGroup{flex:1 1 auto!important}
    .commerceModal .marketContextLabel{font-size:10px!important;line-height:1!important;font-weight:750!important;letter-spacing:.11em!important;color:var(--muted)!important;white-space:nowrap!important}
    .commerceModal .marketContextTiles{display:flex!important;align-items:center!important;gap:5px!important;min-width:0!important}
    .commerceModal .marketContextTiles .marketTileList{display:flex!important;align-items:center!important;gap:5px!important;max-width:100%!important;margin:0!important;padding:0!important;overflow:visible!important;overscroll-behavior:auto!important}
    .commerceModal .marketContextTiles .marketTile{min-width:0!important;padding:0!important;background:transparent!important;gap:0!important}
    .commerceModal .marketContextTiles .marketTile small{display:none!important}
    .commerceModal .marketContextTiles .marketTile .domino{width:26px!important;height:50px!important}
    .commerceModal .marketContextTiles .marketTileOverflow{display:none!important}
    .commerceModal .marketTileMore{align-self:center;color:var(--muted);font-size:10px;font-weight:800;line-height:1;white-space:nowrap}
    .commerceModal .marketMachineTag{display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:center!important;gap:4px!important;min-height:50px!important;color:var(--muted)!important}
    .commerceModal .marketMachineTag strong{font-size:11px!important;font-weight:850!important;letter-spacing:.14em!important}
    .commerceModal .marketMachineTag small{font-size:9px!important;line-height:1.15!important;letter-spacing:.05em!important}
    .commerceModal .marketOfferAction{display:flex!important;flex-direction:column!important;align-items:stretch!important;justify-content:flex-end!important;gap:4px!important;width:112px!important}
    .commerceModal .marketOfferAction .shopBuy{width:112px!important;min-height:44px!important;margin:0!important;padding:7px 8px!important;border:1px solid var(--line)!important;border-radius:3px!important;background:transparent!important;color:var(--ink)!important;font-size:11px!important;box-shadow:none!important}
    .commerceModal .marketOfferAction .shopBuy:disabled{opacity:.46!important;background:transparent!important;color:var(--ink)!important}
    .commerceModal .marketActionReason{font-size:9px;line-height:1.1;color:var(--muted);text-align:center}
    .commerceModal .shopSupply{font-size:10px!important;line-height:1.25!important;letter-spacing:.07em!important}
    .commerceModal .shopFoot{margin-top:8px!important;font-size:10px!important;line-height:1.3!important;color:var(--muted)!important}
    body.endlessPalette .commerceModal .marketOffer.marketStructuredOffer{background:transparent!important;border-color:var(--line)!important}
    body.endlessPalette .commerceModal .marketOfferAction .shopBuy{border-color:var(--line)!important;background:transparent!important;color:var(--ink)!important}
    @media(max-width:390px),(max-height:700px){
      .wordmark{width:clamp(104px,28vw,120px)!important;font-size:13px!important}
      .app .piece>.tileModMark{font-size:12px!important}.app .domino>.tileModMark{font-size:17px!important}
      .machineModStatus{width:min(160px,58%)!important}.machineModStatus>span{font-size:8px!important}
      .commerceModal .marketOffer.marketStructuredOffer{padding:10px 0!important}
      .commerceModal .marketStructuredOffer>.marketOfferHead strong{font-size:14px!important}.commerceModal .marketStructuredOffer>.marketOfferHead span{font-size:15px!important}
      .commerceModal .marketOfferDescription{font-size:12px!important;line-height:1.26!important;margin:5px 0 8px!important}
      .commerceModal .marketContextRow{grid-template-columns:minmax(0,1fr) 106px!important;gap:8px!important}
      .commerceModal .marketPhysicalContext{gap:9px!important}
      .commerceModal .marketContextTiles .marketTile .domino{width:24px!important;height:46px!important}
      .commerceModal .marketOfferAction,.commerceModal .marketOfferAction .shopBuy{width:106px!important}
    }
  `;
  doc.head.appendChild(style);

  function decorateWordmark(){
    const wordmark=doc.querySelector('.wordmark');if(!wordmark)return;
    const spans=[...wordmark.children],letters=spans.map(span=>span.textContent||'').join('');
    const intact=spans.length===6&&spans.every(span=>span.tagName==='SPAN')&&letters==='MONOID';
    if(!intact){wordmark.dataset.letterized='true';wordmark.setAttribute('aria-label','MONOID');wordmark.innerHTML='MONOID'.split('').map(c=>`<span aria-hidden="true">${c}</span>`).join('')}
  }
  function scientific(value){
    value=Number(value);if(!Number.isFinite(value))return String(value);
    return value.toExponential(2).replace(/\.00e/,'e').replace(/(\.\d)0e/,'$1e').replace('e+','e')
  }
  function displayValue(value){value=Number(value);return Number.isFinite(value)&&Math.abs(value)>=EXTREME_THRESHOLD?scientific(value):root.IterionPresentation?.compact?.(value)??String(value)}
  function syncExtremeNumbers(){
    const game=root.__monoidGame;if(!game?.state)return;const s=game.state(),pairs=[[ $('score'),s.score],[ $('target'),game.target?.() ]];
    for(const[el,value]of pairs){if(!el||!Number.isFinite(Number(value)))continue;const extreme=Math.abs(Number(value))>=EXTREME_THRESHOLD;el.classList.toggle('extremeValue',extreme);if(extreme){const text=scientific(value);if(el.textContent!==text)el.textContent=text}}
    const final=doc.querySelector('.finalfx>span');if(final&&Math.abs(Number(s.score))>=EXTREME_THRESHOLD){const text=scientific(s.score);if(final.textContent!==text)final.textContent=text}
  }
  const OFFER_LABELS=Object.freeze({'double-double':'DD','double-echo':'DE','zero-port':'ZP','parity-exchange':'PX','corner':'CR','long-line':'LN','overload':'OV','terminal':'TE','sequence':'SQ','complement':'C6','twin':'TW','pair':'PR','bridge':'BR','gate':'GT','fan':'FN','frame':'FM','crown':'CW','frontier':'FT','relay':'RL','coupler':'CP','resonator':'RS','forge':'FG','foundation':'FD','knot':'KN','mirror':'MR','mint':'MT'});
  const offerLabel=id=>OFFER_LABELS[id]||null;
  function assignedTiles(){
    const map=new Map();
    doc.querySelectorAll('.marketAssignments .marketTile').forEach(tile=>{
      const label=tile.querySelector('small')?.textContent?.trim();if(!label)return;
      const list=map.get(label)||[];list.push(tile);map.set(label,list)
    });
    return map
  }
  function makeContextGroup(label,className){
    const group=doc.createElement('div');group.className=`marketContextGroup ${className}`;
    const title=doc.createElement('div');title.className='marketContextLabel';title.textContent=label;
    const tiles=doc.createElement('div');tiles.className='marketContextTiles';
    group.append(title,tiles);return{group,tiles}
  }
  function actionReason(offer,info,button){
    const game=root.__monoidGame,s=game?.state?.();if(!button?.disabled||!info||!s)return'';
    if(offer.classList.contains('purchasedOffer'))return'INSTALLED';
    if(offer.classList.contains('lockedOffer'))return'CHOICE USED';
    if(info.targetCount<1)return'NO VALID TARGET';
    if(Number(s.coins)<Number(info.price))return'NOT ENOUGH COINS';
    return''
  }
  function decorateMarket(){
    const overlay=$('overlay'),title=$('overlayTitle');if(!overlay?.classList.contains('show')||title?.textContent.trim()!=='MARKET')return;
    const game=root.__monoidGame;if(!game?.marketOfferInfo)return;
    const assigned=assignedTiles(),endless=!!game.state?.().endlessMode;
    const foot=overlay.querySelector('.shopFoot');
    const footCopy=`Buy one Mod, then choose a highlighted compatible tile. Hold a Modded tile to inspect BUILD, REWARD and live status. One purchase max · Inflation +1.${endless?' System Strain also affects Market prices.':''}`;
    if(foot&&foot.textContent!==footCopy)foot.textContent=footCopy;

    doc.querySelectorAll('.marketOffer[data-market-offer]').forEach(offer=>{
      if(offer.classList.contains('marketStructuredOffer'))return;
      const id=offer.dataset.marketOffer,info=game.marketOfferInfo(id),mod=info?.mod,guide=MG?.get?.(id);
      const head=offer.querySelector(':scope > .marketOfferHead'),desc=offer.querySelector(':scope > p'),target=offer.querySelector(':scope > .marketTarget'),button=offer.querySelector(':scope > .shopBuy');
      if(!head||!button||!info||!mod)return;

      const description=desc||doc.createElement('p');description.className='marketOfferDescription';
      description.textContent=guide?`${guide.market} ${guide.reward}`:(OFFER_COPY[id]||mod.shortDescription||mod.description||'');
      if(id==='long-run'&&endless)description.textContent+=' Up to 7 qualifying Moves in Endless.';
      const visual=doc.createElement('div');visual.className='marketModDiagram';visual.innerHTML=MG?.diagramHtml?.(id,true)||'';

      const context=doc.createElement('div');context.className='marketContextRow';
      const physical=doc.createElement('div');physical.className='marketPhysicalContext';
      if(mod.target==='machine'){
        const machine=doc.createElement('div');machine.className='marketMachineTag';
        machine.innerHTML=`<strong>MACHINE</strong>${endless?'<small>7 FULL PAYOUTS IN ENDLESS</small>':''}`;
        physical.appendChild(machine)
      }else{
        const code=offerLabel(id),assignedList=assigned.get(code)||[];
        if(assignedList.length){
          const assignedGroup=makeContextGroup(id==='zero-port'&&assignedList.length>1?'LINKED':'INSTALLED','marketAssignedGroup');
          for(const assignedTile of assignedList){
            const clone=assignedTile.cloneNode(true);clone.classList.add('marketAssignedTile');clone.querySelector('small')?.remove();assignedGroup.tiles.appendChild(clone)
          }
          physical.appendChild(assignedGroup.group)
        }
        const count=Number(info.targetCount)||0,compatible=makeContextGroup(count>0?`COMPATIBLE · ${count}`:'NO VALID TARGET','marketPoolGroup');
        physical.appendChild(compatible.group)
      }

      const action=doc.createElement('div');action.className='marketOfferAction';action.appendChild(button);
      const reason=actionReason(offer,info,button);if(reason){const note=doc.createElement('small');note.className='marketActionReason';note.textContent=reason;action.appendChild(note)}
      context.append(physical,action);
      target?.remove();
      offer.replaceChildren(head,description,visual,context);
      offer.classList.remove('marketPolishedOffer');offer.classList.add('marketStructuredOffer')
    })
  }
  function syncBuildStamp(){
    root.__MONOID_BUILD=BUILD_ID;const text=`v${root.IterionData?.VERSION||'dev'} · build ${BUILD_ID}`;for(const el of[$('devBuildStamp'),doc.querySelector('.menuBuildStamp')])if(el&&el.textContent!==text)el.textContent=text
  }
  let queued=false;
  function sync(){queued=false;decorateWordmark();decorateMarket();syncExtremeNumbers();syncBuildStamp()}
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(sync)}
  new MutationObserver(schedule).observe(doc.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','aria-label','hidden']});
  root.addEventListener('resize',schedule);root.addEventListener('pageshow',schedule);
  root.MonoidLatePolish=Object.freeze({BUILD_ID,MAX_MARKET_TILES,EXTREME_THRESHOLD,scientific,displayValue,sync});
  sync()
})(window);
