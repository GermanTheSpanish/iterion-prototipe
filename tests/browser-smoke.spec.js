const { test, expect } = require('@playwright/test');

test('ITERION browser smoke', async ({ page }) => {
  const jsErrors=[];
  page.on('pageerror',error=>jsErrors.push(`pageerror: ${error.message}`));
  page.on('console',message=>{if(message.type()==='error')jsErrors.push(`console: ${message.text()}`)});

  await page.goto('http://127.0.0.1:4173/',{waitUntil:'load'});

  await expect(page.locator('#board')).toBeVisible();
  await expect(page.locator('#hand')).toBeVisible();
  await expect(page.locator('#hand .handSlot')).toHaveCount(5);
  expect(await page.locator('#hand .tile').count()).toBeGreaterThan(0);

  const firstRunId=await page.evaluate(()=>JSON.parse(localStorage.getItem('iterion.latestRun.v9')||'null')?.runId||null);
  expect(firstRunId).toBeTruthy();
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#reset').click();
  await page.waitForFunction(previous=>{
    const saved=JSON.parse(localStorage.getItem('iterion.latestRun.v9')||'null');
    return !!saved?.runId&&saved.runId!==previous;
  },firstRunId);

  await page.locator('#shopButton').click();
  await expect(page.locator('#overlay')).toHaveClass(/show/);
  await expect(page.locator('#overlayTitle')).toHaveText('SHOP');
  await expect(page.locator('#overlayPrimary')).toHaveText('CLOSE SHOP');
  await page.locator('#overlayPrimary').click();
  await expect(page.locator('#overlay')).not.toHaveClass(/show/);

  await page.locator('#viewrun').click();
  await expect(page.locator('#runlog')).toHaveClass(/show/);
  await page.locator('#runlog button',{hasText:'CLOSE'}).click();
  await expect(page.locator('#runlog')).not.toHaveClass(/show/);

  await page.locator('#helpButton').click();
  await expect(page.locator('#overlay')).toHaveClass(/show/);
  await expect(page.locator('#overlayTitle')).toHaveText('HOW TO PLAY');
  await expect(page.locator('#overlayPrimary')).toHaveText('CLOSE');
  await page.locator('#overlayPrimary').click();
  await expect(page.locator('#overlay')).not.toHaveClass(/show/);

  expect(jsErrors,jsErrors.join('\n')).toEqual([]);
});
