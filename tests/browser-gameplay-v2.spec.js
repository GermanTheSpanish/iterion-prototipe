const { test, expect } = require('@playwright/test');

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('iterion.entryBypass.v1','true'));
});

test('Gameplay Exploration V2 gives the board full width and keeps hand dominoes physical',async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('http://127.0.0.1:4173/');

  const menu=page.locator('#menuButton');
  await expect(menu).toHaveText('MONOID');
  await expect(menu).toHaveAttribute('aria-label','Open game menu');

  const board=page.locator('#board');
  const boardBox=await board.boundingBox();
  expect(boardBox.width).toBeGreaterThan(340);
  expect(boardBox.width/boardBox.height).toBeCloseTo(0.75,2);

  const hand=page.locator('#hand');
  expect(await hand.evaluate(el=>getComputedStyle(el).flexDirection)).toBe('row');
  const dominoes=hand.locator('.domino');
  await expect(dominoes).toHaveCount(5);
  for(const box of await dominoes.evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return{w:r.width,h:r.height}}))){
    expect(box.h/box.w).toBeCloseTo(2,1);
  }

  const header=await page.locator('.handHeader .label').boundingBox(),handBox=await hand.boundingBox();expect(Math.abs((header.x+header.width/2)-(handBox.x+handBox.width/2))).toBeLessThan(2);
  const first=await hand.locator('.handSlot').first().boundingBox();
  const last=await hand.locator('.handSlot').last().boundingBox();
  expect(last.x).toBeGreaterThan(first.x);
  expect(Math.abs(last.y-first.y)).toBeLessThan(2);

  await expect(page.locator('#moveTool')).toContainText('7 MOVES');
  await expect(page.locator('#shopButton')).toContainText('SHOP');
  await menu.click();
  await expect(page.locator('#gameMenu')).toBeVisible();
  await expect(page.locator('#menuHelpButton')).toBeVisible();await expect(page.locator('#menuHelpButton')).toHaveText('Rulebook');

  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('gameplay-v2-390x844.png'),fullPage:true});
});

test('Gameplay Exploration V2 remains one-screen on the short mobile fixture',async({page})=>{
  await page.setViewportSize({width:375,height:667});
  await page.goto('http://127.0.0.1:4173/');
  const boardBox=await page.locator('#board').boundingBox();
  expect(boardBox.width).toBeGreaterThan(300);
  expect(boardBox.height).toBeLessThanOrEqual(430);
  expect(await page.evaluate(()=>({
    bodyH:document.body.scrollHeight,
    viewportH:window.innerHeight,
    htmlW:document.documentElement.scrollWidth,
    viewportW:window.innerWidth
  }))).toEqual(expect.objectContaining({bodyH:667,viewportH:667,htmlW:375,viewportW:375}));
  const ratio=await page.locator('#hand .domino').first().evaluate(el=>{const r=el.getBoundingClientRect();return r.height/r.width});
  expect(ratio).toBeCloseTo(2,1);
});
