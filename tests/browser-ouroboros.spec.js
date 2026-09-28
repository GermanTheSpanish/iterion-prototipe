const {test,expect}=require('@playwright/test');
const BASE='http://127.0.0.1:4173/';

test('Ouroboros turns the machine into the playable surface on mobile',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(`${BASE}?qa=infinite16&ci=1`);
  await expect(page.locator('.app')).toBeVisible({timeout:12000});
  const saved=await page.evaluate(()=>{
    const game=window.__monoidGame,saved=game.exportState(),s=saved.state;
    s.ouroborosMode=true;s.ouroborosStartedRound=s.round+1;s.hand=[];s.reserve=[];s.cleared=false;s.blocked=false;s.needsReroll=false;s.failureReason=null;s.running=false;s.pendingCircuit=null;s.pendingModPlacement=null;s.shopOpen=false;s.shopType=null;
    return saved
  });
  await page.goto(BASE);await page.evaluate(saved=>{localStorage.setItem('iterion.activeRun.v1',JSON.stringify(saved));localStorage.setItem('iterion.activeRunMode.v1','classic');localStorage.setItem('iterion.tutorialChoice.v1','made')},saved);await page.locator('#titleCard').click();await expect(page.locator('#continueRun')).toBeVisible();await page.locator('#continueRun').click();
  await expect(page.locator('body')).toHaveClass(/ouroborosPalette/);await expect(page.locator('#stageRound')).toContainText('OUROBOROS');
  expect(await page.evaluate(()=>{const style=getComputedStyle(document.body);return{bg:style.getPropertyValue('--bg').trim(),paper:style.getPropertyValue('--paper').trim(),paper2:style.getPropertyValue('--paper2').trim()}})).toEqual({bg:'#350b09',paper:'#43100d',paper2:'#551713'});
  const mismatchFreedom=await page.evaluate(()=>{
    const game=window.__monoidGame,E=window.IterionEngine,s=game.state(),dirs=E.DIR,step=E.S;
    for(const moving of s.pieces){
      const others=s.pieces.filter(piece=>piece.id!==moving.id);
      for(const target of others)for(const targetCube of target.cubes)for(let rr=0;rr<4;rr++)for(const movingHalf of [0,1])for(let side=0;side<4;side++){
        const desiredX=targetCube.x+dirs[side][0]*step,desiredY=targetCube.y+dirs[side][1]*step,x=desiredX-(movingHalf?dirs[rr][0]*step:0),y=desiredY-(movingHalf?dirs[rr][1]*step:0),normal=E.validatePlacement(moving.tile,x,y,0,rr,others);
        if(normal.reason!=='value-mismatch')continue;
        const preview=game.ouroborosPlacementPreview(moving.tile.id,{x,y,z:0,rr});
        return{found:true,previewOk:preview.ok,previewReason:preview.reason||null}
      }
    }
    return{found:false,previewOk:false,previewReason:null}
  });
  expect(mismatchFreedom.found).toBe(true);expect(mismatchFreedom.previewOk).toBe(true);expect(mismatchFreedom.previewReason).toBeNull();
  await expect(page.locator('#hand .ouroborosAction')).toHaveCount(2);await expect(page.locator('#hand .ouroborosFire')).toHaveText('FIRE');await expect(page.locator('#hand .domino')).toHaveCount(1);
  expect(await page.evaluate(()=>({phase:window.__monoidGame.snapshot().endless.phase,hand:window.__monoidGame.state().hand.length,maxGeneration:window.__monoidGame.snapshot().powerSets.maxGeneration}))).toEqual({phase:'ouroboros',hand:0,maxGeneration:3});
  const first=page.locator('#board .piece').first();await first.click();await expect(first).toHaveClass(/ouroborosSelected/);
  const before=await page.evaluate(()=>window.__monoidGame.state().roundTurn);await page.locator('#hand .ouroborosFire').click();await expect.poll(()=>page.evaluate(()=>window.__monoidGame.state().running),{timeout:15000}).toBe(false);
  expect(await page.evaluate(()=>window.__monoidGame.state().roundTurn)).toBe(before+1);expect(await page.evaluate(()=>window.__monoidGame.state().events.some(e=>e.type==='ouroboros-fire'))).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth)).toBe(true)
});
