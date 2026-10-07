const {test,expect}=require('@playwright/test');

function intersects(a,b){return a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y}
async function dismissModeIntro(page){
  await page.waitForTimeout(40);
  if(await page.locator('[data-ux-action="start-first"]').isVisible()){await page.locator('[data-ux-action="start-first"]').click();await page.waitForTimeout(40)}
  if(await page.locator('[data-ux-action="start-mode"]').isVisible())await page.locator('[data-ux-action="start-mode"]').click();
  await expect.poll(()=>page.evaluate(()=>window.__monoidUx?.mode),{timeout:3500}).toBe('idle')
}

test('MONOID wordmark opens a real dictionary inspector without entering selection',async({page})=>{
  await page.setViewportSize({width:375,height:667});
  await page.goto('http://127.0.0.1:4173/');
  const title=page.locator('#titleCard'),box=await title.boundingBox();expect(box).toBeTruthy();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(560);await page.mouse.up();
  await expect(page.locator('#overlay')).toHaveClass(/show/);
  await expect(page.locator('#overlayTitle')).toHaveText('MONOID');
  await expect(page.locator('#overlayBody')).toContainText('1. Mathematics.');
  await expect(page.locator('#overlayBody')).toContainText('binary operation');
  await expect(page.locator('#overlayBody')).toContainText('associative');
  await expect(page.locator('#overlayBody')).toContainText('identity element');
  await expect(page.locator('#overlayBody')).toContainText('integers under addition, with 0 as the identity');
  await expect(page.locator('#overlayBody')).toContainText('2. Video games.');
  await expect(page.locator('#overlayBody')).toContainText('increasingly unreasonable numbers');
  await expect(page.locator('#overlayBody')).toContainText('See also: domino, signal, bad decisions.');
  expect(await page.locator('#overlay').evaluate(el=>Number(getComputedStyle(el).zIndex))).toBeGreaterThan(1000);
  await expect(page.locator('#gameSelection')).toBeHidden();
  await page.locator('#overlayPrimary').click();
  await expect(page.locator('#overlay')).not.toHaveClass(/show/);
  await title.click();
  await expect(page.locator('#modeCarouselFrame')).toBeVisible()
});

test('Game Selection MONOID wordmark opens Inspector on tap',async({page})=>{
  await page.setViewportSize({width:375,height:667});
  await page.goto('http://127.0.0.1:4173/');
  await page.locator('#titleCard').click();await expect(page.locator('#gameSelection')).toBeVisible();
  await page.locator('#selectionTitle').click();
  await expect(page.locator('#overlay')).toHaveClass(/show/);await expect(page.locator('#overlayTitle')).toHaveText('MONOID');
  await expect(page.locator('#overlayBody')).toContainText('1. Mathematics.');
});

test('locked mode tiles remain inspectable and explain both unlock and completion conditions',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('monoid.profileContext.v1','player'));
  await page.setViewportSize({width:375,height:667});
  await page.goto('http://127.0.0.1:4173/');
  await page.waitForFunction(()=>!!window.__monoidModes&&!!window.MonoidProfile?.modeProgress);
  await page.locator('#titleCard').click();
  expect(await page.evaluate(()=>window.MonoidProfile.isModeUnlocked('islands'))).toBe(false);
  await page.evaluate(()=>window.__monoidModes.select(6));
  await expect(page.locator('#modeName')).toHaveText('LOCKED');
  await expect(page.locator('#startRun')).toBeDisabled();
  const slide=page.locator('.modeSlide[data-mode="islands"]');await slide.click();
  await expect(page.locator('#overlay')).toHaveClass(/show/);
  await expect(page.locator('#overlayTitle')).toHaveText('THE ISLANDS');
  await expect(page.locator('#overlayBody')).toContainText('LOCKED');
  await expect(page.locator('#overlayBody')).toContainText('Reach Infinite in The Peaks.');
  await expect(page.locator('#overlayBody')).toContainText('Clear one Ouroboros round.');
  await expect(page.locator('#overlayBody')).toContainText('Unlock · PENDING');
  await expect(page.locator('#overlayBody')).toContainText('Complete · INCOMPLETE');
  expect(await page.evaluate(()=>window.MonoidProfile.isModeUnlocked('islands'))).toBe(false);
  await page.locator('#overlayPrimary').click();
  await expect(page.locator('#startRun')).toBeDisabled();
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth)).toBe(true)
});

test('mode carousel keeps a continuous strip and weights its physical settle by release distance',async({page})=>{
  await page.setViewportSize({width:375,height:667});
  await page.goto('http://127.0.0.1:4173/');
  await page.locator('#titleCard').click();
  await expect(page.locator('#modeCarouselFrame')).toBeVisible();
  await expect(page.locator('#modeName')).toHaveText('CLASSIC');
  await expect(page.locator('#modeDescription')).toHaveText('Classic → Endless → Infinite');

  const viewport=await page.locator('#modeCarouselViewport').boundingBox();
  const before=await page.locator('#modeClassic').boundingBox();
  expect(viewport).toBeTruthy();expect(before).toBeTruthy();
  const viewportCenter=viewport.x+viewport.width/2,beforeCenter=before.x+before.width/2;
  const pointerY=viewport.y+viewport.height/2;

  await page.mouse.move(viewportCenter,pointerY);await page.mouse.down();await page.mouse.move(viewportCenter+12,pointerY);
  const during=await page.locator('#modeClassic').boundingBox();expect(during).toBeTruthy();
  const magneticShift=during.x+during.width/2-beforeCenter;
  expect(magneticShift).toBeGreaterThan(0);expect(magneticShift).toBeLessThan(12);
  const closeProfile=await page.evaluate(x=>window.MonoidModeCarousel.settleProfile(x,0),magneticShift);
  expect(closeProfile.overshoot).toBeLessThan(1);
  await page.mouse.up();
  await expect(page.locator('#modeCarouselViewport')).not.toHaveClass(/isPulling|isLanding/,{timeout:800});
  await expect(page.locator('#modeName')).toHaveText('CLASSIC');

  // The first neighbour is The Eyes. The physical settle remains unchanged
  // while the new mode becomes a real selectable 1|1 entry.
  await page.mouse.move(viewportCenter,pointerY);await page.mouse.down();await page.mouse.move(viewportCenter-34,pointerY);await page.mouse.up();
  await expect(page.locator('#modeCarouselViewport')).toHaveClass(/isPulling/);
  const farProfile=await page.evaluate(()=>window.MonoidModeCarousel.settleProfile(-34,-window.MonoidModeCarousel.SPACING));
  expect(farProfile.overshoot).toBeGreaterThan(closeProfile.overshoot*4);
  const trace=await page.evaluate(async()=>{
    const slide=document.querySelector('.modeSlide[data-index="1"]'),viewport=document.querySelector('#modeCarouselViewport'),center=viewport.getBoundingClientRect().left+viewport.getBoundingClientRect().width/2,start=performance.now(),samples=[];
    await new Promise(resolve=>{function tick(now){const r=slide.getBoundingClientRect();samples.push(r.left+r.width/2-center);if(now-start<470)requestAnimationFrame(tick);else resolve()}requestAnimationFrame(tick)});
    return samples
  });
  expect(Math.min(...trace)).toBeLessThan(-3,'a far release must carry the incoming tile slightly through centre');
  expect(Math.abs(trace.at(-1))).toBeLessThan(1.5);
  await expect(page.locator('#modeName')).toHaveText('THE EYES',{timeout:900});
  await expect(page.locator('#modeDescription')).toHaveText('1|1 · Signal 6');
  await expect(page.locator('#startRun')).toBeEnabled();

  await page.evaluate(()=>window.__monoidModes.select(6));
  await expect(page.locator('#modeName')).toHaveText('THE ISLANDS');
  await expect(page.locator('#modeDescription')).toHaveText('6|6 · Build from Cores');
  await expect(page.locator('#startRun')).toBeEnabled();
  const frame=await page.locator('#modeCarouselFrame').boundingBox();
  const loopViewport=await page.locator('#modeCarouselViewport').boundingBox();
  const classicBefore=await page.locator('#modeClassic').boundingBox();
  expect(frame).toBeTruthy();expect(loopViewport).toBeTruthy();expect(classicBefore).toBeTruthy();
  expect(classicBefore.x).toBeGreaterThanOrEqual(frame.x+frame.width);
  const sx=loopViewport.x+loopViewport.width*.72,sy=loopViewport.y+loopViewport.height*.5;
  await page.mouse.move(sx,sy);await page.mouse.down();await page.mouse.move(sx-82,sy);
  const classicDuring=await page.locator('#modeClassic').boundingBox();expect(classicDuring).toBeTruthy();
  expect(classicDuring.x).toBeLessThan(frame.x+frame.width);expect(classicDuring.x+classicDuring.width).toBeGreaterThan(frame.x+frame.width);
  await page.mouse.up();await expect(page.locator('#modeName')).toHaveText('LOCKED',{timeout:1200});

  await page.evaluate(()=>window.__monoidModes.select(7));
  const seamViewport=await page.locator('#modeCarouselViewport').boundingBox();expect(seamViewport).toBeTruthy();
  const farTile=page.locator('.modeSlide[data-index="4"]');
  const farBefore=await farTile.boundingBox();expect(farBefore).toBeTruthy();expect(intersects(farBefore,seamViewport)).toBe(false);
  const lx=seamViewport.x+seamViewport.width*.72,ly=seamViewport.y+seamViewport.height*.5;
  await page.mouse.move(lx,ly);await page.mouse.down();await page.mouse.move(lx-78,ly);await page.mouse.up();
  for(const wait of [25,45,55,65,75,85]){await page.waitForTimeout(wait);const box=await farTile.boundingBox();expect(box).toBeTruthy();expect(intersects(box,seamViewport)).toBe(false)}
  await expect(page.locator('#modeName')).toHaveText('CLASSIC',{timeout:1200});
  await expect(page.locator('#modeDescription')).toHaveText('Classic → Endless → Infinite');
});

test('Classic, The Eyes, The Frames and The River are playable while Classic keeps its full progression',async({page})=>{
  await page.setViewportSize({width:375,height:667});
  await page.goto('http://127.0.0.1:4173/');
  await page.waitForFunction(()=>!!window.__monoidModes);
  await page.locator('#titleCard').click();

  expect(await page.evaluate(()=>window.__monoidModes.modes.filter(mode=>mode.available).map(mode=>mode.id))).toEqual(['classic','eyes','frames','river','loom','peaks','islands']);
  await expect(page.locator('#modeName')).toHaveText('CLASSIC');
  await expect(page.locator('#modeDescription')).toHaveText('Classic → Endless → Infinite');
  await page.locator('#startRun').click();
  expect(await page.evaluate(()=>window.__monoidGame.state().gameMode)).toBe('classic');
  expect(await page.evaluate(()=>window.__monoidGame.state().scoringModel??null)).toBeNull();
  expect(await page.evaluate(()=>localStorage.getItem('iterion.activeRunMode.v1'))).toBe('classic');
  expect(await page.evaluate(()=>window.__monoidGame.debugText())).toContain('Mode: CLASSIC');
  await expect(page.locator('#modeIndicator')).toBeHidden();
  await expect(page.locator('#signalHud')).toBeHidden();
});


test('The Islands starts a persisted 6|6 run where every opening placement is Core-anchored',async({page})=>{
  await page.setViewportSize({width:375,height:667});
  await page.goto('http://127.0.0.1:4173/');
  await page.waitForFunction(()=>!!window.__monoidModes);
  await page.locator('#titleCard').click();
  await page.evaluate(()=>window.__monoidModes.select(6));
  await expect(page.locator('#modeName')).toHaveText('THE ISLANDS');
  await expect(page.locator('#modeDescription')).toHaveText('6|6 · Build from Cores');
  await page.evaluate(()=>{localStorage.setItem('monoid.modeOnboarding.v1',JSON.stringify({islands:{reveal:true,orient:true,discovery:true,payoff:true}}));localStorage.setItem('monoid.modeIntro.v2',JSON.stringify({islands:true}))});
  await page.locator('#startRun').click();
  await dismissModeIntro(page);
  await expect(page.locator('#board .coreNode')).toHaveCount(12);
  await expect(page.locator('#board .boardVoid')).toHaveCount(12);
  await expect(page.locator('#modeIndicator')).toBeVisible();
  await expect(page.locator('#modeIndicator .modeIndicatorHalf')).toHaveCount(2);
  await expect(page.locator('#modeIndicator .modePip')).toHaveCount(12);
  const state=await page.evaluate(()=>{
    const game=window.__monoidGame,s=game.state(),doubleIndex=s.hand.findIndex(tile=>tile&&tile.a===tile.b),candidates=doubleIndex>=0?game.candidatesForIndex(doubleIndex):[];
    return{
      mode:s.gameMode,
      cores:s.cores.length,
      voids:s.voids.length,
      signal:game.snapshot().signal.base,
      islands:game.snapshot().islands,
      doubleIndex,
      candidates,
      storedMode:localStorage.getItem('iterion.activeRunMode.v1'),
      savedMode:JSON.parse(localStorage.getItem('iterion.activeRun.v1')).state.gameMode
    }
  });
  expect(state.mode).toBe('islands');
  expect(state.storedMode).toBe('islands');
  expect(state.savedMode).toBe('islands');
  expect(state.cores).toBe(12);
  expect(state.voids).toBe(12);
  expect(state.signal).toBe(2);
  expect(state.islands.componentCount).toBe(0);
  expect(state.doubleIndex).toBeGreaterThanOrEqual(0);
  expect(state.candidates.length).toBeGreaterThan(0);
  expect(state.candidates.every(candidate=>candidate.islandAnchor===true&&!!candidate.islandAnchorCoreId)).toBe(true);
  await expect(page.locator('#signalHud .signalHudLane b')).toHaveText('2');
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('The Eyes starts a persisted 1|1 run with two physical Core fixtures and Signal 6 telemetry',async({page})=>{
  await page.setViewportSize({width:375,height:667});
  await page.goto('http://127.0.0.1:4173/');
  await page.waitForFunction(()=>!!window.__monoidModes);
  await page.locator('#titleCard').click();
  await page.evaluate(()=>window.__monoidModes.select(1));
  await expect(page.locator('#modeName')).toHaveText('THE EYES');
  await page.evaluate(()=>{localStorage.setItem('monoid.modeOnboarding.v1',JSON.stringify({eyes:{reveal:true,orient:true,discovery:true,payoff:true}}));localStorage.setItem('monoid.modeIntro.v2',JSON.stringify({eyes:true}))});
  await page.locator('#startRun').click();
  await dismissModeIntro(page);
  await expect(page.locator('#board .coreNode')).toHaveCount(2);
  await expect(page.locator('#modeIndicator')).toBeVisible();
  await expect(page.locator('#modeIndicator .modeIndicatorHalf')).toHaveCount(2);
  await expect(page.locator('#modeIndicator .modePip')).toHaveCount(2);
  await expect(page.locator('#modeIndicator .modeIndicatorPhase')).toHaveCount(0);
  await expect(page.locator('#modeIndicator .modeIndicatorDivider')).toHaveCount(0);
  const indicatorAlignment=await page.evaluate(()=>{const header=document.querySelector('.gameHeader').getBoundingClientRect(),wordmark=document.getElementById('menuButton').getBoundingClientRect(),indicator=document.getElementById('modeIndicator').getBoundingClientRect(),half=document.querySelector('#modeIndicator .modeIndicatorHalf').getBoundingClientRect(),pip=document.querySelector('#modeIndicator .modePip').getBoundingClientRect();return{dx:(indicator.left+indicator.width/2)-(wordmark.left+wordmark.width/2),top:indicator.top-header.top,half:half.width,pip:pip.width}});
  expect(Math.abs(indicatorAlignment.dx)).toBeLessThan(1);expect(indicatorAlignment.top).toBeGreaterThanOrEqual(31);expect(indicatorAlignment.half).toBeGreaterThanOrEqual(11);expect(indicatorAlignment.pip).toBeGreaterThanOrEqual(2.5);
  const state=await page.evaluate(()=>({
    gameMode:window.__monoidGame.state().gameMode,
    cores:window.__monoidGame.state().cores,
    snapshot:window.__monoidGame.snapshot(),
    storedMode:localStorage.getItem('iterion.activeRunMode.v1'),
    savedMode:JSON.parse(localStorage.getItem('iterion.activeRun.v1')).state.gameMode
  }));
  expect(state.gameMode).toBe('eyes');
  expect(state.storedMode).toBe('eyes');
  expect(state.savedMode).toBe('eyes');
  expect(state.cores).toHaveLength(2);
  expect(state.cores.map(({slot,x,y,size})=>({slot,x,y,size}))).toEqual([{slot:'north',x:8,y:6,size:2},{slot:'south',x:8,y:16,size:2}]);
  const coreSpacing=await page.locator('#board .coreNode').evaluateAll(nodes=>{const centers=nodes.map(node=>{const r=node.getBoundingClientRect();return r.top+r.height/2}).sort((a,b)=>a-b),board=document.getElementById('board').getBoundingClientRect();return(centers[1]-centers[0])/board.height});
  expect(coreSpacing).toBeGreaterThan(.40);expect(coreSpacing).toBeLessThan(.43);
  expect(state.snapshot.cores.interaction).toBe('physical');
  expect(state.snapshot.cores.telemetry.overlapTileIds).toEqual([]);
  expect(state.snapshot.signal.enabled).toBe(true);
  expect(state.snapshot.signal.shadowEnabled).toBe(false);
  expect(state.snapshot.signal.interaction).toBe('runtime');
  expect(state.snapshot.signal.base).toBe(6);
  expect(state.snapshot.signal.max).toBe(6);
  await expect(page.locator('#signalHud')).toBeVisible();
  await expect(page.locator('#signalHud .signalHudIcon')).toBeVisible();
  await expect(page.locator('#signalHud .signalHudLabel')).toHaveCount(0);
  await expect(page.locator('#signalHud .signalHudLane b')).toHaveText('6');
  await expect(page.locator('#signalHud .signalHudLane')).not.toHaveClass(/low|critical/);
  if(await page.locator('[data-ux-action="start-first"]').isVisible())await page.locator('[data-ux-action="start-first"]').click();
  await page.locator('#signalHud').click();
  await expect(page.locator('#overlayTitle')).toHaveText('SIGNAL');
  await expect(page.locator('#overlayBody')).toContainText('FIRST VISIT · −1');
  await expect(page.locator('#overlayBody')).toContainText('RETRACE · 0');
  await page.locator('#overlayPrimary').click();
  await expect(page.locator('#hint')).not.toContainText('CONNECT A CORE');
  await expect(page.locator('#board .coreNode.coreNeedsConnection')).toHaveCount(2);
  expect(new Set(state.cores.map(core=>core.archetype)).size).toBe(2);
  const coreAccessibility=await page.locator('#board .coreNode').evaluateAll(nodes=>nodes.map(node=>({hidden:node.getAttribute('aria-hidden'),role:node.getAttribute('role'),tabIndex:node.tabIndex})));
  expect(coreAccessibility.every(core=>core.hidden===null&&core.role==='button'&&core.tabIndex===0)).toBe(true);
  const firstCore=page.locator('#board .coreNode').first(),coreBox=await firstCore.boundingBox();expect(coreBox).toBeTruthy();
  await page.mouse.move(coreBox.x+coreBox.width/2,coreBox.y+coreBox.height/2);await page.mouse.down();await page.waitForTimeout(600);await page.mouse.up();
  await expect(page.locator('#overlayTitle')).toHaveText(/^(RELAY|RESERVOIR|DISTRIBUTOR|CONDUCTOR) · I$/);
  await expect(page.locator('#overlayBody')).toContainText('LEAD Ability');
  await expect(page.locator('#overlayBody')).toContainText('LEAD · first Core reached');
  await expect(page.locator('#overlayBody')).toContainText('Stages 2, 3, 4, 5: Each discovery adds 1 Core and no Voids.');
  await page.locator('#overlayPrimary').click();
  const placementSafety=await page.evaluate(()=>{
    const game=window.__monoidGame,E=window.IterionEngine,s=game.state();let checked=0,overlaps=0;
    s.hand.forEach((tile,index)=>{if(!tile)return;for(const candidate of game.candidatesForIndex(index)){const piece=E.pieceFrom(tile,candidate.x,candidate.y,0,candidate.rr,-1);piece.tile={...tile};checked++;if(game.coreShadowTelemetry([piece]).overlapTileIds.length)overlaps++}});
    return{checked,overlaps}
  });
  expect(placementSafety.checked).toBeGreaterThan(0);
  expect(placementSafety.overlaps).toBe(0);
});

test('The Eyes makes the Stage 2 Core discovery a visible board event',async({page})=>{
  await page.setViewportSize({width:375,height:667});
  await page.goto('http://127.0.0.1:4173/');
  await page.waitForFunction(()=>!!window.__monoidModes);
  await page.locator('#titleCard').click();
  await page.evaluate(()=>window.__monoidModes.select(1));
  await page.evaluate(()=>{localStorage.setItem('monoid.modeOnboarding.v1',JSON.stringify({eyes:{reveal:true,orient:true,discovery:true,payoff:true}}));localStorage.setItem('monoid.modeIntro.v2',JSON.stringify({eyes:true}))});
  await page.locator('#startRun').click();
  await dismissModeIntro(page);
  await page.evaluate(()=>{const g=window.__monoidGame,s=g.state();s.round=2;s.cleared=true;s.blocked=false;s.running=false;s.nextShopType='none';s.intermissionResolved=true;s.pendingCircuit=null;s.pendingModPlacement=null;s.shopOpen=false});
  await page.locator('#menuButton').click();await page.locator('#menuHelpButton').click();await page.locator('#overlayPrimary').click();
  await expect(page.locator('#overlayTitle')).toHaveText('ROUND COMPLETE');
  await page.locator('#overlayBody').click();await expect(page.locator('.roundAdvanceModal')).toHaveClass(/roundRewardComplete/);await expect(page.locator('#board .coreNode')).toHaveCount(2);
  await page.locator('#overlayBody').click();
  await expect(page.locator('#board .coreNode')).toHaveCount(3);
  await expect(page.locator('.boardMessage')).toContainText(/NEW CORE · (RELAY|RESERVOIR|DISTRIBUTOR|CONDUCTOR) I/);
  await expect(page.locator('#board .coreNode.coreDiscovered')).toHaveCount(1);
  expect(await page.evaluate(()=>window.__monoidGame.state().events.some(event=>event.type==='core-discover'&&event.stage===2))).toBe(true);
});

test('The Eyes keeps its 1|1 selector and replaces a saved Classic run without reverting to Classic',async({page})=>{
  await page.setViewportSize({width:375,height:667});
  await page.goto('http://127.0.0.1:4173/');
  await page.waitForFunction(()=>!!window.__monoidModes);
  await page.locator('#titleCard').click();
  await page.locator('#startRun').click();
  await expect.poll(()=>page.evaluate(()=>window.__monoidGame.state().gameMode)).toBe('classic');
  await page.evaluate(()=>document.getElementById('gameSelectionButton').click());
  await expect(page.locator('#gameSelection')).toBeVisible();
  await page.evaluate(()=>window.__monoidModes.select(1));
  await page.evaluate(()=>{localStorage.setItem('monoid.modeOnboarding.v1',JSON.stringify({eyes:{reveal:true,orient:true,discovery:true,payoff:true}}));localStorage.setItem('monoid.modeIntro.v2',JSON.stringify({eyes:true}))});
  await expect(page.locator('#modeName')).toHaveText('THE EYES');
  const eyesPips=await page.evaluate(()=>[...document.querySelectorAll('.modeSlide[data-mode="eyes"] .modeTileEyes i')].map(half=>getComputedStyle(half,'::after').display));
  expect(eyesPips).toEqual(['block','block']);
  expect(await page.evaluate(()=>window.__monoidSelectedMode)).toBe('eyes');
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#startRun').click();
  await dismissModeIntro(page);
  await expect(page.locator('#board .coreNode')).toHaveCount(2);
  const state=await page.evaluate(()=>({mode:window.__monoidGame.state().gameMode,cores:window.__monoidGame.state().cores.length,storedMode:localStorage.getItem('iterion.activeRunMode.v1'),savedMode:JSON.parse(localStorage.getItem('iterion.activeRun.v1')).state.gameMode}));
  expect(state).toEqual({mode:'eyes',cores:2,storedMode:'eyes',savedMode:'eyes'});
});


test('The Frames starts a seeded 2|2 run with two physical Cores and two Voids',async({page})=>{
  await page.setViewportSize({width:375,height:667});
  await page.goto('http://127.0.0.1:4173/');
  await page.waitForFunction(()=>!!window.__monoidModes);
  await page.locator('#titleCard').click();
  await page.evaluate(()=>window.__monoidModes.select(2));
  await expect(page.locator('#modeName')).toHaveText('THE FRAMES');
  await expect(page.locator('#modeDescription')).toHaveText('2|2 · Signal 4');
  await page.evaluate(()=>{localStorage.setItem('monoid.modeOnboarding.v1',JSON.stringify({frames:{reveal:true,orient:true,discovery:true,payoff:true}}));localStorage.setItem('monoid.modeIntro.v2',JSON.stringify({frames:true}))});
  await page.locator('#startRun').click();
  await dismissModeIntro(page);
  await expect(page.locator('#modeIndicator')).toBeVisible();
  await expect(page.locator('#modeIndicator .modeIndicatorHalf')).toHaveCount(2);
  await expect(page.locator('#modeIndicator .modePip')).toHaveCount(4);
  await expect(page.locator('#board .coreNode, #board .boardVoid')).toHaveCount(4);
  const state=await page.evaluate(()=>({
    mode:window.__monoidGame.state().gameMode,
    cores:window.__monoidGame.state().cores,
    voids:window.__monoidGame.state().voids,
    snapshot:window.__monoidGame.snapshot(),
    storedMode:localStorage.getItem('iterion.activeRunMode.v1'),
    savedMode:JSON.parse(localStorage.getItem('iterion.activeRun.v1')).state.gameMode
  }));
  expect(state.mode).toBe('frames');
  expect(state.storedMode).toBe('frames');
  expect(state.savedMode).toBe('frames');
  expect(state.cores).toHaveLength(2);
  expect(state.voids).toHaveLength(2);
  expect(state.snapshot.modeGeometry.visibleIds).toHaveLength(4);
  expect(state.snapshot.signal.enabled).toBe(true);
  expect(state.snapshot.signal.base).toBe(4);
  expect(state.snapshot.signal.max).toBe(4);
  await expect(page.locator('#signalHud')).toBeVisible();
  await expect(page.locator('#signalHud .signalHudLane b')).toHaveText('4');
  await expect(page.locator('#signalHud .signalHudLane')).not.toHaveClass(/low|critical/);
  const progressed=await page.evaluate(()=>{window.__monoidGame.state().marketCount=2;return window.__monoidGame.snapshot().signal});
  expect(progressed.base).toBe(4);expect(progressed.max).toBe(6);expect(progressed.marketBonus).toBe(2);
  const safety=await page.evaluate(()=>{
    const game=window.__monoidGame,E=window.IterionEngine,s=game.state(),items=[...s.cores,...s.voids];let checked=0,overlaps=0;
    const hit=(piece,item)=>piece.cubes.some(cube=>cube.x<item.x+item.size&&cube.x+E.S>item.x&&cube.y<item.y+item.size&&cube.y+E.S>item.y);
    s.hand.forEach((tile,index)=>{if(!tile)return;for(const candidate of game.candidatesForIndex(index)){const piece=E.pieceFrom(tile,candidate.x,candidate.y,0,candidate.rr,-1);checked++;if(items.some(item=>hit(piece,item)))overlaps++}});
    return{checked,overlaps}
  });
  expect(safety.checked).toBeGreaterThan(0);
  expect(safety.overlaps).toBe(0);
});


test('The River starts a seeded 3|3 run with fixed Cores and four Voids',async({page})=>{
  await page.setViewportSize({width:375,height:667});
  await page.goto('http://127.0.0.1:4173/');
  await page.waitForFunction(()=>!!window.__monoidModes);
  await page.locator('#titleCard').click();
  await page.evaluate(()=>window.__monoidModes.select(3));
  await expect(page.locator('#modeName')).toHaveText('THE RIVER');
  await expect(page.locator('#modeDescription')).toHaveText('3|3 · Signal 3');
  await page.evaluate(()=>{localStorage.setItem('monoid.modeOnboarding.v1',JSON.stringify({river:{reveal:true,orient:true,discovery:true,payoff:true}}));localStorage.setItem('monoid.modeIntro.v2',JSON.stringify({river:true}))});
  await page.locator('#startRun').click();
  await dismissModeIntro(page);
  await expect(page.locator('#modeIndicator')).toBeVisible();
  await expect(page.locator('#modeIndicator .modePip')).toHaveCount(6);
  await expect(page.locator('#board .coreNode')).toHaveCount(2);
  await expect(page.locator('#board .boardVoid')).toHaveCount(4);
  const state=await page.evaluate(()=>({mode:window.__monoidGame.state().gameMode,cores:window.__monoidGame.state().cores,voids:window.__monoidGame.state().voids,snapshot:window.__monoidGame.snapshot(),storedMode:localStorage.getItem('iterion.activeRunMode.v1'),savedMode:JSON.parse(localStorage.getItem('iterion.activeRun.v1')).state.gameMode}));
  expect(state.mode).toBe('river');
  expect(state.storedMode).toBe('river');
  expect(state.savedMode).toBe('river');
  expect(state.cores).toHaveLength(2);
  expect(state.voids).toHaveLength(4);
  expect(state.snapshot.modeGeometry.visibleIds).toHaveLength(6);
  expect(state.snapshot.signal.base).toBe(3);
  expect(state.snapshot.signal.max).toBe(3);
  await expect(page.locator('#signalHud .signalHudLane b')).toHaveText('3');
  const safety=await page.evaluate(()=>{
    const game=window.__monoidGame,E=window.IterionEngine,s=game.state(),items=[...s.cores,...s.voids];let checked=0,overlaps=0;
    const hit=(piece,item)=>piece.cubes.some(cube=>cube.x<item.x+item.size&&cube.x+E.S>item.x&&cube.y<item.y+item.size&&cube.y+E.S>item.y);
    s.hand.forEach((tile,index)=>{if(!tile)return;for(const candidate of game.candidatesForIndex(index)){const piece=E.pieceFrom(tile,candidate.x,candidate.y,0,candidate.rr,-1);checked++;if(items.some(item=>hit(piece,item)))overlaps++}});
    return{checked,overlaps}
  });
  expect(safety.checked).toBeGreaterThan(0);
  expect(safety.overlaps).toBe(0);
});


test('The Loom and The Peaks start as real 4|4 and 5|5 Core modes',async({page})=>{
  await page.setViewportSize({width:375,height:667});
  await page.goto('http://127.0.0.1:4173/');
  await page.waitForFunction(()=>!!window.__monoidModes);
  await page.locator('#titleCard').click();

  await page.evaluate(()=>window.__monoidModes.select(4));
  await expect(page.locator('#modeName')).toHaveText('THE LOOM');
  await expect(page.locator('#modeDescription')).toHaveText('4|4 · Signal 2');
  await page.evaluate(()=>{localStorage.setItem('monoid.modeOnboarding.v1',JSON.stringify({loom:{reveal:true,orient:true,discovery:true,payoff:true}}));localStorage.setItem('monoid.modeIntro.v2',JSON.stringify({loom:true}))});
  await page.locator('#startRun').click();
  await dismissModeIntro(page);
  await expect(page.locator('#modeIndicator .modePip')).toHaveCount(8);
  await expect(page.locator('#board .coreNode')).toHaveCount(4);
  await expect(page.locator('#board .boardVoid')).toHaveCount(4);
  let state=await page.evaluate(()=>({mode:window.__monoidGame.state().gameMode,cores:window.__monoidGame.state().cores,voids:window.__monoidGame.state().voids,signal:window.__monoidGame.snapshot().signal,geometry:window.__monoidGame.snapshot().modeGeometry}));
  expect(state.mode).toBe('loom');expect(state.cores).toHaveLength(4);expect(state.voids).toHaveLength(4);expect(state.signal.base).toBe(2);expect(state.geometry.visibleIds).toHaveLength(8);

  await page.locator('#menuButton').click();await page.locator('#gameSelectionButton').click();await expect(page.locator('#gameSelection')).toBeVisible();
  await page.evaluate(()=>window.__monoidModes.select(5));
  await expect(page.locator('#modeName')).toHaveText('THE PEAKS');
  await expect(page.locator('#modeDescription')).toHaveText('5|5 · Signal 2');
  await page.evaluate(()=>{localStorage.setItem('monoid.modeOnboarding.v1',JSON.stringify({peaks:{reveal:true,orient:true,discovery:true,payoff:true}}));localStorage.setItem('monoid.modeIntro.v2',JSON.stringify({peaks:true}))});
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#startRun').click();
  await dismissModeIntro(page);
  await expect(page.locator('#modeIndicator .modePip')).toHaveCount(10);
  await expect(page.locator('#board .coreNode')).toHaveCount(6);
  await expect(page.locator('#board .coreNode.corePeak')).toHaveCount(2);
  await expect(page.locator('#board .boardVoid')).toHaveCount(4);
  state=await page.evaluate(()=>({mode:window.__monoidGame.state().gameMode,cores:window.__monoidGame.state().cores,voids:window.__monoidGame.state().voids,signal:window.__monoidGame.snapshot().signal,geometry:window.__monoidGame.snapshot().modeGeometry}));
  expect(state.mode).toBe('peaks');expect(state.cores.filter(core=>core.peak)).toHaveLength(2);expect(state.signal.base).toBe(2);expect(state.geometry.visibleIds).toHaveLength(10);
  expect(state.cores.filter(core=>core.peak).map(({half,x,y})=>({half,x,y}))).toEqual([{half:'north',x:8,y:6},{half:'south',x:8,y:16}]);

  const peak=page.locator('#board .coreNode.corePeak').first(),box=await peak.boundingBox();expect(box).toBeTruthy();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(600);await page.mouse.up();
  await expect(page.locator('#overlayTitle')).toContainText('PEAK');
  await expect(page.locator('#overlayBody')).toContainText('LEAD / LINK Ability');
  await expect(page.locator('#overlayBody')).toContainText('PEAK ×2');
});
