const {test,expect}=require('@playwright/test');

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('iterion.entryBypass.v1','true');
    localStorage.removeItem('iterion.routePreview.v1');
    let api;
    Object.defineProperty(window,'IterionGame',{configurable:true,get:()=>api,set:value=>{
      api={...value,createGame(E,options){
        const g=value.createGame(E,{...options,seed:54001,TARGETS:Array(15).fill(Number.MAX_SAFE_INTEGER)}),s=g.state(),tile=id=>s.set.find(item=>item.id===id),make=(id,x,y,rr,pieceId)=>{const t=tile(id),p=E.pieceFrom(t,x,y,0,rr,pieceId);p.tile={...t};return p};
        const pieces=[make('d2-3',4,8,0,1),make('d3-4',6,6,3,2),make('d4-5',6,2,3,3),make('d3-6',8,8,0,4)],next=tile('d1-2');
        s.pieces=pieces;s.placedTileIds=pieces.map(piece=>piece.tile.id);s.idc=pieces.length;s.turn=pieces.length;s.roundTurn=pieces.length;s.anchorId=pieces[0].tile.id;s.hand=[next,null,null,null,null];s.reserve=s.set.filter(item=>!s.placedTileIds.includes(item.id)&&item.id!==next.id);s.running=false;s.cleared=false;s.blocked=false;s.needsReroll=false;s.failureReason=null;s.shopOpen=false;s.pendingCircuit=null;s.pendingModPlacement=null;
        const preview=g.previewPlacement.bind(g);window.__routePreviewCalls=0;g.previewPlacement=(...args)=>{window.__routePreviewCalls++;return preview(...args)};
        const candidates=g.candidatesForIndex(0);window.__routePreviewCandidate=candidates.find(candidate=>candidate.x===0&&candidate.y===8&&candidate.rr===0)||candidates[0];window.__routePreviewGame=g;return g
      }};
    }});
  })
});

async function beginCandidateDrag(page){
  const candidate=await page.evaluate(()=>window.__routePreviewCandidate);
  expect(candidate).toBeTruthy();
  const target=await page.evaluate(candidate=>{
    const game=window.__routePreviewGame,E=window.IterionEngine,tile=game.state().hand[0],piece=E.pieceFrom(tile,candidate.x,candidate.y,0,candidate.rr,-1);
    return{x:(piece.rect.minx+piece.rect.maxx)/2/E.G,y:(piece.rect.miny+piece.rect.maxy)/2/E.H,offset:window.IterionData.DRAG_Y_OFFSET}
  },candidate);
  const hand=await page.locator('#hand .tile').first().boundingBox(),board=await page.locator('#board').boundingBox();
  await page.mouse.move(hand.x+hand.width/2,hand.y+hand.height/2);await page.mouse.down();await page.mouse.move(hand.x-20,hand.y+hand.height/2,{steps:2});await page.mouse.move(board.x+target.x*board.width,board.y+target.y*board.height+target.offset,{steps:4});
}
async function cancelDrag(page){await page.mouse.move(2,2);await page.mouse.up()}

test('Signal Route Preview turns the machine into the route and keeps Full / Preview / Off distinct',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4173/');

  await beginCandidateDrag(page);
  await expect(page.locator('.routePreviewSvg')).toBeVisible();await expect(page.locator('.routePreviewSvg')).toHaveAttribute('data-preview-mode','full');
  expect(await page.locator('.routePreviewLine').count()).toBeGreaterThan(0);expect(await page.locator('.routePreviewPulse').count()).toBeGreaterThan(0);
  expect(await page.locator('.routePreviewPulse').first().evaluate(el=>getComputedStyle(el).stroke)).not.toBe('none');
  expect(await page.locator('.routePreviewPulse').first().evaluate(el=>getComputedStyle(el).animationName)).toContain('routePreviewFlow');
  await expect(page.locator('.routePreviewStart')).toHaveText('START');expect(await page.locator('.routePreviewEnd').count()).toBeGreaterThan(0);const startClear=await page.evaluate(()=>{const start=document.querySelector('.routePreviewStart').getBoundingClientRect(),candidate=document.querySelector('.dragCandidate').getBoundingClientRect();return start.bottom<=candidate.top||start.top>=candidate.bottom||start.right<=candidate.left||start.left>=candidate.right});expect(startClear).toBe(true);
  expect(await page.locator('.routePreviewJunctionRing').count()).toBeGreaterThan(0);expect(await page.locator('.piece.routePreviewDim').count()).toBeGreaterThan(0);expect(await page.locator('.piece.routePreviewActiveTile').count()).toBeGreaterThan(0);await expect(page.locator('.routePreviewRule')).toHaveText('↑ MORE PASSES');
  await expect(page.locator('.routePreviewCoach')).toHaveCount(0);await expect(page.locator('.routePreviewArrowHead')).toHaveCount(0);
  const ruleBox=await page.locator('.routePreviewRule').boundingBox(),boardBox=await page.locator('#board').boundingBox();expect(ruleBox.x).toBeGreaterThanOrEqual(boardBox.x);expect(ruleBox.x+ruleBox.width).toBeLessThanOrEqual(boardBox.x+boardBox.width);
  expect(await page.evaluate(()=>window.__routePreviewCalls)).toBeGreaterThan(0);
  await page.screenshot({path:'test-results/route-preview-clarity-390x844.png',fullPage:true});
  await cancelDrag(page);

  await page.locator('#menuButton').click();await expect(page.locator('[data-route-preview="full"]')).toHaveAttribute('aria-pressed','true');await page.locator('[data-route-preview="preview"]').click();expect(await page.evaluate(()=>localStorage.getItem('iterion.routePreview.v1'))).toBe('preview');await page.locator('#closeMenu').click();
  await beginCandidateDrag(page);await expect(page.locator('.routePreviewSvg')).toHaveAttribute('data-preview-mode','preview');expect(await page.locator('.routePreviewPulse').count()).toBeGreaterThan(0);await expect(page.locator('.routePreviewStart')).toHaveCount(0);await expect(page.locator('.routePreviewEnd')).toHaveCount(0);await expect(page.locator('.routePreviewRule')).toHaveCount(0);await cancelDrag(page);

  await page.locator('#menuButton').click();await page.locator('[data-route-preview="off"]').click();await expect(page.locator('[data-route-preview="off"]')).toHaveAttribute('aria-pressed','true');await page.locator('#closeMenu').click();const callsBefore=await page.evaluate(()=>window.__routePreviewCalls);
  await beginCandidateDrag(page);await expect(page.locator('.routePreviewSvg')).toHaveCount(0);expect(await page.evaluate(()=>window.__routePreviewCalls)).toBe(callsBefore);await cancelDrag(page)
});


test('route event vocabulary separates return lanes and labels route mechanics',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4173/');
  await page.evaluate(()=>{
    const game=window.__routePreviewGame,real=game.previewPlacement.bind(game);
    game.previewPlacement=(...args)=>{
      const preview=real(...args);if(!preview?.ok)return preview;
      const sim=preview.sim,segment=sim.segments?.[0],op=sim.events?.find(event=>event.type==='op'),route=sim.events?.find(event=>event.type==='route');
      if(segment)sim.segments.push({...segment,from:{...segment.to},to:{...segment.from},reverse:true});
      if(op){
        const toPieceId=route?.toPieceId||op.piece,toHalf=route?.toHalf??op.entryHalf??0;
        sim.events.splice(Math.max(0,sim.events.length-1),0,
          {type:'rebound',piece:op.piece,charge:1},
          {type:'zero-port',piece:op.piece,fromHalf:op.exitHalf,toPieceId},
          {type:'core-activate',coreId:'qa-core',piece:op.piece,beforeSignal:3,afterSignal:24},
          {type:'core-relay',coreId:'qa-core',fromPieceId:op.piece,fromHalf:op.exitHalf,toPieceId,toHalf},
          {type:'signal-depleted',piece:toPieceId,remaining:0}
        )
      }
      return preview
    }
  });
  await beginCandidateDrag(page);
  await expect(page.locator('.routePreviewRebound')).toHaveText('REBOUND');await expect(page.locator('.routePreviewTeleport')).toHaveText('TELEPORT');await expect(page.locator('.routePreviewRecharge')).toHaveText('CORE +21');await expect(page.locator('.routePreviewRelay')).toHaveText('RELAY');await expect(page.locator('.routePreviewDepleted')).toHaveText('SIGNAL OUT');
  const lanes=await page.evaluate(()=>{const forward=document.querySelector('.routePreviewLine.physical'),back=document.querySelector('.routePreviewLine.retrace'),attrs=el=>({x1:el?.getAttribute('x1'),y1:el?.getAttribute('y1'),x2:el?.getAttribute('x2'),y2:el?.getAttribute('y2'),stroke:el?getComputedStyle(el).stroke:null});return{forward:attrs(forward),back:attrs(back)}});expect(lanes.back.stroke).not.toBe(lanes.forward.stroke);expect([lanes.back.x1,lanes.back.y1,lanes.back.x2,lanes.back.y2]).not.toEqual([lanes.forward.x2,lanes.forward.y2,lanes.forward.x1,lanes.forward.y1]);await cancelDrag(page)
});

test('Full route guidance stays contained on the compact mobile fixture',async({page})=>{
  await page.setViewportSize({width:375,height:667});await page.goto('http://127.0.0.1:4173/');await beginCandidateDrag(page);
  await expect(page.locator('.routePreviewStart')).toBeVisible();await expect(page.locator('.routePreviewEnd').first()).toBeVisible();await expect(page.locator('.routePreviewRule')).toBeVisible();
  const contained=await page.evaluate(()=>{const board=document.querySelector('#board').getBoundingClientRect(),rule=document.querySelector('.routePreviewRule').getBoundingClientRect(),start=document.querySelector('.routePreviewStart').getBoundingClientRect(),end=document.querySelector('.routePreviewEnd').getBoundingClientRect();const candidate=document.querySelector('.dragCandidate').getBoundingClientRect(),startClear=start.bottom<=candidate.top||start.top>=candidate.bottom||start.right<=candidate.left||start.left>=candidate.right;return{rule:rule.left>=board.left&&rule.right<=board.right&&rule.top>=board.top&&rule.bottom<=board.bottom,endpoints:[start,end].every(rect=>rect.left>=board.left&&rect.right<=board.right&&rect.top>=board.top&&rect.bottom<=board.bottom),startClear,pageFits:document.documentElement.scrollWidth<=window.innerWidth}});
  expect(contained.rule).toBe(true);expect(contained.endpoints).toBe(true);expect(contained.startClear).toBe(true);expect(contained.pageFits).toBe(true);await page.screenshot({path:'test-results/route-preview-clarity-375x667.png',fullPage:true});await cancelDrag(page)
});

test('automatic assistance steps down to Preview after the first three Classic rounds',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4173/');await page.evaluate(()=>{window.__routePreviewGame.state().round=3});await page.locator('#menuButton').click();await expect(page.locator('[data-route-preview="preview"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#routePreviewHelp')).toContainText('Automatic')
});
