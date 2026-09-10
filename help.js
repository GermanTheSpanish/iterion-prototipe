(function(root,factory){
  const api=factory(root.IterionData,root.IterionMods,root.IterionEngine);
  if(typeof module==='object'&&module.exports) module.exports=factory(require('./data.js'),require('./mods.js'),require('./engine.js'));
  root.IterionHelp=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(D,M,E){
  const sectionOrder=['goal','placement','rotation','hand','scoring','routing','doubles','zeros','parity','persistence','economy','modifiers','circuits'];
  const telemetryByRun=new Map();
  let activeRunId='session';

  function operationFor(value,doubleDouble=false,isDouble=false){
    const state={output:10};
    const op=E.applyOp(value,isDouble,state,doubleDouble);
    return Object.freeze({value,type:op.type,add:op.add||0,factor:op.factor||0,before:op.before,after:op.after,doubleDouble:!!op.doubleDouble});
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
      circuits:{id:'circuits',displayName:'Circuits',visual:'PHYSICAL LOOP → ONE TILE → RANK I–V',shortDescription:'Close a physical loop to develop one of its tiles.',rulesDescription:'A new loop of 4–6 / 7–9 / 10+ physical tiles awards +2 / +3 / +4 ranks to one tile you choose, capped at V. At most three Circuit Tiles may exist; once full, only an existing non-maxed Circuit Tile in the loop can develop. One Primary Circuit rewards per Move, and each physical cycle only once. Different overlapping cycles can develop the same tile. Circuit Tiles are black: white I, green II, blue III, purple IV, gold V pips. Their +50%, +100%, +200%, +400%, +800% Resonance bonuses add together and amplify final Main + Echo Score. Each activated physical tile counts once per Move. New ranks apply from the next Move. Stars remain separate.'},
      goal:{id:'goal',displayName:'Goal / Target',visual:'SCORE ≥ TARGET',shortDescription:'Reach the Target before the round runs out of moves or legal continuations.',rulesDescription:`Score resets to 0 at the start of each round. Reach or exceed the current Target to clear the round. The machine itself ${D.PERSIST_MACHINE_BETWEEN_ROUNDS?'stays on the board between rounds':'does not persist between rounds'}. After Round ${D.TOTAL_ROUNDS}, a completed run may continue in Endless. The base win stays recorded and each later Target is ×${D.ENDLESS_TARGET_MULTIPLIER||5} the previous one.`},
      placement:{id:'placement',displayName:'Placement',visual:'[2|4]—[4|6]  ✓     [2|4]—[5|6]  ×',shortDescription:'Build one connected domino machine.',rulesDescription:`The opening tile must be a double. After that, a placed domino must touch the existing machine through matching values, stay inside the board, and not overlap another tile. The current machine is built on the ground plane.`},
      rotation:{id:'rotation',displayName:'Rotation',visual:'↻ 90°',shortDescription:'Dominoes can use 90° orientations.',rulesDescription:'Drag a tile toward a legal position. Candidate placements use the engine’s valid 90° orientations. For the opening tile, the current build also supports the left-right shake rotation gesture while dragging.'},
      hand:{id:'hand',displayName:'Hand / Draw / Discard',visual:`HAND ${D.HAND_SIZE} → PLACE → DRAW 1`,shortDescription:`The hand holds up to ${D.HAND_SIZE} dominoes.`,rulesDescription:'After a successful placement, one replacement tile is drawn from the remaining physical set when available. There is no separate single-tile Discard action in the current build. A stored Reroll replaces the full hand.'},
      scoring:{id:'scoring',displayName:'Scoring',visual:'[a|b] → trigger a+b → MACHINE',shortDescription:'A placement creates a trigger, then the connected machine can transform Score.',rulesDescription:`The newly placed domino starts the Move with a trigger equal to the sum of its two values. Activated values then use the engine operations. ${[0,1,2,3,4,5,6].map(operationText).join(' ')}`},
      routing:{id:'routing',displayName:'Routing',visual:'NEW → [ ] ──→ [ ]',shortDescription:'The signal travels through connected pieces.',rulesDescription:'The routing engine evaluates valid connected paths deterministically. When several complete routes are possible, the current engine compares them by traversals first, then Score, then rebounds, then path length. The Rulebook does not reveal a best placement.'},
      doubles:{id:'doubles',displayName:'Doubles',visual:'T → TWO SIGNALS → SUM',shortDescription:'A non-zero double can distribute a signal to both ends.',rulesDescription:'Matching full-half contacts allow L connections; the centred long-side port remains available. On a forward centred entry, a non-zero double with both short ends connected splits once per Move. Its normal operation resolves first, then both arms receive that full Score and their final results add together. Printed values do not change. Each branch keeps its rebound history. The same physical double cannot split again that Move. [0|0] keeps its zero/rebound behaviour and never splits. Double Echo follows one selected downstream path, not both arms. Stars and Circuit Resonance count each physical tile only once across all signals.'},
      zeros:{id:'zeros',displayName:'Zeros',visual:'→ 0 ↩',shortDescription:'Zero changes routing rather than Score arithmetic.',rulesDescription:'When the signal exits through 0, Score is unchanged and the route rebounds. A non-double zero piece has one rebound charge; [0|0] has the double-specific two-charge behaviour implemented by the routing engine.'},
      parity:{id:'parity',displayName:'Odd / Even',visual:'1 · 3 · 5  ×     2 · 4 · 6  +',shortDescription:'Odd and even values use different engine operations.',rulesDescription:`${[1,3,5].map(operationText).join(' ')} ${[2,4,6].map(operationText).join(' ')} Zero is handled separately.`},
      persistence:{id:'persistence',displayName:'Machine Persistence',visual:'ROUND 1 MACHINE → ROUND 2 MACHINE',shortDescription:'Earlier placements shape later rounds.',rulesDescription:`Machine persistence is currently ${D.PERSIST_MACHINE_BETWEEN_ROUNDS?'ON':'OFF'}. Cleared rounds reset Score and round resources, while placed physical dominoes remain part of the machine. The board expands at the start of each new stage according to the configured board sizes.`},
      economy:{id:'economy',displayName:'Shop / Market',visual:`SHOP anytime     MARKET every ${D.STAGE_SIZE} rounds`,shortDescription:'Shop handles survival; Market develops the build.',rulesDescription:`The Shop is available during active rounds and can also rescue some failed states. It sells random physical dominoes plus stored Move, Reroll and Undo tools. Each new Stage after the opening grants one free Stage Reroll. It is spent before stored Rerolls, lasts for that Stage, and refreshes rather than stacking when the next Stage begins. The Market appears after each ${D.STAGE_SIZE}-round stage and presents up to ${D.MARKET_OFFER_COUNT||3} valid build-mod offers. Choose at most one; you may continue without buying. Every purchase increases global Inflation by 1. Undo rewinds the last placement, but Shop purchases made after that placement stay spent and stay owned.`},
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
  function tileModifiers(state,tile){
    const ids=[];
    if(state.doubleDoubleTileId===tile.id)ids.push('double-double');
    if(state.doubleEchoTileId===tile.id)ids.push('double-echo');
    if(state.zeroMemoryTileId===tile.id)ids.push('zero-memory');
    return ids.map(id=>M.get(id)).filter(Boolean).map(mod=>Object.freeze({id:mod.id,displayName:mod.displayName||mod.name,shortDescription:mod.shortDescription||mod.description,rulesDescription:mod.rulesDescription||mod.description,kind:mod.kind}))
  }
  function machineModifiers(state){return(state.mods||[]).map(id=>M.get(id)).filter(Boolean).map(mod=>Object.freeze({id:mod.id,displayName:mod.displayName||mod.name,shortDescription:mod.shortDescription||mod.description,rulesDescription:mod.rulesDescription||mod.description,kind:mod.kind}))}
  function tileRecord(state,tileId,tier){
    const turns=(state.events||[]).filter(e=>Number.isInteger(e.turn)&&Number.isFinite(Number(e.output))&&(e.tile?.id===tileId||(e.activatedTileIds||[]).includes(tileId)));
    const bestOutput=turns.reduce((best,e)=>best==null||Number(e.output)>best?Number(e.output):best,null);
    return Object.freeze({upgradeTier:tier,starCoins:tier,bestOutput,activations:turns.length,doubleDoubleActive:state.doubleDoubleTileId===tileId,doubleEchoActive:state.doubleEchoTileId===tileId,zeroMemoryActive:state.zeroMemoryTileId===tileId,longRunOwned:(state.mods||[]).includes('long-run')})
  }
  function inspectTile(state,tileId){
    const tile=resolveTile(state,tileId);if(!tile)return null;
    const modifiers=tileModifiers(state,tile),tier=tile.upgrade||0;
    return Object.freeze({
      baseTile:Object.freeze({
        id:tile.id,
        a:tile.a,
        b:tile.b,
        values:Object.freeze([tile.a,tile.b]),
        source:tile.source||'base',
        isDouble:tile.a===tile.b,
        containsZero:tile.a===0||tile.b===0,
        operations:Object.freeze([operationFor(tile.a),operationFor(tile.b)])
      }),
      modifiers:Object.freeze(modifiers),
      machineModifiers:Object.freeze(machineModifiers(state)),
      circuit:(state.circuitRanks?.[tileId]||0)>0?{rank:state.circuitRanks[tileId],...D.CIRCUIT_RANKS[state.circuitRanks[tileId]-1]}:null,
      currentMachineState:tileRecord(state,tileId,tier)
    })
  }

  return{rulebookSections,bindRun,recordRulebookOpen,recordSectionOpen,telemetrySnapshot,resetTelemetry,debugTelemetryText,inspectTile,operationFor};
});
