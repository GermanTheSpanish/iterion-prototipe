const {test,expect}=require('@playwright/test');
async function openHelp(page){await page.locator('#menuButton').click();await page.locator('#menuHelpButton').click()}

// Inspect actual pip geometry, not just the presence of preview classes.
async function compactGeometry(locator){
  return locator.evaluateAll(nodes=>nodes.map(tile=>{
    const box=tile.getBoundingClientRect(),mark=tile.querySelector('.tileModMark'),m=mark?.getBoundingClientRect();
    const halves=[...tile.querySelectorAll(':scope > .half')].map(half=>{
      const h=half.getBoundingClientRect(),p=half.querySelector('.spips'),r=p.getBoundingClientRect(),css=getComputedStyle(half);
      const pips=[...p.children].map(dot=>dot.getBoundingClientRect());
      return{count:pips.length,dx:Math.abs(r.x+r.width/2-h.x-h.width/2),dy:Math.abs(r.y+r.height/2-h.y-h.height/2),opacity:getComputedStyle(p).opacity,
        border:parseFloat(css.borderTopWidth),fits:pips.every(d=>d.left>=h.left&&d.right<=h.right&&d.top>=h.top&&d.bottom<=h.bottom),
        overlapsMark:!!m&&pips.some(d=>d.left<m.right&&d.right>m.left&&d.top<m.bottom&&d.bottom>m.top),
        pipColor:p.children[0]?getComputedStyle(p.children[0]).backgroundColor:null};
    });
    const pseudo=getComputedStyle(tile,'::before');
    return{label:tile.parentElement.getAttribute('aria-label'),halves,compact:tile.classList.contains('compactPreview'),
      mark:mark?{text:mark.textContent,color:getComputedStyle(mark).color,size:parseFloat(getComputedStyle(mark).fontSize),dx:Math.abs(m.x+m.width/2-box.x-box.width/2),dy:Math.abs(m.y+m.height/2-box.y-box.height/2)}:null,
      circuit:tile.classList.contains('circuitTile'),power:tile.classList.contains('powerTile'),
      background:pseudo.content==='""'?pseudo.backgroundColor:getComputedStyle(tile).backgroundColor};
  }));
}

function assertCompactValues(tiles){
  expect(tiles.length).toBeGreaterThan(0);
  for(const tile of tiles){
    expect(tile.compact).toBe(true);
    const values=tile.label?.match(/(?:Domino|domino) (\d)\|(\d)/);
    expect(values).toBeTruthy();
    for(const [index,half] of tile.halves.entries()){
      expect(half.count).toBe(Number(values[index+1]));
      expect(half.dx).toBeLessThan(0.6);
      // Border belongs to the lower half; its content remains centred below it.
      expect(half.dy).toBeLessThanOrEqual(half.border/2+0.6);
      expect(half.opacity).toBe('1');expect(half.fits).toBe(true);expect(half.overlapsMark).toBe(false);
      if(half.pipColor){
        const luminance=color=>{const rgb=color.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722};
        const a=luminance(half.pipColor),b=luminance(tile.background);
        expect((Math.max(a,b)+.05)/(Math.min(a,b)+.05)).toBeGreaterThan(4.5);
      }
    }
    if(tile.mark){expect(tile.mark.text).toMatch(/^(DD|DE|ZP|PX|CR|LN|OV|TE)$/);expect(tile.mark.size).toBe(11);expect(tile.mark.dx).toBeLessThan(.6);expect(tile.mark.dy).toBeLessThan(.6);if(tile.circuit)expect(tile.mark.color).toBe('rgba(255, 255, 255, 0.3)')}
  }
}

for(const width of [375,430])for(const endless of [false,true]){
  test(`compact Market values stay centred at ${width}px, endless=${endless}`,async({page},testInfo)=>{
    await page.setViewportSize({width,height:width===375?667:932});
    await page.addInitScript(()=>localStorage.setItem('monoid.firstRunBriefing.v1','seen'));
    await page.goto('http://127.0.0.1:4173/');
    await expect.poll(()=>page.evaluate(()=>!!window.MonoidLatePolish&&!!window.MonoidPhaseA)).toBe(true);
    await page.locator('#titleCard').click();await page.locator('#startRun').click();
    await page.evaluate(endless=>{
      const g=window.__monoidGame,s=g.state(),E=window.IterionEngine;
      const ids=['d6-6','d1-1','d0-5','d2-2','d3-3','d4-4','d0-0','d0-1','d0-2','d0-3'];
      s.round=endless?17:2;s.endlessMode=endless;s.cleared=true;s.nextShopType='market';s.intermissionResolved=false;s.coins=200;
      s.doubleDoubleTileId='d6-6';s.doubleEchoTileId='d1-1';s.zeroPortTileIds=['d0-5','d0-0'];s.circuitRanks={'d6-6':3,'d3-3':1};
      s.set.find(t=>t.id==='d6-6').powerMultiplier=2;s.set.find(t=>t.id==='d0-5').powerMultiplier=3;s.set.find(t=>t.id==='d2-2').upgrade=2;
      s.pieces=ids.map((id,i)=>{const t=s.set.find(t=>t.id===id),p=E.pieceFrom(t,2+(i%4)*4,4+Math.floor(i/4)*4,0,1,i+1);p.tile={...t};return p});
      s.placedTileIds=ids.slice();s.hand=s.hand.map(t=>ids.includes(t?.id)?null:t);s.reserve=s.reserve.filter(t=>!ids.includes(t.id));
      g.openIntermission();s.shopOffers=['double-double','double-echo','zero-port'];
    },endless);
    await openHelp(page);await page.locator('#overlayPrimary').click();
    await expect(page.locator('.marketStructuredOffer')).toHaveCount(3);
    const tiles=await compactGeometry(page.locator('.marketAssignedGroup .marketAssignedTile .domino'));
    assertCompactValues(tiles);expect(tiles.filter(t=>t.mark)).toHaveLength(4);
    expect(tiles.some(t=>t.circuit&&t.power)).toBe(true);expect(tiles.some(t=>t.power&&!t.circuit)).toBe(true);
    await expect(page.locator('.marketPoolGroup .marketTile')).toHaveCount(0);
    await expect(page.locator('[data-market-offer="zero-port"] .marketAssignedGroup .marketAssignedTile')).toHaveCount(2);
    await expect(page.locator('.app .compactPreview')).toHaveCount(0);
    const boardMark=page.locator('#board .piece:has(.tileModMark)').first();
    expect(await boardMark.locator('.tileModMark').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(15);
    expect(await boardMark.locator('.pips').first().evaluate(el=>getComputedStyle(el).opacity)).toBe('1');
    const boardMarkStyle=await boardMark.evaluate(el=>({circuit:el.classList.contains('circuitTile'),color:getComputedStyle(el.querySelector('.tileModMark')).color}));
    expect(boardMarkStyle.color).toBe(boardMarkStyle.circuit?'rgba(255, 255, 255, 0.3)':'rgba(17, 17, 17, 0.2)');
    expect(await page.evaluate(()=>{const g=window.__monoidGame,before=JSON.stringify(g.exportState());window.MonoidLatePolish.sync();window.MonoidPhaseA.sync();return before===JSON.stringify(g.exportState())})).toBe(true);
    expect(await page.locator('.commerceModal').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
    if(endless){
      const wordmarkColor=await page.locator('.wordmark').evaluate(el=>getComputedStyle(el).color);expect(wordmarkColor).not.toBe('rgb(23, 23, 23)');
      const toolColor=await page.locator('#reroll').evaluate(el=>getComputedStyle(el).color);expect(toolColor).not.toBe('rgb(23, 23, 23)')
    }
    await page.screenshot({path:testInfo.outputPath(`compact-market-${width}-${endless}.png`)});
  });
}

test('Shop uses compact geometry without revealing its face-down domino',async({page})=>{
  await page.setViewportSize({width:375,height:667});
  await page.addInitScript(()=>localStorage.setItem('monoid.firstRunBriefing.v1','seen'));
  await page.goto('http://127.0.0.1:4173/');await expect.poll(()=>page.evaluate(()=>!!window.MonoidLatePolish&&!!window.MonoidPhaseA)).toBe(true);
  await page.locator('#titleCard').click();await page.locator('#startRun').click();
  await page.evaluate(()=>{window.__monoidGame.state().coins=200});await page.locator('#shopButton').click();
  const preview=page.locator('.randomTilePreview .domino');await expect(preview).toHaveClass(/compactPreview/);await expect(preview).toHaveClass(/back/);
  expect(await preview.locator('.half').first().evaluate(el=>getComputedStyle(el).opacity)).toBe('0');
  await expect(preview.locator('.tileModMark')).toHaveCount(0);
  await page.locator('#shopRandomBuy').click();await expect(preview).toHaveClass(/reveal/);
  await expect.poll(()=>preview.evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length)).toBe(0);
  assertCompactValues(await compactGeometry(preview));
  await expect(page.locator('.app .compactPreview')).toHaveCount(0);
});

test('late mobile polish keeps MONOID centred and Market uses one stable three-band structure',async({page})=>{
  await page.setViewportSize({width:430,height:932});
  await page.addInitScript(()=>localStorage.setItem('monoid.firstRunBriefing.v1','seen'));
  await page.goto('http://127.0.0.1:4173/');
  await expect.poll(()=>page.evaluate(()=>window.__MONOID_BUILD)).toBe('20260919.1');
  await expect.poll(()=>page.evaluate(()=>!!window.MonoidPhaseA)).toBe(true);
  await page.locator('#titleCard').click();await page.locator('#startRun').click();
  const wordmark=await page.locator('.wordmark').boundingBox();expect(Math.abs(wordmark.x+wordmark.width/2-215)).toBeLessThan(1);expect(wordmark.width).toBeGreaterThanOrEqual(118);expect(wordmark.width).toBeLessThanOrEqual(132);

  await page.evaluate(()=>{const g=window.__monoidGame||window.__nomonGame,s=g.state(),E=window.IterionEngine;const ids=['d1-1','d2-2','d3-3','d4-4','d5-5','d6-6'];s.round=2;s.cleared=true;s.nextShopType='market';s.intermissionResolved=false;s.coins=80;s.pieces=ids.map((id,i)=>{const t=s.set.find(t=>t.id===id),p=E.pieceFrom(t,2+(i%3)*6,4+Math.floor(i/3)*8,0,i%2?1:0,i+1);p.tile={...t};return p});s.placedTileIds=ids.slice();s.doubleDoubleTileId='d3-3';s.doubleEchoTileId=null;s.zeroPortTileIds=[];s.circuitRanks={'d3-3':1};s.hand=s.hand.map(t=>s.placedTileIds.includes(t?.id)?null:t);s.reserve=s.reserve.filter(t=>!s.placedTileIds.includes(t.id));g.openIntermission();s.shopOffers=['double-double','double-echo','long-run']});
  await openHelp(page);await page.locator('#overlayPrimary').click();await expect(page.locator('#overlayTitle')).toHaveText('MARKET');
  await expect.poll(()=>page.locator('.marketStructuredOffer').count()).toBe(3);
  expect(await page.locator('.marketAssignments').evaluate(el=>getComputedStyle(el).display)).toBe('none');

  const dd=page.locator('[data-market-offer="double-double"]');
  await expect(dd.locator('.marketAssignedGroup .marketAssignedTile')).toHaveCount(1);
  await expect(dd.locator('.marketAssignedGroup .marketContextLabel')).toHaveText('INSTALLED');
  await expect(dd.locator('.marketPoolGroup .marketContextLabel')).toHaveText('COMPATIBLE · 5');
  await expect(dd.locator('.marketPoolGroup .marketTile')).toHaveCount(0);

  const de=page.locator('[data-market-offer="double-echo"]');
  await expect(de.locator('.marketPoolGroup .marketContextLabel')).toHaveText('COMPATIBLE · 5');
  await expect(de.locator('.marketPoolGroup .marketTile')).toHaveCount(0);
  await expect(page.locator('[data-market-offer="long-run"] .marketMachineTag strong')).toHaveText('MACHINE');
  await expect(page.locator('.shopFoot')).toContainText('choose a highlighted compatible tile on the board');

  const buttonBoxes=await page.locator('.marketStructuredOffer .marketOfferAction .shopBuy').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{w:r.width,h:r.height}}));
  expect(buttonBoxes.every(b=>Math.abs(b.w-112)<2&&b.h>=44)).toBe(true);
  const overflow=await page.locator('.commerceModal').evaluate(el=>({sw:el.scrollWidth,cw:el.clientWidth}));expect(overflow.sw).toBeLessThanOrEqual(overflow.cw+1);

  const circuitMarkColor=await dd.locator('.marketAssignedTile .tileModMark').evaluate(el=>getComputedStyle(el).color);
  expect(circuitMarkColor).toBe('rgba(255, 255, 255, 0.3)');
  const markSize=await dd.locator('.marketAssignedTile .tileModMark').evaluate(el=>parseFloat(getComputedStyle(el).fontSize));expect(markSize).toBe(11);

  await dd.locator('.marketOfferAction .shopBuy').click();
  await expect(page.locator('#overlay')).not.toHaveClass(/show/);
  await expect(page.locator('#circuitChoice')).toContainText('DOUBLE DOUBLE · CHOOSE A TILE');
  await expect(page.locator('#board .circuitEligible')).toHaveCount(5);
  await page.locator('.piece[data-tile-id="d4-4"]').click();
  await expect(page.locator('#circuitChoice')).toBeHidden();
  expect(await page.evaluate(()=>window.__monoidGame.state().doubleDoubleTileId)).toBe('d4-4');
  expect(await page.evaluate(()=>window.__monoidGame.state().pendingModPlacement)).toBe(null);
  expect(await page.evaluate(()=>window.MonoidLatePolish.scientific(1.1641532182693482e33))).toBe('1.16e33');
  await page.evaluate(()=>{const g=window.__monoidGame||window.__nomonGame;g.state().score=8.603241731728167e47;window.MonoidLatePolish.sync();window.MonoidPhaseA.sync()});await expect(page.locator('#score')).toHaveText('8.6e47');await expect(page.locator('#score')).toHaveClass(/extremeValue/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
});

test('Market keeps the same component and touch targets on 375px phones',async({page})=>{
  await page.setViewportSize({width:375,height:667});
  await page.addInitScript(()=>localStorage.setItem('monoid.firstRunBriefing.v1','seen'));
  await page.goto('http://127.0.0.1:4173/');await page.locator('#titleCard').click();await page.locator('#startRun').click();
  await page.evaluate(()=>{const g=window.__monoidGame,s=g.state(),E=window.IterionEngine,ids=['d1-1','d2-2','d3-3','d4-4'];s.round=2;s.cleared=true;s.nextShopType='market';s.intermissionResolved=false;s.coins=40;s.pieces=ids.map((id,i)=>{const t=s.set.find(t=>t.id===id),p=E.pieceFrom(t,2+i*4,4,0,1,i+1);p.tile={...t};return p});s.placedTileIds=ids.slice();s.hand=s.hand.map(t=>s.placedTileIds.includes(t?.id)?null:t);s.reserve=s.reserve.filter(t=>!s.placedTileIds.includes(t.id));g.openIntermission();s.shopOffers=['double-double','double-echo','long-run']});
  await openHelp(page);await page.locator('#overlayPrimary').click();await expect.poll(()=>page.locator('.marketStructuredOffer').count()).toBe(3);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const actions=await page.locator('.marketOfferAction .shopBuy').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().height));expect(actions.every(h=>h>=44)).toBe(true);
  await expect(page.locator('.marketStructuredOffer').first().locator('.marketOfferDescription')).toBeVisible()
});

test('Phase A compacts primary numbers at 50K and thickens the score instrument without overlap',async({page})=>{
  await page.setViewportSize({width:375,height:812});
  await page.addInitScript(()=>localStorage.setItem('monoid.firstRunBriefing.v1','seen'));
  await page.goto('http://127.0.0.1:4173/');await expect.poll(()=>page.evaluate(()=>!!window.MonoidPhaseA)).toBe(true);
  await page.locator('#titleCard').click();await page.locator('#startRun').click();
  await page.evaluate(()=>{
    const g=window.__monoidGame,s=g.state();s.score=10495000000;g.config.TARGETS[s.round]=38147010;window.MonoidPhaseA.sync()
  });
  await expect(page.locator('#score')).toHaveText('10.5B');await expect(page.locator('#target')).toHaveText('38.1M');
  expect(await page.evaluate(()=>window.MonoidPhaseA.compactPrimary(49999))).toBe('49,999');
  expect(await page.evaluate(()=>window.MonoidPhaseA.compactPrimary(50000))).toBe('50K');
  const boxes=await page.locator('#target,#score').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{x:r.x,right:r.right,width:r.width}}));expect(boxes[0].right).toBeLessThan(boxes[1].x);
  const barHeight=await page.locator('.scoreProgressTrack').evaluate(el=>parseFloat(getComputedStyle(el).height));expect(barHeight).toBeGreaterThanOrEqual(3);
  const wordmark=await page.locator('.wordmark').boundingBox();expect(Math.abs(wordmark.x+wordmark.width/2-187.5)).toBeLessThan(1);
  const menu=await page.locator('#menuButton').boundingBox();expect(menu.x+menu.width/2).toBeGreaterThan(330);
  expect(await page.locator('#menuButton').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
});