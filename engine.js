(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.IterionEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  let G=18,H=24;
  const S=2;
  const DIR=[[1,0],[0,1],[-1,0],[0,-1]], ARROW=['→','↓','←','↑'];
  function setBoardSize(g,h){
    if(!Number.isInteger(g)||!Number.isInteger(h)||g<6||h<6)throw new Error('Invalid board size');
    G=g;H=h;return{G,H}
  }
  function getBoardSize(){return{G,H}}
  const axis=rr=>rr%2===0?'H':'V';
  function cubesFor(tile,x,y,z=0,rr=0){const [dx,dy]=DIR[rr];return[{x,y,z,v:tile.a,half:0},{x:x+dx*S,y:y+dy*S,z,v:tile.b,half:1}]}
  function rectForCubes(cs){return{minx:Math.min(...cs.map(c=>c.x)),miny:Math.min(...cs.map(c=>c.y)),maxx:Math.max(...cs.map(c=>c.x+S)),maxy:Math.max(...cs.map(c=>c.y+S))}}
  function overlap(a,b){return a.x<b.x+S&&a.x+S>b.x&&a.y<b.y+S&&a.y+S>b.y}
  function edgeContact(a,b){if(a.z!==b.z)return null;const oy=Math.max(0,Math.min(a.y+S,b.y+S)-Math.max(a.y,b.y)),ox=Math.max(0,Math.min(a.x+S,b.x+S)-Math.max(a.x,b.x));if(a.x+S===b.x&&oy>0)return{side:'R',otherSide:'L',len:oy};if(b.x+S===a.x&&oy>0)return{side:'L',otherSide:'R',len:oy};if(a.y+S===b.y&&ox>0)return{side:'D',otherSide:'U',len:ox};if(b.y+S===a.y&&ox>0)return{side:'U',otherSide:'D',len:ox};return null}
  function pieceFrom(tile,x,y,z=0,rr=0,id=0){const cubes=cubesFor(tile,x,y,z,rr);return{id,tile:{a:tile.a,b:tile.b},double:tile.a===tile.b,axis:axis(rr),rr,z,cubes,rect:rectForCubes(cubes)}}
  function pieceEdgeRelation(a,b){if(a.z!==b.z)return null;const A=a.rect,B=b.rect,oy=Math.max(0,Math.min(A.maxy,B.maxy)-Math.max(A.miny,B.miny)),ox=Math.max(0,Math.min(A.maxx,B.maxx)-Math.max(A.minx,B.minx));if(A.maxx===B.minx&&oy>0)return{sideA:'R',sideB:'L',len:oy,start:Math.max(A.miny,B.miny),end:Math.min(A.maxy,B.maxy)};if(B.maxx===A.minx&&oy>0)return{sideA:'L',sideB:'R',len:oy,start:Math.max(A.miny,B.miny),end:Math.min(A.maxy,B.maxy)};if(A.maxy===B.miny&&ox>0)return{sideA:'D',sideB:'U',len:ox,start:Math.max(A.minx,B.minx),end:Math.min(A.maxx,B.maxx)};if(B.maxy===A.miny&&ox>0)return{sideA:'U',sideB:'D',len:ox,start:Math.max(A.minx,B.minx),end:Math.min(A.maxx,B.maxx)};return null}
  function isLongSide(piece,side){return piece.axis==='H'?(side==='U'||side==='D'):(side==='L'||side==='R')}
  function isCenteredOnDouble(p,r,s){if(!p.double||!isLongSide(p,s)||r.len!==S)return false;if(p.axis==='H'){const c=(p.rect.minx+p.rect.maxx)/2;return r.start===c-S/2&&r.end===c+S/2}const c=(p.rect.miny+p.rect.maxy)/2;return r.start===c-S/2&&r.end===c+S/2}
  function contactBetweenPieces(a,b){const raw=[];for(const ca of a.cubes)for(const cb of b.cubes){const e=edgeContact(ca,cb);if(e)raw.push({...e,aHalf:ca.half,bHalf:cb.half,aV:ca.v,bV:cb.v,aCube:ca,bCube:cb})}if(!raw.length)return{touch:false,ok:true,contacts:[]};if(raw.some(r=>r.aV!==r.bV))return{touch:true,ok:false,reason:'value-mismatch',contacts:raw};const rel=pieceEdgeRelation(a,b);if(!rel)return{touch:true,ok:false,reason:'partial',contacts:raw};const aLong=a.double&&isLongSide(a,rel.sideA),bLong=b.double&&isLongSide(b,rel.sideB);if(aLong||bLong){const as=isCenteredOnDouble(a,rel,rel.sideA),bs=isCenteredOnDouble(b,rel,rel.sideB);if(as!==bs&&rel.len===S)return{touch:true,ok:true,kind:'double-centered',contacts:raw,relation:rel};if(rel.len===S&&raw.every(r=>r.len===S))return{touch:true,ok:true,kind:'double-offset',contacts:raw,relation:rel};return{touch:true,ok:false,reason:'off-centre-double-port',contacts:raw,relation:rel}}if(raw.every(r=>r.len===S))return{touch:true,ok:true,kind:'full',contacts:raw,relation:rel};return{touch:true,ok:false,reason:'partial-or-corner',contacts:raw,relation:rel}}
  function validatePlacement(tile,x,y,z,rr,pieces){const cand=pieceFrom(tile,x,y,z,rr,-1);if(cand.rect.minx<0||cand.rect.miny<0||cand.rect.maxx>G||cand.rect.maxy>H)return{ok:false,reason:'bounds'};for(const p of pieces)for(const c of cand.cubes)for(const o of p.cubes)if(overlap(c,o))return{ok:false,reason:'overlap'};if(!pieces.length){const center=cand.cubes.some(c=>Math.abs(c.x+1-G/2)<=4&&Math.abs(c.y+1-H/2)<=4);return center?{ok:true,contacts:[],piece:cand}:{ok:false,reason:'root-zone'}}const contacts=[];for(const p of pieces){const r=contactBetweenPieces(cand,p);if(r.touch&&!r.ok)return{ok:false,reason:r.reason};if(r.touch&&r.ok)contacts.push({piece:p,kind:r.kind,contacts:r.contacts,relation:r.relation})}return contacts.length?{ok:true,contacts,piece:cand}:{ok:false,reason:'no-contact'}}
  function placementKey(tile,p){const cs=cubesFor(tile,p.x,p.y,p.z,p.rr).map(c=>`${c.x},${c.y},${c.v}`).sort().join('|');return`${p.z}|${cs}`}
  function allPlacements(tile,z,pieces){const out=[],seen=new Set();for(let rr=0;rr<4;rr++)for(let y=0;y<=H-S;y++)for(let x=0;x<=G-S;x++){const v=validatePlacement(tile,x,y,z,rr,pieces);if(!v.ok)continue;const p={x,y,z,rr,contacts:v.contacts},k=placementKey(tile,p);if(seen.has(k))continue;seen.add(k);out.push(p)}return out}
  function hasAnyPlacement(tile,z,pieces){for(let rr=0;rr<4;rr++)for(let y=0;y<=H-S;y++)for(let x=0;x<=G-S;x++)if(validatePlacement(tile,x,y,z,rr,pieces).ok)return true;return false}
  function hasLegalMove(hand,pieces,levels=[0,1,2,3,4]){for(const t of hand)for(const z of levels)if(hasAnyPlacement(t,z,pieces))return true;return false}
  const cubeCenter=c=>({x:c.x+S/2,y:c.y+S/2,z:c.z});
  const pieceById=(ps,id)=>ps.find(p=>p.id===id);
  function connectionsForPiece(piece,pieces){const out=[];for(const p of pieces){if(p.id===piece.id||p.z!==piece.z)continue;const r=contactBetweenPieces(piece,p);if(r.ok&&r.touch)for(const c of r.contacts)out.push({toPieceId:p.id,fromHalf:c.aHalf,toHalf:c.bHalf,fromSide:c.side,toSide:c.otherSide,kind:r.kind})}return out}
  const connectionKey=c=>`${c.toPieceId}:${c.toHalf}:${c.fromSide}>${c.toSide}`;
  const oppositeSides=(a,b)=>!!a&&!!b&&((a==='L'&&b==='R')||(a==='R'&&b==='L')||(a==='U'&&b==='D')||(a==='D'&&b==='U'));
  const perpendicularSides=(a,b)=>!!a&&!!b&&!oppositeSides(a,b)&&a!==b;
  const oppositeSide=side=>side==='L'?'R':side==='R'?'L':side==='U'?'D':side==='D'?'U':null;
  function uniquePhysicalConnections(piece,pieces){const byPiece=new Map();for(const c of connectionsForPiece(piece,pieces))if(!byPiece.has(c.toPieceId))byPiece.set(c.toPieceId,c);return[...byPiece.values()]}
  function uniqueConnectionCount(piece,pieces){return uniquePhysicalConnections(piece,pieces).length}
  function isCornerTopology(piece,pieces){const conns=uniquePhysicalConnections(piece,pieces);return conns.length===2&&perpendicularSides(conns[0].fromSide,conns[1].fromSide)}
  function straightLineLength(piece,pieces){
    const origin=uniquePhysicalConnections(piece,pieces);if(origin.length!==2||!oppositeSides(origin[0].fromSide,origin[1].fromSide))return 0;
    const visited=new Set([piece.id]);let total=1;
    for(const first of origin){let current=pieceById(pieces,first.toPieceId),incoming=first.toSide;while(current&&!visited.has(current.id)){visited.add(current.id);total++;const exit=oppositeSide(incoming);if(!exit)break;const next=uniquePhysicalConnections(current,pieces).filter(c=>c.fromSide===exit&&!visited.has(c.toPieceId));if(next.length!==1)break;incoming=next[0].toSide;current=pieceById(pieces,next[0].toPieceId)}}
    return total
  }
  function printedValueKey(piece){const a=Number(piece?.tile?.a),b=Number(piece?.tile?.b);return Number.isFinite(a)&&Number.isFinite(b)?(a<=b?`${a}|${b}`:`${b}|${a}`):''}
  function hasTwinConnection(piece,pieces){const key=printedValueKey(piece);return!!key&&uniquePhysicalConnections(piece,pieces).some(c=>printedValueKey(pieceById(pieces,c.toPieceId))===key)}
  function poweredNeighbourCount(piece,pieces){return uniquePhysicalConnections(piece,pieces).reduce((count,c)=>count+((Number(pieceById(pieces,c.toPieceId)?.tile?.powerMultiplier)||1)>1?1:0),0)}
  function isPairTopology(piece,pieces){
    if(!piece)return false;
    return pieces.some(other=>{
      if(!other||other.id===piece.id||other.z!==piece.z||other.axis!==piece.axis)return false;
      const contact=contactBetweenPieces(piece,other);if(!contact.ok||!contact.touch)return false;
      if(piece.axis==='H')return piece.rect.minx===other.rect.minx&&piece.rect.maxx===other.rect.maxx&&(piece.rect.maxy===other.rect.miny||other.rect.maxy===piece.rect.miny);
      return piece.rect.miny===other.rect.miny&&piece.rect.maxy===other.rect.maxy&&(piece.rect.maxx===other.rect.minx||other.rect.maxx===piece.rect.minx)
    })
  }
  function physicalNeighbourProfiles(piece,pieces){
    const map=new Map();
    for(const c of connectionsForPiece(piece,pieces)){
      let p=map.get(c.toPieceId);
      if(!p){p={toPieceId:c.toPieceId,fromHalves:new Set(),fromSides:new Set()};map.set(c.toPieceId,p)}
      p.fromHalves.add(c.fromHalf);p.fromSides.add(c.fromSide)
    }
    return[...map.values()]
  }
  function physicalAdjacencyGraph(pieces){
    const graph=new Map(pieces.map(p=>[p.id,new Set()]));
    for(let i=0;i<pieces.length;i++)for(let j=i+1;j<pieces.length;j++){
      const r=contactBetweenPieces(pieces[i],pieces[j]);
      if(r.touch&&r.ok){graph.get(pieces[i].id).add(pieces[j].id);graph.get(pieces[j].id).add(pieces[i].id)}
    }
    return graph
  }
  function reachableWithout(graph,start,blocked){
    const seen=new Set();if(start===blocked||!graph.has(start))return seen;
    const queue=[start];seen.add(start);
    for(let i=0;i<queue.length;i++)for(const next of graph.get(queue[i])||[])if(next!==blocked&&!seen.has(next)){seen.add(next);queue.push(next)}
    return seen
  }
  function shortestDistanceWithout(graph,start,end,blocked){
    if(start===blocked||end===blocked||!graph.has(start)||!graph.has(end))return Infinity;
    const queue=[start],distance=new Map([[start,0]]);
    for(let i=0;i<queue.length;i++){const current=queue[i],d=distance.get(current);if(current===end)return d;for(const next of graph.get(current)||[])if(next!==blocked&&!distance.has(next)){distance.set(next,d+1);queue.push(next)}}
    return Infinity
  }
  function isBridgeTopology(piece,graph){const neighbours=[...(graph.get(piece?.id)||[])];if(neighbours.length<2)return false;const seen=reachableWithout(graph,neighbours[0],piece.id);return neighbours.slice(1).some(id=>!seen.has(id))}
  function isFrameTopology(piece,graph){
    const neighbours=[...(graph.get(piece?.id)||[])];if(neighbours.length<2)return false;
    for(let i=0;i<neighbours.length;i++)for(let j=i+1;j<neighbours.length;j++){const d=shortestDistanceWithout(graph,neighbours[i],neighbours[j],piece.id);if(d>=2&&Number.isFinite(d))return true}
    return false
  }
  function isGateTopology(piece,profiles){
    if(!piece||piece.double||profiles.length!==2||profiles.some(p=>p.fromHalves.size!==1))return false;
    return new Set(profiles.map(p=>[...p.fromHalves][0])).size===2
  }
  function isFanTopology(profiles){
    if(profiles.length!==3||profiles.some(p=>p.fromHalves.size!==1||p.fromSides.size!==1))return false;
    const halves=new Set(profiles.map(p=>[...p.fromHalves][0])),sides=new Set(profiles.map(p=>[...p.fromSides][0]));
    return halves.size===1&&sides.size===3
  }
  function isCrownTopology(profiles){
    if(profiles.length!==3)return false;
    const halves=new Set(),sides=new Set();
    for(const p of profiles){for(const half of p.fromHalves)halves.add(half);for(const side of p.fromSides)sides.add(side)}
    return halves.size===2&&sides.size===3
  }
  function isFrontierTopology(piece,profiles){
    if(!piece||profiles.length<2)return false;
    const occupied=new Set();for(const p of profiles)for(const side of p.fromSides)occupied.add(side);
    const longSides=piece.axis==='H'?['U','D']:['L','R'];
    return longSides.some(side=>!occupied.has(side))
  }
  function isFullCross(piece,pieces){const conns=uniquePhysicalConnections(piece,pieces);return!!piece?.double&&piece.tile?.a>0&&conns.length===4&&new Set(conns.map(c=>c.fromSide)).size===4}
  function applyOp(v,isDouble,state,doubleDouble=false,powerMultiplier=1){
    const before=state.output||0,power=Math.max(1,Number(powerMultiplier)||1);
    if(v===0)return{type:'zero',before,after:before,delta:0,doubleDouble:false,powerMultiplier:power};
    if(v===2||v===4||v===6){const baseAdd=v*(doubleDouble&&isDouble?2:1),add=baseAdd*power,after=before+add;state.output=after;return{type:'add',before,after,add,delta:add,doubleDouble:!!(doubleDouble&&isDouble),powerMultiplier:power}}
    if(v===1||v===3||v===5){const baseFactor=doubleDouble&&isDouble?v*v:v,factor=baseFactor*power,after=before*factor;state.output=after;return{type:'multiply',before,after,factor,delta:after-before,doubleDouble:!!(doubleDouble&&isDouble),powerMultiplier:power}}
    return{type:'none',before,after:before,delta:0,doubleDouble:false,powerMultiplier:power}
  }
  function startChoices(newPieceId,pieces){const p=pieceById(pieces,newPieceId);if(!p)return[];const out=[];for(const c of connectionsForPiece(p,pieces)){out.push({...c,entryHalf:c.toHalf,flipped:false,key:connectionKey(c)+':N'});out.push({...c,entryHalf:1-c.toHalf,flipped:true,key:connectionKey(c)+':F'})}const seen=new Set();return out.filter(c=>{const k=`${c.toPieceId}:${c.entryHalf}:${c.fromHalf}`;if(seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>a.key.localeCompare(b.key))}
  const extKey=(a,ah,b,bh)=>`E:${a}:${ah}>${b}:${bh}`;
  const cloneMap=m=>new Map(m);
  const cloneState=s=>({current:{...s.current},mode:s.mode,output:s.output,initialOutput:s.initialOutput,suppressZeroPiece:s.suppressZeroPiece,doubleDoubleUsed:!!s.doubleDoubleUsed,splitUsed:new Set(s.splitUsed||[]),usedEdges:new Set(s.usedEdges),zeroCharges:cloneMap(s.zeroCharges),zeroPortUsed:new Set(s.zeroPortUsed||[]),back:s.back.map(x=>({...x})),forward:s.forward.map(x=>({...x})),path:s.path.map(x=>({...x})),segments:s.segments.map(x=>({...x,from:{...x.from},to:{...x.to}})),events:s.events.map(x=>({...x})),traversals:s.traversals,rebounds:s.rebounds});
  function terminal(s,reason,meta={}){const events=[...s.events,{type:'die',reason}],output=s.output||0;return{output,gain:output-(s.initialOutput||0),path:s.path,segments:s.segments,events,zeroCharges:s.zeroCharges,reason,traversals:s.traversals,rebounds:s.rebounds,...meta}}
  function better(a,b){if(!b)return true;const av=[a.traversals||0,a.output||0,a.rebounds||0,(a.path||[]).length],bv=[b.traversals||0,b.output||0,b.rebounds||0,(b.path||[]).length];for(let i=0;i<av.length;i++){if(av[i]!==bv[i])return av[i]>bv[i]}return false}
  function replaySelectedScoring(result,initialOutput,opts={}){
    const powers=opts.powerByPiece||new Map(),pieces=opts.pieces||[],modsByPiece=opts.modIdsByPiece||new Map(),circuitRanks=opts.circuitRankByPiece||new Map(),powered=[...powers.values()].some(p=>p>1),modified=[...modsByPiece.values()].some(v=>v&&v.size);
    if(!powered&&!modified)return result;
    let output=initialOutput;const events=[],forks=new Map(),pieceMap=new Map(pieces.map(p=>[p.id,p]));
    let topologyGraph=null;const graph=()=>topologyGraph||(topologyGraph=physicalAdjacencyGraph(pieces));
    for(const raw of result.events||[]){
      if(raw.type==='signal-fork'){forks.set(raw.piece,{output,results:[]});events.push({...raw,output});continue}
      if(raw.type==='signal-start'){const fork=forks.get(raw.fork);output=fork.output;events.push({...raw,output});continue}
      if(raw.type==='signal-end'){const fork=forks.get(raw.fork);fork.results.push(output);events.push({...raw,output});continue}
      if(raw.type==='signal-join'){const fork=forks.get(raw.piece);output=fork.results.reduce((a,b)=>a+b,0);events.push({...raw,output});forks.delete(raw.piece);continue}
      if(raw.type==='op'){
        const e={...raw,before:output},mods=modsByPiece.get(e.piece)||new Set(),piece=pieceMap.get(e.piece),power=Math.max(1,Number(powers.get(e.piece))||1);
        const connections=piece?uniqueConnectionCount(piece,pieces):0,cornerTopology=piece?isCornerTopology(piece,pieces):false,straightLine=piece?straightLineLength(piece,pieces):0;
        const sequenceEligible=!!piece&&Math.abs(Number(piece.tile?.a)-Number(piece.tile?.b))===1,complementEligible=!!piece&&Number(piece.tile?.a)+Number(piece.tile?.b)===6,twinConnected=piece?hasTwinConnection(piece,pieces):false,pairTopology=piece?isPairTopology(piece,pieces):false;
        const needsProfiles=!!piece&&(mods.has('gate')||mods.has('fan')||mods.has('crown')||mods.has('frontier')),profiles=needsProfiles?physicalNeighbourProfiles(piece,pieces):[];
        const bridgeTopology=!!piece&&mods.has('bridge')?isBridgeTopology(piece,graph()):false,gateTopology=mods.has('gate')?isGateTopology(piece,profiles):false,fanTopology=mods.has('fan')?isFanTopology(profiles):false,frameTopology=!!piece&&mods.has('frame')?isFrameTopology(piece,graph()):false,crownTopology=mods.has('crown')?isCrownTopology(profiles):false,frontierTopology=mods.has('frontier')?isFrontierTopology(piece,profiles):false;
        const powerNeighbours=!!piece&&(mods.has('relay')||mods.has('coupler'))?poweredNeighbourCount(piece,pieces):0,relayActive=mods.has('relay')&&powerNeighbours>=2,couplerActive=mods.has('coupler')&&powerNeighbours>=1;
        const circuitRank=Math.max(0,Number(circuitRanks.get(e.piece))||0),resonatorActive=mods.has('resonator')&&circuitRank>0,upgradeTier=Math.max(0,Number(piece?.tile?.upgrade)||0),forgeActive=mods.has('forge')&&upgradeTier>0;
        let modMultiplier=1,operation=e.op;
        if(mods.has('parity-exchange')&&e.value!==0)operation=e.value%2===0?'multiply':'add';
        if(mods.has('corner')&&cornerTopology)modMultiplier*=Math.max(1,Number(opts.cornerMultiplier)||3);
        if(mods.has('long-line')&&straightLine>=Math.max(1,Number(opts.longLineThreshold)||3))modMultiplier*=straightLine>=Math.max(1,Number(opts.longLineHighThreshold)||5)?Math.max(1,Number(opts.longLineHighMultiplier)||3):Math.max(1,Number(opts.longLineMultiplier)||2);
        if(mods.has('overload'))modMultiplier*=Math.max(1,Math.min(Math.max(1,Number(opts.overloadMaxMultiplier)||4),connections||1));
        if(mods.has('terminal')&&connections===1)modMultiplier*=Math.max(1,Number(opts.terminalMultiplier)||3);
        if(mods.has('sequence')&&sequenceEligible)modMultiplier*=Math.max(1,Number(opts.sequenceMultiplier)||2);
        if(mods.has('complement')&&complementEligible)modMultiplier*=Math.max(1,Number(opts.complementMultiplier)||2);
        if(mods.has('twin')&&twinConnected)modMultiplier*=Math.max(1,Number(opts.twinMultiplier)||3);
        if(mods.has('pair')&&pairTopology)modMultiplier*=Math.max(1,Number(opts.pairMultiplier)||3);
        if(mods.has('bridge')&&bridgeTopology)modMultiplier*=Math.max(1,Number(opts.bridgeMultiplier)||3);
        if(mods.has('gate')&&gateTopology)modMultiplier*=Math.max(1,Number(opts.gateMultiplier)||2);
        if(mods.has('fan')&&fanTopology)modMultiplier*=Math.max(1,Number(opts.fanMultiplier)||4);
        if(mods.has('frame')&&frameTopology)modMultiplier*=Math.max(1,Number(opts.frameMultiplier)||2);
        if(mods.has('crown')&&crownTopology)modMultiplier*=Math.max(1,Number(opts.crownMultiplier)||4);
        if(mods.has('frontier')&&frontierTopology)modMultiplier*=Math.max(1,Number(opts.frontierMultiplier)||2);
        if(relayActive)modMultiplier*=Math.max(1,Number(opts.relayMultiplier)||3);
        if(couplerActive)modMultiplier*=Math.max(1,Number(opts.couplerMultiplier)||2);
        if(resonatorActive)modMultiplier*=circuitRank>=Math.max(1,Number(opts.resonatorHighRankThreshold)||3)?Math.max(1,Number(opts.resonatorHighMultiplier)||3):Math.max(1,Number(opts.resonatorLowMultiplier)||2);
        if(forgeActive)modMultiplier*=upgradeTier>=Math.max(1,Number(opts.forgeHighUpgradeThreshold)||3)?Math.max(1,Number(opts.forgeHighMultiplier)||3):Math.max(1,Number(opts.forgeLowMultiplier)||2);
        const magnitude=power*modMultiplier,v=e.value,baseAdd=v*(e.doubleDouble?2:1),baseFactor=e.doubleDouble?v*v:v;
        const normalAdd=v*magnitude,normalFactor=v*magnitude;
        e.op=operation;e.powerMultiplier=power;e.modMultiplier=modMultiplier;e.connectionCount=connections;e.corner=cornerTopology;e.straightLineLength=straightLine;e.sequence=sequenceEligible;e.complement=complementEligible;e.twin=twinConnected;e.pair=pairTopology;e.bridge=bridgeTopology;e.gate=gateTopology;e.fan=fanTopology;e.frame=frameTopology;e.crown=crownTopology;e.frontier=frontierTopology;e.powerNeighbourCount=powerNeighbours;e.relay=relayActive;e.coupler=couplerActive;e.circuitRank=circuitRank;e.resonator=resonatorActive;e.upgradeTier=upgradeTier;e.forge=forgeActive;e.normalAdd=normalAdd;e.normalFactor=normalFactor;
        if(operation==='multiply'){e.factor=baseFactor*magnitude;e.add=0;e.after=output*(e.factor||1);e.delta=e.after-output;output=e.after}
        else if(operation==='add'){e.add=baseAdd*magnitude;e.factor=0;e.after=output+(e.add||0);e.delta=e.after-output;output=e.after}
        else{e.add=0;e.factor=0;e.after=output;e.delta=0}
        events.push(e);continue
      }
      events.push({...raw})
    }
    return{...result,selectionOutput:result.output,output,gain:output-initialOutput,events}
  }
  function replaySelectedEcho(result,opts={}){
    if(!opts.doubleEchoPieceId)return result;
    const events=[],scope=[],echoForks=new Map();let echoActive=false,echoDone=false,activationScope=[],echoOutput=0,echoRebounds=0;
    const normalEchoOp=raw=>{
      const before=echoOutput,v=raw.value,power=Math.max(1,Number(raw.powerMultiplier)||1),modMultiplier=Math.max(1,Number(raw.modMultiplier)||1);let op=raw.op||'zero',add=0,factor=0;
      if(op==='add'){add=Number(raw.normalAdd)||v*power*modMultiplier;echoOutput+=add}
      else if(op==='multiply'){factor=Number(raw.normalFactor)||v*power*modMultiplier;echoOutput*=factor}
      return{type:'echo-op',piece:raw.piece,entryHalf:raw.entryHalf,exitHalf:raw.exitHalf,value:v,op,before,after:echoOutput,add,factor,powerMultiplier:power,modMultiplier,reverse:!!raw.reverse}
    };
    for(const raw of result.events||[]){
      events.push({...raw});
      if(!echoActive&&!echoDone&&raw.type==='op'&&raw.piece===opts.doubleEchoPieceId){
        echoActive=true;echoOutput=raw.after;activationScope=scope.map(x=>({...x}));events.push({type:'double-echo-start',piece:raw.piece,startOutput:echoOutput});continue
      }
      if(!echoActive){
        if(raw.type==='signal-start')scope.push({fork:raw.fork,arm:raw.arm});
        else if(raw.type==='signal-end')scope.pop();
        continue
      }
      if(raw.type==='signal-fork'){
        echoForks.set(raw.piece,{seed:echoOutput,results:[]});
        events.push({type:'echo-signal-fork',piece:raw.piece,output:echoOutput});continue
      }
      if(raw.type==='signal-start'){
        scope.push({fork:raw.fork,arm:raw.arm});const fork=echoForks.get(raw.fork);
        if(fork){echoOutput=fork.seed;events.push({type:'echo-signal-start',fork:raw.fork,arm:raw.arm,output:echoOutput})}
        continue
      }
      if(raw.type==='signal-end'){
        const top=scope[scope.length-1],fork=echoForks.get(raw.fork);
        if(fork){fork.results[raw.arm]=echoOutput;events.push({type:'echo-signal-end',fork:raw.fork,arm:raw.arm,output:echoOutput})}
        const activationTop=activationScope[activationScope.length-1],closesActivation=activationTop&&scope.length===activationScope.length&&top?.fork===activationTop.fork&&top?.arm===activationTop.arm;
        scope.pop();
        if(closesActivation&&!fork){echoActive=false;echoDone=true}
        continue
      }
      if(raw.type==='signal-join'){
        const fork=echoForks.get(raw.piece);if(fork){echoOutput=fork.results.reduce((sum,v)=>sum+(Number(v)||0),0);events.push({type:'echo-signal-join',piece:raw.piece,output:echoOutput});echoForks.delete(raw.piece)}
        continue
      }
      if(raw.type==='op')events.push(normalEchoOp(raw));
      else if(raw.type==='rebound'){echoRebounds++;events.push({type:'echo-rebound',piece:raw.piece,charge:raw.charge})}
    }
    if(!echoActive&&!echoDone&&events.every(e=>e.type!=='double-echo-start'))return result;
    if(!events.some(e=>e.type==='double-echo-start'))return result;
    const mainOutput=result.output,output=mainOutput+echoOutput;
    const die=events.length&&events[events.length-1].type==='die'?events.pop():null;events.push({type:'double-echo-result',piece:opts.doubleEchoPieceId,mainOutput,echoOutput,finalOutput:output,echoRebounds});if(die)events.push(die);
    return{...result,mainOutput,echoOutput,output,gain:output-(opts.initialOutput||0),events,doubleEchoActivated:true,echoRebounds}
  }
  function bestSignal(newPieceId,pieces,opts={}){
    const initialOutput=Number.isFinite(opts.initialOutput)?opts.initialOutput:0;
    const newPiece=pieceById(pieces,newPieceId);if(!newPiece)return{output:initialOutput,gain:0,path:[],segments:[],events:[],reason:'missing-new-piece',traversals:0,rebounds:0,search:{starts:0,expanded:0,leaves:0,truncated:false}};
    const starts=startChoices(newPieceId,pieces);if(!starts.length)return{output:initialOutput,gain:0,path:[],segments:[],events:[],reason:'no-start',traversals:0,rebounds:0,search:{starts:0,expanded:0,leaves:1,truncated:false}};
    const maxExpanded=opts.maxExpanded||50000;let expanded=0,leaves=0,truncated=false,best=null;
    let searchLimit=maxExpanded;
    function finish(s,reason){leaves++;return{...terminal(s,reason),splitUsed:new Set(s.splitUsed||[]),doubleDoubleUsed:!!s.doubleDoubleUsed}}
    function follow(s,conns,exitHalf){
      let selected=null;
      for(const c of conns){
        if(expanded>=searchLimit){truncated=true;break}
        const n=cloneState(s);n.current.entryHalf=1-exitHalf;n.usedEdges.add(c.key);n.back.push({...n.current});
        for(let i=n.events.length-1;i>=0;i--){const e=n.events[i];if(e.type==='op'&&e.piece===s.current.pieceId){e.exitSide=c.fromSide;e.toPieceId=c.toPieceId;break}if(e.type==='op')break}
        n.current={pieceId:c.toPieceId,entryHalf:c.toHalf,fromPieceId:s.current.pieceId,fromHalf:c.fromHalf};
        n.events.push({type:'route',piece:s.current.pieceId,entryHalf:1-exitHalf,exitHalf,toPieceId:c.toPieceId,toHalf:c.toHalf,fromSide:c.fromSide,toSide:c.toSide,key:c.choiceKey});
        const r=walk(n);if(better(r,selected))selected=r
      }
      return selected||finish(s,'search-limit')
    }
    function tripleDoubleFork(s,cur,connections){
      if(!opts.bifurcate||cur.id!==opts.tripleDoublePieceId||s.splitUsed.has(cur.id)||!isFullCross(cur,pieces))return null;
      const byPiece=new Map();for(const c of connections)if(!byPiece.has(c.toPieceId))byPiece.set(c.toPieceId,c);const arms=[...byPiece.values()].sort((a,b)=>a.choiceKey.localeCompare(b.choiceKey));
      if(arms.length!==3)return null;
      if(searchLimit-expanded<3){truncated=true;return null}
      const seed=cloneState(s);seed.splitUsed.add(cur.id);
      const results=[],parentLimit=searchLimit;let spent=seed.splitUsed,ddUsed=seed.doubleDoubleUsed;
      for(let arm=0;arm<arms.length;arm++){
        searchLimit=parentLimit-Math.max(0,arms.length-1-arm);
        const branch=cloneState(seed);branch.splitUsed=new Set(spent);branch.doubleDoubleUsed=ddUsed;branch.events=[];branch.path=[];branch.segments=[];branch.traversals=0;branch.rebounds=0;
        const c=arms[arm],r=follow(branch,[c],c.fromHalf);results.push(r);spent=r.splitUsed;ddUsed=r.doubleDoubleUsed
      }
      searchLimit=parentLimit;
      const output=results.reduce((sum,r)=>sum+r.output,0),events=[...s.events,{type:'signal-fork',piece:cur.id,output:s.output,splitKind:'triple-double'}];
      results.forEach((r,arm)=>events.push({type:'signal-start',fork:cur.id,arm,output:s.output},...r.events,{type:'signal-end',fork:cur.id,arm,output:r.output}));events.push({type:'signal-join',piece:cur.id,output});
      return{output,gain:output-s.initialOutput,events,reason:'triple-double-split',path:[...s.path,...results.flatMap(r=>r.path)],segments:[...s.segments,...results.flatMap(r=>r.segments)],traversals:s.traversals+results.reduce((sum,r)=>sum+r.traversals,0),rebounds:s.rebounds+results.reduce((sum,r)=>sum+r.rebounds,0),splitUsed:spent,doubleDoubleUsed:ddUsed,zeroCharges:s.zeroCharges}
    }
    function fork(s,cur,connections){
      if(!opts.bifurcate||!cur.double||cur.tile.a===0||s.splitUsed.has(cur.id))return null;
      const previous=pieceById(pieces,s.current.fromPieceId),relation=previous&&pieceEdgeRelation(cur,previous);
      if(!relation||!isLongSide(cur,relation.sideA)||relation.len!==S)return null;
      const splitKind=isCenteredOnDouble(cur,relation,relation.sideA)?'centered':'offset-L';
      // Only the two physical short ends distribute. Side contacts are not
      // extra arms. Half 0 precedes half 1, independent of board-array order.
      const arms=[0,1].map(half=>connections.filter(c=>c.fromHalf===half&&!isLongSide(cur,c.fromSide)));
      if(arms.some(cs=>!cs.length))return null;
      // Never award a copied arm that the search budget could not even enter.
      if(searchLimit-expanded<2){truncated=true;return null}
      const seed=cloneState(s);seed.splitUsed.add(cur.id);
      const results=[],parentLimit=searchLimit;let spent=seed.splitUsed,ddUsed=seed.doubleDoubleUsed;
      for(let half=0;half<2;half++){
        searchLimit=parentLimit-(half===0?1:0);
        const branch=cloneState(seed);branch.splitUsed=new Set(spent);branch.doubleDoubleUsed=ddUsed;
        branch.events=[];branch.path=[];branch.segments=[];branch.traversals=0;branch.rebounds=0;
        const r=follow(branch,arms[half],half);results.push(r);spent=r.splitUsed;ddUsed=r.doubleDoubleUsed
      }
      searchLimit=parentLimit;
      const output=results.reduce((sum,r)=>sum+r.output,0),events=[...s.events,{type:'signal-fork',piece:cur.id,output:s.output,splitKind}];
      results.forEach((r,arm)=>events.push({type:'signal-start',fork:cur.id,arm,output:s.output},...r.events,{type:'signal-end',fork:cur.id,arm,output:r.output}));
      events.push({type:'signal-join',piece:cur.id,output});
      return{output,gain:output-s.initialOutput,events,reason:'split-complete',
        path:[...s.path,...results.flatMap(r=>r.path)],segments:[...s.segments,...results.flatMap(r=>r.segments)],
        traversals:s.traversals+results.reduce((sum,r)=>sum+r.traversals,0),rebounds:s.rebounds+results.reduce((sum,r)=>sum+r.rebounds,0),
        splitUsed:spent,doubleDoubleUsed:ddUsed,zeroCharges:s.zeroCharges}
    }
    function zeroPortFork(s,dest){
      const available=connectionsForPiece(dest,pieces).map(c=>({...c,key:extKey(dest.id,c.fromHalf,c.toPieceId,c.toHalf),choiceKey:connectionKey(c)})).filter(c=>!s.usedEdges.has(c.key)).sort((a,b)=>a.choiceKey.localeCompare(b.choiceKey));
      const arms=[0,1].map(half=>available.filter(c=>c.fromHalf===half&&!isLongSide(dest,c.fromSide)));
      const results=[],seed=cloneState(s);seed.current={pieceId:dest.id,entryHalf:0,fromPieceId:s.current.pieceId,fromHalf:0};seed.back=[];seed.forward=[];
      for(let half=0;half<2;half++){
        const branch=cloneState(seed);branch.events=[];branch.path=[];branch.segments=[];branch.traversals=0;branch.rebounds=0;
        const r=arms[half].length?follow(branch,arms[half],half):finish(branch,'zero-port-open-end');results.push(r)
      }
      const output=results.reduce((sum,r)=>sum+r.output,0),events=[...s.events,{type:'signal-fork',piece:dest.id,output:s.output,splitKind:'zero-port'}];
      results.forEach((r,arm)=>events.push({type:'signal-start',fork:dest.id,arm,output:s.output},...r.events,{type:'signal-end',fork:dest.id,arm,output:r.output}));
      events.push({type:'signal-join',piece:dest.id,output});
      return{output,gain:output-s.initialOutput,events,reason:'zero-port-split',path:[...s.path,...results.flatMap(r=>r.path)],segments:[...s.segments,...results.flatMap(r=>r.segments)],traversals:s.traversals+results.reduce((sum,r)=>sum+r.traversals,0),rebounds:s.rebounds+results.reduce((sum,r)=>sum+r.rebounds,0),splitUsed:new Set(s.splitUsed||[]),doubleDoubleUsed:!!s.doubleDoubleUsed,zeroCharges:s.zeroCharges,zeroPortUsed:s.zeroPortUsed}
    }
    function walk(s){
      s.splitUsed??=new Set();
      if(++expanded>searchLimit){truncated=true;return finish(s,'search-limit')}
      const cur=pieceById(pieces,s.current.pieceId);if(!cur)return finish(s,'missing-piece');
      const entryHalf=s.mode===1?s.current.entryHalf:1-s.current.entryHalf,inC=cur.cubes.find(c=>c.half===entryHalf)||cur.cubes[0],outC=cur.cubes.find(c=>c.half!==inC.half)||cur.cubes[1],from=cubeCenter(inC),to=cubeCenter(outC);
      s.path.push(from,to);s.segments.push({piece:cur.id,from,to,reverse:s.mode===-1,entryHalf:inC.half,exitHalf:outC.half});s.traversals++;
      const previous=pieceById(pieces,s.current.fromPieceId),entryRelation=previous&&pieceEdgeRelation(cur,previous),entrySide=entryRelation?.sideA||null;
      const doubleDouble=cur.id===opts.doubleDoublePieceId&&!s.doubleDoubleUsed,powerMultiplier=1;const op=applyOp(outC.v,cur.double,s,doubleDouble,powerMultiplier);if(op.doubleDouble)s.doubleDoubleUsed=true;s.events.push({type:'op',piece:cur.id,entryHalf:inC.half,exitHalf:outC.half,fromPieceId:s.current.fromPieceId||null,entrySide,value:outC.v,op:op.type,before:op.before,after:op.after,add:op.add||0,factor:op.factor||0,delta:op.delta||0,doubleDouble:!!op.doubleDouble,powerMultiplier,reverse:s.mode===-1});
      if(outC.v===0){const zeroPorts=Array.isArray(opts.zeroPortPieceIds)?opts.zeroPortPieceIds.filter(Boolean):[];if(zeroPorts.length===2&&zeroPorts.includes(cur.id)){if(s.zeroPortUsed.has(cur.id))return finish(s,'zero-port-spent');const partner=pieceById(pieces,zeroPorts.find(id=>id!==cur.id));if(partner){s.zeroPortUsed.add(cur.id);s.events.push({type:'zero-port',piece:cur.id,toPieceId:partner.id,fromHalf:outC.half});if(partner.double&&partner.tile.a===0)return zeroPortFork(s,partner);const zeroCube=partner.cubes.find(c=>c.v===0);if(zeroCube){s.mode=1;s.back=[];s.forward=[];s.current={pieceId:partner.id,entryHalf:zeroCube.half,fromPieceId:cur.id,fromHalf:outC.half};return walk(s)}}}
        const cap=cur.double?2:1,used=s.zeroCharges.get(cur.id)||0;if(s.suppressZeroPiece===cur.id){s.suppressZeroPiece=null;s.events.push({type:'zero-pass',piece:cur.id})}else if(used<cap){s.zeroCharges.set(cur.id,used+1);s.mode*=-1;s.rebounds++;if(cur.double)s.suppressZeroPiece=cur.id;s.events.push({type:'rebound',piece:cur.id,charge:used+1});return walk(s)}else return finish(s,'zero-spent')}
      if(s.mode===-1){if(!s.back.length)return finish(s,'back-at-origin');const prev=s.back[s.back.length-1],k=extKey(cur.id,outC.half,prev.pieceId,1-prev.entryHalf);s.forward.push({...s.current});s.current=s.back.pop();s.events.push({type:'move',fromPiece:cur.id,fromHalf:outC.half,toPiece:s.current.pieceId,toHalf:1-s.current.entryHalf,reverse:true,retrace:true,key:k});return walk(s)}
      if(s.forward.length){const nxt=s.forward[s.forward.length-1],k=extKey(cur.id,outC.half,nxt.pieceId,nxt.entryHalf);s.back.push({...s.current});s.current=s.forward.pop();s.events.push({type:'move',fromPiece:cur.id,fromHalf:outC.half,toPiece:s.current.pieceId,toHalf:s.current.entryHalf,reverse:false,replay:true,retrace:true,key:k});return walk(s)}
      const available=connectionsForPiece(cur,pieces).filter(c=>c.toPieceId!==s.current.fromPieceId).map(c=>({...c,key:extKey(cur.id,c.fromHalf,c.toPieceId,c.toHalf),choiceKey:connectionKey(c)})).filter(c=>!s.usedEdges.has(c.key)).sort((a,b)=>a.choiceKey.localeCompare(b.choiceKey));
      const tripleSplit=tripleDoubleFork(s,cur,available);if(tripleSplit)return tripleSplit;
      const split=fork(s,cur,available);if(split)return split;
      const conns=available.filter(c=>c.fromHalf===outC.half);if(!conns.length)return finish(s,'no-exit');
      return follow(s,conns,outC.half)
    }
    for(const first of starts){const st={current:{pieceId:first.toPieceId,entryHalf:first.entryHalf,fromPieceId:newPieceId,fromHalf:first.fromHalf},mode:1,output:initialOutput,initialOutput,suppressZeroPiece:null,doubleDoubleUsed:false,splitUsed:new Set(),usedEdges:new Set([extKey(newPieceId,first.fromHalf,first.toPieceId,first.toHalf)]),zeroCharges:new Map(),zeroPortUsed:new Set(),back:[],forward:[],path:[],segments:[],events:[{type:'start',key:first.key,toPieceId:first.toPieceId,toHalf:first.entryHalf,fromHalf:first.fromHalf,flipped:first.flipped}],traversals:0,rebounds:0};const r=walk(st);if(better(r,best))best=r;if(expanded>=maxExpanded){truncated=true;break}}
    best=best||{output:initialOutput,gain:0,path:[],segments:[],events:[],reason:'no-route',traversals:0,rebounds:0};best.search={starts:starts.length,expanded,leaves,truncated};best=replaySelectedScoring(best,initialOutput,{...opts,pieces,powerByPiece:new Map(pieces.map(p=>[p.id,Math.max(1,Number(p.tile?.powerMultiplier)||1)]))});return replaySelectedEcho(best,{...opts,initialOutput})
  }
  function simulateSignal(newPieceId,pieces,opts={}){return bestSignal(newPieceId,pieces,opts)}
  function portKey(pieceId,half,side){return`${pieceId}:${half}:${side}`}
  function exposedPorts(tile,z,pieces){const placements=allPlacements(tile,z,pieces),groups=new Map();for(const pl of placements)for(const group of pl.contacts||[]){if(group.kind==='double-centered'&&group.piece.double){const side=group.relation.sideB,key=`${group.piece.id}:center:${side}`;if(!groups.has(key))groups.set(key,{key,pieceId:group.piece.id,half:null,side,value:group.piece.tile.a,centered:true,placements:[]});const g=groups.get(key);if(!g.placements.some(p=>placementKey(tile,p)===placementKey(tile,pl)))g.placements.push(pl);continue}for(const c of group.contacts||[]){const key=portKey(group.piece.id,c.bHalf,c.otherSide);if(!groups.has(key))groups.set(key,{key,pieceId:group.piece.id,half:c.bHalf,side:c.otherSide,value:c.bV,centered:false,placements:[]});const g=groups.get(key);if(!g.placements.some(p=>placementKey(tile,p)===placementKey(tile,pl)))g.placements.push(pl)}}return[...groups.values()]}
  const api={S,DIR,ARROW,axis,setBoardSize,getBoardSize,cubesFor,rectForCubes,pieceFrom,edgeContact,contactBetweenPieces,validatePlacement,allPlacements,hasAnyPlacement,hasLegalMove,cubeCenter,connectionsForPiece,connectionKey,startChoices,applyOp,replaySelectedScoring,replaySelectedEcho,bestSignal,simulateSignal,exposedPorts};
  Object.defineProperties(api,{G:{enumerable:true,get:()=>G},H:{enumerable:true,get:()=>H}});
  return api;
});
