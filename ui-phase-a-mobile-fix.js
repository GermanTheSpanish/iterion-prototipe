(function(root){
  'use strict';
  const doc=root.document;
  if(!doc||root.__monoidPhaseAMobileFixInstalled)return;
  root.__monoidPhaseAMobileFixInstalled=true;

  const BUILD_ID='20260917.2';
  const style=doc.createElement('style');
  style.id='monoid-phase-a-mobile-fix';
  style.textContent=`
    /* Phase A accidentally changed the approved viewport-centred wordmark back to
       header-relative positioning. Keep MONOID anchored to the physical phone. */
    .gameHeader .wordmark{
      position:fixed!important;
      left:50vw!important;
      top:calc(8px + env(safe-area-inset-top) + 22px)!important;
      transform:translate(-50%,-50%)!important;
    }
    @media(max-height:720px){
      .gameHeader .wordmark{top:calc(5px + env(safe-area-inset-top) + 20px)!important}
    }
  `;

  function syncBuildStamp(){
    root.__MONOID_BUILD=BUILD_ID;
    const text=`v${root.IterionData?.VERSION||'dev'} · build ${BUILD_ID}`;
    const entry=doc.getElementById('devBuildStamp'),menu=doc.querySelector('.menuBuildStamp');
    if(entry&&entry.textContent!==text)entry.textContent=text;
    if(menu&&menu.textContent!==text)menu.textContent=text
  }
  function installLast(){
    if(!doc.getElementById('monoid-phase-a-ui')||!doc.getElementById('monoid-gameplay-ui-pass')){root.requestAnimationFrame(installLast);return}
    doc.head.appendChild(style);syncBuildStamp();
    new MutationObserver(syncBuildStamp).observe(doc.body,{subtree:true,childList:true,characterData:true});
    root.addEventListener('pageshow',syncBuildStamp);root.addEventListener('resize',syncBuildStamp)
  }
  root.MonoidPhaseAMobileFix=Object.freeze({BUILD_ID,syncBuildStamp});
  installLast()
})(window);
