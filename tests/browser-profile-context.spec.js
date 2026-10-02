const{test,expect}=require('@playwright/test');
const BASE='http://127.0.0.1:4173/';

async function openSelection(page){
  await page.locator('#titleCard').click();
  await expect(page.locator('#gameSelection')).toBeVisible();
  await page.waitForFunction(()=>!!window.__monoidModes)
}

test('player, dev and fresh contexts keep progression and saves isolated',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(()=>{
    if(sessionStorage.getItem('monoid-profile-context-test-seeded'))return;
    localStorage.clear();
    localStorage.setItem('monoid.profileContext.v1','player');
    localStorage.setItem('monoid.profile.player.v1',JSON.stringify({
      version:1,
      profileId:'P-NEWTEST',
      createdAt:'2026-10-02T16:00:00.000Z',
      context:'player',
      unlockedModes:['classic'],
      unlockedMods:[],
      collection:{numbers:[]},
      stats:{runsStarted:0,runsFinished:0,endlessRuns:0,ouroborosRuns:0},
      migration:null
    }));
    localStorage.setItem('monoid.firstRunBriefing.v1','seen');
    localStorage.setItem('iterion.tutorialChoice.v1','made');
    sessionStorage.setItem('monoid-profile-context-test-seeded','1');
  });
  await page.goto(BASE);
  await openSelection(page);

  expect(await page.evaluate(()=>window.MonoidProfile.contextInfo().context)).toBe('player');
  expect(await page.evaluate(()=>window.__monoidModes.isAvailable('classic'))).toBe(true);
  expect(await page.evaluate(()=>window.__monoidModes.isAvailable('eyes'))).toBe(false);
  await page.evaluate(()=>window.__monoidModes.select(1));
  await expect(page.locator('#modeName')).toHaveText('LOCKED');
  await expect(page.locator('#modeDescription')).toHaveText('Progress to unlock');
  await expect(page.locator('#startRun')).toBeDisabled();

  await page.evaluate(()=>window.__monoidModes.select(0));
  await page.locator('#startRun').click();
  await expect(page.locator('.app')).toBeVisible();
  const playerSave=await page.evaluate(()=>localStorage.getItem('iterion.activeRun.v1'));
  expect(playerSave).toBeTruthy();

  await page.locator('#menuButton').click();
  await page.locator('#qaTestRunsButton').click();
  await expect(page.locator('[data-profile-context="player"]')).toHaveAttribute('aria-pressed','true');
  await page.locator('[data-profile-context="dev"]').click();
  await page.waitForLoadState('domcontentloaded');
  await expect.poll(()=>page.evaluate(()=>window.MonoidProfile?.contextInfo?.().context)).toBe('dev');

  await openSelection(page);
  expect(await page.evaluate(()=>window.__monoidModes.isAvailable('eyes'))).toBe(true);
  await page.evaluate(()=>window.__monoidModes.select(1));
  await expect(page.locator('#modeName')).toHaveText('THE EYES');
  await expect(page.locator('#startRun')).toBeEnabled();
  await page.locator('#startRun').click();
  await expect(page.locator('.app')).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>localStorage.getItem('monoid.ctx.dev.iterion.activeRun.v1'))).not.toBeNull();
  expect(await page.evaluate(()=>localStorage.getItem('iterion.activeRun.v1'))).toBe(playerSave);
  const devTelemetry=await page.evaluate(()=>window.__monoidPlaytest);
  expect(devTelemetry.environment).toBe('dev');
  expect(devTelemetry.profileType).toBe('dev');

  await page.locator('#menuButton').click();
  await page.locator('#qaTestRunsButton').click();
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('[data-profile-context="fresh"]').click();
  await page.waitForLoadState('domcontentloaded');
  await expect.poll(()=>page.evaluate(()=>window.MonoidProfile?.contextInfo?.().context)).toBe('fresh');

  await openSelection(page);
  expect(await page.evaluate(()=>window.__monoidModes.isAvailable('classic'))).toBe(true);
  expect(await page.evaluate(()=>window.__monoidModes.isAvailable('eyes'))).toBe(false);
  expect(await page.evaluate(()=>localStorage.getItem('monoid.ctx.fresh.iterion.activeRun.v1'))).toBeNull();
  expect(await page.evaluate(()=>localStorage.getItem('iterion.activeRun.v1'))).toBe(playerSave);
  expect(await page.evaluate(()=>window.MonoidProfile.contextInfo().profile.unlockedModes)).toEqual(['classic']);
});
