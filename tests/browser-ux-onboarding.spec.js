const {test,expect}=require('@playwright/test');

async function enterSelection(page){await page.goto('http://127.0.0.1:4173/');await page.locator('#titleCard').click();await expect(page.locator('#gameSelection')).toBeVisible()}
async function startTutorialFromHub(page,kind){await page.locator('#tutorialHubButton').click();await page.locator(`#tutorialHub [data-tutorial="${kind}"]`).click()}
async function assertNoPageScroll(page){expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth)).toBe(true)}
async function assertCommerceIsDedicatedOverlay(page){const contained=await page.evaluate(()=>{const m=document.querySelector('.commerceModal').getBoundingClientRect(),b=document.querySelector('.boardShell').getBoundingClientRect();return m.left>=b.left-1&&m.right<=b.right+1&&m.top>=b.top-1&&m.bottom<=b.bottom+1});expect(contained).toBe(false);await expect(page.locator('body')).not.toHaveClass(/monoidCommerceActive/)}
async function finishUiTour(page){for(let i=0;i<5;i++)await page.locator('#monoidBoardCoach').click();await expect.poll(()=>page.evaluate(()=>window.__monoidUx?.mode)).toBe('tutorial')}
async function assertTutorialHandGuidance(page){await expect(page.locator('#hand .tile')).toHaveCount(5);expect(await page.locator('#hand .tile').evaluateAll(nodes=>nodes.filter(n=>!n.disabled).length)).toBe(1);await expect(page.locator('#hand .tile').first()).not.toHaveClass(/tutorialLocked/);for(let i=1;i<5;i++)await expect(page.locator('#hand .tile').nth(i)).toHaveClass(/tutorialLocked/)}

async function dropCurrentTutorialTile(page,candidateIndex=0){
  const tile=page.locator('#hand .tile').first(),box=await tile.boundingBox();expect(box).toBeTruthy();
  const target=await page.evaluate(index=>{const g=window.__monoidGame,E=window.IterionEngine,D=window.IterionData,t=g.state().hand[0],all=g.candidatesForIndex(0),c=all[Math.max(0,Math.min(all.length-1,index))],r=document.querySelector('#board').getBoundingClientRect();if(!t||!c)return null;const p=E.pieceFrom(t,c.x,c.y,0,c.rr,-1);return{x:r.left+((p.rect.minx+p.rect.maxx)/2/E.G)*r.width,y:r.top+((p.rect.miny+p.rect.maxy)/2/E.H)*r.height+(D.DRAG_Y_OFFSET||0)}},candidateIndex);
  expect(target).toBeTruthy();const sx=box.x+box.width/2,sy=box.y+box.height/2;await page.mouse.move(sx,sy);await page.mouse.down();await page.mouse.move(sx+18,sy,{steps:2});await page.mouse.move(target.x,target.y,{steps:6});await page.mouse.up()
}
async function placeCurrentTutorialTile(page,candidateIndex=0){const before=await page.evaluate(()=>window.__monoidGame.state().turn);await dropCurrentTutorialTile(page,candidateIndex);await expect.poll(()=>page.evaluate(()=>window.__monoidGame.state().turn),{timeout:12000}).toBe(before+1);await expect.poll(()=>page.evaluate(()=>window.__monoidGame.state().running),{timeout:12000}).toBe(false)}

async function chooseCandidateMatching(page,predicateSource){
  return page.evaluate(source=>{const g=window.__monoidGame,E=window.IterionEngine,D=window.IterionData,s=g.state(),tile=s.hand[0],cs=g.candidatesForIndex(0),fn=new Function('c','n','g','E','D','s','tile',`return (${source});`);for(let n=0;n<cs.length;n++)if(fn(cs[n],n,g,E,D,s,tile))return n;return-1},predicateSource)
}

test('BASICS tour isolates the real UI and exposes every canonical root placement',async({page})=>{
  await page.setViewportSize({width:390,height:844});await enterSelection(page);await expect(page.locator('#tutorialHubButton')).toBeVisible();await expect(page.locator('#systemsTutorial')).toBeHidden();await page.locator('#learnMonoid').click();
  await expect.poll(()=>page.evaluate(()=>window.__monoidUx?.mode)).toBe('tour');
  const targets=['#board','#targetDetail','#scoreDetail','.movesMeta','.handRail'],headings=['THE MACHINE','TARGET','SCORE','MOVES','HAND'];
  for(let i=0;i<targets.length;i++){await expect.poll(()=>page.evaluate(()=>window.__monoidUx?.tourStep)).toBe(i);await expect(page.locator(targets[i])).toHaveClass(/monoidTourHighlight/);await expect(page.locator('#monoidBoardCoach h2')).toHaveText(headings[i]);const focus=await page.locator(targets[i]).evaluate(el=>({z:getComputedStyle(el).zIndex,shade:getComputedStyle(document.body,'::before').backgroundColor}));expect(Number(focus.z)).toBeGreaterThan(500);expect(focus.shade).not.toBe('rgba(0, 0, 0, 0)');await page.locator('#monoidBoardCoach').click()}
  await expect(page.locator('#monoidBoardCoach h2')).toHaveText('THE FIRST TILE');await expect(page.locator('#monoidBoardCoach')).toContainText('shake left ↔ right to rotate it');await assertTutorialHandGuidance(page);
  const rootCandidates=await page.evaluate(()=>window.__monoidGame.candidatesForIndex(0).length);expect(rootCandidates).toBeGreaterThan(20);
  const originalRR=await page.evaluate(()=>window.__monoidGame.state().rootRR);await page.evaluate(()=>{window.__monoidGame.rotateRoot();document.body.dataset.rotationProbe=String(Date.now())});await expect.poll(()=>page.evaluate(()=>window.__monoidUx?.rotationSeen)).toBe(true);await expect(page.locator('#monoidBoardCoach')).toContainText('Rotated. Now place the Double anywhere.');expect(await page.evaluate(()=>window.__monoidGame.state().rootRR)).not.toBe(originalRR);
  await placeCurrentTutorialTile(page,Math.max(0,rootCandidates-3));expect(await page.evaluate(()=>window.__monoidGame.state().pieces.length)).toBe(1);await assertNoPageScroll(page)
});

test('BASICS keeps placements canonical while teaching Zero, rebound and T-Split without hidden coordinates',async({page})=>{
  await page.setViewportSize({width:390,height:844});await enterSelection(page);await page.locator('#learnMonoid').click();await finishUiTour(page);
  // Every step exposes the canonical candidate set for the active physical tile; only the other hand tiles are tutorial-locked.
  for(let i=0;i<4;i++){await assertTutorialHandGuidance(page);expect(await page.evaluate(()=>window.__monoidGame.candidatesForIndex(0).length)).toBeGreaterThan(0);await placeCurrentTutorialTile(page)}
  await expect.poll(()=>page.evaluate(()=>window.__monoidFlow?.tutorialStep)).toBe(4);await expect(page.locator('#monoidBoardCoach h2')).toHaveText('REBOUND');
  const reboundCount=await page.evaluate(()=>window.__monoidGame.candidatesForIndex(0).length);expect(reboundCount).toBeGreaterThan(0);await placeCurrentTutorialTile(page);
  await expect.poll(()=>page.evaluate(()=>window.__monoidFlow?.tutorialStep)).toBe(5);await expect(page.locator('#monoidBoardCoach h2')).toHaveText('EXTEND THE ARM');expect(await page.evaluate(()=>window.__monoidGame.candidatesForIndex(0).length)).toBeGreaterThan(0);await placeCurrentTutorialTile(page);
  await expect(page.locator('#monoidBoardCoach h2')).toHaveText('T-SPLIT');await expect(page.locator('#monoidBoardCoach')).toContainText('7/7');expect(await page.evaluate(()=>window.__monoidGame.candidatesForIndex(0).length)).toBeGreaterThan(0);await placeCurrentTutorialTile(page);
  await expect(page.locator('#overlayTitle')).toHaveText('SHOP');expect(await page.evaluate(()=>window.__monoidGame.state().pieces.length)).toBe(7);await assertCommerceIsDedicatedOverlay(page);await expect(page.locator('#nextGameMechanics')).toBeVisible()
});

test('SYSTEMS starts from a prepared real machine and teaches Circuit, Mod and POWER in sequence',async({page})=>{
  await page.setViewportSize({width:390,height:844});await enterSelection(page);await startTutorialFromHub(page,'systems');
  await expect.poll(()=>page.evaluate(()=>window.__monoidUx?.tutorialKind)).toBe('systems');await expect.poll(()=>page.evaluate(()=>window.__monoidUx?.systemsPhase)).toBe('circuit');await expect(page.locator('#monoidBoardCoach h2')).toHaveText('CIRCUITS');
  const fixture=await page.evaluate(()=>{const s=window.__monoidGame.state();return{pieces:s.pieces.length,pending:s.pendingCircuit&&{size:s.pendingCircuit.size,reward:s.pendingCircuit.reward,eligible:s.pendingCircuit.eligibleTileIds.length},power:s.hand[0]&&{id:s.hand[0].id,m:s.hand[0].powerMultiplier},mods:s.mods.slice()}});
  expect(fixture.pieces).toBe(4);expect(fixture.pending.size).toBe(4);expect(fixture.pending.eligible).toBeGreaterThan(0);expect(fixture.mods).toContain('long-run');expect(fixture.power).toEqual({id:'g2-d1-2',m:2});
  await page.locator('#board .circuitEligible').first().click();await expect.poll(()=>page.evaluate(()=>window.__monoidUx?.systemsPhase)).toBe('mod');await expect(page.locator('#monoidBoardCoach h2')).toHaveText('MODIFIERS');expect(await page.evaluate(()=>Object.keys(window.__monoidGame.state().circuitRanks).length)).toBeGreaterThan(0);await expect(page.locator('#machineModStatus')).toBeVisible();
  await page.locator('[data-ux-action="systems-next"]').click();await expect.poll(()=>page.evaluate(()=>window.__monoidUx?.systemsPhase)).toBe('power');await expect(page.locator('#monoidBoardCoach h2')).toHaveText('POWER');await expect(page.locator('#monoidBoardCoach')).toContainText('×2 magnitude');await assertTutorialHandGuidance(page);expect(await page.evaluate(()=>window.__monoidGame.candidatesForIndex(0).length)).toBeGreaterThan(0);
  await placeCurrentTutorialTile(page);await expect.poll(()=>page.evaluate(()=>window.__monoidUx?.systemsPhase)).toBe('complete');await expect(page.locator('#monoidBoardCoach h2')).toHaveText('MACHINE EVOLUTION');expect(await page.evaluate(()=>window.__monoidGame.state().pieces.some(p=>p.tile.id==='g2-d1-2'&&p.tile.powerMultiplier===2))).toBe(true);await expect(page.locator('#nextModifiersTutorial')).toBeVisible();
  await page.locator('[data-ux-action="systems-finish"]').click();await expect(page.locator('#gameSelection')).toBeVisible();await assertNoPageScroll(page)
});

test('SYSTEMS sandbox never overwrites a saved normal run',async({page})=>{
  await page.setViewportSize({width:390,height:844});await enterSelection(page);await page.locator('#startRun').click();if(await page.locator('[data-ux-action="start-first"]').isVisible())await page.locator('[data-ux-action="start-first"]').click();
  const saved=await page.evaluate(()=>localStorage.getItem('iterion.activeRun.v1'));await page.locator('#menuButton').click();await page.locator('#gameSelectionButton').click();await startTutorialFromHub(page,'systems');await expect.poll(()=>page.evaluate(()=>window.__monoidUx?.tutorialKind)).toBe('systems');expect(await page.evaluate(()=>localStorage.getItem('iterion.activeRun.v1'))).toBe(saved);await page.locator('#leaveTutorial').click();await expect(page.locator('#gameSelection')).toBeVisible();expect(await page.evaluate(()=>localStorage.getItem('iterion.activeRun.v1'))).toBe(saved)
});

test('first real run briefing is board-led, state-neutral and shown once',async({page})=>{
  await page.setViewportSize({width:375,height:667});await enterSelection(page);await page.locator('#startRun').click();await expect.poll(()=>page.evaluate(()=>window.__monoidUx?.mode)).toBe('firstBrief');await expect(page.locator('#monoidBoardCoach')).toContainText('BUILD. ROUTE. SCORE.');const before=await page.evaluate(()=>window.__monoidGame.exportState());await page.locator('[data-ux-action="start-first"]').click();await expect(page.locator('#monoidBoardCoach')).toBeHidden();expect(await page.evaluate(()=>window.__monoidGame.exportState())).toEqual(before);expect(await page.evaluate(()=>localStorage.getItem('monoid.firstRunBriefing.v1'))).toBe('seen')
});

test('CLASSIC selection uses a blank double-zero and player-facing branding is MONOID',async({page})=>{
  await page.setViewportSize({width:390,height:844});await enterSelection(page);await expect(page).toHaveTitle(/^MONOID/);const pips=await page.locator('#modeClassic .selectionDouble i').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n,'::after').display));expect(pips).toEqual(['none','none']);await page.locator('#startRun').click();await expect(page.locator('.wordmark')).toHaveText('MONOID')
});

test('Shop and Market use their dedicated overlay and keep the machine intact',async({page})=>{
  await page.setViewportSize({width:375,height:667});await page.addInitScript(()=>localStorage.setItem('iterion.entryBypass.v1','true'));await page.addInitScript(()=>{let api;Object.defineProperty(window,'IterionGame',{configurable:true,get:()=>api,set:value=>{api={...value,createGame(engine,options){const g=value.createGame(engine,{...options,seed:3200});g.state().coins=40;window.__uxGame=g;return g}}}})});await page.goto('http://127.0.0.1:4173/');
  const machine=await page.evaluate(()=>({pieces:window.__uxGame.state().pieces,hand:window.__uxGame.state().hand,score:window.__uxGame.state().score}));await page.locator('#shopButton').click();await expect(page.locator('.commerceModal')).toBeVisible();await assertCommerceIsDedicatedOverlay(page);await expect(page.locator('.randomOffer p')).toHaveText('Adds one new physical domino to your set.');await page.locator('#overlayPrimary').click();expect(await page.evaluate(()=>({pieces:window.__uxGame.state().pieces,hand:window.__uxGame.state().hand,score:window.__uxGame.state().score}))).toEqual(machine)
});

test('Endless briefing appears before canonical Endless state changes',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.addInitScript(()=>{localStorage.setItem('iterion.tutorialChoice.v1','made');localStorage.setItem('monoid.firstRunBriefing.v1','seen')});await enterSelection(page);await page.locator('#startRun').click();await page.evaluate(()=>{const s=window.__monoidGame.state();s.round=14;s.cleared=true;s.standardComplete=true;s.running=false;s.shopOpen=false;s.pendingCircuit=null});await page.locator('#helpButton').click();await page.locator('#overlayPrimary').click();await expect(page.locator('#overlayTitle')).toHaveText('RUN COMPLETE');expect(await page.evaluate(()=>window.__monoidGame.state().endlessMode)).toBe(false);await page.locator('#overlayPrimary').click();await expect.poll(()=>page.evaluate(()=>window.__monoidUx?.mode)).toBe('endlessBrief');expect(await page.evaluate(()=>window.__monoidGame.state().endlessMode)).toBe(false);await page.locator('[data-ux-action="enter-endless"]').click();await expect.poll(()=>page.evaluate(()=>window.__monoidGame.state().endlessMode)).toBe(true)
});