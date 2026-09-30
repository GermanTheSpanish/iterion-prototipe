const {test,expect}=require('@playwright/test');

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('iterion.entryBypass.v1','true');
    localStorage.removeItem('iterion.routePreview.v1');
    let api;
    Object.defineProperty(window,'IterionGame',{configurable:true,get:()=>api,set:value=>{
      api={...value,createGame(E,options){
        const g=value.createGame(E,{...options,seed:54001,TARGETS:Array(15).fill(Number.MAX_SAFE_INTEGER)}),s=g.state(),root=s.set.find(tile=>tile.id==='d2-2'),next=s.set.find(tile=>tile.id==='d2-3'),rootPiece=E.pieceFrom(root,7,10,0,0,1);
        rootPiece.tile={...root};const pieces=[rootPiece];
        for(const id of ['d2-4','d2-5']){
          const tile=s.set.find(item=>item.id===id),placements=E.allPlacements(tile,0,pieces).filter(placement=>(placement.contacts||[]).some(group=>group.piece.id===rootPiece.id)&&(placement.contacts||[]).every(group=>group.piece.id===rootPiece.id)),placement=placements[0];
          if(!placement)continue;const piece=E.pieceFrom(tile,placement.x,placement.y,0,placement.rr,pieces.length+1);piece.tile={...tile};pieces.push(piece)
        }
        s.pieces=pieces;s.placedTileIds=pieces.map(piece=>piece.tile.id);s.idc=pieces.length;s.turn=pieces.length;s.roundTurn=pieces.length;s.anchorId=root.id;s.hand=[next,null,null,null,null];s.reserve=s.set.filter(tile=>!s.placedTileIds.includes(tile.id)&&tile.id!==next.id);s.running=false;s.cleared=false;s.blocked=false;s.needsReroll=false;s.failureReason=null;s.shopOpen=false;s.pendingCircuit=null;s.pendingModPlacement=null;
        const preview=g.previewPlacement.bind(g);window.__routePreviewCalls=0;g.previewPlacement=(...args)=>{window.__routePreviewCalls++;return preview(...args)};
        const candidates=g.candidatesForIndex(0);window.__routePreviewCandidate=candidates.find(candidate=>{const valid=E.validatePlacement(next,candidate.x,candidate.y,0,candidate.rr,s.pieces);return valid.ok&&(valid.contacts||[]).some(group=>group.piece.id===rootPiece.id)})||candidates[0];window.__routePreviewGame=g;return g
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
  expect(await page.locator('.routePreviewJunctionRing').count()).toBeGreaterThan(0);expect(await page.locator('.piece.routePreviewDim').count()).toBeGreaterThan(0);expect(await page.locator('.piece.routePreviewActiveTile').count()).toBeGreaterThan(0);await expect(page.locator('.routePreviewRule')).toContainText('MORE TILE PASSES');await expect(page.locator('.routePreviewRule')).toContainText('HIGHER OUTPUT');
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

test('Full route guidance stays contained on the compact mobile fixture',async({page})=>{
  await page.setViewportSize({width:375,height:667});await page.goto('http://127.0.0.1:4173/');await beginCandidateDrag(page);
  await expect(page.locator('.routePreviewStart')).toBeVisible();await expect(page.locator('.routePreviewEnd').first()).toBeVisible();await expect(page.locator('.routePreviewRule')).toBeVisible();
  const contained=await page.evaluate(()=>{const board=document.querySelector('#board').getBoundingClientRect(),rule=document.querySelector('.routePreviewRule').getBoundingClientRect(),start=document.querySelector('.routePreviewStart').getBoundingClientRect(),end=document.querySelector('.routePreviewEnd').getBoundingClientRect();const candidate=document.querySelector('.dragCandidate').getBoundingClientRect(),startClear=start.bottom<=candidate.top||start.top>=candidate.bottom||start.right<=candidate.left||start.left>=candidate.right;return{rule:rule.left>=board.left&&rule.right<=board.right&&rule.top>=board.top&&rule.bottom<=board.bottom,endpoints:[start,end].every(rect=>rect.left>=board.left&&rect.right<=board.right&&rect.top>=board.top&&rect.bottom<=board.bottom),startClear,pageFits:document.documentElement.scrollWidth<=window.innerWidth}});
  expect(contained.rule).toBe(true);expect(contained.endpoints).toBe(true);expect(contained.startClear).toBe(true);expect(contained.pageFits).toBe(true);await page.screenshot({path:'test-results/route-preview-clarity-375x667.png',fullPage:true});await cancelDrag(page)
});

test('automatic assistance steps down to Preview after the first three Classic rounds',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4173/');await page.evaluate(()=>{window.__routePreviewGame.state().round=3});await page.locator('#menuButton').click();await expect(page.locator('[data-route-preview="preview"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#routePreviewHelp')).toContainText('Automatic')
});
