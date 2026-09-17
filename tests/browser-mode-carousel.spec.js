const {test,expect}=require('@playwright/test');

test('mode carousel feels continuous and settles with positional overshoot',async({page})=>{
  await page.setViewportSize({width:375,height:667});
  await page.goto('http://127.0.0.1:4173/');
  await page.locator('#titleCard').click();
  await expect(page.locator('#modeCarouselFrame')).toBeVisible();
  await expect(page.locator('#modeName')).toHaveText('CLASSIC');

  const viewport=await page.locator('#modeCarouselViewport').boundingBox();
  const before=await page.locator('#modeClassic').boundingBox();
  expect(viewport).toBeTruthy();expect(before).toBeTruthy();
  const beforeCenter=before.x+before.width/2;
  const pointerX=viewport.x+viewport.width/2,pointerY=viewport.y+viewport.height/2;
  await page.mouse.move(pointerX,pointerY);await page.mouse.down();await page.mouse.move(pointerX+12,pointerY);
  const during=await page.locator('#modeClassic').boundingBox();expect(during).toBeTruthy();
  const magneticShift=during.x+during.width/2-beforeCenter;
  expect(magneticShift).toBeGreaterThan(0);expect(magneticShift).toBeLessThan(12);
  await page.mouse.up();
  const settle=await page.evaluate(()=>{const viewport=document.querySelector('#modeCarouselViewport'),slide=document.querySelector('#modeClassic'),tile=document.querySelector('#modeClassic .modeTile');return{settling:viewport.classList.contains('isSettling'),timing:getComputedStyle(slide).transitionTimingFunction,tileAnimation:getComputedStyle(tile).animationName}});
  expect(settle.settling).toBe(true);expect(settle.timing).toContain('cubic-bezier(0.3, 0, 0.18, 1.13)');expect(settle.tileAnimation).toBe('none');
  await expect(page.locator('#modeName')).toHaveText('CLASSIC');

  // Two places before the loop boundary, Classic exists offscreen already and
  // moves into the clipped frame during the drag rather than appearing on release.
  await page.evaluate(()=>window.__monoidModes.select(6));
  await page.waitForTimeout(300);
  const frame=await page.locator('#modeCarouselFrame').boundingBox();
  const loopViewport=await page.locator('#modeCarouselViewport').boundingBox();
  const classicBefore=await page.locator('#modeClassic').boundingBox();
  expect(frame).toBeTruthy();expect(loopViewport).toBeTruthy();expect(classicBefore).toBeTruthy();
  expect(classicBefore.x).toBeGreaterThanOrEqual(frame.x+frame.width);
  const sx=loopViewport.x+loopViewport.width*.72,sy=loopViewport.y+loopViewport.height*.5;
  await page.mouse.move(sx,sy);await page.mouse.down();await page.mouse.move(sx-82,sy);
  const classicDuring=await page.locator('#modeClassic').boundingBox();expect(classicDuring).toBeTruthy();
  expect(classicDuring.x).toBeLessThan(frame.x+frame.width);expect(classicDuring.x+classicDuring.width).toBeGreaterThan(frame.x+frame.width);
  await page.mouse.up();await expect(page.locator('#modeName')).toHaveText('LOCKED');

  await page.evaluate(()=>window.__monoidModes.select(7));
  const lastViewport=await page.locator('#modeCarouselViewport').boundingBox();expect(lastViewport).toBeTruthy();
  await page.mouse.move(lastViewport.x+lastViewport.width*.70,lastViewport.y+lastViewport.height*.5);await page.mouse.down();await page.mouse.move(lastViewport.x+lastViewport.width*.20,lastViewport.y+lastViewport.height*.5);await page.mouse.up();
  await expect(page.locator('#modeName')).toHaveText('CLASSIC');
  await expect(page.locator('#modeDescription')).toHaveText('The original machine');
});
