const{test,expect}=require('@playwright/test');

test('playtest identity persists across continue and run sequence increments only for a new run',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4173/');
  await page.locator('#titleCard').click();await page.locator('#startRun').click();
  const first=await page.evaluate(()=>window.__monoidPlaytest);expect(first.playerId).toMatch(/^P-[0-9A-Z]{7}$/);expect(first.runSequence).toBe(1);expect(first.runId).toBeTruthy();
  await page.waitForTimeout(120);await page.locator('#menuButton').click();await page.locator('#viewrun').click();await expect(page.locator('.runDataText')).toContainText('PLAYTEST TELEMETRY');await expect(page.locator('.runDataText')).toContainText(first.playerId);await expect(page.locator('.runDataText')).toContainText('Run #1');
  await page.reload();await page.locator('#titleCard').click();await expect(page.locator('#continueRun')).toBeVisible();await page.locator('#continueRun').click();
  const continued=await page.evaluate(()=>window.__monoidPlaytest);expect(continued.playerId).toBe(first.playerId);expect(continued.runSequence).toBe(1);expect(continued.runId).toBe(first.runId);expect(continued.sessions).toBeGreaterThanOrEqual(2);
  page.once('dialog',dialog=>dialog.accept());await page.locator('#menuButton').click();await page.locator('#reset').click();await expect.poll(()=>page.evaluate(()=>window.__monoidPlaytest?.runSequence)).toBe(2);
  const second=await page.evaluate(()=>window.__monoidPlaytest);expect(second.playerId).toBe(first.playerId);expect(second.runId).not.toBe(first.runId);expect(second.batchId).toBe(first.batchId);
  const batch=await page.evaluate(()=>window.__monoidPlaytestBatch);expect(batch.batchId).toBe(first.batchId);
  const archived=await page.evaluate(async playerId=>(await window.__monoidPlaytestBatchStore.pending(playerId)).map(r=>({runId:r.runId,status:r.status,debug:r.debugText.includes('MONOID DEBUG')})),first.playerId);
  expect(archived).toContainEqual({runId:first.runId,status:'abandoned',debug:true})
});
