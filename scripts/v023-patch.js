const fs=require('fs');

function read(path){return fs.readFileSync(path,'utf8')}
function write(path,text){fs.writeFileSync(path,text);console.log(`patched ${path}`)}
function replaceOnce(text,from,to,label){
  if(text.includes(to))return text;
  if(!text.includes(from))throw new Error(`Patch target not found: ${label}`);
  return text.replace(from,to)
}

// Keep Market tile mods re-rollable across later Markets, but only onto a different
// eligible physical tile already in the machine. Machine mods remain one-time buys.
{
  const path='game.js';let text=read(path);
  text=replaceOnce(text,
`  function marketModOwned(id){return s.mods.includes(id)}
  function marketTargetTiles(id){
    const placed=s.pieces.map(p=>s.set.find(t=>t.id===p.tile.id)||p.tile);
    if(id==='double-double'||id==='double-echo')return placed.filter(t=>isDouble(t)&&t.a>0);
    if(id==='zero-memory')return placed.filter(isZero);
    return []
  }`,
`  function marketModOwned(id){const mod=M.get(id);return mod?.target==='machine'&&s.mods.includes(id)}
  function marketTargetTiles(id){
    const placed=s.pieces.map(p=>s.set.find(t=>t.id===p.tile.id)||p.tile);
    const activeId=id==='double-double'?s.doubleDoubleTileId:id==='double-echo'?s.doubleEchoTileId:id==='zero-memory'?s.zeroMemoryTileId:null;
    if(id==='double-double'||id==='double-echo')return placed.filter(t=>isDouble(t)&&t.a>0&&t.id!==activeId);
    if(id==='zero-memory')return placed.filter(t=>isZero(t)&&t.id!==activeId);
    return []
  }`,
  'Market board-only target pools');
  write(path,text);
}

// Present the new Market as three build choices and expose tile-mod state on pieces.
{
  const path='ui.js';let text=read(path);
  text=replaceOnce(text,
`  function doubleDoubleMark(t){return t?.id&&GAME.state().doubleDoubleTileId===t.id?'<i class="doubleDoubleMark" aria-hidden="true">DD</i>':''}
  function mini(t,fx='normal'){const cls=fx==='back'?' back':fx==='reveal'?' reveal':'',mark=fx==='back'?'':upgradeDot(t)+doubleDoubleMark(t);return\`<div class="domino\${cls}"><div class="half"><div class="spips">\${dots(t?.a??0,true)}</div></div><div class="half"><div class="spips">\${dots(t?.b??0,true)}</div></div>\${mark}</div>\`}
  function ordered(p){return[...p.cubes].sort((a,b)=>p.axis==='H'?a.x-b.x:a.y-b.y)}
  function pieceEl(p,cls='piece'){const d=document.createElement('div');d.className=cls+' '+(p.axis==='H'?'h':'v');d.style.left=px(p.rect.minx);d.style.top=py(p.rect.miny);d.style.width=px(p.rect.maxx-p.rect.minx);d.style.height=py(p.rect.maxy-p.rect.miny);d.innerHTML=ordered(p).map(c=>\`<div class="cube"><div class="pips">\${dots(c.v)}</div></div>\`).join('')+upgradeDot(p.tile)+doubleDoubleMark(p.tile);return d}`,
`  function tileModMark(t){
    if(!t?.id)return'';const s=GAME.state(),tags=[];
    if(s.doubleDoubleTileId===t.id)tags.push('DD');
    if(s.doubleEchoTileId===t.id)tags.push('DE');
    if(s.zeroMemoryTileId===t.id)tags.push('ZM');
    return tags.length?\`<i class="doubleDoubleMark" aria-hidden="true">\${tags.join('·')}</i>\`:''
  }
  function mini(t,fx='normal'){const cls=fx==='back'?' back':fx==='reveal'?' reveal':'',mark=fx==='back'?'':upgradeDot(t)+tileModMark(t);return\`<div class="domino\${cls}"><div class="half"><div class="spips">\${dots(t?.a??0,true)}</div></div><div class="half"><div class="spips">\${dots(t?.b??0,true)}</div></div>\${mark}</div>\`}
  function ordered(p){return[...p.cubes].sort((a,b)=>p.axis==='H'?a.x-b.x:a.y-b.y)}
  function pieceEl(p,cls='piece'){const d=document.createElement('div');d.className=cls+' '+(p.axis==='H'?'h':'v');d.style.left=px(p.rect.minx);d.style.top=py(p.rect.miny);d.style.width=px(p.rect.maxx-p.rect.minx);d.style.height=py(p.rect.maxy-p.rect.miny);d.innerHTML=ordered(p).map(c=>\`<div class="cube"><div class="pips">\${dots(c.v)}</div></div>\`).join('')+upgradeDot(p.tile)+tileModMark(p.tile);return d}`,
  'tile mod markers');

  text=replaceOnce(text,
`    const stateRows=[starLabel,bestLabel,m.upgradeTier?'Only the highest star tier activated in a Move pays.':'Round-clearing overkill can add stars to this physical tile.'];`,
`    const starRule=m.longRunActive?\`Long Run: at \${D.LONG_RUN_UNIQUE_THRESHOLD||10}+ unique routed tiles, every activated star pays once.\`:m.upgradeTier?'Only the highest star tier activated in a Move pays.':'Round-clearing overkill can add stars to this physical tile.';
    const stateRows=[starLabel,bestLabel,starRule];`,
  'Long Run inspector rule');

  text=replaceOnce(text,
`purchases:x.turns.filter(e=>e.type==='shop-buy'||e.type==='tile-buy'||e.type==='double-double').length`,
`purchases:x.turns.filter(e=>e.type==='shop-buy'||e.type==='tile-buy'||e.type==='market-mod-buy').length`,
  'Market purchases in run summary');

  const marketRe=/  function showMarket\(\)\{[\s\S]*?\n  \}\n\n  function showNoMoves\(\)\{/;
  if(!text.includes('data-market-mod')){
    if(!marketRe.test(text))throw new Error('Patch target not found: showMarket');
    const replacement=`  function showMarket(){
    resetOverlay();const s=GAME.state(),x=GAME.snapshot(),nextStage=x.stage.index+1,nextSize=D.BOARD_SIZES[Math.min(nextStage-1,D.BOARD_SIZES.length-1)];
    overlayTitle.textContent='MARKET';
    const supply=x.availableTileCount,nextMarket=x.round.index<D.TOTAL_ROUNDS-(D.STAGE_SIZE||3)?\`Next Market in \${D.STAGE_SIZE||3} rounds\`:'Final stage · no later Market';
    const offers=x.shop.offers||[],locked=(x.shop.marketBuys||[]).length>=(x.shop.purchaseLimit||1);
    const active=[x.doubleDouble?\`DD [\${x.doubleDouble.a}|\${x.doubleDouble.b}]\`:null,x.doubleEcho?\`DE [\${x.doubleEcho.a}|\${x.doubleEcho.b}]\`:null,x.zeroMemory?\`ZM [\${x.zeroMemory.a}|\${x.zeroMemory.b}]\`:null,x.longRun?'LONG RUN':null].filter(Boolean).join(' · ')||'None';
    const offerHtml=offers.length?offers.map(id=>{const info=GAME.marketOfferInfo(id),mod=M.get(id),target=mod.target==='machine'?'Machine modifier':\`\${info.targetCount} eligible placed tile\${info.targetCount===1?'':'s'}\`;return\`<div class="marketDesc"><strong>\${escapeHtml(mod.displayName)} · \${info.price}c</strong><span>\${escapeHtml(mod.shortDescription)}</span><p>\${escapeHtml(mod.rulesDescription)}</p><div class="shopFoot">\${escapeHtml(target)}</div><button class="shopBuy" data-market-mod="\${id}">BUY \${escapeHtml(mod.displayName)}</button></div>\`}).join(''):'<p class="inspectEmpty">No eligible Market modifiers for the current machine.</p>';
    overlayBody.innerHTML=\`<div class="bigShop"><div class="shopHero"><div><div class="label">Stage \${x.stage.index} complete</div><strong>\${s.coins}c</strong><div class="shopInflation">Inflation \${s.inflation}</div><div class="shopSupply">SUPPLY \${supply} · \${nextMarket}</div></div><div class="label">Next board<br>\${nextSize[0]} × \${nextSize[1]}</div></div><div class="shopSection"><h3>CHOOSE ONE MOD</h3><p>Three build-changing offers. You may buy at most one in this Market.</p><div class="marketDescriptions">\${offerHtml}</div><div class="shopFoot">Active: \${escapeHtml(active)}. Every purchase raises global Inflation by 1. Tile mods select a random eligible physical tile already in the machine.</div></div></div>\`;
    overlayBody.querySelectorAll('[data-market-mod]').forEach(b=>{const id=b.dataset.marketMod,info=GAME.marketOfferInfo(id);b.disabled=locked||!info.canBuy;b.onclick=()=>{const r=GAME.buyMarketMod(id);if(!r.ok){toast(r.reason==='coins'?'Not enough coins':r.reason==='limit'?'Market choice already used':'Modifier unavailable');return}GAME.save();const target=r.tile?\` → [\${r.tile.a}|\${r.tile.b}]\`:' acquired';toast(\`\${r.mod.displayName}\${target} · Inflation \${r.inflation}\`);render()}});
    if(locked){overlayBody.querySelectorAll('[data-market-mod]').forEach(b=>b.disabled=true)}
    overlayPrimary.textContent=\`CONTINUE TO STAGE \${nextStage}\`;overlayPrimary.onclick=()=>{GAME.closeMarket();GAME.save();advanceRound()}
  }

  function showNoMoves(){`;
    text=text.replace(marketRe,replacement)
  }
  write(path,text);
}

console.log('v0.23 integration patch complete');
