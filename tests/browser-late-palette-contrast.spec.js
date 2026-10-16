const {test,expect}=require('@playwright/test');
const BASE='http://127.0.0.1:4173/';
const rgb=value=>(String(value).match(/[\d.]+/g)||[]).slice(0,3).map(Number);
function contrast(foreground,background){
  const lum=value=>rgb(value).map(n=>{const v=n/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4})
    .reduce((sum,channel,index)=>sum+channel*[.2126,.7152,.0722][index],0);
  const a=lum(foreground),b=lum(background);
  return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
}

test('leaving Endless/Infinite resets Game Selection contrast and palette',async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});
  for(const fixture of ['german9Endless','infinite16']){
    await page.goto(BASE+'?qa='+fixture+'&ci=1');
    await expect(page.locator('.app')).toBeVisible({timeout:12000});
    await expect.poll(()=>page.evaluate(()=>document.body.classList.contains('endlessPalette'))).toBe(true);
    // Use the actual menu action; do not simulate removal of CSS classes.
    await page.evaluate(()=>document.getElementById('gameSelectionButton').click());
    await expect(page.locator('#gameSelection')).toBeVisible();
    const result=await page.evaluate(()=>{
      const entry=document.getElementById('entryFlow'),entryBg=getComputedStyle(entry).backgroundColor;
      const selectors=['#selectionTitle','.entryKicker','#modeName','#devBuildStamp','#startRun','#continueRun','#learnMonoid'];
      return{classes:[...document.body.classList],stageRound:document.body.dataset.stageRound,
        samples:selectors.map(selector=>{
          const el=document.querySelector(selector);
          if(!el||el.hidden||getComputedStyle(el).display==='none')return null;
          const style=getComputedStyle(el),container=selector==='#modeName'?document.getElementById('modeCarouselFrame'):el;
          let bg=getComputedStyle(container).backgroundColor;
          if(bg==='rgba(0, 0, 0, 0)')bg=entryBg;
          return{selector,foreground:style.color,background:bg,opacity:Number(style.opacity)};
        }).filter(Boolean),
        overflow:document.documentElement.scrollHeight>innerHeight||document.documentElement.scrollWidth>innerWidth};
    });
    for(const name of ['endlessPalette','infinitePalette','ouroborosPalette'])expect(result.classes).not.toContain(name);
    expect(result.stageRound).toBeUndefined();
    expect(result.samples.length).toBeGreaterThanOrEqual(5);
    for(const item of result.samples){
      let foreground=item.foreground;
      if(item.opacity<1){
        const f=rgb(foreground),b=rgb(item.background);
        foreground='rgb('+f.map((n,i)=>Math.round(n*item.opacity+b[i]*(1-item.opacity))).join(',')+')';
      }
      expect(contrast(foreground,item.background),fixture+' '+item.selector).toBeGreaterThanOrEqual(4.5);
    }
    expect(result.overflow).toBe(false);
    await page.screenshot({path:testInfo.outputPath('selection-from-'+fixture+'.png')});
  }
});

test('pale board and cascade labels use their own dark ink in all late palettes',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(BASE+'?qa=infinite16&ci=1');
  await expect(page.locator('.app')).toBeVisible({timeout:12000});
  const samples=await page.evaluate(()=>{
    const board=document.getElementById('board'),modal=document.querySelector('#overlay .modal');
    board.insertAdjacentHTML('beforeend',
      '<div id="contrastSignal" class="opfx signalValue add"><small>MAIN B</small><strong>26</strong><span>+10</span></div>'+
      '<div id="contrastIsland" class="islandPlacementHint">ISLAND</div>'+
      '<div id="contrastCore" class="opfx coreActivationFx">CORE +1</div>'+
      '<div id="contrastFinal" class="opfx finalfx"><span>26</span></div>');
    modal.insertAdjacentHTML('beforeend','<div id="contrastTrace" class="scoreTraceLine">MAIN B · +26</div>');
    const result={};
    for(const palette of ['endless','infinite','ouroboros']){
      document.body.classList.add('endlessPalette');
      document.body.classList.toggle('infinitePalette',palette==='infinite');
      document.body.classList.toggle('ouroborosPalette',palette==='ouroboros');
      result[palette]=[
        ['signal','#contrastSignal','#contrastSignal'],
        ['signalNumber','#contrastSignal strong','#contrastSignal'],
        ['island','#contrastIsland','#contrastIsland'],
        ['core','#contrastCore','#contrastCore'],
        ['final','#contrastFinal','#contrastFinal'],
        ['trace','#contrastTrace','#overlay .modal']
      ].map(([name,selector,surface])=>({
        name,fg:getComputedStyle(document.querySelector(selector)).color,
        bg:getComputedStyle(document.querySelector(surface)).backgroundColor
      }));
    }
    return result;
  });
  for(const [palette,items] of Object.entries(samples))
    for(const item of items)
      expect(contrast(item.fg,item.bg),palette+' '+item.name+' '+item.fg+' on '+item.bg).toBeGreaterThanOrEqual(4.5);
});


test('selection stays light after subsequent inspector render for active late-game run',async({page},testInfo)=>{
  for(const [width,height] of [[390,844],[430,932]]){
    await page.setViewportSize({width,height});
    for(const fixture of ['german9Endless','infinite16']){
      await page.goto(BASE+'?qa='+fixture+'&ci=1');
      await expect(page.locator('.app')).toBeVisible({timeout:12000});
      await expect.poll(()=>page.evaluate(()=>document.body.classList.contains('endlessPalette'))).toBe(true);
      await page.evaluate(()=>document.getElementById('gameSelectionButton').click());
      await expect(page.locator('#gameSelection')).toBeVisible();
      await page.locator('#selectionTitle').click();
      await expect(page.locator('#overlayTitle')).toHaveText('MONOID');
      await page.locator('#overlayPrimary').click();
      await expect(page.locator('#gameSelection')).toBeVisible();
      await expect(page.locator('#overlay')).not.toHaveClass(/show/);
      const rendered=await page.evaluate(()=>{
        const entry=document.getElementById('entryFlow'),surface=getComputedStyle(entry).backgroundColor;
        const visible=['#selectionTitle','.entryKicker','#modeName','#modCollectionSelectionButton','#startRun','#continueRun','#learnMonoid'].map(selector=>{
          const el=document.querySelector(selector);
          if(!el||el.hidden||getComputedStyle(el).display==='none')return null;
          const cs=getComputedStyle(el);
          return{selector,fg:cs.color,bg:cs.backgroundColor==='rgba(0, 0, 0, 0)'?surface:cs.backgroundColor};
        }).filter(Boolean);
        return{palette:[...document.body.classList].filter(x=>/Palette$/.test(x)),
          stage:document.body.dataset.stageRound,visible};
      });
      expect(rendered.palette).toEqual([]);
      expect(rendered.stage).toBeUndefined();
      expect(rendered.visible.length).toBeGreaterThanOrEqual(5);
      for(const sample of rendered.visible)expect(contrast(sample.fg,sample.bg),fixture+' '+sample.selector).toBeGreaterThanOrEqual(4.5);
      await page.screenshot({path:testInfo.outputPath('selection-inspector-'+fixture+'-'+width+'.png')});
    }
  }
});

test('late-game cascade skip and progress labels are readable on their real surfaces',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(BASE+'?qa=infinite16&ci=1');
  await expect(page.locator('.app')).toBeVisible({timeout:12000});
  const samples=await page.evaluate(()=>{
    const hint=document.createElement('div');hint.className='cascadeSkipHint';hint.textContent='TAP SCREEN TO SKIP';
    document.getElementById('board').appendChild(hint);
    const styles={};
    for(const palette of ['endless','infinite','ouroboros']){
      document.body.classList.add('endlessPalette');
      document.body.classList.toggle('infinitePalette',palette==='infinite');
      document.body.classList.toggle('ouroborosPalette',palette==='ouroboros');
      const hc=getComputedStyle(hint),progress=document.querySelector('.scoreProgressNext'),pc=progress&&getComputedStyle(progress),bg=getComputedStyle(document.body).backgroundColor;
      styles[palette]={hint:{fg:hc.color,bg:hc.backgroundColor},progress:pc?{fg:pc.color,bg}:null};
    }
    return styles;
  });
  for(const [palette,data] of Object.entries(samples)){
    expect(contrast(data.hint.fg,data.hint.bg),palette+' skip label').toBeGreaterThanOrEqual(4.5);
    if(data.progress)expect(contrast(data.progress.fg,data.progress.bg),palette+' progress label').toBeGreaterThanOrEqual(4.5);
  }
});
