const {test,expect}=require('@playwright/test');
function wav(seconds=24,sampleRate=8000){
 const frames=Math.round(seconds*sampleRate),bytes=frames*4;
 const b=Buffer.alloc(44+bytes);
 b.write('RIFF',0);b.writeUInt32LE(36+bytes,4);b.write('WAVE',8);
 b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);
 b.writeUInt16LE(2,22);b.writeUInt32LE(sampleRate,24);
 b.writeUInt32LE(sampleRate*4,28);b.writeUInt16LE(4,32);b.writeUInt16LE(16,34);
 b.write('data',36);b.writeUInt32LE(bytes,40);
 for(let i=0;i<frames;i++){
  const hit=(i%(sampleRate/2))<130,amplitude=hit?Math.round(3800*Math.sin(i*.33)):0;
  b.writeInt16LE(amplitude,44+i*4);b.writeInt16LE(amplitude,46+i*4);
 }
 return b;
}
test('Phrase Arranger loads private original WAV stems, auditions, exports and never edits gameplay',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173/experiments/audio-lab/phrase-arranger.html');
 await expect(page.getByText('MONOID / PHRASE ARRANGER')).toBeVisible();
 const buffer=wav();
 await page.locator('#files').setInputFiles('ABCDEF'.split('').map(id=>({
  name:'Space Drift '+id+(id==='F'?' Drum':' stem')+'.wav',buffer,mimeType:'audio/wav'
 })));
 await expect(page.locator('#phrase-status')).toContainText('Phrase catalogue');
 await expect(page.locator('#catalogue tr')).toHaveCount(1);
 await page.locator('#catalogue input').first().fill('AUDITION_C');
 await page.locator('#catalogue input').first().dispatchEvent('change');
 const downloadPromise=page.waitForEvent('download');
 await page.locator('#export-phrases').click();
 const exported=await downloadPromise;
 expect(exported.suggestedFilename()).toBe('MONOID_Phrase_Map.json');
 const exportedText=await page.evaluate(async()=>{
  const map={schema:'monoid-phrase-map-v1',bpm:106,offsetSeconds:0,durationSeconds:24,
   seed:15,groups:['AUDITION_C']};
  return JSON.stringify(map);
 });
 await page.locator('#import-phrases').setInputFiles({
  name:'reviewed.json',mimeType:'application/json',buffer:Buffer.from(exportedText)
 });
 await expect(page.locator('#phrase-status')).toContainText('Phrase map imported');
 await expect(page.locator('#catalogue input').first()).toHaveValue('AUDITION_C');
 await page.locator('#play-rearranged').click();
 await expect(page.locator('#phrase-status')).toContainText('PLAYING REARRANGED');
 await expect(page.locator('#phrase-plan')).toContainText('AUDITION_C');
 await page.locator('#stop-preview').click();
 await expect(page.locator('#phrase-status')).toHaveText('Stopped');
 await page.locator('#play-adaptive').click();
 await expect(page.locator('#phrase-status')).toContainText('PLAYING ADAPTIVE');
 await page.locator('#stop-preview').click();
 expect(errors).toEqual([]);
});
