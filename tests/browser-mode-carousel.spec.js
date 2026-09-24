const {test,expect}=require('@playwright/test');

function intersects(a,b){return a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y}

test('mode carousel keeps a continuous strip and weights its physical settle by release distance',async({page})=>{
  await page.setViewportSize({width:375,height:667});
  await page.goto('http://127.0.0.1:4173/');
  await page.locator('#titleCard').click();
  await expect(page.locator('#modeCarouselFrame')).toBeVisible();
  await expect(page.locator('#modeName')).toHaveText('CLASSIC');
  await expect(page.locator('#modeDescription')).toHaveText('Classic → Endless → Infinite');

  const viewport=await page.locator('#modeCarouselViewport').boundingBox();
  const before=await page.locator('#modeClassic').boundingBox();
  expect(viewport).toBeTruthy();expect(before).toBeTruthy();
  const viewportCenter=viewport.x+viewport.width/2,beforeCenter=before.x+before.width/2;
  const pointerY=viewport.y+viewport.height/2;

  await page.mouse.move(viewportCenter,pointerY);await page.mouse.down();await page.mouse.move(viewportCenter+12,pointerY);
  const during=await page.locator('#modeClassic').boundingBox();expect(during).toBeTruthy();
  const magneticShift=during.x+during.width/2-beforeCenter;
  expect(magneticShift).toBeGreaterThan(0);expect(magneticShift).toBeLessThan(12);
  const closeProfile=await page.evaluate(x=>window.MonoidModeCarousel.settleProfile(x,0),magneticShift);
  expect(closeProfile.overshoot).toBeLessThan(1);
  await page.mouse.up();
  await expect(page.locator('#modeCarouselViewport')).not.toHaveClass(/isPulling|isLanding/,{timeout:800});
  await expect(page.locator('#modeName')).toHaveText('CLASSIC');

  // The first neighbour is now a locked future mode. Its physical settle remains
  // unchanged even though Classic is the only playable mode.
  await page.mouse.move(viewportCenter,pointerY);await page.mouse.down();await page.mouse.move(viewportCenter-34,pointerY);await page.mouse.up();
  await expect(page.locator('#modeCarouselViewport')).toHaveClass(/isPulling/);
  const farProfile=await page.evaluate(()=>window.MonoidModeCarousel.settleProfile(-34,-window.MonoidModeCarousel.SPACING));
  expect(farProfile.overshoot).toBeGreaterThan(closeProfile.overshoot*4);
  const trace=await page.evaluate(async()=>{
    const slide=document.querySelector('.modeSlide[data-index="1"]'),viewport=document.querySelector('#modeCarouselViewport'),center=viewport.getBoundingClientRect().left+viewport.getBoundingClientRect().width/2,start=performance.now(),samples=[];
    await new Promise(resolve=>{function tick(now){const r=slide.getBoundingClientRect();samples.push(r.left+r.width/2-center);if(now-start<470)requestAnimationFrame(tick);else resolve()}requestAnimationFrame(tick)});
    return samples
  });
  expect(Math.min(...trace)).toBeLessThan(-3,'a far release must carry the incoming tile slightly through centre');
  expect(Math.abs(trace.at(-1))).toBeLessThan(1.5);
  await expect(page.locator('#modeName')).toHaveText('LOCKED',{timeout:900});
  await expect(page.locator('#startRun')).toBeDisabled();

  await page.evaluate(()=>window.__monoidModes.select(6));
  const frame=await page.locator('#modeCarouselFrame').boundingBox();
  const loopViewport=await page.locator('#modeCarouselViewport').boundingBox();
  const classicBefore=await page.locator('#modeClassic').boundingBox();
  expect(frame).toBeTruthy();expect(loopViewport).toBeTruthy();expect(classicBefore).toBeTruthy();
  expect(classicBefore.x).toBeGreaterThanOrEqual(frame.x+frame.width);
  const sx=loopViewport.x+loopViewport.width*.72,sy=loopViewport.y+loopViewport.height*.5;
  await page.mouse.move(sx,sy);await page.mouse.down();await page.mouse.move(sx-82,sy);
  const classicDuring=await page.locator('#modeClassic').boundingBox();expect(classicDuring).toBeTruthy();
  expect(classicDuring.x).toBeLessThan(frame.x+frame.width);expect(classicDuring.x+classicDuring.width).toBeGreaterThan(frame.x+frame.width);
  await page.mouse.up();await expect(page.locator('#modeName')).toHaveText('LOCKED',{timeout:1200});

  await page.evaluate(()=>window.__monoidModes.select(7));
  const seamViewport=await page.locator('#modeCarouselViewport').boundingBox();expect(seamViewport).toBeTruthy();
  const farTile=page.locator('.modeSlide[data-index="4"]');
  const farBefore=await farTile.boundingBox();expect(farBefore).toBeTruthy();expect(intersects(farBefore,seamViewport)).toBe(false);
  const lx=seamViewport.x+seamViewport.width*.72,ly=seamViewport.y+seamViewport.height*.5;
  await page.mouse.move(lx,ly);await page.mouse.down();await page.mouse.move(lx-78,ly);await page.mouse.up();
  for(const wait of [25,45,55,65,75,85]){await page.waitForTimeout(wait);const box=await farTile.boundingBox();expect(box).toBeTruthy();expect(intersects(box,seamViewport)).toBe(false)}
  await expect(page.locator('#modeName')).toHaveText('CLASSIC',{timeout:1200});
  await expect(page.locator('#modeDescription')).toHaveText('Classic → Endless → Infinite');
});

test('Classic is the single playable mode and owns the full progression',async({page})=>{
  await page.setViewportSize({width:375,height:667});
  await page.goto('http://127.0.0.1:4173/');
  await page.waitForFunction(()=>!!window.__monoidModes);
  await page.locator('#titleCard').click();

  expect(await page.evaluate(()=>window.__monoidModes.modes.filter(mode=>mode.available).map(mode=>mode.id))).toEqual(['classic']);
  await expect(page.locator('#modeName')).toHaveText('CLASSIC');
  await expect(page.locator('#modeDescription')).toHaveText('Classic → Endless → Infinite');
  await page.locator('#startRun').click();
  expect(await page.evaluate(()=>window.__monoidGame.state().gameMode)).toBe('classic');
  expect(await page.evaluate(()=>window.__monoidGame.state().scoringModel??null)).toBeNull();
  expect(await page.evaluate(()=>localStorage.getItem('iterion.activeRunMode.v1'))).toBe('classic');
  expect(await page.evaluate(()=>window.__monoidGame.debugText())).toContain('Mode: CLASSIC');
});
