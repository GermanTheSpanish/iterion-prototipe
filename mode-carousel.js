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
  const MODES=Object.freeze([
    Object.freeze({id:'classic',name:'CLASSIC',description:'The original machine',available:true,kind:'classic'}),
    Object.freeze({id:'prototype',name:'PROTOTYPE',description:'Experimental rules',available:true,kind:'prototype'}),
    ...Array.from({length:6},(_,i)=>Object.freeze({id:`locked-${i+1}`,name:'LOCKED',description:'Not available',available:false,kind:'locked'}))
  ]);
  const clampIndex=index=>Math.max(0,Math.min(MODES.length-1,Number.isFinite(index)?Math.trunc(index):0));
  const stepIndex=(index,delta)=>clampIndex(clampIndex(index)+Math.sign(delta||0));
  function injectStyles(doc){
    if(doc.getElementById('monoidModeCarouselStyles'))return;
    const style=doc.createElement('style');style.id='monoidModeCarouselStyles';style.textContent=`
.modeCarouselFrame{position:relative;display:grid!important;grid-template-rows:116px auto auto;justify-items:center;gap:9px;width:min(240px,72vw);min-height:196px;padding:18px 0 16px!important;overflow:hidden;color:#151515;cursor:default}
.modeCarouselViewport{position:relative;width:100%;height:116px;overflow:hidden;touch-action:pan-y;cursor:grab;user-select:none;-webkit-user-select:none}
.modeCarouselViewport.isDragging{cursor:grabbing}
.modeSlide{appearance:none;position:absolute;left:50%;top:2px;width:72px;height:112px;margin:0;padding:0;border:0;background:transparent;color:#151515;display:grid;place-items:center;transform-origin:center;transition:transform .2s ease,opacity .2s ease;will-change:transform;touch-action:none}
.modeSlide.isSelected{z-index:3}.modeSlide.isNeighbor{z-index:2;opacity:.78}.modeSlide.isRemote{visibility:hidden;pointer-events:none}
.modeSlide:focus-visible{outline:1px solid #151515;outline-offset:2px}
.modeSlide .selectionDouble{margin:0;flex:none;box-shadow:none}
.modeTilePrototype,.modeTileLocked{position:relative;overflow:hidden}
.modeTilePrototype{background:#151515!important;border-color:#151515!important;color:#fff}
.modeTilePrototype::after,.modeTileLocked::after{content:"";position:absolute;left:0;right:0;top:50%;height:2px;transform:translateY(-50%);background:currentColor;opacity:.9}
.modeTilePrototype b{position:absolute;inset:0;z-index:2;display:grid;place-items:center;color:#fff;font-size:48px;font-weight:500;line-height:1}
.modeTileLocked{background:#b9b9b3!important;border-color:#8f8f8a!important;color:#8f8f8a}
.modeCarouselFrame>strong{font-size:15px;letter-spacing:.13em;line-height:1.1}
.modeCarouselFrame>small{min-height:16px;color:#61615b;line-height:1.2}
.modeCarouselFrame[data-mode-available="false"]>strong,.modeCarouselFrame[data-mode-available="false"]>small{color:#777771}
@media(prefers-reduced-motion:reduce){.modeSlide{transition:none}}
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
    let selected=0,drag=null,suppressClickUntil=0;
    function render(dragX=0){
      const mode=MODES[selected];frame.dataset.mode=mode.id;frame.dataset.modeAvailable=String(mode.available);name.textContent=mode.name;description.textContent=mode.description;startRun.disabled=!mode.available;
      slides.forEach((slide,i)=>{const offset=i-selected,abs=Math.abs(offset);slide.classList.toggle('isSelected',offset===0);slide.classList.toggle('isNeighbor',abs===1);slide.classList.toggle('isRemote',abs>1);slide.setAttribute('aria-pressed',offset===0?'true':'false');slide.tabIndex=abs<=1?0:-1;const x=offset*98+dragX,scale=offset===0?1:.82;slide.style.transform=`translateX(calc(-50% + ${x}px)) scale(${scale})`});
      root.__monoidSelectedMode=mode.id;if(root.__monoidModes)root.__monoidModes.selected=mode.id
    }
    function select(index){selected=clampIndex(index);render();return MODES[selected]}
    slides.forEach((slide,i)=>slide.addEventListener('click',e=>{e.preventDefault();if(Date.now()<suppressClickUntil)return;select(i)}));
    viewport.addEventListener('pointerdown',e=>{if(e.button!=null&&e.button!==0)return;drag={id:e.pointerId,startX:e.clientX,lastX:e.clientX};viewport.classList.add('isDragging');viewport.setPointerCapture?.(e.pointerId)});
    viewport.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;drag.lastX=e.clientX;const dx=Math.max(-98,Math.min(98,e.clientX-drag.startX));render(dx)});
    function finishDrag(e){if(!drag||e.pointerId!==drag.id)return;const dx=drag.lastX-drag.startX;drag=null;viewport.classList.remove('isDragging');if(Math.abs(dx)>=32){suppressClickUntil=Date.now()+350;select(stepIndex(selected,dx<0?1:-1))}else render()}
    viewport.addEventListener('pointerup',finishDrag);viewport.addEventListener('pointercancel',e=>{if(!drag||e.pointerId!==drag.id)return;drag=null;viewport.classList.remove('isDragging');render()});
    frame.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();select(stepIndex(selected,1))}else if(e.key==='ArrowLeft'){e.preventDefault();select(stepIndex(selected,-1))}});
    startRun.onclick=function(event){const mode=MODES[selected];if(!mode.available)return;const previousMode=root.localStorage?.getItem(ACTIVE_MODE_KEY)||'classic',beforeSaved=root.localStorage?.getItem('iterion.activeRun.v1')||null;root.localStorage?.setItem(ACTIVE_MODE_KEY,mode.id);root.__monoidActiveMode=mode.id;originalStart?.call(this,event);const afterSaved=root.localStorage?.getItem('iterion.activeRun.v1')||null;if(beforeSaved&&beforeSaved===afterSaved&&!doc.getElementById('gameSelection')?.hidden){root.localStorage?.setItem(ACTIVE_MODE_KEY,previousMode);root.__monoidActiveMode=previousMode}}
    if(continueRun)continueRun.onclick=function(event){const mode=root.localStorage?.getItem(ACTIVE_MODE_KEY)||'classic';root.__monoidActiveMode=mode;return originalContinue?.call(this,event)};
    root.__monoidModes={modes:MODES,selected:MODES[0].id,get active(){return root.localStorage?.getItem(ACTIVE_MODE_KEY)||'classic'},select:index=>select(index)};
    render();return true
  }
  return{ACTIVE_MODE_KEY,MODES,clampIndex,stepIndex,mount};
});
