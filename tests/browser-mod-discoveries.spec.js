const {test,expect}=require('@playwright/test');

test('Fresh Player archive reveals KNOT and three Quantum terminals progressively',async({page})=>{
  await page.setViewportSize({width:375,height:667});
  await page.goto('http://127.0.0.1:4173/?boot=1');
  await page.locator('[data-boot-context="fresh"]').click();
  await expect(page.locator('#titleCard')).toBeVisible();
  await page.locator('#titleCard').click();
  const access=page.locator('#modCollectionMenuButton');
  await expect(access).toHaveText('MODS · 9/23');
  await page.evaluate(()=>window.MonoidModCollection.open(document.getElementById('modCollectionMenuButton')));
  const dialog=page.locator('#modCollectionDialog');
  await expect(dialog.locator('.modCollectionCell.isLocked')).toHaveCount(14);
  await expect(dialog.locator('[data-domino="1|5"]')).toHaveClass(/isLocked/);
  await expect(dialog.locator('[data-domino="1|3"]')).toHaveClass(/isLocked/);
  await expect(dialog.locator('[data-domino="2|4"]')).toHaveClass(/isLocked/);
  await expect(dialog.locator('[data-domino="2|5"]')).toHaveClass(/isLocked/);
  await dialog.locator('[data-domino="1|5"]').click();
  await expect(dialog.locator('.modCollectionInfo')).toContainText('Build two closed loops');
  await dialog.locator('[data-domino="2|4"]').click();
  await expect(dialog.locator('.modCollectionInfo')).toContainText('three different Moves');

  const before=await page.evaluate(()=>window.__monoidGame.state().marketModAccess);
  expect(before).toMatchObject({knot:false,quantumLevel:0,availableMods:['bank','corner','double-double','double-echo','long-line','mint','overload','zero-port']});

  await page.evaluate(()=>{
    const P=window.MonoidProfile;
    for(const id of ['quantum-port:1','quantum-port:2','knot'])P.unlockModStep(id);
    window.dispatchEvent(new CustomEvent('monoid:mod-unlocked',{detail:{id:'knot'}}));
  });
  await expect(access).toHaveText('MODS · 12/23');
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
  await expect(access).toHaveText('MODS · 13/23');
  await expect(dialog.locator('[data-domino="2|5"] .collectionModCode')).toHaveText('Q3');
  const next=await page.evaluate(()=>window.IterionGame.createGame(window.IterionEngine,{
    seed:7705,MOD_ACCESS:window.MonoidProfile.modUnlockState()
  }).snapshot().marketModAccess);
  expect(next).toMatchObject({knot:true,quantumLevel:3});\n  expect(next.availableMods).toContain('quantum-port');\n  expect(next.availableMods).not.toContain('foundation');
  const size=await dialog.evaluate(el=>({height:el.clientHeight,scroll:el.scrollHeight}));
  expect(size.scroll).toBeLessThanOrEqual(size.height);
});
