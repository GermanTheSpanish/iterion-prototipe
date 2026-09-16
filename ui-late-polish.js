(function(root){
  'use strict';
  const doc=root.document;
  if(!doc||root.__monoidLatePolishInstalled)return;
  root.__monoidLatePolishInstalled=true;

  const BUILD_ID='20260916.1',EXTREME_THRESHOLD=1e27,MAX_MARKET_TILES=3;
  const $=id=>doc.getElementById(id);

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
    .app .circuitTile>.tileModMark{color:rgba(255,255,255,.96)!important;text-shadow:0 0 1px #000!important}
    .modifierTutorGameTile .domino>.tileModMark{font-size:23px!important;font-weight:950!important;color:rgba(17,17,17,.96)!important}
    .marketTile .domino>.tileModMark{font-size:13px!important;font-weight:950!important;color:rgba(17,17,17,.96)!important;text-shadow:none!important}
    .marketTile .domino:has(>.tileModMark) .spips{opacity:.24}

    /* Long Chain is a machine state: one quiet horizontal instrument above the board. */
    .boardTop:has(.machineModStatus:not([hidden])){display:flex!important;justify-content:center!important}
    .machineModStatus{width:min(180px,62%)!important;color:var(--ink)!important;text-align:center!important}
    .machineModStatus>span{font-size:9px!important;font-weight:850!important;line-height:1!important;letter-spacing:.16em!important}
    .machineModStatus>i{height:3px!important;margin-top:4px!important;background:var(--line)!important}

    /* Extreme Endless values remain readable and never ellipsise. */
    .scoreValue.extremeValue{font-size:clamp(28px,8.8vw,46px)!important;letter-spacing:-.045em!important;overflow:visible!important;text-overflow:clip!important}
    .finalfx{max-width:calc(100% - 16px)!important;min-width:0!important;padding:6px 9px!important;border:1px solid var(--line)!important;background:var(--paper)!important;color:var(--ink)!important;box-shadow:none!important;text-shadow:none!important;overflow:visible!important}
    .finalfx>span{display:block;max-width:100%;white-space:nowrap}

    /* Market: one compact row per modifier. The old ASSIGNED block stays in the DOM only for backwards-compatible telemetry/tests. */
    .commerceModal .marketAssignments{display:none!important}
    .commerceModal .marketOfferGrid{gap:7px!important}
    .commerceModal .marketOffer.marketPolishedOffer{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(78px,104px)!important;column-gap:10px!important;align-items:stretch!important;padding:10px 0!important;border:0!important;border-bottom:1px solid var(--line)!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;min-width:0!important}
    .commerceModal .marketOfferMain{display:flex;flex-direction:column;min-width:0}
    .commerceModal .marketOfferMain .marketOfferHead{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
    .commerceModal .marketOfferMain .marketOfferHead strong{font-size:14px!important;line-height:1.12!important;letter-spacing:.035em!important}
    .commerceModal .marketOfferMain .marketOfferHead span{font-size:14px!important;line-height:1!important;white-space:nowrap!important}
    .commerceModal .marketOfferMain>p{margin:5px 0 3px!important;font-size:11.5px!important;line-height:1.28!important;color:var(--muted)!important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .commerceModal .marketOfferMain .marketTarget{margin:0 0 7px!important;font-size:10px!important;line-height:1.2!important;color:var(--muted)!important}
    .commerceModal .marketOfferMain .shopBuy{width:100%!important;min-height:40px!important;margin-top:auto!important;padding:7px 8px!important;border-radius:3px!important;font-size:11px!important}
    .commerceModal .marketOfferRail{display:flex;align-items:center;justify-content:flex-end;gap:5px;min-width:0;padding:2px 0}
    .commerceModal .marketOfferRail .marketTileList{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:4px!important;max-width:100%!important;margin:0!important;padding:0!important;overflow:visible!important;overscroll-behavior:auto!important}
    .commerceModal .marketOfferRail .marketTile{min-width:0!important;gap:2px!important}
    .commerceModal .marketOfferRail .marketTileOverflow{display:none!important}
    .commerceModal .marketOfferRail .marketTileMore{align-self:center;color:var(--muted);font-size:10px;font-weight:800;line-height:1;white-space:nowrap}
    .commerceModal .marketOfferRail .marketMachineTag{display:flex;align-items:center;justify-content:center;min-width:76px;min-height:42px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);color:var(--muted);font-size:10px;font-weight:850;letter-spacing:.14em}
    .commerceModal .marketOfferRail>.marketTile{padding:4px!important;border-radius:4px!important;background:var(--paper2)!important}
    .commerceModal .marketChoiceTitle{margin:11px 0 3px!important}
    .commerceModal .shopFoot{margin-top:7px!important;font-size:10px!important;line-height:1.3!important}
    body.endlessPalette .commerceModal .marketOffer.marketPolishedOffer{background:transparent!important;border-color:var(--line)!important}
    body.endlessPalette .commerceModal .marketOfferRail>.marketTile{background:#d8d5cc!important}
    body.endlessPalette .commerceModal .marketMachineTag{color:var(--muted)!important}
    @media(max-height:700px){
      .wordmark{width:clamp(104px,28vw,120px)!important;font-size:13px!important}
      .app .piece>.tileModMark{font-size:12px!important}.app .domino>.tileModMark{font-size:17px!important}
      .machineModStatus{width:min(160px,58%)!important}.machineModStatus>span{font-size:8px!important}
      .commerceModal .marketOffer.marketPolishedOffer{grid-template-columns:minmax(0,1fr) minmax(70px,94px)!important;gap:7px!important;padding:7px 0!important}
      .commerceModal .marketOfferMain>p{font-size:10.5px!important;-webkit-line-clamp:1}.commerceModal .marketOfferMain .marketTarget{font-size:9px!important;margin-bottom:4px!important}.commerceModal .marketOfferMain .shopBuy{min-height:36px!important}
    }
  `;
  doc.head.appendChild(style);

  function decorateWordmark(){
    const wordmark=doc.querySelector('.wordmark');if(!wordmark)return;
    if(!wordmark.dataset.letterized){wordmark.dataset.letterized='true';wordmark.setAttribute('aria-label','MONOID');wordmark.innerHTML='MONOID'.split('').map(c=>`<span aria-hidden="true">${c}</span>`).join('')}
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
  const offerLabel=id=>id==='double-double'?'DD':id==='double-echo'?'DE':id==='zero-memory'?'ZM':null;
  function assignedTiles(){
    const map=new Map();doc.querySelectorAll('.marketAssignments .marketTile').forEach(tile=>{const label=tile.querySelector('small')?.textContent?.trim();if(label&&!map.has(label))map.set(label,tile)});return map
  }
  function trimTileList(list){
    if(!list)return;const tiles=[...list.querySelectorAll(':scope > .marketTile')];tiles.forEach((tile,i)=>{tile.classList.toggle('marketTileOverflow',i>=MAX_MARKET_TILES);tile.setAttribute('aria-hidden',i>=MAX_MARKET_TILES?'true':'false')});
    list.querySelector('.marketTileMore')?.remove();if(tiles.length>MAX_MARKET_TILES){const more=doc.createElement('span');more.className='marketTileMore';more.textContent=`+${tiles.length-MAX_MARKET_TILES}`;more.setAttribute('aria-label',`${tiles.length-MAX_MARKET_TILES} more eligible tiles`);list.appendChild(more)}
  }
  function decorateMarket(){
    const overlay=$('overlay'),title=$('overlayTitle');if(!overlay?.classList.contains('show')||title?.textContent.trim()!=='MARKET')return;
    const assigned=assignedTiles();
    doc.querySelectorAll('.marketOffer[data-market-offer]').forEach(offer=>{
      if(offer.classList.contains('marketPolishedOffer'))return;
      const id=offer.dataset.marketOffer,head=offer.querySelector(':scope > .marketOfferHead'),desc=offer.querySelector(':scope > p'),target=offer.querySelector(':scope > .marketTarget'),list=offer.querySelector(':scope > .marketTileList'),button=offer.querySelector(':scope > .shopBuy');
      if(!head||!button)return;
      const main=doc.createElement('div');main.className='marketOfferMain';for(const el of[head,desc,target,button])if(el)main.appendChild(el);
      const rail=doc.createElement('div');rail.className='marketOfferRail';
      if(id==='long-run'){const tag=doc.createElement('span');tag.className='marketMachineTag';tag.textContent='MACHINE';rail.appendChild(tag)}
      else{const assignedTile=assigned.get(offerLabel(id));if(assignedTile){const clone=assignedTile.cloneNode(true);clone.classList.add('marketAssignedTile');rail.appendChild(clone)}else if(list){trimTileList(list);rail.appendChild(list)}}
      offer.append(main,rail);offer.classList.add('marketPolishedOffer')
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
