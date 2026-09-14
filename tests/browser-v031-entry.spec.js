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
  await expect(page.locator('#reroll')).toBeDisabled();await expect(page.locator('#shopButton')).toBeDisabled();await expect(page.locator('#menuButton')).toBeDisabled();
  expect(await page.evaluate(()=>localStorage.getItem('iterion.activeRun.v1'))).toBe(saved);
});

test('tutorial completes with real placements and can retry',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4173/');await page.locator('#titleCard').click();await page.locator('#startRun').click();const saved=await page.evaluate(()=>localStorage.getItem('iterion.activeRun.v1'));await page.locator('#menuButton').click();await page.locator('#gameSelectionButton').click();await page.locator('#replayTutorial').click();
  await placeTutorialTile(page,'2/6');expect(await page.evaluate(()=>window.__monoidGame.snapshot().board.length)).toBe(1);
  await placeTutorialTile(page,'3/6');expect(await page.evaluate(()=>window.__monoidGame.snapshot().turns.filter(e=>Number.isInteger(e.turn)).at(-1).ops)).toContain('+2');
  await placeTutorialTile(page,'4/6');expect(await page.evaluate(()=>window.__monoidGame.snapshot().board.length)).toBe(3);
  await placeTutorialTile(page,'5/6');expect(await page.evaluate(()=>window.__monoidGame.snapshot().turns.filter(e=>Number.isInteger(e.turn)).at(-1).ops)).toContain('×3');
  await placeTutorialTile(page,'6/6');
  await expect(page.locator('#overlayTitle')).toHaveText('SHOP');await expect(page.locator('#overlayBody')).toContainText('real Shop');await expect(page.locator('#overlayBody')).toContainText('Market appears only between stages');
  expect(await page.evaluate(()=>{const s=window.__monoidGame.snapshot();return s.round.clears.length===1&&s.board.length===5&&s.shop.open&&s.turns.some(e=>Number.isInteger(e.turn)&&e.rebounds>0)})).toBe(true);
  await page.locator('#overlaySecondary').click();await expect(page.locator('#tutorialStep')).toContainText('1/6');
  await page.locator('#leaveTutorial').click();await expect(page.locator('#gameSelection')).toBeVisible();expect(await page.evaluate(()=>localStorage.getItem('iterion.activeRun.v1'))).toBe(saved);
});

test('tutorial FINISH exits after the fifth real placement',async({page})=>{
  await page.setViewportSize({width:375,height:667});await page.goto('http://127.0.0.1:4173/');await page.locator('#titleCard').click();await page.locator('#learnMonoid').click();
  for(const step of ['2/6','3/6','4/6','5/6','6/6'])await placeTutorialTile(page,step);
  await expect(page.locator('#overlayPrimary')).toHaveText('FINISH');await page.locator('#overlayPrimary').click();await expect(page.locator('#gameSelection')).toBeVisible();
});

test('leaving during drag or an in-flight placement never replaces the normal run',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4173/');await page.locator('#titleCard').click();await page.locator('#startRun').click();const saved=await page.evaluate(()=>localStorage.getItem('iterion.activeRun.v1'));await page.locator('#menuButton').click();await page.locator('#gameSelectionButton').click();await page.locator('#replayTutorial').click();
  const tile=await page.locator('#hand .tile').first().boundingBox();await page.mouse.move(tile.x+tile.width/2,tile.y+tile.height/2);await page.mouse.down();await page.mouse.move(tile.x-20,tile.y+tile.height/2);await page.locator('#leaveTutorial').click({force:true});await expect(page.locator('#gameSelection')).toBeVisible();
  await page.locator('#replayTutorial').click();await expect(page.locator('#reroll')).toBeDisabled();await placeTutorialTile(page,null);await page.locator('#leaveTutorial').click({force:true});await expect(page.locator('#gameSelection')).toBeVisible({timeout:12000});
  expect(await page.evaluate(()=>localStorage.getItem('iterion.activeRun.v1'))).toBe(saved);
});
