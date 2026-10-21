// Browser-only, portable sound design controls for the existing Audio Lab.
import {AUDIO_PRESET_SCHEMA,AUDIO_PRESET_STORAGE,AUDIO_DEFAULTS,normalizeAudioPreset} from '../../audio-preset.js?v=20261021.3';
import {harmonyAt} from './space-drift-harmony.js';
const doc=document,lab=doc.querySelector('#playtests');
if(lab){
 const section=doc.createElement('section');section.id='soundPresetLab';
 section.innerHTML='<h2>Machine audio · Sound Presets</h2>'+
  '<p>Adjust cascade voices, instruments and tuning. Select a cascade again to audition. Presets also work in the live game.</p>'+
  '<div class="controls"><label>Instrument <select id="presetWave"><option value="soft">Soft piano</option><option value="sine">Sine</option><option value="triangle">Triangle</option><option value="bell">Bell</option><option value="reed">Reed</option></select></label>'+
  '<label>Cascade tuning <select id="presetTonalMode"><option value="aligned">Aligned to Space Drift (experimental)</option><option value="original">Original pip scale</option></select></label></div>'+
  '<label>Music position for preview <input id="harmonicTime" type="range" min="0" max="420" step="12" value="0"></label>'+
  '<small id="harmonicStatus">0:00 · provisional harmony from Space Drift pads</small>'+
  '<div id="presetControls"></div>'+
  '<div class="controls"><button type="button" id="presetTestGame">SAVE & TEST IN GAME</button><button type="button" id="presetCopy">COPY JSON</button>'+
  '<button type="button" id="presetDownload">DOWNLOAD JSON</button>'+
  '<button type="button" id="presetImport">IMPORT JSON</button>'+
  '<button type="button" id="presetReset">RESET</button></div>'+
  '<input type="file" id="presetFile" accept=".json,application/json" hidden>'+
  '<output id="presetStatus" role="status" aria-live="polite">Ready</output>';
 lab.closest('section').insertAdjacentElement('afterend',section);
 const specs=[
  ['impact','Tile impact','%',0,1,.01],['operation','Operation notes','%',0,1,.01],
  ['rebound','Rebounds','%',0,1,.01],['structure','Core / split / teleport','%',0,1,.01],
  ['coin','Coins','%',0,1,.01],['release','Note release','s',.1,1.5,.02],
  ['instrumentAttack','Instrument attack','s',.005,.2,.005],
  ['instrumentLevel','Instrument volume','',0,.6,.01],
  ['cascadeDuckDb','Cascade ducking','dB',0,30,1],['shopDuckDb','Shop ducking','dB',0,24,1],
  ['shopLowpassHz','Shop low-pass','Hz',300,4000,50],['menuFadeMs','Menu fade','ms',30,1000,10],
  ['shopFadeMs','Shop fade','ms',30,1500,10],['cascadeFadeMs','Cascade fade','ms',30,1000,10],
  ['recoveryMs','Gameplay return','ms',30,3000,10]
 ];
 let preset;try{preset=normalizeAudioPreset(JSON.parse(localStorage.getItem(AUDIO_PRESET_STORAGE)||'{}'))}
 catch{preset=normalizeAudioPreset()}
 window.__monoidAudioLabPreset=()=>preset;
 const controls=section.querySelector('#presetControls');
 const save=next=>{preset=normalizeAudioPreset(next);localStorage.setItem(AUDIO_PRESET_STORAGE,JSON.stringify(preset));paint()};
 const instrumentWave=section.querySelector('#presetWave'),tonalMode=section.querySelector('#presetTonalMode');
 const harmonyTime=section.querySelector('#harmonicTime'),harmonyStatus=section.querySelector('#harmonicStatus');
 function paintHarmony(){
  const seconds=Number(harmonyTime.value),harmony=harmonyAt(seconds);
  harmonyStatus.textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0')+' · '+harmony.label+' (provisional)';
 }
 harmonyTime.addEventListener('input',paintHarmony);
 instrumentWave.addEventListener('change',()=>save({...preset,instrumentWave:instrumentWave.value}));
 tonalMode.addEventListener('change',()=>save({...preset,tonalMode:tonalMode.value}));
 const sliderNodes={};
 for(const [key,name,unit,min,max,step] of specs){
  const row=doc.createElement('label'),caption=doc.createElement('span'),control=doc.createElement('input'),value=doc.createElement('output');
  row.className='presetControl';caption.textContent=name;control.type='range';
  control.min=String(min);control.max=String(max);control.step=String(step);
  control.value=String(preset[key]);control.setAttribute('aria-label',name);
  row.append(caption,control,value);controls.append(row);
  sliderNodes[key]={control,value,unit};
  control.addEventListener('input',()=>{
   save({...preset,[key]:Number(control.value)});
   section.querySelector('#presetStatus').textContent='Updated · select a cascade to audition';
  });
 }
 function paint(){
  instrumentWave.value=preset.instrumentWave;tonalMode.value=preset.tonalMode;
  for(const [labId,key] of [['wave','instrumentWave'],['attack','instrumentAttack'],['volume','instrumentLevel'],['release','release']]){
   const input=doc.getElementById(labId);if(input)input.value=String(preset[key]);
  }
  for(const [key,{control,value,unit}] of Object.entries(sliderNodes)){
   control.value=String(preset[key]);value.textContent=unit==='%'?Math.round(preset[key]*100)+'%':preset[key]+' '+unit;
  }
 }
 const status=section.querySelector('#presetStatus');
 for(const [labId,key] of [['wave','instrumentWave'],['attack','instrumentAttack'],['volume','instrumentLevel'],['release','release']]){
  const input=doc.getElementById(labId);
  input?.addEventListener(input.tagName==='SELECT'?'change':'input',()=>{
   save({...preset,[key]:key==='instrumentWave'?input.value:Number(input.value)});
   status.textContent='Instrument saved · play a note or cascade to compare';
  });
 }
 section.querySelector('#presetTestGame').onclick=()=>{
  localStorage.setItem(AUDIO_PRESET_STORAGE,JSON.stringify(preset));
  location.assign('../../?audioLabReturn=1');
 };
 paintHarmony();
 section.querySelector('#presetCopy').onclick=async()=>{
  try{await navigator.clipboard.writeText(JSON.stringify(preset,null,2));status.textContent='Preset JSON copied'}
  catch{status.textContent='Clipboard unavailable · use DOWNLOAD JSON'}
 };
 section.querySelector('#presetDownload').onclick=()=>{
  const blob=new Blob([JSON.stringify(preset,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=doc.createElement('a');
  a.href=url;a.download='MONOID_SOUND_PRESET_v1.json';doc.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  status.textContent='Downloaded '+AUDIO_PRESET_SCHEMA;
 };
 section.querySelector('#presetImport').onclick=()=>section.querySelector('#presetFile').click();
 section.querySelector('#presetFile').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{save(JSON.parse(await file.text()));
   status.textContent='Imported '+file.name+' · select cascade to audition'}
  catch(error){status.textContent='Invalid preset: '+error.message}
  finally{e.target.value=''}
 });
 section.querySelector('#presetReset').onclick=()=>{
  save(AUDIO_DEFAULTS);status.textContent='Default sound mix restored';
 };
 paint();
}
