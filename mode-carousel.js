(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.MonoidModeCarousel=api;
  if(root.document){
    const start=()=>api.mount(root);
    if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',start,{once:true});
    else start();
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const ACTIVE_MODE_KEY='iterion.activeRunMode.v1';
  const SPACING=98;
  const MAGNET_RADIUS=30;
  const MAGNET_STRENGTH=.72;
  const SWIPE_THRESHOLD=28;
  const MIN_FLING_DISTANCE=18;
  const FLING_PROJECTION_MS=70;
  const SETTLE_APPROACH_MS=250;
  const SETTLE_LAND_MS=140;
  const SETTLE_MIN_APPROACH_MS=140;
  const SETTLE_MIN_LAND_MS=70;
  const SETTLE_MS=SETTLE_APPROACH_MS+SETTLE_LAND_MS;
  const SETTLE_OVERSHOOT=8;
  const MODES=Object.freeze([
    Object.freeze({id:'classic',name:'CLASSIC',description:'The original machine',available:true,kind:'classic'}),
    Object.freeze({id:'infinite-endless',name:'INFINITE ENDLESS',description:'Classic → Endless · Infinite after 15 Endless stages',available:true,kind:'infinite'}),
    ...Array.from({length:6},(_,i)=>Object.freeze({id:`locked-${i+1}`,name:'LOCKED',description:'Not available',available:false,kind:'locked'}))
  ]);
  const clampIndex=index=>Math.max(0,Math.min(MODES.length-1,Number.isFinite(index)?Math.trunc(index):0));
  const wrapIndex=index=>{const n=Number.isFinite(index)?Math.trunc(index):0;return((n%MODES.length)+MODES.length)%MODES.length};
  const stepIndex=(index,delta)=>wrapIndex(wrapIndex(index)+Math.sign(delta||0));
  function cyclicOffset(index,selected){
    let offset=wrapIndex(index)-wrapIndex(selected),half=MODES.length/2;
    if(offset>half)offset-=MODES.length;
    if(offset<-half)offset+=MODES.length;
    return offset
  }
  function magnetizeDrag(value){
    const x=Math.max(-SPACING,Math.min(SPACING,Number(value)||0)),targets=[-SPACING,0,SPACING];
    let target=targets[0];for(const candidate of targets)if(Math.abs(x-candidate)<Math.abs(x-target))target=candidate;
    const distance=target-x,abs=Math.abs(distance);if(abs>=MAGNET_RADIUS)return x;
    const pull=MAGNET_STRENGTH*(1-abs/MAGNET_RADIUS);return x+distance*pull
  }
  function settleProfile(startShift,targetShift){
    const remaining=Math.min(SPACING,Math.abs((Number(targetShift)||0)-(Number(startShift)||0))),t=remaining/SPACING,strength=t*t*(3-2*t);
    return Object.freeze({remaining,strength,overshoot:SETTLE_OVERSHOOT*strength,approachMs:Math.round(SETTLE_MIN_APPROACH_MS+(SETTLE_APPROACH_MS-SETTLE_MIN_APPROACH_MS)*strength),landMs:Math.round(SETTLE_MIN_LAND_MS+(SETTLE_LAND_MS-SETTLE_MIN_LAND_MS)*strength)})
  }
  function injectStyles(doc){
    if(doc.getElementById('monoidModeCarouselStyles'))return;
    const style=doc.createElement('style');style.id='monoidModeCarouselStyles';style.textContent=`
.modeCarouselFrame{position:relative;display:grid!important;grid-template-rows:116px auto auto;justify-items:center;gap:9px;width:min(240px,72vw);min-height:196px;padding:18px 0 16px!important;overflow:hidden;color:#151515;cursor:default}
.modeCarouselViewport{position:relative;width:100%;height:116px;overflow:hidden;touch-action:pan-y;cursor:grab;user-select:none;-webkit-user-select:none}
.modeCarouselViewport.isDragging{cursor:grabbing}
.modeSlide{appearance:none;position:absolute;left:50%;top:2px;width:72px;height:112px;margin:0;padding:0;border:0;background:transparent;color:#151515;display:grid;place-items:center;transform:translateX(-50%);translate:var(--mode-x,0px) 0;transform-origin:center;transition:translate .24s cubic-bezier(.22,.72,.24,1),opacity .18s ease;will-change:translate,opacity;touch-action:none}
.modeCarouselViewport.isDragging .modeSlide,.modeCarouselViewport.isRebasing .modeSlide{transition:none!important}
.modeCarouselViewport.isPulling .modeSlide{transition:translate var(--settle-approach-ms,${SETTLE_APPROACH_MS}ms) cubic-bezier(.30,0,.22,1),opacity .18s ease}
.modeCarouselViewport.isLanding .modeSlide{transition:translate var(--settle-land-ms,${SETTLE_LAND_MS}ms) cubic-bezier(.18,.72,.28,1),opacity .12s ease}
.modeSlide.isSelected{z-index:3}.modeSlide.isNeighbor{z-index:2}.modeSlide.isRemote{visibility:hidden;pointer-events:none}.modeSlide.isRemote .modeTile{visibility:visible}
.modeSlide:focus-visible{outline:1px solid #151515;outline-offset:2px}
.modeSlide .selectionDouble{margin:0;flex:none;box-shadow:none;transform-origin:center}
.modeSlide .modeTile{transform:scale(var(--tile-scale,1));transition:transform .18s ease}
.modeCarouselViewport.isDragging .modeTile,.modeCarouselViewport.isRebasing .modeTile{transition:none!important}
.modeCarouselViewport.isPulling .modeTile{transition:transform var(--settle-approach-ms,${SETTLE_APPROACH_MS}ms) cubic-bezier(.30,0,.22,1)}
.modeCarouselViewport.isLanding .modeTile{transition:transform var(--settle-land-ms,${SETTLE_LAND_MS}ms) cubic-bezier(.18,.72,.28,1)}
.modeTileInfinite,.modeTileLocked{position:relative;overflow:hidden}
.modeTileInfinite{background:#151515!important;border-color:#151515!important;color:#fff}
.modeTileInfinite::after,.modeTileLocked::after{content:"";position:absolute;left:0;right:0;top:50%;height:2px;transform:translateY(-50%);background:currentColor;opacity:.9}
.modeTileInfinite b{position:absolute;inset:0;z-index:2;display:grid;place-items:center;color:#fff;font-size:42px;font-weight:500;line-height:1}
.modeTileLocked{background:#b9b9b3!important;border-color:#8f8f8a!important;color:#8f8f8a}
.modeCarouselFrame>strong{font-size:15px;letter-spacing:.13em;line-height:1.1}
.modeCarouselFrame>small{min-height:16px;color:#61615b;line-height:1.2}
.modeCarouselFrame[data-mode-available="false"]>strong,.modeCarouselFrame[data-mode-available="false"]>small{color:#777771}
@media(prefers-reduced-motion:reduce){.modeSlide,.modeCarouselViewport.isDragging .modeSlide,.modeCarouselViewport.isPulling .modeSlide,.modeCarouselViewport.isLanding .modeSlide,.modeSlide .modeTile{transition:none!important}}
`;
    doc.head.appendChild(style)
  }
  function tileMarkup(mode){
    if(mode.kind==='classic')return '<span class="selectionDouble modeTile modeTileClassic" aria-hidden="true"><i></i><i></i></span>';
    if(mode.kind==='infinite')return '<span class="selectionDouble modeTile modeTileInfinite" aria-hidden="true"><b>∞</b></span>';
    return '<span class="selectionDouble modeTile modeTileLocked" aria-hidden="true"></span>'
  }
  function mount(root){
    const doc=root.document,oldClassic=doc.getElementById('modeClassic');
    if(!doc||!oldClassic||doc.getElementById('modeCarouselFrame'))return false;
    injectStyles(doc);
    const startRun=doc.getElementById('startRun'),continueRun=doc.getElementById('continueRun');
    if(!startRun)return false;
    const originalStart=startRun.onclick,originalContinue=continueRun?.onclick||null;
    const frame=doc.createElement('div');frame.id='modeCarouselFrame';frame.className='modeCard modeCarouselFrame';frame.tabIndex=0;frame.setAttribute('role','group');frame.setAttribute('aria-label','Game mode selector');
    const viewport=doc.createElement('div');viewport.id='modeCarouselViewport';viewport.className='modeCarouselViewport';
    const slides=MODES.map((mode,index)=>{const button=doc.createElement('button');button.type='button';button.className='modeSlide';button.dataset.mode=mode.id;button.dataset.index=String(index);button.setAttribute('aria-label',mode.available?mode.name:`Unavailable mode ${index-1}`);if(!mode.available)button.setAttribute('aria-disabled','true');button.innerHTML=tileMarkup(mode);viewport.appendChild(button);return button});
    slides[0].id='modeClassic';slides[1].id='modeInfiniteEndless';
    const name=doc.createElement('strong');name.id='modeName';
    const description=doc.createElement('small');description.id='modeDescription';
    frame.append(viewport,name,description);oldClassic.replaceWith(frame);
    let selected=0,drag=null,suppressClickUntil=0,settleTimer=0,settleState=null;
    function render(trackX=0){
      const mode=MODES[selected];frame.dataset.mode=mode.id;frame.dataset.modeAvailable=String(mode.available);name.textContent=mode.name;description.textContent=mode.description;startRun.disabled=!mode.available;
      slides.forEach((slide,i)=>{const offset=cyclicOffset(i,selected),abs=Math.abs(offset),x=offset*SPACING+trackX,progress=Math.min(1,Math.abs(x)/SPACING),scale=1-.18*progress,opacity=1-.22*progress;slide.classList.toggle('isSelected',offset===0);slide.classList.toggle('isNeighbor',abs===1);slide.classList.toggle('isRemote',abs>1);slide.setAttribute('aria-pressed',offset===0?'true':'false');slide.tabIndex=abs<=1?0:-1;slide.style.opacity=String(opacity);slide.style.setProperty('--mode-x',`${x}px`);slide.style.setProperty('--tile-scale',String(scale))});
      root.__monoidSelectedMode=mode.id;if(root.__monoidModes)root.__monoidModes.selected=mode.id
    }
    function clearSettleTimer(){if(settleTimer){root.clearTimeout(settleTimer);settleTimer=0}}
    function clearSettleVars(){viewport.style.removeProperty('--settle-approach-ms');viewport.style.removeProperty('--settle-land-ms')}
    function commitSettle(){
      if(!settleState)return;
      const next=settleState.next;
      clearSettleTimer();viewport.classList.remove('isPulling','isLanding');viewport.classList.add('isRebasing');selected=next;render(0);void viewport.offsetWidth;viewport.classList.remove('isRebasing');clearSettleVars();settleState=null
    }
    function stopSettling(commit=true){
      if(settleState){if(commit)commitSettle();else{clearSettleTimer();settleState=null;viewport.classList.remove('isPulling','isLanding','isRebasing');clearSettleVars()}}
      else{viewport.classList.remove('isPulling','isLanding','isRebasing');clearSettleVars()}
    }
    function settle(next,startShift,targetShift){
      stopSettling(true);
      const nextIndex=wrapIndex(next),reduced=root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if(reduced){viewport.classList.remove('isDragging');selected=nextIndex;render(0);return MODES[selected]}
      const travel=targetShift-startShift,direction=Math.sign(travel)||Math.sign(-startShift),profile=settleProfile(startShift,targetShift);
      if(!direction||profile.remaining<.5){selected=nextIndex;render(0);return MODES[selected]}
      const overshootShift=targetShift+direction*profile.overshoot;
      viewport.style.setProperty('--settle-approach-ms',`${profile.approachMs}ms`);viewport.style.setProperty('--settle-land-ms',`${profile.landMs}ms`);
      settleState={next:nextIndex,targetShift,profile};viewport.classList.remove('isDragging','isLanding');viewport.classList.add('isPulling');void viewport.offsetWidth;render(overshootShift);
      settleTimer=root.setTimeout(()=>{if(!settleState)return;viewport.classList.remove('isPulling');viewport.classList.add('isLanding');void viewport.offsetWidth;render(settleState.targetShift);settleTimer=root.setTimeout(commitSettle,settleState.profile.landMs+20)},profile.approachMs);
      return MODES[nextIndex]
    }
    function select(index){
      stopSettling(true);viewport.classList.add('isRebasing');selected=clampIndex(index);render(0);void viewport.offsetWidth;viewport.classList.remove('isRebasing');return MODES[selected]
    }
    slides.forEach((slide,i)=>slide.addEventListener('click',e=>{e.preventDefault();if(Date.now()<suppressClickUntil)return;const offset=cyclicOffset(i,selected);if(Math.abs(offset)!==1)return;if(settleState)stopSettling(true);settle(i,0,-offset*SPACING)}));
    viewport.addEventListener('pointerdown',e=>{if(e.button!=null&&e.button!==0)return;stopSettling(true);const now=root.performance?.now?.()??Date.now();drag={id:e.pointerId,startX:e.clientX,lastX:e.clientX,lastAt:now,velocityX:0,visualX:0};viewport.classList.add('isDragging');viewport.setPointerCapture?.(e.pointerId)});
    viewport.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const now=root.performance?.now?.()??Date.now(),dt=Math.max(1,now-drag.lastAt),instant=(e.clientX-drag.lastX)/dt;drag.velocityX=drag.velocityX*.62+instant*.38;drag.lastX=e.clientX;drag.lastAt=now;drag.visualX=magnetizeDrag(e.clientX-drag.startX);render(drag.visualX)});
    function finishDrag(e){
      if(!drag||e.pointerId!==drag.id)return;
      const dx=drag.lastX-drag.startX,projected=dx+drag.velocityX*FLING_PROJECTION_MS,distanceEnough=Math.abs(dx)>=SWIPE_THRESHOLD,flingEnough=Math.abs(dx)>=MIN_FLING_DISTANCE&&Math.abs(projected)>=SWIPE_THRESHOLD,delta=distanceEnough||flingEnough?(projected<0?1:-1):0,next=delta?stepIndex(selected,delta):selected,startShift=drag.visualX,targetShift=-delta*SPACING;
      drag=null;viewport.classList.remove('isDragging');suppressClickUntil=Date.now()+SETTLE_MS+80;settle(next,startShift,targetShift)
    }
    viewport.addEventListener('pointerup',finishDrag);viewport.addEventListener('pointercancel',e=>{if(!drag||e.pointerId!==drag.id)return;const startShift=drag.visualX;drag=null;viewport.classList.remove('isDragging');settle(selected,startShift,0)});
    frame.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();settle(stepIndex(selected,1),0,-SPACING)}else if(e.key==='ArrowLeft'){e.preventDefault();settle(stepIndex(selected,-1),0,SPACING)}});
    startRun.onclick=function(event){stopSettling(true);const mode=MODES[selected];if(!mode.available)return;const previousMode=root.localStorage?.getItem(ACTIVE_MODE_KEY)||'classic',beforeSaved=root.localStorage?.getItem('iterion.activeRun.v1')||null;root.localStorage?.setItem(ACTIVE_MODE_KEY,mode.id);root.__monoidActiveMode=mode.id;originalStart?.call(this,event);const afterSaved=root.localStorage?.getItem('iterion.activeRun.v1')||null;if(beforeSaved&&beforeSaved===afterSaved&&!doc.getElementById('gameSelection')?.hidden){root.localStorage?.setItem(ACTIVE_MODE_KEY,previousMode);root.__monoidActiveMode=previousMode}}
    if(continueRun)continueRun.onclick=function(event){stopSettling(true);const mode=root.localStorage?.getItem(ACTIVE_MODE_KEY)||'classic';root.__monoidActiveMode=mode;return originalContinue?.call(this,event)};
    root.__monoidModes={modes:MODES,selected:MODES[0].id,get active(){return root.localStorage?.getItem(ACTIVE_MODE_KEY)||'classic'},select};
    render();return true
  }
  return{ACTIVE_MODE_KEY,MODES,SPACING,SETTLE_MS,SETTLE_APPROACH_MS,SETTLE_LAND_MS,SETTLE_MIN_APPROACH_MS,SETTLE_MIN_LAND_MS,SETTLE_OVERSHOOT,clampIndex,wrapIndex,stepIndex,cyclicOffset,magnetizeDrag,settleProfile,mount};
});
