const {test,expect}=require('@playwright/test');
const BASE='http://127.0.0.1:4173/';

test('late Endless board camera keeps a fixed viewport, anchors pinch midpoint and caps Run 1 scale',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(`${BASE}?qa=infinite16&ci=1`);
  await expect(page.locator('.app')).toBeVisible({timeout:12000});
  await expect.poll(()=>page.evaluate(()=>!!window.MonoidBoardCamera)).toBe(true);
  const before=await page.evaluate(()=>JSON.stringify(window.__monoidGame.exportState()));
  const label=page.locator('#board .piece:has(.tileModMark)').first();
  const geometry=await label.evaluate(piece=>{const p=piece.getBoundingClientRect(),mark=piece.querySelector('.tileModMark');return{short:Math.min(p.width,p.height),font:parseFloat(getComputedStyle(mark).fontSize),cell:parseFloat(getComputedStyle(piece.parentElement).getPropertyValue('--board-cell-px'))}});
  expect(geometry.font).toBeLessThan(geometry.short*.55);expect(geometry.font).toBeCloseTo(Math.max(3,Math.min(16,geometry.cell*.82)),1);

  const baseline=await page.evaluate(()=>{
    const camera=window.MonoidBoardCamera,board=document.getElementById('board');
    camera.set({scale:1.1,x:14,y:-10},false);
    const viewport=camera.viewport(),br=board.getBoundingClientRect(),mid={x:viewport.left+viewport.width*.39,y:viewport.top+viewport.height*.43};
    return{viewport,mid,uv:{x:(mid.x-br.left)/br.width,y:(mid.y-br.top)/br.height},max:camera.snapshot().maxScale,clip:getComputedStyle(board).clipPath}
  });
  expect(baseline.max).toBeGreaterThan(1.1);
  expect(baseline.viewport.height).toBeGreaterThan(300);
  expect(baseline.clip).not.toBe('none');

  await page.locator('#board').evaluate((board,mid)=>{
    const fire=(type,id,x,y)=>board.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:id,pointerType:'touch',clientX:x,clientY:y,buttons:type==='pointerup'?0:1}));
    fire('pointerdown',1,mid.x-40,mid.y);fire('pointerdown',2,mid.x+40,mid.y);
    fire('pointermove',1,mid.x-60,mid.y);fire('pointermove',2,mid.x+60,mid.y);
    fire('pointerup',1,mid.x-60,mid.y);fire('pointerup',2,mid.x+60,mid.y)
  },baseline.mid);

  const afterPinch=await page.evaluate(mid=>{
    const camera=window.MonoidBoardCamera,board=document.getElementById('board'),br=board.getBoundingClientRect(),viewport=camera.viewport();
    return{camera:camera.snapshot(),viewport,clip:getComputedStyle(board).clipPath,uv:{x:(mid.x-br.left)/br.width,y:(mid.y-br.top)/br.height}}
  },baseline.mid);
  expect(afterPinch.camera.scale).toBeGreaterThan(1.2);
  expect(afterPinch.camera.scale).toBeLessThan(1.5);
  expect(afterPinch.camera.scale).toBeLessThanOrEqual(baseline.max+0.001);
  expect(afterPinch.uv.x).toBeCloseTo(baseline.uv.x,2);expect(afterPinch.uv.y).toBeCloseTo(baseline.uv.y,2);
  expect(afterPinch.viewport.left).toBeCloseTo(baseline.viewport.left,2);expect(afterPinch.viewport.top).toBeCloseTo(baseline.viewport.top,2);
  expect(afterPinch.viewport.width).toBeCloseTo(baseline.viewport.width,2);expect(afterPinch.viewport.height).toBeCloseTo(baseline.viewport.height,2);
  expect(afterPinch.clip).not.toBe('none');

  const cap=await page.evaluate(()=>{const camera=window.MonoidBoardCamera;camera.set({scale:99,x:0,y:0},false);return camera.snapshot()});
  expect(cap.scale).toBeCloseTo(cap.maxScale,4);

  const edge=await page.locator('#board').evaluate(board=>{
    const camera=window.MonoidBoardCamera,vr=camera.viewport(),x=vr.left+vr.width/2,y=vr.top+vr.height/2,fire=(type,cx)=>board.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:7,pointerType:'touch',clientX:cx,clientY:y,buttons:type==='pointerup'?0:1}));
    fire('pointerdown',x);fire('pointermove',x+1000);const atEdge=camera.snapshot().x;fire('pointermove',x+990);const reversed=camera.snapshot().x;fire('pointerup',x+990);return{atEdge,reversed}
  });
  expect(edge.atEdge).toBeGreaterThan(0);expect(edge.reversed).toBeLessThan(edge.atEdge);

  const cascade=await page.evaluate(()=>{const camera=window.MonoidBoardCamera,pieces=window.__monoidGame.state().pieces;camera.set({scale:camera.snapshot().maxScale,x:0,y:0},false);const start=camera.snapshot().scale,events=[{type:'signal-fork',piece:pieces[0].id},...pieces.map(piece=>({type:'op',piece:piece.id}))];const focused=camera.beginCascade(events),during=camera.snapshot();camera.endCascade();return{focused,start,during,after:camera.snapshot()}});
  expect(cascade.focused).toBe(true);expect(cascade.during.scale).toBeLessThan(cascade.start);expect(cascade.after.scale).toBeCloseTo(cascade.start,4);
  expect(await page.evaluate(()=>JSON.stringify(window.__monoidGame.exportState()))).toBe(before);
});
