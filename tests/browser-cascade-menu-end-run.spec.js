const{test,expect}=require('@playwright/test');

test('full cascades are default; Fast Forward is an opt-in run-scoped preference',async({page})=>{
  await page.setViewportSize({width:375,height:667});
  await page.goto('http://127.0.0.1:4173/');
  await page.locator('#titleCard').click();await page.locator('#startRun').click();
  await expect(page.locator('#board')).toBeVisible();
  const runId=await page.evaluate(()=>window.__monoidGame.state().runId);
  expect(await page.evaluate(()=>window.__monoidCascade.mode)).toBe('full');
  await page.locator('#menuButton').click();
  await expect(page.locator('#gameSelectionButton')).toHaveText('End Run');
  await expect(page.locator('#gameSelectionButton')).toBeVisible();
  await expect(page.locator('#cascadePlaybackSetting')).toBeHidden();
  await page.locator('#menuGroupSystem').click();
  await expect(page.locator('#cascadePlaybackSetting')).toBeVisible();
  await expect(page.locator('[data-cascade-playback="full"]')).toHaveAttribute('aria-pressed','true');
  await page.locator('[data-cascade-playback="fast"]').click();
  await expect(page.locator('[data-cascade-playback="fast"]')).toHaveAttribute('aria-pressed','true');
  expect(await page.evaluate(()=>window.__monoidCascade.mode)).toBe('fast');
  await page.locator('#closeMenu').click();
  await page.reload();await page.locator('#titleCard').click();
  await expect(page.locator('#continueRun')).toBeVisible();
  await page.locator('#continueRun').click();
  expect(await page.evaluate(()=>window.__monoidGame.state().runId)).toBe(runId);
  expect(await page.evaluate(()=>window.__monoidCascade.mode)).toBe('fast');
  await page.locator('#menuButton').click();await page.locator('#menuGroupSystem').click();
  await page.locator('[data-cascade-playback="full"]').click();
  expect(await page.evaluate(()=>window.__monoidCascade.mode)).toBe('full');
  await expect(page.locator('#cascadePlaybackHelp')).toContainText('full score recap');
  await page.locator('#closeMenu').click();
  expect(await page.evaluate(()=>window.__monoidCascade.offerShown)).toBe(false);
  expect(await page.locator('#cascadeFastForwardOffer').isVisible()).toBe(false)
});

test('End Run confirms, archives telemetry, clears Continue Run and returns to mode selection',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('http://127.0.0.1:4173/');
  await page.locator('#titleCard').click();await page.locator('#startRun').click();
  const first=await page.evaluate(()=>window.__monoidPlaytest);
  await page.locator('#menuButton').click();
  page.once('dialog',dialog=>dialog.dismiss());
  await page.locator('#gameSelectionButton').click();
  await expect(page.locator('#board')).toBeVisible();
  expect(await page.evaluate(()=>window.__monoidGame.state().runId)).toBe(first.runId);
  await expect(page.locator('#gameMenu')).toBeVisible();
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#gameSelectionButton').click();
  await expect(page.locator('#gameSelection')).toBeVisible();
  await expect(page.locator('#continueRun')).toBeHidden();
  expect(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.includes('iterion.activeRun.v1')&&localStorage.getItem(k)))).toEqual([]);
  const archived=await page.evaluate(async playerId=>{
    const rows=await window.__monoidPlaytestBatchStore.pending(playerId);
    return rows.map(x=>({runId:x.runId,status:x.status,statusReason:x.statusReason,debug:x.debugText.includes('MONOID DEBUG')}));
  },first.playerId);
  expect(archived).toContainEqual({runId:first.runId,status:'abandoned',statusReason:'end-run',debug:true});
  await page.locator('#startRun').click();
  await expect(page.locator('#board')).toBeVisible();
  expect(await page.evaluate(()=>window.__monoidGame.state().runId)).not.toBe(first.runId);
  expect(await page.evaluate(()=>window.__monoidCascade.mode)).toBe('full')
});
