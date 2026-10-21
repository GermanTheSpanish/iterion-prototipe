// UI-only machine sonification. Cues are triggered at visual playback time.
// Synthesizer and preset controls are shared with Audio Lab; no gameplay RNG/state.
import {createInstrument} from './experiments/audio-lab/instrument.js';
export function createMachineEffects(player,{maxOscillators=24}={}){
 let instrument=null,context=null,active=new Set(),preset=null,played=0,dropped=0;
 function activate(){
  const graph=player.activateAudio();
  if(!instrument||context!==graph.context){
   context=graph.context;
   instrument=createInstrument(context,graph.effects,osc=>{
    active.add(osc);
    osc.addEventListener?.('ended',()=>active.delete(osc),{once:true});
   });
  }
  return context;
 }
 function setPreset(next){preset=next}
 function cue(kind,detail={}){
  if(!preset)return false;
  const ctx=activate(),at=ctx.currentTime+.012;
  if(active.size>=maxOscillators){dropped++;return false}
  const v=kind==='placement'?preset.impact:kind==='op'?preset.operation:kind==='rebound'?preset.rebound:
   kind==='coin'?preset.coin:preset.structure;
  if(v<=0)return false;
  if(kind==='placement')instrument.slap(at,v*.30);
  else if(kind==='op'){
   const pip=Math.min(6,Math.max(0,Math.floor(Number(detail.pip)||0)));
   instrument.note(pip,at,{wave:'soft',volume:v*.15,release:preset.release,
    reverse:!!detail.reverse,pan:Math.max(-.7,Math.min(.7,Number(detail.pan)||0))});
  }else {
   const fx=kind==='rebound'?'rebound':kind==='split'?'split':kind==='teleport'?'teleport':
    kind==='coin'?'coin':kind==='core'?'core':kind==='mod'?'mod':null;
   if(!fx)return false;
   instrument.effect(fx,at,v*.30);
  }
  played++;
  return true;
 }
 function cancel(){
  for(const osc of active){try{osc.stop()}catch{}}
  active.clear();
 }
 function snapshot(){return {voices:active.size,played,dropped}}
 return Object.freeze({activate,cue,cancel,setPreset,snapshot});
}
