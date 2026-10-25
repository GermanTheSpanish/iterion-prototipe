// Read-only dramatic music cues. No gameplay actions, RNG or state mutations.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const SOURCE_BPM=80;
export function marketTargetBpm(marketCount){
 return Math.min(96,SOURCE_BPM+4*clamp(Math.floor(Number(marketCount)||0),0,4));
}
export function describePressure(state={}, {maxPlacements=6,targetReached=false,legalMask=null,thinkingSeconds=0}={}){
 const stage=clamp(Math.floor(Number(state.marketCount)||0),0,4);
 const movesLeft=Math.max(0,Math.floor(Number(maxPlacements)||0)-Math.max(0,Math.floor(Number(state.roundTurn)||0)));
 const hand=Array.isArray(state.hand)?state.hand.filter(Boolean):[];
 const zeroOnly=hand.length>0&&hand.every(t=>Number(t.a)===0||Number(t.b)===0);
 const legal=Array.isArray(legalMask)?legalMask.filter(Boolean).length:null;
 const zeroConstrained=zeroOnly&&legal!==null&&legal<=1;
 const active=!state.shopOpen&&!state.pendingModPlacement&&!state.running&&!state.cleared&&!state.blocked&&!state.needsReroll;
 const urgent=active&&!targetReached&&movesLeft<=2;
 const elevated=active&&!targetReached&&movesLeft<=3;
 let mood=urgent?'critical':zeroConstrained&&active?'uncertainty':elevated?'pressure':'steady';
 if(!active)mood='steady';
 const intensity=clamp((stage>=1?1:0)+(stage>=3?1:0)+(elevated?1:0)+(urgent?1:0)+(zeroConstrained?1:0),0,4);
 return Object.freeze({mood,intensity,marketCount:stage,
  targetBpm:marketTargetBpm(stage),sourceBpm:SOURCE_BPM,
  movesLeft,zeroOnly,zeroConstrained,legalOptions:legal,
  thinkingSeconds:Math.max(0,Number(thinkingSeconds)||0),targetReached:Boolean(targetReached)});
}
export function pulsePattern({intensity=0,mood='steady',barIndex=0}={}){
 // Events are subdivisions of a single *80 BPM* transport. Increasing hit
 // density is perceived acceleration, NOT a change to soundtrack BPM.
 const beats=[];
 for(let step=0;step<16;step++){
  const quarter=step%4===0,half=step%2===0;
  let play=quarter;
  if(intensity>=1&&half&&step%4!==0)play=true;
  if(intensity>=2&&[3,7,11,15].includes(step))play=true;
  if(intensity>=3&&[2,6,10,14].includes(step))play=true;
  if(intensity>=4&&[1,5,9,13].includes(step))play=true;
  if(mood==='uncertainty'&&(step===4||step===12||step===14))play=false;
  // A short exceptional break before resolution; NEVER a global silence.
  if(mood==='release'&&step<4)play=false;
  if(!play)continue;
  const strong=quarter&&step%8===0;
  const velocity=strong?1:quarter?.76:half?.42:.25;
  beats.push(Object.freeze({step,velocity:velocity*(mood==='critical'?1.1:1),
   accent:strong,kind:strong?'thump':quarter?'tick':'hat'}));
 }
 return Object.freeze(beats);
}
export function isTargetReached(state={},goal){
 if(state.cleared)return true;
 try{
  const target=state.targetExact??goal;
  if(target!=null&&state.scoreExact!=null)return BigInt(state.scoreExact)>=BigInt(target);
 }catch{}
 return Number.isFinite(Number(goal))&&Number(state.score)>=Number(goal);
}
