(function(root){
  'use strict';
  const doc=root.document;
  if(!doc||root.__monoidPhaseAInstalled)return;
  root.__monoidPhaseAInstalled=true;

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
  function parsePlainNumber(text){
    const raw=String(text||'').trim();if(!/^-?[\d,]+(?:\.\d+)?$/.test(raw))return NaN;
    return Number(raw.replace(/,/g,''))
  }

  const style=doc.createElement('style');
  style.id='monoid-phase-a-ui';
  style.textContent=`
    /* Phase A: stable mobile hierarchy. Presentation only. */
    .gameHeader{position:relative!important}
    .gameHeader .wordmark{position:absolute!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%)!important;color:var(--ink)!important}

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
  `;

  function installLast(){
    if(doc.getElementById('monoid-phase-a-ui'))return;
    if(!doc.getElementById('monoid-gameplay-ui-pass')||!doc.getElementById('monoid-late-polish')){root.requestAnimationFrame(installLast);return}
    doc.head.appendChild(style);schedule()
  }

  function syncNumbers(){
    const game=root.__monoidGame,score=$('score'),target=$('target'),scoreDetail=$('scoreDetail');if(!game?.state||!score||!target)return;
    const targetValue=Number(game.target?.());if(Number.isFinite(targetValue)){const text=compactPrimary(targetValue);if(target.textContent!==text)target.textContent=text}
    if(scoreDetail?.classList.contains('scoreLive')){
      const live=parsePlainNumber(score.textContent);if(Number.isFinite(live)&&Math.abs(live)>=COMPACT_THRESHOLD){const text=compactPrimary(live);if(score.textContent!==text)score.textContent=text}
    }else{
      const value=Number(game.state().score);if(Number.isFinite(value)){const text=compactPrimary(value);if(score.textContent!==text)score.textContent=text}
    }
  }
  function alignMarketAssignments(){
    doc.querySelectorAll('.marketStructuredOffer').forEach(offer=>{
      const context=offer.querySelector(':scope > .marketContextRow'),physical=context?.querySelector(':scope > .marketPhysicalContext'),action=context?.querySelector(':scope > .marketOfferAction'),assigned=physical?.querySelector(':scope > .marketAssignedGroup');
      if(assigned&&action){action.insertBefore(assigned,action.firstChild);assigned.querySelector('.marketAssignedTile')?.setAttribute('aria-label',(assigned.querySelector('.marketAssignedTile')?.getAttribute('aria-label')||'Assigned domino')+' · current assignment')}
    })
  }
  function syncFinalFx(){
    const game=root.__monoidGame,number=doc.querySelector('.finalfx>span');if(!game?.state||!number)return;
    const value=Number(game.state().score);if(Number.isFinite(value)&&Math.abs(value)>=COMPACT_THRESHOLD){const text=compactPrimary(value);if(number.textContent!==text)number.textContent=text}
  }
  function sync(){queued=false;syncNumbers();alignMarketAssignments();syncFinalFx()}
  let queued=false;
  function schedule(){if(queued)return;queued=true;root.requestAnimationFrame(sync)}
  new MutationObserver(schedule).observe(doc.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','aria-label','hidden']});
  root.addEventListener('resize',schedule);root.addEventListener('pageshow',schedule);
  root.MonoidPhaseA=Object.freeze({COMPACT_THRESHOLD,compactPrimary,sync,alignMarketAssignments});
  installLast()
})(window);
