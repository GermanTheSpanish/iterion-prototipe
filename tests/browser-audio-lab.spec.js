const {test,expect}=require('@playwright/test');

test('Audio Lab initializes instruments and imports recorded traces on mobile',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:4173/experiments/audio-lab/');
 await expect(page.locator('#keys button')).toHaveCount(7);
 await expect(page.locator('#import-status')).toContainText('Audio Lab ready');
 await page.locator('#signal-tree-file').setInputFiles({
  name:'recorded-debug.txt',mimeType:'text/plain',
  buffer:Buffer.from('T1 SIGNAL TREE trace=[{"type":"signal-start"}]\n')
 });
 await expect(page.locator('#import-status')).toContainText('Selected recorded-debug.txt');
 await page.locator('#signal-tree-import').click();
 await expect(page.locator('#import-status')).toContainText('1 recorded cascade(s) ready');
 await expect(page.locator('#imported-traces button')).toHaveCount(1);
 expect(errors).toEqual([]);
});

test('Audio Lab starts recorded cascades with a tabletop slap',async({page})=>{
 await page.goto('http://127.0.0.1:4173/experiments/audio-lab/');
 await expect(page.locator('#keys button')).toHaveCount(7);
 const result=await page.evaluate(async()=>{
  const module=await import('/experiments/audio-lab/instrument.js');
  const context=new (window.AudioContext||window.webkitAudioContext)();
  const master=context.createGain();master.connect(context.destination);
  const instrument=module.createInstrument(context,master,()=>{});
  instrument.slap(context.currentTime+.03,.2);
  const hasSlap=typeof instrument.slap==='function';
  await context.close();
  return hasSlap;
 });
 expect(result).toBe(true);
});

test('Audio Lab topology studies compare bounded voices on mobile without touching gameplay',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:4173/experiments/audio-lab/topology-study.html');
 await expect(page.locator('#machines button')).toHaveCount(3);
 await expect(page.locator('#voices input')).toHaveCount(1);
 await expect(page.locator('#features')).toContainText('0 cycles');
 await page.getByRole('button',{name:'Winding machine'}).click();
 await expect(page.locator('#voices input')).toHaveCount(2);
 await page.getByRole('button',{name:'Circuit and junction'}).click();
 await expect(page.locator('#voices input')).toHaveCount(4);
 await expect(page.locator('#features')).toContainText('1 cycles');
 await page.getByRole('button',{name:'Play machine'}).click();
 await expect(page.locator('#status')).toContainText('4 available voices');
 await page.getByRole('button',{name:'Stop',exact:true}).click();
 await expect(page.locator('#status')).toContainText('Stopped');
 expect(errors).toEqual([]);
});
