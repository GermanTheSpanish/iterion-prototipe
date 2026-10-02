const assert=require('node:assert/strict');
const E=require('../engine.js');
const D=require('../data.js');
const G=require('../game.js');

const rectOverlap=(a,b,cell=E.S)=>a.x<b.x+(b.size||cell)&&a.x+(a.size||cell)>b.x&&a.y<b.y+(b.size||cell)&&a.y+(a.size||cell)>b.y;
const residue=(value,step)=>((value%step)+step)%step;
const approachSides=(core,geometry,board=E.getBoardSize())=>{
  const cell=E.S,size=core.size||cell,vectors={U:[0,-cell],R:[cell,0],D:[0,cell],L:[-cell,0]};
  const cells=side=>{const [dx,dy]=vectors[side],first=side==='U'?{x:core.x,y:core.y-cell}:side==='R'?{x:core.x+size,y:core.y}:side==='D'?{x:core.x,y:core.y+size}:{x:core.x-cell,y:core.y};return[first,{x:first.x+dx,y:first.y+dy}]};
  return(core.ports||[]).filter(side=>cells(side).every(cellRect=>cellRect.x>=0&&cellRect.y>=0&&cellRect.x+cell<=board.G&&cellRect.y+cell<=board.H&&!geometry.some(item=>item.id!==core.id&&rectOverlap({...cellRect,size:cell},item))))
};
const advanceToStage=(game,target)=>{
  const state=game.state();
  while(game.snapshot().stage.index<target){
    state.cleared=true;state.blocked=false;state.running=false;state.nextShopType='none';state.intermissionResolved=true;state.pendingCircuit=null;state.pendingModPlacement=null;state.shopOpen=false;
    assert.equal(game.advance(),true)
  }
};

const expected={
  eyes:{north:[{x:8,y:6}],south:[{x:8,y:16}]},
  frames:{north:[{x:2,y:2},{x:14,y:10}],south:[{x:2,y:12},{x:14,y:20}]},
  river:{north:[{x:2,y:2},{x:8,y:6},{x:14,y:10}],south:[{x:2,y:12},{x:8,y:16},{x:14,y:20}]},
  loom:{north:[{x:2,y:2},{x:14,y:2},{x:2,y:10},{x:14,y:10}],south:[{x:2,y:12},{x:14,y:12},{x:2,y:20},{x:14,y:20}]},
  peaks:{north:[{x:2,y:2},{x:14,y:2},{x:2,y:10},{x:14,y:10},{x:8,y:6}],south:[{x:2,y:12},{x:14,y:12},{x:2,y:20},{x:14,y:20},{x:8,y:16}]}
};

for(const mode of Object.keys(expected)){
  for(let seed=0;seed<32;seed++){
    E.setBoardSize(18,24);
    const game=G.createGame(E,{seed:60100+seed,GAME_MODE:mode,TARGETS:Array(15).fill(Number.MAX_SAFE_INTEGER)}),state=game.state(),geometry=[...state.cores,...state.voids];
    if(mode==='eyes'){
      const sites=state.cores.map(core=>({half:core.slot,x:core.x,y:core.y}));
      assert.deepEqual(sites.map(({half,x,y})=>({half,x,y})),[{half:'north',x:8,y:6},{half:'south',x:8,y:16}])
    }else{
      for(const half of ['north','south']){
        const sites=geometry.filter(item=>item.half===half).sort((a,b)=>a.pip-b.pip).map(({x,y})=>({x,y}));
        assert.deepEqual(sites,expected[mode][half],`${mode} ${half} opening pips must use the widened shared grid`)
      }
    }
    for(const core of state.cores){const sides=approachSides(core,geometry),reachabilityEvents=state.events.filter(event=>event.type==='core-port-reachability'||event.type==='core-port-reachability-blocked');assert(sides.length>0,`${mode} seed ${60100+seed} Core ${core.id} needs one complete two-cell domino approach through an actual port; ports=${(core.ports||[]).join('')||'-'} events=${JSON.stringify(reachabilityEvents)}`)}
  }
}

for(const mode of Object.keys(expected)){
  for(let seed=0;seed<12;seed++){
    E.setBoardSize(18,24);
    const game=G.createGame(E,{seed:60200+seed,GAME_MODE:mode,TARGETS:Array(15).fill(Number.MAX_SAFE_INTEGER)}),state=game.state();
    for(let stage=2;stage<=5;stage++){
      advanceToStage(game,stage);
      const coreEvent=[...state.events].reverse().find(event=>event.type==='core-discover'&&event.stage===stage);
      assert(coreEvent,`${mode} seed ${60200+seed} must discover its Stage ${stage} Core`);
      assert.equal(coreEvent.lattice.stepX,E.S*3,'new Cores must stay on the same widened pip columns');
      assert.equal(coreEvent.lattice.stepY,E.S,'new Cores must stay on the domino row grid');
      assert.equal(residue(coreEvent.core.x,coreEvent.lattice.stepX),coreEvent.lattice.x);
      assert.equal(residue(coreEvent.core.y,coreEvent.lattice.stepY),coreEvent.lattice.y);
      const core=state.cores.find(item=>item.id===coreEvent.core.id),geometry=[...state.cores,...state.voids];
      assert(core);
      assert(approachSides(core,geometry).length>0,`${mode} seed ${60200+seed} Stage ${stage} Core must remain physically reachable after companion Voids spawn`);
      assert((coreEvent.approachSides||[]).length>0,'Core discovery telemetry must record surviving approach sides');
      for(const voidItem of geometry.filter(item=>item.sourceCoreId===core.id)){
        assert.equal(residue(voidItem.x,coreEvent.lattice.stepX),coreEvent.lattice.x,'companion Voids align to the same pip columns');
        assert.equal(residue(voidItem.y,coreEvent.lattice.stepY),coreEvent.lattice.y,'companion Voids align to the same domino row grid')
      }
    }
    assert.equal(state.events.some(event=>event.type==='core-progress-blocked'&&event.action==='discover-pack'),false,`${mode} seed ${60200+seed} must fit every Core/Void discovery packet`)
  }
}

console.log('Shared pip grid and Core reachability regressions passed');
