(function(root){
  'use strict';
  const doc=root.document;
  if(!doc||root.__monoidPhaseAMobileFixInstalled)return;
  root.__monoidPhaseAMobileFixInstalled=true;

  const BUILD_ID='20260918.2';
  const style=doc.createElement('style');
  style.id='monoid-phase-a-mobile-fix';
  style.textContent=`
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
    body.endlessPalette .overlay,body.endlessPalette .gameMenu::backdrop{background:rgba(24,24,22,.78)!important}
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
    if(!doc.getElementById('monoid-phase-a-ui')||!doc.getElementById('monoid-gameplay-ui-pass')){root.requestAnimationFrame(installLast);return}
    doc.head.appendChild(style);placeMachineStatus();syncBuildStamp();
    new MutationObserver(syncBuildStamp).observe(doc.body,{subtree:true,childList:true,characterData:true});
    root.addEventListener('pageshow',syncBuildStamp);root.addEventListener('resize',syncBuildStamp)
  }
  root.MonoidPhaseAMobileFix=Object.freeze({BUILD_ID,syncBuildStamp,placeMachineStatus});
  installLast()
})(window);
