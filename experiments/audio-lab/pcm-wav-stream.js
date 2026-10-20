// Streaming reader for the original Space Drift WAV stems.
// Supports standard RIFF/WAVE PCM16 (the purchased A-F stems: 44.1 kHz stereo).
// Decode only a short window of each local File, not the full 7:12 recording.
const fourCC=(data,offset)=>String.fromCharCode(...new Uint8Array(data,offset,4));
export function parsePcmWavHeader(arrayBuffer,fileSize) {
 if(!(arrayBuffer instanceof ArrayBuffer)||arrayBuffer.byteLength<44)throw new Error('Incomplete WAV header');
 if(fourCC(arrayBuffer,0)!=='RIFF'||fourCC(arrayBuffer,8)!=='WAVE')throw new Error('Only RIFF/WAVE PCM files are supported');
 const view=new DataView(arrayBuffer);
 let offset=12,format=null,dataOffset=null,dataBytes=null;
 while(offset+8<=arrayBuffer.byteLength) {
  const type=fourCC(arrayBuffer,offset),length=view.getUint32(offset+4,true);
  const begin=offset+8;
  if(type==='fmt '&&begin+16<=arrayBuffer.byteLength) {
   format={encoding:view.getUint16(begin,true),channels:view.getUint16(begin+2,true),
    sampleRate:view.getUint32(begin+4,true),blockAlign:view.getUint16(begin+12,true),
    bitsPerSample:view.getUint16(begin+14,true)};
  }
  if(type==='data'){dataOffset=begin;dataBytes=length;break}
  offset=begin+length+(length%2);
 }
 if(!format||dataOffset===null)throw new Error('WAV fmt/data chunks missing or header too large');
 if(format.encoding!==1||format.bitsPerSample!==16||format.channels!==2||
   format.blockAlign!==4||format.sampleRate<8000||format.sampleRate>192000)
  throw new Error('Expected 16-bit stereo PCM WAV');
 const available=Math.max(0,Math.min(dataBytes,fileSize-dataOffset));
 if(available<format.sampleRate*format.blockAlign*.25)throw new Error('WAV audio too short');
 return {...format,dataOffset,frames:Math.floor(available/format.blockAlign)};
}
export async function readPcmHeader(file) {
 if(!file||typeof file.slice!=='function')throw new TypeError('Expected local WAV File');
 const head=await file.slice(0,Math.min(file.size,65536)).arrayBuffer();
 return parsePcmWavHeader(head,file.size);
}
export async function decodePcmSegment(context,file,header,startFrame,frameCount) {
 const first=header.dataOffset+startFrame*header.blockAlign;
 const bytes=await file.slice(first,first+frameCount*header.blockAlign).arrayBuffer();
 if(bytes.byteLength!==frameCount*header.blockAlign)throw new Error('Incomplete stem segment');
 const pcm=new DataView(bytes);
 const audio=context.createBuffer(header.channels,frameCount,header.sampleRate);
 const left=audio.getChannelData(0),right=audio.getChannelData(1);
 for(let frame=0;frame<frameCount;frame++){
  const index=frame*4;
  left[frame]=pcm.getInt16(index,true)/32768;
  right[frame]=pcm.getInt16(index+2,true)/32768;
 }
 return audio;
}
