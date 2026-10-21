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
