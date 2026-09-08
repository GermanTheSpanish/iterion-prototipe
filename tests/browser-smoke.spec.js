const { test, expect } = require('@playwright/test');

test('ITERION browser smoke', async ({ page }) => {
  const jsErrors=[];
  page.on('pageerror',error=>jsErrors.push(`pageerror: ${error.message}`));
  page.on('console',message=>{if(message.type()==='error')jsErrors.push(`console: ${message.text()}`)});

  await page.goto('http://127.0.0.1:4173/',{waitUntil:'load'});

  await expect(page.locator('#board')).toBeVisible();
  await expect(page.locator('#hand')).toBeVisible();
  await expect(page.locator('#hand .handSlot')).toHaveCount(5);
  expect(await page.locator('#hand .tile').count()).toBeGreaterThan(0);

  const firstRunId=await page.evaluate(()=>JSON.parse(localStorage.getItem('iterion.latestRun.v9')||'null')?.runId||null);
  expect(firstRunId).toBeTruthy();
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#reset').click();
  await page.waitForFunction(previous=>{
    const saved=JSON.parse(localStorage.getItem('iterion.latestRun.v9')||'null');
    return !!saved?.runId&&saved.runId!==previous;
  },firstRunId);

  await page.locator('#shopButton').click();
  await expect(page.locator('#overlay')).toHaveClass(/show/);
  await expect(page.locator('#overlayTitle')).toHaveText('SHOP');
  await expect(page.locator('#overlayPrimary')).toHaveText('CLOSE SHOP');
  await page.locator('#overlayPrimary').click();
  await expect(page.locator('#overlay')).not.toHaveClass(/show/);

  await page.locator('#viewrun').click();
  await expect(page.locator('#runlog')).toHaveClass(/show/);
  await page.locator('#runlog button',{hasText:'CLOSE'}).click();
  await expect(page.locator('#runlog')).not.toHaveClass(/show/);

  await page.locator('#helpButton').click();
  await expect(page.locator('#overlay')).toHaveClass(/show/);
  await expect(page.locator('#overlayTitle')).toHaveText('HOW TO PLAY');
  await expect(page.locator('#overlayPrimary')).toHaveText('CLOSE');
  await page.locator('#overlayPrimary').click();
  await expect(page.locator('#overlay')).not.toHaveClass(/show/);

  expect(jsErrors,jsErrors.join('\n')).toEqual([]);
});

for(const viewport of [{width:390,height:844},{width:375,height:667}]){
  test(`Endless transition on mobile ${viewport.width}x${viewport.height}`,async({page})=>{
    await page.setViewportSize(viewport);
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    // Test-only factory interception seeds the final-round fixture before UI init.
    // No production source is rewritten and no test hooks ship in the game.
    await page.addInitScript(()=>{
      let api;
      Object.defineProperty(window,'IterionGame',{
        configurable:true,get:()=>api,set:value=>{
          api={...value,createGame(engine,options){
            const game=value.createGame(engine,{...options,seed:2401,STARTING_COINS:100});
            const s=game.state();engine.setBoardSize(30,40);s.round=14;s.boardStage=4;
            const i=s.hand.findIndex(t=>t&&t.a===t.b&&t.a>0);
            const ctx=game.beginPlacement(i,game.candidatesForIndex(i)[0]);
            ctx.sim.output=game.target();game.finishPlacement(ctx);
            window.__iterionTestGame=game;return game;
          }};
        }
      });
    });
    await page.goto('http://127.0.0.1:4173/');
    await expect(page.locator('#overlayTitle')).toHaveText('RUN COMPLETE');
    await expect(page.locator('#overlayPrimary')).toHaveText('CONTINUE · ENDLESS');
    await expect(page.locator('#overlayTertiary')).toBeVisible();
    const before=await page.evaluate(()=>window.__iterionTestGame.snapshot());
    await page.locator('#overlayPrimary').click();
    await expect(page.locator('#overlayTitle')).toHaveText('MARKET');
    await expect(page.locator('#overlayPrimary')).toHaveText('CONTINUE TO STAGE 6');
    expect(await page.evaluate(()=>window.__iterionTestGame.snapshot().round.index)).toBe(15);
    await page.locator('#overlayPrimary').click();
    await expect(page.locator('#roundstat')).toHaveText('16/∞');
    await expect(page.locator('#stageRound')).toContainText('ENDLESS');
    await expect(page.locator('#target')).toHaveText('250,000,000,000');
    const after=await page.evaluate(()=>window.__iterionTestGame.snapshot());
    expect(after.board).toEqual(before.board);expect(after.set).toEqual(before.set);
    expect(after.coins).toBe(before.coins);expect(after.inflation).toBe(before.inflation);
    expect(after.endless.baseComplete).toBe(true);
    const layout=await page.evaluate(()=>{
      const board=document.querySelector('#board').getBoundingClientRect(),hand=document.querySelector('#hand').getBoundingClientRect();
      return{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,
        viewportWidth:innerWidth,viewportHeight:innerHeight,boardRight:board.right,handLeft:hand.left,handBottom:hand.bottom};
    });
    expect(layout.width).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.height).toBeLessThanOrEqual(layout.viewportHeight);
    expect(layout.handLeft).toBeGreaterThanOrEqual(layout.boardRight);
    expect(layout.handBottom).toBeLessThanOrEqual(layout.viewportHeight);
    // Force exhaustion to exercise the actual failure overlay and saved result.
    await page.evaluate(()=>{
      const g=window.__iterionTestGame,s=g.state();s.hand.fill(null);s.reserve=[];g.assessContinuation();g.save();
    });
    await page.locator('#helpButton').click();
    await page.locator('#overlayPrimary').click();
    await expect(page.locator('#overlayTitle')).toHaveText('ENDLESS OVER');
    await expect(page.locator('#overlayBody')).toContainText('Base run complete');
    expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('iterion.latestRun.v9')).endless.baseComplete)).toBe(true);
    expect(errors).toEqual([]);
  });
}
