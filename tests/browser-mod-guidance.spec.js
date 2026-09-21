const{test,expect}=require('@playwright/test');

async function startWithTerminal(page){
  await page.addInitScript(()=>{
    localStorage.setItem('monoid.firstRunBriefing.v1','seen');
    let api;Object.defineProperty(window,'IterionGame',{configurable:true,get:()=>api,set:value=>{api={...value,createGame(engine,options){
      const game=value.createGame(engine,{...options,seed:4201}),s=game.state(),specs=[['d1-2',6,8,0],['d2-3',10,8,0]];
      s.pieces=specs.map(([id,x,y,rr],i)=>{const tile=s.set.find(t=>t.id===id),p=engine.pieceFrom(tile,x,y,0,rr,i+1);p.tile={...tile};return p});
      s.placedTileIds=specs.map(v=>v[0]);s.hand=s.hand.map(t=>t&&s.placedTileIds.includes(t.id)?null:t);s.reserve=s.reserve.filter(t=>!s.placedTileIds.includes(t.id));s.terminalTileId='d1-2';return game
    }}}});
  });
  await page.goto('http://127.0.0.1:4173/');await page.locator('#titleCard').click();await page.locator('#startRun').click();
}

test('Modifier primer teaches BUILD → REWARD without asking players to memorise the catalogue',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4173/');await page.locator('#titleCard').click();await page.locator('#learnMonoid').click();
  await page.locator('#tutorialHub [data-tutorial="modifiers"]').click();await expect(page.locator('#modifierTutorialDialog')).toBeVisible();
  await expect(page.locator('.modifierTutorTitle')).toHaveText('MODS LIVE ON TILES');await expect(page.locator('.modifierTutorVisual .modDiagram')).toBeVisible();await expect(page.locator('.modifierTutorNote')).toContainText('Hold any Modded tile');
  await page.locator('.modifierNext').click();await expect(page.locator('.modifierTutorTitle')).toHaveText('BUILD → REWARD');await expect(page.locator('.modifierTutorBody')).toContainText('Build the condition');await expect(page.locator('.modifierTutorNote')).toContainText('CORNER');await expect(page.locator('.modifierTutorNote')).toContainText('×3');
});

test('Inspector shows schematic, player-facing rule and live Mod status',async({page})=>{
  await page.setViewportSize({width:390,height:844});await startWithTerminal(page);
  const tile=page.locator('#board .piece[data-tile-id="d1-2"]'),box=await tile.boundingBox();expect(box).toBeTruthy();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(650);await page.mouse.up();
  await expect(page.locator('.inspector')).toBeVisible();const card=page.locator('.modGuideCard');await expect(card).toContainText('TERMINAL');await expect(card).toContainText('BUILD');await expect(card).toContainText('REWARD');await expect(card).toContainText('ACTIVE ×3');await expect(card.locator('.modDiagram')).toBeVisible();await expect(card).toContainText('exactly 1 physical neighbour');await expect(card.locator('.modExactRule')).toBeVisible();
});

test('Market uses current physical-rule copy and compact Mod schematics',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(()=>{
    localStorage.setItem('monoid.firstRunBriefing.v1','seen');
    let api;Object.defineProperty(window,'IterionGame',{configurable:true,get:()=>api,set:value=>{api={...value,createGame(engine,options){
      const game=value.createGame(engine,{...options,seed:4202}),s=game.state(),specs=[['d1-2',6,8,0],['d2-3',10,8,0],['d3-4',14,8,0]];
      s.pieces=specs.map(([id,x,y,rr],i)=>{const tile=s.set.find(t=>t.id===id),p=engine.pieceFrom(tile,x,y,0,rr,i+1);p.tile={...tile};return p});s.placedTileIds=specs.map(v=>v[0]);s.hand=s.hand.map(t=>t&&s.placedTileIds.includes(t.id)?null:t);s.reserve=s.reserve.filter(t=>!s.placedTileIds.includes(t.id));
      s.cleared=true;s.nextShopType='market';s.intermissionResolved=false;s.coins=100;game.openIntermission();s.shopOffers=['corner','long-line','terminal'];return game
    }}}});
  });
  await page.goto('http://127.0.0.1:4173/');await page.locator('#titleCard').click();await page.locator('#startRun').click();await expect(page.locator('.marketStructuredOffer')).toHaveCount(3);
  const corner=page.locator('[data-market-offer="corner"]');await expect(corner.locator('.marketOfferDescription')).toContainText('Build a right angle around one tile. Its operation becomes ×3.');await expect(corner.locator('.marketModDiagram .modDiagram')).toBeVisible();await expect(corner).not.toContainText('routed turn');
  const line=page.locator('[data-market-offer="long-line"]');await expect(line.locator('.marketOfferDescription')).toContainText('Build a straight physical line through one tile.');await expect(line).not.toContainText('traversals');
  await expect(page.locator('.shopFoot')).toContainText('BUILD, REWARD and live status');
});
