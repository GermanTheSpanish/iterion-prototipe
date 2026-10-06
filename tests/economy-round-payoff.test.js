const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),root=path.join(__dirname,'..');
const ui=fs.readFileSync(path.join(root,'ui.js'),'utf8');
const css=fs.readFileSync(path.join(root,'ui-theme.css'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const runtime=fs.readFileSync(path.join(root,'ui-runtime-fixes.js'),'utf8');
const late=fs.readFileSync(path.join(root,'ui-late-polish.js'),'utf8');

assert.match(index,/id="shopButton"[^>]*>TILE SHOP/,'Primary commerce CTA must say TILE SHOP');
assert.doesNotMatch(index,/>Coins\s*</,'Run menu must not label the balance as Coins');
assert.match(index,/class="currencyMark"/,'Initial economy UI must expose the MONOID currency mark');
assert.match(runtime,/TILE SHOP<small><span class="currencyAmount"/,'Runtime UI sync must preserve TILE SHOP and the currency mark');
assert.match(ui,/GAME\.canOpenShop\(\{allowUnaffordable:true\}\)/,'Tile Shop must stay tappable when stock exists but funds are insufficient');
assert.match(ui,/TILE SHOP CLOSED/);assert.match(ui,/INSUFFICIENT FUNDS/);
assert.doesNotMatch(late,/NOT ENOUGH COINS/);

assert.match(css,/\.currencyMark\{[^}]*border:[^}]*solid currentColor[^}]*border-radius:50%/,'Currency mark needs a circular token');
assert.match(css,/\.currencyMark::before\{[^}]*border-radius:50%[^}]*background:currentColor/,'Currency mark needs a central pip');
assert.match(css,/\.currencyMark::after\{[^}]*left:50%[^}]*width:1\.5px[^}]*height:1\.2em[^}]*background:currentColor/,'Currency mark needs a vertical strike through the pip');
assert.match(css,/roundRewardCascade/,'Round reward sources need cascade-like reveal timing');
assert.match(css,/prefers-reduced-motion:reduce[^}]*[\s\S]*roundRewardRow/,'Round reward motion needs a reduced-motion fallback');

assert.match(ui,/overlayTitle\.textContent=complete\?'CLASSIC COMPLETE':'ROUND COMPLETE'/,'Normal clears must say ROUND COMPLETE while final Classic completion stays distinct');
assert.match(ui,/function roundIncomeBreakdown/);
assert.match(ui,/label:'ROUND'/);assert.match(ui,/label:'QUICK CLEAR'/);assert.match(ui,/label:'EXACT TARGET'/);assert.match(ui,/label:'★ ACTIVATIONS'/);assert.match(ui,/label:'MINT'/);
assert.match(ui,/rewardBreakdown/,'Round payoff must read authoritative reward data rather than recalculate gameplay reward rules');
assert.match(ui,/event\.type==='mint-coins'/,'Mint must be explained from the authoritative event log');
assert.match(ui,/roundRewardInline/,'Post-cascade summary must expose earned funds before the result overlay');
assert.match(ui,/ROUND_REWARD_PREVIEW_MS/);
console.log('MONOID economy symbol and round payoff presentation regressions passed');
