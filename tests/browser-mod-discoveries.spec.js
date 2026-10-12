const {test,expect}=require('@playwright/test');

test('Fresh Player archive reveals KNOT and three Quantum terminals progressively',async({page})=>{
  await page.setViewportSize({width:375,height:667});
  await page.addInitScript(()=>{
    localStorage.setItem('monoid.profileContext.v1','fresh');
    localStorage.setItem('iterion.entryBypass.v1','true');
  });
  await page.goto('http://127.0.0.1:4173/');
  await page.locator('#titleCard').click();
  const access=page.locator('#modCollectionSelectionButton');
  await expect(access).toHaveText('MODS · 19/23');
  await access.click();
  const dialog=page.locator('#modCollectionDialog');
  await expect(dialog.locator('.modCollectionCell.isLocked')).toHaveCount(4);
  await expect(dialog.locator('[data-domino="1|5"]')).toHaveClass(/isLocked/);
  await expect(dialog.locator('[data-domino="1|3"]')).toHaveClass(/isLocked/);
  await expect(dialog.locator('[data-domino="2|4"]')).toHaveClass(/isLocked/);
  await expect(dialog.locator('[data-domino="2|5"]')).toHaveClass(/isLocked/);
  await dialog.locator('[data-domino="1|5"]').click();
  await expect(dialog.locator('.modCollectionInfo')).toContainText('Build two closed loops');
  await dialog.locator('[data-domino="2|4"]').click();
  await expect(dialog.locator('.modCollectionInfo')).toContainText('three different Moves');

  const before=await page.evaluate(()=>window.__monoidGame.state().marketModAccess);
  expect(before).toEqual({knot:false,quantumLevel:0});

  await page.evaluate(()=>{
    const P=window.MonoidProfile;
    for(const id of ['quantum-port:1','quantum-port:2','knot'])P.unlockModStep(id);
    window.dispatchEvent(new CustomEvent('monoid:mod-unlocked',{detail:{id:'knot'}}));
  });
  await expect(access).toHaveText('MODS · 22/23');
  await expect(dialog.locator('[data-domino="1|5"]')).toHaveClass(/isUnlocked/);
  await expect(dialog.locator('[data-domino="1|3"] .collectionModCode')).toHaveText('Q1');
  await expect(dialog.locator('[data-domino="2|4"] .collectionModCode')).toHaveText('Q2');
  await expect(dialog.locator('[data-domino="2|5"]')).toHaveClass(/isLocked/);
  const current=await page.evaluate(()=>window.__monoidGame.state().marketModAccess);
  expect(current).toEqual(before); // New discoveries must not rewrite an existing run.

  await page.evaluate(()=>{
    window.MonoidProfile.unlockModStep('quantum-port:3');
    window.dispatchEvent(new CustomEvent('monoid:mod-unlocked',{detail:{id:'quantum-port:3'}}));
  });
  await expect(access).toHaveText('MODS · 23/23');
  await expect(dialog.locator('[data-domino="2|5"] .collectionModCode')).toHaveText('Q3');
  const next=await page.evaluate(()=>window.IterionGame.createGame(window.IterionEngine,{
    seed:7705,MOD_ACCESS:window.MonoidProfile.modUnlockState()
  }).snapshot().marketModAccess);
  expect(next).toEqual({knot:true,quantumLevel:3});
  const size=await dialog.evaluate(el=>({height:el.clientHeight,scroll:el.scrollHeight}));
  expect(size.scroll).toBeLessThanOrEqual(size.height);
});
