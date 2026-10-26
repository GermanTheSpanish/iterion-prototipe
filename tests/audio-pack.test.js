const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const source=fs.readFileSync(path.join(__dirname,'../audio-pack.js'),'utf8');
const syntax=spawnSync(process.execPath,['--check','--input-type=module'],{input:source,encoding:'utf8'});
assert.equal(syntax.status,0,syntax.stderr);
(async()=>{
 const {parseAudioPack,PACK_MAGIC,PACK_SCHEMA}=await import('data:text/javascript,'+encodeURIComponent(source));
 const chunk=new Uint8Array(256);
 const sample={schema:PACK_SCHEMA,codec:'aac-lc',private:true,sampleRateHz:44100,channels:2,
  segmentSamples:22050,totalSamples:44100,segmentCount:2,
  stems:{F:{segments:[{offset:0,bytes:256},{offset:256,bytes:256}]}}};
 function pack(data=sample){
  const header=new TextEncoder().encode(JSON.stringify(data)),length=new Uint8Array(12);
  length.set([...PACK_MAGIC].map(x=>x.charCodeAt(0)));new DataView(length.buffer).setUint32(8,header.length,true);
  return new Blob([length,header,chunk,chunk]);
 }
 const parsed=await parseAudioPack(pack());
 const tempos=[80,84,88,92,96];
 const variants={};let v2Offset=0;
 for(const bpm of tempos){
  variants[String(bpm)]={bpm,segmentSamples:Math.round(4*240*44100/bpm),
   overlapSamples:7056,stems:{F:{segments:[{offset:v2Offset,bytes:256}]}}};
  v2Offset+=256;
 }
 const tempoManifest={schema:'monoid-audio-pack-v2',name:'Test Private',
  codec:'aac-lc',private:true,sampleRateHz:44100,channels:2,
  sourceBpm:80,barsPerSegment:4,segmentCount:1,variants};
 const packV2=data=>{
  const header=new TextEncoder().encode(JSON.stringify(data)),length=new Uint8Array(12);
  length.set([...PACK_MAGIC].map(x=>x.charCodeAt(0)));
  new DataView(length.buffer).setUint32(8,header.length,true);
  return new Blob([length,header,...tempos.map(()=>chunk)]);
 };
 const tempo=await parseAudioPack(packV2(tempoManifest));
 assert.equal(tempo.tempoVariant,true);
 assert.deepEqual(tempo.ids,['F']);
 assert.equal(tempo.manifest.variants['96'].segmentSamples,441000);
 assert.equal(tempo.manifest.variants['80'].segmentSamples,529200);
 const invalid=(key,edit)=>{
  const clone=JSON.parse(JSON.stringify(tempoManifest));edit(clone);return parseAudioPack(packV2(clone));
 };
 await assert.rejects(invalid('variant',m=>delete m.variants['92']),/all five/);
 await assert.rejects(invalid('sample',m=>m.variants['84'].segmentSamples--),/four-bar clock/);
 await assert.rejects(invalid('tail',m=>m.variants['96'].overlapSamples=44000),/overlap/);
 await assert.rejects(invalid('order',m=>m.variants['88'].stems.F.segments[0].offset=42),/overlapping/);
 await assert.rejects(invalid('missingF',m=>m.variants['80'].stems={A:m.variants['80'].stems.F}),/F Drum/);

 assert.deepEqual(parsed.ids,['F']);
 assert.equal(parsed.offset>12,true);
 assert.equal(parsed.manifest.segmentCount,2);
 await assert.rejects(parseAudioPack(new Blob(['bad data'])),/truncated|signature/);
 await assert.rejects(parseAudioPack(pack({...sample,codec:'opus'})),/AAC-LC/);
 await assert.rejects(parseAudioPack(pack({...sample,private:false})),/private AAC-LC/);
 await assert.rejects(parseAudioPack(pack({...sample,totalSamples:44000})),/timeline/);
 await assert.rejects(parseAudioPack(pack({...sample,stems:{A:sample.stems.F}})),/F Drum/);
 await assert.rejects(parseAudioPack(pack({...sample,stems:{F:{segments:[{offset:0,bytes:256},{offset:250,bytes:256}]}}})),/overlapping/);
 await assert.rejects(parseAudioPack(pack({...sample,stems:{F:{segments:[{offset:0,bytes:256},{offset:256,bytes:999999}]}}})),/outside pack/);
 console.log('Private compressed audio pack integrity and module checks passed');
})().catch(error=>{console.error(error);process.exitCode=1});
