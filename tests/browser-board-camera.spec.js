const {test,expect}=require('@playwright/test');
const BASE='http://127.0.0.1:4173/';

test('late Endless board supports pinch, pan and cell-relative Mod labels without mutating the run',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(`${BASE}?qa=infinite16&ci=1`);
  await expect(page.locator('.app')).toBeVisible({timeout:12000});
  await expect.poll(()=>page.evaluate(()=>!!window.MonoidBoardCamera)).toBe(true);
  const before=await page.evaluate(()=>JSON.stringify(window.__monoidGame.exportState()));
  const label=page.locator('#board .piece:has(.tileModMark)').first();
  const geometry=await label.evaluate(piece=>{const p=piece.getBoundingClientRect(),mark=piece.querySelector('.tileModMark');return{short:Math.min(p.width,p.height),font:parseFloat(getComputedStyle(mark).fontSize),cell:parseFloat(getComputedStyle(piece.parentElement).getPropertyValue('--board-cell-px'))}});
  expect(geometry.font).toBeLessThan(geometry.short*.55);expect(geometry.font).toBeCloseTo(Math.max(3,Math.min(16,geometry.cell*.82)),1);

  await page.locator('.boardFrame').evaluate(frame=>{
    const fire=(type,id,x,y)=>frame.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:id,pointerType:'touch',clientX:x,clientY:y,buttons:type==='pointerup'?0:1}));
    const r=frame.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
    fire('pointerdown',1,x-30,y);fire('pointerdown',2,x+30,y);fire('pointermove',1,x-70,y);fire('pointermove',2,x+70,y);fire('pointerup',1,x-70,y);fire('pointerup',2,x+70,y)
  });
  await expect.poll(()=>page.evaluate(()=>window.MonoidBoardCamera.snapshot().scale)).toBeGreaterThan(1.8);
  const afterPinch=await page.evaluate(()=>window.MonoidBoardCamera.snapshot());
  await page.locator('#board').evaluate(board=>{
    const r=board.getBoundingClientRect(),fire=(type,x,y)=>board.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:7,pointerType:'touch',clientX:x,clientY:y,buttons:type==='pointerup'?0:1}));
    fire('pointerdown',r.left+8,r.top+8);fire('pointermove',r.left+38,r.top+28);fire('pointerup',r.left+38,r.top+28)
  });
  await expect.poll(()=>page.evaluate(()=>window.MonoidBoardCamera.snapshot().x)).not.toBeCloseTo(afterPinch.x,1);

  const cascade=await page.evaluate(()=>{const camera=window.MonoidBoardCamera,pieces=window.__monoidGame.state().pieces;camera.set({scale:3,x:0,y:0},false);const events=[{type:'signal-fork',piece:pieces[0].id},...pieces.map(piece=>({type:'op',piece:piece.id}))];const focused=camera.beginCascade(events),during=camera.snapshot();camera.endCascade();return{focused,during,after:camera.snapshot()}});
  expect(cascade.focused).toBe(true);expect(cascade.during.scale).toBeLessThan(3);expect(cascade.after.scale).toBe(3);
  expect(await page.evaluate(()=>JSON.stringify(window.__monoidGame.exportState()))).toBe(before);
});

test('debug export exposes calculation and animation telemetry sections',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.addInitScript(()=>{
    Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.__cameraDebug=await data.files[0].text()}})
  });await page.goto(`${BASE}?qa=infinite16&ci=1`);await expect(page.locator('.app')).toBeVisible({timeout:12000});
  await page.locator('#menuButton').click();await page.locator('#copyrun').click();await expect.poll(()=>page.evaluate(()=>window.__cameraDebug||'')).toContain('PERFORMANCE TELEMETRY');expect(await page.evaluate(()=>window.__cameraDebug)).toContain('No recorded placements this session.');
});
