(function(root){
  'use strict';
  const doc=root.document,board=doc?.getElementById('board'),frame=board?.parentElement;
  if(!board||!frame||root.MonoidBoardCamera)return;

  const MIN_SCALE=1,PINCH_SENSITIVITY=.6;
  const state={scale:1,x:0,y:0,temporary:false};
  const pointers=new Map();
  let gesture=null,cascadeRestore=null,lastEmptyTap=0;

  const windowEl=doc.createElement('i');windowEl.className='boardCameraWindow';windowEl.setAttribute('aria-hidden','true');frame.appendChild(windowEl);
  const style=doc.createElement('style');style.id='monoid-board-camera-style';style.textContent=`
    .boardFrame{position:relative;touch-action:none;isolation:isolate;overflow:visible!important}
    .board{transform-origin:50% 50%;transition:transform 180ms cubic-bezier(.2,.75,.25,1);will-change:transform}
    .boardFrame.cameraGesture .board{transition:none}
    .boardCameraWindow{position:absolute;display:none;pointer-events:none;z-index:30;box-shadow:inset 0 0 0 1px #d4d2cc}
    .boardFrame.cameraZoomed .boardCameraWindow{display:block}
    .app .board .piece>.tileModMark{font-size:clamp(3px,calc(var(--board-cell-px,16px) * .82),16px)!important}
    .app .board .piece.v>.tileModMark{transform:translateX(calc(var(--mod-offset,0) * var(--board-cell-px,16px) * .28))!important}
    .app .board .piece.h>.tileModMark{transform:translateY(calc(var(--mod-offset,0) * var(--board-cell-px,16px) * .28))!important}
    .app .board .piece>.circuitRankMark{font-size:clamp(3px,calc(var(--board-cell-px,16px) * .48),8px)!important}
    .app .board .piece>.powerMark{font-size:clamp(3px,calc(var(--board-cell-px,16px) * .42),7px)!important}
  `;doc.head.appendChild(style);

  function clamp(value,min,max){return Math.max(min,Math.min(max,value))}
  function boardRatioLimit(){const engine=root.IterionEngine,size=engine?.getBoardSize?.()||{G:Number(engine?.G)||18,H:Number(engine?.H)||24},base=root.IterionData?.BOARD_SIZES?.[0]||[18,24],gx=Math.max(1,Number(size.G)||18),hy=Math.max(1,Number(size.H)||24),bg=Math.max(1,Number(base[0])||18),bh=Math.max(1,Number(base[1])||24);return Math.max(MIN_SCALE,Math.min(gx/bg,hy/bh))}
  function limits(scale=state.scale){const w=board.offsetWidth,h=board.offsetHeight;return{x:Math.max(0,w*(scale-1)/2),y:Math.max(0,h*(scale-1)/2)}}
  function syncViewport(){windowEl.style.left=`${board.offsetLeft}px`;windowEl.style.top=`${board.offsetTop}px`;windowEl.style.width=`${board.offsetWidth}px`;windowEl.style.height=`${board.offsetHeight}px`}
  function clipToViewport(){const s=state.scale,w=board.offsetWidth,h=board.offsetHeight;if(s<=1.001){board.style.clipPath='';return}const left=Math.max(0,(w*(s-1)/2-state.x)/s),right=Math.max(0,(w*(s-1)/2+state.x)/s),top=Math.max(0,(h*(s-1)/2-state.y)/s),bottom=Math.max(0,(h*(s-1)/2+state.y)/s);board.style.clipPath=`inset(${top.toFixed(3)}px ${right.toFixed(3)}px ${bottom.toFixed(3)}px ${left.toFixed(3)}px)`}
  function viewportRect(){const box=board.getBoundingClientRect(),w=board.offsetWidth,h=board.offsetHeight,cx=box.left+box.width/2-state.x,cy=box.top+box.height/2-state.y;return{left:cx-w/2,top:cy-h/2,width:w,height:h,right:cx+w/2,bottom:cy+h/2}}
  function apply(next={},animate=true){
    state.scale=clamp(Number(next.scale??state.scale),MIN_SCALE,boardRatioLimit());const limit=limits();state.x=clamp(Number(next.x??state.x),-limit.x,limit.x);state.y=clamp(Number(next.y??state.y),-limit.y,limit.y);
    frame.classList.toggle('cameraGesture',!animate);board.style.setProperty('--camera-scale',state.scale.toFixed(4));board.style.setProperty('--camera-x',`${state.x.toFixed(2)}px`);board.style.setProperty('--camera-y',`${state.y.toFixed(2)}px`);board.style.transform=`translate3d(${state.x.toFixed(2)}px,${state.y.toFixed(2)}px,0) scale(${state.scale.toFixed(6)})`;clipToViewport();syncViewport();frame.classList.toggle('cameraZoomed',state.scale>1.001);return snapshot()
  }
  function snapshot(){return{scale:state.scale,x:state.x,y:state.y,maxScale:boardRatioLimit(),temporary:state.temporary}}
  function reset(animate=true){state.temporary=false;return apply({scale:1,x:0,y:0},animate)}
  function syncCellSize(){const columns=Math.max(1,Number(root.IterionEngine?.G)||18);board.style.setProperty('--board-cell-px',`${board.offsetWidth/columns}px`);syncViewport();apply({},true)}
  function canUse(){const game=root.__monoidGame?.state?.();return!board.classList.contains('dragging')&&!game?.running&&!game?.pendingCircuit&&!game?.pendingModPlacement&&!doc.querySelector('.overlay.show')}
  function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
  function midpoint(a,b){return{x:(a.x+b.x)/2,y:(a.y+b.y)/2}}
  function startPinch(){const [a,b]=[...pointers.values()],mid=midpoint(a,b),box=board.getBoundingClientRect(),scale=Math.max(.0001,state.scale),baseCenterX=box.left+box.width/2-state.x,baseCenterY=box.top+box.height/2-state.y;gesture={kind:'pinch',distance:Math.max(1,distance(a,b)),mid,anchorX:(mid.x-(baseCenterX+state.x))/scale,anchorY:(mid.y-(baseCenterY+state.y))/scale,baseCenterX,baseCenterY};frame.classList.add('cameraGesture')}
  function onDown(event){
    if(event.pointerType==='mouse'&&event.button!==0||!canUse())return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY,empty:event.target===board||event.target===frame});
    if(pointers.size===2){startPinch();return}
    const point=pointers.get(event.pointerId);if(point.empty)gesture={kind:'pan',pointerId:event.pointerId,lastX:point.x,lastY:point.y,travel:0,moved:false}
  }
  function onMove(event){
    if(!pointers.has(event.pointerId))return;const point=pointers.get(event.pointerId);point.x=event.clientX;point.y=event.clientY;
    if(pointers.size>=2){if(gesture?.kind!=='pinch')startPinch();const [a,b]=[...pointers.values()],mid=midpoint(a,b),nextDistance=Math.max(1,distance(a,b)),current=snapshot(),step=Math.pow(nextDistance/gesture.distance,PINCH_SENSITIVITY),scale=clamp(current.scale*step,MIN_SCALE,boardRatioLimit()),x=mid.x-gesture.baseCenterX-gesture.anchorX*scale,y=mid.y-gesture.baseCenterY-gesture.anchorY*scale;
      apply({scale,x,y},false);gesture.distance=nextDistance;gesture.mid=mid;event.preventDefault();return}
    if(gesture?.kind==='pan'&&gesture.pointerId===event.pointerId){const dx=event.clientX-gesture.lastX,dy=event.clientY-gesture.lastY;gesture.lastX=event.clientX;gesture.lastY=event.clientY;gesture.travel+=Math.hypot(dx,dy);if(gesture.travel>4)gesture.moved=true;apply({x:state.x+dx,y:state.y+dy},false);if(gesture.moved)event.preventDefault()}
  }
  function onEnd(event){
    const point=pointers.get(event.pointerId),wasPan=gesture?.kind==='pan'&&gesture.pointerId===event.pointerId,moved=gesture?.moved;pointers.delete(event.pointerId);
    if(pointers.size===1&&gesture?.kind==='pinch'){const [id,p]=pointers.entries().next().value;gesture={kind:'pan',pointerId:id,lastX:p.x,lastY:p.y,travel:5,moved:true}}
    else if(!pointers.size){gesture=null;frame.classList.remove('cameraGesture');apply({},true);if(wasPan&&!moved&&point?.empty){const now=performance.now();if(now-lastEmptyTap<320)reset();lastEmptyTap=now}}
  }
  function eventTileIds(events){const pieces=root.__monoidGame?.state?.().pieces||[];return[...new Set((events||[]).filter(event=>event?.piece!=null).map(event=>pieces.find(piece=>String(piece.id)===String(event.piece))?.tile?.id).filter(Boolean))]}
  function focusForFork(events){
    if(!(events||[]).some(event=>event?.type==='signal-fork')||state.scale<=1.001)return false;
    const nodes=eventTileIds(events).map(id=>board.querySelector(`[data-tile-id="${CSS.escape(id)}"]`)).filter(Boolean);if(!nodes.length)return false;
    const boxes=nodes.map(node=>({left:parseFloat(node.style.left)/100*board.offsetWidth,top:parseFloat(node.style.top)/100*board.offsetHeight,width:parseFloat(node.style.width)/100*board.offsetWidth,height:parseFloat(node.style.height)/100*board.offsetHeight}));
    const left=Math.min(...boxes.map(b=>b.left)),top=Math.min(...boxes.map(b=>b.top)),right=Math.max(...boxes.map(b=>b.left+b.width)),bottom=Math.max(...boxes.map(b=>b.top+b.height)),padding=28,w=board.offsetWidth,h=board.offsetHeight;
    const fit=clamp(Math.min((w-padding*2)/Math.max(1,right-left),(h-padding*2)/Math.max(1,bottom-top)),MIN_SCALE,state.scale);if(fit>=state.scale-.01)return false;
    cascadeRestore=snapshot();state.temporary=true;const cx=(left+right)/2-w/2,cy=(top+bottom)/2-h/2;apply({scale:fit,x:-cx*fit,y:-cy*fit},true);return true
  }
  function endCascade(){if(!cascadeRestore)return;const restore=cascadeRestore;cascadeRestore=null;state.temporary=false;apply(restore,true)}

  frame.addEventListener('pointerdown',onDown,{passive:true});frame.addEventListener('pointermove',onMove,{passive:false});frame.addEventListener('pointerup',onEnd,{passive:true});frame.addEventListener('pointercancel',onEnd,{passive:true});
  new ResizeObserver(syncCellSize).observe(board);new MutationObserver(syncCellSize).observe(board,{childList:true});syncCellSize();
  root.MonoidBoardCamera=Object.freeze({snapshot,viewport:viewportRect,set:(next,animate=true)=>apply(next,animate),reset,beginCascade:focusForFork,endCascade,sync:syncCellSize});
})(window);
