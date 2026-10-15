const {test,expect}=require('@playwright/test');
test('Audio Lab records scheduled notes, tabletop impact and event provenance on mobile',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:4173/experiments/audio-lab/');
  await page.locator('#playtests button').first().click();
  const trace=await page.evaluate(()=>window.__monoidAudioTelemetry());
  expect(trace.schema).toBe(1);
  expect(trace.events.some(e=>e.type==='cue'&&e.kind==='tabletop-slap')).toBe(true);
  expect(trace.events.some(e=>e.type==='cue'&&e.kind==='note'&&e.sourceEventId)).toBe(true);
  expect(trace.events.some(e=>e.type==='cue'&&e.kind==='note'&&e.oscillatorCount>=1)).toBe(true);
  expect(trace.events.some(e=>e.status==='played')).toBe(false);
  await expect(page.locator('#audio-trace-download')).toBeVisible();
  expect(errors).toEqual([]);
});
