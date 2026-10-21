// Editable audio tuning shared by the game and Audio Lab. No gameplay state.
export const AUDIO_PRESET_SCHEMA='monoid-audio-preset-v1';
export const AUDIO_PRESET_STORAGE='monoid.audioPreset.v1';
export const AUDIO_DEFAULTS=Object.freeze({
 operation:0.58,impact:0.70,rebound:0.52,structure:0.50,coin:0.45,
 release:0.45,instrumentWave:'soft',instrumentAttack:0.015,instrumentLevel:0.2,tonalMode:'aligned',cascadeDuckDb:8,shopDuckDb:10,shopLowpassHz:850,
 menuFadeMs:120,shopFadeMs:240,cascadeFadeMs:150,recoveryMs:650
});
const LIMITS=Object.freeze({
 operation:[0,1],impact:[0,1],rebound:[0,1],structure:[0,1],coin:[0,1],
 release:[0.1,1.5],instrumentAttack:[0.005,0.2],instrumentLevel:[0,0.6],cascadeDuckDb:[0,30],shopDuckDb:[0,24],
 shopLowpassHz:[300,4000],menuFadeMs:[30,1000],shopFadeMs:[30,1500],
 cascadeFadeMs:[30,1000],recoveryMs:[30,3000]
});
export function normalizeAudioPreset(value={}){
 if(value==null||typeof value!=='object'||Array.isArray(value))throw new TypeError('Invalid audio preset');
 if(value.schema!=null&&value.schema!==AUDIO_PRESET_SCHEMA)throw new Error('Unsupported audio preset schema');
 const result={schema:AUDIO_PRESET_SCHEMA};
 for(const [key,[min,max]] of Object.entries(LIMITS)){
  const input=value[key]??AUDIO_DEFAULTS[key],n=Number(input);
  if(!Number.isFinite(n))throw new TypeError('Invalid audio parameter: '+key);
  result[key]=Math.max(min,Math.min(max,n));
 }
 for(const [key,values] of Object.entries({instrumentWave:['sine','triangle','soft','bell','reed'],tonalMode:['aligned','original']})){
  const choice=value[key]??AUDIO_DEFAULTS[key];
  if(typeof choice!=='string'||!values.includes(choice))throw new TypeError('Invalid audio parameter: '+key);
  result[key]=choice;
 }
 return Object.freeze(result);
}
export function audioDbGain(db){return Math.pow(10,-Math.abs(db)/20)}
