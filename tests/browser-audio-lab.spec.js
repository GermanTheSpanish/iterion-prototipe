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

test('Topology Audio Lab compares three serial music profiles and advances harmonic map',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173/experiments/audio-lab/topology-study.html');
 await expect(page.locator('#music-profile')).toHaveValue('motion');
 await page.getByRole('button',{name:'Circuit and junction'}).click();
 await page.locator('#music-profile').selectOption('complex');
 await page.getByRole('button',{name:'Play machine'}).click();
 await expect(page.locator('#status')).toContainText('4 in complex');
 await expect(page.locator('#harmonic-status')).toContainText('C / G');
 const details=await page.evaluate(async()=>{
  const h=await import('/experiments/audio-lab/space-drift-harmony.js');
  const c=await import('/experiments/audio-lab/serial-composition.js');
  const t=await import('/experiments/audio-lab/topology-composition.js');
  const f=await import('/experiments/audio-lab/topology-fixtures.js');
  const topology=t.interpretTopology(f.TOPOLOGY_STUDIES[2].pieces);
  return ['calm','motion','complex'].map(profile=>c.composeSerialMachine(topology,h.harmonyAt(36),profile).events.length);
 });
 expect(details[0]).toBeLessThan(details[1]);
 expect(details[1]).toBeLessThan(details[2]);
 await page.locator('#music-profile').selectOption('calm');
 await page.getByRole('button',{name:'Stop',exact:true}).click();
 await page.getByRole('button',{name:'Play machine'}).click();
 await expect(page.locator('#status')).toContainText('1 in calm');
 expect(errors).toEqual([]);
});

test('Topology Audio Lab exposes quiet CC0 timbre mix controls and loads sampled WAV',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const samples=22050,sampleRate=44100,buffer=Buffer.alloc(44+samples*2);
 buffer.write('RIFF',0);buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVE',8);
 buffer.write('fmt ',12);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);
 buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(sampleRate,24);
 buffer.writeUInt32LE(sampleRate*2,28);buffer.writeUInt16LE(2,32);
 buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(samples*2,40);
 for(let i=0;i<samples;i++) buffer.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*440/sampleRate)*10000),44+i*2);
 let requests=0;
 await page.route('https://raw.githubusercontent.com/sgossner/VCSL/**',async route=>{
  requests++;
  await route.fulfill({status:200,contentType:'audio/wav',
   headers:{'Access-Control-Allow-Origin':'*'},body:buffer});
 });
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:4173/experiments/audio-lab/topology-study.html');
 await expect(page.locator('#machine-level')).toHaveValue('0.2');
 await expect(page.locator('#world-level')).toHaveValue('1.25');
 await expect(page.locator('#timbre')).toHaveValue('vibes');
 await page.locator('#brightness').fill('1600');
 await page.locator('#attack').fill('0.104');
 await page.getByRole('button',{name:'Play machine'}).click();
 await expect(page.locator('#sample-status')).toContainText('CC0 Soft Vibes ready');
 expect(requests).toBe(1);
 await expect(page.locator('#status')).toContainText('available voices');
 await page.getByRole('button',{name:'Stop',exact:true}).click();
 await page.locator('#timbre').selectOption('air');
 await page.getByRole('button',{name:'Play machine'}).click();
 await expect(page.locator('#sample-status')).toContainText('Using synthesised air');
 expect(requests).toBe(1);
 expect(errors).toEqual([]);
});

test('CC0 sampled instrument and fallback both generate real audio PCM',async({page})=>{
 await page.goto('http://127.0.0.1:4173/experiments/audio-lab/topology-study.html');
 const amplitudes=await page.evaluate(async()=>{
  const {createTopologyTimbre}=await import('/experiments/audio-lab/topology-timbre.js');
  async function render(sample){
   const context=new OfflineAudioContext(1,24000,48000);
   const gain=context.createGain();gain.connect(context.destination);
   const timbre=createTopologyTimbre(context,gain);
   if(sample){
    const frames=48000,ab=new ArrayBuffer(44+frames*2),v=new DataView(ab);
    const put=(off,s)=>{for(let i=0;i<s.length;i++)v.setUint8(off+i,s.charCodeAt(i))};
    put(0,'RIFF');v.setUint32(4,ab.byteLength-8,true);put(8,'WAVE');put(12,'fmt ');
    v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
    v.setUint32(24,48000,true);v.setUint32(28,96000,true);v.setUint16(32,2,true);
    v.setUint16(34,16,true);put(36,'data');v.setUint32(40,frames*2,true);
    for(let i=0;i<frames;i++)v.setInt16(44+i*2,Math.round(Math.sin(i*2*Math.PI*440/48000)*8000),true);
    await timbre.load({file:new File([ab],'cc0.wav',{type:'audio/wav'})});
   }
   const source=timbre.midi(69,.05,{preset:'vibes',volume:.1,attack:.04,release:.5});
   const pcm=(await context.startRendering()).getChannelData(0);
   return {source,peak:pcm.reduce((max,x)=>Math.max(max,Math.abs(x)),0)};
  }
  return [await render(false),await render(true)];
 });
 expect(amplitudes[0].source).toBe('synth');
 expect(amplitudes[1].source).toBe('sample');
 expect(amplitudes[0].peak).toBeGreaterThan(.001);
 expect(amplitudes[1].peak).toBeGreaterThan(.001);
});

test('WORLD gain supports live 200 percent control without recreating its media source',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>{
  window.__worldSourceConnections=0;
  window.__worldGain=null;
  const connect=MediaElementAudioSourceNode.prototype.connect;
  MediaElementAudioSourceNode.prototype.connect=function(target,...args){
   window.__worldSourceConnections++;
   window.__worldGain=target;
   return connect.call(this,target,...args);
  };
 });
 const rate=44100,frames=rate;
 const wav=Buffer.alloc(44+frames*2);
 wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);
 wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);
 wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);
 wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);
 wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);
 wav.write('data',36);wav.writeUInt32LE(frames*2,40);
 for(let i=0;i<frames;i++)wav.writeInt16LE(Math.round(2500*Math.sin(2*Math.PI*220*i/rate)),44+i*2);
 await page.goto('http://127.0.0.1:4173/experiments/audio-lab/topology-study.html');
 await expect(page.locator('#world-percent')).toHaveText('125%');
 await page.locator('#world-level').fill('1.75');
 await expect(page.locator('#world-percent')).toHaveText('175%');
 await page.locator('#world-file').setInputFiles({name:'local-world.wav',mimeType:'audio/wav',buffer:wav});
 await page.locator('#timbre').selectOption('air');
 await page.getByRole('button',{name:'Play machine'}).click();
 await expect.poll(()=>page.evaluate(()=>window.__worldSourceConnections)).toBe(1);
 await expect.poll(()=>page.evaluate(()=>window.__worldGain?.gain.value)).toBe(1.75);
 await page.locator('#world-level').fill('2');
 await expect(page.locator('#world-percent')).toHaveText('200%');
 await expect.poll(()=>page.evaluate(()=>window.__worldGain?.gain.value)).toBeGreaterThan(1.95);
 await page.getByRole('button',{name:'Stop',exact:true}).click();
 await page.getByRole('button',{name:'Play machine'}).click();
 await expect.poll(()=>page.evaluate(()=>window.__worldSourceConnections)).toBe(1);
 await expect(page.locator('#world-percent')).toHaveText('200%');
 await page.locator('#world-level').fill('0');
 await expect(page.locator('#world-percent')).toHaveText('0%');
 await expect.poll(()=>page.evaluate(()=>window.__worldGain?.gain.value)).toBeLessThan(.05);
});
