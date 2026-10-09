const{test,expect}=require('@playwright/test');

test('fresh opening protects [0|0] and reserve count tracks only undrawn tiles',async({page})=>{
  await page.addInitScript(()=>{localStorage.setItem('monoid.profileContext.v1','fresh');localStorage.setItem('iterion.entryBypass.v1','true');localStorage.setItem('monoid.ctx.fresh.monoid.firstRunBriefing.v1','seen')});
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4173/');
  await expect.poll(()=>page.evaluate(()=>window.__monoidGame?.state().hand?.length)).toBeGreaterThan(0);
  const first=await page.evaluate(()=>{const game=window.__monoidGame,s=game.state();return{protected:game.config.AVOID_ZERO_DOUBLE_FIRST_HAND,first:s.hand[0],ids:s.hand.map(t=>t?.id),reserve:s.reserve.map(t=>t.id),turn:s.turn}});
  expect(first.protected).toBe(true);expect(first.first.a).toBe(first.first.b);expect(first.first.a).not.toBe(0);
  expect(first.ids).not.toContain('d0-0');expect(first.reserve).toContain('d0-0');
  await expect(page.locator('#handReserveCount')).toBeVisible();
  await expect(page.locator('#tilesleft')).toHaveText(String(first.reserve.length));
  const header=await page.evaluate(()=>{
    const hand=document.querySelector('.handHeader'),label=hand.querySelector('.label').getBoundingClientRect(),count=hand.querySelector('#handReserveCount').getBoundingClientRect(),bar=hand.getBoundingClientRect();
    return{center:label.x+label.width/2,expected:bar.x+bar.width/2,right:count.right,limit:bar.right}
  });
  expect(Math.abs(header.center-header.expected)).toBeLessThan(2);expect(header.right).toBeLessThanOrEqual(header.limit+1);
  const all=[...first.ids,...first.reserve];expect(new Set(all).size).toBe(all.length);
  await page.locator('#menuButton').click();page.once('dialog',dialog=>dialog.accept());await page.locator('#reset').click();
  await expect.poll(()=>page.evaluate(()=>window.__monoidGame.config.AVOID_ZERO_DOUBLE_FIRST_HAND)).toBe(false);
  await expect(page.locator('#tilesleft')).toHaveText(String(await page.evaluate(()=>window.__monoidGame.state().reserve.length)));
  expect(await page.evaluate(()=>localStorage.getItem('monoid.ctx.fresh.monoid.firstRealOpening.v1'))).toBe('done');
});

test('remote carousel dominoes never paint through hidden slides, even during rapid changes',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('iterion.entryBypass.v1','false'));
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4173/');
  await page.locator('#titleCard').click();
  await expect(page.locator('#modeCarouselViewport')).toBeVisible();
  const verify=async()=>{
    const result=await page.evaluate(()=>[...document.querySelectorAll('#modeCarouselViewport .modeSlide.isRemote')].map(slide=>({
      slide:getComputedStyle(slide).visibility,
      tile:getComputedStyle(slide.querySelector('.modeTile')).visibility
    })));
    expect(result.length).toBeGreaterThan(0);
    for(const entry of result){expect(entry.slide).toBe('hidden');expect(entry.tile).toBe('hidden')}
  };
  await verify();
  for(let i=0;i<12;i++){
    await page.evaluate(i=>window.__monoidModes.select(i%8));
    await verify()
  }
  const viewport=page.locator('#modeCarouselFrame');
  await viewport.press('ArrowRight');await verify();
  await viewport.press('ArrowLeft');await verify();
});

test('Round Complete TOTAL stays next to its reward and general guidance starts above the board midpoint',async({page})=>{
  await page.setViewportSize({width:375,height:667});await page.goto('http://127.0.0.1:4173/');
  const style=await page.evaluate(()=>{
    const coach=document.querySelector('#monoidBoardCoach');
    coach.hidden=false;coach.className='boardCoachLayer classicGuide';coach.innerHTML='<div class="boardCoachCard"><h2>GUIDE</h2><p>Connect matching tiles.</p></div>';
    const board=document.getElementById('board').getBoundingClientRect();Object.assign(coach.style,{left:board.left+'px',top:board.top+'px',width:board.width+'px',height:board.height+'px'});
    const card=coach.querySelector('.boardCoachCard').getBoundingClientRect();
    return{align:getComputedStyle(coach).alignItems,top:card.top,boardTop:board.top,bottom:card.bottom,boardMid:board.top+board.height/2}
  });
  expect(style.align).toBe('flex-start');expect(style.top).toBeGreaterThanOrEqual(style.boardTop-1);expect(style.bottom).toBeLessThan(style.boardMid);
  const reward=await page.evaluate(()=>{
    const wrap=document.createElement('div');wrap.className='roundReward';
    wrap.innerHTML='<div class="roundRewardTotal"><span>TOTAL</span><strong><span class="currencyAmount">+4</span></strong></div>';
    document.body.appendChild(wrap);
    const label=wrap.querySelector('.roundRewardTotal>span'),value=wrap.querySelector('.roundRewardTotal>strong');
    const root=wrap.querySelector('.roundRewardTotal').getBoundingClientRect(),a=label.getBoundingClientRect(),b=value.getBoundingClientRect();
    const out={gap:b.left-a.right,right:root.right-b.right,font:parseFloat(getComputedStyle(label).fontSize),leader:wrap.querySelector('.roundRewardLeader')};
    wrap.remove();return out
  });
  expect(reward.gap).toBeLessThan(22);expect(reward.right).toBeLessThan(2);expect(reward.font).toBeGreaterThanOrEqual(14);expect(reward.leader).toBeNull();
});
