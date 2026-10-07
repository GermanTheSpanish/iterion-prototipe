const {test,expect}=require('@playwright/test');
const BASE='http://127.0.0.1:4173/';
test.beforeEach(async({page})=>page.addInitScript(()=>localStorage.setItem('iterion.entryBypass.v1','true')));

async function placeOpeningDouble(page){
  const target=await page.evaluate(()=>{
    const g=window.__monoidGame,E=window.IterionEngine,D=window.IterionData,s=g.state(),i=s.hand.findIndex(t=>t&&t.a===t.b);
    if(i<0)return null;const candidate=g.candidatesForIndex(i)[0];if(!candidate)return null;
    const p=E.pieceFrom(s.hand[i],candidate.x,candidate.y,0,candidate.rr,-1),r=document.querySelector('#board').getBoundingClientRect();
    return{i,x:r.left+((p.rect.minx+p.rect.maxx)/2/E.G)*r.width,y:r.top+((p.rect.miny+p.rect.maxy)/2/E.H)*r.height+(D.DRAG_Y_OFFSET||0)}
  });
  expect(target).toBeTruthy();
  const tile=page.locator('#hand .handSlot').nth(target.i).locator('.tile'),box=await tile.boundingBox();expect(box).toBeTruthy();
  const sx=box.x+box.width/2,sy=box.y+box.height/2;await page.mouse.move(sx,sy);await page.mouse.down();await page.mouse.move(sx+18,sy,{steps:2});await page.mouse.move(target.x,target.y,{steps:8});await page.mouse.up()
}

test('Tile Shop stays tappable with no funds and explains why it is closed',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto(BASE);await expect(page.locator('.app')).toBeVisible();
  await expect(page.locator('#shopButton')).toContainText('TILE SHOP');await expect(page.locator('#shopButton')).toBeEnabled();
  const before=await page.evaluate(()=>({coins:window.__monoidGame.state().coins,shopOpen:window.__monoidGame.state().shopOpen,inflation:window.__monoidGame.state().inflation}));
  expect(before.coins).toBe(0);expect(before.shopOpen).toBe(false);
  await page.locator('#shopButton').click();await expect(page.locator('#overlayTitle')).toHaveText('TILE SHOP CLOSED');await expect(page.locator('#overlayBody')).toContainText('INSUFFICIENT FUNDS');
  await expect(page.locator('.shopClosedState .currencyMark')).toHaveCount(1);
  expect(await page.evaluate(()=>({coins:window.__monoidGame.state().coins,shopOpen:window.__monoidGame.state().shopOpen,inflation:window.__monoidGame.state().inflation}))).toEqual(before);
});

test('MONOID currency is a split-disc token with value-first amounts',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto(BASE);await expect(page.locator('.app')).toBeVisible();
  const amount=page.locator('#shopButton .currencyAmount').first(),mark=amount.locator('.currencyMark');await expect(mark).toBeVisible();
  const geometry=await mark.evaluate(el=>{const r=el.getBoundingClientRect(),css=getComputedStyle(el);return{w:r.width,h:r.height,border:parseFloat(css.borderTopWidth),background:css.backgroundColor,mask:css.webkitMaskImage||css.maskImage,before:getComputedStyle(el,'::before').display,after:getComputedStyle(el,'::after').display,children:[...el.parentElement.children].map(child=>child.className)}});
  expect(Math.abs(geometry.w-geometry.h)).toBeLessThan(.2);expect(geometry.border).toBe(0);expect(geometry.background).not.toBe('rgba(0, 0, 0, 0)');expect(geometry.mask).not.toBe('none');expect(geometry.before).toBe('none');expect(geometry.after).toBe('none');expect(geometry.children).toEqual(['currencyValue','currencyMark']);
  await page.evaluate(()=>{window.__monoidGame.state().coins=50;document.querySelector('#shopButton').disabled=false});await page.locator('#shopButton').click();await expect(page.locator('#overlayTitle')).toHaveText('TILE SHOP');
  expect(await page.locator('.commerceModal .currencyMark').count()).toBeGreaterThan(3);await expect(page.locator('.shopBuy .currencyMark').first()).toBeVisible();
});

test('ROUND COMPLETE gives earned funds hierarchy and authoritative source breakdown',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(()=>{let api;Object.defineProperty(window,'IterionGame',{configurable:true,get:()=>api,set:value=>{api={...value,createGame(E,options){const g=value.createGame(E,{...options,seed:71002,TARGETS:Array(15).fill(20)}),s=g.state();s.round=0;s.cleared=true;s.intermissionResolved=true;s.nextShopType='none';s.score=42;s.scoreExact='42';s.coins=12;s.wins=[{round:1,target:20,output:42,moves:1,reward:9,rewardBreakdown:{base:3,quick:1,exact:5,total:9},upgradeCoins:2}];s.events.push({type:'mint-coins',round:1,roundTurn:1,amount:1,coins:3});window.__rewardFixture=g;return g}}}})});
  await page.goto(BASE);await expect(page.locator('#overlayTitle')).toHaveText('ROUND COMPLETE');
  await expect(page.locator('.roundRewardHeading')).toHaveText('EARNED');await expect(page.locator('.roundRewardTotal')).toContainText('TOTAL');await expect(page.locator('.roundRewardTotal .currencyValue')).toHaveText('12');
  const rows=page.locator('.roundRewardRow');await expect(rows).toHaveCount(5);expect(await rows.locator('b').allTextContents()).toEqual(['ROUND','QUICK CLEAR','EXACT TARGET','★ ACTIVATIONS','MINT']);expect(await rows.locator('.currencyValue').allTextContents()).toEqual(['3','1','5','2','1']);await expect(rows.locator('.roundRewardLeader')).toHaveCount(5);
  const hierarchy=await page.locator('.roundReward').evaluate(el=>({children:[...el.children].map(child=>child.className),totalTop:el.querySelector('.roundRewardTotal').getBoundingClientRect().top,lastRowBottom:[...el.querySelectorAll('.roundRewardRow')].at(-1).getBoundingClientRect().bottom,totalSize:parseFloat(getComputedStyle(el.querySelector('.roundRewardTotal strong')).fontSize),rowSize:parseFloat(getComputedStyle(el.querySelector('.roundRewardRow')).fontSize)}));expect(hierarchy.children).toEqual(['roundRewardHeading','roundRewardSources','roundRewardTotal']);expect(hierarchy.totalTop).toBeGreaterThan(hierarchy.lastRowBottom);expect(hierarchy.totalSize).toBeGreaterThan(hierarchy.rowSize);
  await page.waitForTimeout(1150);expect(await rows.last().evaluate(el=>Number(getComputedStyle(el).opacity))).toBeGreaterThan(.95);
  await expect(page.locator('#overlayPrimary')).toBeHidden();await expect(page.locator('.roundAdvanceHint')).toHaveText('TAP TO CONTINUE');
  await page.locator('#overlayBody').click();await expect.poll(()=>page.evaluate(()=>window.__rewardFixture.state().round)).toBe(1)
});

test('a clearing cascade previews EARNED before ROUND COMPLETE appears',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(()=>{let api;Object.defineProperty(window,'IterionGame',{configurable:true,get:()=>api,set:value=>{api={...value,createGame(E,options){const g=value.createGame(E,{...options,seed:71003,TARGETS:Array(15).fill(1)});window.__cascadeRewardFixture=g;return g}}}})});
  await page.goto(BASE);await expect(page.locator('.app')).toBeVisible();await placeOpeningDouble(page);
  await expect.poll(()=>page.evaluate(()=>window.__cascadeRewardFixture.state().cleared),{timeout:15000}).toBe(true);
  await expect(page.locator('#scoreNote .roundRewardInline')).toBeVisible({timeout:900});await expect(page.locator('#scoreNote')).toContainText('EARNED');await expect(page.locator('#scoreNote .currencyMark')).toHaveCount(1);
  await expect(page.locator('#overlayTitle')).toHaveText('ROUND COMPLETE',{timeout:2500})
});
