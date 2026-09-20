const {test,expect}=require('@playwright/test');

test('Game Selection opens one-screen 4 × 7 Mod Collection',async({page},testInfo)=>{
  await page.setViewportSize({width:375,height:667});
  await page.goto('http://127.0.0.1:4173/');await page.locator('#titleCard').click();
  const access=page.locator('#modCollectionSelectionButton');await expect(access).toBeVisible();await expect(access).toHaveText('MODS · 14/28');
  await access.click();const dialog=page.locator('#modCollectionDialog');await expect(dialog).toBeVisible();
  await expect(dialog.locator('.modCollectionCell')).toHaveCount(28);await expect(dialog.locator('.modCollectionCell.isUnlocked')).toHaveCount(14);await expect(dialog.locator('.modCollectionCell.isLocked')).toHaveCount(14);
  await expect(dialog.locator('[data-domino="0|0"]')).toHaveAttribute('data-mod-id','zero-port');await expect(dialog.locator('[data-domino="0|0"] .collectionModCode')).toHaveText('ZP');
  await expect(dialog.locator('[data-domino="0|3"]')).toHaveAttribute('data-mod-id','pair');await expect(dialog.locator('[data-domino="0|3"] .collectionModCode')).toHaveText('PR');
  await expect(dialog.locator('[data-domino="1|6"] .collectionModCode')).toHaveText('TW');await expect(dialog.locator('[data-domino="2|4"] .collectionModCode')).toHaveText('SQ');await expect(dialog.locator('[data-domino="2|5"] .collectionModCode')).toHaveText('C6');
  await dialog.locator('[data-domino="0|0"]').click();await expect(dialog.locator('.modCollectionInfo')).toContainText('[0|0] · ZERO PORT');
  await dialog.locator('[data-domino="0|2"]').click();await expect(dialog.locator('.modCollectionInfo')).toContainText('[0|2] · UNDISCOVERED');
  const fit=await dialog.evaluate(el=>({sw:el.scrollWidth,cw:el.clientWidth,sh:el.scrollHeight,ch:el.clientHeight}));expect(fit.sw).toBeLessThanOrEqual(fit.cw);expect(fit.sh).toBeLessThanOrEqual(fit.ch);
  await page.screenshot({path:testInfo.outputPath('mod-collection-375x667.png')});
  await dialog.locator('.modCollectionClose').click();await expect(dialog).toBeHidden();await expect(access).toBeFocused()
});

test('Run Menu uses the same collection without mutating the saved run',async({page})=>{
  await page.setViewportSize({width:430,height:932});await page.addInitScript(()=>localStorage.setItem('iterion.entryBypass.v1','true'));await page.goto('http://127.0.0.1:4173/');
  const before=await page.evaluate(()=>localStorage.getItem('iterion.activeRun.v1'));await page.locator('#menuButton').click();const access=page.locator('#modCollectionMenuButton');await expect(access).toHaveText('MODS · 14/28');await access.click();
  await expect(page.locator('#gameMenu')).toBeHidden();await expect(page.locator('#modCollectionDialog')).toBeVisible();expect(await page.evaluate(()=>localStorage.getItem('iterion.activeRun.v1'))).toBe(before)
});

test('future Mod discovery flips one reserved domino and persists meta progress',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4173/');await page.locator('#titleCard').click();await page.locator('#modCollectionSelectionButton').click();
  const result=await page.evaluate(()=>{window.IterionMods.register({id:'qa-future-mod',displayName:'QA FUTURE MOD',kind:'market-tile-mod',collectionTile:[5,5],collectionCode:'QA',collectionDefaultUnlocked:false,shortDescription:'Collection integration fixture.'});window.MonoidModCollection.render();return window.MonoidModCollection.unlock('qa-future-mod')});
  expect(result).toEqual({ok:true,domino:'5|5'});const tile=page.locator('[data-domino="5|5"]');await expect(tile).toHaveClass(/isUnlocked/);await expect(tile).toHaveClass(/justUnlocked/);await expect(tile.locator('.collectionModCode')).toHaveText('QA');await expect(page.locator('.modCollectionProgress strong')).toHaveText('15/28');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('monoid.modCollection.v1')))).toContain('qa-future-mod')
});
