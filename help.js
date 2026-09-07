(function(root,factory){
  const api=factory(root.IterionData,root.IterionMods,root.IterionEngine);
  if(typeof module==='object'&&module.exports) module.exports=factory(require('./data.js'),require('./mods.js'),require('./engine.js'));
  root.IterionHelp=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(D,M,E){
  const sectionOrder=['goal','placement','rotation','hand','scoring','routing','doubles','zeros','parity','persistence','economy','modifiers'];
  const telemetryByRun=new Map();
  let activeRunId='session';

  function operationFor(value,doubleDouble=false,isDouble=false){
    const state={output:10};
    const op=E.applyOp(value,isDouble,state,doubleDouble);
    return Object.freeze({value,type:op.type,add:op.add||0,factor:op.factor||0,before:op.before,after:op.after,doubleDouble:!!op.doubleDouble});
  }
  function operationText(value){
    const op=operationFor(value);
    if(op.type==='add')return `${value} adds ${op.add} to the current Output.`;
    if(op.type==='multiply')return `${value} multiplies the current Output by ×${op.factor}.`;
    if(op.type==='zero')return '0 does not change Output by arithmetic; its effect is handled by routing.';
    return `${value} has no scoring operation.`;
  }
  function modifierText(){
    return M.all().map(mod=>`${mod.displayName||mod.name}: ${mod.rulesDescription||mod.description}`).join(' ');
  }
  function rulebookSections(){
    const sections={
      goal:{id:'goal',displayName:'Goal / Target',visual:'OUTPUT ≥ TARGET',shortDescription:'Reach the Target before the round runs out of moves or legal continuations.',rulesDescription:`Output resets to 0 at the start of each round. Reach or exceed the current Target to clear the round. The machine itself ${D.PERSIST_MACHINE_BETWEEN_ROUNDS?'stays on the board between rounds':'does not persist between rounds'}.`},
      placement:{id:'placement',displayName:'Placement',visual:'[2|4]—[4|6]  ✓     [2|4]—[5|6]  ×',shortDescription:'Build one connected domino machine.',rulesDescription:`The opening tile must be a double. After that, a placed domino must touch the existing machine through matching values, stay inside the board, and not overlap another tile. The current machine is built on the ground plane.`},
      rotation:{id:'rotation',displayName:'Rotation',visual:'↻ 90°',shortDescription:'Dominoes can use 90° orientations.',rulesDescription:'Drag a tile toward a legal position. Candidate placements use the engine’s valid 90° orientations. For the opening tile, the current build also supports the left-right shake rotation gesture while dragging.'},
      hand:{id:'hand',displayName:'Hand / Draw / Discard',visual:`HAND ${D.HAND_SIZE} → PLACE → DRAW 1`,shortDescription:`The hand holds up to ${D.HAND_SIZE} dominoes.`,rulesDescription:'After a successful placement, one replacement tile is drawn from the remaining physical set when available. There is no separate single-tile Discard action in the current build. A stored Reroll replaces the full hand.'},
      scoring:{id:'scoring',displayName:'Scoring',visual:'[a|b] → trigger a+b → MACHINE',shortDescription:'A placement creates a trigger, then the connected machine can transform Output.',rulesDescription:`The newly placed domino starts the Move with a trigger equal to the sum of its two values. Activated values then use the engine operations. ${[0,1,2,3,4,5,6].map(operationText).join(' ')}`},
      routing:{id:'routing',displayName:'Routing',visual:'NEW → [ ] ──→ [ ]',shortDescription:'The signal travels through connected pieces.',rulesDescription:'The routing engine evaluates valid connected paths deterministically. When several complete routes are possible, the current engine compares them by traversals first, then Output, then rebounds, then path length. The Rulebook does not reveal a best placement.'},
      doubles:{id:'doubles',displayName:'Doubles',visual:'── [3|3] ──  + centred side port',shortDescription:'Doubles have special connection geometry.',rulesDescription:'A double can accept the engine’s centred long-side connection in addition to ordinary matching contacts. A normal double does not automatically strengthen its arithmetic operation; any extra effect must come from an explicit modifier such as Double Double.'},
      zeros:{id:'zeros',displayName:'Zeros',visual:'→ 0 ↩',shortDescription:'Zero changes routing rather than Output arithmetic.',rulesDescription:'When the signal exits through 0, Output is unchanged and the route rebounds. A non-double zero piece has one rebound charge; [0|0] has the double-specific two-charge behaviour implemented by the routing engine.'},
      parity:{id:'parity',displayName:'Odd / Even',visual:'1 · 3 · 5  ×     2 · 4 · 6  +',shortDescription:'Odd and even values use different engine operations.',rulesDescription:`${[1,3,5].map(operationText).join(' ')} ${[2,4,6].map(operationText).join(' ')} Zero is handled separately.`},
      persistence:{id:'persistence',displayName:'Machine Persistence',visual:'ROUND 1 MACHINE → ROUND 2 MACHINE',shortDescription:'Earlier placements shape later rounds.',rulesDescription:`Machine persistence is currently ${D.PERSIST_MACHINE_BETWEEN_ROUNDS?'ON':'OFF'}. Cleared rounds reset Output and round resources, while placed physical dominoes remain part of the machine. The board expands at the start of each new stage according to the configured board sizes.`},
      economy:{id:'economy',displayName:'Shop / Market',visual:`SHOP anytime     MARKET every ${D.STAGE_SIZE} rounds`,shortDescription:'Shop handles survival; Market develops the build.',rulesDescription:`The Shop is available during active rounds and can also rescue some failed states. It sells random physical dominoes plus stored Move, Reroll and Undo tools. A random domino bought during a round enters the current hand if there is space, otherwise the reserve. The Market appears after each ${D.STAGE_SIZE}-round stage and contains rarer build-changing effects such as Double Double. Every purchase increases global Inflation by 1. Undo rewinds the last placement, but Shop purchases made after that placement stay spent and stay owned.`},
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
    return ids.map(id=>M.get(id)).filter(Boolean).map(mod=>Object.freeze({id:mod.id,displayName:mod.displayName||mod.name,shortDescription:mod.shortDescription||mod.description,rulesDescription:mod.rulesDescription||mod.description,kind:mod.kind}))
  }
  function tileRecord(state,tileId,tier){
    const turns=(state.events||[]).filter(e=>Number.isInteger(e.turn)&&e.tile?.id===tileId&&Number.isFinite(Number(e.output)));
    const bestOutput=turns.reduce((best,e)=>best==null||Number(e.output)>best?Number(e.output):best,null);
    return Object.freeze({upgradeTier:tier,starCoins:tier,bestOutput,plays:turns.length,doubleDoubleActive:state.doubleDoubleTileId===tileId})
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
      currentMachineState:tileRecord(state,tileId,tier)
    })
  }

  return{rulebookSections,bindRun,recordRulebookOpen,recordSectionOpen,telemetrySnapshot,resetTelemetry,debugTelemetryText,inspectTile,operationFor};
});
