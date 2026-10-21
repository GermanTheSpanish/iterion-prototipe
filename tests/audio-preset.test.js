const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const moduleText=fs.readFileSync(path.join(__dirname,'../audio-preset.js'),'utf8');
const syntax=spawnSync(process.execPath,['--check','--input-type=module'],{input:moduleText,encoding:'utf8'});
assert.equal(syntax.status,0,syntax.stderr);
(async()=>{
 const {normalizeAudioPreset,audioDbGain,AUDIO_PRESET_SCHEMA}=await import('data:text/javascript,'+encodeURIComponent(moduleText));
 const p=normalizeAudioPreset({schema:AUDIO_PRESET_SCHEMA,operation:.3,shopDuckDb:10,shopLowpassHz:725});
 assert.equal(p.operation,.3);assert.equal(p.shopLowpassHz,725);
 assert.equal(p.instrumentWave,'soft');assert.equal(p.tonalMode,'aligned');
 assert.equal(normalizeAudioPreset({instrumentWave:'reed',tonalMode:'original'}).instrumentWave,'reed');
 assert.throws(()=>normalizeAudioPreset({instrumentWave:'square'}),/instrumentWave/);
 assert.throws(()=>normalizeAudioPreset({tonalMode:'unknown'}),/tonalMode/);
 assert.equal(p.cascadeDuckDb,8);assert.ok(Math.abs(audioDbGain(20)-.1)<1e-9);
 assert.equal(normalizeAudioPreset({operation:100}).operation,1);
 assert.throws(()=>normalizeAudioPreset({schema:'other'}),/schema/);
 assert.throws(()=>normalizeAudioPreset({operation:'oops'}),/operation/);
 assert.equal(Object.isFrozen(p),true);
 for(const file of ['audio-harmony.js','audio-effects.js','music-runtime.js','experiments/audio-lab/preset-controls.js','experiments/audio-lab/stem-player.js']){
  const source=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
  const checked=spawnSync(process.execPath,['--check','--input-type=module'],{input:source,encoding:'utf8'});
  assert.equal(checked.status,0,file+' syntax error: '+checked.stderr);
 }
 console.log('Audio preset and effects module regressions passed');
})().catch(error=>{console.error(error);process.exitCode=1});
