(function(root){
  'use strict';
  const doc=root.document,board=doc?.getElementById('board'),frame=board?.parentElement;
  if(!board||!frame||root.MonoidBoardCamera)return;

  const MIN_SCALE=1,MAX_SCALE=3.2,EDGE_PAD=10;
  const state={scale:1,x:0,y:0,temporary:false};
  const pointers=new Map();
  let gesture=null,cascadeRestore=null,lastEmptyTap=0;

  const style=doc.createElement('style');style.id='monoid-board-camera-style';style.textContent=`
    .boardFrame{position:relative;touch-action:none;isolation:isolate}
    .board{transform-origin:50% 50%;transform:translate3d(var(--camera-x,0px),var(--camera-y,0px),0) scale(var(--camera-scale,1));transition:transform 180ms cubic-bezier(.2,.75,.25,1);will-change:transform}
    .boardFrame.cameraGesture .board{transition:none}
    .app .board .piece>.tileModMark{font-size:clamp(3px,calc(var(--board-cell-px,16px) * .82),16px)!important}
    .app .board .piece.v>.tileModMark{transform:translateX(calc(var(--mod-offset,0) * var(--board-cell-px,16px) * .28))!important}
    .app .board .piece.h>.tileModMark{transform:translateY(calc(var(--mod-offset,0) * var(--board-cell-px,16px) * .28))!important}
    .app .board .piece>.circuitRankMark{font-size:clamp(3px,calc(var(--board-cell-px,16px) * .48),8px)!important}
    .app .board .piece>.powerMark{font-size:clamp(3px,calc(var(--board-cell-px,16px) * .42),7px)!important}
  `;doc.head.appendChild(style);

  function clamp(value,min,max){return Math.max(min,Math.min(max,value))}
  function limits(scale=state.scale){const b={w:board.offsetWidth,h:board.offsetHeight},f={w:frame.clientWidth,h:frame.clientHeight};return{x:Math.max(0,(b.w*scale-f.w)/2+EDGE_PAD),y:Math.max(0,(b.h*scale-f.h)/2+EDGE_PAD)}}
  function apply(next={},animate=true){
    state.scale=clamp(Number(next.scale??state.scale),MIN_SCALE,MAX_SCALE);const limit=limits();state.x=clamp(Number(next.x??state.x),-limit.x,limit.x);state.y=clamp(Number(next.y??state.y),-limit.y,limit.y);
    frame.classList.toggle('cameraGesture',!animate);board.style.setProperty('--camera-scale',state.scale.toFixed(4));board.style.setProperty('--camera-x',`${state.x.toFixed(2)}px`);board.style.setProperty('--camera-y',`${state.y.toFixed(2)}px`);frame.classList.toggle('cameraZoomed',state.scale>1.001);return snapshot()
  }
  function snapshot(){return{scale:state.scale,x:state.x,y:state.y,temporary:state.temporary}}
  function reset(animate=true){state.temporary=false;return apply({scale:1,x:0,y:0},animate)}
  function syncCellSize(){const columns=Math.max(1,Number(root.IterionEngine?.G)||18);board.style.setProperty('--board-cell-px',`${board.offsetWidth/columns}px`);apply({},true)}
  function canUse(){const game=root.__monoidGame?.state?.();return!board.classList.contains('dragging')&&!game?.running&&!game?.pendingCircuit&&!game?.pendingModPlacement&&!doc.querySelector('.overlay.show')}
  function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
  function midpoint(a,b){return{x:(a.x+b.x)/2,y:(a.y+b.y)/2}}
  function startPinch(){const [a,b]=[...pointers.values()];gesture={kind:'pinch',distance:Math.max(1,distance(a,b)),mid:midpoint(a,b),start:snapshot()};frame.classList.add('cameraGesture')}
  function onDown(event){
    if(event.pointerType==='mouse'&&event.button!==0||!canUse())return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY,empty:event.target===board||event.target===frame});
    if(pointers.size===2){startPinch();return}
    const point=pointers.get(event.pointerId);if(point.empty)gesture={kind:'pan',pointerId:event.pointerId,startX:point.x,startY:point.y,moved:false,start:snapshot()}
  }
  function onMove(event){
    if(!pointers.has(event.pointerId))return;const point=pointers.get(event.pointerId);point.x=event.clientX;point.y=event.clientY;
    if(pointers.size>=2){if(gesture?.kind!=='pinch')startPinch();const [a,b]=[...pointers.values()],mid=midpoint(a,b),scale=gesture.start.scale*distance(a,b)/gesture.distance,ratio=scale/gesture.start.scale;
      const frameBox=frame.getBoundingClientRect(),anchorX=gesture.mid.x-(frameBox.left+frameBox.width/2),anchorY=gesture.mid.y-(frameBox.top+frameBox.height/2);
      apply({scale,x:gesture.start.x+(mid.x-gesture.mid.x)-anchorX*(ratio-1),y:gesture.start.y+(mid.y-gesture.mid.y)-anchorY*(ratio-1)},false);event.preventDefault();return}
    if(gesture?.kind==='pan'&&gesture.pointerId===event.pointerId){const dx=event.clientX-gesture.startX,dy=event.clientY-gesture.startY;if(Math.hypot(dx,dy)>4)gesture.moved=true;apply({x:gesture.start.x+dx,y:gesture.start.y+dy},false);if(gesture.moved)event.preventDefault()}
  }
  function onEnd(event){
    const point=pointers.get(event.pointerId),wasPan=gesture?.kind==='pan'&&gesture.pointerId===event.pointerId,moved=gesture?.moved;pointers.delete(event.pointerId);
    if(pointers.size===1&&gesture?.kind==='pinch'){const [id,p]=pointers.entries().next().value;gesture={kind:'pan',pointerId:id,startX:p.x,startY:p.y,moved:true,start:snapshot()}}
    else if(!pointers.size){gesture=null;frame.classList.remove('cameraGesture');apply({},true);if(wasPan&&!moved&&point?.empty){const now=performance.now();if(now-lastEmptyTap<320)reset();lastEmptyTap=now}}
  }
  function eventTileIds(events){const pieces=root.__monoidGame?.state?.().pieces||[];return[...new Set((events||[]).filter(event=>event?.piece!=null).map(event=>pieces.find(piece=>String(piece.id)===String(event.piece))?.tile?.id).filter(Boolean))]}
  function focusForFork(events){
    if(!(events||[]).some(event=>event?.type==='signal-fork')||state.scale<=1.001)return false;
    const nodes=eventTileIds(events).map(id=>board.querySelector(`[data-tile-id="${CSS.escape(id)}"]`)).filter(Boolean);if(!nodes.length)return false;
    const boxes=nodes.map(node=>({left:parseFloat(node.style.left)/100*board.offsetWidth,top:parseFloat(node.style.top)/100*board.offsetHeight,width:parseFloat(node.style.width)/100*board.offsetWidth,height:parseFloat(node.style.height)/100*board.offsetHeight}));
    const left=Math.min(...boxes.map(b=>b.left)),top=Math.min(...boxes.map(b=>b.top)),right=Math.max(...boxes.map(b=>b.left+b.width)),bottom=Math.max(...boxes.map(b=>b.top+b.height)),padding=28;
    const fit=clamp(Math.min((frame.clientWidth-padding*2)/Math.max(1,right-left),(frame.clientHeight-padding*2)/Math.max(1,bottom-top)),MIN_SCALE,state.scale);if(fit>=state.scale-.01)return false;
    cascadeRestore=snapshot();state.temporary=true;const cx=(left+right)/2-board.offsetWidth/2,cy=(top+bottom)/2-board.offsetHeight/2;apply({scale:fit,x:-cx*fit,y:-cy*fit},true);return true
  }
  function endCascade(){if(!cascadeRestore)return;const restore=cascadeRestore;cascadeRestore=null;state.temporary=false;apply(restore,true)}

  frame.addEventListener('pointerdown',onDown,{passive:true});frame.addEventListener('pointermove',onMove,{passive:false});frame.addEventListener('pointerup',onEnd,{passive:true});frame.addEventListener('pointercancel',onEnd,{passive:true});
  new ResizeObserver(syncCellSize).observe(board);new MutationObserver(syncCellSize).observe(board,{childList:true});syncCellSize();
  root.MonoidBoardCamera=Object.freeze({snapshot,set:(next,animate=true)=>apply(next,animate),reset,beginCascade:focusForFork,endCascade,sync:syncCellSize});
})(window);
