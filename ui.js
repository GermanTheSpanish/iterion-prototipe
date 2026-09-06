(function(){
  const E=window.IterionEngine,D=window.IterionData,M=window.IterionMods,GAME=window.IterionGame.createGame(E),ARROW=E.ARROW;
  const P={0:[],1:[[50,50]],2:[[28,28],[72,72]],3:[[28,28],[50,50],[72,72]],4:[[28,28],[72,28],[28,72],[72,72]],5:[[28,28],[72,28],[50,50],[28,72],[72,72]],6:[[28,23],[72,23],[28,50],[72,50],[28,77],[72,77]]};
  const $=id=>document.getElementById(id);
  const board=$('board'),scoreEl=$('score'),targetEl=$('target'),stageEl=$('stagestat'),roundEl=$('roundstat'),movesEl=$('moves'),tilesEl=$('tilesleft'),stageRoundEl=$('stageRound'),boardSizeEl=$('boardsize'),handEl=$('hand'),hint=$('hint'),moveBtn=$('moveTool'),rerollBtn=$('reroll'),undoBtn=$('undoTool'),resetBtn=$('reset'),viewBtn=$('viewrun'),copyBtn=$('copyrun'),runlog=$('runlog'),toastEl=$('toast'),overlay=$('overlay'),overlayTitle=$('overlayTitle'),overlayBody=$('overlayBody'),overlayPrimary=$('overlayPrimary'),overlaySecondary=$('overlaySecondary'),overlayTertiary=$('overlayTertiary'),coinEl=$('coins'),versionEl=$('version');
  let viewRun=false,outcomeOverlayNotBefore=0,outcomeTimer=0,uiBusy=false;
  let handFx=Array(D.HAND_SIZE).fill('normal');
  let drag={active:false,index:-1,tile:null,candidates:[],candidate:null,float:null,lastX:0,lastSign:0,switches:0,shakeStarted:0,lastRotate:0};
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const px=n=>n/E.G*100+'%',py=n=>n/E.H*100+'%';
  const fmt=n=>Number.isFinite(Number(n))?Number(n).toLocaleString('en-US'):`${n}`;
  document.title=`ITERION v${D.VERSION}`;versionEl.textContent=`v${D.VERSION} · ${D.TOTAL_ROUNDS} rounds`;

  function dots(n,s=false){return P[n].map(([x,y])=>`<i class="${s?'spip':'pip'}" style="left:${x}%;top:${y}%"></i>`).join('')}
  function tierFor(t){if(!t)return 0;if(t.upgrade)return Math.min(3,t.upgrade);const set=GAME.state().set||[],m=t.id?set.find(x=>x.id===t.id):null;return Math.min(3,m?.upgrade||0)}
  function upgradeDot(t){const tier=tierFor(t);return tier?`<i class="upgradeDot u${tier}" aria-hidden="true"></i>`:''}
  function doubleDoubleMark(t){return t?.id&&GAME.state().doubleDoubleTileId===t.id?'<i class="doubleDoubleMark" aria-hidden="true">DD</i>':''}
  function mini(t,fx='normal'){const cls=fx==='back'?' back':fx==='reveal'?' reveal':'',mark=fx==='back'?'':upgradeDot(t)+doubleDoubleMark(t);return`<div class="domino${cls}"><div class="half"><div class="spips">${dots(t?.a??0,true)}</div></div><div class="half"><div class="spips">${dots(t?.b??0,true)}</div></div>${mark}</div>`}
  function ordered(p){return[...p.cubes].sort((a,b)=>p.axis==='H'?a.x-b.x:a.y-b.y)}
  function pieceEl(p,cls='piece'){const d=document.createElement('div');d.className=cls+' '+(p.axis==='H'?'h':'v');d.style.left=px(p.rect.minx);d.style.top=py(p.rect.miny);d.style.width=px(p.rect.maxx-p.rect.minx);d.style.height=py(p.rect.maxy-p.rect.miny);d.innerHTML=ordered(p).map(c=>`<div class="cube"><div class="pips">${dots(c.v)}</div></div>`).join('')+upgradeDot(p.tile)+doubleDoubleMark(p.tile);return d}
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
  function newRun(){clearOutcomeDelay();GAME.fresh();GAME.save();handFx.fill('normal');hideOverlay();render()}
  function setNewRunButton(b){b.style.display='inline-block';b.textContent='NEW RUN';b.onclick=()=>{if(confirm('Start a new run?'))newRun()}}
  function useUndo(){const r=GAME.useUndo();if(!r.ok){toast('Undo unavailable');return}clearOutcomeDelay();GAME.save();handFx.fill('normal');hideOverlay();toast('Last move undone');render()}
  function useMove(){const r=GAME.useMove();if(!r.ok){toast('Move unavailable');return}clearOutcomeDelay();GAME.save();hideOverlay();toast(`+1 Move · ${r.maxPlacements} max`);render()}

  function runSummary(){
    const x=GAME.snapshot(),turns=x.turns.filter(e=>Number.isInteger(e.turn)),mvp=turns.reduce((b,e)=>!b||e.output>b.output?e:b,null);let addOps=0,multOps=0,rebounds=0;
    for(const e of turns){addOps+=(e.ops.match(/:\+/g)||[]).length;multOps+=(e.ops.match(/:×/g)||[]).length;rebounds+=e.rebounds||0}
    return{roundsCleared:x.round.clears.length,totalRounds:x.round.total,tilesPlayed:x.turnCount,bestOutput:x.score.best,mvpTile:mvp?{a:mvp.tile.a,b:mvp.tile.b,output:mvp.output,round:mvp.round,placement:mvp.roundTurn}:null,addOps,multOps,rebounds,rerolls:x.turns.filter(e=>e.type==='reroll').length,purchases:x.turns.filter(e=>e.type==='shop-buy'||e.type==='tile-buy').length,coins:x.coins,inflation:x.inflation,consumables:x.consumables,setSize:x.setSize,machine:x.board.length}
  }
  function summaryHtml(){const r=runSummary(),m=r.mvpTile;return`<div class="summary"><div class="sumCard wide"><div class="sumLabel">MVP TILE</div><div class="sumValue">${m?`[${m.a}|${m.b}] → ${fmt(m.output)}`:'—'}</div><div class="sumSmall">${m?`Best activation · Round ${m.round}, move ${m.placement}`:'No placement yet'}</div></div><div class="sumCard"><div class="sumLabel">PROGRESS</div><div class="sumValue">${r.roundsCleared}/${r.totalRounds}</div><div class="sumSmall">Rounds cleared</div></div><div class="sumCard"><div class="sumLabel">MACHINE</div><div class="sumValue">${r.machine}</div><div class="sumSmall">${r.setSize} tiles in set</div></div><div class="sumCard wide"><div class="sumLabel">SCORE SOURCES</div><div class="sumValue">${r.multOps} multipliers · ${r.addOps} additions</div><div class="sumSmall">${r.rebounds} rebounds · Best ${fmt(r.bestOutput)}</div></div><div class="sumCard wide"><div class="sumLabel">ECONOMY</div><div class="sumValue">${r.coins} coins · Inflation ${r.inflation}</div><div class="sumSmall">Move ${r.consumables.move} · Reroll ${r.consumables.reroll} · Undo ${r.consumables.undo} · ${r.purchases} purchases</div></div></div>`}

  function shopDescriptions(offers){const s=GAME.state();return`<div class="marketIntro"><strong>${s.coins}c</strong> · Inflation ${s.inflation}. Each purchase permanently raises inflation by 1.</div><div class="marketDescriptions">${offers.map(m=>{const cost=GAME.shopItemPrice(m.id);return`<div class="marketDesc"><strong>${m.name} · ${cost}c</strong><span>${m.description}</span></div>`}).join('')}</div>`}
  function advanceRound(){
    const before=GAME.snapshot().stage.index;clearOutcomeDelay();const ok=GAME.advance();if(!ok){toast('Resolve Shop / Market first');return}
    GAME.save();hideOverlay();handFx.fill('normal');render();const after=GAME.snapshot().stage.index;if(after>before)toast(`STAGE ${after} · BOARD ${E.G}×${E.H}`)
  }
  function showClear(){
    resetOverlay();const s=GAME.state(),x=GAME.snapshot(),complete=x.status==='COMPLETE',last=s.wins[s.wins.length-1];
    overlayTitle.textContent=complete?'RUN COMPLETE':'ROUND CLEAR';
    overlayBody.innerHTML=complete?`<p>Final output ${fmt(s.score)} · Target ${fmt(GAME.target())}</p>${summaryHtml()}`:`<p>Output ${fmt(s.score)} · Target ${fmt(GAME.target())}<br>Clear +${last?.reward||0}c${last?.upgradeCoins?` · ★ activations +${last.upgradeCoins}c`:''}</p>`;
    if(complete){setNewRunButton(overlayPrimary);overlaySecondary.style.display='inline-block';overlaySecondary.textContent='COPY RUN DATA';overlaySecondary.onclick=copyRun;return}
    const next=s.nextShopType;overlayPrimary.textContent=next==='market'?'MARKET':next==='shop'?'SHOP':'NEXT ROUND';overlayPrimary.onclick=()=>{if(next==='none'){advanceRound();return}if(GAME.openIntermission()){GAME.save();render()}else toast('Unavailable')};
    if(GAME.canUndo()){overlaySecondary.style.display='inline-block';overlaySecondary.textContent=`UNDO · ${s.consumables.undo}`;overlaySecondary.onclick=useUndo}
  }
  function showShop(){
    resetOverlay();const s=GAME.state(),offers=s.shopOffers.map(id=>M.get(id)).filter(Boolean);overlayTitle.textContent='SHOP';overlayBody.innerHTML=shopDescriptions(offers);
    const buttons=[overlayPrimary,overlaySecondary];buttons.forEach((b,i)=>{const m=offers[i];if(!m){b.style.display='none';return}const cost=GAME.shopItemPrice(m.id);b.style.display='inline-block';b.textContent=`${m.name} · ${cost}c`;b.disabled=s.coins<cost;b.onclick=()=>{const r=GAME.buyShopItem(m.id);if(!r.ok){toast(r.reason==='coins'?'Not enough coins':'Purchase failed');return}GAME.save();toast(`${m.name} stored · Inflation ${r.inflation}`);advanceRound()}});
    overlayTertiary.style.display='inline-block';overlayTertiary.textContent='SKIP';overlayTertiary.onclick=()=>{GAME.skipShop();GAME.save();advanceRound()}
  }
  function showMarket(){
    resetOverlay();const s=GAME.state(),x=GAME.snapshot(),nextStage=x.stage.index+1,nextSize=D.BOARD_SIZES[Math.min(nextStage-1,D.BOARD_SIZES.length-1)],randomCost=GAME.marketRandomPrice(),doubleDoubleCost=GAME.marketDoubleDoublePrice();
    overlayTitle.textContent='MARKET';
    const bought=s.marketBuys.length?`<div class="purchased">${s.marketBuys.map(t=>`<span class="purchaseChip">[${t.a}|${t.b}]</span>`).join('')}</div>`:'';
    const supply=x.availableTileCount,nextMarket=x.round.index<D.TOTAL_ROUNDS-(D.STAGE_SIZE||5)?`Next Market in ${D.STAGE_SIZE||5} rounds`:'Final stage · no later Market';
    const active=x.doubleDouble?`[${x.doubleDouble.a}|${x.doubleDouble.b}]`:'None';
    overlayBody.innerHTML=`<div class="bigShop"><div class="shopHero"><div><div class="label">Stage ${x.stage.index} complete</div><strong>${s.coins}c</strong><div class="shopInflation">Inflation ${s.inflation}</div><div class="shopSupply">SUPPLY ${supply} · ${nextMarket}</div></div><div class="label">Next board<br>${nextSize[0]} × ${nextSize[1]}</div></div><div class="shopSection"><h3>MYSTERY DOMINO</h3><p>Random new physical tile. No stock limit; coins and Inflation set the limit.</p><button id="mysteryBuy" class="shopBuy">BUY RANDOM TILE · ${randomCost}c</button>${bought}</div><div class="shopSection"><h3>DOUBLE DOUBLE</h3><p>Randomly upgrades one physical double you own. Its first activation each Move is doubled: [3|3] ×9, [5|5] ×25, [4|4] +8. Later passes use the normal operation. Buying again transfers Double Double to a new random double.</p><button id="doubleDoubleBuy" class="shopBuy">ROLL DOUBLE DOUBLE · ${doubleDoubleCost}c</button><div class="shopFoot">Active: ${active}. The result is revealed after purchase. Each purchase raises Inflation.</div></div></div>`;
    const mystery=$('mysteryBuy');mystery.disabled=s.coins<randomCost;mystery.onclick=()=>{const r=GAME.buyMarketRandomTile();if(!r.ok){toast('Not enough coins');return}GAME.save();toast(`[${r.tile.a}|${r.tile.b}] added · Inflation ${r.inflation}`);render()};
    const dd=$('doubleDoubleBuy');dd.disabled=s.coins<doubleDoubleCost;dd.onclick=()=>{const r=GAME.buyDoubleDouble();if(!r.ok){toast(r.reason==='coins'?'Not enough coins':'No eligible double');return}GAME.save();toast(`DOUBLE DOUBLE → [${r.tile.a}|${r.tile.b}] · Inflation ${r.inflation}`);render()};
    overlayPrimary.textContent=`CONTINUE TO STAGE ${nextStage}`;overlayPrimary.onclick=()=>{GAME.closeMarket();GAME.save();advanceRound()}
  }

  function showNoMoves(){
    resetOverlay();const s=GAME.state();overlayTitle.textContent='NO LEGAL MOVES';overlayBody.innerHTML=`<p>No tile in your hand can continue the machine. Spend a stored Reroll, Undo the last move, or end the run.</p>`;
    overlayPrimary.textContent=`REROLL · ${s.consumables.reroll}`;overlayPrimary.disabled=!GAME.canUseReroll();overlayPrimary.onclick=doReroll;
    if(GAME.canUndo()){overlaySecondary.style.display='inline-block';overlaySecondary.textContent=`UNDO · ${s.consumables.undo}`;overlaySecondary.onclick=useUndo}
    setNewRunButton(overlayTertiary)
  }
  function showFailed(){
    resetOverlay();const s=GAME.state(),noTiles=s.failureReason==='no-tiles',limit=s.failureReason==='placement-limit';overlayTitle.textContent=noTiles?'NO TILES LEFT':'ROUND FAILED';
    const reason=noTiles?'Your physical set is exhausted. Buy more dominoes in the Market before this happens.':limit?'You used every move for this round.':'No legal continuation remains.';
    overlayBody.innerHTML=`<p>${reason}</p>${summaryHtml()}<button id="copyFailedRun" class="shopBuy secondary">COPY RUN DATA</button>`;
    overlayBody.querySelector('#copyFailedRun').onclick=copyRun;
    let slot=0,buttons=[overlayPrimary,overlaySecondary,overlayTertiary];
    if(limit&&GAME.canUseMove()){const b=buttons[slot++];b.style.display='inline-block';b.textContent=`+1 MOVE · ${s.consumables.move}`;b.onclick=useMove}
    if(GAME.canUndo()){const b=buttons[slot++];b.style.display='inline-block';b.textContent=`UNDO · ${s.consumables.undo}`;b.onclick=useUndo}
    const b=buttons[slot++]||overlayTertiary;setNewRunButton(b)
  }

  function render(){
    const s=GAME.state(),x=GAME.snapshot();renderBoard();renderHand();scoreEl.textContent=fmt(s.score);targetEl.textContent=fmt(GAME.target());stageEl.textContent=`${x.stage.index}/${x.stage.total}`;roundEl.textContent=`${s.round+1}/${D.TOTAL_ROUNDS}`;movesEl.textContent=`${s.roundTurn}/${GAME.maxPlacements()}`;tilesEl.textContent=x.availableTileCount;coinEl.textContent=s.coins;stageRoundEl.textContent=`STAGE ${x.stage.index} · ROUND ${x.stage.round}/${x.stage.size}`;boardSizeEl.textContent=`${E.G} × ${E.H}`;
    moveBtn.textContent=`Move +1 · ${s.consumables.move}`;moveBtn.disabled=uiBusy||!GAME.canUseMove();rerollBtn.textContent=`Reroll · ${s.consumables.reroll}`;rerollBtn.disabled=uiBusy||!GAME.canUseReroll();undoBtn.textContent=`Undo · ${s.consumables.undo}`;undoBtn.disabled=uiBusy||!GAME.canUndo();
    hint.textContent=s.cleared?'Round cleared.':s.needsReroll?'No legal placements. Choose whether to spend a Reroll.':s.blocked?(s.failureReason==='no-tiles'?'No physical tiles remain.':s.failureReason==='placement-limit'?'No moves remain.':'The round is over.'):s.pieces.length===0?'Opening rule: the first tile must be a double.':`Build the machine · ${GAME.maxPlacements()-s.roundTurn} moves remaining.`;renderLog();
    if(uiBusy){hideOverlay();return}
    if(s.shopOpen){s.shopType==='market'?showMarket():showShop();return}
    if(!s.running){const waiting=(s.cleared||s.blocked)&&performance.now()<outcomeOverlayNotBefore;if(waiting)hideOverlay();else if(s.cleared)showClear();else if(s.needsReroll)showNoMoves();else if(s.blocked)showFailed();else hideOverlay()}
  }

  function center(c,r){const p=E.pieceFrom(drag.tile,c.x,c.y,0,c.rr,-1);return{x:(p.rect.minx+p.rect.maxx)/2/E.G*r.width,y:(p.rect.miny+p.rect.maxy)/2/E.H*r.height}}
  function nearest(x,y){const r=board.getBoundingClientRect(),lx=x-r.left,ly=(y-D.DRAG_Y_OFFSET)-r.top;if(lx<0||ly<0||lx>r.width||ly>r.height)return null;let pick=null,d0=1e9;for(const c of drag.candidates){const q=center(c,r),d=Math.hypot(q.x-lx,q.y-ly);if(d<d0){d0=d;pick=c}}return d0<=82?pick:null}
  function maybeShakeRotate(e){const s=GAME.state();if(s.pieces.length)return;const now=performance.now(),dx=e.clientX-drag.lastX;if(Math.abs(dx)>=D.SHAKE_THRESHOLD){const sign=Math.sign(dx);if(drag.lastSign&&sign!==drag.lastSign){if(!drag.shakeStarted||now-drag.shakeStarted>D.SHAKE_WINDOW_MS){drag.switches=1;drag.shakeStarted=now}else drag.switches++;if(drag.switches>=D.SHAKE_SWITCHES&&now-drag.lastRotate>D.SHAKE_COOLDOWN_MS){GAME.rotateRoot();drag.candidates=GAME.candidatesForIndex(drag.index);drag.candidate=null;drag.lastRotate=now;drag.switches=0;drag.shakeStarted=now;if(navigator.vibrate)navigator.vibrate(12);updateFloatRotation();toast(`Opening tile ${ARROW[GAME.state().rootRR]}`)}}drag.lastSign=sign;drag.lastX=e.clientX}}
  function updateFloatRotation(){if(drag.float)drag.float.style.setProperty('--rr',GAME.state().rootRR)}
  function startDrag(e,i){if(uiBusy||!GAME.canInteract())return;e.preventDefault();const s=GAME.state(),cs=GAME.candidatesForIndex(i);if(!cs.length)return;const f=document.createElement('div');f.className='dragFloat';f.innerHTML=mini(s.hand[i]);document.body.appendChild(f);drag={active:true,index:i,tile:{...s.hand[i]},candidates:cs,candidate:null,float:f,lastX:e.clientX,lastSign:0,switches:0,shakeStarted:performance.now(),lastRotate:0};renderHand();updateFloatRotation();moveDrag(e)}
  function moveDrag(e){if(!drag.active)return;e.preventDefault();maybeShakeRotate(e);if(drag.float){drag.float.style.left=e.clientX+'px';drag.float.style.top=(e.clientY-D.DRAG_Y_OFFSET)+'px'}const c=nearest(e.clientX,e.clientY),o=drag.candidate,changed=(!c)!==(!o)||c&&(!o||c.x!==o.x||c.y!==o.y||c.rr!==o.rr);drag.candidate=c;if(drag.float)drag.float.style.opacity=c?'0':'0.96';if(changed)renderBoard()}
  async function animateDrawSlot(i){if(!GAME.state().hand[i]){handFx[i]='hidden';renderHand();await wait(100);handFx[i]='normal';renderHand();return}handFx[i]='back';renderHand();await wait(D.DRAW_BLACK_MS);handFx[i]='reveal';renderHand();await wait(390);handFx[i]='normal';renderHand()}
  async function endDrag(e){if(!drag.active)return;moveDrag(e);const i=drag.index,c=drag.candidate;if(drag.float)drag.float.remove();drag={active:false,index:-1,tile:null,candidates:[],candidate:null,float:null};renderBoard();if(!c){renderHand();return}const ctx=GAME.beginPlacement(i,c);if(!ctx.ok){toast(ctx.reason==='tile-already-in-machine'?'Tile already in machine':'Invalid placement');render();return}const drawAnim=animateDrawSlot(i);renderBoard();await animate(ctx.p,ctx.trigger,ctx.sim);const result=GAME.finishPlacement(ctx);GAME.save();await drawAnim;if(GAME.state().cleared||GAME.state().blocked)armOutcomeDelay();render();if(GAME.state().cleared)toast(`Round clear · ${fmt(GAME.state().score)}`);else if(result.upgradeCoins)toast(`★ +${result.upgradeCoins} coins`)}
  window.addEventListener('pointermove',moveDrag,{passive:false});window.addEventListener('pointerup',endDrag);window.addEventListener('pointercancel',endDrag);

  function pc(id){return GAME.state().pieces.find(p=>p.id===id)}
  function magnitude(v){const n=Math.abs(Number(v)||0);return n<1?1:Math.floor(Math.log10(n))+1}
  function fx(x,y,t,value=0){const d=document.createElement('div'),digits=magnitude(value),duration=(D.CASCADE_FX_BASE_MS||1200)+digits*(D.CASCADE_FX_PER_DIGIT_MS||90),size=Math.min(D.CASCADE_FX_MAX_PX||42,(D.CASCADE_FX_BASE_PX||14)+digits*(D.CASCADE_FX_PER_DIGIT_PX||3.2));d.className='opfx';d.style.left=px(x);d.style.top=py(y);d.style.fontSize=`${size}px`;d.style.animationDuration=`${duration}ms`;d.textContent=t;board.appendChild(d);setTimeout(()=>d.remove(),duration+120)}
  function reboundFx(x,y,angle=180){const d=document.createElement('div'),duration=D.CASCADE_FX_BASE_MS||1200;d.className='opfx reboundFx';d.style.left=px(x);d.style.top=py(y);d.style.animationDuration=`${duration}ms`;d.innerHTML='<span class="reboundArrow" aria-hidden="true">→</span>';d.firstChild.style.transform=`rotate(${angle}deg)`;board.appendChild(d);setTimeout(()=>d.remove(),duration+120)}
  function finalFx(v){const d=document.createElement('div'),digits=magnitude(v),duration=(D.CASCADE_FINAL_MS||1800)+Math.min(700,digits*55),size=Math.min(D.CASCADE_FINAL_MAX_PX||68,30+digits*4);d.className='finalfx';d.style.fontSize=`${size}px`;d.style.animationDuration=`${duration}ms`;d.textContent=fmt(v);board.appendChild(d);setTimeout(()=>d.remove(),duration+120);return duration}
  async function animate(p,trigger,sim){renderBoard();fx((p.rect.minx+p.rect.maxx)/2,(p.rect.miny+p.rect.maxy)/2,`+${fmt(trigger)}`,trigger);await wait(260);let lastOp=null;for(const e of sim.events||[]){if(e.type==='op'){lastOp=e;if(e.value!==0){const pp=pc(e.piece),c=pp?.cubes.find(x=>x.half===e.exitHalf);if(c){const label=e.op==='multiply'?`×${e.factor}${e.doubleDouble?' DD':''}`:`+${e.add}${e.doubleDouble?' DD':''}`;fx(c.x+1,c.y+1,label,e.after);await wait(180)}}}else if(e.type==='rebound'){const pp=pc(e.piece),entry=pp&&lastOp?.piece===e.piece?pp.cubes.find(x=>x.half===lastOp.entryHalf):null,exit=pp&&lastOp?.piece===e.piece?pp.cubes.find(x=>x.half===lastOp.exitHalf):null,c=exit||pp?.cubes.find(x=>x.v===0)||pp?.cubes[0];if(c){const angle=entry&&exit?Math.atan2(entry.y-exit.y,entry.x-exit.x)*180/Math.PI:180;reboundFx(c.x+1,c.y+1,angle);await wait(180)}}}const finalDuration=finalFx(sim.output??trigger);await wait(Math.min(1400,Math.max(900,finalDuration-500)))}

  async function doReroll(){if(uiBusy||!GAME.canUseReroll())return;uiBusy=true;hideOverlay();handFx.fill('hidden');renderHand();await wait(90);const r=GAME.reroll();if(!r.ok){uiBusy=false;handFx.fill('normal');render();return}GAME.save();handFx.fill('back');renderHand();await wait(D.REROLL_BLACK_MS);for(let i=0;i<D.HAND_SIZE;i++){if(GAME.state().hand[i])handFx[i]='reveal';renderHand();await wait(D.HAND_REVEAL_STAGGER_MS)}await wait(300);handFx.fill('normal');uiBusy=false;if(GAME.state().blocked)armOutcomeDelay();render()}

  function renderLog(){runlog.textContent=GAME.debugText();runlog.classList.toggle('show',viewRun)}
  async function copyRun(){const text=GAME.debugText();GAME.save();try{await navigator.clipboard.writeText(text);toast('Run data copied')}catch(_){const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.left='8px';ta.style.right='8px';ta.style.bottom='70px';ta.style.height='180px';ta.style.zIndex='600';document.body.appendChild(ta);ta.focus();ta.select();let ok=false;try{ok=document.execCommand('copy')}catch(e){}if(ok){ta.remove();toast('Run data copied')}else{toast('Select the run data and copy it');setTimeout(()=>ta.remove(),15000)}}}
  moveBtn.onclick=useMove;rerollBtn.onclick=doReroll;undoBtn.onclick=useUndo;resetBtn.onclick=()=>{if(uiBusy)return;if(!confirm('Start a new run?'))return;newRun()};copyBtn.onclick=copyRun;viewBtn.onclick=()=>{viewRun=!viewRun;renderLog()};
  GAME.save();render();
})();
