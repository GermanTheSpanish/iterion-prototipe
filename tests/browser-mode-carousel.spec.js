const {test,expect}=require('@playwright/test');

function transformX(transform){
  const match=String(transform||'').match(/\+\s*(-?\d+(?:\.\d+)?)px/);
  return match?Number(match[1]):NaN
}

test('mode carousel uses positional overshoot and brings wrapped tiles in from the clipped edge',async({page})=>{
  await page.setViewportSize({width:375,height:667});
  await page.goto('http://127.0.0.1:4173/');
  await page.locator('#titleCard').click();
  await expect(page.locator('#modeCarouselFrame')).toBeVisible();
  await expect(page.locator('#modeName')).toHaveText('CLASSIC');

  const viewport=await page.locator('#modeCarouselViewport').boundingBox();
  expect(viewport).toBeTruthy();
  const pointerX=viewport.x+viewport.width/2,pointerY=viewport.y+viewport.height/2;

  // Release inside the centre's magnetic field. The tile should pass the centre
  // in the opposite direction, then settle back without any scale/click animation.
  await page.mouse.move(pointerX,pointerY);
  await page.mouse.down();
  await page.mouse.move(pointerX+20,pointerY);
  const draggedX=transformX(await page.locator('#modeClassic').getAttribute('style'));
  expect(draggedX).toBeGreaterThan(0);expect(draggedX).toBeLessThan(20);
  await page.mouse.up();
  await page.waitForTimeout(35);
  const overshootX=transformX(await page.locator('#modeClassic').getAttribute('style'));
  expect(overshootX).toBeLessThan(0);
  expect(await page.locator('#modeClassic .modeTile').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
  await page.waitForTimeout(230);
  const landingX=transformX(await page.locator('#modeClassic').getAttribute('style'));
  expect(Math.abs(landingX)).toBeLessThan(.01);
  await expect(page.locator('#modeName')).toHaveText('CLASSIC');

  // One position before the final slot, Classic is initially offscreen. As the
  // track is dragged toward the final slot it must enter through the clipped
  // right edge before the release, rather than appearing after selection changes.
  await page.evaluate(()=>window.__monoidModes.select(6));
  await page.waitForTimeout(260);
  expect(await page.locator('#modeClassic').evaluate(el=>getComputedStyle(el).visibility)).toBe('hidden');
  await page.mouse.move(pointerX,pointerY);await page.mouse.down();await page.mouse.move(pointerX-60,pointerY);
  expect(await page.locator('#modeClassic').evaluate(el=>getComputedStyle(el).visibility)).toBe('visible');
  const entering=await page.locator('#modeClassic').boundingBox();
  expect(entering).toBeTruthy();
  expect(entering.x).toBeLessThan(viewport.x+viewport.width);
  expect(entering.x+entering.width).toBeGreaterThan(viewport.x+viewport.width);
  await page.mouse.up();
  await expect(page.locator('#modeName')).toHaveText('LOCKED');

  // The following swipe crosses the circular boundary and returns to Classic.
  await page.waitForTimeout(360);
  await page.mouse.move(pointerX,pointerY);await page.mouse.down();await page.mouse.move(pointerX-60,pointerY);await page.mouse.up();
  await expect(page.locator('#modeName')).toHaveText('CLASSIC');
  await expect(page.locator('#modeDescription')).toHaveText('The original machine');
});
