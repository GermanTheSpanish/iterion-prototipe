const{test,expect}=require('@playwright/test');
const BASE='http://127.0.0.1:4173/';

async function placeOpeningTile(page){
  const target=await page.evaluate(()=>{const g=window.__monoidGame,E=window.IterionEngine,D=window.IterionData,s=g.state(),i=s.hand.findIndex(t=>t&&t.a===t.b),tile=s.hand[i],candidate=g.candidatesForIndex(i)[0],r=document.querySelector('#board').getBoundingClientRect();if(i<0||!tile||!candidate)return null;const p=E.pieceFrom(tile,candidate.x,candidate.y,0,candidate.rr,-1);return{i,x:r.left+((p.rect.minx+p.rect.maxx)/2/E.G)*r.width,y:r.top+((p.rect.miny+p.rect.maxy)/2/E.H)*r.height+(D.DRAG_Y_OFFSET||0)}});expect(target).toBeTruthy();
  const tile=page.locator('#hand .handSlot').nth(target.i).locator('.tile'),box=await tile.boundingBox();expect(box).toBeTruthy();const sx=box.x+box.width/2,sy=box.y+box.height/2;await page.mouse.move(sx,sy);await page.mouse.down();await page.mouse.move(sx+18,sy,{steps:2});await page.mouse.move(target.x,target.y,{steps:8});await page.mouse.up();await expect.poll(()=>page.evaluate(()=>window.__monoidGame.state().pieces.length),{timeout:12000}).toBe(1);await expect.poll(()=>page.evaluate(()=>window.__monoidGame.state().running),{timeout:12000}).toBe(false)
}

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
  await page.locator('#menuGroupSystem').click();await page.locator('#qaTestRunsButton').click();
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
  await page.locator('#menuGroupSystem').click();await page.locator('#qaTestRunsButton').click();
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('[data-profile-context="fresh"]').click();
  await page.waitForLoadState('domcontentloaded');
  await expect.poll(()=>page.evaluate(()=>window.MonoidProfile?.contextInfo?.().context)).toBe('fresh');

  expect(await page.evaluate(()=>localStorage.getItem('monoid.ctx.fresh.iterion.activeRun.v1'))).toBeNull();
  expect(await page.evaluate(()=>localStorage.getItem('iterion.activeRun.v1'))).toBe(playerSave);
  expect(await page.evaluate(()=>window.MonoidProfile.contextInfo().profile.unlockedModes)).toEqual(['classic']);
  expect(await page.evaluate(()=>window.__monoidModes.isAvailable('classic'))).toBe(true);
  expect(await page.evaluate(()=>window.__monoidModes.isAvailable('eyes'))).toBe(false);
  await page.locator('#titleCard').click();
  await expect(page.locator('.app')).toBeVisible();
  await expect(page.locator('#gameSelection')).toBeHidden();
  expect(await page.evaluate(()=>window.__monoidGame.state().gameMode)).toBe('classic');
  await expect.poll(()=>page.evaluate(()=>localStorage.getItem('monoid.ctx.fresh.iterion.activeRun.v1'))).not.toBeNull();
});


test('boot selector isolates profiles and Fresh starts guided Classic',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(BASE+'?boot=1');
  await expect(page.locator('#bootSelector')).toBeVisible();await expect(page.locator('#titleCard')).toBeHidden();
  await expect(page.locator('[data-boot-context="dev"]')).toContainText('ALL UNLOCKED');
  await expect(page.locator('[data-boot-context="player"]')).toContainText('CURRENT SAVE');
  await expect(page.locator('[data-boot-context="fresh"]')).toContainText('RESET SANDBOX');
  await page.locator('[data-boot-context="dev"]').click();await page.waitForLoadState('domcontentloaded');
  await expect.poll(()=>page.evaluate(()=>window.MonoidProfile?.currentContext?.())).toBe('dev');await expect(page.locator('#titleCard')).toBeVisible();await expect(page.locator('#bootSelector')).toBeHidden();
  expect(await page.evaluate(()=>window.MonoidProfile.ensureProfile().unlockedModes)).toEqual(['classic','eyes','frames','river','loom','peaks','islands']);

  await page.evaluate(()=>localStorage.setItem('monoid.ctx.fresh.iterion.activeRun.v1','STALE'));
  await page.goto(BASE+'?boot=1');await expect(page.locator('#bootSelector')).toBeVisible();await page.locator('[data-boot-context="fresh"]').click();await page.waitForLoadState('domcontentloaded');
  await expect.poll(()=>page.evaluate(()=>window.MonoidProfile?.currentContext?.())).toBe('fresh');expect(await page.evaluate(()=>localStorage.getItem('monoid.ctx.fresh.iterion.activeRun.v1'))).toBeNull();
  await page.locator('#titleCard').click();await expect(page.locator('.app')).toBeVisible();await expect(page.locator('#gameSelection')).toBeHidden();
  await expect(page.locator('body')).toHaveClass(/freshClassicOpening/);await expect(page.locator('#board')).toBeVisible();
  const openingHierarchy=await page.evaluate(()=>({header:getComputedStyle(document.querySelector('.gameHeader')).opacity,scoreStrip:getComputedStyle(document.querySelector('.scoreStrip')).opacity,meta:getComputedStyle(document.querySelector('.metaStrip')).opacity,hand:getComputedStyle(document.querySelector('.handRail')).visibility}));
  expect(openingHierarchy).toEqual({header:'0',scoreStrip:'0',meta:'0',hand:'hidden'});
  await page.waitForTimeout(850);await expect(page.locator('#monoidBoardCoach h2')).toHaveText('FIRST TILE');await expect(page.locator('#monoidBoardCoach')).toContainText('Place a DOUBLE anywhere on the BOARD.');
  expect(await page.locator('.handRail').evaluate(el=>getComputedStyle(el).visibility)).toBe('visible');
  await placeOpeningTile(page);
  await expect(page.locator('body')).not.toHaveClass(/freshClassicOpening/);await expect(page.locator('#monoidBoardCoach h2')).toHaveText('TARGET');await expect(page.locator('#monoidBoardCoach')).toContainText('Reach TARGET before MOVES run out.');
});


test('Fresh Classic explains Zero and T-Split after the signal uses them',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(()=>localStorage.setItem('monoid.profileContext.v1','fresh'));
  await page.goto(BASE);await page.locator('#titleCard').click();await expect(page.locator('.app')).toBeVisible();
  await page.evaluate(()=>localStorage.setItem(window.MonoidProfile.storageKey('monoid.classicGuide.v1'),'3'));
  await page.waitForTimeout(850);await placeOpeningTile(page);
  await page.evaluate(()=>{const s=window.__monoidGame.state();s.events.push({type:'presentation-probe',signal:{trace:[{type:'rebound'}]}});document.body.dataset.classicGuideProbe=String(Date.now())});
  await expect(page.locator('#monoidBoardCoach h2')).toHaveText('ZERO');await expect(page.locator('#monoidBoardCoach')).toContainText('ZERO rebounds the SIGNAL');
  await page.waitForTimeout(2600);await expect(page.locator('#monoidBoardCoach h2')).toHaveText('ZERO');
  await expect.poll(()=>page.evaluate(()=>window.__monoidUx?.mode),{timeout:3000}).toBe('idle');
  await page.evaluate(()=>{const s=window.__monoidGame.state();s.events.push({type:'presentation-probe',signal:{splits:1,trace:[{type:'signal-fork'}]}});document.body.dataset.classicGuideProbe=String(Date.now())});
  await expect(page.locator('#monoidBoardCoach h2')).toHaveText('T-SPLIT');await expect(page.locator('#monoidBoardCoach')).toContainText('two routes');await expect(page.locator('#monoidBoardCoach')).toContainText('outputs are added together');
});
