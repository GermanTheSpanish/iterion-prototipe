(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.IterionPresentation=api;
  if(root&&root.document&&root.addEventListener)root.addEventListener('load',()=>api.installUiPolish(root));
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  // Display only. Never feed formatted values or animation timing into the engine.
  const UNITS=['','K','M','B','T','Qa','Qi','Sx','Sp','Oc','No','Dc'];
  const CASCADE=Object.freeze({firstMs:125,minMs:28,decay:0.94,maxLabels:8,finalMs:450});
  function exact(value){return Number.isFinite(value)?value.toLocaleString('en-US',{maximumFractionDigits:20}):String(value)}
  function compact(value){
    if(!Number.isFinite(value))return String(value);
    const sign=value<0?'-':'',n=Math.abs(value);
    if(n<1000)return exact(value);
    let tier=Math.floor(Math.log10(n)/3);
    if(tier>=UNITS.length)return value.toExponential(2).replace(/\.00e/,'e').replace(/(\.\d)0e/,'$1e').replace('e+','e');
    let scaled=n/1000**tier,rounded=Number(scaled.toPrecision(3));
    if(rounded>=1000&&tier<UNITS.length-1){tier++;scaled=n/1000**tier;rounded=Number(scaled.toPrecision(3))}
    const text=String(rounded).replace(/\.0+$/,'').replace(/(\.\d*?)0+$/,'$1');
    return sign+text+UNITS[tier]
  }
  function scoreDisplay(score,target){
    const targetText=compact(target),text=compact(score),below=score<target;
    return{score:text,target:targetText,
      note:below&&score>0&&score/target>=0.95?`${compact(target-score)} to target`:score>=target?'Target reached':'Last move'}
  }
  function cascadeDelay(index){return Math.max(CASCADE.minMs,Math.round(CASCADE.firstMs*CASCADE.decay**Math.max(0,index)))}
  function effectLifetime(index){return Math.max(120,cascadeDelay(index)*2+40)}
  function operationHalf(event,mainOperation){
    // Echo and Zero Memory inherit the physical half from their corresponding Main event.
    return event.exitHalf??(mainOperation?.piece===event.piece?mainOperation.exitHalf:undefined)
  }
  function fitFontSize(fontSize,measuredWidth,availableWidth){
    return measuredWidth>availableWidth?fontSize*Math.max(0,availableWidth)/measuredWidth:fontSize
  }
  // Presentation consumes engine events only. Echo events already contain their
  // resolved arithmetic and topology; filtering them never creates a new route.
  function signalPlan(events){
    const echo=events.filter(e=>e.type.startsWith('echo-')).map(e=>({...e,type:e.type.slice(5)}));
    const main=events.filter(e=>!e.type.startsWith('echo-')&&e.type!=='double-echo-result');
    return{main,echo,result:events.find(e=>e.type==='double-echo-result')||null}
  }
  function forkBlock(events,start){
    const fork=events[start].piece,branches=[];let i=start+1;
    while(i<events.length){const e=events[i];
      if(e.type==='signal-start'&&e.fork===fork){let j=i+1;while(j<events.length&&!(events[j].type==='signal-end'&&events[j].fork===fork&&events[j].arm===e.arm))j++;if(j>=events.length)return null;branches.push({arm:e.arm,events:events.slice(i+1,j),end:events[j]});i=j+1;continue}
      if(e.type==='signal-join'&&e.piece===fork)return{branches:branches.sort((a,b)=>a.arm-b.arm),join:e,next:i+1};i++
    }
    return null
  }
  function progressState(score,target){
    score=Math.max(0,Number(score)||0);target=Math.max(1,Number(target)||1);
    if(score<target)return{stage:'target',progress:Math.max(0,Math.min(1,score/target)),next:'TARGET'};
    if(score<target*3)return{stage:'clear',progress:Math.max(0,Math.min(1,(score-target)/(target*2))),next:'×3'};
    if(score<target*5)return{stage:'star1',progress:Math.max(0,Math.min(1,(score-target*3)/(target*2))),next:'×5'};
    if(score<target*10)return{stage:'star2',progress:Math.max(0,Math.min(1,(score-target*5)/(target*5))),next:'×10'};
    return{stage:'star3',progress:1,next:'MAX'}
  }
  function debugFilename(text){
    text=String(text||'');
    const version=(text.match(/^NOMON DEBUG v([^\r\n]+)/m)||[])[1]||'unknown';
    const runId=(text.match(/^Run ID:\s*([^\r\n]+)/m)||[])[1]||'run';
    const safe=s=>String(s).trim().replace(/[^a-zA-Z0-9._-]+/g,'-');
    return`NOMON_DEBUG_v${safe(version)}_${safe(runId)}.txt`
  }
  function installUiPolish(root){
    const doc=root?.document;if(!doc||root.__nomonUiPolishInstalled)return;root.__nomonUiPolishInstalled=true;
    const score=doc.getElementById('score'),scoreDetail=doc.getElementById('scoreDetail'),targetDetail=doc.getElementById('targetDetail'),scoreNote=doc.getElementById('scoreNote'),board=doc.getElementById('board'),runlog=doc.getElementById('runlog'),menuCopy=doc.getElementById('copyrun'),viewRun=doc.getElementById('viewrun'),gameMenu=doc.getElementById('gameMenu'),toast=doc.getElementById('toast');
    if(!score||!scoreDetail||!targetDetail||!board)return;
    const bar=doc.createElement('span');bar.className='scoreProgress';bar.setAttribute('aria-hidden','true');bar.innerHTML='<i class="scoreProgressTrack"><i class="scoreProgressFill"></i></i><i class="scoreProgressNext">TARGET</i>';scoreDetail.insertBefore(bar,scoreNote||null);
    const fill=bar.querySelector('.scoreProgressFill'),next=bar.querySelector('.scoreProgressNext');
    const ariaNumber=(el,prefix)=>{const label=el?.getAttribute('aria-label')||'',m=label.match(new RegExp(`${prefix}\\s+([-+0-9,.eE]+)`,'i'));return m?Number(m[1].replace(/,/g,'')):NaN};
    let targetValue=()=>ariaNumber(targetDetail,'Target'),displayed=ariaNumber(scoreDetail,'Score'),raf=0,animating=false;
    const paintProgress=value=>{const state=progressState(value,targetValue());bar.dataset.stage=state.stage;fill.style.width=`${Math.round(state.progress*10000)/100}%`;next.textContent=state.next;bar.setAttribute('aria-label',`${Math.round(state.progress*100)} percent to ${state.next}`)};
    if(!Number.isFinite(displayed))displayed=0;paintProgress(displayed);
    const tweenScore=value=>{
      value=Number(value);if(!Number.isFinite(value))return;if(raf)root.cancelAnimationFrame(raf);const from=Number.isFinite(displayed)?displayed:value,start=root.performance.now(),duration=95;animating=true;scoreDetail.classList.add('scoreLive');
      const step=now=>{const t=Math.min(1,(now-start)/duration),eased=1-Math.pow(1-t,3),v=from+(value-from)*eased;score.textContent=compact(v);paintProgress(v);if(t<1)raf=root.requestAnimationFrame(step);else{displayed=value;score.textContent=compact(value);paintProgress(value);animating=false;scoreDetail.classList.remove('scoreLive');raf=0}};raf=root.requestAnimationFrame(step)
    };
    const syncFromUi=()=>{const v=ariaNumber(scoreDetail,'Score');if(Number.isFinite(v)&&!animating){displayed=v;score.textContent=compact(v);paintProgress(v)}else paintProgress(displayed)};
    new MutationObserver(syncFromUi).observe(scoreDetail,{attributes:true,attributeFilter:['aria-label']});new MutationObserver(()=>paintProgress(displayed)).observe(targetDetail,{attributes:true,attributeFilter:['aria-label']});
    const boardObserver=new MutationObserver(records=>{
      let explicit=null;
      for(const record of records)for(const node of record.addedNodes){if(node.nodeType!==1)continue;const candidates=[node,...node.querySelectorAll?.('.joinFx,.echoJoin')||[]];for(const el of candidates)if((el.classList?.contains('joinFx')||el.classList?.contains('echoJoin'))&&Number.isFinite(Number(el.dataset.output)))explicit=Number(el.dataset.output)}
      if(explicit==null){const live=[...board.querySelectorAll('.signalValue')].filter(el=>Number.isFinite(Number(el.dataset.output)));if(live.length===1)explicit=Number(live[0].dataset.output)}
      if(explicit!=null)tweenScore(explicit)
    });boardObserver.observe(board,{childList:true,subtree:true});
    const feedback=text=>{if(!toast)return;toast.textContent=text;toast.classList.add('show');root.setTimeout(()=>toast.classList.remove('show'),1300)};
    const debugTextFromUi=()=>{
      let ta=runlog?.querySelector('.runDataText');if(ta)return ta.value;
      const wasOpen=runlog?.classList.contains('show');try{viewRun?.click()}catch(_){}ta=runlog?.querySelector('.runDataText');const text=ta?.value||'';if(!wasOpen&&runlog?.classList.contains('show')){try{viewRun?.click()}catch(_){}}return text
    };
    const downloadDebug=(text,filename)=>{const blob=new Blob([text],{type:'text/plain'}),url=root.URL.createObjectURL(blob),a=doc.createElement('a');a.href=url;a.download=filename;a.style.display='none';doc.body.appendChild(a);a.click();root.setTimeout(()=>{root.URL.revokeObjectURL(url);a.remove()},0)};
    const shareDebug=async textOverride=>{
      const text=typeof textOverride==='string'?textOverride:debugTextFromUi();if(!text){feedback('Debug unavailable');return false}const filename=debugFilename(text),file=new File([text],filename,{type:'text/plain'});
      if(root.navigator?.share){let canFiles=true;try{if(root.navigator.canShare)canFiles=root.navigator.canShare({files:[file]})}catch(_){canFiles=false}if(canFiles){try{await root.navigator.share({files:[file],title:'NOMON DEBUG'});feedback('DEBUG READY');return true}catch(err){if(err?.name==='AbortError')return false}}}
      try{downloadDebug(text,filename);feedback('DEBUG READY');return true}catch(_){feedback('Debug export failed');return false}
    };
    const patchRunlog=()=>{const button=runlog?.querySelector('.tool');if(!button)return;button.textContent='SHARE .TXT';button.onclick=()=>shareDebug(runlog.querySelector('.runDataText')?.value||'')};
    if(runlog){new MutationObserver(patchRunlog).observe(runlog,{childList:true,subtree:true});patchRunlog()}
    if(menuCopy){menuCopy.textContent='Share debug .txt';menuCopy.onclick=async()=>{try{if(gameMenu?.open)gameMenu.close()}catch(_){}await shareDebug()}}
    root.NomonUiPolish=Object.freeze({shareDebug,debugTextFromUi,paintProgress,tweenScore})
  }
  return Object.freeze({compact,exact,scoreDisplay,cascadeDelay,effectLifetime,operationHalf,fitFontSize,signalPlan,forkBlock,progressState,debugFilename,installUiPolish,CASCADE});
});
