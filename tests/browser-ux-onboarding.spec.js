const {test,expect}=require('@playwright/test');

async function enterSelection(page){await page.goto('http://127.0.0.1:4173/');await page.locator('#titleCard').click();await expect(page.locator('#gameSelection')).toBeVisible()}

async function assertNoPageScroll(page){expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth)).toBe(true)}

async function assertCommerceOnBoard(page){
  const bounds=await page.evaluate(()=>{const m=document.querySelector('.commerceModal').getBoundingClientRect(),b=document.querySelector('.boardShell').getBoundingClientRect();return{m:{left:m.left,right:m.right,top:m.top,bottom:m.bottom},b:{left:b.left,right:b.right,top:b.top,bottom:b.bottom}}});
  expect(bounds.m.left).toBeGreaterThanOrEqual(bounds.b.left-1);expect(bounds.m.right).toBeLessThanOrEqual(bounds.b.right+1);expect(bounds.m.top).toBeGreaterThanOrEqual(bounds.b.top-1);expect(bounds.m.bottom).toBeLessThanOrEqual(bounds.b.bottom+1)
}

test('first LEARN MONOID tour explains the real UI without mutating tutorial game state',async({page})=>{
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
  expect(await page.evaluate(()=>window.__monoidGame.exportState())).toEqual(initial);expect(await page.evaluate(()=>localStorage.getItem('monoid.uiTour.v1'))).toBe('seen');await assertNoPageScroll(page)
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

test('Shop and Market occupy the board surface and keep the machine intact',async({page})=>{
  await page.setViewportSize({width:375,height:667});await page.addInitScript(()=>localStorage.setItem('iterion.entryBypass.v1','true'));await page.addInitScript(()=>{let api;Object.defineProperty(window,'IterionGame',{configurable:true,get:()=>api,set:value=>{api={...value,createGame(engine,options){const g=value.createGame(engine,{...options,seed:3200});g.state().coins=40;window.__uxGame=g;return g}}}})});await page.goto('http://127.0.0.1:4173/');
  const machine=await page.evaluate(()=>({pieces:window.__uxGame.state().pieces,hand:window.__uxGame.state().hand,score:window.__uxGame.state().score}));await page.locator('#shopButton').click();await expect(page.locator('.commerceModal')).toBeVisible();await expect(page.locator('body')).toHaveClass(/monoidCommerceActive/);await assertCommerceOnBoard(page);expect(parseFloat(await page.locator('.randomOffer p').evaluate(el=>getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(10.5);await expect(page.locator('.randomOffer p')).toHaveText('Adds one new physical domino to your set.');await assertNoPageScroll(page);await page.locator('#overlayPrimary').click();
  expect(await page.evaluate(()=>({pieces:window.__uxGame.state().pieces,hand:window.__uxGame.state().hand,score:window.__uxGame.state().score}))).toEqual(machine);
  await page.evaluate(()=>{const g=window.__uxGame,s=g.state(),E=window.IterionEngine;s.round=2;s.cleared=true;s.nextShopType='market';s.intermissionResolved=false;s.coins=40;s.pieces=[['d3-3',4,8,0],['d5-5',10,8,0],['d0-3',14,8,2]].map(([id,x,y,rr],i)=>{const t=s.set.find(t=>t.id===id),p=E.pieceFrom(t,x,y,0,rr,i+1);p.tile={...t};return p});s.placedTileIds=s.pieces.map(p=>p.tile.id);s.doubleDoubleTileId='d3-3';s.hand=s.hand.map(t=>s.placedTileIds.includes(t?.id)?null:t);s.reserve=s.reserve.filter(t=>!s.placedTileIds.includes(t.id));g.openIntermission();s.shopOffers=['double-echo','zero-memory','long-run']});
  await page.locator('#helpButton').click();await page.locator('#overlayPrimary').click();await expect(page.locator('#overlayTitle')).toHaveText('MARKET');await expect(page.locator('.marketOffer')).toHaveCount(3);await assertCommerceOnBoard(page);await expect(page.locator('.shopFoot')).toContainText('Buy one mod, or leave it.');
  expect(await page.locator('#overlayBody').evaluate(el=>getComputedStyle(el).overflowY)).toMatch(/auto|scroll/);await page.locator('.marketOffer').last().scrollIntoViewIfNeeded();await expect(page.locator('.marketOffer').last()).toBeVisible();await expect(page.locator('#overlayPrimary')).toBeVisible();await assertNoPageScroll(page)
});

test('Endless briefing appears before canonical Endless state changes',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.addInitScript(()=>{localStorage.setItem('iterion.tutorialChoice.v1','made');localStorage.setItem('monoid.firstRunBriefing.v1','seen')});await enterSelection(page);await page.locator('#startRun').click();
  await page.evaluate(()=>{const s=window.__monoidGame.state();s.round=14;s.cleared=true;s.standardComplete=true;s.running=false;s.shopOpen=false;s.pendingCircuit=null});await page.locator('#helpButton').click();await page.locator('#overlayPrimary').click();await expect(page.locator('#overlayTitle')).toHaveText('RUN COMPLETE');
  expect(await page.evaluate(()=>window.__monoidGame.state().endlessMode)).toBe(false);await page.locator('#overlayPrimary').click();await expect.poll(()=>page.evaluate(()=>window.__monoidUx?.mode)).toBe('endlessBrief');await expect(page.locator('#monoidBoardCoach')).toContainText('THE MACHINE CONTINUES.');expect(await page.evaluate(()=>window.__monoidGame.state().endlessMode)).toBe(false);
  await page.locator('[data-ux-action="enter-endless"]').click();await expect.poll(()=>page.evaluate(()=>window.__monoidGame.state().endlessMode)).toBe(true);await assertNoPageScroll(page)
});
