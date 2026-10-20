const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const dir=path.join(__dirname,'../experiments/audio-lab');
(async()=>{
 const src=fs.readFileSync(path.join(dir,'world-mix.js'),'utf8');
 const {createWorldMix,WORLD_DEFAULT_LEVEL,WORLD_MAX_LEVEL}=await import(
  'data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
 assert.equal(WORLD_DEFAULT_LEVEL,1.25);
 assert.equal(WORLD_MAX_LEVEL,2);
 const html=fs.readFileSync(path.join(dir,'topology-study.html'),'utf8');
 assert.match(html,/id="world-level"[^>]*max="2"[^>]*value="1\.25"/);
 assert.match(html,/id="world-percent"/);
 assert.match(html,/worldMix\.activate\(\)/);
 const element={volume:1};
 let created=0,sources=0,resumes=0,closes=0,settings=[];
 const node=()=>({connect(){return this},disconnect(){}});
 const fakeCtx={
  currentTime:4,destination:node(),
  createMediaElementSource(media){assert.equal(media,element);sources++;return node()},
  createGain(){const gain=node();gain.gain={
   value:0,cancelScheduledValues(time){assert.equal(time,4)},
   setTargetAtTime(value,time,constant){settings.push({value,time,constant});this.value=value}};
   return gain},
  createDynamicsCompressor(){const compressor=node();for(const param of ['threshold','knee','ratio','attack','release'])compressor[param]={value:0};return compressor},
  resume(){resumes++;return Promise.resolve()},
  close(){closes++;return Promise.resolve()}
 };
 const bus=createWorldMix(element,()=>{created++;return fakeCtx});
 assert.equal(bus.getLevel(),1.25);
 assert.equal(element.volume,1);
 assert.equal(bus.getState(),'uninitialised');
 bus.setLevel(.4);assert.equal(bus.getLevel(),.4);assert.equal(element.volume,.4);
 await bus.activate();assert.equal(created,1);assert.equal(sources,1);assert.equal(resumes,1);
 assert.equal(element.volume,1,'The media element must stay at unity after routing');
 bus.setLevel(1.8);assert.equal(bus.getLevel(),1.8);
 assert.equal(settings.at(-1).value,1.8);
 bus.setLevel(100);assert.equal(bus.getLevel(),2);
 bus.setLevel(-2);assert.equal(bus.getLevel(),0);
 assert.throws(()=>bus.setLevel(Infinity),RangeError);
 await bus.activate();assert.equal(created,1);assert.equal(sources,1);assert.equal(resumes,2);
 bus.dispose();assert.equal(closes,1);
 console.log('Audio Lab WORLD gain control regressions passed');
})().catch(error=>{console.error(error);process.exitCode=1});
