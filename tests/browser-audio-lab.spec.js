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

test('Audio Lab extracts SIGNAL TREE traces from a debug larger than 2 MB',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:4173/experiments/audio-lab/');
 await expect(page.locator('#keys button')).toHaveCount(7);
 const trace='T31 SIGNAL TREE trace=[{"type":"op","value":3}]\n';
 const debug='===== RUN 1/1 · ACTIVE · Run #109 · B-TEST =====\nMode: CLASSIC\n'
  +'irrelevant history\n'.repeat(140000)+'\n'+trace;
 await page.locator('#signal-tree-file').setInputFiles({
  name:'large-playtest.txt',mimeType:'text/plain',buffer:Buffer.from(debug)
 });
 await page.locator('#signal-tree-import').click();
 await expect(page.locator('#import-status')).toContainText('1 recorded cascade(s) ready');
 await expect(page.locator('#imported-traces button')).toHaveCount(1);
 await expect(page.locator('#imported-traces button')).toContainText('Run #109 · CLASSIC');
 expect(errors).toEqual([]);
});
