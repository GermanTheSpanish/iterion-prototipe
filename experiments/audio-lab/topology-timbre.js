// Sampled timbre for isolated MONOID Audio Lab. No gameplay dependencies.
// VCSL soft-mallet vibraphone A4 recording is CC0 by Versilian Studios.
// Source: https://github.com/sgossner/VCSL/tree/master/Idiophones/Struck%20Idiophones/Vibraphone/Soft%20Mallets
// Licence: https://github.com/sgossner/VCSL/blob/master/LICENSE
// Remote sample is optional; no network request is needed for the synthesised fallback.
export const CC0_VIBES_URL='https://raw.githubusercontent.com/sgossner/VCSL/master/Idiophones/Struck%20Idiophones/Vibraphone/Soft%20Mallets/Vibes_soft_A4_v1_rr1_Main.wav';
const midiFrequency=midi=>440*Math.pow(2,(midi-69)/12);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function createTopologyTimbre(context,destination,track=()=>{}) {
 let sample=null;
 function connect(gain,pan){
  const stereo=context.createStereoPanner?context.createStereoPanner():null;
  if(stereo){stereo.pan.value=pan;gain.connect(stereo);stereo.connect(destination)}
  else gain.connect(destination);
  return ()=>{gain.disconnect();stereo?.disconnect()};
 }
 async function load({file=null,url=CC0_VIBES_URL}={}) {
  const response=file?null:await fetch(url,{mode:'cors'});
  if(response&&!response.ok)throw new Error('Sample request failed: '+response.status);
  const data=file?await file.arrayBuffer():await response.arrayBuffer();
  const decoded=await context.decodeAudioData(data);
  if(decoded.duration<.15)throw new Error('Sample is too short');
  sample=decoded;
  return {duration:decoded.duration,channels:decoded.numberOfChannels};
 }
 function playSample(midi,at,{volume,attack,release,brightness,pan}) {
  const src=context.createBufferSource();
  src.buffer=sample;
  src.playbackRate.setValueAtTime(clamp(midiFrequency(midi)/midiFrequency(69),.45,2.5),at);
  const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.setValueAtTime(brightness,at);
  const gain=context.createGain(),disconnect=connect(gain,pan);
  const end=at+attack+release;
  gain.gain.setValueAtTime(.00001,at);
  gain.gain.linearRampToValueAtTime(Math.max(.00002,volume),at+attack);
  gain.gain.setTargetAtTime(.00001,at+attack+release*.25,Math.max(.035,release*.22));
  src.connect(filter);filter.connect(gain);src.start(at);src.stop(end+.1);
  track(src);
  src.onended=()=>{src.disconnect();filter.disconnect();disconnect()};
 }
 function playAir(midi,at,{volume,attack,release,brightness,pan,plain=false}) {
  const f=midiFrequency(midi),freqs=plain?[f]:[f,f*2.002];
  freqs.forEach((freq,index)=>{
   const src=context.createOscillator();src.type='sine';src.frequency.setValueAtTime(freq,at);
   const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.setValueAtTime(brightness,at);
   const gain=context.createGain(),disconnect=connect(gain,pan);
   const v=volume*(index===0?.85:.095);
   gain.gain.setValueAtTime(.00001,at);
   gain.gain.linearRampToValueAtTime(Math.max(.00002,v),at+attack);
   gain.gain.setTargetAtTime(.00001,at+attack+release*.18,Math.max(.04,release*.22));
   src.connect(filter);filter.connect(gain);src.start(at);src.stop(at+attack+release+.12);track(src);
   src.onended=()=>{src.disconnect();filter.disconnect();disconnect()};
  });
 }
 function midi(midi,at,{volume=.1,attack=.08,release=.6,pan=0,brightness=1200,preset='vibes'}={}) {
  if(!Number.isFinite(midi)||midi<24||midi>96)throw new RangeError('Invalid MIDI pitch');
  const params={volume:clamp(volume,0,.4),attack:clamp(attack,.008,.5),
   release:clamp(release,.12,3),pan:clamp(pan,-1,1),brightness:clamp(brightness,250,7000)};
  if(preset==='vibes'&&sample)playSample(midi,at,params);
  else playAir(midi,at,{...params,plain:preset==='sine'});
  return preset==='vibes'&&sample?'sample':'synth';
 }
 return {midi,load,hasSample:()=>!!sample,dispose:()=>{sample=null}};
}
