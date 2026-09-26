(function(root,factory){
  const api=factory(root.IterionData,root.IterionMods,root.IterionEngine,root.MonoidModGuidance);
  if(typeof module==='object'&&module.exports) module.exports=factory(require('./data.js'),require('./mods.js'),require('./engine.js'),require('./mod-guidance.js'));
  root.IterionHelp=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(D,M,E,MG){
  const sectionOrder=['goal','placement','rotation','hand','scoring','routing','doubles','zeros','parity','persistence','power','economy','modifiers','circuits'];
  const telemetryByRun=new Map();
  let activeRunId='session';

  function operationFor(value,doubleDouble=false,isDouble=false,powerMultiplier=1){
    const state={output:10};
    const op=E.applyOp(value,isDouble,state,doubleDouble,powerMultiplier);
    return Object.freeze({value,type:op.type,add:op.add||0,factor:op.factor||0,before:op.before,after:op.after,doubleDouble:!!op.doubleDouble,powerMultiplier:op.powerMultiplier||1});
  }
  function operationText(value){
    const op=operationFor(value);
    if(op.type==='add')return `${value} adds ${op.add} to the current Score.`;
    if(op.type==='multiply')return `${value} multiplies the current Score by ×${op.factor}.`;
    if(op.type==='zero')return '0 does not change Score by arithmetic; its effect is handled by routing.';
    return `${value} has no scoring operation.`;
  }
  function modifierText(){
    return M.all().filter(mod=>mod.market).map(mod=>`${mod.displayName||mod.name}: ${mod.rulesDescription||mod.description}`).join(' ');
  }
  function rulebookSections(){
    const sections={
      circuits:{id:'circuits',displayName:'Circuits',visual:'PHYSICAL LOOP → ONE TILE → RANK I–V',shortDescription:'Close a physical loop to develop one of its tiles.',rulesDescription:'A new loop of 4–6 / 7–9 / 10+ physical tiles awards +2 / +3 / +4 ranks to one tile you choose, capped at V. Up to three Circuit Tiles may exist during the base run. Endless adds one Circuit Tile slot at the start of every three-round Endless Stage. Once the current limit is full, only an existing non-maxed Circuit Tile in the loop can develop. One Primary Circuit rewards per Move, and each physical cycle only once. Different overlapping cycles can develop the same tile. Circuit Tiles are black: white I, green II, blue III, purple IV, gold V pips. Their +50%, +100%, +200%, +400%, +800% Resonance bonuses add together and amplify final Main + Echo Score. Each activated physical tile counts once per Move. New ranks apply from the next Move. Stars remain separate.'},
      goal:{id:'goal',displayName:'Goal / Target',visual:'SCORE ≥ TARGET',shortDescription:'Reach the Target before the round runs out of moves or legal continuations.',rulesDescription:`Score resets to 0 at the start of each round. Reach or exceed the current Target to clear the round. The machine itself ${D.PERSIST_MACHINE_BETWEEN_ROUNDS?'stays on the board between rounds':'does not persist between rounds'}. After Round ${D.TOTAL_ROUNDS}, a completed run may continue in Endless. The base win stays recorded and each later Target is ×${D.ENDLESS_TARGET_MULTIPLIER||5} the previous one.`},
      placement:{id:'placement',displayName:'Placement',visual:'[2|4]—[4|6]  ✓     [2|4]—[5|6]  ×',shortDescription:'Build one connected domino machine.',rulesDescription:'The opening tile must be a double. After that, a placed domino must touch the existing machine through matching values, stay inside the board, and not overlap another tile. POWER tiles keep their printed values for placement. The current machine is built on the ground plane.'},
      rotation:{id:'rotation',displayName:'Rotation',visual:'↻ 90°',shortDescription:'Dominoes can use 90° orientations.',rulesDescription:'Drag a tile toward a legal position. Candidate placements use the engine’s valid 90° orientations. For the opening tile, shake left-right while dragging to rotate it.'},
      hand:{id:'hand',displayName:'Hand / Draw / Reroll',visual:`HAND ${D.HAND_SIZE} → PLACE → DRAW 1`,shortDescription:`The hand holds up to ${D.HAND_SIZE} dominoes.`,rulesDescription:'After a successful placement, one replacement tile is drawn from the remaining physical set. Each round grants one free full-hand Reroll; it is spent before stored Rerolls and does not stack into the next round. When every physical tile in the current set has been placed, a new complete POWER set is created automatically.'},
      scoring:{id:'scoring',displayName:'Scoring',visual:'[a|b] → trigger a+b → MACHINE',shortDescription:'A placement creates a trigger, then the connected machine transforms Score.',rulesDescription:`The newly placed domino starts the Move with a trigger equal to the sum of its two printed values. Activated values then use the engine operations. ${[0,1,2,3,4,5,6].map(operationText).join(' ')} POWER ×2 / ×3 / ×4 tiles keep the same printed values and initial trigger; their operation magnitude scales only after the canonical route has been selected.`},
      routing:{id:'routing',displayName:'Routing',visual:'NEW → [ ] ──→ [ ]',shortDescription:'The signal travels through connected pieces.',rulesDescription:'The routing engine evaluates valid connected paths deterministically. When several complete routes are possible, the current engine compares them by traversals first, then Score, then rebounds, then path length. POWER does not change placement, routing or the comparator. The Rulebook does not reveal a best placement.'},
      doubles:{id:'doubles',displayName:'Doubles',visual:'T → TWO SIGNALS → SUM',shortDescription:'A non-zero double can distribute a signal to both ends.',rulesDescription:'Matching full-half contacts allow L connections; the centred long-side port remains available. On a forward centred entry, a non-zero double with both short ends connected splits once per Move. Its normal operation resolves first, then both arms receive that full Score and their final results add together. Printed values do not change. Each branch keeps its rebound history. The same physical double cannot split again that Move. [0|0] keeps its zero/rebound behaviour and never splits. Double Echo creates one additional downstream signal; if that Echo later reaches a valid T split, it obeys the same split rule, but it can never create another Echo. Stars and Circuit Resonance count each physical tile only once across all signals.'},
      zeros:{id:'zeros',displayName:'Zeros',visual:'→ 0 ↩',shortDescription:'Zero changes routing rather than Score arithmetic.',rulesDescription:'When the signal exits through 0, Score is unchanged and the route rebounds. A non-double zero piece has one rebound charge; [0|0] has the double-specific two-charge behaviour implemented by the routing engine. POWER does not change zero or rebound behaviour.'},
      parity:{id:'parity',displayName:'Odd / Even',visual:'1 · 3 · 5  ×     2 · 4 · 6  +',shortDescription:'Odd and even values use different engine operations.',rulesDescription:`${[1,3,5].map(operationText).join(' ')} ${[2,4,6].map(operationText).join(' ')} POWER tiles keep the same parity: their odd multiplier factor or even addition scales by ×2 / ×3 / ×4. Zero is handled separately.`},
      persistence:{id:'persistence',displayName:'Machine Persistence',visual:'ROUND 1 MACHINE → ROUND 2 MACHINE',shortDescription:'Earlier placements shape later rounds.',rulesDescription:`Machine persistence is currently ${D.PERSIST_MACHINE_BETWEEN_ROUNDS?'ON':'OFF'}. Cleared rounds reset Score and round resources, while placed physical dominoes remain part of the machine. The board expands at the start of each new stage according to the configured board sizes. New POWER set generations extend the same persistent machine rather than replacing it.`},
      power:{id:'power',displayName:'POWER Sets',visual:'SET I ×1 → II ×2 → III ×3 → IV+ ×4',shortDescription:'Exhausting a physical set unlocks a stronger complete set.',rulesDescription:`Set I is the normal double-six set. When every physical tile in the current set has been placed, MONOID automatically adds another complete 28-tile set with new physical IDs. This can happen in any round, before Endless. Set II is POWER ×2, Set III ×3, and Set IV and later ×4. Odd multiplier factors and even additions scale by that magnitude; 0 and the printed-value trigger are unchanged. POWER never changes matching values, parity, placement legality or routing. Random dominoes bought after POWER is unlocked inherit the current POWER generation. Buying extra tiles before exhaustion delays the next set. Circuit Tiles still turn black; an explicit ×2 / ×3 / ×4 mark preserves their POWER identity. Earlier tiles retain their own generation.`},
      economy:{id:'economy',displayName:'Tile Shop / Market',visual:`TILE SHOP anytime     MARKET every ${D.STAGE_SIZE} rounds`,shortDescription:'Tile Shop grows the physical set; tools live on the gameplay controls.',rulesDescription:`The Tile Shop is available during active rounds and sells only physical dominoes: one hidden Random Domino plus four visible seeded dominoes from the next POWER set. A bought visible domino is delivered immediately and its physical ID is removed from the future set so it cannot appear twice. Move, Reroll and Undo are bought directly from their gameplay buttons when that stored resource is exhausted. The purchase panel can buy several at once; each unit applies Inflation sequentially, exactly as separate purchases would. Every round grants one free Reroll. It is spent before stored Rerolls and refreshes to one rather than accumulating when the next round begins. The Market appears after each ${D.STAGE_SIZE}-round stage and presents up to ${D.MARKET_OFFER_COUNT||3} valid build-mod offers. Choose at most one; you may continue without buying. Buying a tile Mod closes the Market and highlights compatible physical dominoes on the board so you choose the installation target. Zero Port links two zero-containing tiles; once a pair exists, buying it again relocates one endpoint. DD and DE remain exclusive tile modifications. Every purchase increases global Inflation by 1. Economy Mods can turn routing, saving, spending and long-term ownership into coins or operation strength: MINT pays on activation, BROKER discounts the next Market purchase, BANK rewards a large wallet, SPEND rewards a small wallet, TOLL can be explicitly armed to spend 1 coin and repeat one operation, and FOUNDATION matures every ${D.FOUNDATION_MARKETS||3} Markets. In Endless, every placed domino adds 1 System Strain to every Tile Shop, tool and Market price. Undo removes the Strain from the placement it rewinds, while purchases made after that placement stay spent and stay owned. LONG CHAIN can grant its full multi-star payout on only ${D.ENDLESS_LONG_RUN_ACTIVATIONS||7} qualifying Endless Moves; afterwards the normal highest-star-wins rule returns.`},
      modifiers:{id:'modifiers',displayName:'Modifiers',visual:'BASE TILE + MODIFIER',shortDescription:'Tools and tile modifications alter specific parts of a run.',rulesDescription:modifierText()||'No modifiers are registered in this build.'}
    };
    return sectionOrder.map(id=>Object.freeze({...sections[id]}));
  }

  function emptyTelemetry(){return{help_open_count:0,help_section_opened:{}}}
  function storageKey(runId){return`iterion.helpTelemetry.v1.${runId}`}
  function readStored(runId){
    if(typeof localStorage==='undefined')return null;
    try{const raw=localStorage.getItem(storageKey(runId));return raw?JSON.parse(raw):null}catch(_){return null}
  }
  function writeStored(runId,value){
    if(typeof localStorage==='undefined')return;
    try{localStorage.setItem(storageKey(runId),JSON.stringify(value))}catch(_){}
  }
  function ensureTelemetry(runId=activeRunId){
    if(!telemetryByRun.has(runId)){
      const stored=readStored(runId),value=stored&&Number.isFinite(stored.help_open_count)&&stored.help_section_opened?stored:emptyTelemetry();
      telemetryByRun.set(runId,value)
    }
    return telemetryByRun.get(runId)
  }
  function bindRun(runId){activeRunId=runId||'session';ensureTelemetry(activeRunId);return telemetrySnapshot()}
  function recordRulebookOpen(){const t=ensureTelemetry();t.help_open_count++;writeStored(activeRunId,t);return t.help_open_count}
  function recordSectionOpen(id){
    if(!sectionOrder.includes(id))return false;
    const t=ensureTelemetry();t.help_section_opened[id]=(t.help_section_opened[id]||0)+1;writeStored(activeRunId,t);return true
  }
  function telemetrySnapshot(){const t=ensureTelemetry();return{help_open_count:t.help_open_count,help_section_opened:{...t.help_section_opened}}}
  function resetTelemetry(runId=activeRunId){const t=emptyTelemetry();telemetryByRun.set(runId,t);writeStored(runId,t);return telemetrySnapshot()}
  function debugTelemetryText(){
    const t=telemetrySnapshot(),sections=Object.entries(t.help_section_opened).sort(([a],[b])=>a.localeCompare(b)).map(([id,count])=>`${id}=${count}`).join(', ')||'-';
    return[`HELP TELEMETRY`,`help_open_count=${t.help_open_count}`,`help_section_opened: ${sections}`].join('\n')
  }

  function resolveTile(state,tileId){return(state?.set||[]).find(t=>t.id===tileId)||null}
  function tileModifierIds(state,tileId){
    const ids=[];
    if(state.doubleDoubleTileId===tileId)ids.push('double-double');
    if(state.doubleEchoTileId===tileId)ids.push('double-echo');
    if((state.zeroPortTileIds||[]).includes(tileId))ids.push('zero-port');
    if(state.parityExchangeTileId===tileId)ids.push('parity-exchange');
    if(state.cornerTileId===tileId)ids.push('corner');
    if(state.longLineTileId===tileId)ids.push('long-line');
    if(state.overloadTileId===tileId)ids.push('overload');
    if(state.terminalTileId===tileId)ids.push('terminal');
    if(state.diodeTileId===tileId)ids.push('diode');
    if(state.returnTileId===tileId)ids.push('return');
    if(state.twinTileId===tileId)ids.push('twin');
    if(state.pairTileId===tileId)ids.push('pair');
    if(state.bridgeTileId===tileId)ids.push('bridge');
    if(state.gateTileId===tileId)ids.push('gate');
    if(state.fanTileId===tileId)ids.push('fan');
    if(state.brokerTileId===tileId)ids.push('broker');
    if(state.crownTileId===tileId)ids.push('crown');
    if(state.spendTileId===tileId)ids.push('spend');
    if(state.mergeTileId===tileId)ids.push('merge');
    if(state.hingeTileId===tileId)ids.push('hinge');
    if(state.bankTileId===tileId)ids.push('bank');
    if(state.tollTileId===tileId)ids.push('toll');
    if(state.foundationTileId===tileId)ids.push('foundation');
    if(state.knotTileId===tileId)ids.push('knot');
    if(state.mirrorTileId===tileId)ids.push('mirror');
    if(state.mintTileId===tileId)ids.push('mint');
    return ids
  }
  function tileModifiers(state,tile){
    return tileModifierIds(state,tile.id).map(id=>M.get(id)).filter(Boolean).map(mod=>Object.freeze({id:mod.id,displayName:mod.displayName||mod.name,shortDescription:mod.shortDescription||mod.description,rulesDescription:mod.rulesDescription||mod.description,kind:mod.kind,guidance:MG?.get(mod.id)||null,status:MG?.status(mod.id,state,tile.id)||null}))
  }
  function machineModifiers(state){return(state.mods||[]).map(id=>M.get(id)).filter(Boolean).map(mod=>Object.freeze({id:mod.id,displayName:mod.displayName||mod.name,shortDescription:mod.shortDescription||mod.description,rulesDescription:mod.rulesDescription||mod.description,kind:mod.kind,guidance:MG?.get(mod.id)||null,status:MG?.status(mod.id,state,null)||null}))}
  function tileRecord(state,tileId,tier){
    const turns=(state.events||[]).filter(e=>Number.isInteger(e.turn)&&Number.isFinite(Number(e.output))&&(e.tile?.id===tileId||(e.activatedTileIds||[]).includes(tileId)));
    const bestOutput=turns.reduce((best,e)=>best==null||Number(e.output)>best?Number(e.output):best,null);
    const foundationBaseline=Number.isInteger(state.foundationLastPayoutMarket)?state.foundationLastPayoutMarket:Number.isInteger(state.foundationAssignedMarket)?state.foundationAssignedMarket:(Number(state.marketCount)||0),foundationInterval=Math.max(1,Number(D.FOUNDATION_MARKETS)||3),foundationProgress=state.foundationTileId===tileId?Math.max(0,(Number(state.marketCount)||0)-foundationBaseline)%foundationInterval:null;
    const bankMultiplier=state.bankTileId===tileId?((Number(state.coins)||0)>=(D.BANK_HIGH_COINS||20)?D.BANK_HIGH_MOD_MULTIPLIER||3:(Number(state.coins)||0)>=(D.BANK_LOW_COINS||10)?D.BANK_LOW_MOD_MULTIPLIER||2:1):null,spendActive=state.spendTileId===tileId?(Number(state.coins)||0)<(D.SPEND_COIN_THRESHOLD||5):null;
    return Object.freeze({upgradeTier:tier,starCoins:tier,bestOutput,activations:turns.length,modifierIds:Object.freeze(tileModifierIds(state,tileId)),doubleDoubleActive:state.doubleDoubleTileId===tileId,doubleEchoActive:state.doubleEchoTileId===tileId,zeroPortActive:(state.zeroPortTileIds||[]).includes(tileId),longRunOwned:(state.mods||[]).includes('long-run'),foundationProgress,foundationInterval,bankMultiplier,spendActive,tollArmed:state.tollTileId===tileId?!!state.tollArmed:null,brokerDiscountReady:state.brokerTileId===tileId?!!state.brokerDiscountReady:null,mintAvailable:state.mintTileId===tileId?state.mintPaidRound!==state.round:null})
  }
  function inspectTile(state,tileId){
    const tile=resolveTile(state,tileId);if(!tile)return null;
    const modifiers=tileModifiers(state,tile),tier=tile.upgrade||0,powerMultiplier=tile.powerMultiplier||1,generation=tile.generation||1;
    return Object.freeze({
      baseTile:Object.freeze({
        id:tile.id,
        a:tile.a,
        b:tile.b,
        values:Object.freeze([tile.a,tile.b]),
        source:tile.source||'base',
        generation,
        powerMultiplier,
        isDouble:tile.a===tile.b,
        containsZero:tile.a===0||tile.b===0,
        operations:Object.freeze([operationFor(tile.a,false,tile.a===tile.b,powerMultiplier),operationFor(tile.b,false,tile.a===tile.b,powerMultiplier)])
      }),
      modifiers:Object.freeze(modifiers),
      machineModifiers:Object.freeze(machineModifiers(state)),
      circuit:(state.circuitRanks?.[tileId]||0)>0?{rank:state.circuitRanks[tileId],...D.CIRCUIT_RANKS[state.circuitRanks[tileId]-1]}:null,
      power:powerMultiplier>1?Object.freeze({generation,powerMultiplier}):null,
      currentMachineState:tileRecord(state,tileId,tier)
    })
  }

  return{rulebookSections,bindRun,recordRulebookOpen,recordSectionOpen,telemetrySnapshot,resetTelemetry,debugTelemetryText,inspectTile,operationFor};
});
