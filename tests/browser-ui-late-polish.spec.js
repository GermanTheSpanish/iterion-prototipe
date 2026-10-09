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
        border:parseFloat(css.borderTopWidth),borderColor:css.borderTopColor,zero:half.classList.contains('zeroEndpoint'),zeroMark:getComputedStyle(half,'::after').content,fits:pips.every(d=>d.left>=h.left&&d.right<=h.right&&d.top>=h.top&&d.bottom<=h.bottom),
        overlapsMark:!!m&&pips.some(d=>d.left<m.right&&d.right>m.left&&d.top<m.bottom&&d.bottom>m.top),
        pipColor:p.children[0]?getComputedStyle(p.children[0]).backgroundColor:null};
    });
    const pseudo=getComputedStyle(tile,'::before'),pseudoBg=pseudo.backgroundColor,background=pseudo.content==='""'&&pseudoBg!=='rgba(0, 0, 0, 0)'?pseudoBg:getComputedStyle(tile).backgroundColor;
    return{label:tile.parentElement.getAttribute('aria-label'),halves,compact:tile.classList.contains('compactPreview'),
      mark:mark?{text:mark.textContent,color:getComputedStyle(mark).color,size:parseFloat(getComputedStyle(mark).fontSize),dx:Math.abs(m.x+m.width/2-box.x-box.width/2),dy:Math.abs(m.y+m.height/2-box.y-box.height/2)}:null,
      circuit:tile.classList.contains('circuitTile'),power:tile.classList.contains('powerTile'),mod:tile.classList.contains('modTile'),background};
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
      expect(half.fits).toBe(true);expect(half.overlapsMark).toBe(false);
      if(tile.mod){expect(half.opacity).toBe('0');if(index===1)expect(half.borderColor).toBe('rgba(0, 0, 0, 0)');if(half.zero)expect(half.zeroMark).toBe('""')}else expect(half.opacity).toBe('1');
      if(half.pipColor&&!tile.mod){
        const luminance=color=>{const rgb=color.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722};
        const a=luminance(half.pipColor),b=luminance(tile.background);
        expect((Math.max(a,b)+.05)/(Math.min(a,b)+.05)).toBeGreaterThan(4.5);
      }
    }
    if(tile.mark){expect(tile.mark.text).toMatch(/^(DD|DE|TD|ZP|PX|CR|LN|OV|RC|PR|BR|PV|BO|HG|BK|FD|KN|MT)$/);expect(tile.mark.size).toBe(11);expect(tile.mark.dx).toBeLessThan(.6);expect(tile.mark.dy).toBeLessThan(.6);if(tile.mod)expect(tile.mark.color).toBe(tile.circuit?tile.halves.find(h=>h.pipColor)?.pipColor:'rgba(255, 255, 255, 0.92)')}
  }
}

for(const width of [375,430])for(const endless of [false,true]){
  test(`compact Market stays decision-led at ${width}px, endless=${endless}`,async({page},testInfo)=>{
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
    await expect(page.locator('.marketStructuredOffer.marketCompactOffer')).toHaveCount(3);await expect(page.locator('.compactMarket .marketChoiceTitle')).toHaveText('CHOOSE ONE');const choiceGeometry=await page.locator('.compactMarket').evaluate(el=>{const title=el.querySelector('.marketChoiceTitle').getBoundingClientRect(),grid=el.querySelector('.marketOfferGrid').getBoundingClientRect(),topCard=el.querySelector('.marketCompactOffer').getBoundingClientRect();return{titleCenter:title.left+title.width/2,gridCenter:grid.left+grid.width/2,titleBottom:title.bottom,topCardTop:topCard.top}});expect(Math.abs(choiceGeometry.titleCenter-choiceGeometry.gridCenter)).toBeLessThan(1);expect(choiceGeometry.titleBottom).toBeLessThanOrEqual(choiceGeometry.topCardTop);
    await expect(page.locator('.marketOfferDescription,.marketModDiagram,.marketOfferVisual,.marketOfferPayoff,.marketOfferMeta')).toHaveCount(0);
    await expect(page.locator('.marketOfferMark')).toHaveCount(3);
    await expect(page.locator('.marketAssignedGroup,.marketPoolGroup')).toHaveCount(0);
    await expect(page.locator('[data-market-offer="double-double"]')).toHaveAttribute('data-market-kind','tile');
    const ddMarketMark=page.locator('[data-market-offer="double-double"] .marketTileModMark'),zpMarketMark=page.locator('[data-market-offer="zero-port"] .marketTileModMark');
    await expect(ddMarketMark).toHaveText('DD');await expect(zpMarketMark).toHaveText('ZP');
    await expect(ddMarketMark.locator(':scope > span')).toHaveCount(2);await expect(zpMarketMark.locator(':scope > span')).toHaveCount(2);
    await expect(ddMarketMark.locator(':scope > span').nth(0)).toHaveText('D');await expect(ddMarketMark.locator(':scope > span').nth(1)).toHaveText('D');
    await expect(zpMarketMark.locator(':scope > span').nth(0)).toHaveText('Z');await expect(zpMarketMark.locator(':scope > span').nth(1)).toHaveText('P');
    const marketHalfWidths=await ddMarketMark.locator(':scope > span').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().width));expect(Math.abs(marketHalfWidths[0]-marketHalfWidths[1])).toBeLessThan(1);
    const actions=await page.locator('.marketCompactOffer>.shopBuy').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().height));expect(actions.every(h=>h>=44)).toBe(true);
    await expect(page.locator('.app .compactPreview')).toHaveCount(0);
    const boardMark=page.locator('#board .piece:has(.tileModMark)').first();
    const boardModGeometry=await boardMark.evaluate(el=>{const box=el.getBoundingClientRect();return{font:parseFloat(getComputedStyle(el.querySelector('.tileModMark')).fontSize),short:Math.min(box.width,box.height)}});expect(boardModGeometry.font).toBeLessThan(boardModGeometry.short*.55);
    await expect(boardMark).toHaveClass(/modTile/);expect(await boardMark.locator('.pips').first().evaluate(el=>getComputedStyle(el).opacity)).toBe('0');
    expect(await page.evaluate(()=>{const g=window.__monoidGame,before=JSON.stringify(g.exportState());window.MonoidLatePolish.sync();window.MonoidPhaseA.sync();return before===JSON.stringify(g.exportState())})).toBe(true);
    expect(await page.locator('.commerceModal').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
    if(endless){const wordmarkColor=await page.locator('.wordmark').evaluate(el=>getComputedStyle(el).color);expect(wordmarkColor).not.toBe('rgb(23, 23, 23)')}
    await page.screenshot({path:testInfo.outputPath(`compact-market-${width}-${endless}.png`)});
  });
}

test('board Mod tap reveals canonical values for 3 seconds with independent timers',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(()=>{localStorage.setItem('monoid.firstRunBriefing.v1','seen');let api;Object.defineProperty(window,'IterionGame',{configurable:true,get:()=>api,set:value=>{api={...value,createGame(engine,options){const game=value.createGame(engine,{...options,seed:3801}),s=game.state(),specs=[['d5-5',6,8,0],['d0-5',10,8,0],['d0-4',14,8,0]];s.pieces=specs.map(([id,x,y,rr],i)=>{const tile=s.set.find(t=>t.id===id),p=engine.pieceFrom(tile,x,y,0,rr,i+1);p.tile={...tile};return p});s.placedTileIds=specs.map(v=>v[0]);s.hand=s.hand.map(t=>t&&s.placedTileIds.includes(t.id)?null:t);s.reserve=s.reserve.filter(t=>!s.placedTileIds.includes(t.id));s.doubleDoubleTileId='d5-5';s.zeroPortTileIds=['d0-5','d0-4'];s.circuitRanks={'d5-5':3,'d0-5':5};window.__iterionTestGame=game;return game}}}})});
  await page.goto('http://127.0.0.1:4173/');await page.locator('#titleCard').click();await page.locator('#startRun').click();
  const blue=page.locator('.piece[data-tile-id="d5-5"]'),gold=page.locator('.piece[data-tile-id="d0-5"]');
  await expect(blue).toHaveClass(/modTile/);await expect(gold).toHaveClass(/modTile/);
  expect(await blue.locator('.pips').first().evaluate(el=>getComputedStyle(el).opacity)).toBe('0');
  expect(await blue.locator('.tileModMark').evaluate(el=>getComputedStyle(el).color)).toBe('rgb(171, 215, 255)');
  expect(await gold.locator('.tileModMark').evaluate(el=>getComputedStyle(el).color)).toBe('rgb(255, 229, 154)');
  const before=await page.evaluate(()=>JSON.stringify(window.__iterionTestGame.exportState()));
  await blue.click();await expect(blue).toHaveClass(/modFaceRevealed/);await expect(blue).not.toHaveClass(/modTile/);await expect(blue.locator('.tileModMark')).toHaveCount(0);expect(await blue.locator('.pips').first().evaluate(el=>getComputedStyle(el).opacity)).toBe('1');
  await page.waitForTimeout(600);await gold.click();await expect(blue).toHaveClass(/modFaceRevealed/);await expect(gold).toHaveClass(/modFaceRevealed/);
  await page.waitForTimeout(2600);await expect(blue).toHaveClass(/modTile/);await expect(gold).toHaveClass(/modFaceRevealed/);
  await page.waitForTimeout(600);await expect(gold).toHaveClass(/modTile/);await expect(gold.locator('.tileModMark')).toHaveText('ZP');
  expect(await page.evaluate(()=>JSON.stringify(window.__iterionTestGame.exportState()))).toBe(before);
  const box=await gold.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(550);await page.mouse.up();await expect(page.locator('#overlay')).toHaveClass(/show/);await expect(gold).toHaveClass(/modTile/);
});

test('Shop stays compact, buys to Hand and delegates Adapter rules to Inspector',async({page})=>{
  await page.setViewportSize({width:375,height:667});
  await page.addInitScript(()=>{localStorage.setItem('monoid.firstRunBriefing.v1','seen');let api;Object.defineProperty(window,'IterionGame',{configurable:true,get:()=>api,set:value=>{api={...value,createGame(engine,options){return value.createGame(engine,{...options,STARTING_COINS:200})}}}})});
  await page.goto('http://127.0.0.1:4173/');await expect.poll(()=>page.evaluate(()=>!!window.MonoidLatePolish&&!!window.MonoidPhaseA)).toBe(true);
  await page.locator('#titleCard').click();await page.locator('#startRun').click();
  const handGeometry=await page.locator('#hand .domino').first().evaluate(el=>{const r=el.getBoundingClientRect();return{width:r.width,height:r.height}});
  await page.evaluate(()=>{const s=window.__monoidGame.state(),i=s.hand.findIndex(Boolean),tile=s.hand[i];s.hand[i]=null;s.reserve.unshift(tile)});
  await page.locator('#shopButton').click();
  await expect(page.locator('.compactShop')).toBeVisible();await expect(page.locator('.shopCompactOffer')).toHaveCount(6);
  const shopGeometry=await page.locator('.shopOfferInspect .domino.compactPreview').evaluateAll(nodes=>nodes.map(el=>{const r=el.getBoundingClientRect(),card=el.closest('.shopCompactOffer')?.getBoundingClientRect();return{width:r.width,height:r.height,centerOffset:card?Math.abs((r.left+r.width/2)-(card.left+card.width/2)):999}}));
  expect(shopGeometry).toHaveLength(6);for(const tile of shopGeometry){expect(Math.abs(tile.width-handGeometry.width)).toBeLessThanOrEqual(1);expect(Math.abs(tile.height-handGeometry.height)).toBeLessThanOrEqual(1);expect(tile.centerOffset).toBeLessThanOrEqual(1)}
  await expect(page.locator('.exactShopOffer')).toHaveCount(4);await expect(page.locator('.exactShopOffer>strong')).toHaveCount(0);
  const exactCopy=await page.locator('.exactShopOffer').allTextContents();expect(exactCopy.every(text=>!/\[\d\|\d\]/.test(text))).toBe(true);
  const preview=page.locator('.randomTilePreview .domino');await expect(preview).toHaveClass(/compactPreview/);await expect(preview).toHaveClass(/back/);
  expect(await preview.locator('.half').first().evaluate(el=>getComputedStyle(el).opacity)).toBe('0');
  const adapter=page.locator('[data-shop-inspect="adapter"]');await expect(adapter.locator('.domino')).toHaveClass(/compactPreview/);await expect(adapter.locator('.adapterQuestion')).toHaveCount(2);await expect(adapter).toContainText('?');
  await adapter.click();
  await expect(page.locator('#overlayTitle')).toHaveText('ADAPTER');await expect(page.locator('#overlayBody')).toContainText('Place it only between two existing physical ends');await expect(page.locator('#overlayBody')).toContainText('One Adapter can be purchased in Landing');await page.locator('#overlayPrimary').click();
  await expect(page.locator('#overlayTitle')).toHaveText('TILE SHOP');
  await page.locator('#shopRandomBuy').click();await expect(page.locator('.randomTilePreview .domino')).toHaveClass(/reveal/);
  const delivery=await page.evaluate(()=>{const g=window.__monoidGame,s=g.state(),event=[...s.events].reverse().find(e=>e.type==='tile-buy');return{delivery:event.delivery,inHand:s.hand.some(t=>t?.id===event.tile.id),inReserve:s.reserve.some(t=>t?.id===event.tile.id)}});expect(delivery).toEqual({delivery:'hand',inHand:true,inReserve:false});
  await expect(page.locator('.app .compactPreview')).toHaveCount(0);
});


test('mode and Mod unlocks use a dedicated reward reveal on compact phones',async({page})=>{
  await page.setViewportSize({width:375,height:667});
  await page.addInitScript(()=>localStorage.setItem('monoid.firstRunBriefing.v1','seen'));
  await page.goto('http://127.0.0.1:4173/');
  await expect.poll(()=>page.evaluate(()=>!!window.MonoidLatePolish?.enqueueProgressionReward)).toBe(true);
  await page.locator('#titleCard').click();await page.locator('#startRun').click();
  await page.locator('#menuButton').click();
  await page.evaluate(()=>window.MonoidLatePolish.enqueueProgressionReward({completedModes:['eyes'],unlockedModes:['frames']}));
  const reward=page.locator('#progressionRewardDialog');
  await expect(reward).not.toBeVisible();
  await page.locator('#closeMenu').click();
  await expect(reward).toBeVisible();
  await expect(reward.locator('.progressionRewardEyebrow')).toHaveText('NEW MODE UNLOCKED');
  await expect(reward.locator('#progressionRewardTitle')).toHaveText('THE FRAMES');
  await expect(reward.locator('.progressionRewardRule')).toHaveText('2|2 · Signal 4');
  await expect(reward.locator('.progressionRewardMeta')).toContainText('THE EYES COMPLETE');
  await expect(reward.locator('.progressionRewardMeta')).toContainText('GAME SELECTION');
  await expect(reward.locator('.progressionRewardDomino i')).toHaveCount(4);
  const modeLayout=await reward.evaluate(el=>{const r=el.getBoundingClientRect(),b=el.querySelector('.progressionRewardContinue').getBoundingClientRect();return{top:r.top,bottom:r.bottom,height:innerHeight,button:b.height,scrolls:document.documentElement.scrollHeight>innerHeight||document.documentElement.scrollWidth>innerWidth}});
  expect(modeLayout.top).toBeGreaterThanOrEqual(0);expect(modeLayout.bottom).toBeLessThanOrEqual(modeLayout.height);expect(modeLayout.button).toBeGreaterThanOrEqual(44);expect(modeLayout.scrolls).toBe(false);
  await reward.locator('.progressionRewardContinue').click();await expect(reward).not.toBeVisible();

  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('monoid:mod-unlocked',{detail:{id:'pivot'}})));
  await expect(reward).toBeVisible();
  await expect(reward.locator('.progressionRewardEyebrow')).toHaveText('NEW MOD DISCOVERED');
  await expect(reward.locator('#progressionRewardTitle')).toHaveText('PIVOT');
  await expect(reward.locator('.progressionRewardVisual .modDiagram')).toHaveCount(1);
  await expect(reward.locator('.progressionRewardRule')).toHaveText('Rotate around either half.');
  await expect(reward.locator('.progressionRewardMeta')).toHaveText('ADDED TO MOD COLLECTION');
  await reward.locator('.progressionRewardContinue').click()
});


test('Market category language distinguishes Signal, Tile Mods and Machine Mods',async({page})=>{
  await page.setViewportSize({width:375,height:667});
  await page.addInitScript(()=>localStorage.setItem('monoid.firstRunBriefing.v1','seen'));
  await page.goto('http://127.0.0.1:4173/');await page.locator('#titleCard').click();await page.locator('#startRun').click();
  await page.evaluate(()=>{const g=window.__monoidGame||window.__nomonGame,s=g.state(),E=window.IterionEngine,ids=['d2-2','d3-3','d4-4','d5-5'];s.gameMode='eyes';s.round=2;s.cleared=true;s.nextShopType='market';s.intermissionResolved=false;s.coins=80;s.pieces=ids.map((id,i)=>{const t=s.set.find(t=>t.id===id),p=E.pieceFrom(t,2+i*4,4,0,1,i+1);p.tile={...t};return p});s.placedTileIds=ids.slice();s.hand=s.hand.map(t=>ids.includes(t?.id)?null:t);s.reserve=s.reserve.filter(t=>!ids.includes(t.id));g.openIntermission();s.shopOffers=['bridge','triple-double','long-run']});
  await openHelp(page);await page.locator('#overlayPrimary').click();await expect(page.locator('#overlayTitle')).toHaveText('MARKET');
  const signal=page.locator('[data-market-offer="signal"]');await expect(signal).toHaveAttribute('data-market-kind','signal');await expect(signal.locator('.marketSignalBolt')).toHaveCount(1);
  const bridge=page.locator('[data-market-offer="bridge"]');await expect(bridge).toHaveAttribute('data-market-kind','tile');await expect(bridge.locator('.marketTileModMark')).toHaveText('BR');
  const triple=page.locator('[data-market-offer="triple-double"]');await expect(triple).toHaveAttribute('data-market-kind','tile');await expect(triple.locator('.marketTileModMark')).toHaveText('TD');
  const machine=page.locator('[data-market-offer="long-run"]');await expect(machine).toHaveAttribute('data-market-kind','machine');await expect(machine.locator('.marketMachineModMark')).toHaveText('LC');
  const visuals=await page.locator('.marketOfferIdentity').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{w:r.width,h:r.height}}));expect(visuals.every(v=>v.w>90&&v.h>=80)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true)
});

test('late mobile polish keeps MONOID centred and Market uses compact Inspector-led cards',async({page})=>{
  await page.setViewportSize({width:430,height:932});
  await page.addInitScript(()=>localStorage.setItem('monoid.firstRunBriefing.v1','seen'));
  await page.goto('http://127.0.0.1:4173/');
  await expect.poll(()=>page.evaluate(()=>window.__MONOID_BUILD)).toBe('20261009.3');
  await expect.poll(()=>page.evaluate(()=>!!window.MonoidPhaseA)).toBe(true);
  await page.locator('#titleCard').click();await page.locator('#startRun').click();
  const wordmark=await page.locator('.wordmark').boundingBox();expect(Math.abs(wordmark.x+wordmark.width/2-215)).toBeLessThan(1);expect(wordmark.width).toBeGreaterThanOrEqual(120);expect(wordmark.width).toBeLessThanOrEqual(155);expect(parseFloat(await page.locator('#menuButton').evaluate(el=>getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(19);

  await page.evaluate(()=>{const g=window.__monoidGame||window.__nomonGame,s=g.state(),E=window.IterionEngine;const ids=['d1-1','d2-2','d3-3','d4-4','d5-5','d6-6'];s.round=2;s.cleared=true;s.nextShopType='market';s.intermissionResolved=false;s.coins=80;s.pieces=ids.map((id,i)=>{const t=s.set.find(t=>t.id===id),p=E.pieceFrom(t,2+(i%3)*6,4+Math.floor(i/3)*8,0,i%2?1:0,i+1);p.tile={...t};return p});s.placedTileIds=ids.slice();s.doubleDoubleTileId='d3-3';s.doubleEchoTileId=null;s.zeroPortTileIds=[];s.circuitRanks={'d3-3':1};s.hand=s.hand.map(t=>s.placedTileIds.includes(t?.id)?null:t);s.reserve=s.reserve.filter(t=>!s.placedTileIds.includes(t.id));g.openIntermission();s.shopOffers=['double-double','double-echo','long-run']});
  await openHelp(page);await page.locator('#overlayPrimary').click();await expect(page.locator('#overlayTitle')).toHaveText('MARKET');
  await expect.poll(()=>page.locator('.marketStructuredOffer.marketCompactOffer').count()).toBe(3);
  await expect(page.locator('.marketAssignments,.marketOfferDescription,.marketModDiagram,.marketOfferVisual,.marketOfferPayoff,.marketOfferMeta')).toHaveCount(0);
  await expect(page.locator('.marketOfferMark')).toHaveCount(3);
  await expect(page.locator('[data-market-offer="double-double"] .marketTileModMark')).toHaveText('DD');
  await expect(page.locator('[data-market-offer="double-echo"] .marketTileModMark')).toHaveText('DE');
  await expect(page.locator('[data-market-offer="long-run"]')).toHaveAttribute('data-market-kind','machine');
  await expect(page.locator('[data-market-offer="long-run"] .marketMachineModMark')).toHaveText('LC');

  const dd=page.locator('[data-market-offer="double-double"]');
  await expect(dd.locator('.marketOfferName')).toHaveText('DOUBLE DOUBLE');
  await expect(dd.locator('.marketOfferMark')).toHaveText('DD');
  await expect(page.locator('[data-market-offer="double-echo"] .marketOfferMark')).toHaveText('DE');
  await expect(page.locator('[data-market-offer="long-run"] .marketOfferMark')).toHaveText('LC');
  await expect(page.locator('[data-market-offer="long-run"]')).toHaveAttribute('data-market-machine','true');
  await expect(page.locator('.shopFoot')).toContainText('TAP A MOD = DETAILS');

  const buttonBoxes=await page.locator('.marketCompactOffer>.shopBuy').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect(),value=n.querySelector('.currencyValue')?.textContent.trim();return{text:n.textContent.trim(),value,hasCurrency:!!n.querySelector('.currencyMark'),w:r.width,h:r.height}}));
  expect(buttonBoxes.every(b=>b.w>80&&b.h>=44&&b.hasCurrency&&/^\d+$/.test(b.value||''))).toBe(true);
  const overflow=await page.locator('.commerceModal').evaluate(el=>({sw:el.scrollWidth,cw:el.clientWidth}));expect(overflow.sw).toBeLessThanOrEqual(overflow.cw+1);

  const inspect=dd.locator('[data-market-inspect="double-double"]');await inspect.click();
  await expect(page.locator('#overlayTitle')).toHaveText('DOUBLE DOUBLE');await expect(page.locator('.marketInspectorCode')).toHaveText('DD');await expect(page.locator('.marketInspectorDemo .modDiagram')).toHaveCount(1);await expect(page.locator('#overlayBody')).toContainText('Build');await expect(page.locator('#overlayBody')).toContainText('Reward');await page.locator('#overlayPrimary').click();
  await expect(page.locator('#overlayTitle')).toHaveText('MARKET');
  await page.locator('[data-market-inspect="double-echo"]').click();await expect(page.locator('#overlayTitle')).toHaveText('DOUBLE ECHO');await expect(page.locator('.marketInspectorDemo.hasScene .modExample-double-echo')).toBeVisible();await expect(page.locator('.modExample-double-echo .modExampleTile')).toHaveCount(4);await expect(page.locator('.modExample-double-echo .modExampleOutcome')).toHaveText('MAIN + ECHO');const demoBox=await page.locator('.marketInspectorDemo.hasScene').evaluate(el=>({sw:el.scrollWidth,cw:el.clientWidth,sh:el.scrollHeight,ch:el.clientHeight}));expect(demoBox.sw).toBeLessThanOrEqual(demoBox.cw+1);expect(demoBox.sh).toBeLessThanOrEqual(demoBox.ch+1);await page.locator('#overlayPrimary').click();
  await expect(page.locator('#overlayTitle')).toHaveText('MARKET');

  await page.locator('[data-market-offer="double-double"]>.shopBuy').click();
  await expect(page.locator('#overlay')).not.toHaveClass(/show/);
  await expect(page.locator('#circuitChoice')).toContainText('DOUBLE DOUBLE · CHOOSE A TILE');
  await expect(page.locator('#board .circuitEligible')).toHaveCount(5);
  await page.locator('.piece[data-tile-id="d4-4"]').click();
  await expect(page.locator('#circuitChoice')).toBeHidden();
  expect(await page.evaluate(()=>window.__monoidGame.state().doubleDoubleTileId)).toBe('d4-4');
  expect(await page.evaluate(()=>window.__monoidGame.state().pendingModPlacement)).toBe(null);
  await expect.poll(()=>page.evaluate(()=>window.__monoidGame.state().round)).toBe(3);expect(await page.evaluate(()=>window.__monoidGame.state().cleared)).toBe(false);
  expect(await page.evaluate(()=>window.MonoidLatePolish.scientific(1.1641532182693482e33))).toBe('1.16e33');
  await page.evaluate(()=>{const g=window.__monoidGame||window.__nomonGame;g.state().score=8.603241731728167e47;window.MonoidLatePolish.sync();window.MonoidPhaseA.sync()});await expect(page.locator('#score')).toHaveText('8.6e47');await expect(page.locator('#score')).toHaveClass(/extremeValue/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
});

test('Market keeps compact cards and touch targets on 375px phones',async({page})=>{
  await page.setViewportSize({width:375,height:667});
  await page.addInitScript(()=>localStorage.setItem('monoid.firstRunBriefing.v1','seen'));
  await page.goto('http://127.0.0.1:4173/');await page.locator('#titleCard').click();await page.locator('#startRun').click();
  await page.evaluate(()=>{const g=window.__monoidGame,s=g.state(),E=window.IterionEngine,ids=['d1-1','d2-2','d3-3','d4-4'];s.round=2;s.cleared=true;s.nextShopType='market';s.intermissionResolved=false;s.coins=40;s.pieces=ids.map((id,i)=>{const t=s.set.find(t=>t.id===id),p=E.pieceFrom(t,2+i*4,4,0,1,i+1);p.tile={...t};return p});s.placedTileIds=ids.slice();s.hand=s.hand.map(t=>s.placedTileIds.includes(t?.id)?null:t);s.reserve=s.reserve.filter(t=>!s.placedTileIds.includes(t.id));g.openIntermission();s.shopOffers=['double-double','double-echo','long-run']});
  await openHelp(page);await page.locator('#overlayPrimary').click();await expect.poll(()=>page.locator('.marketStructuredOffer').count()).toBe(3);await expect(page.locator('.marketOfferGrid')).toHaveClass(/classicMarketPyramid/);
  const pyramid=await page.locator('.marketOfferGrid').evaluate(el=>{const g=el.getBoundingClientRect(),cards=[...el.querySelectorAll('.marketCompactOffer')].map(x=>x.getBoundingClientRect());return{center:g.left+g.width/2,cards:cards.map(r=>({x:r.x,y:r.y,w:r.width,h:r.height}))}});expect(Math.abs(pyramid.cards[0].x+pyramid.cards[0].w/2-pyramid.center)).toBeLessThan(2);expect(pyramid.cards[0].y).toBeLessThan(pyramid.cards[1].y);expect(Math.abs(pyramid.cards[1].y-pyramid.cards[2].y)).toBeLessThan(2);
  expect(await page.locator('.marketOfferMark').first().evaluate(el=>getComputedStyle(el).boxShadow)).not.toBe('none');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const actions=await page.locator('.marketCompactOffer>.shopBuy').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().height));expect(actions.every(h=>h>=44)).toBe(true);
  await expect(page.locator('.marketOfferDescription,.marketModDiagram,.marketOfferVisual,.marketOfferPayoff,.marketOfferMeta')).toHaveCount(0);
  await expect(page.locator('.marketOfferMark')).toHaveCount(3);
  await expect(page.locator('[data-market-offer="double-double"] .marketTileModMark')).toBeVisible();
  await expect(page.locator('[data-market-offer="long-run"] .marketMachineModMark')).toBeVisible();
  await expect(page.locator('.marketCompactOffer').first().locator('.marketOfferName')).toBeVisible();
  await expect(page.locator('.marketCompactOffer').first().locator('.marketInspectTarget')).toBeVisible()
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
  const barHeight=await page.locator('.scoreProgressTrack').evaluate(el=>parseFloat(getComputedStyle(el).height));expect(barHeight).toBeGreaterThanOrEqual(1);expect(barHeight).toBeLessThanOrEqual(2);
  const wordmark=await page.locator('.wordmark').boundingBox();expect(Math.abs(wordmark.x+wordmark.width/2-187.5)).toBeLessThan(1);
  const menu=await page.locator('#menuButton').boundingBox();expect(Math.abs(menu.x+menu.width/2-187.5)).toBeLessThan(1);
  expect(await page.locator('#menuButton').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
});



test('Adapter stays visible and tappable when a full Hand grows to six tiles',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('monoid.firstRunBriefing.v1','seen'));
  await page.setViewportSize({width:375,height:667});
  await page.goto('http://127.0.0.1:4173/');
  await page.locator('#titleCard').click();await page.locator('#startRun').click();
  await page.addStyleTag({content:'.bottomBar{display:grid!important;grid-template-columns:minmax(0,1fr) 244px!important}.handRail{width:244px!important;min-width:244px!important}.hand{flex-direction:row!important;height:92px!important}'});
  await page.evaluate(()=>{const s=window.__monoidGame.state();s.coins=200;const button=document.getElementById('shopButton');button.disabled=false;button.click()});
  await expect(page.locator('#overlayTitle')).toHaveText('TILE SHOP');
  await expect(page.locator('#overlayBody')).toContainText('PURCHASE → HAND · 5/8');
  await page.locator('#shopAdapterBuy').click();
  await expect(page.locator('#overlayBody')).toContainText('PURCHASE → HAND · 6/8');
  await page.locator('#overlayPrimary').click();
  const adapter=page.locator('#hand .tile[aria-label^="Adapter."]');await expect(adapter).toBeVisible();
  const layout=await page.evaluate(()=>{
    const hand=document.getElementById('hand'),hr=hand.getBoundingClientRect(),slots=[...hand.querySelectorAll('.handSlot[data-hand-touch="true"]')],rects=slots.map(el=>el.getBoundingClientRect()),adapter=[...slots].find(el=>el.querySelector('.tile[aria-label^="Adapter."]')),ar=adapter?.getBoundingClientRect(),hit=ar?document.elementFromPoint(ar.left+ar.width/2,ar.top+ar.height/2):null;
    return{count:rects.length,overflow:hand.classList.contains('handOverflow'),handCount:hand.dataset.handCount,left:Math.min(...rects.map(r=>r.left)),right:Math.max(...rects.map(r=>r.right)),handLeft:hr.left,handRight:hr.right,adapterVisible:!!ar&&ar.left>=hr.left-1&&ar.right<=hr.right+1,adapterHit:!!adapter&&!!hit&&adapter.contains(hit)}
  });
  expect(layout.count).toBe(6);expect(layout.overflow).toBe(true);expect(layout.handCount).toBe('6');expect(layout.left).toBeGreaterThanOrEqual(layout.handLeft-1);expect(layout.right).toBeLessThanOrEqual(layout.handRight+1);expect(layout.adapterVisible).toBe(true);expect(layout.adapterHit).toBe(true)
});

test('Tile Shop purchases fit an eight-tile overflow Hand on compact phones',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('monoid.firstRunBriefing.v1','seen'));
  await page.setViewportSize({width:375,height:667});
  await page.goto('http://127.0.0.1:4173/');
  await page.locator('#titleCard').click();await page.locator('#startRun').click();
  await page.evaluate(()=>{const s=window.__monoidGame.state();s.coins=200;const button=document.getElementById('shopButton');button.disabled=false;button.click()});
  await expect(page.locator('#overlayTitle')).toHaveText('TILE SHOP');
  await expect(page.locator('#overlayBody')).toContainText('PURCHASE → HAND · 5/8');
  for(let i=0;i<3;i++)await page.locator('[data-shop-tile-offer]').first().click();
  await expect(page.locator('#hand .domino')).toHaveCount(8);
  await expect(page.locator('#overlayBody')).toContainText('HAND FULL · 8/8');
  const layout=await page.evaluate(()=>{
    const rail=document.querySelector('.handRail').getBoundingClientRect(),hand=document.getElementById('hand'),touchSlots=[...hand.querySelectorAll('.handSlot[data-hand-touch="true"]')],slots=[...hand.querySelectorAll('.handSlot')].map(el=>el.getBoundingClientRect()),touchRects=touchSlots.map(el=>el.getBoundingClientRect());
    return{count:slots.length,touchCount:touchRects.length,overflow:hand.classList.contains('handOverflow'),railTop:rail.top,railBottom:rail.bottom,slotTop:Math.min(...slots.map(r=>r.top)),slotBottom:Math.max(...slots.map(r=>r.bottom)),minTouch:Math.min(...touchRects.map(r=>Math.min(r.width,r.height))),scrolls:document.documentElement.scrollHeight>innerHeight||document.documentElement.scrollWidth>innerWidth}
  });
  expect(layout.count).toBe(8);expect(layout.touchCount).toBe(8);expect(layout.overflow).toBe(true);expect(layout.slotTop).toBeGreaterThanOrEqual(layout.railTop-1);expect(layout.slotBottom).toBeLessThanOrEqual(layout.railBottom+1);expect(layout.minTouch).toBeGreaterThanOrEqual(44);expect(layout.scrolls).toBe(false)
});


test('54x72 Classic boards scale pips down with the physical tile',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(()=>{localStorage.setItem('monoid.firstRunBriefing.v1','seen');let api;Object.defineProperty(window,'IterionGame',{configurable:true,get:()=>api,set:value=>{api={...value,createGame(E,options){const g=value.createGame(E,{...options,seed:70054}),s=g.state();E.setBoardSize(54,72);const t=s.set.find(tile=>tile.id==='d6-6'),p=E.pieceFrom(t,24,30,0,0,1);p.tile={...t};s.pieces=[p];s.placedTileIds=[t.id];s.hand=s.hand.map(tile=>tile?.id===t.id?null:tile);s.reserve=s.reserve.filter(tile=>tile.id!==t.id);s.idc=1;s.turn=1;window.__largeBoardGame=g;return g}}}})});
  await page.goto('http://127.0.0.1:4173/');await page.locator('#titleCard').click();await page.locator('#startRun').click();await expect(page.locator('#board .piece')).toHaveCount(1);
  const metrics=await page.locator('#board .piece').evaluate(el=>{const piece=getComputedStyle(el),pip=el.querySelector('.pip'),pr=pip.getBoundingClientRect(),er=el.getBoundingClientRect(),br=document.querySelector('#board').getBoundingClientRect();return{radius:parseFloat(piece.borderTopLeftRadius),pipW:pr.width,pipH:pr.height,tileShort:Math.min(er.width,er.height),pipVar:document.querySelector('#board').style.getPropertyValue('--board-pip-size'),radiusVar:document.querySelector('#board').style.getPropertyValue('--board-tile-radius'),boardW:br.width}});
  expect(metrics.boardW).toBeGreaterThan(200);expect(Math.abs(metrics.pipW-metrics.pipH)).toBeLessThan(.15);expect(metrics.pipW).toBeGreaterThanOrEqual(1.2);expect(metrics.pipW/metrics.tileShort).toBeLessThan(.15);expect(metrics.radius).toBeGreaterThan(.6);expect(metrics.radius).toBeLessThanOrEqual(2.5);expect(metrics.pipVar).toMatch(/px$/);expect(metrics.radiusVar).toMatch(/px$/);
});
