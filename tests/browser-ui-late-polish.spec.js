const {test,expect}=require('@playwright/test');

test('late mobile polish keeps MONOID centred and Market uses one stable three-band structure',async({page})=>{
  await page.setViewportSize({width:430,height:932});
  await page.addInitScript(()=>localStorage.setItem('monoid.firstRunBriefing.v1','seen'));
  await page.goto('http://127.0.0.1:4173/');
  await expect.poll(()=>page.evaluate(()=>window.__MONOID_BUILD)).toBe('20260916.2');
  await page.locator('#titleCard').click();await page.locator('#startRun').click();
  const wordmark=await page.locator('.wordmark').boundingBox();expect(Math.abs(wordmark.x+wordmark.width/2-215)).toBeLessThan(2);expect(wordmark.width).toBeGreaterThanOrEqual(118);expect(wordmark.width).toBeLessThanOrEqual(130);

  await page.evaluate(()=>{const g=window.__monoidGame||window.__nomonGame,s=g.state(),E=window.IterionEngine;const ids=['d1-1','d2-2','d3-3','d4-4','d5-5','d6-6'];s.round=2;s.cleared=true;s.nextShopType='market';s.intermissionResolved=false;s.coins=80;s.pieces=ids.map((id,i)=>{const t=s.set.find(t=>t.id===id),p=E.pieceFrom(t,2+(i%3)*6,4+Math.floor(i/3)*8,0,i%2?1:0,i+1);p.tile={...t};return p});s.placedTileIds=ids.slice();s.doubleDoubleTileId='d3-3';s.doubleEchoTileId=null;s.zeroMemoryTileId=null;s.circuitRanks={'d3-3':1};s.hand=s.hand.map(t=>s.placedTileIds.includes(t?.id)?null:t);s.reserve=s.reserve.filter(t=>!s.placedTileIds.includes(t.id));g.openIntermission();s.shopOffers=['double-double','double-echo','long-run']});
  await page.locator('#helpButton').click();await page.locator('#overlayPrimary').click();await expect(page.locator('#overlayTitle')).toHaveText('MARKET');
  await expect.poll(()=>page.locator('.marketStructuredOffer').count()).toBe(3);
  expect(await page.locator('.marketAssignments').evaluate(el=>getComputedStyle(el).display)).toBe('none');

  const dd=page.locator('[data-market-offer="double-double"]');
  await expect(dd.locator('.marketAssignedGroup .marketAssignedTile')).toHaveCount(1);
  await expect(dd.locator('.marketPoolGroup .marketContextLabel')).toHaveText('RANDOM FROM · 5');
  await expect(dd.locator('.marketPoolGroup .marketTile:not(.marketTileOverflow)')).toHaveCount(3);
  await expect(dd.locator('.marketPoolGroup .marketTileMore')).toHaveText('+2');
  await expect(dd.locator(':scope > .marketTileList')).toHaveCount(0);

  const de=page.locator('[data-market-offer="double-echo"]');
  await expect(de.locator('.marketPoolGroup .marketContextLabel')).toHaveText('RANDOM FROM · 5');
  await expect(de.locator('.marketPoolGroup .marketTile:not(.marketTileOverflow)')).toHaveCount(3);
  await expect(de.locator('.marketPoolGroup .marketTileMore')).toHaveText('+2');
  await expect(page.locator('[data-market-offer="long-run"] .marketMachineTag strong')).toHaveText('MACHINE');
  await expect(page.locator('.shopFoot')).toContainText('assigned randomly from the shown pool');

  const buttonBoxes=await page.locator('.marketStructuredOffer .marketOfferAction .shopBuy').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{w:r.width,h:r.height}}));
  expect(buttonBoxes.every(b=>Math.abs(b.w-112)<2&&b.h>=44)).toBe(true);
  const overflow=await page.locator('.commerceModal').evaluate(el=>({sw:el.scrollWidth,cw:el.clientWidth}));expect(overflow.sw).toBeLessThanOrEqual(overflow.cw+1);

  const circuitMarkColor=await dd.locator('.marketAssignedTile .tileModMark').evaluate(el=>getComputedStyle(el).color);
  expect(circuitMarkColor).toBe('rgba(255, 255, 255, 0.98)');

  await dd.locator('.marketOfferAction .shopBuy').click();
  await expect.poll(()=>page.locator('.marketStructuredOffer').count()).toBe(3);
  await expect(page.locator('[data-market-offer="double-double"] .marketAssignedGroup .marketAssignedTile')).toHaveCount(1);
  await expect(page.locator('[data-market-offer="double-double"] .marketOfferAction .shopBuy')).toContainText('PURCHASED');
  await expect(page.locator('[data-market-offer="double-echo"] .marketOfferAction .shopBuy')).toContainText('LOCKED');

  const markSize=await page.locator('[data-market-offer="double-double"] .marketAssignedTile .tileModMark').evaluate(el=>parseFloat(getComputedStyle(el).fontSize));expect(markSize).toBeGreaterThanOrEqual(12);
  expect(await page.evaluate(()=>window.MonoidLatePolish.scientific(1.1641532182693482e33))).toBe('1.16e33');
  await page.evaluate(()=>{const g=window.__monoidGame||window.__nomonGame;g.state().score=8.603241731728167e47;window.MonoidLatePolish.sync()});await expect(page.locator('#score')).toHaveText('8.6e47');await expect(page.locator('#score')).toHaveClass(/extremeValue/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
});

test('Market keeps the same component and touch targets on 375px phones',async({page})=>{
  await page.setViewportSize({width:375,height:667});
  await page.addInitScript(()=>localStorage.setItem('monoid.firstRunBriefing.v1','seen'));
  await page.goto('http://127.0.0.1:4173/');await page.locator('#titleCard').click();await page.locator('#startRun').click();
  await page.evaluate(()=>{const g=window.__monoidGame,s=g.state(),E=window.IterionEngine,ids=['d1-1','d2-2','d3-3','d4-4'];s.round=2;s.cleared=true;s.nextShopType='market';s.intermissionResolved=false;s.coins=40;s.pieces=ids.map((id,i)=>{const t=s.set.find(t=>t.id===id),p=E.pieceFrom(t,2+i*4,4,0,1,i+1);p.tile={...t};return p});s.placedTileIds=ids.slice();s.hand=s.hand.map(t=>s.placedTileIds.includes(t?.id)?null:t);s.reserve=s.reserve.filter(t=>!s.placedTileIds.includes(t.id));g.openIntermission();s.shopOffers=['double-double','double-echo','long-run']});
  await page.locator('#helpButton').click();await page.locator('#overlayPrimary').click();await expect.poll(()=>page.locator('.marketStructuredOffer').count()).toBe(3);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const actions=await page.locator('.marketOfferAction .shopBuy').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().height));expect(actions.every(h=>h>=44)).toBe(true);
  await expect(page.locator('.marketStructuredOffer').first().locator('.marketOfferDescription')).toBeVisible()
});
