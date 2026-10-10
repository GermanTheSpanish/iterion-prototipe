const {test,expect}=require('@playwright/test');
const BASE='http://127.0.0.1:4173/';

test('Ouroboros OVERFLOW shows one FIRE recap then chains three real Markets before the next round',async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(`${BASE}?qa=infinite16&ci=1`);
  await expect(page.locator('.app')).toBeVisible({timeout:12000});
  const fixture=await page.evaluate(()=>{
    const game=window.__monoidGame,s=game.state(),piece=s.pieces[0];
    s.ouroborosMode=true;s.ouroborosStartedRound=s.round+1;
    s.ouroborosBoardSize=[window.IterionEngine.G,window.IterionEngine.H];
    s.roundTurn=1;s.running=true;s.cleared=false;
    const outputExact=game.targetExactForRound(s.round+9);
    const result=game.finishPlacement({ok:true,ouroboros:true,tile:piece.tile,p:piece,trigger:2,
      sim:{output:Number(outputExact),outputExact,events:[],segments:[],reason:'qa-overflow',rebounds:0}});
    if(!result.ok||!result.cleared||s.ouroborosOverflow?.markets.length!==3)throw Error('Overflow fixture failed');
    return{save:game.exportState(),markets:s.ouroborosOverflow.markets.map(i=>i+1),
      nextRound:s.ouroborosOverflow.nextRound+1,coins:s.coins};
  });
  // Reload through normal save/restore, not an inaccessible QA-only screen: this also
  // checks that a cleared round with pending Markets correctly resumes its single recap.
  await page.goto(BASE);
  await page.evaluate(save=>{
    localStorage.setItem('iterion.activeRun.v1',JSON.stringify(save));
    localStorage.setItem('iterion.activeRunMode.v1','classic');
    localStorage.setItem('iterion.tutorialChoice.v1','made');
    localStorage.setItem('monoid.firstRunBriefing.v1','seen');
  },fixture.save);
  await page.reload();
  await page.locator('#titleCard').click();
  await expect(page.locator('#continueRun')).toBeVisible();
  await page.locator('#continueRun').click();
  await expect(page.locator('#overlayTitle')).toHaveText('ROUND COMPLETE',{timeout:12000});
  await expect(page.locator('[data-ouroboros-overflow]')).toContainText('OVERFLOW +10');
  await expect(page.locator('[data-ouroboros-overflow]')).toContainText('3 MARKETS');
  await page.screenshot({path:testInfo.outputPath('overflow-single-recap.png'),fullPage:true});

  for(let attempts=0;attempts<3;attempts++){
    if(await page.evaluate(()=>window.__monoidGame.state().shopOpen))break;
    await page.locator('#overlayBody').click();
  }
  await expect.poll(()=>page.evaluate(()=>window.__monoidGame.state().shopOpen)).toBe(true);

  for(let i=0;i<fixture.markets.length;i++){
    await expect(page.locator('#overlayTitle')).toHaveText('MARKET');
    await expect(page.locator('.compactMarket')).toContainText(`MARKET ${i+1}/3 · AFTER R${fixture.markets[i]}`);
    await expect(page.locator('#overlayPrimary')).toHaveText(i<2?`NEXT MARKET · ${i+2}/3`:`CONTINUE TO ROUND ${fixture.nextRound}`);
    if(i===0)await page.screenshot({path:testInfo.outputPath('overflow-market-1-of-3.png'),fullPage:true});
    await page.locator('#overlayPrimary').click();
  }
  await expect.poll(()=>page.evaluate(()=>window.__monoidGame.state().round+1)).toBe(fixture.nextRound);
  const outcome=await page.evaluate(()=>{
    const s=window.__monoidGame.state();return{round:s.round+1,score:s.score,
      activeMarkets:s.shopOpen,overflow:s.ouroborosOverflow,coins:s.coins,
      totalMarkets:s.events.filter(e=>e.type==='shop-open'&&e.shop==='market').length,
      overflowRecaps:s.events.filter(e=>e.type==='ouroboros-overflow').length};
  });
  expect(outcome).toMatchObject({round:fixture.nextRound,score:0,activeMarkets:false,
    overflow:null,coins:fixture.coins,totalMarkets:3,overflowRecaps:1});
  await expect(page.locator('#overlay')).not.toHaveClass(/show/);
});
