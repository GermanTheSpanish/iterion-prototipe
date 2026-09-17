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
  const OVERSHOOT_RATIO=.18;
  const OVERSHOOT_MIN=4;
  const OVERSHOOT_MAX=11;
  const MODES=Object.freeze([
    Object.freeze({id:'classic',name:'CLASSIC',description:'The original machine',available:true,kind:'classic'}),
    Object.freeze({id:'prototype',name:'PROTOTYPE',description:'Experimental rules',available:true,kind:'prototype'}),
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
  function snapOvershoot(releaseOffset){
    const value=Number(releaseOffset)||0,abs=Math.abs(value);
    if(abs<.5)return 0;
    const magnitude=Math.min(OVERSHOOT_MAX,Math.max(OVERSHOOT_MIN,abs*OVERSHOOT_RATIO));
    return-Math.sign(value)*magnitude
  }
  function injectStyles(doc){
    if(doc.getElementById('monoidModeCarouselStyles'))return;
    const style=doc.createElement('style');style.id='monoidModeCarouselStyles';style.textContent=`
.modeCarouselFrame{position:relative;display:grid!important;grid-template-rows:116px auto auto;justify-items:center;gap:9px;width:min(240px,72vw);min-height:196px;padding:18px 0 16px!important;overflow:hidden;color:#151515;cursor:default}
.modeCarouselViewport{position:relative;width:100%;height:116px;overflow:hidden;touch-action:pan-y;cursor:grab;user-select:none;-webkit-user-select:none}
.modeCarouselViewport.isDragging{cursor:grabbing}
.modeSlide{appearance:none;position:absolute;left:50%;top:2px;width:72px;height:112px;margin:0;padding:0;border:0;background:transparent;color:#151515;display:grid;place-items:center;transform-origin:center;transition:transform .24s cubic-bezier(.2,.78,.22,1),opacity .16s ease;will-change:transform,opacity;touch-action:none}
.modeCarouselViewport.isDragging .modeSlide{transition:none}
.modeCarouselViewport.isSettling .modeSlide{transition:transform .20s cubic-bezier(.12,.78,.18,1),opacity .16s ease}
.modeCarouselViewport.isLanding .modeSlide{transition:transform .11s cubic-bezier(.28,.72,.3,1),opacity .11s ease}
.modeSlide.isSelected{z-index:3}.modeSlide.isNeighbor{z-index:2}.modeSlide.isRemote{visibility:hidden;pointer-events:none}
.modeSlide:focus-visible{outline:1px solid #151515;outline-offset:2px}
.modeSlide .selectionDouble{margin:0;flex:none;box-shadow:none;transform-origin:center}
.modeTilePrototype,.modeTileLocked{position:relative;overflow:hidden}
.modeTilePrototype{background:#151515!important;border-color:#151515!important;color:#fff}
.modeTilePrototype::after,.modeTileLocked::after{content:"";position:absolute;left:0;right:0;top:50%;height:2px;transform:translateY(-50%);background:currentColor;opacity:.9}
.modeTilePrototype b{position:absolute;inset:0;z-index:2;display:grid;place-items:center;color:#fff;font-size:48px;font-weight:500;line-height:1}
.modeTileLocked{background:#b9b9b3!important;border-color:#8f8f8a!important;color:#8f8f8a}
.modeCarouselFrame>strong{font-size:15px;letter-spacing:.13em;line-height:1.1}
.modeCarouselFrame>small{min-height:16px;color:#61615b;line-height:1.2}
.modeCarouselFrame[data-mode-available="false"]>strong,.modeCarouselFrame[data-mode-available="false"]>small{color:#777771}
@media(prefers-reduced-motion:reduce){.modeSlide,.modeCarouselViewport.isSettling .modeSlide,.modeCarouselViewport.isLanding .modeSlide{transition:none}}
`;
    doc.head.appendChild(style)
  }
  function tileMarkup(mode){
    if(mode.kind==='classic')return '<span class="selectionDouble modeTile modeTileClassic" aria-hidden="true"><i></i><i></i></span>';
    if(mode.kind==='prototype')return '<span class="selectionDouble modeTile modeTilePrototype" aria-hidden="true"><b>?</b></span>';
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
    slides[0].id='modeClassic';slides[1].id='modePrototype';
    const name=doc.createElement('strong');name.id='modeName';
    const description=doc.createElement('small');description.id='modeDescription';
    frame.append(viewport,name,description);oldClassic.replaceWith(frame);
    let selected=0,drag=null,suppressClickUntil=0,settleTimers=[];
    function clearSettle(){
      for(const timer of settleTimers)root.clearTimeout(timer);
      settleTimers=[];
      viewport.classList.remove('isSettling','isLanding')
    }
    function render(trackX=0){
      const mode=MODES[selected];frame.dataset.mode=mode.id;frame.dataset.modeAvailable=String(mode.available);name.textContent=mode.name;description.textContent=mode.description;startRun.disabled=!mode.available;
      const visibleRadius=(viewport.clientWidth||240)/2+36;
      slides.forEach((slide,i)=>{
        const offset=cyclicOffset(i,selected),abs=Math.abs(offset),x=offset*SPACING+trackX,progress=Math.min(1,Math.abs(x)/SPACING),scale=1-.18*progress,opacity=1-.22*progress,remote=Math.abs(x)>visibleRadius;
        slide.classList.toggle('isSelected',offset===0);slide.classList.toggle('isNeighbor',abs===1);slide.classList.toggle('isRemote',remote);slide.setAttribute('aria-pressed',offset===0?'true':'false');slide.tabIndex=!remote&&abs<=1?0:-1;slide.style.opacity=String(opacity);slide.style.transform=`translateX(calc(-50% + ${x}px)) scale(${scale})`
      });
      root.__monoidSelectedMode=mode.id;if(root.__monoidModes)root.__monoidModes.selected=mode.id
    }
    function settleFrom(releaseOffset){
      clearSettle();
      if(root.matchMedia?.('(prefers-reduced-motion: reduce)').matches||Math.abs(releaseOffset)<.5){render(0);return}
      const overshoot=snapOvershoot(releaseOffset),raf=root.requestAnimationFrame?.bind(root)||(fn=>root.setTimeout(fn,0));
      viewport.classList.add('isSettling');
      render(releaseOffset);
      void viewport.offsetWidth;
      raf(()=>{
        render(overshoot);
        settleTimers.push(root.setTimeout(()=>{
          viewport.classList.add('isLanding');
          render(0);
        },205));
        settleTimers.push(root.setTimeout(()=>clearSettle(),340))
      })
    }
    function select(index){clearSettle();selected=wrapIndex(index);render();return MODES[selected]}
    slides.forEach((slide,i)=>slide.addEventListener('click',e=>{e.preventDefault();if(Date.now()<suppressClickUntil)return;select(i)}));
    viewport.addEventListener('pointerdown',e=>{
      if(e.button!=null&&e.button!==0)return;
      clearSettle();
      const now=root.performance?.now?.()??Date.now();
      drag={id:e.pointerId,startX:e.clientX,lastX:e.clientX,lastAt:now,velocityX:0,visualX:0};
      viewport.classList.add('isDragging');viewport.setPointerCapture?.(e.pointerId)
    });
    viewport.addEventListener('pointermove',e=>{
      if(!drag||e.pointerId!==drag.id)return;
      const now=root.performance?.now?.()??Date.now(),dt=Math.max(1,now-drag.lastAt),instant=(e.clientX-drag.lastX)/dt;
      drag.velocityX=drag.velocityX*.62+instant*.38;drag.lastX=e.clientX;drag.lastAt=now;drag.visualX=magnetizeDrag(e.clientX-drag.startX);render(drag.visualX)
    });
    function finishDrag(e){
      if(!drag||e.pointerId!==drag.id)return;
      const current=selected,dx=drag.lastX-drag.startX,projected=dx+drag.velocityX*FLING_PROJECTION_MS,distanceEnough=Math.abs(dx)>=SWIPE_THRESHOLD,flingEnough=Math.abs(dx)>=MIN_FLING_DISTANCE&&Math.abs(projected)>=SWIPE_THRESHOLD,next=distanceEnough||flingEnough?stepIndex(current,projected<0?1:-1):current,releaseOffset=cyclicOffset(next,current)*SPACING+drag.visualX;
      drag=null;selected=next;
      render(releaseOffset);
      viewport.classList.remove('isDragging');
      suppressClickUntil=Date.now()+350;
      settleFrom(releaseOffset)
    }
    viewport.addEventListener('pointerup',finishDrag);
    viewport.addEventListener('pointercancel',e=>{
      if(!drag||e.pointerId!==drag.id)return;
      const releaseOffset=drag.visualX;drag=null;render(releaseOffset);viewport.classList.remove('isDragging');settleFrom(releaseOffset)
    });
    frame.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();select(stepIndex(selected,1))}else if(e.key==='ArrowLeft'){e.preventDefault();select(stepIndex(selected,-1))}});
    startRun.onclick=function(event){const mode=MODES[selected];if(!mode.available)return;const previousMode=root.localStorage?.getItem(ACTIVE_MODE_KEY)||'classic',beforeSaved=root.localStorage?.getItem('iterion.activeRun.v1')||null;root.localStorage?.setItem(ACTIVE_MODE_KEY,mode.id);root.__monoidActiveMode=mode.id;originalStart?.call(this,event);const afterSaved=root.localStorage?.getItem('iterion.activeRun.v1')||null;if(beforeSaved&&beforeSaved===afterSaved&&!doc.getElementById('gameSelection')?.hidden){root.localStorage?.setItem(ACTIVE_MODE_KEY,previousMode);root.__monoidActiveMode=previousMode}}
    if(continueRun)continueRun.onclick=function(event){const mode=root.localStorage?.getItem(ACTIVE_MODE_KEY)||'classic';root.__monoidActiveMode=mode;return originalContinue?.call(this,event)};
    root.__monoidModes={modes:MODES,selected:MODES[0].id,get active(){return root.localStorage?.getItem(ACTIVE_MODE_KEY)||'classic'},select:index=>select(index)};
    render();return true
  }
  return{ACTIVE_MODE_KEY,MODES,SPACING,clampIndex,wrapIndex,stepIndex,cyclicOffset,magnetizeDrag,snapOvershoot,mount};
});
