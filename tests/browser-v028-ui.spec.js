const { test, expect } = require('@playwright/test');

test('v028 live SCORE progress, abbreviations and debug file sharing',async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});
    Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{const f=data.files[0];window.__sharedDebug={name:f.name,type:f.type,text:await f.text(),title:data.title}}});
  });
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.locator('.wordmark')).toHaveText('MONOID');
  await expect(page).toHaveTitle('MONOID v0.28.1');
  expect(await page.evaluate(()=>[window.IterionPresentation.cascadeDelay(0),window.IterionPresentation.cascadeDelay(1),window.IterionPresentation.cascadeDelay(2),window.IterionPresentation.cascadeDelay(1000)])).toEqual([600,432,311,60]);
  await expect(page.locator('#scoreDetail .scoreProgress')).toBeVisible();
  expect(await page.evaluate(()=>window.IterionPresentation.compact(4.88e17))).toBe('488Qa');
  expect(await page.evaluate(()=>window.IterionPresentation.compact(6.058e19))).toBe('60.6Qi');
  await page.evaluate(()=>{
    document.querySelector('#target').textContent='1K';
    document.querySelector('#targetDetail').setAttribute('aria-label','Target 1,000. Show exact value.');
    const d=document.createElement('div');d.className='opfx signalValue add lane0';d.dataset.lane='main';d.dataset.output='250';document.querySelector('#board').appendChild(d);
  });
  await expect.poll(()=>page.locator('#score').textContent()).toBe('250');
  await expect(page.locator('.scoreProgress')).toHaveAttribute('data-stage','target');
  expect(parseFloat(await page.locator('.scoreProgressFill').evaluate(el=>el.style.width))).toBeCloseTo(25,1);
  await page.evaluate(()=>{document.querySelectorAll('.signalValue').forEach(el=>el.remove());const d=document.createElement('div');d.className='opfx signalValue multiply lane0';d.dataset.lane='main';d.dataset.output='3500';document.querySelector('#board').appendChild(d)});
  await expect.poll(()=>page.locator('#score').textContent()).toBe('3.5K');
  await expect(page.locator('.scoreProgress')).toHaveAttribute('data-stage','star1');
  await page.locator('#menuButton').click();await expect(page.locator('#copyrun')).toHaveText('Share debug .txt');await page.locator('#copyrun').click();
  await expect.poll(()=>page.evaluate(()=>window.__sharedDebug?.name||'')).toMatch(/^MONOID_DEBUG_v0\.28\.1_.+\.txt$/);
  const shared=await page.evaluate(()=>window.__sharedDebug);expect(shared.type).toBe('text/plain');expect(shared.title).toBe('MONOID DEBUG');expect(shared.text).toContain('MONOID DEBUG v0.28.1');expect(shared.text).toContain('Run ID:');
  await page.screenshot({path:testInfo.outputPath('score-progress-share.png'),fullPage:true});
});

test('v028 debug export falls back to a downloadable txt file',async({page})=>{
  await page.setViewportSize({width:375,height:667});
  await page.addInitScript(()=>{Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>false})});
  await page.goto('http://127.0.0.1:4173/');await page.locator('#menuButton').click();
  const downloadPromise=page.waitForEvent('download');await page.locator('#copyrun').click();const download=await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^MONOID_DEBUG_v0\.28\.1_.+\.txt$/);
});

test('v028 POWER reads as pale material, Stars use the divider and Circuit rank text stays hidden',async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4173/');
  await page.evaluate(()=>{
    const d=document.querySelector('#hand .domino');d.classList.add('powerTile','power2','circuitTile','circuitRank3');const p=document.createElement('i');p.className='powerMark';p.textContent='×2';d.appendChild(p);const u=document.createElement('i');u.className='upgradeDot u2';d.appendChild(u);const c=document.createElement('i');c.className='circuitRankMark';c.textContent='III';d.appendChild(c);
  });
  const tile=page.locator('#hand .domino').first();
  expect(await tile.locator('.powerMark').evaluate(el=>getComputedStyle(el).opacity)).toBe('0');
  expect(await tile.locator('.circuitRankMark').evaluate(el=>getComputedStyle(el).display)).toBe('none');
  const divider=await tile.locator('.upgradeDot').evaluate(el=>{const s=getComputedStyle(el);return{w:s.width,h:s.height,bg:s.backgroundColor,left:s.left,top:s.top}});expect(parseFloat(divider.w)).toBeGreaterThan(20);expect(parseFloat(divider.h)).toBeLessThanOrEqual(2.1);expect(divider.bg).toBe('rgb(154, 112, 181)');
  await page.screenshot({path:testInfo.outputPath('power-pale-star-divider.png')});
});
