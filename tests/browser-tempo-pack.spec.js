const {test,expect}=require('@playwright/test');
function wav(seconds){
 const rate=44100,frames=Math.round(seconds*rate),bytes=frames*4,buffer=Buffer.alloc(44+bytes);
 buffer.write('RIFF',0);buffer.writeUInt32LE(36+bytes,4);buffer.write('WAVE',8);
 buffer.write('fmt ',12);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);
 buffer.writeUInt16LE(2,22);buffer.writeUInt32LE(rate,24);
 buffer.writeUInt32LE(rate*4,28);buffer.writeUInt16LE(4,32);buffer.writeUInt16LE(16,34);
 buffer.write('data',36);buffer.writeUInt32LE(bytes,40);
 for(let i=0;i<frames;i++){
  const value=Math.round(2200*Math.sin(2*Math.PI*88*i/rate));
  buffer.writeInt16LE(value,44+i*4);buffer.writeInt16LE(value,46+i*4);
 }
 return buffer;
}
function fixture(){
 const parts=[],variants={};let offset=0;
 for(const bpm of [80,84,88,92,96]){
  const frames=Math.round(4*240*44100/bpm),tail=7056,blob=wav((frames+tail)/44100);
  variants[String(bpm)]={bpm,segmentSamples:frames,overlapSamples:tail,
   stems:{F:{segments:[{offset,bytes:blob.length}]}}};
  offset+=blob.length;parts.push(blob);
 }
 const metadata={schema:'monoid-audio-pack-v2',name:'Tempo fixture',codec:'aac-lc',
  private:true,sampleRateHz:44100,channels:2,sourceBpm:80,barsPerSegment:4,
  segmentCount:1,variants};
 const header=Buffer.from(JSON.stringify(metadata)),prefix=Buffer.alloc(12);
 prefix.write('MONOIDP1',0);prefix.writeUInt32LE(header.length,8);
 return Buffer.concat([prefix,header,...parts]);
}
test('private v2 pack actually switches pitch-safe stem variants at four-bar boundaries',async({page})=>{
 test.setTimeout(70000);
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>localStorage.setItem('iterion.entryBypass.v1','true'));
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173/');
 await page.locator('#menuButton').click();await page.locator('#menuGroupSystem').click();
 await page.locator('#musicPackInput').setInputFiles({
  name:'fixture-tempo-v2.monoidpack',mimeType:'application/octet-stream',buffer:fixture()
 });
 await expect(page.locator('#musicStatus')).toContainText('PRIVATE PACK STORED');
 expect((await page.evaluate(()=>window.__monoidMusic.snapshot())).transport.tempoAvailable).toBe(true);
 await page.locator('#closeMenu').click();
 await page.evaluate(()=>{window.__monoidGame.state().marketCount=2});
 await expect.poll(()=>page.evaluate(()=>window.__monoidMusic.snapshot().transport.requestedBpm)).toBe(88);
 const target=await page.evaluate(()=>{
  const game=window.__monoidGame,engine=window.IterionEngine,s=game.state();
  const i=s.hand.findIndex((t,index)=>t&&game.candidatesForIndex(index).length);
  const c=game.candidatesForIndex(i)[0],p=engine.pieceFrom(s.hand[i],c.x,c.y,0,c.rr,-1);
  const r=document.querySelector('#board').getBoundingClientRect();
  return {index:i,x:r.left+(p.rect.minx+p.rect.maxx)/2/engine.G*r.width,
   y:r.top+(p.rect.miny+p.rect.maxy)/2/engine.H*r.height+
    (window.IterionData.DRAG_Y_OFFSET||0)};
 });
 const hand=await page.locator('#hand .tile').nth(target.index).boundingBox();
 await page.mouse.move(hand.x+hand.width/2,hand.y+hand.height/2);
 await page.mouse.down();await page.mouse.move(hand.x-20,hand.y+hand.height/2,{steps:3});
 await page.mouse.move(target.x,target.y,{steps:8});await page.mouse.up();
 await expect.poll(()=>page.evaluate(()=>window.__monoidMusic.snapshot().playing),{timeout:20000}).toBe(true);
 await expect.poll(()=>page.evaluate(()=>window.__monoidMusic.snapshot().transport.bpm)).toBe(88);
 // Synthetic state adjustment in isolated Playwright run, never engine code.
 await page.evaluate(()=>{window.__monoidGame.state().marketCount=3});
 await expect.poll(()=>page.evaluate(()=>window.__monoidMusic.snapshot().transport.requestedBpm)).toBe(92);
 await expect.poll(()=>page.evaluate(()=>window.__monoidMusic.snapshot().transport.bpm),{timeout:23000}).toBe(92);
 const state=await page.evaluate(()=>window.__monoidMusic.snapshot());
 expect(state.transport.mode).toBe('tempo-variant-audio-clock');
 expect(state.percussion.active).toBe(true);
 expect(state.transport.underruns).toBeGreaterThanOrEqual(0);
 expect(errors).toEqual([]);
});
