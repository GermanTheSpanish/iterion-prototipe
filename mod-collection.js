(function(root){
  'use strict';
  const doc=root.document,Mods=root.IterionMods;if(!doc||!Mods?.collection||root.__monoidModCollectionInstalled)return;
  root.__monoidModCollectionInstalled=true;
  const STORAGE_KEY='monoid.modCollection.v1';
  const P={0:[],1:[[50,50]],2:[[28,28],[72,72]],3:[[28,28],[50,50],[72,72]],4:[[28,28],[72,28],[28,72],[72,72]],5:[[28,28],[72,28],[50,50],[28,72],[72,72]],6:[[28,23],[72,23],[28,50],[72,50],[28,77],[72,77]]};
  const pips=value=>(P[value]||[]).map(([x,y])=>`<i style="left:${x}%;top:${y}%"></i>`).join('');
  function savedIds(){try{const value=JSON.parse(root.localStorage?.getItem(STORAGE_KEY)||'[]');return Array.isArray(value)?value.filter(id=>typeof id==='string'):[]}catch(_){return[]}}
  function unlockedIds(){const ids=new Set(savedIds());for(const slot of Mods.collection())if(slot.mod?.collectionDefaultUnlocked)ids.add(slot.mod.id);return ids}
  function persist(ids){try{root.localStorage?.setItem(STORAGE_KEY,JSON.stringify([...ids].sort()))}catch(_){}return ids}
  function state(){const slots=Mods.collection(),unlocked=unlockedIds();return Object.freeze({slots,unlocked:Object.freeze([...unlocked]),count:slots.filter(slot=>slot.mod&&unlocked.has(slot.mod.id)).length,total:slots.length})}

  const style=doc.createElement('style');style.id='monoidModCollectionStyles';style.textContent=`
#modCollectionDialog{position:fixed;inset:0;width:100vw;max-width:none;height:100dvh;max-height:none;margin:0;padding:calc(12px + env(safe-area-inset-top)) 12px calc(10px + env(safe-area-inset-bottom));border:0;border-radius:0;background:var(--bg);color:var(--ink);overflow:hidden}
#modCollectionDialog[open]{display:grid;grid-template-rows:44px 30px minmax(0,1fr) 64px;gap:6px}
#modCollectionDialog::backdrop{background:var(--bg)}
.modCollectionHead{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line)}
.modCollectionHead h2{margin:0;font-size:18px;font-weight:760;letter-spacing:.1em}
.modCollectionClose{width:44px;height:44px;padding:0;border:0;background:transparent;color:inherit;font-size:26px;line-height:1}
.modCollectionProgress{display:flex;align-items:center;justify-content:space-between;color:var(--muted);font-size:10px;font-weight:760;letter-spacing:.1em}
.modCollectionProgress strong{color:var(--ink);font-size:12px}
.modCollectionGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-template-rows:repeat(7,minmax(0,1fr));gap:4px 6px;min-height:0}
.modCollectionCell{display:grid;place-items:center;min-width:0;min-height:0;padding:1px;border:0;background:transparent;color:inherit}
.modCollectionCell:focus-visible{outline:1px solid var(--ink);outline-offset:-1px}
.collectionDomino{position:relative;display:flex;flex-direction:column;width:clamp(27px,9.2vw,38px);height:clamp(52px,18.4vw,74px);max-height:100%;border:1.5px solid #1d1d1d;border-radius:5px;background:#fbf8f0;overflow:hidden;box-shadow:var(--tile-shadow)}
.collectionHalf{position:relative;flex:1;min-height:0}
.collectionHalf+.collectionHalf{border-top:1px solid #1d1d1d}
.collectionPips{position:absolute;inset:16%}.collectionPips i{position:absolute;width:4px;height:4px;border-radius:50%;background:#111;transform:translate(-50%,-50%)}
.modCollectionCell.isUnlocked .collectionDomino{background:#11110f;border-color:#2e2e2a;transform:rotateY(180deg)}
.modCollectionCell.isUnlocked .collectionHalf{opacity:0}.modCollectionCell.isUnlocked .collectionHalf+.collectionHalf{border:0}
.collectionModCode{position:absolute;inset:0;z-index:2;display:grid;grid-template-rows:1fr 1fr;color:rgba(255,255,255,.92);font:950 clamp(15px,5vw,21px)/.8 -apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif;letter-spacing:-.06em;transform:rotateY(180deg)}
.collectionModCode span{display:flex;align-items:center;justify-content:center}
.modCollectionCell.justUnlocked .collectionDomino{animation:collectionFlip .52s cubic-bezier(.2,.72,.2,1)}
.modCollectionInfo{min-height:64px;padding:8px 10px;border-top:1px solid var(--line);text-align:left;overflow:hidden}
.modCollectionInfo strong{display:block;font-size:12px;letter-spacing:.08em}.modCollectionInfo span{display:block;margin-top:4px;color:var(--muted);font-size:11px;line-height:1.3}
.modCollectionAccess{letter-spacing:.08em}
@keyframes collectionFlip{0%{transform:rotateY(0)}55%,100%{transform:rotateY(180deg)}}
@media(max-height:700px){#modCollectionDialog{padding-top:calc(7px + env(safe-area-inset-top));padding-bottom:calc(7px + env(safe-area-inset-bottom))}#modCollectionDialog[open]{grid-template-rows:40px 24px minmax(0,1fr) 56px;gap:3px}.modCollectionHead{min-height:40px}.modCollectionClose{height:40px}.collectionDomino{width:28px;height:54px}.modCollectionGrid{gap:2px 5px}.modCollectionInfo{min-height:56px;padding:6px 8px}.modCollectionInfo span{font-size:10px}}
@media(prefers-reduced-motion:reduce){.modCollectionCell.justUnlocked .collectionDomino{animation:none}}
`;doc.head.appendChild(style);

  const dialog=doc.createElement('dialog');dialog.id='modCollectionDialog';dialog.setAttribute('aria-labelledby','modCollectionTitle');dialog.innerHTML='<header class="modCollectionHead"><h2 id="modCollectionTitle">MOD COLLECTION</h2><button class="modCollectionClose" type="button" aria-label="Close Mod Collection">×</button></header><div class="modCollectionProgress"><span>DOUBLE-SIX ARCHIVE</span><strong>0/28</strong></div><div class="modCollectionGrid" aria-label="The 28 canonical dominoes"></div><div class="modCollectionInfo" aria-live="polite"><strong>SELECT A DOMINO</strong><span>Reversed dominoes contain discovered Mods.</span></div>';doc.body.appendChild(dialog);
  const grid=dialog.querySelector('.modCollectionGrid'),progress=dialog.querySelector('.modCollectionProgress strong'),info=dialog.querySelector('.modCollectionInfo');
  let returnFocus=null,lastUnlocked=null;
  function codeMarkup(code){const value=String(code||'??').padEnd(2,'?').slice(0,2);return`<i class="collectionModCode" aria-hidden="true"><span>${value[0]}</span><span>${value[1]}</span></i>`}
  function render(){const current=state(),unlocked=new Set(current.unlocked);progress.textContent=`${current.count}/${current.total}`;grid.replaceChildren();for(const slot of current.slots){const isUnlocked=!!slot.mod&&unlocked.has(slot.mod.id),button=doc.createElement('button');button.type='button';button.className=`modCollectionCell ${isUnlocked?'isUnlocked':'isLocked'}${slot.mod?.id===lastUnlocked?' justUnlocked':''}`;button.dataset.domino=slot.key;if(slot.mod)button.dataset.modId=slot.mod.id;button.setAttribute('aria-label',isUnlocked?`${slot.mod.displayName}, collection domino ${slot.key}, discovered`:`Collection domino ${slot.key}, undiscovered`);button.innerHTML=`<span class="collectionDomino" aria-hidden="true"><span class="collectionHalf"><span class="collectionPips">${pips(slot.a)}</span></span><span class="collectionHalf"><span class="collectionPips">${pips(slot.b)}</span></span>${isUnlocked?codeMarkup(slot.mod.collectionCode):''}</span>`;button.addEventListener('click',()=>showInfo(slot,isUnlocked));grid.appendChild(button)}lastUnlocked=null;syncAccess(current)}
  function showInfo(slot,isUnlocked){if(isUnlocked){info.querySelector('strong').textContent=`[${slot.key}] · ${slot.mod.displayName}`;info.querySelector('span').textContent=slot.mod.shortDescription}else{info.querySelector('strong').textContent=`[${slot.key}] · UNDISCOVERED`;info.querySelector('span').textContent='This domino will turn over when its Mod is discovered.'}}
  function syncAccess(current=state()){const label=`MODS · ${current.count}/${current.total}`;for(const button of doc.querySelectorAll('[data-mod-collection-open]'))button.textContent=label}
  function open(trigger){returnFocus=trigger||doc.activeElement;const menu=doc.getElementById('gameMenu');if(menu?.open)menu.close();render();if(!dialog.open)dialog.showModal();dialog.querySelector('.modCollectionClose').focus()}
  function close(){if(dialog.open)dialog.close()}
  function unlock(id){const slot=Mods.collection().find(item=>item.mod?.id===id);if(!slot)return Object.freeze({ok:false,reason:'unknown-mod'});const ids=unlockedIds();if(ids.has(id))return Object.freeze({ok:true,alreadyUnlocked:true});ids.add(id);persist(ids);lastUnlocked=id;render();if(dialog.open)grid.querySelector(`[data-mod-id="${id}"]`)?.focus();root.dispatchEvent(new CustomEvent('monoid:mod-unlocked',{detail:{id,domino:slot.key}}));return Object.freeze({ok:true,domino:slot.key})}
  function installAccess(){const selection=doc.getElementById('gameSelection'),firstRun=doc.getElementById('firstRunChoice');if(selection&&!doc.getElementById('modCollectionSelectionButton')){const button=doc.createElement('button');button.id='modCollectionSelectionButton';button.type='button';button.className='entrySecondary modCollectionAccess';button.dataset.modCollectionOpen='selection';button.addEventListener('click',()=>open(button));selection.insertBefore(button,firstRun||doc.getElementById('startRun'))}const menu=doc.getElementById('gameMenu'),gameSelection=doc.getElementById('gameSelectionButton');if(menu&&!doc.getElementById('modCollectionMenuButton')){const button=doc.createElement('button');button.id='modCollectionMenuButton';button.type='button';button.className='menuAction modCollectionAccess';button.dataset.modCollectionOpen='menu';button.addEventListener('click',()=>open(button));menu.insertBefore(button,gameSelection)}syncAccess()}
  dialog.querySelector('.modCollectionClose').addEventListener('click',close);dialog.addEventListener('close',()=>{const target=returnFocus;returnFocus=null;if(target?.isConnected)target.focus()});dialog.addEventListener('click',event=>{if(event.target===dialog)close()});
  installAccess();
  root.MonoidModCollection=Object.freeze({STORAGE_KEY,state,open,close,unlock,render});
})(window);
