(function(){
  const E=window.IterionEngine,D=window.IterionData,M=window.IterionMods,H=window.IterionHelp,GEST=window.IterionGesture,GAME=window.IterionGame.createGame(E),ARROW=E.ARROW;
  const P={0:[],1:[[50,50]],2:[[28,28],[72,72]],3:[[28,28],[50,50],[72,72]],4:[[28,28],[72,28],[28,72],[72,72]],5:[[28,28],[72,28],[50,50],[28,72],[72,72]],6:[[28,23],[72,23],[28,50],[72,50],[28,77],[72,77]]};
  const $=id=>document.getElementById(id);
  const board=$('board'),scoreEl=$('score'),targetEl=$('target'),stageEl=$('stagestat'),roundEl=$('roundstat'),movesEl=$('moves'),tilesEl=$('tilesleft'),stageRoundEl=$('stageRound'),boardSizeEl=$('boardsize'),handEl=$('hand'),hint=$('hint'),shopBtn=$('shopButton'),moveBtn=$('moveTool'),rerollBtn=$('reroll'),undoBtn=$('undoTool'),resetBtn=$('reset'),helpBtn=$('helpButton'),viewBtn=$('viewrun'),copyBtn=$('copyrun'),runlog=$('runlog'),toastEl=$('toast'),overlay=$('overlay'),modalEl=overlay.querySelector('.modal'),overlayTitle=$('overlayTitle'),overlayBody=$('overlayBody'),overlayPrimary=$('overlayPrimary'),overlaySecondary=$('overlaySecondary'),overlayTertiary=$('overlayTertiary'),coinEl=$('coins'),versionEl=$('version');
  let viewRun=false,outcomeOverlayNotBefore=0,outcomeTimer=0,uiBusy=false,auxOverlay=null;
  let handFx=Array(D.HAND_SIZE).fill('normal');
  let drag={active:false,index:-1,tile:null,candidates:[],candidate:null,float:null,lastX:0,lastSign:0,switches:0,shakeStarted:0,lastRotate:0};
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const px=n=>n/E.G*100+'%',py=n=>n/E.H*100+'%';
  const fmt=n=>Number.isFinite(Number(n))?Number(n).toLocaleString('en-US'):`${n}`;
  document.title=`ITERION v${D.VERSION}`;versionEl.textContent=`v${D.VERSION} · ${D.TOTAL_ROUNDS} rounds + Endless`;
  H.bindRun(GAME.state().runId);

  function dots(n,s=false){return P[n].map(([x,y])=>`<i class="${s?'spip':'pip'}" style="left:${x}%;top:${y}%"></i>`).join('')}
  function tierFor(t){if(!t)return 0;if(t.upgrade)return Math.min(3,t.upgrade);const set=GAME.state().set||[],m=t.id?set.find(x=>x.id===t.id):null;return Math.min(3,m?.upgrade||0)}
  function upgradeDot(t){const tier=tierFor(t);return tier?`<i class="upgradeDot u${tier}" aria-hidden="true"></i>`:''}
  function tileModMarks(t){if(!t?.id)return'';const s=GAME.state(),marks=[];if(s.doubleDoubleTileId===t.id)marks.push(['DD','dd']);if(s.doubleEchoTileId===t.id)marks.push(['DE','de']);if(s.zeroMemoryTileId===t.id)marks.push(['ZM','zm']);return marks.map(([label,cls],i)=>`<i class="tileModMark ${cls}" style="--mi:${i}" aria-hidden="true">${label}</i>`).join('')}
  function mini(t,fx='normal'){const cls=fx==='back'?' back':fx==='reveal'?' reveal':'',mark=fx==='back'?'':upgradeDot(t)+tileModMarks(t);return`<div class="domino${cls}"><div class="half"><div class="spips">${dots(t?.a??0,true)}</div></div><div class="half"><div class="spips">${dots(t?.b??0,true)}</div></div>${mark}</div>`}
  function ordered(p){return[...p.cubes].sort((a,b)=>p.axis==='H'?a.x-b.x:a.y-b.y)}
  function pieceEl(p,cls='piece'){const d=document.createElement('div');d.className=cls+' '+(p.axis==='H'?'h':'v');d.style.left=px(p.rect.minx);d.style.top=py(p.rect.miny);d.style.width=px(p.rect.maxx-p.rect.minx);d.style.height=py(p.rect.maxy-p.rect.miny);d.innerHTML=ordered(p).map(c=>`<div class="cube"><div class="pips">${dots(c.v)}</div></div>`).join('')+upgradeDot(p.tile)+tileModMarks(p.tile);return d}
  function toast(t){toastEl.textContent=t;toastEl.classList.add('show');setTimeout(()=>toastEl.classList.remove('show'),1300)}
  function boardMessage(text,ms=900){const d=document.createElement('div');d.className='boardMessage';d.textContent=text;board.appendChild(d);setTimeout(()=>d.remove(),ms)}
  function addBoardCenterTicks(){
    const specs=[
      {left:'50%',top:'0',width:'1px',height:'8px',transform:'translateX(-50%)'},
      {left:'50%',bottom:'0',width:'1px',height:'8px',transform:'translateX(-50%)'},
      {left:'0',top:'50%',width:'8px',height:'1px',transform:'translateY(-50%)'},
      {right:'0',top:'50%',width:'8px',height:'1px',transform:'translateY(-50%)'}
    ];
    for(const spec of specs){const tick=document.createElement('i');tick.className='boardCenterTick';tick.setAttribute('aria-hidden','true');Object.assign(tick.style,{position:'absolute',display:'block',background:'rgba(17,17,17,.34)',zIndex:'2',pointerEvents:'none',...spec});board.appendChild(tick)}
  }

  function beginTilePress(e,meta){
    if(auxOverlay||e.button!=null&&e.button!==0)return;
    e.preventDefault();
    press.begin(e,meta)
  }
  function renderBoard(){
    const s=GAME.state();board.innerHTML='';board.style.setProperty('--cell-x',`${100/E.G}%`);board.style.setProperty('--cell-y',`${100/E.H}%`);board.style.backgroundImage='none';board.style.backgroundColor='#fff';addBoardCenterTicks();
    s.pieces.forEach(p=>{const el=pieceEl(p);el.classList.add('inspectable');el.setAttribute('role','button');el.setAttribute('aria-label',`Inspect domino ${p.tile.a}|${p.tile.b}`);el.onpointerdown=e=>beginTilePress(e,{kind:'board',tileId:p.tile.id,allowDrag:false});board.appendChild(el)});
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
      if(t){const b=document.createElement('button');b.className='tile'+(mask[i]?'':' unplayable');b.disabled=uiBusy;b.setAttribute('aria-disabled',mask[i]?'false':'true');b.setAttribute('aria-label',`Domino ${t.a}|${t.b}. Hold to inspect.`);b.innerHTML=mini(t,handFx[i]);b.onpointerdown=e=>beginTilePress(e,{kind:'hand',index:i,tileId:t.id,allowDrag:true});slot.appendChild(b)}
      handEl.appendChild(slot)
    }
  }

  function hideOverlay(){overlay.className='overlay';modalEl.classList.remove('auxModal');overlay.onclick=null}
  function resetOverlay(){overlay.className='overlay show';modalEl.classList.remove('auxModal');overlay.onclick=null;overlayPrimary.onclick=overlaySecondary.onclick=overlayTertiary.onclick=null;overlayPrimary.disabled=overlaySecondary.disabled=overlayTertiary.disabled=false;overlayPrimary.style.display='inline-block';overlaySecondary.style.display=overlayTertiary.style.display='none'}
  function clearOutcomeDelay(){outcomeOverlayNotBefore=0;if(outcomeTimer){clearTimeout(outcomeTimer);outcomeTimer=0}}
  function armOutcomeDelay(){clearOutcomeDelay();outcomeOverlayNotBefore=performance.now()+D.OUTCOME_SCREEN_DELAY_MS;outcomeTimer=setTimeout(()=>{outcomeTimer=0;render()},D.OUTCOME_SCREEN_DELAY_MS+25)}
  function newRun(){clearOutcomeDelay();auxOverlay=null;press.cancel();GAME.fresh();H.bindRun(GAME.state().runId);GAME.save();handFx.fill('normal');hideOverlay();render()}
  function setNewRunButton(b){b.style.display='inline-block';b.textContent='NEW RUN';b.onclick=()=>{if(confirm('Start a new run?'))newRun()}}
  function useUndo(){const r=GAME.useUndo();if(!r.ok){toast('Undo unavailable');return}clearOutcomeDelay();GAME.save();handFx.fill('normal');hideOverlay();toast(r.preservedPurchases?`Last move undone · ${r.preservedPurchases} Shop purchase${r.preservedPurchases===1?'':'s'} kept`:'Last move undone');render()}
  function useMove(){const r=GAME.useMove();if(!r.ok){toast('Move unavailable');return}clearOutcomeDelay();GAME.save();hideOverlay();toast(`+1 Move · ${r.maxPlacements} max`);render()}
  function openPermanentShop(){if(!GAME.openShop()){toast('Shop unavailable');return}GAME.save();render()}

  function escapeHtml(value){return`${value}`.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
  function ruleVisual(section){return section.visual?`<div class="ruleVisual">${escapeHtml(section.visual)}</div>`:''}
  function closeAuxOverlay(){auxOverlay=null;render()}
  function openRulebook(){H.bindRun(GAME.state().runId);H.recordRulebookOpen();auxOverlay={type:'rulebook',sectionId:null};renderAuxOverlay()}
  function openRulebookSection(id){H.recordSectionOpen(id);auxOverlay={type:'rulebook',sectionId:id};renderAuxOverlay()}
  function operationLabel(op){if(op.type==='add')return`+${op.add}`;if(op.type==='multiply')return`×${op.factor}`;if(op.type==='zero')return'0 · rebound';return'—'}
  function openTileInspector(tileId){const model=H.inspectTile(GAME.state(),tileId);if(!model)return;auxOverlay={type:'inspector',tileId,model};renderAuxOverlay()}
  function renderRulebook(){
    const sections=H.rulebookSections(),selected=sections.find(s=>s.id===auxOverlay.sectionId)||null;
    overlayTitle.textContent=selected?selected.displayName:'HOW TO PLAY';
    if(selected){
      overlayBody.innerHTML=`<div class="ruleDetail">${ruleVisual(selected)}<strong>${escapeHtml(selected.shortDescription)}</strong><p>${escapeHtml(selected.rulesDescription)}</p></div>`;
      overlayPrimary.textContent='BACK';overlayPrimary.onclick=()=>{auxOverlay={type:'rulebook',sectionId:null};renderAuxOverlay()};
      overlaySecondary.style.display='inline-block';overlaySecondary.textContent='CLOSE';overlaySecondary.onclick=closeAuxOverlay;
      return
    }
    overlayBody.innerHTML=`<div class="rulebookList">${sections.map(s=>`<button class="rulebookItem" data-rule="${s.id}"><strong>${escapeHtml(s.displayName)}</strong><span>${escapeHtml(s.shortDescription)}</span></button>`).join('')}</div><div class="rulebookFoot">Hold any domino for about ${Math.round((D.LONG_PRESS_MS||500)/100)/10}s to inspect that physical tile.</div>`;
    overlayBody.querySelectorAll('[data-rule]').forEach(b=>b.onclick=()=>openRulebookSection(b.dataset.rule));
    overlayPrimary.textContent='CLOSE';overlayPrimary.onclick=closeAuxOverlay
  }
  function renderInspector(){
    const model=H.inspectTile(GAME.state(),auxOverlay.tileId)||auxOverlay.model,b=model.baseTile,m=model.currentMachineState;
    auxOverlay.model=model;overlayTitle.textContent=`[${b.a}|${b.b}]`;
    const properties=[b.isDouble?'Double':'Standard domino',b.containsZero?'Contains zero':null].filter(Boolean).join(' · ');
    const debugId=viewRun?`<div class="inspectDebug">ID ${escapeHtml(b.id)}</div>`:'';
    const modifierHtml=model.modifiers.length?model.modifiers.map(mod=>`<div class="inspectModifier"><strong>${escapeHtml(mod.displayName)}</strong><span>${escapeHtml(mod.shortDescription)}</span><p>${escapeHtml(mod.rulesDescription)}</p></div>`).join(''):'<p class="inspectEmpty">No modifier is attached to this physical tile.</p>';
    const starLabel=m.upgradeTier?`★${m.upgradeTier} · can pay +${m.starCoins}c when activated`:'No stars · +0c';
    const bestLabel=`Best Output with this tile: ${m.bestOutput==null?'—':fmt(m.bestOutput)}`,longRun=model.machineModifiers.find(mod=>mod.id==='long-run');
    const stateRows=[starLabel,bestLabel,`Recorded Move activations: ${m.activations||0}`,longRun?'LONG RUN · at 10+ unique routed tiles, every activated star pays once.':m.upgradeTier?'Normal star rule · only the highest activated tier pays.':'Round-clearing overkill can add stars to this physical tile.'];
    overlayBody.innerHTML=`<div class="inspector"><section class="inspectSection"><div class="inspectLabel">Base Tile</div><div class="inspectHero"><strong>[${b.a}|${b.b}]</strong><span>${escapeHtml(properties)}</span></div>${debugId}<div class="opPair"><span>${b.a}: ${operationLabel(b.operations[0])}</span><span>${b.b}: ${operationLabel(b.operations[1])}</span></div></section><section class="inspectSection"><div class="inspectLabel">Modifiers</div>${modifierHtml}</section><section class="inspectSection"><div class="inspectLabel">Current Machine State</div><div class="stateRows">${stateRows.map(row=>`<span>${escapeHtml(row)}</span>`).join('')}</div></section></div>`;
    overlayPrimary.textContent='CLOSE';overlayPrimary.onclick=closeAuxOverlay
  }
  function renderAuxOverlay(){
    if(!auxOverlay)return;
    resetOverlay();overlay.classList.add('aux');modalEl.classList.add('auxModal');overlay.onclick=e=>{if(e.target===overlay)closeAuxOverlay()};
    auxOverlay.type==='rulebook'?renderRulebook():renderInspector()
  }

  function runSummary(){
    const x=GAME.snapshot(),turns=x.turns.filter(e=>Number.isInteger(e.turn)),mvp=turns.reduce((b,e)=>!b||e.output>b.output?e:b,null);let addOps=0,multOps=0,rebounds=0;
    for(const e of turns){addOps+=(e.ops.match(/:\+/g)||[]).length;multOps+=(e.ops.match(/:×/g)||[]).length;rebounds+=e.rebounds||0}
    return{roundsCleared:x.round.clears.length,totalRounds:x.round.total,tilesPlayed:x.turnCount,bestOutput:x.score.best,mvpTile:mvp?{a:mvp.tile.a,b:mvp.tile.b,output:mvp.output,round:mvp.round,placement:mvp.roundTurn}:null,addOps,multOps,rebounds,rerolls:x.turns.filter(e=>e.type==='reroll').length,purchases:x.turns.filter(e=>e.type==='shop-buy'||e.type==='tile-buy'||e.type==='double-double'||e.type==='market-mod-buy').length,coins:x.coins,inflation:x.inflation,consumables:x.consumables,setSize:x.setSize,machine:x.board.length,endless:x.endless}
  }
  function summaryHtml(){const r=runSummary(),m=r.mvpTile;return`<div class="summary"><div class="sumCard wide"><div class="sumLabel">MVP TILE</div><div class="sumValue">${m?`[${m.a}|${m.b}] → ${fmt(m.output)}`:'—'}</div><div class="sumSmall">${m?`Best activation · Round ${m.round}, move ${m.placement}`:'No placement yet'}</div></div><div class="sumCard"><div class="sumLabel">PROGRESS</div><div class="sumValue">${r.endless?.active?`${D.TOTAL_ROUNDS}/${D.TOTAL_ROUNDS} + ${r.endless.roundsCleared}`:`${r.roundsCleared}/${r.totalRounds}`}</div><div class="sumSmall">${r.endless?.active?'Base complete · Endless clears':'Rounds cleared'}</div></div><div class="sumCard"><div class="sumLabel">MACHINE</div><div class="sumValue">${r.machine}</div><div class="sumSmall">${r.setSize} tiles in set</div></div><div class="sumCard wide"><div class="sumLabel">SCORE SOURCES</div><div class="sumValue">${r.multOps} multipliers · ${r.addOps} additions</div><div class="sumSmall">${r.rebounds} rebounds · Best ${fmt(r.bestOutput)}</div></div><div class="sumCard wide"><div class="sumLabel">ECONOMY</div><div class="sumValue">${r.coins} coins · Inflation ${r.inflation}</div><div class="sumSmall">Move ${r.consumables.move} · Reroll ${r.consumables.reroll} · Undo ${r.consumables.undo} · ${r.purchases} purchases</div></div></div>`}

  function advanceRound(){
    const before=GAME.snapshot().stage.index;clearOutcomeDelay();const ok=GAME.advance();if(!ok){toast('Resolve Market first');return}
    GAME.save();hideOverlay();handFx.fill('normal');render();const after=GAME.snapshot().stage.index;if(after>before)toast(`STAGE ${after} · BOARD ${E.G}×${E.H}`)
  }
  function startEndless(){clearOutcomeDelay();if(!GAME.startEndless()){toast('Endless unavailable');return}GAME.save();hideOverlay();handFx.fill('normal');render();toast(GAME.state().shopOpen?'ENDLESS · STAGE MARKET':`ENDLESS · ROUND ${GAME.state().round+1}`)}
  function showClear(){
    resetOverlay();const s=GAME.state(),x=GAME.snapshot(),complete=x.status==='COMPLETE',endless=!!x.endless?.active,last=s.wins[s.wins.length-1];
    overlayTitle.textContent=complete?'RUN COMPLETE':endless?'ENDLESS ROUND CLEAR':'ROUND CLEAR';
    overlayBody.innerHTML=complete?`<p>Base run complete · Final output ${fmt(s.score)} · Target ${fmt(GAME.target())}</p>${summaryHtml()}<p class="shopFoot">Continue with the same machine. Endless Targets scale ×${D.ENDLESS_TARGET_MULTIPLIER||5} every round; the completed base run remains recorded.</p>`:`<p>Output ${fmt(s.score)} · Target ${fmt(GAME.target())}<br>Clear +${last?.reward||0}c${last?.upgradeCoins?` · ★ activations +${last.upgradeCoins}c`:''}</p>`;
    if(complete){overlayPrimary.textContent='CONTINUE · ENDLESS';overlayPrimary.onclick=startEndless;overlaySecondary.style.display='inline-block';overlaySecondary.textContent='COPY RUN DATA';overlaySecondary.onclick=copyRun;setNewRunButton(overlayTertiary);return}
    const next=s.nextShopType;overlayPrimary.textContent=next==='market'?'MARKET':endless?'NEXT ENDLESS ROUND':'NEXT ROUND';overlayPrimary.onclick=()=>{if(next==='none'){advanceRound();return}if(GAME.openIntermission()){GAME.save();render()}else toast('Unavailable')};
    if(GAME.canUndo()){overlaySecondary.style.display='inline-block';overlaySecondary.textContent=`UNDO · ${s.consumables.undo}`;overlaySecondary.onclick=useUndo}
  }
  function showShop(){
    resetOverlay();const s=GAME.state(),x=GAME.snapshot(),randomCost=GAME.shopRandomPrice(),offers=M.all().filter(m=>m.kind==='consumable');overlayTitle.textContent='SHOP';
    overlayBody.innerHTML=`<div class="bigShop"><div class="shopHero"><div><div class="label">Always available</div><strong>${s.coins}c</strong><div class="shopInflation">Inflation ${s.inflation}</div></div><div class="label">Supply<br>${x.availableTileCount} tiles</div></div><div class="shopSection"><h3>RANDOM DOMINO</h3><p>Add one random new physical domino to this run. If your hand has an empty slot it arrives there; otherwise it becomes the next reserve draw.</p><button id="shopRandomBuy" class="shopBuy">BUY RANDOM TILE · ${randomCost}c</button></div><div class="shopSection"><h3>TOOLS</h3><p>Stored tools remain available until you spend them.</p><div class="marketDescriptions">${offers.map(m=>`<div class="marketDesc"><strong>${m.name} · ${GAME.shopItemPrice(m.id)}c</strong><span>${m.description}</span><button class="shopBuy" data-shop-item="${m.id}">BUY ${m.name}</button></div>`).join('')}</div></div><div class="shopFoot">Every purchase raises global Inflation by 1, including future Market prices.</div></div>`;
    const random=$('shopRandomBuy');random.disabled=s.coins<randomCost;random.onclick=()=>{const r=GAME.buyShopRandomTile();if(!r.ok){toast('Not enough coins');return}GAME.save();toast(`[${r.tile.a}|${r.tile.b}] → ${r.delivery} · Inflation ${r.inflation}`);render()};
    overlayBody.querySelectorAll('[data-shop-item]').forEach(b=>{const id=b.dataset.shopItem,cost=GAME.shopItemPrice(id);b.disabled=s.coins<cost;b.onclick=()=>{const r=GAME.buyShopItem(id);if(!r.ok){toast(r.reason==='coins'?'Not enough coins':'Purchase failed');return}GAME.save();toast(`${M.get(id).name} stored · Inflation ${r.inflation}`);render()}});
    overlayPrimary.textContent='CLOSE SHOP';overlayPrimary.onclick=()=>{GAME.closeShop();GAME.save();render()}
  }
  function showMarket(){
    resetOverlay();const s=GAME.state(),x=GAME.snapshot(),nextStage=x.stage.index+1,nextSize=D.BOARD_SIZES[Math.min(nextStage-1,D.BOARD_SIZES.length-1)],bought=s.marketBuys[0]?.mod||null;overlayTitle.textContent='MARKET';
    const supply=x.availableTileCount,nextMarket=x.endless?.active?`Next Market in ${D.STAGE_SIZE||3} rounds`:x.round.index<D.TOTAL_ROUNDS-(D.STAGE_SIZE||3)?`Next Market in ${D.STAGE_SIZE||3} rounds`:'Final stage · no later Market',offers=s.shopOffers.map(id=>GAME.marketOfferInfo(id));
    overlayBody.innerHTML=`<div class="bigShop"><div class="shopHero"><div><div class="label">Stage ${x.stage.index} complete</div><strong>${s.coins}c</strong><div class="shopInflation">Inflation ${s.inflation}</div><div class="shopSupply">SUPPLY ${supply} · ${nextMarket}</div></div><div class="label">Next board<br>${nextSize[0]} × ${nextSize[1]}</div></div><div class="marketChoiceTitle">CHOOSE ONE</div><div class="marketOfferGrid">${offers.length?offers.map(info=>{const mod=info.mod,purchased=bought===info.id,locked=!!bought&&!purchased,noTarget=info.targetCount<1,label=purchased?'PURCHASED':locked?'LOCKED':noTarget?'NO VALID TARGET':`BUY · ${info.price}c`,target=mod.target==='machine'?'Machine modifier':`${info.targetCount} valid physical target${info.targetCount===1?'':'s'}`;return `<section class="marketOffer ${purchased?'purchasedOffer':locked?'lockedOffer':''}"><div class="marketOfferHead"><strong>${escapeHtml(mod.displayName||mod.name)}</strong><span>${info.price}c</span></div><p>${escapeHtml(mod.shortDescription||mod.description)}</p><div class="marketTarget ${noTarget?'invalid':''}">${escapeHtml(target)}</div><button class="shopBuy" data-market-mod="${info.id}" ${purchased||locked||noTarget||s.coins<info.price?'disabled':''}>${label}</button></section>`}).join(''):'<p class="inspectEmpty">No valid Market mods for the current machine.</p>'}</div><div class="shopFoot">You may buy at most one mod in this Market, or continue without buying. Every purchase raises global Inflation by 1.</div></div>`;
    overlayBody.querySelectorAll('[data-market-mod]').forEach(b=>{b.onclick=()=>{const id=b.dataset.marketMod,r=GAME.buyMarketMod(id),mod=M.get(id);if(!r.ok){toast(r.reason==='coins'?'Not enough coins':r.reason==='no-target'?'No valid target':'Market choice locked');return}GAME.save();toast(r.tile?`${mod.displayName||mod.name} → [${r.tile.a}|${r.tile.b}]`:`${mod.displayName||mod.name} installed`);render()}});
    overlayPrimary.textContent=`CONTINUE TO STAGE ${nextStage}`;overlayPrimary.onclick=()=>{GAME.closeMarket();GAME.save();advanceRound()}
  }

  function showNoMoves(){
    resetOverlay();const s=GAME.state();overlayTitle.textContent='NO LEGAL MOVES';overlayBody.innerHTML=`<p>No tile in your hand can continue the machine. Spend a stored Reroll, buy help in the Shop, Undo the last move, or start a new run.</p>`;
    overlayPrimary.textContent=`REROLL · ${s.consumables.reroll}`;overlayPrimary.disabled=!GAME.canUseReroll();overlayPrimary.onclick=doReroll;
    overlaySecondary.style.display='inline-block';overlaySecondary.textContent='SHOP';overlaySecondary.onclick=openPermanentShop;
    if(GAME.canUndo()){overlayTertiary.style.display='inline-block';overlayTertiary.textContent=`UNDO · ${s.consumables.undo}`;overlayTertiary.onclick=useUndo}else setNewRunButton(overlayTertiary)
  }
  function showFailed(){
    resetOverlay();const s=GAME.state(),x=GAME.snapshot(),endless=!!x.endless?.active,noTiles=s.failureReason==='no-tiles',limit=s.failureReason==='placement-limit';overlayTitle.textContent=endless?'ENDLESS OVER':noTiles?'NO TILES LEFT':'ROUND FAILED';
    const reason=noTiles?'Your physical set is exhausted. The Shop can still sell you a random physical domino if you can afford one.':limit?'You used every move for this round. The Shop can sell stored Move tools.':'No legal continuation remains.';
    overlayBody.innerHTML=`<p>${endless?`Base run complete · Endless reached Round ${s.round+1}.<br>`:''}${reason}</p>${summaryHtml()}<button id="copyFailedRun" class="shopBuy secondary">COPY RUN DATA</button>`;
    overlayBody.querySelector('#copyFailedRun').onclick=copyRun;
    let slot=0,buttons=[overlayPrimary,overlaySecondary,overlayTertiary];
    if(GAME.canOpenShop()){const b=buttons[slot++];b.style.display='inline-block';b.textContent='SHOP';b.onclick=openPermanentShop}
    if(limit&&GAME.canUseMove()){const b=buttons[slot++];b.style.display='inline-block';b.textContent=`+1 MOVE · ${s.consumables.move}`;b.onclick=useMove}
    if(GAME.canUndo()&&slot<buttons.length){const b=buttons[slot++];b.style.display='inline-block';b.textContent=`UNDO · ${s.consumables.undo}`;b.onclick=useUndo}
    const b=buttons[slot++]||overlayTertiary;setNewRunButton(b)
  }

  function render(){
    const s=GAME.state(),x=GAME.snapshot();H.bindRun(s.runId);renderBoard();renderHand();scoreEl.textContent=fmt(s.score);targetEl.textContent=fmt(GAME.target());stageEl.textContent=`${x.stage.index}/${x.endless?.active?'∞':x.stage.total}`;roundEl.textContent=`${s.round+1}/${x.endless?.active?'∞':D.TOTAL_ROUNDS}`;movesEl.textContent=`${s.roundTurn}/${GAME.maxPlacements()}`;tilesEl.textContent=x.availableTileCount;coinEl.textContent=s.coins;stageRoundEl.textContent=x.endless?.active?`ENDLESS · STAGE ${x.stage.index} · ROUND ${x.stage.round}/${x.stage.size}`:`STAGE ${x.stage.index} · ROUND ${x.stage.round}/${x.stage.size}`;boardSizeEl.textContent=`${E.G} × ${E.H}`;
    shopBtn.textContent=`Shop · ${s.coins}c`;shopBtn.disabled=uiBusy||!GAME.canOpenShop();moveBtn.textContent=`Move +1 · ${s.consumables.move}`;moveBtn.disabled=uiBusy||!GAME.canUseMove();rerollBtn.textContent=`Reroll · ${s.consumables.reroll}`;rerollBtn.disabled=uiBusy||!GAME.canUseReroll();undoBtn.textContent=`Undo · ${s.consumables.undo}`;undoBtn.disabled=uiBusy||!GAME.canUndo();
    hint.textContent=s.cleared?'Round cleared.':s.needsReroll?'No legal placements. Reroll, Shop or Undo can help.':s.blocked?(s.failureReason==='no-tiles'?'No physical tiles remain. The Shop may rescue the run.':s.failureReason==='placement-limit'?'No moves remain.':'The round is over.'):s.pieces.length===0?'Opening rule: the first tile must be a double.':`Build the machine · ${GAME.maxPlacements()-s.roundTurn} moves remaining.`;renderLog();
    if(auxOverlay){renderAuxOverlay();return}
    if(uiBusy){hideOverlay();return}
    if(s.shopOpen){s.shopType==='market'?showMarket():showShop();return}
    if(!s.running){const waiting=(s.cleared||s.blocked)&&performance.now()<outcomeOverlayNotBefore;if(waiting)hideOverlay();else if(s.cleared)showClear();else if(s.needsReroll)showNoMoves();else if(s.blocked)showFailed();else hideOverlay()}
  }

  function center(c,r){const p=E.pieceFrom(drag.tile,c.x,c.y,0,c.rr,-1);return{x:(p.rect.minx+p.rect.maxx)/2/E.G*r.width,y:(p.rect.miny+p.rect.maxy)/2/E.H*r.height}}
  function nearest(x,y){const r=board.getBoundingClientRect(),lx=x-r.left,ly=(y-D.DRAG_Y_OFFSET)-r.top;if(lx<0||ly<0||lx>r.width||ly>r.height)return null;let pick=null,d0=1e9;for(const c of drag.candidates){const q=center(c,r),d=Math.hypot(q.x-lx,q.y-ly);if(d<d0){d0=d;pick=c}}return d0<=82?pick:null}
  function maybeShakeRotate(e){const s=GAME.state();if(s.pieces.length)return;const now=performance.now(),dx=e.clientX-drag.lastX;if(Math.abs(dx)>=D.SHAKE_THRESHOLD){const sign=Math.sign(dx);if(drag.lastSign&&sign!==drag.lastSign){if(!drag.shakeStarted||now-drag.shakeStarted>D.SHAKE_WINDOW_MS){drag.switches=1;drag.shakeStarted=now}else drag.switches++;if(drag.switches>=D.SHAKE_SWITCHES&&now-drag.lastRotate>D.SHAKE_COOLDOWN_MS){GAME.rotateRoot();drag.candidates=GAME.candidatesForIndex(drag.index);drag.candidate=null;drag.lastRotate=now;drag.switches=0;drag.shakeStarted=now;if(navigator.vibrate)navigator.vibrate(12);updateFloatRotation();toast(`Opening tile ${ARROW[GAME.state().rootRR]}`)}}drag.lastSign=sign;drag.lastX=e.clientX}}
  function updateFloatRotation(){if(drag.float)drag.float.style.setProperty('--rr',GAME.state().rootRR)}
  function startDrag(e,i){if(uiBusy||auxOverlay||!GAME.canInteract())return;e.preventDefault();const s=GAME.state(),cs=GAME.candidatesForIndex(i);if(!cs.length)return;const f=document.createElement('div');f.className='dragFloat';f.innerHTML=mini(s.hand[i]);document.body.appendChild(f);drag={active:true,index:i,tile:{...s.hand[i]},candidates:cs,candidate:null,float:f,lastX:e.clientX,lastSign:0,switches:0,shakeStarted:performance.now(),lastRotate:0};renderHand();updateFloatRotation()}
  function moveDrag(e){if(!drag.active)return;e.preventDefault();maybeShakeRotate(e);if(drag.float){drag.float.style.left=e.clientX+'px';drag.float.style.top=(e.clientY-D.DRAG_Y_OFFSET)+'px'}const c=nearest(e.clientX,e.clientY),o=drag.candidate,changed=(!c)!==(!o)||c&&(!o||c.x!==o.x||c.y!==o.y||c.rr!==o.rr);drag.candidate=c;if(drag.float)drag.float.style.opacity=c?'0':'0.96';if(changed)renderBoard()}
  async function animateDrawSlot(i){if(!GAME.state().hand[i]){handFx[i]='hidden';renderHand();await wait(100);handFx[i]='normal';renderHand();return}handFx[i]='back';renderHand();await wait(D.DRAW_BLACK_MS);handFx[i]='reveal';renderHand();await wait(390);handFx[i]='normal';renderHand()}
  async function endDrag(e){if(!drag.active)return;moveDrag(e);const i=drag.index,c=drag.candidate;if(drag.float)drag.float.remove();drag={active:false,index:-1,tile:null,candidates:[],candidate:null,float:null};renderBoard();if(!c){renderHand();return}const ctx=GAME.beginPlacement(i,c);if(!ctx.ok){toast(ctx.reason==='tile-already-in-machine'?'Tile already in machine':'Invalid placement');render();return}const drawAnim=animateDrawSlot(i);renderBoard();await animate(ctx.p,ctx.trigger,ctx.sim);const result=GAME.finishPlacement(ctx);GAME.save();await drawAnim;if(GAME.state().cleared||GAME.state().blocked)armOutcomeDelay();render();if(GAME.state().cleared)toast(`Round clear · ${fmt(GAME.state().score)}`);else if(result.upgradeCoins)toast(`★ +${result.upgradeCoins} coins`)}

  const press=GEST.createPressGesture({delay:D.LONG_PRESS_MS||500,tolerance:D.LONG_PRESS_MOVE_TOLERANCE_PX||10,onLongPress:meta=>{if(navigator.vibrate)navigator.vibrate(8);openTileInspector(meta.tileId)},onDragStart:(meta,e)=>{if(meta.kind==='hand')startDrag(e,meta.index)}});
  function handlePointerMove(e){press.move(e);if(drag.active)moveDrag(e)}
  async function handlePointerUp(e){press.end(e);if(drag.active)await endDrag(e)}
  function handlePointerCancel(e){press.cancel();if(drag.active)endDrag(e)}
  window.addEventListener('pointermove',handlePointerMove,{passive:false});window.addEventListener('pointerup',handlePointerUp);window.addEventListener('pointercancel',handlePointerCancel);

  function pc(id){return GAME.state().pieces.find(p=>p.id===id)}
  function magnitude(v){const n=Math.abs(Number(v)||0);return n<1?1:Math.floor(Math.log10(n))+1}
  function fx(x,y,t,value=0){const d=document.createElement('div'),digits=magnitude(value),duration=(D.CASCADE_FX_BASE_MS||1200)+digits*(D.CASCADE_FX_PER_DIGIT_MS||90),size=Math.min(D.CASCADE_FX_MAX_PX||42,(D.CASCADE_FX_BASE_PX||14)+digits*(D.CASCADE_FX_PER_DIGIT_PX||3.2));d.className='opfx';d.style.left=px(x);d.style.top=py(y);d.style.fontSize=`${size}px`;d.style.animationDuration=`${duration}ms`;d.textContent=t;board.appendChild(d);setTimeout(()=>d.remove(),duration+120)}
  function reboundFx(x,y,angle=180){const d=document.createElement('div'),duration=D.CASCADE_FX_BASE_MS||1200;d.className='opfx reboundFx';d.style.left=px(x);d.style.top=py(y);d.style.animationDuration=`${duration}ms`;d.innerHTML='<span class="reboundArrow" aria-hidden="true">→</span>';d.firstChild.style.transform=`rotate(${angle}deg)`;board.appendChild(d);setTimeout(()=>d.remove(),duration+120)}
  function finalFx(v){const d=document.createElement('div'),digits=magnitude(v),duration=(D.CASCADE_FINAL_MS||1800)+Math.min(700,digits*55),size=Math.min(D.CASCADE_FINAL_MAX_PX||68,30+digits*4);d.className='finalfx';d.style.fontSize=`${size}px`;d.style.animationDuration=`${duration}ms`;d.textContent=fmt(v);board.appendChild(d);setTimeout(()=>d.remove(),duration+120);return duration}
  async function animate(p,trigger,sim){renderBoard();fx((p.rect.minx+p.rect.maxx)/2,(p.rect.miny+p.rect.maxy)/2,`+${fmt(trigger)}`,trigger);await wait(260);let lastOp=null;for(const e of sim.events||[]){if(e.type==='op'){lastOp=e;if(e.value!==0){const pp=pc(e.piece),c=pp?.cubes.find(x=>x.half===e.exitHalf);if(c){const label=e.op==='multiply'?`×${e.factor}${e.doubleDouble?' DD':''}`:`+${e.add}${e.doubleDouble?' DD':''}`;fx(c.x+1,c.y+1,label,e.after);await wait(180)}}}else if(e.type==='rebound'){const pp=pc(e.piece),entry=pp&&lastOp?.piece===e.piece?pp.cubes.find(x=>x.half===lastOp.entryHalf):null,exit=pp&&lastOp?.piece===e.piece?pp.cubes.find(x=>x.half===lastOp.exitHalf):null,c=exit||pp?.cubes.find(x=>x.v===0)||pp?.cubes[0];if(c){const angle=entry&&exit?Math.atan2(entry.y-exit.y,entry.x-exit.x)*180/Math.PI:180;reboundFx(c.x+1,c.y+1,angle);await wait(180)}}}const finalDuration=finalFx(sim.output??trigger);await wait(Math.min(1400,Math.max(900,finalDuration-500)))}

  async function doReroll(){if(uiBusy||!GAME.canUseReroll())return;uiBusy=true;hideOverlay();handFx.fill('hidden');renderHand();await wait(90);const r=GAME.reroll();if(!r.ok){uiBusy=false;handFx.fill('normal');render();return}GAME.save();handFx.fill('back');renderHand();await wait(D.REROLL_BLACK_MS);for(let i=0;i<D.HAND_SIZE;i++){if(GAME.state().hand[i])handFx[i]='reveal';renderHand();await wait(D.HAND_REVEAL_STAGGER_MS)}await wait(300);handFx.fill('normal');uiBusy=false;if(GAME.state().blocked)armOutcomeDelay();render()}

  function fullDebugText(){H.bindRun(GAME.state().runId);return`${GAME.debugText()}\n\n${H.debugTelemetryText()}`}
  function renderLog(){
    runlog.innerHTML='';runlog.classList.toggle('show',viewRun);if(!viewRun)return;
    runlog.style.zIndex='610';
    const controls=document.createElement('div');Object.assign(controls.style,{position:'sticky',top:'0',display:'flex',justifyContent:'flex-end',gap:'4px',paddingBottom:'6px',background:'rgba(248,245,237,.98)',zIndex:'2'});
    const copy=document.createElement('button');copy.className='tool';copy.textContent='COPY';copy.onclick=copyRun;
    const close=document.createElement('button');close.className='tool';close.textContent='CLOSE';close.onclick=()=>{viewRun=false;renderLog()};
    const text=document.createElement('textarea');text.className='runDataText';text.readOnly=true;text.value=fullDebugText();Object.assign(text.style,{display:'block',width:'100%',height:'calc(46dvh - 42px)',minHeight:'120px',resize:'none',border:'0',outline:'0',padding:'0',margin:'0',background:'transparent',color:'inherit',font:'inherit',lineHeight:'1.45',whiteSpace:'pre-wrap'});
    controls.append(copy,close);runlog.append(controls,text)
  }
  async function copyRun(){
    const text=fullDebugText();GAME.save();let ok=false;
    if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(text);ok=true}catch(_){}}
    if(!ok){const ta=document.createElement('textarea');ta.value=text;ta.readOnly=true;Object.assign(ta.style,{position:'fixed',left:'0',top:'0',width:'1px',height:'1px',opacity:'0.01',zIndex:'700'});document.body.appendChild(ta);ta.focus();ta.select();try{ta.setSelectionRange(0,text.length)}catch(_){}try{ok=!!document.execCommand?.('copy')}catch(_){}ta.remove()}
    if(ok){toast('Run data copied');return true}
    viewRun=true;renderLog();const ta=runlog.querySelector('.runDataText');if(ta){ta.focus();ta.select();try{ta.setSelectionRange(0,ta.value.length)}catch(_){}}toast('Copy blocked · run data selected');return false
  }
  shopBtn.onclick=openPermanentShop;moveBtn.onclick=useMove;rerollBtn.onclick=doReroll;undoBtn.onclick=useUndo;resetBtn.onclick=()=>{if(uiBusy)return;if(!confirm('Start a new run?'))return;newRun()};helpBtn.onclick=openRulebook;copyBtn.onclick=copyRun;viewBtn.onclick=()=>{viewRun=!viewRun;renderLog();if(auxOverlay?.type==='inspector')renderAuxOverlay()};
  GAME.save();render();
})();
