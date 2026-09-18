const {test,expect}=require('@playwright/test');

async function finishTutorialTour(page){
  await expect.poll(()=>page.evaluate(()=>window.__monoidUx?.mode)).toBe('tour');
  for(let i=0;i<5;i++)await page.locator('#monoidBoardCoach').click();
  await expect.poll(()=>page.evaluate(()=>window.__monoidUx?.mode)).toBe('tutorial')
}

async function openTutorialHub(page){const persistent=page.locator('#tutorialHubButton');if(await persistent.isVisible())await persistent.click();else await page.locator('#learnMonoid').click();await expect(page.locator('#tutorialHub')).toBeVisible()}
async function startTutorialFromHub(page,kind){await openTutorialHub(page);await page.locator(`#tutorialHub [data-tutorial="${kind}"]`).click()}

async function placeTutorialTile(page,nextStep){
  const from=await page.locator('#hand .tile').first().boundingBox();expect(from).toBeTruthy();
  const target=await page.evaluate(()=>{const g=window.__monoidGame,E=window.IterionEngine,D=window.IterionData,t=g.state().hand[0],all=g.candidatesForIndex(0),c=all[0];if(!t||!c)return null;const p=E.pieceFrom(t,c.x,c.y,0,c.rr,-1),b=document.querySelector('#board').getBoundingClientRect();return{x:b.left+(p.rect.minx+p.rect.maxx)/2/E.G*b.width,y:b.top+(p.rect.miny+p.rect.maxy)/2/E.H*b.height+(D.DRAG_Y_OFFSET||72)}});expect(target).toBeTruthy();
  await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();await page.mouse.move(from.x-20,from.y+from.height/2);await page.mouse.move(target.x,target.y);await page.mouse.up();
  if(nextStep)await expect(page.locator('#tutorialStep')).toContainText(nextStep,{timeout:12000});
  await expect.poll(()=>page.evaluate(()=>window.__monoidGame.state().running),{timeout:12000}).toBe(false)
}

test('entry card uses keyboard, has no click-through and starts the real opening rule',async({page})=>{
  await page.setViewportSize({width:375,height:667});
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.locator('#titleCard')).toBeVisible();
  await expect(page.locator('#gameSelection')).toBeHidden();
  await page.locator('#titleCard').focus();await page.keyboard.press('Enter');
  await expect(page.locator('#titleCard')).toBeHidden();
  await expect(page.locator('#gameSelection')).toBeVisible();
  await expect(page.locator('#modeClassic .selectionDouble')).toBeVisible();
  await expect(page.locator('#firstRunChoice')).toBeVisible();await expect(page.locator('#startRun')).toHaveText('SKIP · START RUN');await expect(page.locator('#learnMonoid')).toBeVisible();await expect(page.locator('#learnMonoid')).toHaveText('TUTORIALS');await expect(page.locator('#tutorialHubButton')).toBeHidden();
  const controls=page.locator('#gameSelection button:visible');for(const control of await controls.all()){const box=await control.boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.y).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(375);expect(box.y+box.height).toBeLessThanOrEqual(667);expect(await control.getAttribute('aria-label')||await control.textContent()).not.toBe('')}
  expect(await page.evaluate(()=>window.__monoidGame.snapshot().turnCount)).toBe(0);
  await page.locator('#startRun').click();
  await expect(page.locator('#board')).toBeVisible();
  expect(await page.evaluate(()=>{const g=window.__monoidGame,hand=g.state().hand;return hand[0].a===hand[0].b&&hand.every((tile,i)=>!tile||((tile.a===tile.b)===(g.candidatesForIndex(i).length>0)))})).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('game mode carousel keeps its frame, swipes modes and blocks unavailable entries',async({page})=>{
  await page.setViewportSize({width:375,height:667});await page.goto('http://127.0.0.1:4173/');await page.locator('#titleCard').click();
  await expect(page.locator('#modeCarouselFrame')).toBeVisible();await expect(page.locator('.modeSlide')).toHaveCount(8);await expect(page.locator('#modeName')).toHaveText('CLASSIC');await expect(page.locator('#modeDescription')).toHaveText('The original machine');
  const frame=await page.locator('#modeCarouselFrame').boundingBox(),viewport=await page.locator('#modeCarouselViewport').boundingBox();expect(frame).toBeTruthy();expect(viewport).toBeTruthy();
  const neighbor=await page.locator('#modePrototype').boundingBox();expect(neighbor).toBeTruthy();expect(neighbor.x).toBeLessThan(frame.x+frame.width);expect(neighbor.x+neighbor.width).toBeGreaterThan(frame.x+frame.width);
  await page.mouse.move(viewport.x+viewport.width*.70,viewport.y+viewport.height*.5);await page.mouse.down();await page.mouse.move(viewport.x+viewport.width*.20,viewport.y+viewport.height*.5);await page.mouse.up();
  await expect(page.locator('#modeName')).toHaveText('PROTOTYPE');await expect(page.locator('#modeDescription')).toHaveText('Experimental rules');await expect(page.locator('#startRun')).toBeEnabled();
  await page.evaluate(()=>window.__monoidModes.select(2));await expect(page.locator('#modeDescription')).toHaveText('Not available');await expect(page.locator('#startRun')).toBeDisabled();
  await page.evaluate(()=>window.__monoidModes.select(1));await page.locator('#startRun').click();await expect(page.locator('#board')).toBeVisible();expect(await page.evaluate(()=>localStorage.getItem('iterion.activeRunMode.v1'))).toBe('prototype');
});

test('Game Selection keeps new, continue and tutorials separate and confirms replacement',async({page})=>{
  await page.setViewportSize({width:375,height:667});await page.goto('http://127.0.0.1:4173/');await page.locator('#titleCard').click();await page.locator('#startRun').click();const original=await page.evaluate(()=>window.__monoidGame.state().runId);
  await page.locator('#menuButton').click();await page.locator('#gameSelectionButton').click();await expect(page.locator('#firstRunChoice')).toBeHidden();await expect(page.locator('#startRun')).toHaveText('NEW RUN');await expect(page.locator('#continueRun')).toBeVisible();await expect(page.locator('#tutorialHubButton')).toBeVisible();await expect(page.locator('#replayTutorial')).toBeHidden();await expect(page.locator('#systemsTutorial')).toBeHidden();
  page.once('dialog',dialog=>dialog.dismiss());await page.locator('#startRun').click();await expect(page.locator('#gameSelection')).toBeVisible();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('iterion.activeRun.v1')).state.runId)).toBe(original);
  page.once('dialog',dialog=>dialog.accept());await page.locator('#startRun').click();await expect(page.locator('#board')).toBeVisible();expect(await page.evaluate(()=>window.__monoidGame.state().runId)).not.toBe(original);
});

test('Basics tutorial can be left and repeated without changing the saved run',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('http://127.0.0.1:4173/');await page.locator('#titleCard').click();await page.locator('#startRun').click();
  const saved=await page.evaluate(()=>localStorage.getItem('iterion.activeRun.v1'));
  await page.locator('#menuButton').click();await page.locator('#gameSelectionButton').click();await startTutorialFromHub(page,'basics');
  await expect.poll(()=>page.evaluate(()=>window.__monoidUx?.mode)).toBe('tour');await expect(page.locator('#monoidBoardCoach h2')).toHaveText('THE MACHINE');
  expect(await page.evaluate(()=>localStorage.getItem('iterion.activeRun.v1'))).toBe(saved);
  await page.locator('[data-ux-action="leave"]').click();await expect(page.locator('#gameSelection')).toBeVisible();
  await startTutorialFromHub(page,'basics');await finishTutorialTour(page);await expect(page.locator('#tutorialStep')).toContainText('1/6');
  await expect(page.locator('#reroll')).toBeDisabled();await expect(page.locator('#shopButton')).toBeDisabled();await expect(page.locator('#menuButton')).toBeDisabled();
  expect(await page.evaluate(()=>localStorage.getItem('iterion.activeRun.v1'))).toBe(saved);
});

test('Basics tutorial completes seven real legal placements and can retry',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4173/');await page.locator('#titleCard').click();await page.locator('#startRun').click();const saved=await page.evaluate(()=>localStorage.getItem('iterion.activeRun.v1'));await page.locator('#menuButton').click();await page.locator('#gameSelectionButton').click();await startTutorialFromHub(page,'basics');await finishTutorialTour(page);
  await placeTutorialTile(page,'2/6');expect(await page.evaluate(()=>window.__monoidGame.snapshot().board.length)).toBe(1);
  await placeTutorialTile(page,'3/6');expect(await page.evaluate(()=>window.__monoidGame.snapshot().turns.filter(e=>Number.isInteger(e.turn)).at(-1).ops)).toContain('+2');
  await placeTutorialTile(page,'4/6');expect(await page.evaluate(()=>window.__monoidGame.snapshot().board.length)).toBe(3);
  await placeTutorialTile(page,'5/6');expect(await page.evaluate(()=>window.__monoidGame.snapshot().turns.filter(e=>Number.isInteger(e.turn)).at(-1).ops)).toContain('×3');
  await placeTutorialTile(page,'6/6');
  await expect(page.locator('#monoidBoardCoach h2')).toHaveText('EXTEND THE ARM');await placeTutorialTile(page,null);expect(await page.evaluate(()=>window.__monoidGame.snapshot().board.length)).toBe(6);
  await expect(page.locator('#monoidBoardCoach h2')).toHaveText('T-SPLIT');await placeTutorialTile(page,null);
  await expect(page.locator('#overlayTitle')).toHaveText('SHOP');await expect(page.locator('#overlayBody')).toContainText('real Shop');await expect(page.locator('#overlayBody')).toContainText('Market appears only between stages');await expect(page.locator('#nextGameMechanics')).toBeVisible();
  expect(await page.evaluate(()=>{const s=window.__monoidGame.snapshot();return s.board.length===7&&s.shop.open})).toBe(true);
  await page.locator('#overlaySecondary').click();await finishTutorialTour(page);await expect(page.locator('#tutorialStep')).toContainText('1/6');
  await page.locator('#leaveTutorial').click();await expect(page.locator('#gameSelection')).toBeVisible();expect(await page.evaluate(()=>localStorage.getItem('iterion.activeRun.v1'))).toBe(saved);
});

test('Basics tutorial FINISH exits after the seventh real placement',async({page})=>{
  await page.setViewportSize({width:375,height:667});await page.goto('http://127.0.0.1:4173/');await page.locator('#titleCard').click();await startTutorialFromHub(page,'basics');await finishTutorialTour(page);
  for(const step of ['2/6','3/6','4/6','5/6','6/6'])await placeTutorialTile(page,step);await placeTutorialTile(page,null);await placeTutorialTile(page,null);
  await expect(page.locator('#overlayPrimary')).toHaveText('FINISH');await expect(page.locator('#nextGameMechanics')).toBeVisible();await page.locator('#overlayPrimary').click();await expect(page.locator('#gameSelection')).toBeVisible();
});

test('leaving during drag or an in-flight Basics placement never replaces the normal run',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4173/');await page.locator('#titleCard').click();await page.locator('#startRun').click();const saved=await page.evaluate(()=>localStorage.getItem('iterion.activeRun.v1'));await page.locator('#menuButton').click();await page.locator('#gameSelectionButton').click();await startTutorialFromHub(page,'basics');await finishTutorialTour(page);
  const tile=await page.locator('#hand .tile').first().boundingBox();await page.mouse.move(tile.x+tile.width/2,tile.y+tile.height/2);await page.mouse.down();await page.mouse.move(tile.x-20,tile.y+tile.height/2);await page.locator('#leaveTutorial').click({force:true});await expect(page.locator('#gameSelection')).toBeVisible();
  await startTutorialFromHub(page,'basics');await finishTutorialTour(page);await expect(page.locator('#reroll')).toBeDisabled();await placeTutorialTile(page,null);await page.locator('#leaveTutorial').click({force:true});await expect(page.locator('#gameSelection')).toBeVisible({timeout:12000});
  expect(await page.evaluate(()=>localStorage.getItem('iterion.activeRun.v1'))).toBe(saved);
});

for(const viewport of [{width:375,height:667},{width:390,height:844}]){
  test(`three exclusive screens and raised title ${viewport.width}`,async({page},testInfo)=>{
    await page.setViewportSize(viewport);
    await page.goto('http://127.0.0.1:4173/');
    await expect(page.locator('#titleCard')).toHaveText('MONOID');
    await expect(page.locator('.app')).toBeHidden();
    await expect(page.locator('#gameSelection')).toBeHidden();
    const title=await page.locator('#titleCard h1').boundingBox();
    expect(Math.abs(title.x+title.width/2-viewport.width/2)).toBeLessThan(2);
    const centerY=title.y+title.height/2;expect(centerY).toBeGreaterThan(viewport.height*.40);expect(centerY).toBeLessThan(viewport.height*.48);
    await page.screenshot({path:testInfo.outputPath('title-only.png')});
    await page.mouse.click(12,12);
    await expect(page.locator('#gameSelection')).toBeVisible();
    await expect(page.locator('#titleCard')).toBeHidden();
    await expect(page.locator('.app')).toBeHidden();
    expect(await page.evaluate(()=>localStorage.getItem('iterion.activeRun.v1'))).toBeNull();
    await page.screenshot({path:testInfo.outputPath('selection-only.png')});
    await page.locator('#startRun').click();
    await expect(page.locator('.app')).toBeVisible();
    await expect(page.locator('#entryFlow')).toBeHidden();
    await expect(page.locator('#titleCard')).toBeHidden();
    await expect(page.locator('#gameSelection')).toBeHidden();
    const run=await page.evaluate(()=>window.__monoidGame.exportState());
    await page.reload();
    await expect(page.locator('.app')).toBeHidden();
    await expect(page.locator('#titleCard')).toHaveText('MONOID');
    await page.locator('#titleCard').click();
    await page.locator('#continueRun').click();
    expect(await page.evaluate(()=>window.__monoidGame.exportState())).toEqual(run);
    await page.screenshot({path:testInfo.outputPath('game-only.png')});
  });
}

test('critical raised title and screen isolation survive a missing presentation stylesheet',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.route('**/ui-theme.css*',route=>route.abort());
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.locator('.app')).toBeHidden();
  await expect(page.locator('#titleCard')).toHaveText('MONOID');
  const title=await page.locator('#titleCard h1').boundingBox();
  expect(Math.abs(title.x+title.width/2-195)).toBeLessThan(2);
  const centerY=title.y+title.height/2;expect(centerY).toBeGreaterThan(844*.40);expect(centerY).toBeLessThan(844*.48);
  const assets=await page.locator('script[src],link[rel="stylesheet"]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('src')||n.getAttribute('href')));
  expect(assets.length).toBeGreaterThan(1);
  expect(assets.every(url=>/\?v=entry-(?:0311|0320)$/.test(url)||url==='ui-theme.css?v=20260918.4'||/^(?:game|help)\.js\?v=20260918\.9$/.test(url)||/(?:pwa|ui-extras|ui-runtime-fixes|ui-late-polish|update-check|mode-carousel|qa-presets)\.js\?v=202609(?:17|18)\.\d+$/.test(url))).toBe(true);
  await page.mouse.click(12,12);
  await expect(page.locator('#titleCard')).toBeHidden();
  await expect(page.locator('#gameSelection')).toBeVisible();
  await expect(page.locator('.app')).toBeHidden();
});
