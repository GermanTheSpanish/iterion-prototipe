const {test,expect}=require('@playwright/test');

test('pip diameter stays at the untransformed board size across zoom and rerender',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('iterion.entryBypass.v1','true'));
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4173/');
  const position=await page.evaluate(()=>{
    const g=window.__monoidGame,E=window.IterionEngine,s=g.state(),i=s.hand.findIndex((tile,j)=>tile&&tile.a===tile.b&&g.candidatesForIndex(j).length),tile=s.hand[i],c=g.candidatesForIndex(i)[0],p=E.pieceFrom(tile,c.x,c.y,0,c.rr,-1);
    return{index:i,x:(p.rect.minx+p.rect.maxx)/2/E.G,y:(p.rect.miny+p.rect.maxy)/2/E.H,offset:window.IterionData.DRAG_Y_OFFSET||0};
  });
  expect(position.index).toBeGreaterThanOrEqual(0);
  const hand=await page.locator('#hand .tile').nth(position.index).boundingBox(),board=await page.locator('#board').boundingBox();
  await page.mouse.move(hand.x+hand.width/2,hand.y+hand.height/2);await page.mouse.down();
  await page.mouse.move(hand.x-20,hand.y+hand.height/2,{steps:3});
  await page.mouse.move(board.x+position.x*board.width,board.y+position.y*board.height+position.offset,{steps:5});await page.mouse.up();
  await expect(page.locator('#board .piece')).toHaveCount(1);
  const base=await page.evaluate(()=>{
    const b=document.getElementById('board'),pip=b.querySelector('.pip');
    return{diameter:parseFloat(getComputedStyle(pip).width),variable:b.style.getPropertyValue('--board-pip-size'),width:b.offsetWidth}
  });
  expect(base.diameter).toBeGreaterThan(3.8);
  const zoom=await page.evaluate(()=>{
    window.IterionEngine.setBoardSize(27,36);
    window.MonoidBoardCamera.sync();
    return window.MonoidBoardCamera.set({scale:1.4},false).scale
  });
  expect(zoom).toBeGreaterThan(1.1);
  await expect(page.locator('#reroll')).toBeEnabled();
  await page.locator('#reroll').click();
  const changed=await page.evaluate(()=>{
    const b=document.getElementById('board'),pip=b.querySelector('.pip');
    return{diameter:parseFloat(getComputedStyle(pip).width),variable:b.style.getPropertyValue('--board-pip-size'),width:b.offsetWidth}
  });
  expect(changed.variable).toBe(base.variable);
  expect(changed.diameter).toBeCloseTo(base.diameter,2);
  expect(changed.width).toBeCloseTo(base.width,1);
  await page.evaluate(()=>window.MonoidBoardCamera.reset(false));
  await expect(page.locator('#board .pip').first()).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>getComputedStyle(document.querySelector('#board .pip')).width)).toBe(base.diameter+'px');
});

test('Run menu has visible priorities and no stale update CTA',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('iterion.entryBypass.v1','true'));
  await page.setViewportSize({width:375,height:667});await page.goto('http://127.0.0.1:4173/');
  await page.locator('#menuButton').click();
  const menu=page.locator('#gameMenu');
  await expect(menu).toBeVisible();
  await expect(menu.locator('#menuGroupPlay')).toHaveText('PLAY');
  await expect(menu.locator('#menuGroupExplore')).toHaveText('EXPLORE');
  await expect(menu.locator('#menuGroupRun')).toHaveText('RUN DATA');
  await expect(menu.locator('#menuGroupSystem')).toHaveText('SYSTEM');
  const order=await page.evaluate(()=>['routePreviewSetting','menuHelpButton','reset','gameSelectionButton','modCollectionMenuButton','viewrun','copyrun','checkForUpdates','qaTestRunsButton'].map(id=>Number(getComputedStyle(document.getElementById(id)).order)));
  expect(order).toEqual([...order].sort((a,b)=>a-b));
  await expect(menu.locator('#applyMonoidUpdate')).toBeHidden();
  expect(await menu.locator('#applyMonoidUpdate').evaluate(node=>getComputedStyle(node).display)).toBe('none');
  await expect(menu.locator('#reset')).toBeVisible();
  await expect(menu.locator('#menuHelpButton')).toBeVisible();
});

test('pending Market Mod offers a genuine cancel/refund path and restores the same Market',async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('iterion.entryBypass.v1','true');
    let api;
    Object.defineProperty(window,'IterionGame',{configurable:true,get:()=>api,set:value=>{
      api={...value,createGame(E,options){
        const g=value.createGame(E,{...options,seed:271100}),s=g.state(),tile=s.set.find(t=>t.id==='d2-2'),p=E.pieceFrom(tile,4,8,0,0,1);p.tile={...tile};
        s.pieces=[p];s.placedTileIds=[tile.id];s.idc=1;s.anchorId=tile.id;
        s.round=2;s.cleared=true;s.nextShopType='market';s.intermissionResolved=false;s.coins=60;s.inflation=0;
        g.openIntermission();s.shopOffers=['double-double','corner','overload'];return g
      }}
    }});
  });
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4173/');
  await expect(page.locator('#overlay')).toContainText('MARKET');
  const initial=await page.evaluate(()=>{const s=window.__monoidGame.state();return{coins:s.coins,inflation:s.inflation,offers:[...s.shopOffers],runId:s.runId}});
  await page.locator('[data-market-mod="double-double"]').click();
  await expect(page.locator('#cancelModPurchase')).toBeVisible();
  await expect(page.locator('#cancelModPurchase')).toHaveText('CANCEL PURCHASE');
  await expect(page.locator('#overlay')).not.toHaveClass(/show/);
  await page.locator('#cancelModPurchase').click();
  await expect(page.locator('#overlay')).toHaveClass(/show/);
  await expect(page.locator('[data-market-mod="double-double"]')).toBeVisible();
  const final=await page.evaluate(()=>{const s=window.__monoidGame.state();return{coins:s.coins,inflation:s.inflation,offers:[...s.shopOffers],runId:s.runId,pending:s.pendingModPlacement}});
  expect(final).toEqual({...initial,pending:null});
  await expect(page.locator('#cancelModPurchase')).toHaveCount(0);
});
