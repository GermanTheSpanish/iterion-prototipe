const {test,expect}=require('@playwright/test');

test('Audio Lab initializes instruments and imports recorded traces on mobile',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:4173/experiments/audio-lab/');
 await expect(page.locator('#keys button')).toHaveCount(7);
 await expect(page.locator('#import-status')).toContainText('Audio Lab ready');
 await page.locator('#signal-tree-file').setInputFiles({
  name:'recorded-debug.txt',mimeType:'text/plain',
  buffer:Buffer.from('T1 SIGNAL TREE trace=[{"type":"signal-start"}]\n')
 });
 await expect(page.locator('#import-status')).toContainText('Selected recorded-debug.txt');
 await page.locator('#signal-tree-import').click();
 await expect(page.locator('#import-status')).toContainText('1 recorded cascade(s) ready');
 await expect(page.locator('#imported-traces button')).toHaveCount(1);
 expect(errors).toEqual([]);
});

test('Audio Lab starts recorded cascades with a tabletop slap',async({page})=>{
 await page.goto('http://127.0.0.1:4173/experiments/audio-lab/');
 await expect(page.locator('#keys button')).toHaveCount(7);
 const result=await page.evaluate(async()=>{
  const module=await import('/experiments/audio-lab/instrument.js');
  const context=new (window.AudioContext||window.webkitAudioContext)();
  const master=context.createGain();master.connect(context.destination);
  const instrument=module.createInstrument(context,master,()=>{});
  instrument.slap(context.currentTime+.03,.2);
  const hasSlap=typeof instrument.slap==='function';
  await context.close();
  return hasSlap;
 });
 expect(result).toBe(true);
});

test('Audio Lab topology studies compare bounded voices on mobile without touching gameplay',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:4173/experiments/audio-lab/topology-study.html');
 await expect(page.locator('#machines button')).toHaveCount(3);
 await expect(page.locator('#voices input')).toHaveCount(1);
 await expect(page.locator('#features')).toContainText('0 cycles');
 await page.getByRole('button',{name:'Winding machine'}).click();
 await expect(page.locator('#voices input')).toHaveCount(2);
 await page.getByRole('button',{name:'Circuit and junction'}).click();
 await expect(page.locator('#voices input')).toHaveCount(4);
 await expect(page.locator('#features')).toContainText('1 cycles');
 await page.getByRole('button',{name:'Play machine'}).click();
 await expect(page.locator('#status')).toContainText('4 available voices');
 await page.getByRole('button',{name:'Stop',exact:true}).click();
 await expect(page.locator('#status')).toContainText('Stopped');
 expect(errors).toEqual([]);
});

test('Topology schedules audible notes despite pending resume',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>{
  window.__oscillatorStarts=0;
  const nativeStart=OscillatorNode.prototype.start;
  OscillatorNode.prototype.start=function(...args){
   window.__oscillatorStarts++;
   return nativeStart.apply(this,args);
  };
  const nativeResume=AudioContext.prototype.resume;
  AudioContext.prototype.resume=function(...args){
   nativeResume.apply(this,args).catch(()=>{});
   // On some mobile audio stacks this promise can remain pending.
   // Scheduling must not wait for its resolution.
   return new Promise(()=>{});
  };
 });
 await page.goto('http://127.0.0.1:4173/experiments/audio-lab/topology-study.html');
 await page.getByRole('button',{name:'Test audible note'}).click();
 await expect(page.locator('#status')).toContainText('Audible test note scheduled');
 const afterTest=await page.evaluate(()=>window.__oscillatorStarts);
 expect(afterTest).toBeGreaterThan(0);
 await page.getByRole('button',{name:'Play machine'}).click();
 await expect(page.locator('#status')).toContainText('available voices');
 expect(await page.evaluate(()=>window.__oscillatorStarts)).toBeGreaterThan(afterTest);
 await expect(page.locator('#audio-state')).toContainText('Audio engine:');
});

test('Audio Lab synthesized notes render nonzero PCM samples',async({page})=>{
 await page.goto('http://127.0.0.1:4173/experiments/audio-lab/topology-study.html');
 const peak=await page.evaluate(async()=>{
  const {createInstrument}=await import('/experiments/audio-lab/instrument.js');
  const offline=new OfflineAudioContext(1,22050,44100);
  const gain=offline.createGain();gain.connect(offline.destination);
  const instrument=createInstrument(offline,gain,()=>{});
  instrument.note(0,.05,{wave:'soft',volume:.42,release:.25});
  const rendered=await offline.startRendering();
  const samples=rendered.getChannelData(0);
  return samples.reduce((peak,sample)=>Math.max(peak,Math.abs(sample)),0);
 });
 expect(peak).toBeGreaterThan(.02);
});
