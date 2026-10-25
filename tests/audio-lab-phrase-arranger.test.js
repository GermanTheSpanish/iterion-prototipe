const assert=require('node:assert/strict'),fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../experiments/audio-lab/phrase-arranger.js'),'utf8');
 const {secondsPerBar,estimateTempo,createCatalogue,buildArrangement,validatePhraseMap,ARRANGER_SCHEMA}=await
  import('data:text/javascript,'+encodeURIComponent(source));
 assert(Math.abs(secondsPerBar(120)-2)<1e-10);
 assert.throws(()=>secondsPerBar(0),/range/);
 // Synthetic F Drum energy envelopes: 120 BPM, a transient every quarter.
 const energies=Float32Array.from({length:2000},(_,i)=>i%25===0?1:0);
 const tempo=estimateTempo(energies,.02,{minBpm:110,maxBpm:130});
 assert(Math.abs(tempo.bpm-120)<=1,JSON.stringify(tempo));
 assert(tempo.confidence>.5);
 const catalog=createCatalogue({durationSeconds:432,bpm:120});
 assert.equal(catalog.length,27);
 assert.equal(catalog[0].group,'SECTION_01');
 assert.equal(catalog[0].to,16);
 assert.equal(catalog[1].from,16);
 assert.throws(()=>createCatalogue({durationSeconds:432,bpm:120,offsetSeconds:3}),/offset/);
 const p={catalogue:catalog,bpm:120,count:4,seed:17,lead:'A'};
 const original=buildArrangement({...p,mode:'original'});
 const rearranged=buildArrangement({...p,mode:'rearranged'});
 const adaptive=buildArrangement({...p,mode:'adaptive',events:['steady','build','branch','circuit']});
 assert.equal(original.phrases.length,28);
 assert.equal(original.durationSeconds,64);
 assert.deepEqual(original,buildArrangement({...p,mode:'original'}),'original plans are deterministic');
 assert.deepEqual(rearranged,buildArrangement({...p,mode:'rearranged'}),'rearranged plans are seeded');
 assert.equal(adaptive.scenes.map(x=>x.lead).join(''),'AEBC');
 assert.deepEqual(original.phrases.filter(x=>x.scene===0&&x.stem==='F').map(x=>x.bars),[2,2,2,2]);
 assert.deepEqual(original.phrases.filter(x=>x.scene===0&&x.stem==='D').map(x=>x.bars),[8]);
 assert.deepEqual(original.phrases.filter(x=>x.scene===0&&x.stem==='A').map(x=>x.bars),[4,4]);
 assert(rearranged.phrases.some((x,i)=>x.stem==='F'&&x.sourceSeconds!==original.phrases[i].sourceSeconds),
  'drum subphrases are actually rearranged');
 for(const arrangement of [original,rearranged,adaptive]){
  for(const clip of arrangement.phrases){
   const origin=catalog[clip.sourceScene];
   const anchor=catalog[clip.scene];
   assert.equal(origin.group,anchor.group,'never cross unrelated harmonic groups');
   assert(clip.sourceSeconds>=origin.from&&clip.sourceSeconds+clip.durationSeconds<=origin.to+.00001);
   assert(clip.destinationSeconds>=0);
  }
 }
 const sameGroups=createCatalogue({durationSeconds:432,bpm:120,groups:['minor','minor','major']});
 const edited=buildArrangement({catalogue:sameGroups,bpm:120,mode:'rearranged',count:2,seed:1});
 for(const phrase of edited.phrases)assert.equal(sameGroups[phrase.sourceScene].group,'minor');
 const map=validatePhraseMap({schema:ARRANGER_SCHEMA,bpm:120,offsetSeconds:0,durationSeconds:432,seed:1,groups:['minor','major']});
 assert.equal(map.groups[0],'minor');assert.equal(map.groups[1],'major');
 assert.throws(()=>validatePhraseMap({schema:'unexpected',bpm:120,offsetSeconds:0,durationSeconds:432,seed:1}),/schema/);
 assert.throws(()=>buildArrangement({...p,mode:'unknown'}),/mode/);
 assert.throws(()=>buildArrangement({...p,lead:'F'}),/lead/);
 const page=fs.readFileSync(path.join(__dirname,'../experiments/audio-lab/phrase-arranger.html'),'utf8');
 const lab=fs.readFileSync(path.join(__dirname,'../experiments/audio-lab/index.html'),'utf8');
 const transport=fs.readFileSync(path.join(__dirname,'../experiments/audio-lab/phrase-arranger-ui.js'),'utf8');
 assert.match(page,/phrase-arranger-ui\.js/);assert.match(lab,/phrase-arranger\.html/);
 assert.match(transport,/decodePcmSegment/);
 assert.doesNotMatch(source,/Math\.random/);
 console.log('Phrase Arranger variable-bar, harmony-group, deterministic arrangement and exports passed');
})().catch(e=>{console.error(e);process.exitCode=1});
