const { test, expect } = require('@playwright/test');

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('iterion.entryBypass.v1','true'));
});

test('Gameplay Exploration V2 gives the board full width and keeps hand dominoes physical',async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('http://127.0.0.1:4173/');

  const menu=page.locator('#menuButton');
  await expect(menu).toHaveText('MONOID');
  await expect(menu).toHaveAttribute('aria-label','Open game menu');

  const board=page.locator('#board');
  const boardBox=await board.boundingBox();
  expect(boardBox.width).toBeGreaterThan(340);
  expect(boardBox.width/boardBox.height).toBeCloseTo(0.75,2);

  const hand=page.locator('#hand');
  expect(await hand.evaluate(el=>getComputedStyle(el).flexDirection)).toBe('row');
  const dominoes=hand.locator('.domino');
  await expect(dominoes).toHaveCount(5);
  for(const box of await dominoes.evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return{w:r.width,h:r.height}}))){
    expect(box.h/box.w).toBeCloseTo(2,1);
  }

  const header=await page.locator('.handHeader .label').boundingBox(),handBox=await hand.boundingBox();expect(Math.abs((header.x+header.width/2)-(handBox.x+handBox.width/2))).toBeLessThan(2);
  const first=await hand.locator('.handSlot').first().boundingBox();
  const last=await hand.locator('.handSlot').last().boundingBox();
  expect(last.x).toBeGreaterThan(first.x);
  expect(Math.abs(last.y-first.y)).toBeLessThan(2);

  await expect(page.locator('#moveTool')).toContainText('7 MOVES');
  await expect(page.locator('#shopButton')).toContainText('SHOP');
  await menu.click();
  await expect(page.locator('#gameMenu')).toBeVisible();
  await expect(page.locator('#menuHelpButton')).toBeVisible();await expect(page.locator('#menuHelpButton')).toHaveText('Rulebook');

  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('gameplay-v2-390x844.png'),fullPage:true});
});

test('Gameplay Exploration V2 remains one-screen on the short mobile fixture',async({page})=>{
  await page.setViewportSize({width:375,height:667});
  await page.goto('http://127.0.0.1:4173/');
  const boardBox=await page.locator('#board').boundingBox();
  expect(boardBox.width).toBeGreaterThan(300);
  expect(boardBox.height).toBeLessThanOrEqual(430);
  expect(await page.evaluate(()=>({
    bodyH:document.body.scrollHeight,
    viewportH:window.innerHeight,
    htmlW:document.documentElement.scrollWidth,
    viewportW:window.innerWidth
  }))).toEqual(expect.objectContaining({bodyH:667,viewportH:667,htmlW:375,viewportW:375}));
  const ratio=await page.locator('#hand .domino').first().evaluate(el=>{const r=el.getBoundingClientRect();return r.height/r.width});
  expect(ratio).toBeCloseTo(2,1);
});


async function startFramesFixture(page){
  await page.addInitScript(()=>{
    localStorage.setItem('iterion.entryBypass.v1','true');
    localStorage.setItem('iterion.activeRunMode.v1','frames');
    localStorage.setItem('monoid.firstRunBriefing.v1','seen');
    localStorage.setItem('monoid.modeIntro.v2',JSON.stringify({frames:true}));
    localStorage.setItem('monoid.modeOnboarding.v1',JSON.stringify({frames:{reveal:true,orient:true,discovery:true,payoff:true}}));
  });
  await page.goto('http://127.0.0.1:4173/');
  await expect.poll(()=>page.evaluate(()=>window.__monoidGame?.state?.().gameMode)).toBe('frames');
}

test('Frames Voids read as recessed holes and inspect to only VOID',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await startFramesFixture(page);
  const holes=page.locator('#board .boardVoid');await expect(holes).toHaveCount(2);
  const visual=await holes.first().evaluate(el=>({
    background:getComputedStyle(el).backgroundColor,
    body:getComputedStyle(document.body).backgroundColor,
    shadow:getComputedStyle(el).boxShadow,
    after:getComputedStyle(el,'::after').content
  }));
  expect(visual.background).toBe(visual.body);expect(visual.shadow).toContain('inset');expect(visual.after).toBe('none');
  const boardShadow=await page.locator('#board').evaluate(el=>getComputedStyle(el).boxShadow);
  expect(boardShadow).not.toBe('none');expect(boardShadow).not.toContain('inset');
  await holes.first().click();
  await expect(page.locator('#overlay')).toHaveClass(/show/);
  await expect(page.locator('.voidInspectorWord')).toHaveText('VOID');
  expect((await page.locator('#overlay .modal').innerText()).trim()).toBe('VOID');
});

test('releasing a Hand drag over a Core never opens the Core inspector',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await startFramesFixture(page);
  const tile=page.locator('#hand .tile:not(.unplayable)').first(),core=page.locator('#board .coreNode').first();
  const tileBox=await tile.boundingBox(),coreBox=await core.boundingBox();expect(tileBox).toBeTruthy();expect(coreBox).toBeTruthy();
  const sx=tileBox.x+tileBox.width/2,sy=tileBox.y+tileBox.height/2,cx=coreBox.x+coreBox.width/2,cy=coreBox.y+coreBox.height/2;
  await page.mouse.move(sx,sy);await page.mouse.down();await page.mouse.move(sx+16,sy,{steps:2});await page.mouse.move(cx,cy,{steps:5});await page.mouse.up();
  await page.waitForTimeout(120);
  await expect(page.locator('.coreInspector')).toHaveCount(0);
  await expect(page.locator('.voidInspectorWord')).toHaveCount(0);
});

test('stable placement target survives a small release slip toward its neighbour',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await startFramesFixture(page);
  const tile=page.locator('#hand .tile:not(.unplayable)').first(),tileBox=await tile.boundingBox();expect(tileBox).toBeTruthy();
  const probe=await page.evaluate(()=>{
    const g=window.__monoidGame,E=window.IterionEngine,D=window.IterionData,s=g.state(),i=s.hand.findIndex((tile,index)=>tile&&g.candidatesForIndex(index).length),tile=s.hand[i],candidates=g.candidatesForIndex(i),r=document.querySelector('#board').getBoundingClientRect();
    const points=candidates.map(c=>{const p=E.pieceFrom(tile,c.x,c.y,0,c.rr,-1);return{c,x:(p.rect.minx+p.rect.maxx)/2/E.G*r.width,y:(p.rect.miny+p.rect.maxy)/2/E.H*r.height}});
    const nearest=(x,y)=>points.reduce((best,p)=>{const d=Math.hypot(p.x-x,p.y-y);return!best||d<best.d?{p,d}:best},null).p;
    for(let a=0;a<points.length;a++)for(let b=0;b<points.length;b++){
      if(a===b)continue;const A=points[a],B=points[b],d=Math.hypot(B.x-A.x,B.y-A.y);if(d<16||d>22)continue;
      const ux=(B.x-A.x)/d,uy=(B.y-A.y)/d,slip=Math.min(11,d/2+1),rx=A.x+ux*slip,ry=A.y+uy*slip,n=nearest(rx,ry);
      if(n!==B)continue;
      return{index:i,a:A.c,b:B.c,start:{x:r.left+A.x,y:r.top+A.y+(D.DRAG_Y_OFFSET||0)},release:{x:r.left+rx,y:r.top+ry+(D.DRAG_Y_OFFSET||0)},distance:d,slip};
    }
    return null
  });
  expect(probe).toBeTruthy();expect(probe.slip).toBeLessThanOrEqual(12);
  const sx=tileBox.x+tileBox.width/2,sy=tileBox.y+tileBox.height/2;
  await page.mouse.move(sx,sy);await page.mouse.down();await page.mouse.move(sx+16,sy,{steps:2});await page.mouse.move(probe.start.x,probe.start.y,{steps:6});await page.waitForTimeout(140);await page.mouse.move(probe.release.x,probe.release.y);await page.mouse.up();
  await expect.poll(()=>page.evaluate(()=>window.__monoidGame.state().pieces.length),{timeout:12000}).toBe(1);
  const placed=await page.evaluate(()=>{const p=window.__monoidGame.state().pieces[0];return{x:p.cubes[0].x,y:p.cubes[0].y,rr:p.rr}});
  expect(placed).toEqual({x:probe.a.x,y:probe.a.y,rr:probe.a.rr});
});


test('intentional drag across the snap tolerance switches to the neighbouring placement',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await startFramesFixture(page);
  const tile=page.locator('#hand .tile:not(.unplayable)').first(),tileBox=await tile.boundingBox();expect(tileBox).toBeTruthy();
  const probe=await page.evaluate(()=>{
    const g=window.__monoidGame,E=window.IterionEngine,D=window.IterionData,s=g.state(),i=s.hand.findIndex((tile,index)=>tile&&g.candidatesForIndex(index).length),tile=s.hand[i],candidates=g.candidatesForIndex(i),r=document.querySelector('#board').getBoundingClientRect();
    const points=candidates.map(c=>{const p=E.pieceFrom(tile,c.x,c.y,0,c.rr,-1);return{c,x:(p.rect.minx+p.rect.maxx)/2/E.G*r.width,y:(p.rect.miny+p.rect.maxy)/2/E.H*r.height}});
    for(let a=0;a<points.length;a++)for(let b=0;b<points.length;b++){if(a===b)continue;const A=points[a],B=points[b],d=Math.hypot(B.x-A.x,B.y-A.y);if(d<16||d>40)continue;return{index:i,a:A.c,b:B.c,start:{x:r.left+A.x,y:r.top+A.y+(D.DRAG_Y_OFFSET||0)},end:{x:r.left+B.x,y:r.top+B.y+(D.DRAG_Y_OFFSET||0)},distance:d}}
    return null
  });
  expect(probe).toBeTruthy();expect(probe.distance).toBeGreaterThan(12);
  const sx=tileBox.x+tileBox.width/2,sy=tileBox.y+tileBox.height/2;
  await page.mouse.move(sx,sy);await page.mouse.down();await page.mouse.move(sx+16,sy,{steps:2});await page.mouse.move(probe.start.x,probe.start.y,{steps:6});await page.waitForTimeout(140);await page.mouse.move(probe.end.x,probe.end.y,{steps:5});await page.mouse.up();
  await expect.poll(()=>page.evaluate(()=>window.__monoidGame.state().pieces.length),{timeout:12000}).toBe(1);
  const placed=await page.evaluate(()=>{const p=window.__monoidGame.state().pieces[0];return{x:p.cubes[0].x,y:p.cubes[0].y,rr:p.rr}});
  expect(placed).toEqual({x:probe.b.x,y:probe.b.y,rr:probe.b.rr});
});
