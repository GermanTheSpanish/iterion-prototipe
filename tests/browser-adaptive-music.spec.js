const {test,expect}=require('@playwright/test');
function wav(){
 const frames=22050,sampleRate=44100,channels=2,dataBytes=frames*channels*2;
 const b=Buffer.alloc(44+dataBytes);
 b.write('RIFF',0);b.writeUInt32LE(b.length-8,4);b.write('WAVE',8);
 b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);
 b.writeUInt16LE(channels,22);b.writeUInt32LE(sampleRate,24);
 b.writeUInt32LE(sampleRate*4,28);b.writeUInt16LE(4,32);b.writeUInt16LE(16,34);
 b.write('data',36);b.writeUInt32LE(dataBytes,40);
 return b;
}
test('in-game music is opt-in and starts with locally selected F Drum',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>localStorage.setItem('iterion.entryBypass.v1','true'));
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:4173/');
 await expect(page.locator('#musicSettings')).toHaveCount(1);
 await page.locator('#menuButton').click();
 await page.locator('#menuGroupSystem').click();
 const before=await page.evaluate(()=>window.__monoidMusic.snapshot());
 expect(before.playing).toBe(false);
 await page.locator('#musicFileInput').setInputFiles({name:'Space Drift F Drum.wav',mimeType:'audio/wav',buffer:wav()});
 await expect(page.locator('#musicStatus')).toContainText('F');
 await page.locator('#musicPlay').click();
 await expect(page.locator('#musicStatus')).toContainText('PLAYING');
 const now=await page.evaluate(()=>window.__monoidMusic.snapshot());
 expect(now.playing).toBe(true);expect(now.loaded).toEqual(['F']);
 expect(now.db.F).toBeGreaterThan(-20);
 await page.locator('#musicStop').click();
 expect((await page.evaluate(()=>window.__monoidMusic.snapshot())).playing).toBe(false);
 expect(errors).toEqual([]);
});
test('in-game music scans all six stems without uploading or auto-playing',async({page})=>{
 await page.goto('http://127.0.0.1:4173/');
 await expect(page.locator('#musicFolderInput')).toHaveAttribute('webkitdirectory','');
 const all='ABCDEF'.split('').map(id=>({name:'Space Drift '+id+' '+(id==='F'?'Drum':'stem')+'.wav',mimeType:'audio/wav',buffer:wav()}));
 await page.locator('#musicFileInput').setInputFiles(all);
 await expect(page.locator('#musicStatus')).toContainText('6/6 stems');
 const result=await page.evaluate(()=>window.__monoidMusic.snapshot());
 expect(result.loaded).toEqual(['A','B','C','D','E','F']);
 expect(result.playing).toBe(false);
});
