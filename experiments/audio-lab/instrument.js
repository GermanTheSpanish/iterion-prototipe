import {PIP_NOTES} from './sequencer.js';
export function createInstrument(context, destination, track) {
  function voice(freq,at,{wave='sine',volume=0.12,attack=0.008,release=0.3,endFreq=null}={}) {
    const osc=context.createOscillator(), gain=context.createGain();
    osc.type=wave; osc.frequency.setValueAtTime(freq,at);
    if(endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq,at+Math.max(0.08,release));
    gain.gain.setValueAtTime(0.0001,at);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002,volume),at+Math.max(0.003,attack));
    gain.gain.exponentialRampToValueAtTime(0.0001,at+attack+release);
    osc.connect(gain);gain.connect(destination);
    osc.start(at);osc.stop(at+attack+release+0.025);
    track(osc);
    osc.onended=()=>{osc.disconnect();gain.disconnect()};
  }
  return {
    note(pip,at,{wave='triangle',volume=0.2,attack=0.012,release=0.5,reverse=false}={}) {
      const freq=PIP_NOTES[pip], v=volume*(reverse?0.62:1);
      if(wave==='soft') {
        // Felt-piano-inspired partials: brief bright transient, warm fundamental, fast harmonic decay.
        voice(freq,at,{wave:'sine',volume:v*0.85,attack:0.004,release:Math.max(0.12,release*1.3)});
        voice(freq*2,at,{wave:'sine',volume:v*0.19,attack:0.003,release:0.13});
        voice(freq*3.01,at,{wave:'sine',volume:v*0.065,attack:0.003,release:0.075});
      } else voice(freq,at,{wave,volume:v,attack,release});
    },
    effect(type,at,volume=0.2) {
      const v=Math.min(0.18,volume*0.65);
      if(type==='rebound') voice(740,at,{wave:'sine',volume:v,attack:0.004,release:0.22,endFreq:260});
      if(type==='split') {voice(440,at,{wave:'triangle',volume:v*0.65,release:0.22});voice(659.25,at+0.035,{wave:'sine',volume:v*0.7,release:0.3});}
      if(type==='mod') {voice(392,at,{wave:'sine',volume:v*0.4,release:0.35});voice(587.33,at+0.018,{wave:'sine',volume:v*0.45,release:0.32});}
      if(type==='coin') {voice(1046.5,at,{wave:'sine',volume:v*0.55,release:0.16});voice(1568,at+0.055,{wave:'sine',volume:v*0.45,release:0.2});}
    }
  };
}
