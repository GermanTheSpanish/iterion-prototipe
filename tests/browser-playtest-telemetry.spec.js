const{test,expect}=require('@playwright/test');

test('playtest identity persists across continue and run sequence increments only for a new run',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4173/');
  await page.locator('#titleCard').click();await page.locator('#startRun').click();
  const first=await page.evaluate(()=>window.__monoidPlaytest);expect(first.playerId).toMatch(/^P-[0-9A-Z]{7}$/);expect(first.runSequence).toBe(1);expect(first.runId).toBeTruthy();
  await page.waitForTimeout(120);await page.locator('#menuButton').click();await page.locator('#viewrun').click();await expect(page.locator('.runDataText')).toHaveValue(/PLAYTEST TELEMETRY/);await expect(page.locator('.runDataText')).toHaveValue(new RegExp(first.playerId));await expect(page.locator('.runDataText')).toHaveValue(/Run #1/);
  await page.reload();await page.locator('#titleCard').click();await expect(page.locator('#continueRun')).toBeVisible();await page.locator('#continueRun').click();
  const continued=await page.evaluate(()=>window.__monoidPlaytest);expect(continued.playerId).toBe(first.playerId);expect(continued.runSequence).toBe(1);expect(continued.runId).toBe(first.runId);expect(continued.sessions).toBeGreaterThanOrEqual(2);
  page.once('dialog',dialog=>dialog.accept());await page.locator('#menuButton').click();await page.locator('#reset').click();await expect.poll(()=>page.evaluate(()=>window.__monoidPlaytest?.runSequence)).toBe(2);
  const second=await page.evaluate(()=>window.__monoidPlaytest);expect(second.playerId).toBe(first.playerId);expect(second.runId).not.toBe(first.runId);expect(second.batchId).toBe(first.batchId);
  const batch=await page.evaluate(()=>window.__monoidPlaytestBatch);expect(batch.batchId).toBe(first.batchId);
  const archived=await page.evaluate(async playerId=>(await window.__monoidPlaytestBatchStore.pending(playerId)).map(r=>({runId:r.runId,status:r.status,debug:r.debugText.includes('MONOID DEBUG')})),first.playerId);
  expect(archived).toContainEqual({runId:first.runId,status:'abandoned',debug:true})
});

test('performance samples stay with the archived run and are absent from the next run',async({page})=>{
  test.setTimeout(60000);
  await page.addInitScript(()=>{localStorage.setItem('iterion.entryBypass.v1','true');localStorage.setItem('monoid.firstRunBriefing.v1','seen')});
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4173/');
  await expect(page.locator('#board')).toBeVisible(); // entryBypass starts the run directly.
  const first=await page.evaluate(()=>window.__monoidGame.state().runId);
  const position=await page.evaluate(()=>{
    const game=window.__monoidGame,E=window.IterionEngine,D=window.IterionData,s=game.state();
    const index=s.hand.findIndex((tile,i)=>tile&&game.candidatesForIndex(i).length),tile=s.hand[index],c=game.candidatesForIndex(index)[0],p=E.pieceFrom(tile,c.x,c.y,0,c.rr,-1);
    return{index,x:(p.rect.minx+p.rect.maxx)/2/E.G,y:(p.rect.miny+p.rect.maxy)/2/E.H,offset:D.DRAG_Y_OFFSET||0}
  });
  expect(position.index).toBeGreaterThanOrEqual(0);
  const tile=await page.locator('#hand .tile').nth(position.index).boundingBox(),board=await page.locator('#board').boundingBox();
  await page.mouse.move(tile.x+tile.width/2,tile.y+tile.height/2);await page.mouse.down();
  await page.mouse.move(tile.x-20,tile.y+tile.height/2,{steps:3});
  await page.mouse.move(board.x+position.x*board.width,board.y+position.y*board.height+position.offset,{steps:5});
  await page.mouse.up();
  await expect.poll(()=>page.evaluate(()=>window.__monoidPerformance.length),{timeout:20000}).toBeGreaterThan(0);
  expect(await page.evaluate(()=>window.__monoidPerformance.every(sample=>sample.runId===window.__monoidGame.state().runId))).toBe(true);
  page.once('dialog',dialog=>dialog.accept());await page.locator('#menuButton').click();await page.locator('#reset').click();
  await expect.poll(()=>page.evaluate(()=>window.__monoidGame.state().runId)).not.toBe(first);
  expect(await page.evaluate(()=>window.__monoidPerformance)).toEqual([]);
  const archived=await page.evaluate(async id=>{
    const playerId=window.__monoidPlaytest.playerId,records=await window.__monoidPlaytestBatchStore.pending(playerId);
    return records.find(record=>record.runId===id)?.debugText||''
  },first);
  expect(archived).toMatch(/PERFORMANCE TELEMETRY\nMove 1:/);
  const newDebug=await page.evaluate(()=>window.__monoidPerformance.length);
  expect(newDebug).toBe(0)
});
