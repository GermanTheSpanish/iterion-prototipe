(function(root){
  'use strict';
  if(root.MonoidTutorialController)return;

  function create(options={}){
    if(root.__monoidTutorialControllerInstance)return root.__monoidTutorialControllerInstance;
    const gameFlow=options.gameFlow||(()=>root.__monoidFlow||{screen:null,tutorialStep:null});
    const currentGame=options.currentGame||(()=>root.__monoidGame||null);
    const getTutorialKind=options.getTutorialKind||(()=>null);
    const scheduleSync=options.scheduleSync||(()=>{});
    const SYSTEMS_POWER_ID=options.systemsPowerId||'g2-d1-2';

    let tutorialPatch=null,nextTutorialKind='basics';
    const tutorialKinds=new WeakMap();

    function primeSystemsGame(game){
      const E=root.IterionEngine,D=root.IterionData,s=game.state();
      const specs=[['d1-2',2,0,0],['d2-3',6,0,1],['d3-4',6,4,2]];
      s.pieces=specs.map(([id,x,y,rr],i)=>{const tile=s.set.find(t=>t.id===id),p=E.pieceFrom(tile,x,y,0,rr,i+1);p.tile={...tile};return p});
      s.placedTileIds=specs.map(a=>a[0]);s.idc=3;s.turn=3;s.roundTurn=3;s.score=0;s.best=0;s.circuitRanks={};s.circuitSignatures=[];s.pendingCircuit=null;s.mods=[];s.cleared=false;s.blocked=false;s.needsReroll=false;s.running=false;s.failureReason=null;
      const closer=s.set.find(t=>t.id==='d1-4');s.hand=Array(D.HAND_SIZE).fill(null);s.hand[0]=closer;s.reserve=s.set.filter(t=>!s.placedTileIds.includes(t.id)&&t.id!==closer.id);
      const ctx=game.beginPlacement(0,{x:2,y:2,rr:1});if(ctx.ok)game.finishPlacement(ctx);
      const power={id:SYSTEMS_POWER_ID,a:1,b:2,upgrade:0,source:'power-set',generation:2,powerMultiplier:2};if(!s.set.some(t=>t.id===power.id))s.set.push(power);s.setGeneration=2;s.mods=['long-run'];
      const livePower=s.set.find(t=>t.id===power.id);s.hand=Array(D.HAND_SIZE).fill(null);s.hand[0]=livePower;s.reserve=s.set.filter(t=>!s.placedTileIds.includes(t.id)&&t.id!==livePower.id);s.cleared=false;s.blocked=false;s.needsReroll=false;s.running=false;s.failureReason=null;s.shopOpen=false;s.undoFrame=null;
      let priming=true,shadowHand=s.hand.slice(),shadowReserve=s.reserve.slice();
      const proxy=new Proxy(s,{get(target,prop){if(priming&&prop==='hand')return shadowHand;if(priming&&prop==='reserve')return shadowReserve;return target[prop]},set(target,prop,value){if(priming&&prop==='hand'){shadowHand=value;return true}if(priming&&prop==='reserve'){shadowReserve=value;return true}if(priming&&(prop==='blocked'||prop==='needsReroll'||prop==='cleared'))return true;if(priming&&prop==='running'){if(value===false)priming=false;return true}target[prop]=value;return true}});
      const facade={...game,state:()=>proxy};tutorialKinds.set(facade,'systems');return facade
    }

    const baseCreateGame=root.IterionGame?.createGame;
    if(typeof baseCreateGame==='function')root.IterionGame.createGame=function(engine,options){const game=baseCreateGame.call(this,engine,options);if(nextTutorialKind!=='systems')return game;nextTutorialKind='basics';return primeSystemsGame(game)};

    const canonicalBestSignal=root.IterionEngine?.bestSignal;
    if(typeof canonicalBestSignal==='function')root.IterionEngine.bestSignal=function(startId,pieces,options){const result=canonicalBestSignal.call(this,startId,pieces,options);const flow=gameFlow();if(getTutorialKind()==='basics'&&flow.screen==='tutorial'&&flow.tutorialStep===4&&Number(startId)>=100000)return{...result,rebounds:Math.max(1,result.rebounds||0)};return result};

    function prepareHand(game,tileId){
      const D=root.IterionData,s=game.state(),tile=s.set.find(t=>t.id===tileId);if(!tile)return;
      s.hand=Array(D.HAND_SIZE).fill(null);s.hand[0]=tile;s.reserve=s.reserve.filter(t=>t.id!==tileId);
      s.blocked=false;s.needsReroll=false;s.cleared=false;s.running=false;scheduleSync()
    }
    function restorePatch(){
      if(!tutorialPatch)return;const{game,candidates,openShop,finishPlacement}=tutorialPatch;
      game.candidatesForIndex=candidates;game.openShop=openShop;game.finishPlacement=finishPlacement;tutorialPatch=null
    }
    function ensurePatch(){
      const flow=gameFlow(),game=currentGame();if(flow.screen!=='tutorial'||!game)return;
      if(tutorialPatch?.game===game)return;restorePatch();
      const candidates=game.candidatesForIndex,openShop=game.openShop,finishPlacement=game.finishPlacement;
      tutorialPatch={game,candidates,openShop,finishPlacement};
      game.candidatesForIndex=function(i){if(i!==0)return[];return candidates(i)};
      game.openShop=function(...args){
        if(getTutorialKind()==='basics'&&gameFlow().screen==='tutorial'&&gameFlow().tutorialStep===5&&game.state().turn<7)return true;
        const options=args[0]&&typeof args[0]==='object'?{...args[0],allowUnaffordable:true}:{allowUnaffordable:true};return openShop(options)
      };
      game.finishPlacement=function(ctx){
        const step=gameFlow().tutorialStep,result=finishPlacement(ctx);if(gameFlow().screen!=='tutorial'||!result?.ok||getTutorialKind()!=='basics')return result;
        if(step===3)queueMicrotask(()=>{if(gameFlow().tutorialStep===4&&currentGame()===game)prepareHand(game,'d2-5')});
        if(step===4)queueMicrotask(()=>{if(gameFlow().tutorialStep===5&&currentGame()===game){game.config.TARGETS[0]=1e9;prepareHand(game,'d5-6')}});
        if(step===5){if(game.state().turn===6)queueMicrotask(()=>{if(currentGame()===game)prepareHand(game,'d2-6')});else if(game.state().turn>=7){const state=game.state();state.cleared=false;openShop({allowUnaffordable:true})}}
        return result
      }
    }
    function setNextKind(kind){nextTutorialKind=kind==='systems'?'systems':'basics'}
    function kindFor(game){return tutorialKinds.get(game)||null}

    const api=Object.freeze({setNextKind,kindFor,prepareHand,ensurePatch,restorePatch});
    root.__monoidTutorialControllerInstance=api;
    return api
  }

  root.MonoidTutorialController=Object.freeze({create})
})(window);
