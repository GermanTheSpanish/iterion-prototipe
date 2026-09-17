(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.MonoidPrototypeScoring=api;
  if(root?.document){
    const install=()=>api.install(root);
    if(root.IterionGame?.createGame)install();
    else root.addEventListener?.('load',install,{once:true});
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const MODEL='deferred-v1';
  const MODE='prototype';
  const ACTIVE_MODE_KEY='iterion.activeRunMode.v1';
  const FORMULA='(Trigger + Σ additions) × Π multipliers';

  const number=value=>Number.isFinite(Number(value))?Number(value):0;
  const state=base=>({base:number(base),add:0,multiplier:1});
  const cloneState=s=>({base:number(s?.base),add:number(s?.add),multiplier:Number.isFinite(Number(s?.multiplier))?Number(s.multiplier):1});
  const resolveState=s=>(number(s?.base)+number(s?.add))*(Number.isFinite(Number(s?.multiplier))?Number(s.multiplier):1);

  function applyTerm(current,raw){
    const before=resolveState(current),next=cloneState(current),op=raw?.op;
    if(op==='add')next.add+=number(raw.add);
    else if(op==='multiply')next.multiplier*=Number.isFinite(Number(raw.factor))?Number(raw.factor):1;
    const after=resolveState(next);
    return{
      state:next,
      event:{...raw,before,after,delta:after-before,deferred:true,deferredBase:next.base,deferredAdd:next.add,deferredMultiplier:next.multiplier}
    }
  }

  function forkStart(map,key,current){
    const fork={seed:cloneState(current),results:[]};map.set(key,fork);return fork
  }
  function forkArm(map,key){const fork=map.get(key);return fork?cloneState(fork.seed):null}
  function forkEnd(map,key,arm,current){const fork=map.get(key);if(!fork)return null;fork.results[arm]=resolveState(current);return fork.results[arm]}
  function forkJoin(map,key){const fork=map.get(key);if(!fork)return null;const output=fork.results.reduce((sum,v)=>sum+number(v),0);map.delete(key);return state(output)}

  function replayDeferredScoring(result,initialOutput=0){
    if(!result||!Array.isArray(result.events))return result;
    const classicOutput=number(result.output),events=[];
    const mainForks=new Map(),echoForks=new Map();
    let main=state(initialOutput),echo=null,echoActivated=false;

    for(const raw of result.events){
      if(raw.type==='op'||raw.type==='zero-memory'){
        const applied=applyTerm(main,raw);main=applied.state;events.push(applied.event);continue
      }
      if(raw.type==='signal-fork'){
        forkStart(mainForks,raw.piece,main);events.push({...raw,output:resolveState(main),deferred:true});continue
      }
      if(raw.type==='signal-start'){
        const branch=forkArm(mainForks,raw.fork);if(branch)main=branch;
        events.push({...raw,output:resolveState(main),deferred:true});continue
      }
      if(raw.type==='signal-end'){
        const output=forkEnd(mainForks,raw.fork,raw.arm,main);
        events.push({...raw,output:output??resolveState(main),deferred:true});continue
      }
      if(raw.type==='signal-join'){
        const joined=forkJoin(mainForks,raw.piece);if(joined)main=joined;
        events.push({...raw,output:resolveState(main),deferred:true});continue
      }
      if(raw.type==='double-echo-start'){
        echo=cloneState(main);echoActivated=true;
        events.push({...raw,startOutput:resolveState(echo),deferred:true,deferredBase:echo.base,deferredAdd:echo.add,deferredMultiplier:echo.multiplier});continue
      }
      if(raw.type==='echo-op'){
        if(!echo)echo=state(raw.before??initialOutput);
        const applied=applyTerm(echo,raw);echo=applied.state;events.push(applied.event);continue
      }
      if(raw.type==='echo-signal-fork'){
        if(!echo)echo=state(raw.output??initialOutput);
        forkStart(echoForks,raw.piece,echo);events.push({...raw,output:resolveState(echo),deferred:true});continue
      }
      if(raw.type==='echo-signal-start'){
        const branch=forkArm(echoForks,raw.fork);if(branch)echo=branch;
        events.push({...raw,output:resolveState(echo||state(initialOutput)),deferred:true});continue
      }
      if(raw.type==='echo-signal-end'){
        if(!echo)echo=state(raw.output??initialOutput);
        const output=forkEnd(echoForks,raw.fork,raw.arm,echo);
        events.push({...raw,output:output??resolveState(echo),deferred:true});continue
      }
      if(raw.type==='echo-signal-join'){
        const joined=forkJoin(echoForks,raw.piece);if(joined)echo=joined;
        events.push({...raw,output:resolveState(echo||state(initialOutput)),deferred:true});continue
      }
      if(raw.type==='double-echo-result'){
        const mainOutput=resolveState(main),echoOutput=echoActivated&&echo?resolveState(echo):0,finalOutput=mainOutput+echoOutput;
        events.push({...raw,mainOutput,echoOutput,finalOutput,deferred:true});continue
      }
      events.push({...raw})
    }

    const mainOutput=resolveState(main),echoOutput=echoActivated&&echo?resolveState(echo):0,output=mainOutput+echoOutput;
    const resolution={
      model:MODEL,formula:FORMULA,routeSelection:'classic-comparator',initialOutput:number(initialOutput),classicOutput,mainOutput,echoOutput,finalOutput:output,
      branchRule:'copy deferred state into each split arm; resolve arms independently; add at join'
    };
    const dieIndex=events.length&&events[events.length-1].type==='die'?events.length-1:events.length;
    events.splice(dieIndex,0,{type:'deferred-resolution',...resolution});
    return{
      ...result,
      output,
      gain:output-number(initialOutput),
      mainOutput:echoActivated?mainOutput:result.mainOutput,
      echoOutput:echoActivated?echoOutput:result.echoOutput,
      classicOutput,
      events,
      scoringModel:MODEL,
      deferredScoring:resolution
    }
  }

  function createDeferredEngine(baseEngine){
    if(!baseEngine?.bestSignal)throw new Error('IterionEngine.bestSignal required');
    const engine=Object.create(baseEngine),baseBest=baseEngine.bestSignal.bind(baseEngine);
    engine.bestSignal=function(newPieceId,pieces,opts={}){
      const result=baseBest(newPieceId,pieces,opts);
      const initialOutput=Number.isFinite(Number(opts.initialOutput))?Number(opts.initialOutput):0;
      return replayDeferredScoring(result,initialOutput)
    };
    engine.simulateSignal=function(newPieceId,pieces,opts={}){return engine.bestSignal(newPieceId,pieces,opts)};
    return engine
  }

  function activeMode(root){
    return root.__monoidActiveMode||root.localStorage?.getItem?.(ACTIVE_MODE_KEY)||'classic'
  }
  function shouldUsePrototype(root,opts={}){
    if(opts?.SCORING_MODEL===MODEL)return true;
    if(Object.keys(opts||{}).length)return false;
    return activeMode(root)===MODE
  }
  function annotateGame(game){
    if(!game?.state)return game;
    const mark=()=>{const s=game.state();if(s){s.gameMode=MODE;s.scoringModel=MODEL;s.scoringFormula=FORMULA}};
    mark();
    if(game.config)game.config.SCORING_MODEL=MODEL;

    if(typeof game.restoreState==='function'){
      const restore=game.restoreState.bind(game);
      game.restoreState=function(saved){const ok=restore(saved);if(ok)mark();return ok}
    }
    if(typeof game.finishPlacement==='function'){
      const finish=game.finishPlacement.bind(game);
      game.finishPlacement=function(ctx){
        const resolution=ctx?.sim?.deferredScoring||null,result=finish(ctx);
        if(resolution){
          const turns=game.state()?.events||[],turn=[...turns].reverse().find(e=>Number.isInteger(e.turn));
          if(turn)Object.assign(turn,{gameMode:MODE,scoringModel:MODEL,classicOutput:resolution.classicOutput,deferredOutput:resolution.finalOutput,deferredMainOutput:resolution.mainOutput,deferredEchoOutput:resolution.echoOutput,deferredFormula:FORMULA,routeSelectionModel:resolution.routeSelection})
        }
        return result
      }
    }
    if(typeof game.debugText==='function'){
      const debug=game.debugText.bind(game);
      game.debugText=function(){
        const base=String(debug()),lines=base.split(/\r?\n/);
        lines.splice(1,0,`Game Mode: PROTOTYPE`,`Scoring Model: ${MODEL} · ${FORMULA} · route selection=classic comparator`);
        const comparisons=(game.state()?.events||[]).filter(e=>e.scoringModel===MODEL&&Number.isInteger(e.turn));
        if(comparisons.length){
          lines.push('PROTOTYPE SCORING COMPARISON');
          for(const e of comparisons)lines.push(`T${e.turn} classic=${e.classicOutput} deferred=${e.deferredOutput} main=${e.deferredMainOutput}${e.deferredEchoOutput?` echo=${e.deferredEchoOutput}`:''}`)
        }
        return lines.join('\n')
      }
    }
    return game
  }

  function install(root){
    if(!root?.IterionGame?.createGame||root.__monoidPrototypeScoringInstalled)return false;
    root.__monoidPrototypeScoringInstalled=true;
    const createGame=root.IterionGame.createGame.bind(root.IterionGame);
    root.IterionGame.createGame=function(engine,opts={}){
      if(!shouldUsePrototype(root,opts))return createGame(engine,opts);
      return annotateGame(createGame(createDeferredEngine(engine),{...opts,SCORING_MODEL:MODEL}))
    };
    return true
  }

  return{MODEL,MODE,ACTIVE_MODE_KEY,FORMULA,state,cloneState,resolveState,applyTerm,replayDeferredScoring,createDeferredEngine,shouldUsePrototype,annotateGame,install};
});
