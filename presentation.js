(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.IterionPresentation=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  // Display only. Never feed formatted values or animation timing into the engine.
  const UNITS=['','K','M','B','T'];
  const CASCADE=Object.freeze({firstMs:600,minMs:100,decay:0.91,maxLabels:3,finalMs:1000});
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
    // The distance caption disambiguates rounded ties without asserting a false inequality.
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
  return Object.freeze({compact,exact,scoreDisplay,cascadeDelay,effectLifetime,operationHalf,fitFontSize,CASCADE});
});
