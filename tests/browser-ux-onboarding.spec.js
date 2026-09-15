const {test,expect}=require('@playwright/test');

async function enterSelection(page){await page.goto('http://127.0.0.1:4173/');await page.locator('#titleCard').click();await expect(page.locator('#gameSelection')).toBeVisible()}

async function assertNoPageScroll(page){expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth)).toBe(true)}

async function assertCommerceIsDedicatedOverlay(page){
  const contained=await page.evaluate(()=>{const m=document.querySelector('.commerceModal').getBoundingClientRect(),b=document.querySelector('.boardShell').getBoundingClientRect();return m.left>=b.left-1&&m.right<=b.right+1&&m.top>=b.top-1&&m.bottom<=b.bottom+1});
  expect(contained).toBe(false);await expect(page.locator('body')).not.toHaveClass(/monoidCommerceActive/)
}

async function finishUiTour(page){
  for(let i=0;i<5;i++)await page.locator('#monoidBoardCoach').click();
  await expect.poll(()=>page.evaluate(()=>window.__monoidUx?.mode)).toBe('tutorial')
}

async function dropCurrentTutorialTile(page){
  const tile=page.locator('#hand .tile').first(),box=await tile.boundingBox();expect(box).toBeTruthy();
  const target=await page.evaluate(()=>{
    const g=window.__monoidGame,E=window.IterionEngine,D=window.IterionData,t=g.state().hand[0],c=g.candidatesForIndex(0)[0],r=document.querySelector('#board').getBoundingClientRect();
    if(!t||!c)return null;const p=E.pieceFrom(t,c.x,c.y,0,c.rr,-1);
    return{x:r.left+((p.rect.minx+p.rect.maxx)/2/E.G)*r.width,y:r.top+((p.rect.miny+p.rect.maxy)/2/E.H)*r.height+(D.DRAG_Y_OFFSET||0)}
  });
  expect(target).toBeTruthy();
  const sx=box.x+box.width/2,sy=box.y+box.height/2;
  await page.mouse.move(sx,sy);await page.mouse.down();await page.mouse.move(sx+18,sy,{steps:2});await page.mouse.move(target.x,target.y,{steps:6});await page.mouse.up()
}

async function placeCurrentTutorialTile(page){
  const before=await page.evaluate(()=>window.__monoidGame.state().turn);await dropCurrentTutorialTile(page);
  await expect.poll(()=>page.evaluate(()=>window.__monoidGame.state().turn),{timeout:10000}).toBe(before+1);
  await expect.poll(()=>page.evaluate(()=>window.__monoidGame.state().running),{timeout:10000}).toBe(false)
}

test('LEARN MONOID tour explains the real UI every time the tutorial is opened',async({page})=>{
  await page.setViewportSize({width:390,height:844});await enterSelection(page);await page.locator('#learnMonoid').click();
  await expect.poll(()=>page.evaluate(()=>window.__monoidUx?.mode)).toBe('tour');
  const initial=await page.evaluate(()=>window.__monoidGame.exportState());
  const targets=['#board','#targetDetail','#scoreDetail','.movesMeta','.handRail'];
  const headings=['THE MACHINE','TARGET','SCORE','MOVES','HAND'];
  for(let i=0;i<targets.length;i++){
    await expect.poll(()=>page.evaluate(()=>window.__monoidUx?.tourStep)).toBe(i);await expect(page.locator(targets[i])).toHaveClass(/monoidTourHighlight/);await expect(page.locator('#monoidBoardCoach h2')).toHaveText(headings[i]);
    expect(await page.evaluate(()=>window.__monoidGame.exportState())).toEqual(initial);await page.locator('#monoidBoardCoach').click()
  }
  await expect.poll(()=>page.evaluate(()=>window.__monoidUx?.mode)).toBe('tutorial');await expect(page.locator('#monoidBoardCoach h2')).toHaveText('THE FIRST TILE');await expect(page.locator('#hand .tile').first()).toHaveClass(/monoidTourHighlight/);
  expect(await page.evaluate(()=>window.__monoidGame.exportState())).toEqual(initial);expect(await page.evaluate(()=>localStorage.getItem('monoid.uiTour.v1'))).toBe('seen');await assertNoPageScroll(page);
  await page.locator('#leaveTutorial').click();await expect(page.locator('#gameSelection')).toBeVisible();await page.locator('#replayTutorial').click();
  await expect.poll(()=>page.evaluate(()=>window.__monoidUx?.mode)).toBe('tour');await expect.poll(()=>page.evaluate(()=>window.__monoidUx?.tourStep)).toBe(0);await expect(page.locator('#monoidBoardCoach h2')).toHaveText('THE MACHINE')
});

test('tutorial rebound starts at the opposite end, teaches a real T-Split, and conceals the next draw during cascades',async({page})=>{
  await page.setViewportSize({width:390,height:844});await enterSelection(page);await page.locator('#learnMonoid').click();await finishUiTour(page);
  for(let i=0;i<4;i++)await placeCurrentTutorialTile(page);
  await expect.poll(()=>page.evaluate(()=>window.__monoidFlow?.tutorialStep)).toBe(4);
  await expect.poll(()=>page.evaluate(()=>window.__monoidGame.state().hand[0]?.id)).toBe('d2-5');
  await expect(page.locator('#monoidBoardCoach h2')).toHaveText('REBOUND');
  const reboundCandidates=await page.evaluate(()=>{
    const g=window.__monoidGame,root=g.state().pieces.find(p=>p.tile.id==='d2-2'),cs=g.candidatesForIndex(0);
    return{count:cs.length,allOppositeEnds:cs.every(c=>(c.contacts||[]).some(x=>x.piece?.id===root.id&&x.kind==='full'))}
  });
  expect(reboundCandidates.count).toBeGreaterThan(0);expect(reboundCandidates.allOppositeEnds).toBe(true);
  await dropCurrentTutorialTile(page);
  await expect.poll(()=>page.evaluate(()=>window.__monoidGame.state().running),{timeout:2000}).toBe(true);
  await expect(page.locator('#hand .domino').first()).toHaveClass(/back/);
  await expect.poll(()=>page.evaluate(()=>window.__monoidGame.state().running),{timeout:10000}).toBe(false);
  await expect.poll(()=>page.evaluate(()=>window.__monoidFlow?.tutorialStep),{timeout:10000}).toBe(5);
  await expect.poll(()=>page.evaluate(()=>window.__monoidGame.state().hand[0]?.id)).toBe('d2-6');
  await expect(page.locator('#monoidBoardCoach h2')).toHaveText('T-SPLIT');
  await expect.poll(()=>page.locator('#hand .domino').first().evaluate(el=>el.classList.contains('back'))).toBe(false);
  const splitCandidates=await page.evaluate(()=>{
    const g=window.__monoidGame,E=window.IterionEngine,D=window.IterionData,s=g.state(),tile=s.hand[0],root=s.pieces.find(p=>p.tile.id==='d2-2'),cs=g.candidatesForIndex(0);
    return{count:cs.length,allSplit:cs.every((c,n)=>{const p=E.pieceFrom(tile,c.x,c.y,0,c.rr,200000+n);p.tile={...tile};const sim=E.bestSignal(p.id,[...s.pieces,p],{initialOutput:tile.a+tile.b,bifurcate:D.BIFURCATION_ENABLED});return sim.events.some(e=>e.type==='signal-fork'&&e.piece===root.id)})}
  });
  expect(splitCandidates.count).toBeGreaterThan(0);expect(splitCandidates.allSplit).toBe(true);
  await placeCurrentTutorialTile(page);
  await expect(page.locator('#overlayTitle')).toHaveText('SHOP');
  expect(await page.evaluate(()=>window.__monoidGame.state().events.some(v=>v.type==='signal-resolution'&&(v.events||[]).some(e=>e.type==='signal-fork')))).toBe(true);
  await assertCommerceIsDedicatedOverlay(page)
});

test('first real run briefing is board-led, state-neutral and shown once',async({page})=>{
  await page.setViewportSize({width:375,height:667});await enterSelection(page);await page.locator('#startRun').click();
  await expect.poll(()=>page.evaluate(()=>window.__monoidUx?.mode)).toBe('firstBrief');await expect(page.locator('#monoidBoardCoach')).toContainText('BUILD. ROUTE. SCORE.');await expect(page.locator('#monoidBoardCoach')).toContainText('EVEN adds. ODD multiplies. ZERO rebounds.');
  const before=await page.evaluate(()=>window.__monoidGame.exportState());await page.locator('[data-ux-action="start-first"]').click();await expect(page.locator('#monoidBoardCoach')).toBeHidden();expect(await page.evaluate(()=>window.__monoidGame.exportState())).toEqual(before);expect(await page.evaluate(()=>localStorage.getItem('monoid.firstRunBriefing.v1'))).toBe('seen');
  await page.reload();await page.locator('#titleCard').click();await page.locator('#continueRun').click();await expect.poll(()=>page.evaluate(()=>window.__monoidUx?.mode)).toBe('idle');await assertNoPageScroll(page)
});

test('first run briefing still appears when tutorial choice was already made',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.addInitScript(()=>localStorage.setItem('iterion.tutorialChoice.v1','made'));await enterSelection(page);await page.locator('#startRun').click();await expect.poll(()=>page.evaluate(()=>window.__monoidUx?.mode)).toBe('firstBrief');await expect(page.locator('#monoidBoardCoach')).toContainText('Your machine survives the round.')
});

test('CLASSIC selection uses a blank double-zero and player-facing branding is MONOID',async({page})=>{
  await page.setViewportSize({width:390,height:844});await enterSelection(page);await expect(page).toHaveTitle(/^MONOID/);const pips=await page.locator('#modeClassic .selectionDouble i').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n,'::after').display));expect(pips).toEqual(['none','none']);await page.locator('#startRun').click();await expect(page.locator('.wordmark')).toHaveText('MONOID')
});

test('Shop and Market use their dedicated overlay and keep the machine intact',async({page})=>{
  await page.setViewportSize({width:375,height:667});await page.addInitScript(()=>localStorage.setItem('iterion.entryBypass.v1','true'));await page.addInitScript(()=>{let api;Object.defineProperty(window,'IterionGame',{configurable:true,get:()=>api,set:value=>{api={...value,createGame(engine,options){const g=value.createGame(engine,{...options,seed:3200});g.state().coins=40;window.__uxGame=g;return g}}}})});await page.goto('http://127.0.0.1:4173/');
  const machine=await page.evaluate(()=>({pieces:window.__uxGame.state().pieces,hand:window.__uxGame.state().hand,score:window.__uxGame.state().score}));await page.locator('#shopButton').click();await expect(page.locator('.commerceModal')).toBeVisible();await assertCommerceIsDedicatedOverlay(page);await expect(page.locator('.randomOffer p')).toHaveText('Adds one new physical domino to your set.');await assertNoPageScroll(page);await page.locator('#overlayPrimary').click();
  expect(await page.evaluate(()=>({pieces:window.__uxGame.state().pieces,hand:window.__uxGame.state().hand,score:window.__uxGame.state().score}))).toEqual(machine);
  await page.evaluate(()=>{const g=window.__uxGame,s=g.state(),E=window.IterionEngine;s.round=2;s.cleared=true;s.nextShopType='market';s.intermissionResolved=false;s.coins=40;s.pieces=[['d3-3',4,8,0],['d5-5',10,8,0],['d0-3',14,8,2]].map(([id,x,y,rr],i)=>{const t=s.set.find(t=>t.id===id),p=E.pieceFrom(t,x,y,0,rr,i+1);p.tile={...t};return p});s.placedTileIds=s.pieces.map(p=>p.tile.id);s.doubleDoubleTileId='d3-3';s.hand=s.hand.map(t=>s.placedTileIds.includes(t?.id)?null:t);s.reserve=s.reserve.filter(t=>!s.placedTileIds.includes(t.id));g.openIntermission();s.shopOffers=['double-echo','zero-memory','long-run']});
  await page.locator('#helpButton').click();await page.locator('#overlayPrimary').click();await expect(page.locator('#overlayTitle')).toHaveText('MARKET');await expect(page.locator('.marketOffer')).toHaveCount(3);await assertCommerceIsDedicatedOverlay(page);await expect(page.locator('.shopFoot')).toContainText('Buy one mod, or leave it.');await page.locator('.marketOffer').last().scrollIntoViewIfNeeded();await expect(page.locator('.marketOffer').last()).toBeVisible();await expect(page.locator('#overlayPrimary')).toBeVisible();await assertNoPageScroll(page)
});

test('Endless briefing appears before canonical Endless state changes',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.addInitScript(()=>{localStorage.setItem('iterion.tutorialChoice.v1','made');localStorage.setItem('monoid.firstRunBriefing.v1','seen')});await enterSelection(page);await page.locator('#startRun').click();
  await page.evaluate(()=>{const s=window.__monoidGame.state();s.round=14;s.cleared=true;s.standardComplete=true;s.running=false;s.shopOpen=false;s.pendingCircuit=null});await page.locator('#helpButton').click();await page.locator('#overlayPrimary').click();await expect(page.locator('#overlayTitle')).toHaveText('RUN COMPLETE');
  expect(await page.evaluate(()=>window.__monoidGame.state().endlessMode)).toBe(false);await page.locator('#overlayPrimary').click();await expect.poll(()=>page.evaluate(()=>window.__monoidUx?.mode)).toBe('endlessBrief');await expect(page.locator('#monoidBoardCoach')).toContainText('THE MACHINE CONTINUES.');expect(await page.evaluate(()=>window.__monoidGame.state().endlessMode)).toBe(false);
  await page.locator('[data-ux-action="enter-endless"]').click();await expect.poll(()=>page.evaluate(()=>window.__monoidGame.state().endlessMode)).toBe(true);await assertNoPageScroll(page)
});
