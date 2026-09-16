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

    @media(max-height:700px){
      .app{grid-template-rows:44px minmax(70px,auto) 28px minmax(0,1fr) auto!important}
      .gameHeader,.headerActions{min-height:44px!important;height:44px!important}
      .gameHeader .helpButton,#menuButton{height:44px!important}
      .app .label,.app .hint,.app .scoreCaption{font-size:11px!important}
      .app .btn{min-height:44px!important}
    }
  `;
  doc.head.appendChild(style);

  /* Load the approved gameplay composition after all legacy presentation layers. */
  if(!doc.querySelector('script[data-monoid-gameplay-ui-pass]')){
    const script=doc.createElement('script');script.src='gameplay-ui-pass.js?v=figma-20260917-1';script.async=false;script.dataset.monoidGameplayUiPass='true';doc.body.appendChild(script)
  }
})(window);
