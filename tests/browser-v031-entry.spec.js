const {test,expect}=require('@playwright/test');

async function placeTutorialTile(page,nextStep){
  const from=await page.locator('#hand .tile').first().boundingBox();
  const target=await page.evaluate(()=>{const g=window.__monoidGame,E=window.IterionEngine,t=g.state().hand[0],all=g.candidatesForIndex(0),c=window.__monoidFlow.tutorialStep===4?(all.find((c,n)=>{const p=E.pieceFrom(t,c.x,c.y,0,c.rr,100000+n);p.tile=t;return E.bestSignal(p.id,[...g.state().pieces,p],{initialOutput:t.a+t.b,bifurcate:true}).rebounds>0})||all[0]):all[0],p=E.pieceFrom(t,c.x,c.y,0,c.rr,-1),b=document.querySelector('#board').getBoundingClientRect();return{x:b.left+(p.rect.minx+p.rect.maxx)/2/E.G*b.width,y:b.top+(p.rect.miny+p.rect.maxy)/2/E.H*b.height+72}});
  await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();await page.mouse.move(from.x-20,from.y+from.height/2);await page.mouse.move(target.x,target.y);await page.mouse.up();
  if(nextStep)await expect(page.locator('#tutorialStep')).toContainText(nextStep,{timeout:12000});
}

test('entry card uses keyboard, has no click-through and starts the real opening rule',async({page})=>{
  await page.setViewportSize({width:375,height:667});
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.locator('#titleCard')).toBeVisible();
  await page.locator('#titleCard').focus();await page.keyboard.press('Enter');
  await expect(page.locator('#gameSelection')).toBeVisible();
  await expect(page.locator('#modeClassic .selectionDouble')).toBeVisible();
  expect(await page.evaluate(()=>window.__monoidGame.snapshot().turnCount)).toBe(0);
  await page.locator('#startRun').click();
  await expect(page.locator('#board')).toBeVisible();
  expect(await page.evaluate(()=>{const g=window.__monoidGame;return g.state().hand[0].a===g.state().hand[0].b&&g.candidatesForIndex(1).length===0})).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('tutorial can be left and repeated without changing the saved run',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('http://127.0.0.1:4173/');await page.locator('#titleCard').click();await page.locator('#startRun').click();
  const saved=await page.evaluate(()=>localStorage.getItem('iterion.activeRun.v1'));
  await page.locator('#menuButton').click();await page.locator('#gameSelectionButton').click();await page.locator('#replayTutorial').click();
  await expect(page.locator('#tutorialInstruction')).toContainText('double');
  expect(await page.evaluate(()=>localStorage.getItem('iterion.activeRun.v1'))).toBe(saved);
  await page.locator('#leaveTutorial').click();await expect(page.locator('#gameSelection')).toBeVisible();
  await page.locator('#replayTutorial').click();await expect(page.locator('#tutorialStep')).toContainText('1/6');
  expect(await page.evaluate(()=>localStorage.getItem('iterion.activeRun.v1'))).toBe(saved);
});

test('tutorial completes with real placements and can retry',async({page})=>{
  test.setTimeout(60000);await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4173/');await page.locator('#titleCard').click();await page.locator('#learnMonoid').click();
  await placeTutorialTile(page,'2/6');await placeTutorialTile(page,'3/6');await placeTutorialTile(page,'4/6');await placeTutorialTile(page,'6/6');
  await expect(page.locator('#overlayTitle')).toHaveText('SHOP & MARKET');
  expect(await page.evaluate(()=>{const s=window.__monoidGame.snapshot();return s.round.clears.length===1&&s.board.length===4&&s.turns.some(e=>e.rebounds>0)})).toBe(true);
  await page.locator('#overlaySecondary').click();await expect(page.locator('#tutorialStep')).toContainText('1/6');
  await page.locator('#leaveTutorial').click();await expect(page.locator('#gameSelection')).toBeVisible();
});
