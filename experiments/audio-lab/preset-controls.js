// Browser-only, portable sound design controls for the existing Audio Lab.
import {AUDIO_PRESET_SCHEMA,AUDIO_PRESET_STORAGE,AUDIO_DEFAULTS,normalizeAudioPreset} from '../../audio-preset.js?v=20261021.2';
const doc=document,lab=doc.querySelector('#playtests');
if(lab){
 const section=doc.createElement('section');section.id='soundPresetLab';
 section.innerHTML='<h2>Machine audio · Sound Presets</h2>'+
  '<p>Adjust cascade voices and acoustic states. Select a cascade again to audition changes. Presets also work in the live game.</p>'+
  '<div id="presetControls"></div>'+
  '<div class="controls"><button type="button" id="presetCopy">COPY JSON</button>'+
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
  ['cascadeDuckDb','Cascade ducking','dB',0,30,1],['shopDuckDb','Shop ducking','dB',0,24,1],
  ['shopLowpassHz','Shop low-pass','Hz',300,4000,50],['menuFadeMs','Menu fade','ms',30,1000,10],
  ['shopFadeMs','Shop fade','ms',30,1500,10],['cascadeFadeMs','Cascade fade','ms',30,1000,10],
  ['recoveryMs','Gameplay return','ms',30,3000,10]
 ];
 let preset;try{preset=normalizeAudioPreset(JSON.parse(localStorage.getItem(AUDIO_PRESET_STORAGE)||'{}'))}
 catch{preset=normalizeAudioPreset()}
 window.__monoidAudioLabPreset=()=>preset;
 const controls=section.querySelector('#presetControls');
 const sliderNodes={};
 for(const [key,name,unit,min,max,step] of specs){
  const row=doc.createElement('label'),caption=doc.createElement('span'),control=doc.createElement('input'),value=doc.createElement('output');
  row.className='presetControl';caption.textContent=name;control.type='range';
  control.min=String(min);control.max=String(max);control.step=String(step);
  control.value=String(preset[key]);control.setAttribute('aria-label',name);
  row.append(caption,control,value);controls.append(row);
  sliderNodes[key]={control,value,unit};
  control.addEventListener('input',()=>{
   preset=normalizeAudioPreset({...preset,[key]:Number(control.value)});
   localStorage.setItem(AUDIO_PRESET_STORAGE,JSON.stringify(preset));paint();
   section.querySelector('#presetStatus').textContent='Updated · select a cascade to audition';
  });
 }
 function paint(){
  for(const [key,{control,value,unit}] of Object.entries(sliderNodes)){
   control.value=String(preset[key]);value.textContent=unit==='%'?Math.round(preset[key]*100)+'%':preset[key]+' '+unit;
  }
 }
 const status=section.querySelector('#presetStatus');
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
  try{preset=normalizeAudioPreset(JSON.parse(await file.text()));
   localStorage.setItem(AUDIO_PRESET_STORAGE,JSON.stringify(preset));paint();
   status.textContent='Imported '+file.name+' · select cascade to audition'}
  catch(error){status.textContent='Invalid preset: '+error.message}
  finally{e.target.value=''}
 });
 section.querySelector('#presetReset').onclick=()=>{
  preset=normalizeAudioPreset(AUDIO_DEFAULTS);localStorage.setItem(AUDIO_PRESET_STORAGE,JSON.stringify(preset));
  paint();status.textContent='Default sound mix restored';
 };
 paint();
}
