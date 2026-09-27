const {test,expect}=require('@playwright/test');
const BASE='http://127.0.0.1:4173/';

test('Ouroboros turns the machine into the playable surface on mobile',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(`${BASE}?qa=infinite16&ci=1`);
  await expect(page.locator('.app')).toBeVisible({timeout:12000});
  await page.evaluate(()=>{
    const game=window.__monoidGame,saved=game.exportState(),s=saved.state;
    s.ouroborosMode=true;s.ouroborosStartedRound=s.round+1;s.hand=[];s.reserve=[];s.cleared=false;s.blocked=false;s.needsReroll=false;s.failureReason=null;s.running=false;s.pendingCircuit=null;s.pendingModPlacement=null;s.shopOpen=false;s.shopType=null;
    localStorage.setItem('iterion.activeRun.v1',JSON.stringify(saved));localStorage.setItem('iterion.activeRunMode.v1','classic');localStorage.setItem('iterion.tutorialChoice.v1','made')
  });
  await page.goto(BASE);await page.locator('#titleCard').click();await expect(page.locator('#continueRun')).toBeVisible();await page.locator('#continueRun').click();
  await expect(page.locator('body')).toHaveClass(/ouroborosPalette/);await expect(page.locator('#stageRound')).toContainText('OUROBOROS');
  await expect(page.locator('#hand .ouroborosAction')).toHaveCount(2);await expect(page.locator('#hand .ouroborosFire')).toHaveText('FIRE');await expect(page.locator('#hand .domino')).toHaveCount(1);
  expect(await page.evaluate(()=>({phase:window.__monoidGame.snapshot().endless.phase,hand:window.__monoidGame.state().hand.length,maxGeneration:window.__monoidGame.snapshot().powerSets.maxGeneration}))).toEqual({phase:'ouroboros',hand:0,maxGeneration:3});
  const first=page.locator('#board .piece').first();await first.click();await expect(first).toHaveClass(/ouroborosSelected/);
  const before=await page.evaluate(()=>window.__monoidGame.state().roundTurn);await page.locator('#hand .ouroborosFire').click();await expect.poll(()=>page.evaluate(()=>window.__monoidGame.state().running),{timeout:15000}).toBe(false);
  expect(await page.evaluate(()=>window.__monoidGame.state().roundTurn)).toBe(before+1);expect(await page.evaluate(()=>window.__monoidGame.state().events.some(e=>e.type==='ouroboros-fire'))).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth)).toBe(true)
});
