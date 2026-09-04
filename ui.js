(function(){
  const E=window.IterionEngine,D=window.IterionData,M=window.IterionMods,GAME=window.IterionGame.createGame(E),ARROW=E.ARROW;
  const P={0:[],1:[[50,50]],2:[[28,28],[72,72]],3:[[28,28],[50,50],[72,72]],4:[[28,28],[72,28],[28,72],[72,72]],5:[[28,28],[72,28],[50,50],[28,72],[72,72]],6:[[28,23],[72,23],[28,50],[72,50],[28,77],[72,77]]};
  const $=id=>document.getElementById(id);
  const board=$('board'),scoreEl=$('score'),targetEl=$('target'),stageEl=$('stagestat'),roundEl=$('roundstat'),movesEl=$('moves'),tilesEl=$('tilesleft'),stageRoundEl=$('stageRound'),boardSizeEl=$('boardsize'),handEl=$('hand'),hint=$('hint'),rerollBtn=$('reroll'),rerollState=$('rerollState'),resetBtn=$('reset'),viewBtn=$('viewrun'),copyBtn=$('copyrun'),runlog=$('runlog'),toastEl=$('toast'),overlay=$('overlay'),overlayTitle=$('overlayTitle'),overlayBody=$('overlayBody'),overlayPrimary=$('overlayPrimary'),overlaySecondary=$('overlaySecondary'),overlayTertiary=$('overlayTertiary'),coinEl=$('coins'),versionEl=$('version');
  let viewRun=false,outcomeOverlayNotBefore=0,outcomeTimer=0,uiBusy=false,autoRerollQueued=false;
  let handFx=Array(D.HAND_SIZE).fill('normal');
  let drag={active:false,index:-1,tile:null,candidates:[],candidate:null,float:null,lastX:0,lastSign:0,switches:0,shakeStarted:0,lastRotate:0};
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const px=n=>n/E.G*100+'%',py=n=>n/E.H*100+'%';
  const fmt=n=>Number.isFinite(Number(n))?Number(n).toLocaleString('en-US'):`${n}`;
  document.title=`ITERION v${D.VERSION}`;versionEl.textContent=`v${D.VERSION} · ${D.TOTAL_ROUNDS} rounds`;

  function dots(n,s=false){return P[n].map(([x,y])=>`<i class="${s?'spip':'pip'}" style="left:${x}%;top:${y}%"></i>`).join('')}
  function tierFor(t){if(!t)return 0;if(t.upgrade)return Math.min(3,t.upgrade);const set=GAME.state().set||[],m=t.id?set.find(x=>x.id===t.id):null;return Math.min(3,m?.upgrade||0)}
  function upgradeDot(t){const tier=tierFor(t);return tier?`<i class="upgradeDot u${tier}" aria-hidden="true"></i>`:''}
  function mini(t,fx='normal'){const cls=fx==='back'?' back':fx==='reveal'?' reveal':'',mark=fx==='back'?'':upgradeDot(t);return`<div class="domino${cls}"><div class="half"><div class="spips">${dots(t?.a??0,true)}</div></div><div class="half"><div class="spips">${dots(t?.b??0,true)}</div></div>${mark}</div>`}
  function ordered(p){return[...p.cubes].sort((a,b)=>p.axis==='H'?a.x-b.x:a.y-b.y)}
  function pieceEl(p,cls='piece'){const d=document.createElement('div');d.className=cls+' '+(p.axis==='H'?'h':'v');d.style.left=px(p.rect.minx);d.style.top=py(p.rect.miny);d.style.width=px(p.rect.maxx-p.rect.minx);d.style.height=py(p.rect.maxy-p.rect.miny);d.innerHTML=ordered(p).map(c=>`<div class="cube"><div class="pips">${dots(c.v)}</div></div>`).join('')+upgradeDot(p.tile);return d}
  function toast(t){toastEl.textContent=t;toastEl.classList.add('show');setTimeout(()=>toastEl.classList.remove('show'),1300)}
  function boardMessage(text,ms=900){const d=document.createElement('div');d.className='boardMessage';d.textContent=text;board.appendChild(d);setTimeout(()=>d.remove(),ms)}

  function renderBoard(){
    const s=GAME.state();board.innerHTML='';board.style.setProperty('--cell-x',`${100/E.G}%`);board.style.setProperty('--cell-y',`${100/E.H}%`);
    s.pieces.forEach(p=>board.appendChild(pieceEl(p)));
    if(drag.active&&drag.candidate){const c=drag.candidate,p=E.pieceFrom(drag.tile,c.x,c.y,0,c.rr,-1);p.tile={...drag.tile};board.appendChild(pieceEl(p,'piece dragCandidate'))}
    board.classList.toggle('dragging',drag.active)
  }
  function renderHand(){
    const s=GAME.state();handEl.innerHTML='';
    const canGrade=!uiBusy&&!s.running&&!s.cleared&&!s.blocked&&!s.shopOpen&&!s.needsReroll;
    const mask=canGrade?GAME.legalHandMask():s.hand.map(Boolean);
    for(let i=0;i<D.HAND_SIZE;i++){
      const t=s.hand[i],slot=document.createElement('div');slot.className='handSlot';
      if(handFx[i]==='hidden'||(drag.active&&drag.index===i)){handEl.appendChild(slot);continue}
      if(handFx[i]==='back'){const shell=document.createElement('div');shell.innerHTML=mini(t||{a:0,b:0},'back');slot.appendChild(shell.firstChild);handEl.appendChild(slot);continue}
      if(t){const b=document.createElement('button');b.className='tile'+(mask[i]?'':' unplayable');b.disabled=!mask[i]||uiBusy;b.innerHTML=mini(t,handFx[i]);b.onpointerdown=e=>startDrag(e,i);slot.appendChild(b)}
      handEl.appendChild(slot)
    }
  }

  function hideOverlay(){overlay.className='overlay'}
  function resetOverlay(){overlay.className='overlay show';overlayPrimary.onclick=overlaySecondary.onclick=overlayTertiary.onclick=null;overlayPrimary.disabled=overlaySecondary.disabled=overlayTertiary.disabled=false;overlayPrimary.style.display='inline-block';overlaySecondary.style.display=overlayTertiary.style.display='none'}
  function clearOutcomeDelay(){outcomeOverlayNotBefore=0;if(outcomeTimer){clearTimeout(outcomeTimer);outcomeTimer=0}}
  function armOutcomeDelay(){clearOutcomeDelay();outcomeOverlayNotBefore=performance.now()+D.OUTCOME_SCREEN_DELAY_MS;outcomeTimer=setTimeout(()=>{outcomeTimer=0;render()},D.OUTCOME_SCREEN_DELAY_MS+25)}

  function runSummary(){
    const x=GAME.snapshot(),turns=x.turns.filter(e=>Number.isInteger(e.turn)),mvp=turns.reduce((b,e)=>!b||e.output>b.output?e:b,null);let addOps=0,multOps=0,rebounds=0;
    for(const e of turns){addOps+=(e.ops.match(/:\+/g)||[]).length;multOps+=(e.ops.match(/:×/g)||[]).length;rebounds+=e.rebounds||0}
    return{roundsCleared:x.round.clears.length,totalRounds:x.round.total,tilesPlayed:x.turnCount,bestOutput:x.score.best,mvpTile:mvp?{a:mvp.tile.a,b:mvp.tile.b,output:mvp.output,round:mvp.round,placement:mvp.roundTurn}:null,addOps,multOps,rebounds,rerolls:x.turns.filter(e=>e.type==='reroll').length,purchases:x.turns.filter(e=>e.type==='shop-buy'||e.type==='tile-buy').length,coins:x.coins,mods:x.mods,setSize:x.setSize,machine:x.board.length}
  }
  function summaryHtml(){const r=runSummary(),m=r.mvpTile,mods=r.mods.length?r.mods.map(id=>M.get(id)?.name||id).join(', '):'None';return`<div class="summary"><div class="sumCard wide"><div class="sumLabel">MVP TILE</div><div class="sumValue">${m?`[${m.a}|${m.b}] → ${fmt(m.output)}`:'—'}</div><div class="sumSmall">${m?`Best activation · Round ${m.round}, placement ${m.placement}`:'No placement yet'}</div></div><div class="sumCard"><div class="sumLabel">PROGRESS</div><div class="sumValue">${r.roundsCleared}/${r.totalRounds}</div><div class="sumSmall">Rounds cleared</div></div><div class="sumCard"><div class="sumLabel">MACHINE</div><div class="sumValue">${r.machine}</div><div class="sumSmall">${r.setSize} tiles in set</div></div><div class="sumCard wide"><div class="sumLabel">SCORE SOURCES</div><div class="sumValue">${r.multOps} multipliers · ${r.addOps} additions</div><div class="sumSmall">${r.rebounds} rebounds · Best ${fmt(r.bestOutput)}</div></div><div class="sumCard wide"><div class="sumLabel">BUILD</div><div class="sumValue">${r.coins} coins</div><div class="sumSmall">${mods} · ${r.rerolls} rerolls · ${r.purchases} purchases</div></div></div>`}

  function marketDescriptions(offers){return`<div class="marketIntro">${GAME.state().coins} coins · Choose one offer or skip.</div><div class="marketDescriptions">${offers.map(m=>`<div class="marketDesc"><strong>${m.name} · ${m.cost}c</strong><span>${m.description}</span></div>`).join('')}</div>`}
  function advanceRound(){
    const before=GAME.snapshot().stage.index;clearOutcomeDelay();const ok=GAME.advance();if(!ok){toast('Resolve the shop first');return}
    GAME.save();hideOverlay();handFx.fill('normal');autoRerollQueued=false;render();const after=GAME.snapshot().stage.index;if(after>before)toast(`STAGE ${after} · BOARD ${E.G}×${E.H}`)
  }
  function showClear(){
    resetOverlay();const s=GAME.state(),x=GAME.snapshot(),complete=x.status==='COMPLETE',last=s.wins[s.wins.length-1];
    overlayTitle.textContent=complete?'RUN COMPLETE':'ROUND CLEAR';
    overlayBody.innerHTML=complete?`<p>Final output ${fmt(s.score)} · Target ${fmt(GAME.target())}</p>${summaryHtml()}`:`<p>Output ${fmt(s.score)} · Target ${fmt(GAME.target())} · +${last?.reward||0} coins</p>`;
    if(complete){overlayPrimary.textContent='NEW RUN';overlayPrimary.onclick=()=>{clearOutcomeDelay();GAME.fresh();GAME.save();handFx.fill('normal');autoRerollQueued=false;hideOverlay();render()};overlaySecondary.style.display='inline-block';overlaySecondary.textContent='COPY RUN DATA';overlaySecondary.onclick=copyRun;return}
    const next=s.nextShopType;overlayPrimary.textContent=next==='big'?'BIG SHOP':next==='mini'?'MINI SHOP':'NEXT ROUND';overlayPrimary.onclick=()=>{if(next==='none'){advanceRound();return}if(GAME.openIntermission()){GAME.save();render()}else toast('Shop unavailable')}
  }
  function showMiniShop(){
    resetOverlay();const s=GAME.state(),offers=s.shopOffers.map(id=>M.get(id)).filter(Boolean);overlayTitle.textContent='MINI SHOP';overlayBody.innerHTML=marketDescriptions(offers);
    const buttons=[overlayPrimary,overlaySecondary];buttons.forEach((b,i)=>{const m=offers[i];if(!m){b.style.display='none';return}b.style.display='inline-block';b.textContent=`${m.name} · ${m.cost}c`;b.disabled=s.coins<m.cost;b.onclick=()=>{const r=GAME.buyMiniShop(m.id);if(!r.ok){toast(r.reason==='coins'?'Not enough coins':'Purchase failed');return}GAME.save();toast(m.name);advanceRound()}});
    overlayTertiary.style.display='inline-block';overlayTertiary.textContent='SKIP';overlayTertiary.onclick=()=>{GAME.skipMiniShop();GAME.save();advanceRound()}
  }
  function exactGridHtml(cost){let html='<div class="exactGrid">';for(let a=0;a<=6;a++)for(let b=0;b<=6;b++){if(b<a)html+='<span class="exactTile blank"></span>';else html+=`<button class="exactTile" data-a="${a}" data-b="${b}">${a}|${b}</button>`}return html+'</div>'}
  function showBigShop(){
    resetOverlay();const s=GAME.state(),x=GAME.snapshot(),nextStage=x.stage.index+1,nextSize=D.BOARD_SIZES[Math.min(nextStage-1,D.BOARD_SIZES.length-1)],randomCost=D.BIG_SHOP_RANDOM_TILE_COST,exactCost=D.BIG_SHOP_EXACT_TILE_COST;
    overlayTitle.textContent='BIG SHOP';
    const bought=s.bigShopBuys.length?`<div class="purchased">${s.bigShopBuys.map(t=>`<span class="purchaseChip">[${t.a}|${t.b}]</span>`).join('')}</div>`:'';
    overlayBody.innerHTML=`<div class="bigShop"><div class="shopHero"><div><div class="label">Stage ${x.stage.index} complete</div><strong>${s.coins}c</strong></div><div class="label">Next board<br>${nextSize[0]} × ${nextSize[1]}</div></div><div class="shopSection"><h3>MYSTERY DOMINO</h3><p>Buy a random new physical tile. ${s.bigShopRandomStock} left in this shop.</p><button id="mysteryBuy" class="shopBuy">BUY RANDOM TILE · ${randomCost}c</button>${bought}</div><div class="shopSection"><h3>EXACT DOMINO</h3><p>Choose the exact values. Expensive, but fully deterministic.</p>${exactGridHtml(exactCost)}<div class="shopFoot">Each exact tile costs ${exactCost} coins. Purchased tiles are new physical copies with unique IDs.</div></div></div>`;
    const mystery=$('mysteryBuy');mystery.disabled=s.coins<randomCost||s.bigShopRandomStock<=0;mystery.onclick=()=>{const r=GAME.buyBigRandomTile();if(!r.ok){toast(r.reason==='coins'?'Not enough coins':'Sold out');return}GAME.save();toast(`[${r.tile.a}|${r.tile.b}] added`);render()};
    overlayBody.querySelectorAll('.exactTile[data-a]').forEach(b=>{b.disabled=s.coins<exactCost;b.title=`Buy [${b.dataset.a}|${b.dataset.b}] for ${exactCost} coins`;b.onclick=()=>{const r=GAME.buyBigExactTile(Number(b.dataset.a),Number(b.dataset.b));if(!r.ok){toast('Not enough coins');return}GAME.save();toast(`[${r.tile.a}|${r.tile.b}] added`);render()}});
    overlayPrimary.textContent=`CONTINUE TO STAGE ${nextStage}`;overlayPrimary.onclick=()=>{GAME.closeBigShop();GAME.save();advanceRound()}
  }
  function showFailed(){
    resetOverlay();const s=GAME.state(),noTiles=s.failureReason==='no-tiles';overlayTitle.textContent=noTiles?'NO TILES LEFT':'ROUND FAILED';
    const reason=noTiles?'Your physical set is exhausted. Buy more dominoes in the Big Shop before this happens.':s.failureReason==='placement-limit'?'You used every placement for this round.':'No legal continuation remains.';
    overlayBody.innerHTML=`<p>${reason}</p>${summaryHtml()}`;overlayPrimary.textContent='NEW RUN';overlayPrimary.onclick=()=>{clearOutcomeDelay();GAME.fresh();GAME.save();hideOverlay();handFx.fill('normal');autoRerollQueued=false;render()};overlaySecondary.style.display='inline-block';overlaySecondary.textContent='COPY RUN DATA';overlaySecondary.onclick=copyRun
  }

  function render(){
    const s=GAME.state(),x=GAME.snapshot();renderBoard();renderHand();scoreEl.textContent=fmt(s.score);targetEl.textContent=fmt(GAME.target());stageEl.textContent=`${x.stage.index}/${x.stage.total}`;roundEl.textContent=`${s.round+1}/${D.TOTAL_ROUNDS}`;movesEl.textContent=`${s.roundTurn}/${GAME.maxPlacements()}`;tilesEl.textContent=x.availableTileCount;coinEl.textContent=s.coins;stageRoundEl.textContent=`STAGE ${x.stage.index} · ROUND ${x.stage.round}/${x.stage.size}`;boardSizeEl.textContent=`${E.G} × ${E.H}`;rerollState.textContent=`${s.rerollsLeft} reroll${s.rerollsLeft===1?'':'s'}`;
    rerollBtn.disabled=uiBusy||s.rerollsLeft<=0||s.running||s.cleared||s.blocked||s.shopOpen||s.needsReroll;rerollBtn.textContent=`Reroll · ${s.rerollsLeft}`;
    hint.textContent=s.cleared?'Round cleared.':s.needsReroll?'No legal placements. Rerolling automatically…':s.blocked?(s.failureReason==='no-tiles'?'No physical tiles remain.':'The round is over.'):s.pieces.length===0?'Opening rule: the first tile must be a double.':`Build the machine · ${GAME.maxPlacements()-s.roundTurn} placements remaining.`;renderLog();
    if(uiBusy){hideOverlay();return}
    if(s.shopOpen){s.shopType==='big'?showBigShop():showMiniShop();return}
    if(!s.running){const waiting=(s.cleared||s.blocked)&&performance.now()<outcomeOverlayNotBefore;if(waiting)hideOverlay();else if(s.cleared)showClear();else if(s.needsReroll){hideOverlay();if(!autoRerollQueued){autoRerollQueued=true;setTimeout(()=>autoNoMovesReroll(),0)}}else if(s.blocked)showFailed();else{autoRerollQueued=false;hideOverlay()}}
  }

  function center(c,r){const p=E.pieceFrom(drag.tile,c.x,c.y,0,c.rr,-1);return{x:(p.rect.minx+p.rect.maxx)/2/E.G*r.width,y:(p.rect.miny+p.rect.maxy)/2/E.H*r.height}}
  function nearest(x,y){const r=board.getBoundingClientRect(),lx=x-r.left,ly=(y-D.DRAG_Y_OFFSET)-r.top;if(lx<0||ly<0||lx>r.width||ly>r.height)return null;let pick=null,d0=1e9;for(const c of drag.candidates){const q=center(c,r),d=Math.hypot(q.x-lx,q.y-ly);if(d<d0){d0=d;pick=c}}return d0<=82?pick:null}
  function maybeShakeRotate(e){const s=GAME.state();if(s.pieces.length)return;const now=performance.now(),dx=e.clientX-drag.lastX;if(Math.abs(dx)>=D.SHAKE_THRESHOLD){const sign=Math.sign(dx);if(drag.lastSign&&sign!==drag.lastSign){if(!drag.shakeStarted||now-drag.shakeStarted>D.SHAKE_WINDOW_MS){drag.switches=1;drag.shakeStarted=now}else drag.switches++;if(drag.switches>=D.SHAKE_SWITCHES&&now-drag.lastRotate>D.SHAKE_COOLDOWN_MS){GAME.rotateRoot();drag.candidates=GAME.candidatesForIndex(drag.index);drag.candidate=null;drag.lastRotate=now;drag.switches=0;drag.shakeStarted=now;if(navigator.vibrate)navigator.vibrate(12);updateFloatRotation();toast(`Opening tile ${ARROW[GAME.state().rootRR]}`)}}drag.lastSign=sign;drag.lastX=e.clientX}}
  function updateFloatRotation(){if(drag.float)drag.float.style.setProperty('--rr',GAME.state().rootRR)}
  function startDrag(e,i){if(uiBusy||!GAME.canInteract())return;e.preventDefault();const s=GAME.state(),cs=GAME.candidatesForIndex(i);if(!cs.length)return;const f=document.createElement('div');f.className='dragFloat';f.innerHTML=mini(s.hand[i]);document.body.appendChild(f);drag={active:true,index:i,tile:{...s.hand[i]},candidates:cs,candidate:null,float:f,lastX:e.clientX,lastSign:0,switches:0,shakeStarted:performance.now(),lastRotate:0};renderHand();updateFloatRotation();moveDrag(e)}
  function moveDrag(e){if(!drag.active)return;e.preventDefault();maybeShakeRotate(e);if(drag.float){drag.float.style.left=e.clientX+'px';drag.float.style.top=(e.clientY-D.DRAG_Y_OFFSET)+'px'}const c=nearest(e.clientX,e.clientY),o=drag.candidate,changed=(!c)!==(!o)||c&&(!o||c.x!==o.x||c.y!==o.y||c.rr!==o.rr);drag.candidate=c;if(drag.float)drag.float.style.opacity=c?'0':'0.96';if(changed)renderBoard()}
  async function animateDrawSlot(i){if(!GAME.state().hand[i]){handFx[i]='hidden';renderHand();await wait(100);handFx[i]='normal';renderHand();return}handFx[i]='back';renderHand();await wait(D.DRAW_BLACK_MS);handFx[i]='reveal';renderHand();await wait(390);handFx[i]='normal';renderHand()}
  async function endDrag(e){if(!drag.active)return;moveDrag(e);const i=drag.index,c=drag.candidate;if(drag.float)drag.float.remove();drag={active:false,index:-1,tile:null,candidates:[],candidate:null,float:null};renderBoard();if(!c){renderHand();return}const ctx=GAME.beginPlacement(i,c);if(!ctx.ok){toast(ctx.reason==='tile-already-in-machine'?'Tile already in machine':'Invalid placement');render();return}const drawAnim=animateDrawSlot(i);renderBoard();await animate(ctx.p,ctx.trigger,ctx.sim);GAME.finishPlacement(ctx);GAME.save();await drawAnim;if(GAME.state().cleared||GAME.state().blocked)armOutcomeDelay();render();if(GAME.state().cleared)toast(`Round clear · ${fmt(GAME.state().score)}`)}
  window.addEventListener('pointermove',moveDrag,{passive:false});window.addEventListener('pointerup',endDrag);window.addEventListener('pointercancel',endDrag);

  function pc(id){return GAME.state().pieces.find(p=>p.id===id)}
  function fx(x,y,t){const d=document.createElement('div');d.className='opfx';d.style.left=px(x);d.style.top=py(y);d.textContent=t;board.appendChild(d);setTimeout(()=>d.remove(),760)}
  function reboundFx(x,y){const d=document.createElement('div');d.className='opfx reboundFx';d.style.left=px(x);d.style.top=py(y);d.innerHTML='<i class="reboundGlyph" aria-hidden="true"></i>';board.appendChild(d);setTimeout(()=>d.remove(),760)}
  function finalFx(v){const d=document.createElement('div');d.className='finalfx';d.textContent=fmt(v);board.appendChild(d);setTimeout(()=>d.remove(),1050)}
  async function animate(p,trigger,sim){renderBoard();fx((p.rect.minx+p.rect.maxx)/2,(p.rect.miny+p.rect.maxy)/2,`+${fmt(trigger)}`);await wait(260);for(const e of sim.events||[]){if(e.type==='op'&&e.value!==0){const pp=pc(e.piece),c=pp?.cubes.find(x=>x.half===e.exitHalf);if(c){fx(c.x+1,c.y+1,e.op==='multiply'?`×${e.factor}`:`+${e.add}`);await wait(180)}}else if(e.type==='rebound'){const pp=pc(e.piece),c=pp?.cubes.find(x=>x.v===0)||pp?.cubes[0];if(c){reboundFx(c.x+1,c.y+1);await wait(180)}}}finalFx(sim.output??trigger);await wait(600)}

  async function doReroll(){if(uiBusy)return;uiBusy=true;hideOverlay();handFx.fill('hidden');renderHand();await wait(90);const r=GAME.reroll();if(!r.ok){uiBusy=false;handFx.fill('normal');autoRerollQueued=false;render();return}GAME.save();handFx.fill('back');renderHand();await wait(D.REROLL_BLACK_MS);for(let i=0;i<D.HAND_SIZE;i++){if(GAME.state().hand[i])handFx[i]='reveal';renderHand();await wait(D.HAND_REVEAL_STAGGER_MS)}await wait(300);handFx.fill('normal');uiBusy=false;autoRerollQueued=false;if(GAME.state().blocked)armOutcomeDelay();render()}
  async function autoNoMovesReroll(){if(uiBusy||!GAME.state().needsReroll){autoRerollQueued=false;return}uiBusy=true;hideOverlay();renderBoard();boardMessage('NO LEGAL MOVES',900);await wait(150);handFx.fill('hidden');renderHand();await wait(90);const r=GAME.reroll();if(!r.ok){uiBusy=false;handFx.fill('normal');autoRerollQueued=false;render();return}GAME.save();handFx.fill('back');renderHand();await wait(D.REROLL_BLACK_MS);for(let i=0;i<D.HAND_SIZE;i++){if(GAME.state().hand[i])handFx[i]='reveal';renderHand();await wait(D.HAND_REVEAL_STAGGER_MS)}await wait(300);handFx.fill('normal');uiBusy=false;autoRerollQueued=false;if(GAME.state().blocked)armOutcomeDelay();render()}

  function renderLog(){runlog.textContent=GAME.debugText();runlog.classList.toggle('show',viewRun)}
  async function copyRun(){const text=GAME.debugText();GAME.save();try{await navigator.clipboard.writeText(text);toast('Run data copied')}catch(_){const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.left='8px';ta.style.right='8px';ta.style.bottom='70px';ta.style.height='180px';ta.style.zIndex='600';document.body.appendChild(ta);ta.focus();ta.select();let ok=false;try{ok=document.execCommand('copy')}catch(e){}if(ok){ta.remove();toast('Run data copied')}else{toast('Select the run data and copy it');setTimeout(()=>ta.remove(),15000)}}}
  rerollBtn.onclick=doReroll;resetBtn.onclick=()=>{if(uiBusy)return;if(!confirm('Start a new run?'))return;clearOutcomeDelay();GAME.fresh();GAME.save();handFx.fill('normal');autoRerollQueued=false;render()};copyBtn.onclick=copyRun;viewBtn.onclick=()=>{viewRun=!viewRun;renderLog()};
  GAME.save();render();
})();