import {PIP_NOTES} from './sequencer.js';
export function createInstrument(context, destination, track) {
  function voice(freq,at,{wave='sine',volume=0.12,attack=0.008,release=0.3,endFreq=null,pan=0}={}) {
    const osc=context.createOscillator(), gain=context.createGain();
    osc.type=wave; osc.frequency.setValueAtTime(freq,at);
    if(endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq,at+Math.max(0.08,release));
    gain.gain.setValueAtTime(0.0001,at);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002,volume),at+Math.max(0.003,attack));
    gain.gain.exponentialRampToValueAtTime(0.0001,at+attack+release);
    osc.connect(gain);const stereo=context.createStereoPanner?context.createStereoPanner():null;if(stereo){stereo.pan.setValueAtTime(pan,at);gain.connect(stereo);stereo.connect(destination);}else gain.connect(destination);
    osc.start(at);osc.stop(at+attack+release+0.025);
    track(osc);
    osc.onended=()=>{osc.disconnect();gain.disconnect();if(stereo)stereo.disconnect()};
  }
  return {
    note(pip,at,{wave='triangle',volume=0.2,attack=0.012,release=0.5,reverse=false,octave=0,releaseScale=1,volumeScale=1,pan=0}={}) {
      const freq=PIP_NOTES[pip]*2**Math.max(-2,Math.min(3,octave)), v=volume*volumeScale*(reverse?0.62:1); release*=releaseScale;
      if(wave==='bell') {
        voice(freq,at,{wave:'sine',volume:v*.72,attack:.009,release:Math.max(.25,release*1.6),pan});
        voice(freq*2.01,at,{wave:'sine',volume:v*.26,attack:.004,release:Math.max(.12,release*.65),pan});
        voice(freq*3.98,at,{wave:'sine',volume:v*.12,attack:.004,release:.11,pan});
      } else if(wave==='reed') {
        voice(freq,at,{wave:'sawtooth',volume:v*.32,attack:.065,release:Math.max(.22,release*1.3),pan});
        voice(freq*.997,at,{wave:'triangle',volume:v*.35,attack:.075,release:Math.max(.22,release*1.4),pan});
      } else if(wave==='soft') {
        // Felt-piano-inspired partials: brief bright transient, warm fundamental, fast harmonic decay.
        voice(freq,at,{wave:'sine',volume:v*0.85,attack:0.004,release:Math.max(0.12,release*1.3),pan});
        voice(freq*2,at,{wave:'sine',volume:v*0.19,attack:0.003,release:0.13,pan});
        voice(freq*3.01,at,{wave:'sine',volume:v*0.065,attack:0.003,release:0.075,pan});
      } else voice(freq,at,{wave,volume:v,attack,release,pan});
    },
    // Chromatic MIDI pitch for the isolated harmonic-map study.
    // Existing seven-pip note mapping is unchanged.
    midi(midi,at,{volume=.16,attack=.012,release=.5,pan=0}={}) {
      if(!Number.isFinite(midi)||midi<24||midi>96)throw new RangeError('Invalid MIDI pitch');
      const frequency=440*Math.pow(2,(midi-69)/12);
      // Gentle sine with a quiet second harmonic; avoids an arcade beep.
      voice(frequency,at,{wave:'sine',volume:volume*.9,attack,release,pan});
      voice(frequency*2,at,{wave:'sine',volume:volume*.12,attack:Math.min(attack,.012),release:Math.min(.16,release),pan});
    },
    pulse(at,volume=0.2,accent=false) {
      voice(accent?82.41:110,at,{wave:'sine',volume:Math.min(.035,volume*(accent?.12:.065)),attack:.004,release:accent?.09:.055,endFreq:accent?54:78});
    },
    // Deterministic, sample-free tabletop impact: a brief noise transient plus wood resonance.
    slap(at,volume=0.2) {
      const sampleRate=context.sampleRate, length=Math.ceil(sampleRate*0.075);
      const buffer=context.createBuffer(1,length,sampleRate), samples=buffer.getChannelData(0);
      let seed=0x5eed;
      for(let i=0;i<length;i++){
        seed=(Math.imul(seed,1664525)+1013904223)>>>0;
        const envelope=Math.exp(-i/sampleRate*85);
        samples[i]=((seed/4294967296)*2-1)*envelope;
      }
      const source=context.createBufferSource(), filter=context.createBiquadFilter(), gain=context.createGain();
      source.buffer=buffer;filter.type='lowpass';filter.frequency.setValueAtTime(1750,at);
      gain.gain.setValueAtTime(Math.min(.28,volume*.9),at);
      source.connect(filter);filter.connect(gain);gain.connect(destination);
      source.start(at);source.stop(at+buffer.duration);
      source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect()};
      voice(155,at,{wave:'triangle',volume:Math.min(.11,volume*.35),attack:.003,release:.105,endFreq:86});
    },
    effect(type,at,volume=0.2) {
      const v=Math.min(0.18,volume*0.65);
      if(type==='rebound') voice(740,at,{wave:'sine',volume:v,attack:0.004,release:0.22,endFreq:260});
      if(type==='split') {voice(440,at,{wave:'triangle',volume:v*0.65,release:0.22});voice(659.25,at+0.035,{wave:'sine',volume:v*0.7,release:0.3});}
      if(type==='mod') {voice(392,at,{wave:'sine',volume:v*0.4,release:0.35});voice(587.33,at+0.018,{wave:'sine',volume:v*0.45,release:0.32});}
      if(type==='teleport') voice(520,at,{wave:'sine',volume:v*.55,attack:.012,release:.3,endFreq:980});
      if(type==='core') voice(196,at,{wave:'triangle',volume:v*.45,attack:.025,release:.42});
      if(type==='coin') {voice(1046.5,at,{wave:'sine',volume:v*0.55,release:0.16});voice(1568,at+0.055,{wave:'sine',volume:v*0.45,release:0.2});}
    }
  };
}
