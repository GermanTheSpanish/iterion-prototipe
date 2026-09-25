const { test, expect } = require('@playwright/test');
test.beforeEach(async({page})=>page.addInitScript(()=>localStorage.setItem('iterion.entryBypass.v1','true')));

test('v028 resolved SCORE progress, abbreviations and debug file sharing',async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});
    Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{const f=data.files[0];window.__sharedDebug={name:f.name,type:f.type,text:await f.text(),title:data.title}}});
  });
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.locator('.wordmark')).toHaveText('MONOID');
  await expect(page).toHaveTitle('MONOID v0.44.3');
  expect(await page.evaluate(()=>[window.IterionPresentation.cascadeDelay(0),window.IterionPresentation.cascadeDelay(1),window.IterionPresentation.cascadeDelay(2),window.IterionPresentation.cascadeDelay(1000)])).toEqual([600,600,560,60]);
  expect(await page.evaluate(()=>window.IterionPresentation.CASCADE.scoreTweenMs)).toBe(520);
  await expect(page.locator('#scoreDetail .scoreProgress')).toBeVisible();
  expect(await page.evaluate(()=>window.IterionPresentation.compact(4.88e17))).toBe('488Qa');
  expect(await page.evaluate(()=>window.IterionPresentation.compact(6.058e19))).toBe('60,580Qa');
  const scoreBefore=await page.locator('#score').textContent();
  await page.evaluate(()=>{
    document.querySelector('#target').textContent='1K';
    document.querySelector('#targetDetail').setAttribute('aria-label','Target 1,000. Show exact value.');
    const d=document.createElement('div');d.className='opfx signalValue add lane0';d.dataset.lane='main';d.dataset.output='250';document.querySelector('#board').appendChild(d);
  });
  await page.waitForTimeout(450);await expect(page.locator('#score')).toHaveText(scoreBefore);await expect(page.locator('.scoreProgress')).toHaveAttribute('data-stage','target');
  expect(parseFloat(await page.locator('.scoreProgressFill').evaluate(el=>el.style.width))).toBeCloseTo(0,1);
  await page.evaluate(()=>document.querySelector('#scoreDetail').setAttribute('aria-label','Score 250. Last move. Show exact value.'));
  await expect.poll(()=>page.locator('#score').textContent()).toBe('250');expect(parseFloat(await page.locator('.scoreProgressFill').evaluate(el=>el.style.width))).toBeCloseTo(25,1);
  await page.evaluate(()=>{document.querySelectorAll('.signalValue').forEach(el=>el.remove());const d=document.createElement('div');d.className='opfx signalValue multiply lane0';d.dataset.lane='main';d.dataset.output='3500';document.querySelector('#board').appendChild(d)});
  await page.waitForTimeout(450);await expect(page.locator('#score')).toHaveText('250');
  await page.evaluate(()=>document.querySelector('#scoreDetail').setAttribute('aria-label','Score 3,500. Target reached. Show exact value.'));
  await expect.poll(()=>page.locator('#score').textContent()).toBe('3,500');await expect(page.locator('.scoreProgress')).toHaveAttribute('data-stage','clear');expect(parseFloat(await page.locator('.scoreProgressFill').evaluate(el=>el.style.width))).toBeCloseTo(100,1);await expect(page.locator('.scoreProgressNext')).toHaveText('×3.5 TARGET');
  const batchBefore=await page.evaluate(()=>window.__monoidPlaytestBatch.batchId);await page.locator('#menuButton').click();await expect(page.locator('#copyrun')).toHaveText('Share debug .txt');await page.locator('#copyrun').click();
  await expect.poll(()=>page.evaluate(()=>window.__sharedDebug?.name||'')).toMatch(/^MONOID_PLAYTEST_v0\.44\.3_.+\.txt$/);
  const shared=await page.evaluate(()=>window.__sharedDebug);expect(shared.type).toBe('text/plain');expect(shared.title).toBe('MONOID PLAYTEST');expect(shared.text).toContain('MONOID PLAYTEST BATCH v1');expect(shared.text).toContain('MONOID DEBUG v0.44.3');expect(shared.text).toContain('Run ID:');expect(shared.text).toContain('PERFORMANCE TELEMETRY');expect(shared.text).toContain('Batch ID:');
  await expect.poll(()=>page.evaluate(()=>window.__monoidPlaytestBatch.batchId)).not.toBe(batchBefore);const batchAfter=await page.evaluate(()=>window.__monoidPlaytestBatch);expect(shared.text).toContain(`Batch ID: ${batchBefore}`);expect(shared.text).not.toContain(`Batch ID: ${batchAfter.batchId}`);await page.screenshot({path:testInfo.outputPath('score-progress-share.png'),fullPage:true});
});

test('v028 debug export falls back to a downloadable txt file',async({page})=>{
  await page.setViewportSize({width:375,height:667});
  await page.addInitScript(()=>{Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>false})});
  await page.goto('http://127.0.0.1:4173/');await page.locator('#menuButton').click();
  const downloadPromise=page.waitForEvent('download');await page.locator('#copyrun').click();const download=await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^MONOID_PLAYTEST_v0\.44\.3_.+\.txt$/);
});

test('v028 POWER reads as pale material and Overkills use explicit physical centre dividers',async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4173/');
  await page.evaluate(()=>{
    const d=document.querySelector('#hand .domino');d.classList.add('powerTile','power2','circuitTile','circuitRank3');const p=document.createElement('i');p.className='powerMark';p.textContent='×2';d.appendChild(p);const u=document.createElement('i');u.className='upgradeDot u2';d.appendChild(u);const c=document.createElement('i');c.className='circuitRankMark';c.textContent='III';d.appendChild(c);
    const h=document.createElement('div');h.className='piece h circuitTile';h.innerHTML='<div class="cube"></div><div class="cube"></div><i class="upgradeDot u3"></i>';h.style.cssText='position:absolute;left:10px;top:10px;width:80px;height:30px';document.querySelector('#board').appendChild(h);
    const v=document.createElement('div');v.className='piece v';v.innerHTML='<div class="cube"></div><div class="cube"></div><i class="upgradeDot u1"></i>';v.style.cssText='position:absolute;left:100px;top:10px;width:30px;height:80px';document.querySelector('#board').appendChild(v);
    window.NomonUiPolish.syncOverkillTiles(document);
  });
  const tile=page.locator('#hand .domino').first(),horizontalPiece=page.locator('#board .piece.h').last(),verticalPiece=page.locator('#board .piece.v').last();
  await expect(tile).toHaveClass(/overkillTier2/);await expect(horizontalPiece).toHaveClass(/overkillTier3/);await expect(verticalPiece).toHaveClass(/overkillTier1/);
  expect(await tile.locator('.powerMark').evaluate(el=>getComputedStyle(el).opacity)).toBe('0');
  expect(await tile.locator('.circuitRankMark').evaluate(el=>getComputedStyle(el).display)).toBe('none');
  expect(await tile.locator('.upgradeDot').evaluate(el=>getComputedStyle(el).display)).toBe('none');
  const handDivider=await tile.locator('.half').nth(1).evaluate(el=>{const s=getComputedStyle(el);return{color:s.borderTopColor,width:s.borderTopWidth}});expect(handDivider.color).toBe('rgb(154, 112, 181)');expect(parseFloat(handDivider.width)).toBeGreaterThanOrEqual(3);
  const horizontal=await horizontalPiece.locator('.cube').nth(1).evaluate(el=>{const s=getComputedStyle(el);return{color:s.borderLeftColor,width:s.borderLeftWidth}});expect(horizontal.color).toBe('rgb(211, 154, 47)');expect(parseFloat(horizontal.width)).toBeGreaterThanOrEqual(3);
  const vertical=await verticalPiece.locator('.cube').nth(1).evaluate(el=>{const s=getComputedStyle(el);return{color:s.borderTopColor,width:s.borderTopWidth}});expect(vertical.color).toBe('rgb(79, 134, 183)');expect(parseFloat(vertical.width)).toBeGreaterThanOrEqual(3);
  await page.screenshot({path:testInfo.outputPath('power-pale-overkill-dividers.png')});
});

test('v028 inspector mirrors the current Overkill tier as the same centre line',async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4173/');
  await page.evaluate(()=>{
    const overlay=document.querySelector('#overlay');overlay.className='overlay show aux';overlay.querySelector('.modal').classList.add('auxModal');
    document.querySelector('#overlayTitle').textContent='[3|5]';
    document.querySelector('#overlayBody').innerHTML='<div class="inspector"><section class="inspectSection"><div class="inspectHero"><strong>[3|5]</strong><span>Standard domino</span></div></section><section class="inspectSection"><div class="stateRows"><span>★2 · can pay +2c when activated</span></div></section></div>';
    window.NomonUiPolish.syncInspectorPreview();
  });
  const preview=page.locator('.inspectOverkillPreview'),domino=preview.locator('.inspectOverkillDomino');await expect(preview).toBeVisible();await expect(domino).toHaveClass(/overkillTier2/);await expect(preview.locator('.inspectOverkillLegend')).toContainText('OVERKILL 2');
  const divider=await preview.locator('.inspectOverkillHalf').nth(1).evaluate(el=>{const s=getComputedStyle(el);return{color:s.borderTopColor,width:s.borderTopWidth}});expect(divider.color).toBe('rgb(154, 112, 181)');expect(parseFloat(divider.width)).toBeGreaterThanOrEqual(3);
  await page.screenshot({path:testInfo.outputPath('inspector-overkill-divider.png')});
});

test('v029 tile modifiers stay large but quiet behind physical values in reading order',async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4173/');
  await page.evaluate(()=>{
    const board=document.querySelector('#board');
    const make=(cls,left)=>{const d=document.createElement('div');d.className=`piece ${cls}`;d.style.cssText=`position:absolute;left:${left}px;top:10px;width:${cls.includes('h')?'80px':'30px'};height:${cls.includes('h')?'30px':'80px'}`;d.innerHTML='<div class="cube"><span class="pips"><i class="pip"></i></span></div><div class="cube"><span class="pips"><i class="pip"></i></span></div><i class="tileModMark dd" style="--mod-shift:-3px"><span>D</span><span>D</span></i><i class="tileModMark de" style="--mod-shift:3px"><span>D</span><span>E</span></i>';board.appendChild(d);return d};
    make('h',10);make('v circuitTile',110);
  });
  const horizontal=page.locator('#board .piece.h').last(),vertical=page.locator('#board .piece.v').last();
  const boxes=await horizontal.locator('.tileModMark.dd span').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el.parentElement);return{x:r.x,y:r.y,w:r.width,h:r.height,color:s.color,background:s.backgroundColor,border:s.borderTopWidth}}));
  expect(boxes[0].x).toBeLessThan(boxes[1].x);expect(boxes[0].w).toBeCloseTo(boxes[1].w,0);expect(boxes[0].background).toBe('rgba(0, 0, 0, 0)');expect(boxes[0].border).toBe('0px');expect(boxes[0].color).toBe('rgba(17, 17, 17, 0.2)');const horizontalStyle=await horizontal.locator('.tileModMark.dd').evaluate(el=>({size:parseFloat(getComputedStyle(el).fontSize),weight:Number(getComputedStyle(el).fontWeight)}));expect(horizontalStyle.size).toBeGreaterThanOrEqual(3);expect(horizontalStyle.size).toBeLessThanOrEqual(16);expect(horizontalStyle.weight).toBeGreaterThanOrEqual(900);
  expect(await horizontal.locator('.pips').first().evaluate(el=>getComputedStyle(el).opacity)).toBe('1');
  const verticalBoxes=await vertical.locator('.tileModMark.dd span').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,color:getComputedStyle(el.parentElement).color}}));
  expect(verticalBoxes[0].y).toBeLessThan(verticalBoxes[1].y);expect(verticalBoxes[0].h).toBeCloseTo(verticalBoxes[1].h,0);expect(verticalBoxes[0].color).toBe('rgba(255, 255, 255, 0.3)');
  await expect(horizontal.locator('.tileModMark')).toHaveText(['DD','DE']);await expect(vertical.locator('.tileModMark')).toHaveText(['DD','DE']);
  await page.screenshot({path:testInfo.outputPath('tile-modifiers-by-half.png')});
});

test('v029 Endless commerce keeps black tiles legible on light controls',async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4173/');
  await page.evaluate(()=>{document.body.classList.add('endlessPalette');const host=document.createElement('div');host.className='commerceModal';host.innerHTML='<button class="shopBuy">BUY</button><span class="marketTile"><span class="domino circuitTile"><span class="half"></span><span class="half"></span></span><small>DD</small></span>';document.body.appendChild(host)});
  const button=page.locator('.commerceModal .shopBuy').last(),well=page.locator('.commerceModal .marketTile').last(),tile=well.locator('.domino');
  expect(await button.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(229, 227, 220)');expect(await well.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(216, 213, 204)');expect(await tile.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(112, 112, 107)');
  await page.screenshot({path:testInfo.outputPath('endless-market-contrast.png')});
});
