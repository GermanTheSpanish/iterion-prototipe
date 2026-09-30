const {test,expect}=require('@playwright/test');

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('iterion.entryBypass.v1','true');
    localStorage.removeItem('iterion.routePreview.v1');
    let api;
    Object.defineProperty(window,'IterionGame',{configurable:true,get:()=>api,set:value=>{
      api={...value,createGame(E,options){
        const g=value.createGame(E,{...options,seed:54001,TARGETS:Array(15).fill(Number.MAX_SAFE_INTEGER)}),s=g.state(),root=s.set.find(tile=>tile.id==='d2-2'),next=s.set.find(tile=>tile.id==='d2-3'),piece=E.pieceFrom(root,7,10,0,0,1);
        piece.tile={...root};s.pieces=[piece];s.placedTileIds=[root.id];s.idc=1;s.turn=1;s.roundTurn=1;s.anchorId=root.id;s.hand=[next,null,null,null,null];s.reserve=s.set.filter(tile=>tile.id!==root.id&&tile.id!==next.id);s.running=false;s.cleared=false;s.blocked=false;s.needsReroll=false;s.failureReason=null;s.shopOpen=false;s.pendingCircuit=null;s.pendingModPlacement=null;
        const preview=g.previewPlacement.bind(g);window.__routePreviewCalls=0;g.previewPlacement=(...args)=>{window.__routePreviewCalls++;return preview(...args)};window.__routePreviewGame=g;return g
      }};
    }});
  })
});

async function beginCandidateDrag(page){
  const candidate=await page.evaluate(()=>window.__routePreviewGame.candidatesForIndex(0)[0]);
  expect(candidate).toBeTruthy();
  const target=await page.evaluate(candidate=>{
    const game=window.__routePreviewGame,E=window.IterionEngine,tile=game.state().hand[0],piece=E.pieceFrom(tile,candidate.x,candidate.y,0,candidate.rr,-1);
    return{x:(piece.rect.minx+piece.rect.maxx)/2/E.G,y:(piece.rect.miny+piece.rect.maxy)/2/E.H,offset:window.IterionData.DRAG_Y_OFFSET}
  },candidate);
  const hand=await page.locator('#hand .tile').first().boundingBox(),board=await page.locator('#board').boundingBox();
  await page.mouse.move(hand.x+hand.width/2,hand.y+hand.height/2);await page.mouse.down();await page.mouse.move(hand.x-20,hand.y+hand.height/2,{steps:2});await page.mouse.move(board.x+target.x*board.width,board.y+target.y*board.height+target.offset,{steps:4});
}
async function cancelDrag(page){await page.mouse.move(2,2);await page.mouse.up()}

test('Signal Route Preview defaults to Full, supports Preview, and Off skips preview simulation',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4173/');

  await beginCandidateDrag(page);
  await expect(page.locator('.routePreviewSvg')).toBeVisible();await expect(page.locator('.routePreviewSvg')).toHaveAttribute('data-preview-mode','full');expect(await page.locator('.routePreviewLine').count()).toBeGreaterThan(0);expect(await page.locator('.routePreviewLine').first().evaluate(el=>getComputedStyle(el).stroke)).not.toBe('none');await expect(page.locator('.routePreviewCoach')).toContainText('SIGNAL PREVIEW');expect(await page.evaluate(()=>window.__routePreviewCalls)).toBeGreaterThan(0);
  await cancelDrag(page);

  await page.locator('#menuButton').click();await expect(page.locator('[data-route-preview="full"]')).toHaveAttribute('aria-pressed','true');await page.locator('[data-route-preview="preview"]').click();expect(await page.evaluate(()=>localStorage.getItem('iterion.routePreview.v1'))).toBe('preview');await page.locator('#closeMenu').click();
  await beginCandidateDrag(page);await expect(page.locator('.routePreviewSvg')).toHaveAttribute('data-preview-mode','preview');await expect(page.locator('.routePreviewCoach')).toHaveCount(0);await cancelDrag(page);

  await page.locator('#menuButton').click();await page.locator('[data-route-preview="off"]').click();await expect(page.locator('[data-route-preview="off"]')).toHaveAttribute('aria-pressed','true');await page.locator('#closeMenu').click();const callsBefore=await page.evaluate(()=>window.__routePreviewCalls);
  await beginCandidateDrag(page);await expect(page.locator('.routePreviewSvg')).toHaveCount(0);expect(await page.evaluate(()=>window.__routePreviewCalls)).toBe(callsBefore);await cancelDrag(page)
});

test('automatic assistance steps down to Preview after the first three Classic rounds',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4173/');await page.evaluate(()=>{window.__routePreviewGame.state().round=3});await page.locator('#menuButton').click();await expect(page.locator('[data-route-preview="preview"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#routePreviewHelp')).toContainText('Automatic')
});
