const {test,expect}=require('@playwright/test');

test('mode carousel has magnetic centre snap, mini bounce and circular wrap',async({page})=>{
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
  const snap=await page.evaluate(()=>{const viewport=document.querySelector('#modeCarouselViewport'),tile=document.querySelector('#modeClassic .modeTile');return{snapping:viewport.classList.contains('isSnapping'),animation:getComputedStyle(tile).animationName}});
  expect(snap.snapping).toBe(true);expect(snap.animation).toContain('modeCenterBounce');
  await expect(page.locator('#modeName')).toHaveText('CLASSIC');

  await page.evaluate(()=>window.__monoidModes.select(7));
  await expect(page.locator('#modeName')).toHaveText('LOCKED');
  const lastViewport=await page.locator('#modeCarouselViewport').boundingBox();expect(lastViewport).toBeTruthy();
  await page.mouse.move(lastViewport.x+lastViewport.width*.70,lastViewport.y+lastViewport.height*.5);await page.mouse.down();await page.mouse.move(lastViewport.x+lastViewport.width*.20,lastViewport.y+lastViewport.height*.5);await page.mouse.up();
  await expect(page.locator('#modeName')).toHaveText('CLASSIC');
  await expect(page.locator('#modeDescription')).toHaveText('The original machine');
});
