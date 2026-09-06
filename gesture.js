(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.IterionGesture=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  function createPressGesture(opts={}){
    const delay=opts.delay??500,tolerance=opts.tolerance??10,setTimer=opts.setTimer||setTimeout,clearTimer=opts.clearTimer||clearTimeout;
    let press=null;
    function cancelTimer(){if(press?.timer!=null){clearTimer(press.timer);press.timer=null}}
    function reset(){cancelTimer();press=null}
    function begin(event,meta={}){
      reset();
      const pointerId=event.pointerId??0;
      press={pointerId,startX:event.clientX??0,startY:event.clientY??0,meta,timer:null,mode:'pending'};
      press.timer=setTimer(()=>{
        if(!press||press.pointerId!==pointerId||press.mode!=='pending')return;
        press.timer=null;press.mode='inspect';
        if(opts.onLongPress)opts.onLongPress(press.meta)
      },delay);
      return true
    }
    function move(event){
      if(!press||(event.pointerId??0)!==press.pointerId)return null;
      if(press.mode!=='pending')return press.mode;
      const dx=(event.clientX??0)-press.startX,dy=(event.clientY??0)-press.startY;
      if(Math.hypot(dx,dy)<=tolerance)return'pending';
      cancelTimer();
      if(press.meta.allowDrag){press.mode='drag';if(opts.onDragStart)opts.onDragStart(press.meta,event);return'drag'}
      press.mode='cancelled';return'cancelled'
    }
    function end(event){
      if(!press||(event.pointerId??0)!==press.pointerId)return null;
      const mode=press.mode,meta=press.meta;cancelTimer();press=null;
      if(mode==='pending'&&opts.onTap)opts.onTap(meta,event);
      return mode==='pending'?'tap':mode
    }
    function cancel(){const mode=press?.mode||null;reset();return mode}
    function state(){return press?{pointerId:press.pointerId,startX:press.startX,startY:press.startY,meta:press.meta,mode:press.mode}:null}
    return{begin,move,end,cancel,state}
  }
  return{createPressGesture};
});
