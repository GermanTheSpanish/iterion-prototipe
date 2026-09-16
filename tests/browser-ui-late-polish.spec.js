const {test,expect}=require('@playwright/test');

test('late mobile polish keeps MONOID centred, modifiers legible and Market compact',async({page})=>{
  await page.setViewportSize({width:430,height:932});
  await page.addInitScript(()=>localStorage.setItem('monoid.firstRunBriefing.v1','seen'));
  await page.goto('http://127.0.0.1:4173/');
  await expect.poll(()=>page.evaluate(()=>window.__MONOID_BUILD)).toBe('20260916.1');
  await page.locator('#titleCard').click();await page.locator('#startRun').click();
  const wordmark=await page.locator('.wordmark').boundingBox();expect(Math.abs(wordmark.x+wordmark.width/2-215)).toBeLessThan(2);expect(wordmark.width).toBeGreaterThanOrEqual(118);expect(wordmark.width).toBeLessThanOrEqual(130);

  await page.evaluate(()=>{const g=window.__monoidGame||window.__nomonGame,s=g.state(),E=window.IterionEngine;const ids=['d1-1','d2-2','d3-3','d4-4','d5-5','d6-6'];s.round=2;s.cleared=true;s.nextShopType='market';s.intermissionResolved=false;s.coins=80;s.pieces=ids.map((id,i)=>{const t=s.set.find(t=>t.id===id),p=E.pieceFrom(t,2+(i%3)*6,4+Math.floor(i/3)*8,0,i%2?1:0,i+1);p.tile={...t};return p});s.placedTileIds=ids.slice();s.doubleDoubleTileId='d3-3';s.doubleEchoTileId=null;s.zeroMemoryTileId=null;s.hand=s.hand.map(t=>s.placedTileIds.includes(t?.id)?null:t);s.reserve=s.reserve.filter(t=>!s.placedTileIds.includes(t.id));g.openIntermission();s.shopOffers=['double-double','double-echo','long-run']});
  await page.locator('#helpButton').click();await page.locator('#overlayPrimary').click();await expect(page.locator('#overlayTitle')).toHaveText('MARKET');
  await expect.poll(()=>page.locator('.marketPolishedOffer').count()).toBe(3);
  expect(await page.locator('.marketAssignments').evaluate(el=>getComputedStyle(el).display)).toBe('none');

  const ddRail=page.locator('[data-market-offer="double-double"] .marketOfferRail');await expect(ddRail.locator('.marketAssignedTile')).toHaveCount(1);await expect(ddRail).toContainText('DD');
  const de=page.locator('[data-market-offer="double-echo"]');await expect(de.locator('.marketOfferRail .marketTile:not(.marketTileOverflow)')).toHaveCount(3);await expect(de.locator('.marketTileMore')).toContainText('+2');
  await expect(page.locator('[data-market-offer="long-run"] .marketMachineTag')).toHaveText('MACHINE');
  const overflow=await page.locator('.commerceModal').evaluate(el=>({sw:el.scrollWidth,cw:el.clientWidth}));expect(overflow.sw).toBeLessThanOrEqual(overflow.cw+1);

  const markSize=await ddRail.locator('.tileModMark').evaluate(el=>parseFloat(getComputedStyle(el).fontSize));expect(markSize).toBeGreaterThanOrEqual(12);
  expect(await page.evaluate(()=>window.MonoidLatePolish.scientific(1.1641532182693482e33))).toBe('1.16e33');
  await page.evaluate(()=>{const g=window.__monoidGame||window.__nomonGame;g.state().score=8.603241731728167e47;window.MonoidLatePolish.sync()});await expect(page.locator('#score')).toHaveText('8.6e47');await expect(page.locator('#score')).toHaveClass(/extremeValue/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true)
});
