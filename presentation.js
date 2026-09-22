(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.IterionPresentation=api;
  if(root&&root.document&&root.addEventListener)root.addEventListener('load',()=>api.installUiPolish(root));
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  // Display only. Never feed formatted values or animation timing into the engine.
  const BRAND='MONOID';
  const UNITS=['M','B','T','Qa','Qi','Sx','Sp','Oc','No','Dc'];
  // Hold the opening activations long enough to teach the arithmetic, then accelerate.
  // The tail still reaches the historic 60 ms floor so large Endless machines stay practical.
  const CASCADE=Object.freeze({introMs:Object.freeze([600,600,560,520,480,440]),tailMs:320,minMs:60,decay:0.70,maxLabels:8,retainedLabels:10,settleMs:300,resolveHoldMs:190,resolveFadeMs:180,finalMs:500,scoreTweenMs:360,subtotalHoldMs:360,settleItemMs:360,resonanceSettleMs:420,operationFlashMs:190,structuralFxMs:760,contributionLimit:8});
  function exact(value){return Number.isFinite(value)?Math.round(value).toLocaleString('en-US',{maximumFractionDigits:0}):String(value)}
  function scaledText(value){const decimals=value<10?2:value<1000?1:0,rounded=Number(value.toFixed(decimals));return rounded.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:decimals})}
  function compact(value){if(!Number.isFinite(value))return String(value);const whole=Math.round(value),sign=whole<0?'-':'',n=Math.abs(whole);if(n<1000000)return exact(whole);let tier=0;while(tier<UNITS.length-1&&n>=100*(10**(6+3*(tier+1))))tier++;const divisor=10**(6+3*tier),scaled=n/divisor;if(tier===UNITS.length-1&&scaled>=100000)return whole.toExponential(2).replace(/\.00e/,'e').replace(/(\.\d)0e/,'$1e').replace('e+','e');return sign+scaledText(scaled)+UNITS[tier]}
  function scoreDisplay(score,target){score=Math.max(0,Number(score)||0);target=Math.max(1,Number(target)||1);const ratio=score/target,overdrive=ratio>=1000,text=overdrive?`×${compact(ratio)}`:compact(score),note=score<target?(score>0&&ratio>=.95?`${compact(target-score)} to target`:'Last move'):overdrive?'TARGET MULTIPLIER':ratio>=2?`×${compact(ratio)} target`:'Target reached';return{score:text,target:compact(target),note,ratio,overdrive,mode:overdrive?'multiplier':'absolute'}}
  function cascadeDelay(index){index=Math.max(0,Math.floor(Number(index)||0));if(index<CASCADE.introMs.length)return CASCADE.introMs[index];return Math.max(CASCADE.minMs,Math.round(CASCADE.tailMs*CASCADE.decay**(index-CASCADE.introMs.length)))}
  function effectLifetime(index){return Math.max(480,cascadeDelay(index)+280)}
  function operationHalf(event,mainOperation){return event.exitHalf??(mainOperation?.piece===event.piece?mainOperation.exitHalf:undefined)}
  function fitFontSize(fontSize,measuredWidth,availableWidth){return measuredWidth>availableWidth?fontSize*Math.max(0,availableWidth)/measuredWidth:fontSize}
  function signalPlan(events){const echo=events.filter(e=>e.type.startsWith('echo-')).map(e=>({...e,type:e.type.slice(5)}));const main=events.filter(e=>!e.type.startsWith('echo-')&&e.type!=='double-echo-result');return{main,echo,result:events.find(e=>e.type==='double-echo-result')||null}}
  function forkBlock(events,start){const fork=events[start].piece,branches=[];let i=start+1;while(i<events.length){const e=events[i];if(e.type==='signal-start'&&e.fork===fork){let j=i+1;while(j<events.length&&!(events[j].type==='signal-end'&&events[j].fork===fork&&events[j].arm===e.arm))j++;if(j>=events.length)return null;branches.push({arm:e.arm,events:events.slice(i+1,j),end:events[j]});i=j+1;continue}if(e.type==='signal-join'&&e.piece===fork)return{branches:branches.sort((a,b)=>a.arm-b.arm),join:e,next:i+1};i++}return null}
  function armLabel(arm){arm=Math.max(0,Math.floor(Number(arm)||0));return arm<26?String.fromCharCode(65+arm):String(arm+1)}
  function terminalContributions(events,family='main',path='',fallbackOutput=0,fallbackPiece=null){
    events=Array.isArray(events)?events:[];let lastOp=null,hadFork=false,opAfterFork=false;const leaves=[];
    for(let i=0;i<events.length;i++){
      const e=events[i];
      if(e.type==='signal-fork'){
        const block=forkBlock(events,i);if(!block)continue;hadFork=true;
        for(const branch of block.branches){const childPath=path+(path?'.':'')+armLabel(branch.arm);leaves.push(...terminalContributions(branch.events,family,childPath,branch.end?.output,e.piece))}
        i=block.next-1;continue
      }
      if(e.type==='op'){if(hadFork)opAfterFork=true;lastOp=e}
    }
    if(hadFork&&!opAfterFork&&leaves.length)return leaves;
    const fallback=Number(fallbackOutput),opOutput=Number(lastOp?.after),output=Number.isFinite(fallback)?fallback:opOutput;
    if(!Number.isFinite(output))return[];
    return[{family,path,output,piece:lastOp?.piece??fallbackPiece??null,half:lastOp?.exitHalf??null}]
  }
  function contributionLabel(item){if(item?.label)return item.label;const prefix=item?.family==='echo'?'ECHO':item?.family==='main'?'MAIN':'OTHER';return item?.path?`${prefix} ${item.path}`:prefix}
  function groupCascadeContributions(items,max=CASCADE.contributionLimit){
    const input=(items||[]).map((item,index)=>({...item,order:index})).filter(item=>Number.isFinite(Number(item.output)));max=Math.max(2,Math.floor(Number(max)||CASCADE.contributionLimit));
    if(input.length<=max)return input.map(item=>({...item,label:contributionLabel(item)}));
    const ranked=[...input].sort((a,b)=>Math.abs(Number(b.output))-Math.abs(Number(a.output))||a.order-b.order),keep=new Set(ranked.slice(0,max-1).map(item=>item.order));
    const kept=input.filter(item=>keep.has(item.order)),rest=input.filter(item=>!keep.has(item.order)),other={family:'other',path:'',label:`OTHER ×${rest.length}`,output:rest.reduce((sum,item)=>sum+Number(item.output),0),piece:null,half:null,order:Math.max(...input.map(item=>item.order))+1,grouped:true};
    return[...kept,other].sort((a,b)=>a.order-b.order).map(item=>({...item,label:contributionLabel(item)}))
  }
  function cascadeSettlementPlan(events,output,fallbackPiece=null,max=CASCADE.contributionLimit){
    const plan=signalPlan(events||[]),target=Number(output)||0;let items=[];
    if(plan.result){items.push(...terminalContributions(plan.main,'main','',plan.result.mainOutput,fallbackPiece));items.push(...terminalContributions(plan.echo,'echo','',plan.result.echoOutput,plan.result.piece??fallbackPiece))}
    else items.push(...terminalContributions(plan.main,'main','',target,fallbackPiece));
    items=groupCascadeContributions(items,max);const sum=items.reduce((total,item)=>total+Number(item.output),0),tolerance=Math.max(1,Math.abs(target))*1e-9;
    if(!items.length||Math.abs(sum-target)>tolerance)return[{family:'main',path:'',label:'RESULT',output:target,piece:fallbackPiece,half:null,order:0,fallback:true}];
    return items
  }
  function progressState(score,target){score=Math.max(0,Number(score)||0);target=Math.max(1,Number(target)||1);const ratio=score/target;if(score<target)return{stage:'target',progress:Math.max(0,Math.min(1,ratio)),next:'TARGET'};return{stage:ratio>=1000?'overdrive':'clear',progress:1,next:`×${compact(ratio)} TARGET`}}
  function tileViewModel(tile,state={}){
    if(!tile)return Object.freeze({id:null,upgrade:0,powerMultiplier:1,circuitRank:0,modifiers:Object.freeze([])});
    const id=tile.id||null,setTile=id?(state.set||[]).find(t=>t?.id===id):null;
    const upgrade=Math.min(3,Math.max(0,Number(tile.upgrade||setTile?.upgrade)||0));
    const powerMultiplier=Math.max(1,Number(tile.powerMultiplier)||1);
    const circuitRank=Math.max(0,Number(state.circuitRanks?.[id])||0);
    const modifiers=[];if(id&&state.doubleDoubleTileId===id)modifiers.push(Object.freeze({label:'DD',className:'dd'}));if(id&&state.doubleEchoTileId===id)modifiers.push(Object.freeze({label:'DE',className:'de'}));if(id&&state.tripleDoubleTileId===id)modifiers.push(Object.freeze({label:'TD',className:'td'}));if(id&&Array.isArray(state.zeroPortTileIds)&&state.zeroPortTileIds.includes(id))modifiers.push(Object.freeze({label:'ZP',className:'zp'}));if(id&&state.parityExchangeTileId===id)modifiers.push(Object.freeze({label:'PX',className:'px'}));if(id&&state.cornerTileId===id)modifiers.push(Object.freeze({label:'CR',className:'cr'}));if(id&&state.longLineTileId===id)modifiers.push(Object.freeze({label:'LN',className:'ln'}));if(id&&state.overloadTileId===id)modifiers.push(Object.freeze({label:'OV',className:'ov'}));if(id&&state.terminalTileId===id)modifiers.push(Object.freeze({label:'TE',className:'te'}));if(id&&state.sequenceTileId===id)modifiers.push(Object.freeze({label:'SQ',className:'sq'}));if(id&&state.complementTileId===id)modifiers.push(Object.freeze({label:'C6',className:'c6'}));if(id&&state.twinTileId===id)modifiers.push(Object.freeze({label:'TW',className:'tw'}));if(id&&state.pairTileId===id)modifiers.push(Object.freeze({label:'PR',className:'pr'}));if(id&&state.bridgeTileId===id)modifiers.push(Object.freeze({label:'BR',className:'br'}));if(id&&state.gateTileId===id)modifiers.push(Object.freeze({label:'GT',className:'gt'}));if(id&&state.fanTileId===id)modifiers.push(Object.freeze({label:'FN',className:'fn'}));if(id&&state.frameTileId===id)modifiers.push(Object.freeze({label:'FM',className:'fm'}));if(id&&state.crownTileId===id)modifiers.push(Object.freeze({label:'CW',className:'cw'}));if(id&&state.frontierTileId===id)modifiers.push(Object.freeze({label:'FT',className:'ft'}));if(id&&state.relayTileId===id)modifiers.push(Object.freeze({label:'RL',className:'rl'}));if(id&&state.couplerTileId===id)modifiers.push(Object.freeze({label:'CP',className:'cp'}));if(id&&state.resonatorTileId===id)modifiers.push(Object.freeze({label:'RS',className:'rs'}));if(id&&state.forgeTileId===id)modifiers.push(Object.freeze({label:'FG',className:'fg'}));if(id&&state.foundationTileId===id)modifiers.push(Object.freeze({label:'FD',className:'fd'}));if(id&&state.knotTileId===id)modifiers.push(Object.freeze({label:'KN',className:'kn'}));if(id&&state.mirrorTileId===id)modifiers.push(Object.freeze({label:'MR',className:'mr'}));if(id&&state.mintTileId===id)modifiers.push(Object.freeze({label:'MT',className:'mt'}));
    return Object.freeze({id,upgrade,powerMultiplier,circuitRank,modifiers:Object.freeze(modifiers)})
  }
  function longChainViewModel(state={},cap=7){
    cap=Math.max(1,Number(cap)||7);const owned=(state.mods||[]).includes('long-run'),used=Math.max(0,Number(state.endlessLongRunActivations)||0),remaining=Math.max(0,cap-used),endless=!!state.endlessMode,visible=owned&&(!endless||remaining>0),ratio=endless?remaining/cap:1;
    return Object.freeze({owned,used,remaining,cap,endless,visible,ratio,ariaLabel:endless?`Long Chain · ${remaining} of ${cap} Endless activations remaining`:'Long Chain ready'})
  }
  function hudViewModel(state={},snapshot={},options={}){
    const target=Number(options.target)||0,maxPlacements=Math.max(0,Number(options.maxPlacements)||0),totalRounds=Math.max(0,Number(options.totalRounds)||0),boardWidth=Number(options.boardWidth)||0,boardHeight=Number(options.boardHeight)||0,endless=!!snapshot.endless?.active,display=scoreDisplay(Number(state.score)||0,target),power=snapshot.powerSets||{};
    const movesRemaining=Math.max(0,maxPlacements-(Number(state.roundTurn)||0)),stageRound=(endless?`ENDLESS · STAGE ${snapshot.stage?.index} · ROUND ${snapshot.stage?.round}/${snapshot.stage?.size} · STRAIN ${state.systemStrain||0}`:`STAGE ${snapshot.stage?.index} · ROUND ${snapshot.stage?.round}/${snapshot.stage?.size}`)+(power.generation>1?` · POWER ×${power.powerMultiplier}`:'');
    const hint=state.cleared?'Round cleared.':state.needsReroll?'No legal placements. Reroll, Shop or Undo can help.':state.blocked?(state.failureReason==='placement-limit'?'No moves remain.':'The round is over.'):(state.pieces||[]).length===0?'Opening rule: the first tile must be a double.':`Build the machine · ${movesRemaining} moves remaining.`;
    return Object.freeze({score:display.score,target:display.target,note:display.note,scoreExact:exact(Number(state.score)||0),targetExact:exact(target),scoreRatio:display.ratio,scoreOverdrive:display.overdrive,scoreMode:display.mode,stage:`${snapshot.stage?.index}/${endless?'∞':snapshot.stage?.total}`,round:`${(Number(state.round)||0)+1}/${endless?'∞':totalRounds}`,moves:`${Number(state.roundTurn)||0}/${maxPlacements}`,movesRemaining,tilesLeft:snapshot.availableTileCount??0,coins:Number(state.coins)||0,stageRound,stageRoundIndex:snapshot.stage?.round,endless,boardSize:`${boardWidth} × ${boardHeight}`,hint,longChain:longChainViewModel(state,options.longChainCap)})
  }
  function brandDebugText(text){return String(text||'').replace(/^(?:NOMON|MONOID) DEBUG/m,`${BRAND} DEBUG`)}
  function debugFilename(text){text=brandDebugText(text);const safe=s=>String(s).trim().replace(/[^a-zA-Z0-9._-]+/g,'-'),batch=/^MONOID PLAYTEST BATCH\b/m.test(text),version=(text.match(batch?/^Version:\s*([^\r\n]+)/m:/^MONOID DEBUG v([^\r\n]+)/m)||[])[1]||'unknown',id=(text.match(batch?/^Batch ID:\s*([^\r\n]+)/m:/^Run ID:\s*([^\r\n]+)/m)||[])[1]||(batch?'batch':'run');return batch?`${BRAND}_PLAYTEST_v${safe(version)}_${safe(id)}.txt`:`${BRAND}_DEBUG_v${safe(version)}_${safe(id)}.txt`}
  function installUiPolish(root){
    const doc=root?.document;if(!doc||root.__nomonUiPolishInstalled)return;root.__nomonUiPolishInstalled=true;
    doc.title=`${BRAND}${root.IterionData?.VERSION?` v${root.IterionData.VERSION}`:''}`;const wordmark=doc.querySelector('.wordmark');if(wordmark)wordmark.textContent=BRAND;
    const style=doc.createElement('style');style.id='nomon-ui-polish';style.textContent=`
      .powerTile.power2{--power-pale:#dbe6ec}.powerTile.power3{--power-pale:#e5ddea}.powerTile.power4{--power-pale:#e8dfbd}
      .domino.powerTile:not(.circuitTile),.piece.powerTile:not(.circuitTile){color:#171717}
      .domino.powerTile:not(.circuitTile)::before,.piece.powerTile:not(.circuitTile)::before{content:"";position:absolute;inset:0;background:var(--power-pale);z-index:0;pointer-events:none}
      .powerTile:not(.circuitTile) .half,.powerTile:not(.circuitTile) .cube{position:relative;z-index:1}
      .powerTile:not(.circuitTile) .pip,.powerTile:not(.circuitTile) .spip{background:#171717;z-index:2}
      .powerTile:not(.circuitTile) .half+.half,.piece.powerTile:not(.circuitTile).h .cube+.cube,.piece.powerTile:not(.circuitTile).v .cube+.cube{border-color:#4b4a45}
      .powerMark{opacity:0!important}
      .circuitRankMark{display:none!important}
      .upgradeDot{display:none!important}
      .overkillTier1{--overkill-color:#4f86b7}.overkillTier2{--overkill-color:#9a70b5}.overkillTier3{--overkill-color:#d39a2f}
      .domino.overkillTier1 .half+.half,.domino.overkillTier2 .half+.half,.domino.overkillTier3 .half+.half{border-top-color:var(--overkill-color)!important;border-top-width:3px!important}
      .piece.h.overkillTier1 .cube+.cube,.piece.h.overkillTier2 .cube+.cube,.piece.h.overkillTier3 .cube+.cube{border-left-color:var(--overkill-color)!important;border-left-width:3px!important}
      .piece.v.overkillTier1 .cube+.cube,.piece.v.overkillTier2 .cube+.cube,.piece.v.overkillTier3 .cube+.cube{border-top-color:var(--overkill-color)!important;border-top-width:3px!important}
      .domino:has(>.upgradeDot.u1) .half+.half{border-top-color:#4f86b7!important;border-top-width:3px!important}
      .domino:has(>.upgradeDot.u2) .half+.half{border-top-color:#9a70b5!important;border-top-width:3px!important}
      .domino:has(>.upgradeDot.u3) .half+.half{border-top-color:#d39a2f!important;border-top-width:3px!important}
      .piece.h:has(>.upgradeDot.u1) .cube+.cube{border-left-color:#4f86b7!important;border-left-width:3px!important}
      .piece.h:has(>.upgradeDot.u2) .cube+.cube{border-left-color:#9a70b5!important;border-left-width:3px!important}
      .piece.h:has(>.upgradeDot.u3) .cube+.cube{border-left-color:#d39a2f!important;border-left-width:3px!important}
      .piece.v:has(>.upgradeDot.u1) .cube+.cube{border-top-color:#4f86b7!important;border-top-width:3px!important}
      .piece.v:has(>.upgradeDot.u2) .cube+.cube{border-top-color:#9a70b5!important;border-top-width:3px!important}
      .piece.v:has(>.upgradeDot.u3) .cube+.cube{border-top-color:#d39a2f!important;border-top-width:3px!important}
      .inspectOverkillPreview{display:flex;align-items:center;justify-content:flex-start;gap:10px;margin:10px 0 2px}.inspectOverkillDomino{display:flex;flex-direction:column;width:46px;border:1.5px solid #1d1d1d;border-radius:6px;overflow:hidden;background:#fbf8f0;box-shadow:1px 2px 3px rgba(25,23,19,.10)}.inspectOverkillHalf{height:34px;display:flex;align-items:center;justify-content:center;font:750 18px/1 ui-monospace,monospace}.inspectOverkillHalf+.inspectOverkillHalf{border-top:3px solid var(--overkill-color)}.inspectOverkillLegend{font:700 11px/1.25 ui-monospace,monospace;letter-spacing:.05em;color:#4c4a44}.inspectOverkillLegend small{display:block;margin-top:3px;font:500 10px/1.3 -apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif;letter-spacing:0;color:#77736b}
      .signalValue{min-width:0!important;padding:1px 3px!important;border:0!important;background:transparent!important;box-shadow:none!important;display:flex!important;gap:3px!important;align-items:center!important}
      .signalValue small,.signalValue strong{display:none!important}.signalValue span{font-size:13px!important;font-weight:800!important;padding:2px 5px!important;border:1px solid rgba(21,21,21,.24)!important;border-radius:3px!important;background:rgba(251,250,246,.94)!important;color:#20201d!important}
      .signalValue[data-lane*="."]{display:grid!important;grid-template-columns:auto!important;gap:1px!important;padding:2px 4px!important;border:1px solid rgba(21,21,21,.2)!important;background:rgba(251,250,246,.94)!important}
      .signalValue[data-lane*="."] small{display:block!important;font-size:7px!important;line-height:1!important}.signalValue[data-lane*="."] strong{display:none!important}.signalValue[data-lane*="."] span{border:0!important;background:transparent!important;padding:0!important;font-size:10px!important;line-height:1.1!important}
      .signalValue.cascadeActive{animation:cascadeChipIn 100ms ease-out both!important}
      .opfx.operationFlash{z-index:42!important;font-size:13px!important;font-weight:820!important;letter-spacing:-.02em!important;white-space:nowrap!important;animation:cascadeOperationFlash var(--cascade-flash-ms,190ms) ease-out both!important}
      .opfx.operationFlash.add{color:#fff!important;-webkit-text-stroke:1px #151515!important}
      .opfx.operationFlash.multiply{color:#151515!important;-webkit-text-stroke:1.5px #fff!important}
      .opfx.cascadeStructural{z-index:43!important;width:max-content!important;max-width:calc(100% - 16px)!important;padding:3px 5px!important;border:1px solid rgba(21,21,21,.24)!important;border-radius:3px!important;background:rgba(251,250,246,.95)!important;color:#20201d!important;font-size:9px!important;font-weight:800!important;letter-spacing:.08em!important;text-transform:uppercase!important;-webkit-text-stroke:0!important;box-shadow:none!important;animation:structuralHold var(--cascade-structure-ms,760ms) ease-out both!important}
      .opfx.cascadeStructural.echoLane{border-style:dashed!important}
      .signalValue.echoLane{border-style:dashed!important;opacity:.8}.joinFx{font-size:11px!important;background:rgba(251,250,246,.94)!important;box-shadow:none!important;padding:3px 5px!important;border:1px solid rgba(21,21,21,.18)!important}
      .cascadeSubtotal{z-index:44!important;display:grid!important;grid-template-columns:auto!important;gap:2px!important;min-width:52px!important;padding:5px 7px!important;border:1px solid rgba(21,21,21,.28)!important;border-radius:4px!important;background:rgba(251,250,246,.97)!important;color:#20201d!important;-webkit-text-stroke:0!important;box-shadow:none!important;text-align:left!important;animation:cascadeChipIn 120ms ease-out both!important}
      .cascadeSubtotal.echoContribution{border-style:dashed!important}.cascadeSubtotal small{font-size:8px!important;font-weight:700!important;line-height:1!important;letter-spacing:.06em!important;color:#6f6b64!important}.cascadeSubtotal strong{font-size:16px!important;font-weight:820!important;line-height:1!important;font-variant-numeric:tabular-nums!important}
      .cascadeSubtotal.cascadeToScore{animation:cascadeScoreOut 220ms ease-in both!important}
      @keyframes cascadeChipIn{from{opacity:0;transform:translate(-50%,-50%) scale(.84)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
      @keyframes cascadeScoreOut{from{opacity:1;transform:translate(-50%,-50%) scale(1)}to{opacity:0;transform:translate(-50%,-68%) scale(.88)}}
      @keyframes cascadeOperationFlash{0%{opacity:0;transform:translate(-50%,-50%) scale(.82)}28%,65%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-62%) scale(.94)}}
      @keyframes structuralHold{0%{opacity:0;transform:translate(-50%,-50%) scale(.9)}12%,78%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-54%) scale(.98)}}
      .scoreProgress{display:block;margin-top:2px;height:11px;position:relative}.scoreProgressTrack{display:block;height:3px;background:#dddcd6;overflow:hidden}.scoreProgressFill{display:block;height:100%;width:0;background:#393934;transition:width .22s linear,background-color .22s ease}.scoreProgressNext{display:block;margin-top:1px;text-align:right;font:650 7px/1.1 ui-monospace,monospace;letter-spacing:.05em;color:#858078}
      .scoreProgress[data-stage="clear"] .scoreProgressFill{background:#6e6b63}
      .scoreProgress[data-stage="overdrive"] .scoreProgressFill{background:#b3261e}
      .scoreProgress[data-stage="overdrive"] .scoreProgressNext{color:#b3261e}
      .scoreCard.scoreOverdrive .scoreValue{color:#b3261e}
      .scoreCard.scoreOverdrive .scoreCaption{color:#b3261e}
      .scoreCard.scoreLive .scoreValue{font-variant-numeric:tabular-nums}
    `;doc.head.appendChild(style);
    const score=doc.getElementById('score'),scoreDetail=doc.getElementById('scoreDetail'),targetDetail=doc.getElementById('targetDetail'),scoreNote=doc.getElementById('scoreNote'),board=doc.getElementById('board'),runlog=doc.getElementById('runlog'),menuCopy=doc.getElementById('copyrun'),viewRun=doc.getElementById('viewrun'),gameMenu=doc.getElementById('gameMenu'),toast=doc.getElementById('toast'),overlayBody=doc.getElementById('overlayBody'),overlayTitle=doc.getElementById('overlayTitle');if(!score||!scoreDetail||!targetDetail||!board)return;
    const overkillClasses=['overkillTier1','overkillTier2','overkillTier3'];
    const syncOverkillTile=el=>{if(!el?.classList)return;el.classList.remove(...overkillClasses);const dot=[...el.children].find(child=>child.classList?.contains('upgradeDot'));if(!dot)return;for(let tier=1;tier<=3;tier++)if(dot.classList.contains(`u${tier}`)){el.classList.add(`overkillTier${tier}`);break}};
    const syncOverkillTiles=node=>{if(!node)return;if(node.matches?.('.domino,.piece'))syncOverkillTile(node);node.querySelectorAll?.('.domino,.piece').forEach(syncOverkillTile)};
    const syncInspectorPreview=()=>{const inspector=overlayBody?.querySelector('.inspector');if(!inspector)return;const state=inspector.querySelector('.stateRows span'),match=state?.textContent?.match(/^★([1-3])\b/),existing=inspector.querySelector('.inspectOverkillPreview');if(!match){existing?.remove();return}const tier=Number(match[1]),values=overlayTitle?.textContent?.match(/^\[(\d+)\|(\d+)\]$/),a=values?.[1]||'?',b=values?.[2]||'?',key=`${tier}:${a}:${b}`;if(existing?.dataset.key===key)return;const preview=existing||doc.createElement('div');preview.className='inspectOverkillPreview';preview.dataset.key=key;preview.innerHTML=`<div class="inspectOverkillDomino overkillTier${tier}" aria-hidden="true"><div class="inspectOverkillHalf">${a}</div><div class="inspectOverkillHalf">${b}</div></div><div class="inspectOverkillLegend">OVERKILL ${tier}<small>Physical centre line</small></div>`;const hero=inspector.querySelector('.inspectHero');if(!existing)hero?.insertAdjacentElement('afterend',preview)};
    syncOverkillTiles(doc);syncInspectorPreview();
    const visualObserver=new MutationObserver(records=>{let inspectorDirty=false;for(const record of records)for(const node of record.addedNodes){if(node.nodeType!==1)continue;syncOverkillTiles(node);if(node.matches?.('.inspector')||node.querySelector?.('.inspector'))inspectorDirty=true}if(inspectorDirty||overlayBody?.querySelector('.inspector'))syncInspectorPreview()});visualObserver.observe(doc.body,{childList:true,subtree:true});
    const bar=doc.createElement('span');bar.className='scoreProgress';bar.setAttribute('aria-hidden','true');bar.innerHTML='<i class="scoreProgressTrack"><i class="scoreProgressFill"></i></i><i class="scoreProgressNext">TARGET</i>';scoreDetail.insertBefore(bar,scoreNote||null);const fill=bar.querySelector('.scoreProgressFill'),next=bar.querySelector('.scoreProgressNext');
    const ariaNumber=(el,prefix)=>{const label=el?.getAttribute('aria-label')||'',m=label.match(new RegExp(`${prefix}\\s+([-+0-9,.eE]+)`,'i'));return m?Number(m[1].replace(/,/g,'')):NaN};let targetValue=()=>ariaNumber(targetDetail,'Target'),displayed=ariaNumber(scoreDetail,'Score'),raf=0,animating=false;
    const paintProgress=value=>{const state=progressState(value,targetValue());bar.dataset.stage=state.stage;fill.style.width=`${Math.round(state.progress*10000)/100}%`;next.textContent=state.next};const paintScore=value=>{const display=scoreDisplay(value,targetValue());score.textContent=display.score;scoreDetail.classList.toggle('scoreOverdrive',display.overdrive);scoreDetail.dataset.scoreMode=display.mode;return display};if(!Number.isFinite(displayed))displayed=0;paintScore(displayed);paintProgress(displayed);
    const snapScore=value=>{value=Number(value);if(!Number.isFinite(value))return 0;if(raf)root.cancelAnimationFrame(raf);raf=0;animating=false;displayed=value;paintScore(value);paintProgress(value);scoreDetail.classList.remove('scoreLive');return value};const tweenScore=(value,duration=CASCADE.scoreTweenMs)=>{value=Number(value);if(!Number.isFinite(value))return 0;duration=Math.max(0,Number(duration)||0);if(!duration){snapScore(value);return 0}if(raf)root.cancelAnimationFrame(raf);const from=Number.isFinite(displayed)?displayed:value,start=root.performance.now();animating=true;scoreDetail.classList.add('scoreLive');const step=now=>{const t=Math.min(1,(now-start)/duration),eased=1-Math.pow(1-t,3),v=from+(value-from)*eased,visible=value>=from?Math.floor(v):Math.ceil(v);displayed=v;paintScore(visible);paintProgress(v);if(t<1)raf=root.requestAnimationFrame(step);else{displayed=value;paintScore(value);paintProgress(value);animating=false;scoreDetail.classList.remove('scoreLive');raf=0}};raf=root.requestAnimationFrame(step);return duration};
    const syncFromUi=()=>{const v=ariaNumber(scoreDetail,'Score');if(Number.isFinite(v)&&!animating){displayed=v;paintScore(v);paintProgress(v)}else{paintScore(displayed);paintProgress(displayed)}};new MutationObserver(syncFromUi).observe(scoreDetail,{attributes:true,attributeFilter:['aria-label']});new MutationObserver(()=>paintProgress(displayed)).observe(targetDetail,{attributes:true,attributeFilter:['aria-label']});
    // SCORE is intentionally frozen for the whole cascade. The machine owns the
    // intermediate arithmetic; canonical render() commits only the resolved result.
    const feedback=text=>{if(!toast)return;toast.textContent=text;toast.classList.add('show');root.setTimeout(()=>toast.classList.remove('show'),1300)};
    const debugTextFromUi=()=>{let ta=runlog?.querySelector('.runDataText');if(ta)return brandDebugText(ta.value);const wasOpen=runlog?.classList.contains('show');try{viewRun?.click()}catch(_){}ta=runlog?.querySelector('.runDataText');const text=brandDebugText(ta?.value||'');if(!wasOpen&&runlog?.classList.contains('show')){try{viewRun?.click()}catch(_){}}return text};
    const downloadDebug=(text,filename)=>{const blob=new Blob([text],{type:'text/plain'}),url=root.URL.createObjectURL(blob),a=doc.createElement('a');a.href=url;a.download=filename;a.style.display='none';doc.body.appendChild(a);a.click();root.setTimeout(()=>{root.URL.revokeObjectURL(url);a.remove()},0)};
    const shareDebug=async textOverride=>{const text=brandDebugText(typeof textOverride==='string'?textOverride:debugTextFromUi());if(!text){feedback('Debug unavailable');return false}const batch=/^MONOID PLAYTEST BATCH\b/m.test(text),filename=debugFilename(text),file=new File([text],filename,{type:'text/plain'}),label=batch?'PLAYTEST':'DEBUG';if(root.navigator?.share){let canFiles=true;try{if(root.navigator.canShare)canFiles=root.navigator.canShare({files:[file]})}catch(_){canFiles=false}if(canFiles){try{await root.navigator.share({files:[file],title:`${BRAND} ${label}`});feedback(`${label} READY`);return true}catch(err){if(err?.name==='AbortError')return false}}}try{downloadDebug(text,filename);feedback(`${label} READY`);return true}catch(_){feedback('Debug export failed');return false}};
    const sharePlaytest=()=>typeof root.__monoidSharePlaytestBatch==='function'?root.__monoidSharePlaytestBatch():shareDebug();const patchRunlog=()=>{const ta=runlog?.querySelector('.runDataText');if(ta)ta.value=brandDebugText(ta.value);const button=runlog?.querySelector('.tool');if(!button||button.dataset.debugShare==='1')return;button.dataset.debugShare='1';button.textContent='SHARE .TXT';button.onclick=sharePlaytest};if(runlog){new MutationObserver(patchRunlog).observe(runlog,{childList:true,subtree:true});patchRunlog()}if(menuCopy){menuCopy.textContent='Share debug .txt';menuCopy.onclick=async()=>{try{if(gameMenu?.open)gameMenu.close()}catch(_){}await sharePlaytest()}}root.NomonUiPolish=Object.freeze({shareDebug,debugTextFromUi,paintProgress,snapScore,tweenScore,syncOverkillTiles,syncInspectorPreview})
  }
  return Object.freeze({compact,exact,scoreDisplay,cascadeDelay,effectLifetime,operationHalf,fitFontSize,signalPlan,forkBlock,armLabel,terminalContributions,groupCascadeContributions,cascadeSettlementPlan,progressState,tileViewModel,longChainViewModel,hudViewModel,brandDebugText,debugFilename,installUiPolish,CASCADE,BRAND});
});
