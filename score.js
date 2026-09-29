(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.MonoidScore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const INTEGER=/^-?\d+$/,MAX_SAFE=BigInt(Number.MAX_SAFE_INTEGER);
  function normalizedString(value){
    const text=String(value).trim();if(!INTEGER.test(text))return null;
    const negative=text[0]==='-',digits=(negative?text.slice(1):text).replace(/^0+(?=\d)/,'')||'0';
    return negative&&digits!=='0'?'-'+digits:digits
  }
  function exact(value,preferred){
    const direct=preferred!==undefined&&preferred!==null?preferred:value;
    if(typeof direct==='bigint')return direct.toString();
    const normalized=normalizedString(direct);if(normalized!==null)return normalized;
    const n=Number(direct);if(!Number.isFinite(n)||!Number.isInteger(n))throw new Error('Score must be a finite integer');
    return BigInt(n).toString()
  }
  const bigint=(value,preferred)=>BigInt(exact(value,preferred));
  const approx=value=>Number(bigint(value));
  const add=(a,b)=>(bigint(a)+bigint(b)).toString();
  const subtract=(a,b)=>(bigint(a)-bigint(b)).toString();
  const multiply=(a,b)=>(bigint(a)*bigint(b)).toString();
  const sum=values=>(values||[]).reduce((total,value)=>total+bigint(value),0n).toString();
  function compare(a,b){const aa=bigint(a),bb=bigint(b);return aa<bb?-1:aa>bb?1:0}
  const equals=(a,b)=>compare(a,b)===0;
  const max=(a,b)=>compare(a,b)>=0?exact(a):exact(b);
  const isSafe=value=>{const n=bigint(value);return n>=-MAX_SAFE&&n<=MAX_SAFE};
  function decimalRatio(value){
    const n=Number(value);if(!Number.isFinite(n)||n<0)throw new Error('Score multiplier must be finite and non-negative');
    const text=String(n).toLowerCase(),match=text.match(/^([+-]?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/);if(!match)throw new Error('Unsupported score multiplier');
    const sign=match[1]==='-'?-1n:1n,int=match[2],fraction=match[3]||'',exponent=Number(match[4]||0),digits=BigInt((int+fraction)||'0')*sign,scale=fraction.length-exponent;
    if(scale<=0)return{numerator:digits*(10n**BigInt(-scale)),denominator:1n};
    return{numerator:digits,denominator:10n**BigInt(scale)}
  }
  function floorMultiply(value,multiplier){
    const base=bigint(value),{numerator,denominator}=decimalRatio(multiplier);
    return((base*numerator)/denominator).toString()
  }
  function powMultiply(value,multiplier,exponent){
    const exp=Math.max(0,Math.trunc(Number(exponent)||0)),factor=bigint(multiplier);
    return(bigint(value)*(factor**BigInt(exp))).toString()
  }
  return Object.freeze({exact,approx,add,subtract,multiply,sum,compare,equals,max,isSafe,floorMultiply,powMultiply});
});
