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
 const errors=[];page.on('pageerror',error=>errors.push(error.stack||error.message));
 await page.goto('http://127.0.0.1:4173/');
 await expect(page.locator('#musicSettings')).toHaveCount(1);
 await page.locator('#menuButton').click();
 await page.locator('#menuGroupSystem').click();
 const before=await page.evaluate(()=>window.__monoidMusic.snapshot());
 expect(before.playing).toBe(false);
 await page.locator('#musicFileInput').setInputFiles({name:'Space Drift F Drum.wav',mimeType:'audio/wav',buffer:wav()});
 await expect(page.locator('#musicStatus')).toContainText('F');
 // No music plays before the first physical placement, even after pressing PLAY.
 await page.locator('#musicPlay').click();
 expect((await page.evaluate(()=>window.__monoidMusic.snapshot())).playing).toBe(false);
 await page.locator('#closeMenu').click();
 const target=await page.evaluate(()=>{
  const game=window.__monoidGame,engine=window.IterionEngine,s=game.state();
  const i=s.hand.findIndex((tile,index)=>tile&&game.candidatesForIndex(index).length);
  const c=game.candidatesForIndex(i)[0],p=engine.pieceFrom(s.hand[i],c.x,c.y,0,c.rr,-1);
  const r=document.querySelector('#board').getBoundingClientRect();
  return {index:i,x:r.left+(p.rect.minx+p.rect.maxx)/2/engine.G*r.width,
   y:r.top+(p.rect.miny+p.rect.maxy)/2/engine.H*r.height+(window.IterionData.DRAG_Y_OFFSET||0)};
 });
 const hand=await page.locator('#hand .tile').nth(target.index).boundingBox();
 await page.mouse.move(hand.x+hand.width/2,hand.y+hand.height/2);
 await page.mouse.down();await page.mouse.move(hand.x-20,hand.y+hand.height/2,{steps:3});
 await page.mouse.move(target.x,target.y,{steps:8});await page.waitForTimeout(150);await page.mouse.up();
 await expect.poll(()=>page.evaluate(()=>window.__monoidGame.state().pieces.length)).toBe(1);
 await expect.poll(()=>page.evaluate(()=>window.__monoidMusic.snapshot().playing)).toBe(true);
 const now=await page.evaluate(()=>window.__monoidMusic.snapshot());
 expect(now.effects.played).toBeGreaterThan(0);
 expect(['cascade','game']).toContain(now.acousticMode);
 expect(now.playing).toBe(true);expect(now.loaded).toEqual(['F']);
 expect(now.db.F).toBeGreaterThan(-20);
 await expect.poll(()=>page.evaluate(()=>window.__monoidCascade.active),{timeout:20000}).toBe(false);
 await expect(page.locator('#menuButton')).toBeEnabled();
 await page.locator('#menuButton').click();
 await expect(page.locator('#gameMenu')).toBeVisible();
 await page.locator('#menuGroupSystem').click();
 await expect.poll(()=>page.evaluate(()=>window.__monoidMusic.snapshot().acousticMode)).toBe('menu');
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

test('Audio Lab sound preset can be imported in-game without changing the run',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>localStorage.setItem('iterion.entryBypass.v1','true'));
 await page.goto('http://127.0.0.1:4173/');
 await page.locator('#menuButton').click();await page.locator('#menuGroupSystem').click();
 const runId=await page.evaluate(()=>window.__monoidGame.state().runId);
 await page.locator('#musicPresetInput').setInputFiles({name:'my-monoid-mix.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({
  schema:'monoid-audio-preset-v1',cascadeDuckDb:22,shopLowpassHz:600,operation:.35
 }))});
 await expect(page.locator('#musicStatus')).toContainText('Preset imported');
 const result=await page.evaluate(()=>window.__monoidMusic.snapshot());
 expect(result.preset.cascadeDuckDb).toBe(22);
 expect(result.preset.shopLowpassHz).toBe(600);
 expect(result.preset.operation).toBe(.35);
 expect(await page.evaluate(()=>window.__monoidGame.state().runId)).toBe(runId);
 await expect(page.locator('#musicAudioLab')).toHaveAttribute('href','./experiments/audio-lab/');
});

function privateAudioFixture(){
 const fragment=wav(),samples=22050;
 const manifest={schema:'monoid-audio-pack-v1',private:true,codec:'aac-lc',sampleRateHz:44100,channels:2,
  segmentSamples:samples,totalSamples:samples*2,segmentCount:2,
  stems:{F:{segments:[{offset:0,bytes:fragment.length},{offset:fragment.length,bytes:fragment.length}]}}};
 const header=Buffer.from(JSON.stringify(manifest)),prefix=Buffer.alloc(12);
 prefix.write('MONOIDP1',0);prefix.writeUInt32LE(header.length,8);
 return Buffer.concat([prefix,header,fragment,fragment]);
}
test('private compressed transport stores one pack and restores F Drum after reload',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>{
  window.__monoidStemStarts=[];
  const start=AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start=function(...args){
   if(this.buffer?.duration>=.45)window.__monoidStemStarts.push(args[0]);
   return start.apply(this,args);
  };
 });
 await page.addInitScript(()=>localStorage.setItem('iterion.entryBypass.v1','true'));
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:4173/');
 await page.locator('#menuButton').click();await page.locator('#menuGroupSystem').click();
 await page.locator('#musicPackInput').setInputFiles({
  name:'private-test.monoidpack',mimeType:'application/octet-stream',buffer:privateAudioFixture()
 });
 await expect(page.locator('#musicStatus')).toContainText('PRIVATE PACK STORED');
 let snapshot=await page.evaluate(()=>window.__monoidMusic.snapshot());
 expect(snapshot.packReady).toBe(true);
 expect(snapshot.loaded).toEqual(['F']);
 expect(snapshot.playing).toBe(false);
 await page.reload();
 await expect.poll(()=>page.evaluate(()=>window.__monoidMusic.snapshot().packReady)).toBe(true);
 snapshot=await page.evaluate(()=>window.__monoidMusic.snapshot());
 expect(snapshot.armed).toBe(true);
 expect(snapshot.loaded).toEqual(['F']);
 // The stored pack really decodes and starts in gameplay: not just a storage assertion.
 const target=await page.evaluate(()=>{
  const game=window.__monoidGame,engine=window.IterionEngine,state=game.state();
  const index=state.hand.findIndex((tile,i)=>tile&&game.candidatesForIndex(i).length);
  const candidate=game.candidatesForIndex(index)[0];
  const piece=engine.pieceFrom(state.hand[index],candidate.x,candidate.y,0,candidate.rr,-1);
  const rect=document.querySelector('#board').getBoundingClientRect();
  return {index,x:rect.left+(piece.rect.minx+piece.rect.maxx)/2/engine.G*rect.width,
   y:rect.top+(piece.rect.miny+piece.rect.maxy)/2/engine.H*rect.height+(window.IterionData.DRAG_Y_OFFSET||0)};
 });
 const hand=await page.locator('#hand .tile').nth(target.index).boundingBox();
 await page.mouse.move(hand.x+hand.width/2,hand.y+hand.height/2);
 await page.mouse.down();await page.mouse.move(hand.x-20,hand.y+hand.height/2,{steps:3});
 await page.mouse.move(target.x,target.y,{steps:8});await page.mouse.up();
 await expect.poll(()=>page.evaluate(()=>window.__monoidGame.state().pieces.length)).toBe(1);
 await expect.poll(()=>page.evaluate(()=>window.__monoidMusic.snapshot().playing)).toBe(true);
 await expect.poll(()=>page.evaluate(()=>window.__monoidStemStarts.length)).toBeGreaterThan(0);
 await page.waitForTimeout(150);
 expect((await page.evaluate(()=>window.__monoidMusic.snapshot())).playing).toBe(true);
 await expect.poll(()=>page.evaluate(()=>window.__monoidCascade.active),{timeout:20000}).toBe(false);
 await page.locator('#menuButton').click();await page.locator('#menuGroupSystem').click();
 await page.locator('#musicRemovePack').click();
 await expect(page.locator('#musicStatus')).toContainText('pack forgotten');
 await page.reload();
 await expect.poll(()=>page.evaluate(()=>window.__monoidMusic.snapshot().packReady)).toBe(false);
 expect((await page.evaluate(()=>window.__monoidMusic.snapshot())).loaded).toEqual([]);
 expect(errors).toEqual([]);
});
