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
