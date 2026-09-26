const {test,expect}=require('@playwright/test');

test('Game Selection opens one-screen 4 × 7 Mod Collection',async({page},testInfo)=>{
  await page.setViewportSize({width:375,height:667});
  await page.goto('http://127.0.0.1:4173/');await page.locator('#titleCard').click();
  const access=page.locator('#modCollectionSelectionButton');await expect(access).toBeVisible();await expect(access).toHaveText('MODS · 28/28');
  await access.click();const dialog=page.locator('#modCollectionDialog');await expect(dialog).toBeVisible();
  await expect(dialog.locator('.modCollectionCell')).toHaveCount(28);await expect(dialog.locator('.modCollectionCell.isUnlocked')).toHaveCount(28);await expect(dialog.locator('.modCollectionCell.isLocked')).toHaveCount(0);
  await expect(dialog.locator('[data-domino="0|0"]')).toHaveAttribute('data-mod-id','zero-port');await expect(dialog.locator('[data-domino="0|2"] .collectionModCode')).toHaveText('FD');await expect(dialog.locator('[data-domino="0|0"] .collectionModCode')).toHaveText('ZP');
  await expect(dialog.locator('[data-domino="0|3"]')).toHaveAttribute('data-mod-id','pair');await expect(dialog.locator('[data-domino="0|3"] .collectionModCode')).toHaveText('PR');
  await expect(dialog.locator('[data-domino="0|4"] .collectionModCode')).toHaveText('BR');await expect(dialog.locator('[data-domino="0|5"] .collectionModCode')).toHaveText('GT');
  await expect(dialog.locator('[data-domino="1|3"] .collectionModCode')).toHaveText('FN');await expect(dialog.locator('[data-domino="1|4"] .collectionModCode')).toHaveText('BO');await expect(dialog.locator('[data-domino="1|5"] .collectionModCode')).toHaveText('KN');await expect(dialog.locator('[data-domino="1|6"] .collectionModCode')).toHaveText('TW');
  await expect(dialog.locator('[data-domino="2|4"] .collectionModCode')).toHaveText('DI');await expect(dialog.locator('[data-domino="2|5"] .collectionModCode')).toHaveText('RT');await expect(dialog.locator('[data-domino="2|6"] .collectionModCode')).toHaveText('MR');
  await expect(dialog.locator('[data-domino="3|4"] .collectionModCode')).toHaveText('CW');await expect(dialog.locator('[data-domino="3|5"] .collectionModCode')).toHaveText('SP');await expect(dialog.locator('[data-domino="3|6"] .collectionModCode')).toHaveText('MG');
  await expect(dialog.locator('[data-domino="4|5"] .collectionModCode')).toHaveText('HG');await expect(dialog.locator('[data-domino="4|6"] .collectionModCode')).toHaveText('BK');await expect(dialog.locator('[data-domino="5|5"] .collectionModCode')).toHaveText('TL');await expect(dialog.locator('[data-domino="5|6"] .collectionModCode')).toHaveText('MT');
  await dialog.locator('[data-domino="0|0"]').click();await expect(dialog.locator('.modCollectionInfo')).toContainText('[0|0] · ZERO PORT');
  await dialog.locator('[data-domino="0|2"]').click();await expect(dialog.locator('.modCollectionInfo')).toContainText('[0|2] · FOUNDATION');
  const fit=await dialog.evaluate(el=>({sw:el.scrollWidth,cw:el.clientWidth,sh:el.scrollHeight,ch:el.clientHeight}));expect(fit.sw).toBeLessThanOrEqual(fit.cw);expect(fit.sh).toBeLessThanOrEqual(fit.ch);
  await page.screenshot({path:testInfo.outputPath('mod-collection-375x667.png')});
  await dialog.locator('.modCollectionClose').click();await expect(dialog).toBeHidden();await expect(access).toBeFocused()
});

test('Run Menu uses the same collection without mutating the saved run',async({page})=>{
  await page.setViewportSize({width:430,height:932});await page.addInitScript(()=>localStorage.setItem('iterion.entryBypass.v1','true'));await page.goto('http://127.0.0.1:4173/');
  const before=await page.evaluate(()=>localStorage.getItem('iterion.activeRun.v1'));await page.locator('#menuButton').click();const access=page.locator('#modCollectionMenuButton');await expect(access).toHaveText('MODS · 28/28');await access.click();
  await expect(page.locator('#gameMenu')).toBeHidden();await expect(page.locator('#modCollectionDialog')).toBeVisible();expect(await page.evaluate(()=>localStorage.getItem('iterion.activeRun.v1'))).toBe(before)
});

test('full 28/28 catalogue has no reserved dominoes',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4173/');await page.locator('#titleCard').click();await page.locator('#modCollectionSelectionButton').click();
  const dialog=page.locator('#modCollectionDialog');await expect(dialog.locator('.modCollectionCell')).toHaveCount(28);await expect(dialog.locator('.modCollectionCell[data-mod-id]')).toHaveCount(28);await expect(dialog.locator('.modCollectionCell.isLocked')).toHaveCount(0);await expect(dialog.locator('.modCollectionProgress strong')).toHaveText('28/28')
});
