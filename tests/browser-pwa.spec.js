const {test,expect}=require('@playwright/test');
const BUILD='20260924.1',NEXT_BUILD='20260924.2';

async function openTutorialHub(page){const persistent=page.locator('#tutorialHubButton');if(await persistent.isVisible())await persistent.click();else await page.locator('#learnMonoid').click();await expect(page.locator('#tutorialHub')).toBeVisible()}
async function startTutorialFromHub(page,kind){await openTutorialHub(page);await page.locator(`#tutorialHub [data-tutorial="${kind}"]`).click()}

test('PWA shell exposes the manifest and registers a network-fresh service worker',async({page})=>{
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href',/manifest\.webmanifest$/);
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content','yes');
  expect(await page.evaluate(()=>window.__monoidPwa?.installed)).toBe(false);
  await expect.poll(()=>page.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration())),{timeout:10000}).toBe(true);
  const manifest=await page.evaluate(async()=>await (await fetch('manifest.webmanifest',{cache:'no-store'})).json());
  expect(manifest.display_override[0]).toBe('fullscreen');expect(manifest.display).toBe('standalone');
  expect(await page.evaluate(async()=>await caches.keys())).toEqual([])
});

test('installed mode intercepts Android-style Back and opens the run menu instead of leaving gameplay',async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('monoid.firstRunBriefing.v1','seen');
    const native=window.matchMedia.bind(window);window.matchMedia=query=>{
      if(query==='(display-mode: fullscreen)'||query==='(display-mode: standalone)')return{matches:true,media:query,onchange:null,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},dispatchEvent(){return false}};
      return native(query)
    }
  });
  await page.goto('http://127.0.0.1:4173/');await page.locator('#titleCard').click();await page.locator('#startRun').click();
  await expect.poll(()=>page.evaluate(()=>window.__monoidPwa?.installed)).toBe(true);
  await expect.poll(()=>page.evaluate(()=>!!history.state?.monoidBackGuardV1)).toBe(true);
  await page.evaluate(()=>history.back());
  await expect.poll(()=>page.locator('#gameMenu').evaluate(el=>el.open)).toBe(true);
  expect(await page.evaluate(()=>window.__monoidPwa.backIntercepts)).toBeGreaterThan(0)
});

test('title reveal follows DOMINO order without a pre-animation flash',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4173/');
  await expect.poll(()=>page.evaluate(()=>window.__MONOID_BUILD)).toBe('20260924.1');
  await expect(page.locator('#devBuildStamp')).toContainText(`v0.44.0 · build ${BUILD}`);
  const letters=page.locator('#titleCard .titleLetter');await expect(letters).toHaveCount(6);const title=page.locator('#titleCard h1');await expect(title).toHaveAttribute('aria-label','MONOID');
  expect(await title.evaluate(el=>getComputedStyle(el).visibility)).toBe('visible');
  const delays=await letters.evaluateAll(nodes=>nodes.map(n=>parseFloat(getComputedStyle(n).animationDelay)||0));
  const duration=await letters.first().evaluate(n=>parseFloat(getComputedStyle(n).animationDuration)||0);
  expect(delays[5]).toBeLessThan(delays[1]);expect(delays[1]).toBeLessThan(delays[0]);expect(delays[0]).toBeLessThan(delays[4]);expect(delays[4]).toBeLessThan(delays[2]);expect(delays[2]).toBeLessThan(delays[3]);
  expect(Math.max(...delays)+duration).toBeGreaterThanOrEqual(1.55);
  const box=await title.boundingBox();expect(box).toBeTruthy();expect(box.y+box.height/2).toBeGreaterThan(844*.40);expect(box.y+box.height/2).toBeLessThan(844*.48);
  await page.locator('#titleCard').click();await expect(page.locator('#learnMonoid')).toBeVisible();await expect(page.locator('#learnMonoid')).toHaveText('TUTORIALS');await expect(page.locator('#tutorialHubButton')).toBeHidden();await expect(page.locator('#replayTutorial')).toBeHidden();await expect(page.locator('#systemsTutorial')).toBeHidden();
  await openTutorialHub(page);await expect(page.locator('#tutorialHub')).toContainText('BASICS · 2 MIN');await expect(page.locator('#tutorialHub')).toContainText('GAME MECHANICS · 3 MIN');await expect(page.locator('#tutorialHub')).toContainText('MODIFIERS · 2 MIN')
});

test('modifier mini tutorial uses game domino language and a clean full-screen hierarchy',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4173/');await page.locator('#titleCard').click();await openTutorialHub(page);await page.locator('[data-tutorial="modifiers"]').click();
  const dialog=page.locator('#modifierTutorialDialog');await expect(dialog).toBeVisible();const dialogBox=await dialog.boundingBox();expect(dialogBox.width).toBeGreaterThanOrEqual(389);expect(dialogBox.height).toBeGreaterThanOrEqual(843);
  const steps=[
    {title:'MODS LIVE ON TILES',locator:'.modifierTutorNote',text:'Hold any Modded tile',tiles:2},
    {title:'BUILD → REWARD',locator:'.modifierTutorNote',text:'CORNER',tiles:3},
    {title:'SOME MODS CHANGE SIGNALS',locator:'.modifierTutorBody',text:'ZERO PORT',tiles:2},
    {title:'SOME MODS CHANGE THE MACHINE',locator:'.modifierTutorBody',text:'LONG CHAIN',tiles:4}
  ];
  for(let i=0;i<steps.length;i++){
    const step=steps[i];await expect(page.locator('.modifierTutorTitle')).toHaveText(step.title);await expect(page.locator('.modifierTutorVisual .domino')).toHaveCount(step.tiles);await expect(page.locator(step.locator)).toContainText(step.text);await expect(page.locator('.modifierTutorKicker')).toHaveText(`MODIFIERS · ${i+1}/4`);await page.locator('.modifierNext').click()
  }
  await expect(dialog).toBeHidden()
});

test('modifier mini tutorial stays readable on compact phones and respects reduced motion',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:375,height:667});await page.goto('http://127.0.0.1:4173/');await page.locator('#titleCard').click();await openTutorialHub(page);await page.locator('[data-tutorial="modifiers"]').click();
  await expect(page.locator('#modifierTutorialDialog')).toBeVisible();const layout=await page.evaluate(()=>{const dialog=document.querySelector('#modifierTutorialDialog'),body=document.querySelector('.modifierTutorBody'),note=document.querySelector('.modifierTutorNote'),focus=document.querySelector('.modifierTutorTerminal .focus');return{scrolls:dialog.scrollHeight>dialog.clientHeight||dialog.scrollWidth>dialog.clientWidth,bodySize:parseFloat(getComputedStyle(body).fontSize),noteSize:parseFloat(getComputedStyle(note).fontSize),animation:getComputedStyle(focus).animationName}});expect(layout.scrolls).toBe(false);expect(layout.bodySize).toBeGreaterThanOrEqual(16);expect(layout.noteSize).toBeGreaterThanOrEqual(13);expect(layout.animation).toBe('none');
});

test('board-led mobile layout uses MONOID as menu and gives the board the full gameplay width',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('monoid.firstRunBriefing.v1','seen'));
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4173/');await page.locator('#titleCard').click();await page.locator('#startRun').click();
  const menu=page.locator('#menuButton');await expect(menu).toHaveText('MONOID');await expect(menu).toHaveAttribute('aria-label','Open game menu');
  const wordmark=await page.locator('.wordmark').boundingBox();expect(Math.abs(wordmark.x+wordmark.width/2-195)).toBeLessThan(2);
  const board=await page.locator('#board').boundingBox();expect(board.width).toBeGreaterThan(340);
  const hand=await page.locator('#hand').boundingBox(),handDomino=await page.locator('#hand .domino').first().boundingBox();expect(hand.y).toBeGreaterThanOrEqual(board.y+board.height);expect(handDomino.height/handDomino.width).toBeCloseTo(2,1);expect(await page.locator('#hand').evaluate(el=>getComputedStyle(el).flexDirection)).toBe('row');
  await menu.click();await expect(page.locator('#menuHelpButton')).toHaveText('Rulebook');await expect(page.locator('#menuHelpButton')).toBeVisible();await page.locator('#closeMenu').click();
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth)).toBe(true)
});

test('tutorial tour prioritises TAP TO CONTINUE over Leave',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4173/');await page.locator('#titleCard').click();await startTutorialFromHub(page,'basics');
  await expect(page.locator('#monoidBoardCoach')).toContainText('TAP TO CONTINUE');const hierarchy=await page.evaluate(()=>{const card=document.querySelector('#monoidBoardCoach'),tap=card.querySelector('.boardCoachActions span'),leave=card.querySelector('[data-ux-action="leave"]');return{tapSize:parseFloat(getComputedStyle(tap).fontSize),tapWeight:Number(getComputedStyle(tap).fontWeight),leaveSize:parseFloat(getComputedStyle(leave).fontSize),leaveOpacity:parseFloat(getComputedStyle(leave).opacity)}});expect(hierarchy.tapSize).toBeGreaterThan(hierarchy.leaveSize);expect(hierarchy.tapWeight).toBeGreaterThan(700);expect(hierarchy.leaveOpacity).toBeLessThan(.6)
});

test('manual update check confirms the current build',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('monoid.firstRunBriefing.v1','seen'));
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4173/');await page.locator('#titleCard').click();await page.locator('#startRun').click();await page.locator('#menuButton').click();
  await expect(page.locator('#checkForUpdates')).toBeVisible();await page.locator('#checkForUpdates').click();
  await expect(page.locator('#checkForUpdates')).toContainText(`UP TO DATE · ${BUILD}`)
});

test('silent update detection offers reload and preserves the active run before refresh',async({page})=>{
  await page.addInitScript(nextBuild=>{
    localStorage.setItem('monoid.firstRunBriefing.v1','seen');
    const nativeFetch=window.fetch.bind(window);
    window.fetch=(input,init)=>{
      const url=typeof input==='string'?input:(input&&typeof input.url==='string'?input.url:String(input));
      if(url.includes('build.json'))return Promise.resolve(new Response(JSON.stringify({version:'0.44.0',build:nextBuild}),{status:200,headers:{'Content-Type':'application/json'}}));
      return nativeFetch(input,init)
    }
  },NEXT_BUILD);
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4173/');await page.locator('#titleCard').click();await page.locator('#startRun').click();
  await expect.poll(()=>page.evaluate(()=>window.__monoidUpdate?.updateAvailable),{timeout:5000}).toBe(true);
  const before=await page.evaluate(()=>localStorage.getItem('iterion.activeRun.v1'));expect(before).toBeTruthy();
  await page.locator('#menuButton').click();await expect(page.locator('#checkForUpdates')).toContainText('UPDATE AVAILABLE');await expect(page.locator('#applyMonoidUpdate')).toBeVisible();
  await page.locator('#applyMonoidUpdate').click();await page.waitForURL(new RegExp(`_monoidUpdate=${NEXT_BUILD.replaceAll('.','\\.')}`),{timeout:10000});
  expect(await page.evaluate(()=>localStorage.getItem('iterion.activeRun.v1'))).toBe(before)
});
