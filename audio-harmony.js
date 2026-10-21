// Provisional Space Drift pitch map for cascade notes. Audio-only; no gameplay state.
import {PIP_NOTES} from './experiments/audio-lab/sequencer.js';
import {harmonyAt} from './experiments/audio-lab/space-drift-harmony.js';
const DEGREES=[0,1,2,3,4,1,2];
export function cascadeFrequency(pip,tonalMode='aligned',playbackSeconds=0){
 if(!Number.isInteger(pip)||pip<0||pip>6)throw new RangeError('Invalid cascade pip');
 if(tonalMode==='original')return PIP_NOTES[pip];
 if(tonalMode!=='aligned')throw new RangeError('Unknown cascade tuning');
 const seconds=Number.isFinite(playbackSeconds)?Math.max(0,playbackSeconds):0;
 const palette=harmonyAt(seconds).notes;
 const midi=palette[DEGREES[pip]]+(pip>=5?12:0);
 return 440*Math.pow(2,(midi-69)/12);
}
