// Deterministic listening scenes for Space Drift (Absolute Space & Sci-Fi).
// These are editorial hypotheses, NOT gameplay progression or final mastered mix.
export const STEMS=Object.freeze([
 {id:'A',label:'Calm Poly',hint:'calm'},
 {id:'B',label:'Creepy Poly',hint:'creepy'},
 {id:'C',label:'Corrupted Poly',hint:'corrupt'},
 {id:'D',label:'Pads',hint:'pads'},
 {id:'E',label:'Synth Melodies',hint:'synth'},
 {id:'F',label:'Drum',hint:'drum'}
]);
export const SCENES=Object.freeze({
 start:Object.freeze({label:'Start',levels:Object.freeze([.85,0,0,1,0,0])}),
 develop:Object.freeze({label:'Develop',levels:Object.freeze([.65,0,0,1,.3,0])}),
 complex:Object.freeze({label:'Complex',levels:Object.freeze([.55,.2,0,1,.5,.12])}),
 unusual:Object.freeze({label:'Unusual',levels:Object.freeze([.15,.6,.35,1,.12,0])})
});
export const TOPOLOGY_SCENE=Object.freeze({line:'start',turns:'develop',network:'complex'});
export function sceneForTopology(id){
 return TOPOLOGY_SCENE[id]??'start';
}
export function identifyStem(filename){
 const name=String(filename||'').toLowerCase();
 if(!/space[\s._-]*drift/.test(name))return null;
 const matched=name.match(/space[\s._-]*drift[\s._-]*([a-f])(?:[\s._-]|$)/i);
 if(matched)return matched[1].toUpperCase();
 for(const {id,hint} of STEMS)if(name.includes(hint))return id;
 return null; // Do not silently treat a premixed Full/Peace WAV as a stem.
}
export function sceneLevels(name){
 const scene=SCENES[name];
 if(!scene)throw new RangeError('Unknown Space Drift scene: '+name);
 return Object.fromEntries(STEMS.map((stem,index)=>[stem.id,scene.levels[index]]));
}
