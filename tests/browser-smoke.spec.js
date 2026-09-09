const { test, expect } = require('@playwright/test');

test('ITERION browser smoke', async ({ page }) => {
  const jsErrors=[];
  page.on('pageerror',error=>jsErrors.push(`pageerror: ${error.message}`));
  page.on('console',message=>{if(message.type()==='error')jsErrors.push(`console: ${message.text()}`)});

  await page.goto('http://127.0.0.1:4173/',{waitUntil:'load'});

  await expect(page.locator('#board')).toBeVisible();
  await expect(page.locator('#hand')).toBeVisible();
  await expect(page.locator('#hand .handSlot')).toHaveCount(5);
  expect(await page.locator('#hand .tile').count()).toBeGreaterThan(0);

  const firstRunId=await page.evaluate(()=>JSON.parse(localStorage.getItem('iterion.latestRun.v9')||'null')?.runId||null);
  expect(firstRunId).toBeTruthy();
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#reset').click();
  await page.waitForFunction(previous=>{
    const saved=JSON.parse(localStorage.getItem('iterion.latestRun.v9')||'null');
    return !!saved?.runId&&saved.runId!==previous;
  },firstRunId);

  await page.locator('#shopButton').click();
  await expect(page.locator('#overlay')).toHaveClass(/show/);
  await expect(page.locator('#overlayTitle')).toHaveText('SHOP');
  await expect(page.locator('#overlayPrimary')).toHaveText('CLOSE SHOP');
  await page.locator('#overlayPrimary').click();
  await expect(page.locator('#overlay')).not.toHaveClass(/show/);

  await page.locator('#viewrun').click();
  await expect(page.locator('#runlog')).toHaveClass(/show/);
  await page.locator('#runlog button',{hasText:'CLOSE'}).click();
  await expect(page.locator('#runlog')).not.toHaveClass(/show/);

  await page.locator('#helpButton').click();
  await expect(page.locator('#overlay')).toHaveClass(/show/);
  await expect(page.locator('#overlayTitle')).toHaveText('HOW TO PLAY');
  await expect(page.locator('#overlayPrimary')).toHaveText('CLOSE');
  await page.locator('#overlayPrimary').click();
  await expect(page.locator('#overlay')).not.toHaveClass(/show/);

  expect(jsErrors,jsErrors.join('\n')).toEqual([]);
});

for(const viewport of [{width:390,height:844},{width:375,height:667}]){
  test(`Endless transition on mobile ${viewport.width}x${viewport.height}`,async({page})=>{
    await page.setViewportSize(viewport);
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    // Test-only factory interception seeds the final-round fixture before UI init.
    // No production source is rewritten and no test hooks ship in the game.
    await page.addInitScript(()=>{
      let api;
      Object.defineProperty(window,'IterionGame',{
        configurable:true,get:()=>api,set:value=>{
          api={...value,createGame(engine,options){
            const game=value.createGame(engine,{...options,seed:2401,STARTING_COINS:100});
            const s=game.state();engine.setBoardSize(30,40);s.round=14;s.boardStage=4;
            const i=s.hand.findIndex(t=>t&&t.a===t.b&&t.a>0);
            const ctx=game.beginPlacement(i,game.candidatesForIndex(i)[0]);
            ctx.sim.output=game.target();game.finishPlacement(ctx);
            window.__iterionTestGame=game;return game;
          }};
        }
      });
    });
    await page.goto('http://127.0.0.1:4173/');
    await expect(page.locator('#overlayTitle')).toHaveText('RUN COMPLETE');
    await expect(page.locator('#overlayPrimary')).toHaveText('CONTINUE · ENDLESS');
    await expect(page.locator('#overlayTertiary')).toBeVisible();
    const before=await page.evaluate(()=>window.__iterionTestGame.snapshot());
    await page.locator('#overlayPrimary').click();
    await expect(page.locator('#overlayTitle')).toHaveText('MARKET');
    await expect(page.locator('#overlayPrimary')).toHaveText('CONTINUE TO STAGE 6');
    expect(await page.evaluate(()=>window.__iterionTestGame.snapshot().round.index)).toBe(15);
    await page.locator('#overlayPrimary').click();
    await expect(page.locator('#roundstat')).toHaveText('16/∞');
    await expect(page.locator('#stageRound')).toContainText('ENDLESS');
    await expect(page.locator('#target')).toHaveText('250,000,000,000');
    const after=await page.evaluate(()=>window.__iterionTestGame.snapshot());
    expect(after.board).toEqual(before.board);expect(after.set).toEqual(before.set);
    expect(after.coins).toBe(before.coins);expect(after.inflation).toBe(before.inflation);
    expect(after.endless.baseComplete).toBe(true);
    const layout=await page.evaluate(()=>{
      const board=document.querySelector('#board').getBoundingClientRect(),hand=document.querySelector('#hand').getBoundingClientRect();
      return{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,
        viewportWidth:innerWidth,viewportHeight:innerHeight,boardRight:board.right,handLeft:hand.left,handBottom:hand.bottom};
    });
    expect(layout.width).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.height).toBeLessThanOrEqual(layout.viewportHeight);
    expect(layout.handLeft).toBeGreaterThanOrEqual(layout.boardRight);
    expect(layout.handBottom).toBeLessThanOrEqual(layout.viewportHeight);
    // Force exhaustion to exercise the actual failure overlay and saved result.
    await page.evaluate(()=>{
      const g=window.__iterionTestGame,s=g.state();s.hand.fill(null);s.reserve=[];g.assessContinuation();g.save();
    });
    await page.locator('#helpButton').click();
    await page.locator('#overlayPrimary').click();
    await expect(page.locator('#overlayTitle')).toHaveText('ENDLESS OVER');
    await expect(page.locator('#overlayBody')).toContainText('Base run complete');
    expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('iterion.latestRun.v9')).endless.baseComplete)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test.describe('Circuit spatial selection',()=>{
  test.use({hasTouch:true,isMobile:true});
  for(const viewport of [{width:390,height:844},{width:375,height:667}])test(`Circuit touch, Undo and rank rendering ${viewport.width}x${viewport.height}`,async({page})=>{
    await page.setViewportSize(viewport);const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{
      let api;
      Object.defineProperty(window,'IterionGame',{configurable:true,get:()=>api,set:value=>{
        api={...value,createGame(engine,options){
          const game=value.createGame(engine,{...options,seed:2501,TARGETS:Array(15).fill(1e15)}),s=game.state();
          const specs=[['d1-2',2,0,0],['d2-3',6,0,1],['d3-4',6,4,2]];
          s.pieces=specs.map(([id,x,y,rr],i)=>{const tile=s.set.find(t=>t.id===id),p=engine.pieceFrom(tile,x,y,0,rr,i+1);p.tile={...tile};return p});
          s.placedTileIds=specs.map(a=>a[0]);s.turn=3;s.idc=3;s.consumables.undo=2;
          // A legal continuation keeps the post-choice Inspector unobstructed.
          s.hand=[s.set.find(t=>t.id==='d1-4'),s.set.find(t=>t.id==='d2-2'),null,null,null];s.reserve=s.set.filter(t=>!s.placedTileIds.includes(t.id)&&!s.hand.some(h=>h?.id===t.id));
          // Existing Rank I becomes Rank II; retain the independent Star badge.
          s.circuitRanks={'d1-2':1};s.set.find(t=>t.id==='d1-2').upgrade=2;s.pieces[0].tile.upgrade=2;
          const ctx=game.beginPlacement(0,{x:2,y:2,rr:1});if(!ctx.ok)throw new Error('Invalid Circuit browser fixture');game.finishPlacement(ctx);
          if(s.blocked||s.needsReroll)throw new Error('Circuit fixture must retain a legal continuation');
          window.__iterionTestGame=game;return game;
        }};
      }});
    });
    await page.goto('http://127.0.0.1:4173/');
    await expect(page.locator('#circuitChoice')).toContainText('CIRCUIT CLOSED · 4 TILES · +1 RANK');
    await expect(page.locator('#overlay')).not.toHaveClass(/show/);
    await expect(page.locator('.circuitEligible')).toHaveCount(4);
    await expect(page.locator('#shopButton')).toBeDisabled();
    for(const handTile of await page.locator('#hand .tile').all())await expect(handTile).toBeDisabled();
    const tile=page.locator('.piece[data-tile-id="d1-2"]');
    const box=await tile.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
    // Holding must not select. Moving must not become placement or selection.
    await page.mouse.move(x,y);await page.mouse.down();await page.waitForTimeout(550);await page.mouse.up();
    await expect(page.locator('#circuitChoice')).toBeVisible();
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+30,y+30);await page.mouse.up();
    await expect(page.locator('#circuitChoice')).toBeVisible();
    const before=await page.evaluate(()=>window.__iterionTestGame.snapshot());
    await page.touchscreen.tap(x,y);
    await expect(page.locator('#circuitChoice')).toBeHidden();
    await expect(tile).toHaveClass(/circuitTile circuitRank2/);
    await expect(tile.locator('.circuitRankMark')).toHaveText('II');
    await expect(tile.locator('.upgradeDot')).toHaveCount(1);
    expect(await tile.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(20, 20, 20)');
    expect(await tile.locator('.pip').first().evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(101, 219, 135)');
    expect((await page.evaluate(()=>window.__iterionTestGame.snapshot())).score.last).toBe(before.score.last);
    const rankedBox=await tile.boundingBox();
    await page.mouse.move(rankedBox.x+rankedBox.width/2,rankedBox.y+rankedBox.height/2);await page.mouse.down();await page.waitForTimeout(550);await page.mouse.up();
    await expect(page.locator('#overlayBody')).toContainText('RANK II · GREEN');
    await expect(page.locator('#overlayBody')).toContainText('Resonance: +100%');
    await page.locator('#overlayPrimary').click();
    await page.locator('#helpButton').click();
    await expect(page.locator('#overlayBody')).toContainText('Circuits');
    await page.locator('#overlayPrimary').click();
    const layout=await page.evaluate(()=>({w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight,vw:innerWidth,vh:innerHeight,boardRight:document.querySelector('#board').getBoundingClientRect().right,handLeft:document.querySelector('#hand').getBoundingClientRect().left}));
    expect(layout.w).toBeLessThanOrEqual(layout.vw);expect(layout.h).toBeLessThanOrEqual(layout.vh);expect(layout.handLeft).toBeGreaterThanOrEqual(layout.boardRight);
    await page.locator('#undoTool').click();
    expect(await page.evaluate(()=>window.__iterionTestGame.snapshot().circuits)).toEqual({ranks:{'d1-2':1},signatures:[],pending:null});
    await expect(page.locator('.piece')).toHaveCount(3);expect(errors).toEqual([]);
  });
});

for(const[rank,roman,color,pip]of [[1,'I','WHITE','255, 255, 255'],[2,'II','GREEN','101, 219, 135'],[3,'III','BLUE','117, 186, 255'],[4,'IV','PURPLE','208, 155, 255'],[5,'V','GOLD','244, 203, 90']]){
  test(`Circuit rank ${roman} coexists with Stars, DD, DE and ZM`,async({page})=>{
    await page.setViewportSize({width:375,height:667});
    await page.addInitScript(rank=>{
      let api;Object.defineProperty(window,'IterionGame',{configurable:true,get:()=>api,set:value=>{api={...value,createGame(engine,options){
        const game=value.createGame(engine,{...options,seed:2505}),s=game.state();engine.setBoardSize(30,40);s.boardStage=4;
        s.pieces=[['d5-5',10,10],['d0-5',14,10]].map(([id,x,y],i)=>{const tile=s.set.find(t=>t.id===id);tile.upgrade=2;const p=engine.pieceFrom(tile,x,y,0,i?2:0,i+1);p.tile={...tile};return p});
        s.placedTileIds=s.pieces.map(p=>p.tile.id);s.hand=s.hand.map(t=>t&&s.placedTileIds.includes(t.id)?null:t);s.reserve=s.reserve.filter(t=>!s.placedTileIds.includes(t.id));
        s.circuitRanks={'d5-5':rank,'d0-5':rank};s.doubleDoubleTileId='d5-5';s.doubleEchoTileId='d5-5';s.zeroMemoryTileId='d0-5';return game;
      }}}});
    },rank);
    await page.goto('http://127.0.0.1:4173/');
    const double=page.locator('.piece[data-tile-id="d5-5"]'),zero=page.locator('.piece[data-tile-id="d0-5"]');
    for(const tile of [double,zero]){await expect(tile).toHaveClass(new RegExp(`circuitRank${rank}`));await expect(tile.locator('.circuitRankMark')).toHaveText(roman);await expect(tile.locator('.upgradeDot')).toHaveCount(1);expect(await tile.locator('.pip').first().evaluate(el=>getComputedStyle(el).backgroundColor)).toBe(`rgb(${pip})`)}
    await expect(double.locator('.tileModMark')).toHaveText(['DD','DE']);await expect(zero.locator('.tileModMark')).toHaveText(['ZM']);
    const box=await double.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(550);await page.mouse.up();
    await expect(page.locator('#overlayBody')).toContainText(`RANK ${roman} · ${color}`);
  });
}
