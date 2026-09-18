(function(root){
  'use strict';
  const doc=root.document;
  if(!doc||root.__monoidPwaBootstrapped)return;
  root.__monoidPwaBootstrapped=true;

  const nav=root.navigator||{},ua=nav.userAgent||'';
  const ios=/iPad|iPhone|iPod/i.test(ua)||(nav.platform==='MacIntel'&&(nav.maxTouchPoints||0)>1);
  const android=/Android/i.test(ua),mobile=ios||android;
  const GUARD_KEY='monoidBackGuardV1',SHELL_BUILD='20260918.9';
  const state={deferredPrompt:null,installOutcome:null,swRegistered:false,swScope:null,backIntercepts:0,mobile,ios,android};
  const inDisplayMode=()=>!!(nav.standalone===true||root.matchMedia?.('(display-mode: fullscreen)').matches||root.matchMedia?.('(display-mode: standalone)').matches);
  Object.defineProperty(root,'__monoidPwa',{configurable:true,get:()=>({...state,installed:inDisplayMode()})});

  function ensureMeta(name,content){let el=doc.head.querySelector(`meta[name="${name}"]`);if(!el){el=doc.createElement('meta');el.name=name;doc.head.appendChild(el)}el.content=content;return el}
  function ensureLink(rel,href,type){let el=doc.head.querySelector(`link[rel="${rel}"]`);if(!el){el=doc.createElement('link');el.rel=rel;doc.head.appendChild(el)}el.href=href;if(type)el.type=type;return el}
  ensureLink('manifest','manifest.webmanifest','application/manifest+json');
  ensureLink('icon','monoid-icon.svg','image/svg+xml');
  ensureLink('apple-touch-icon','monoid-icon.svg');
  ensureMeta('mobile-web-app-capable','yes');
  ensureMeta('apple-mobile-web-app-capable','yes');
  ensureMeta('apple-mobile-web-app-title','MONOID');
  ensureMeta('apple-mobile-web-app-status-bar-style','default');

  const style=doc.createElement('style');style.id='monoid-pwa-shell';style.textContent=`
    @media (display-mode:standalone),(display-mode:fullscreen){
      .app{padding-bottom:max(10px,env(safe-area-inset-bottom))!important}
      .entryFlow{padding-bottom:max(16px,env(safe-area-inset-bottom))!important}
    }
    #pwaInstallDialog .pwaInstallCopy{font-size:14px;line-height:1.5;color:var(--muted);margin:16px 0}
    #pwaInstallDialog .pwaInstallClose{display:block;width:100%;min-height:48px;border:0;border-top:1px solid var(--line);background:none;color:inherit;font-size:16px;text-align:left}
  `;doc.head.appendChild(style);

  let installDialog=null;
  function showInstallHelp(){
    if(!installDialog){
      installDialog=doc.createElement('dialog');installDialog.id='pwaInstallDialog';installDialog.className='gameMenu';installDialog.innerHTML='<div class="menuHead"><h2>Install MONOID</h2><button class="iconButton" aria-label="Close install help">×</button></div><p class="pwaInstallCopy"></p><button class="pwaInstallClose">Done</button>';doc.body.appendChild(installDialog);
      const close=()=>installDialog.close();installDialog.querySelector('.iconButton').addEventListener('click',close);installDialog.querySelector('.pwaInstallClose').addEventListener('click',close)
    }
    const copy=installDialog.querySelector('.pwaInstallCopy');
    copy.textContent=ios?'In Safari, tap Share, choose Add to Home Screen, then Add. Open MONOID from the new Home Screen icon for the app view.':'In Chrome, open the menu and choose Install app or Add to Home screen. Then launch MONOID from its icon.';
    if(!installDialog.open)installDialog.showModal()
  }

  let installAction=null;
  function removeInstallAction(){installAction?.remove();installAction=null}
  function ensureInstallAction(){
    if(!mobile||inDisplayMode()){removeInstallAction();return}
    const menu=doc.getElementById('gameMenu'),anchor=doc.getElementById('gameSelectionButton');if(!menu||!anchor||installAction)return;
    installAction=doc.createElement('button');installAction.id='installMonoidApp';installAction.className='menuAction';installAction.textContent='Install MONOID';menu.insertBefore(installAction,anchor);
    installAction.addEventListener('click',async()=>{
      const prompt=state.deferredPrompt;
      if(prompt){state.deferredPrompt=null;if(menu.open)menu.close();await prompt.prompt();const choice=await prompt.userChoice;state.installOutcome=choice?.outcome||null;if(state.installOutcome==='accepted')removeInstallAction();return}
      showInstallHelp()
    })
  }

  root.addEventListener('beforeinstallprompt',event=>{event.preventDefault();state.deferredPrompt=event;ensureInstallAction()});
  root.addEventListener('appinstalled',()=>{state.installOutcome='installed';state.deferredPrompt=null;removeInstallAction()});

  function gameplayVisible(){const app=doc.querySelector('.app');return!!(app&&!app.hidden&&app.getAttribute('aria-hidden')!=='true')}
  function guardState(){return{...(root.history.state||{}),[GUARD_KEY]:true}}
  function armBackGuard(){if(!inDisplayMode()||!gameplayVisible()||root.history.state?.[GUARD_KEY])return;root.history.pushState(guardState(),'')}
  root.addEventListener('popstate',()=>{
    if(!inDisplayMode()||!gameplayVisible())return;
    root.history.pushState(guardState(),'');state.backIntercepts++;
    if(installDialog?.open){installDialog.close();return}
    const menu=doc.getElementById('gameMenu');if(menu?.open){doc.getElementById('closeMenu')?.click();return}
    const overlay=doc.getElementById('overlay');if(overlay?.classList.contains('show'))return;
    doc.getElementById('menuButton')?.click()
  });

  function syncShell(){doc.documentElement.classList.toggle('monoid-installed',inDisplayMode());ensureInstallAction();armBackGuard()}
  new MutationObserver(syncShell).observe(doc.body,{subtree:true,attributes:true,attributeFilter:['hidden','aria-hidden','open']});
  root.addEventListener('pageshow',syncShell);root.addEventListener('focus',syncShell);syncShell();

  async function registerServiceWorker(){
    if(!('serviceWorker'in nav))return;
    const local=/^(localhost|127\.0\.0\.1)$/.test(root.location.hostname);if(root.location.protocol!=='https:'&&!local)return;
    try{const reg=await nav.serviceWorker.register(`sw.js?v=${SHELL_BUILD}`,{scope:'./',updateViaCache:'none'});state.swRegistered=true;state.swScope=reg.scope;reg.update().catch(()=>{})}catch(error){state.swRegistered=false;state.swScope=null;console.warn('MONOID PWA service worker registration failed',error)}
  }
  if(doc.readyState==='complete')registerServiceWorker();else root.addEventListener('load',registerServiceWorker,{once:true});

  function loadUiLayer(){
    if(!doc.querySelector('script[data-monoid-ui-extras]')){const script=doc.createElement('script');script.src=`ui-extras.js?v=${SHELL_BUILD}`;script.async=false;script.dataset.monoidUiExtras='true';doc.body.appendChild(script)}
    if(!doc.querySelector('script[data-monoid-ui-runtime-fixes]')){const script=doc.createElement('script');script.src=`ui-runtime-fixes.js?v=${SHELL_BUILD}`;script.async=false;script.dataset.monoidUiRuntimeFixes='true';doc.body.appendChild(script)}
    if(!doc.querySelector('script[data-monoid-ui-late-polish]')){const script=doc.createElement('script');script.src=`ui-late-polish.js?v=${SHELL_BUILD}`;script.async=false;script.dataset.monoidUiLatePolish='true';doc.body.appendChild(script)}
  }
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',loadUiLayer,{once:true});else loadUiLayer()
})(window);
