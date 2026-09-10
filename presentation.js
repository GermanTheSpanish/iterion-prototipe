(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.IterionPresentation=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  // Display only. Never feed formatted values or animation timing into the engine.
  const UNITS=['','K','M','B','T'];
  const CASCADE=Object.freeze({firstMs:600,minMs:100,decay:0.91,maxLabels:8,finalMs:1000});
  function exact(value){return Number.isFinite(value)?value.toLocaleString('en-US',{maximumFractionDigits:20}):String(value)}
  function compact(value){
    if(!Number.isFinite(value))return String(value);
    const sign=value<0?'-':'',n=Math.abs(value);
    if(n<1000)return exact(value);
    if(n>=1e15)return value.toExponential(2).replace(/\.00e/,'e').replace(/(\.\d)0e/,'$1e').replace('e+','e');
    let tier=Math.min(4,Math.floor(Math.log10(n)/3)),scaled=n/1000**tier;
    let decimals=scaled<10?2:1,rounded=Number(scaled.toFixed(decimals));
    if(rounded>=1000&&tier<4){tier++;rounded=Number((n/1000**tier).toFixed(2))}
    return sign+rounded+UNITS[tier]
  }
  function scoreDisplay(score,target){
    const targetText=compact(target),text=compact(score),below=score<target;
    return{score:text,target:targetText,
      note:below&&score>0&&score/target>=0.95?`${compact(target-score)} to target`:score>=target?'Target reached':'Last move'}
  }
  function cascadeDelay(index){return Math.max(CASCADE.minMs,Math.round(CASCADE.firstMs*CASCADE.decay**Math.max(0,index)))}
  function effectLifetime(index){return cascadeDelay(index)*2+120}
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
  return Object.freeze({compact,exact,scoreDisplay,cascadeDelay,effectLifetime,operationHalf,fitFontSize,signalPlan,forkBlock,CASCADE});
});
