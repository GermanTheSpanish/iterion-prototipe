(function(root){
  'use strict';
  const doc=root.document;
  if(!doc||root.__monoidUpdateBootstrapped)return;
  root.__monoidUpdateBootstrapped=true;

  const CURRENT_BUILD='20260925.1',CHECK_MIN_MS=60000;
  const state={currentBuild:CURRENT_BUILD,latestBuild:null,latestVersion:null,updateAvailable:false,status:'idle',lastCheck:0};
  let checkButton=null,applyButton=null,startupTimer=0;
  Object.defineProperty(root,'__monoidUpdate',{configurable:true,get:()=>({...state})});

  const versionLabel=(build=CURRENT_BUILD,version=root.IterionData?.VERSION||'dev')=>`v${version} · build ${build}`;
  function compareBuilds(a,b){
    const parts=value=>String(value||'').split(/[^0-9]+/).filter(Boolean).map(Number),aa=parts(a),bb=parts(b),n=Math.max(aa.length,bb.length);
    for(let i=0;i<n;i++){const delta=(aa[i]||0)-(bb[i]||0);if(delta)return delta}
    return 0
  }
  function syncBuildStamp(){
    const label=versionLabel(),entry=doc.getElementById('devBuildStamp'),menu=doc.querySelector('.menuBuildStamp');
    if(entry&&entry.textContent!==label)entry.textContent=label;if(menu&&menu.textContent!==label)menu.textContent=label
  }
  function syncButtons(){
    if(!checkButton)return;checkButton.disabled=state.status==='checking'||state.status==='reloading';
    if(state.status==='checking')checkButton.textContent='CHECKING…';
    else if(state.updateAvailable)checkButton.textContent=`UPDATE AVAILABLE · ${state.latestBuild}`;
    else if(state.status==='error')checkButton.textContent='CHECK FAILED · TAP TO RETRY';
    else if(state.status==='current')checkButton.textContent=`UP TO DATE · ${CURRENT_BUILD}`;
    else checkButton.textContent='CHECK FOR UPDATES';
    if(applyButton){applyButton.hidden=!state.updateAvailable;applyButton.disabled=state.status==='reloading'}
  }
  function installMenuActions(){
    const menu=doc.getElementById('gameMenu'),anchor=doc.getElementById('gameSelectionButton');if(!menu||!anchor)return;
    if(!checkButton){checkButton=doc.createElement('button');checkButton.id='checkForUpdates';checkButton.className='menuAction';checkButton.textContent='CHECK FOR UPDATES';checkButton.addEventListener('click',()=>checkForUpdates({silent:false,force:true}));menu.insertBefore(checkButton,anchor)}
    if(!applyButton){applyButton=doc.createElement('button');applyButton.id='applyMonoidUpdate';applyButton.className='menuAction';applyButton.textContent='RELOAD & UPDATE';applyButton.hidden=true;applyButton.addEventListener('click',applyUpdate);menu.insertBefore(applyButton,anchor)}
    syncButtons()
  }
  function persistActiveRun(){
    if(new URL(root.location.href).searchParams.has('qa'))return;
    const flow=root.__monoidFlow,game=root.__monoidGame;if(flow?.screen!=='game'||!game?.exportState)return;
    try{root.localStorage.setItem('iterion.activeRun.v1',JSON.stringify(game.exportState()))}catch(_){ }
  }
  async function checkForUpdates({silent=false,force=false}={}){
    const now=Date.now();if(!force&&state.lastCheck&&now-state.lastCheck<CHECK_MIN_MS)return state.updateAvailable;
    state.lastCheck=now;state.status='checking';installMenuActions();syncButtons();
    try{
      const response=await root.fetch(`build.json?ts=${now}`,{cache:'no-store'});if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const info=await response.json();if(!info?.build)throw new Error('Missing build id');
      state.latestBuild=String(info.build);state.latestVersion=String(info.version||root.IterionData?.VERSION||'dev');state.updateAvailable=compareBuilds(state.latestBuild,CURRENT_BUILD)>0;state.status=state.updateAvailable?'available':'current';syncButtons();return state.updateAvailable
    }catch(error){state.updateAvailable=false;state.status='error';syncButtons();console.warn('MONOID update check failed',error);return false}
  }
  async function applyUpdate(){
    if(!state.updateAvailable)return;persistActiveRun();state.status='reloading';syncButtons();if(applyButton)applyButton.textContent='UPDATING…';
    try{const reg=await root.navigator?.serviceWorker?.getRegistration?.();await reg?.update?.()}catch(_){ }
    const url=new URL(root.location.href);url.searchParams.set('_monoidUpdate',String(state.latestBuild||Date.now()));url.searchParams.set('_monoidReload',String(Date.now()));root.location.replace(url.href)
  }
  function scheduleStartupCheck(delay=350){if(startupTimer)clearTimeout(startupTimer);startupTimer=setTimeout(()=>{startupTimer=0;checkForUpdates({silent:true,force:true})},delay)}
  function workerChanged(){checkForUpdates({silent:true,force:true})}

  const style=doc.createElement('style');style.id='monoid-update-style';style.textContent='#checkForUpdates,#applyMonoidUpdate{letter-spacing:.02em}#applyMonoidUpdate{background:#151515;color:#fff;border-color:#151515}';doc.head.appendChild(style);
  root.MonoidUpdate=Object.freeze({checkForUpdates,applyUpdate});
  new MutationObserver(syncBuildStamp).observe(doc.body,{subtree:true,childList:true});
  doc.addEventListener('visibilitychange',()=>{if(doc.visibilityState==='visible')checkForUpdates({silent:true})});
  root.addEventListener('pageshow',()=>checkForUpdates({silent:true,force:true}));
  const sw=root.navigator?.serviceWorker;if(sw?.addEventListener){sw.addEventListener('controllerchange',workerChanged);sw.addEventListener('message',event=>{if(event.data?.type==='MONOID_SW_UPDATED')workerChanged()})}
  installMenuActions();syncBuildStamp();scheduleStartupCheck()
})(window);
