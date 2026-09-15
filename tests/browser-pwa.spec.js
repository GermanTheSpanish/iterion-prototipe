const {test,expect}=require('@playwright/test');

test('PWA shell exposes the manifest and registers a network-fresh service worker',async({page})=>{
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href',/manifest\.webmanifest$/);
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content','yes');
  expect(await page.evaluate(()=>window.__monoidPwa?.installed)).toBe(false);
  await expect.poll(()=>page.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration())),{timeout:10000}).toBe(true);
  const manifest=await page.evaluate(async()=>await (await fetch('manifest.webmanifest',{cache:'no-store'})).json());
  expect(manifest.display_override[0]).toBe('fullscreen');expect(manifest.display).toBe('standalone');
  expect(await page.evaluate(async()=>await caches.keys())).toEqual([])
});

test('installed mode intercepts Android-style Back and opens the run menu instead of leaving gameplay',async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('monoid.firstRunBriefing.v1','seen');
    const native=window.matchMedia.bind(window);window.matchMedia=query=>{
      if(query==='(display-mode: fullscreen)'||query==='(display-mode: standalone)')return{matches:true,media:query,onchange:null,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},dispatchEvent(){return false}};
      return native(query)
    }
  });
  await page.goto('http://127.0.0.1:4173/');await page.locator('#titleCard').click();await page.locator('#startRun').click();
  await expect.poll(()=>page.evaluate(()=>window.__monoidPwa?.installed)).toBe(true);
  await expect.poll(()=>page.evaluate(()=>!!history.state?.monoidBackGuardV1)).toBe(true);
  await page.evaluate(()=>history.back());
  await expect.poll(()=>page.locator('#gameMenu').evaluate(el=>el.open)).toBe(true);
  expect(await page.evaluate(()=>window.__monoidPwa.backIntercepts)).toBeGreaterThan(0)
});
