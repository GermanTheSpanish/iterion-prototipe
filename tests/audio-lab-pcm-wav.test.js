const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../experiments/audio-lab/pcm-wav-stream.js'),'utf8');
(async()=>{
 const {parsePcmWavHeader,decodePcmSegment}=await import(
  'data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const rate=44100,frames=rate,raw=Buffer.alloc(44+frames*4);
 raw.write('RIFF',0);raw.writeUInt32LE(raw.length-8,4);
 raw.write('WAVEfmt ',8);raw.writeUInt32LE(16,16);
 raw.writeUInt16LE(1,20);raw.writeUInt16LE(2,22);
 raw.writeUInt32LE(rate,24);raw.writeUInt32LE(rate*4,28);
 raw.writeUInt16LE(4,32);raw.writeUInt16LE(16,34);
 raw.write('data',36);raw.writeUInt32LE(frames*4,40);
 raw.writeInt16LE(16000,44);raw.writeInt16LE(-16000,46);
 raw.writeInt16LE(8000,48);raw.writeInt16LE(-8000,50);
 const header=parsePcmWavHeader(raw.buffer.slice(raw.byteOffset,raw.byteOffset+64),raw.length);
 assert.equal(header.dataOffset,44);
 assert.equal(header.frames,frames);
 assert.equal(header.sampleRate,rate);
 assert.equal(header.channels,2);
 const wav={slice:(start,end)=>({
  arrayBuffer:async()=>raw.subarray(start,end).buffer.slice(
   raw.subarray(start,end).byteOffset,
   raw.subarray(start,end).byteOffset+raw.subarray(start,end).byteLength)
 })};
 const fakeContext={createBuffer(channels,length,sampleRate){
  assert.equal(channels,2);assert.equal(sampleRate,rate);
  const left=new Float32Array(length),right=new Float32Array(length);
  return {getChannelData:index=>index===0?left:right};
 }};
 const segment=await decodePcmSegment(fakeContext,wav,header,0,2);
 assert.ok(Math.abs(segment.getChannelData(0)[0]-16000/32768)<.000001);
 assert.ok(Math.abs(segment.getChannelData(1)[0]+16000/32768)<.000001);
 assert.ok(Math.abs(segment.getChannelData(0)[1]-8000/32768)<.000001);
 const incorrect=Buffer.from(raw);incorrect.writeUInt16LE(3,20);
 assert.throws(()=>parsePcmWavHeader(incorrect.buffer.slice(
  incorrect.byteOffset,incorrect.byteOffset+64),incorrect.length),/Expected 16-bit stereo PCM/);
 assert.throws(()=>parsePcmWavHeader(new ArrayBuffer(4),4),/Incomplete WAV/);
 console.log('PCM WAV stream parser and sample decoding regressions passed');
})().catch(error=>{console.error(error);process.exitCode=1});
