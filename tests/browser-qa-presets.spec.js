const {test,expect}=require('@playwright/test');
const BASE='http://127.0.0.1:4173/';
const ACTIVE='iterion.activeRun.v1',MODE='iterion.activeRunMode.v1',LATEST='iterion.latestRun.v9';

async function seedRealSave(page){
  await page.goto(BASE);
  await page.evaluate(({ACTIVE,MODE,LATEST})=>{
    localStorage.clear();
    localStorage.setItem(ACTIVE,'REAL-SAVED-RUN-SENTINEL');
    localStorage.setItem(MODE,'classic');
    localStorage.setItem(LATEST,'REAL-LATEST-RUN-SENTINEL');
  },{ACTIVE,MODE,LATEST})
}
async function assertRealSaveSurvived(page){
  await page.goto(`${BASE}?verify-storage=1`);
  expect(await page.evaluate(key=>localStorage.getItem(key),ACTIVE)).toBe('REAL-SAVED-RUN-SENTINEL');
  expect(await page.evaluate(key=>localStorage.getItem(key),MODE)).toBe('classic');
  expect(await page.evaluate(key=>localStorage.getItem(key),LATEST)).toBe('REAL-LATEST-RUN-SENTINEL')
}
async function assertLateGameSurface(page,id,{expectZm=true,minPieces=19,minPower=5}={}){
  await expect(page.locator('body')).toHaveAttribute('data-qa-preset',id);
  await expect(page.locator('.app')).toBeVisible({timeout:12000});
  await expect.poll(()=>page.locator('#board .piece').count()).toBeGreaterThanOrEqual(minPieces);
  await expect(page.locator('#board .tileModMark.dd')).toHaveCount(1);
  await expect(page.locator('#board .tileModMark.de')).toHaveCount(1);
  await expect(page.locator('#board .tileModMark.zm')).toHaveCount(expectZm?1:0);
  expect(await page.locator('#board .circuitTile').count()).toBeGreaterThanOrEqual(3);
  expect(await page.locator('#board .powerTile').count()).toBeGreaterThanOrEqual(minPower);
  await expect(page.locator('#machineModStatus')).toBeVisible();
  expect(await page.locator('#machineModStatus').evaluate(el=>el.parentElement?.classList.contains('metaStrip'))).toBe(true);
  const statusBox=await page.locator('#machineModStatus').boundingBox(),roundBox=await page.locator('.roundMeta').boundingBox();
  expect(statusBox.x).toBeGreaterThan(roundBox.x+roundBox.width);
  const centering=await page.locator('.wordmark').evaluate(el=>{
    const box=el.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(el);const glyphs=range.getBoundingClientRect(),centre=innerWidth/2;
    return{box:Math.abs(box.left+box.width/2-centre),glyphs:Math.abs(glyphs.left+glyphs.width/2-centre)}
  });
  expect(centering.box).toBeLessThan(1.25);expect(centering.glyphs).toBeLessThan(1.25);
  await page.locator('#menuButton').click();
  await expect(page.locator('.menuBuildStamp')).toContainText('build 20260918.4');
  await expect(page.locator('.qaPresetStamp')).toContainText('SAVED RUN SAFE');
  await page.locator('#closeMenu').click()
}

test('Classic R14 QA link exposes Phase A late-game states without touching the saved run',async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});await seedRealSave(page);
  await page.goto(`${BASE}?qa=classic14&ci=1`);
  await assertLateGameSurface(page,'classic14',{expectZm:false,minPieces:30,minPower:2});
  await expect(page.locator('#roundstat')).toHaveText('14/15');await expect(page.locator('#stagestat')).toHaveText('5/5');
  await expect(page.locator('#target')).toHaveText('10B');await expect(page.locator('#score')).toHaveText('0');
  expect(await page.evaluate(()=>window.__monoidGame.state().endlessMode)).toBe(false);
  expect(await page.evaluate(()=>window.__monoidQa?.sourceRunId)).toBe('mu66e4fp-116me8o');
  expect(await page.evaluate(()=>({pieces:window.__monoidGame.state().pieces.length,best:window.__monoidGame.state().best,coins:window.__monoidGame.state().coins,inflation:window.__monoidGame.state().inflation,hand:window.__monoidGame.state().hand.map(t=>t.id)}))).toEqual({pieces:30,best:57863119300,coins:165,inflation:8,hand:['g2-d0-2','g2-d0-1','g2-d1-3','g2-d1-1','g2-d1-5']});
  expect(await page.evaluate(()=>window.__monoidActiveMode)).toBe('classic');
  await page.screenshot({path:testInfo.outputPath('qa-classic-r14.png'),fullPage:true});
  await assertRealSaveSurvived(page)
});

test('Prototype first-Endless QA link exposes deferred mode, Endless and POWER x3 without touching the saved run',async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});await seedRealSave(page);
  await page.goto(`${BASE}?qa=prototype16&ci=1`);
  await assertLateGameSurface(page,'prototype16');
  await expect(page.locator('#roundstat')).toHaveText('16/∞');await expect(page.locator('#stagestat')).toHaveText('6/∞');
  await expect(page.locator('#target')).toHaveText('250B');await expect(page.locator('#score')).toHaveText('125B');
  await expect(page.locator('body')).toHaveClass(/endlessPalette/);
  await expect.poll(()=>page.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(41, 41, 39)');
  expect(await page.evaluate(()=>({mode:window.__monoidGame.state().gameMode,model:window.__monoidGame.state().scoringModel,active:window.__monoidActiveMode,generation:window.__monoidGame.state().setGeneration}))).toEqual({mode:'prototype',model:'deferred-v1',active:'prototype',generation:3});
  expect(await page.locator('#board .power3').count()).toBeGreaterThanOrEqual(5);
  const normalPower=page.locator('#board .power3:not(.circuitTile)').first();
  const circuitPower=page.locator('#board .power3.circuitTile').first();
  if(await normalPower.count()){
    expect(await normalPower.evaluate(el=>getComputedStyle(el,'::before').backgroundColor)).toBe('rgb(193, 180, 198)');
    expect(await normalPower.locator('.pip').first().evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(23, 23, 23)')
  }
  if(await circuitPower.count()){
    expect(await circuitPower.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(44, 32, 51)')
  }
  await page.screenshot({path:testInfo.outputPath('qa-prototype-endless-r16.png'),fullPage:true});
  await assertRealSaveSurvived(page)
});


test('PWA menu opens QA test runs and returns to the untouched saved run',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(()=>localStorage.setItem('monoid.firstRunBriefing.v1','seen'));
  await page.goto(BASE);await page.locator('#titleCard').click();await page.locator('#startRun').click();
  const savedBefore=await page.evaluate(()=>localStorage.getItem('iterion.activeRun.v1'));
  expect(savedBefore).toBeTruthy();
  await page.locator('#menuButton').click();
  await expect(page.locator('#qaTestRunsButton')).toBeVisible();
  await page.locator('#qaTestRunsButton').click();
  await expect(page.locator('#qaTestRunsDialog')).toBeVisible();
  await expect(page.locator('#qaTestRunsDialog')).toContainText('CLASSIC · ROUND 14');
  await expect(page.locator('#qaTestRunsDialog')).toContainText('PROTOTYPE · ENDLESS R16');
  await page.locator('[data-qa-preset="classic14"]').click();
  await expect(page.locator('body')).toHaveAttribute('data-qa-preset','classic14',{timeout:12000});
  expect(await page.evaluate(()=>window.__monoidQa?.savedRunProtected)).toBe(true);
  expect(await page.evaluate(()=>window.__monoidQa?.originalStorage?.['iterion.activeRun.v1'])).toBe(savedBefore);
  await page.locator('#menuButton').click();await page.locator('#qaTestRunsButton').click();
  await expect(page.locator('[data-qa-return]')).toBeVisible();
  await page.locator('[data-qa-return]').click();
  await expect.poll(()=>new URL(page.url()).searchParams.has('qa'),{timeout:12000}).toBe(false);
  await expect(page.locator('.app')).toBeVisible({timeout:12000});
  await expect(page.locator('body')).not.toHaveAttribute('data-qa-preset',/.+/);
  expect(await page.evaluate(()=>localStorage.getItem('iterion.activeRun.v1'))).toBe(savedBefore)
});
