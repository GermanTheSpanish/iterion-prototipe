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
  function mirrorOutwardValues(piece,pieces){
    if(!piece||piece.double)return null;
    const byHalf=[new Map(),new Map()];
    for(const c of connectionsForPiece(piece,pieces)){
      if(c.fromHalf!==0&&c.fromHalf!==1)continue;
      if(!byHalf[c.fromHalf].has(c.toPieceId))byHalf[c.fromHalf].set(c.toPieceId,[]);
      byHalf[c.fromHalf].get(c.toPieceId).push(c)
    }
    if(byHalf[0].size!==1||byHalf[1].size!==1)return null;
    const left=[...byHalf[0].entries()][0],right=[...byHalf[1].entries()][0];if(left[0]===right[0])return null;
    const outward=(entry)=>{
      const neighbour=pieceById(pieces,entry[0]),halves=new Set(entry[1].map(c=>c.toHalf));
      if(!neighbour||halves.size!==1)return null;
      const touching=[...halves][0];return Number(touching===0?neighbour.tile?.b:neighbour.tile?.a)
    };
    const a=outward(left),b=outward(right);return Number.isFinite(a)&&Number.isFinite(b)?[a,b]:null
  }
  function isMirrorTopology(piece,pieces){const values=mirrorOutwardValues(piece,pieces);return!!values&&values[0]===values[1]}

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
  function modGeometryFacts(piece,pieces){
    if(!piece)return null;
    const conns=uniquePhysicalConnections(piece,pieces),profiles=physicalNeighbourProfiles(piece,pieces),graph=physicalAdjacencyGraph(pieces),mirror=mirrorOutwardValues(piece,pieces);
    return Object.freeze({
      connectionCount:conns.length,
      connectionSides:Object.freeze(conns.map(c=>c.fromSide)),
      corner:isCornerTopology(piece,pieces),
      straightLineLength:straightLineLength(piece,pieces),
      twin:hasTwinConnection(piece,pieces),
      pair:isPairTopology(piece,pieces),
      bridge:isBridgeTopology(piece,graph),
      frame:isFrameTopology(piece,graph),
      gate:isGateTopology(piece,profiles),
      fan:isFanTopology(profiles),
      crown:isCrownTopology(profiles),
      frontier:isFrontierTopology(piece,profiles),
      fullCross:isFullCross(piece,pieces),
      poweredNeighbourCount:poweredNeighbourCount(piece,pieces),
      mirrorValues:mirror?Object.freeze([...mirror]):null,
      mirror:!!mirror&&mirror[0]===mirror[1]
    })
  }
  function hingeAlternates(piece,pieces){
    if(!piece||piece.double||piece.tile?.a===0||piece.tile?.b===0)return[];
    const out=[],others=pieces.filter(p=>p.id!==piece.id),center={x:(piece.rect.minx+piece.rect.maxx)/2,y:(piece.rect.miny+piece.rect.maxy)/2};
    for(const c of uniquePhysicalConnections(piece,pieces)){
      const pivot=pieceById(pieces,c.toPieceId);if(!pivot)continue;
      const pivotCenter={x:(pivot.rect.minx+pivot.rect.maxx)/2,y:(pivot.rect.miny+pivot.rect.maxy)/2},target={x:2*pivotCenter.x-center.x,y:2*pivotCenter.y-center.y};
      for(let rr=0;rr<4;rr++){
        const [dx,dy]=DIR[rr],x=target.x-S/2-dx*S/2,y=target.y-S/2-dy*S/2;
        if(!Number.isInteger(x)||!Number.isInteger(y))continue;
        if(x===piece.cubes[0].x&&y===piece.cubes[0].y&&rr===piece.rr)continue;
        const valid=validatePlacement(piece.tile,x,y,piece.z,rr,others);if(!valid.ok)continue;
        const candidate=pieceFrom(piece.tile,x,y,piece.z,rr,piece.id),contact=contactBetweenPieces(candidate,pivot);
        if(!contact.touch||!contact.ok)continue;
        out.push({pivotPieceId:pivot.id,pivotTileId:pivot.tile?.id||null,placement:{x,y,z:piece.z,rr},key:`${String(pivot.id).padStart(8,'0')}:${placementKey(piece.tile,{x,y,z:piece.z,rr})}`})
      }
    }
    const seen=new Set();return out.sort((a,b)=>a.key.localeCompare(b.key)).filter(item=>{const k=`${item.pivotPieceId}:${item.placement.x},${item.placement.y},${item.placement.rr}`;if(seen.has(k))return false;seen.add(k);return true})
  }
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
  const clonePiece=p=>p?{...p,tile:{...p.tile},cubes:p.cubes.map(c=>({...c})),rect:{...p.rect}}:null;
  const cloneState=s=>({current:{...s.current},mode:s.mode,output:s.output,initialOutput:s.initialOutput,suppressZeroPiece:s.suppressZeroPiece,doubleDoubleUsed:!!s.doubleDoubleUsed,splitUsed:new Set(s.splitUsed||[]),usedEdges:new Set(s.usedEdges),zeroCharges:cloneMap(s.zeroCharges),zeroPortUsed:new Set(s.zeroPortUsed||[]),returnUsed:!!s.returnUsed,mergeCapture:!!s.mergeCapture,mergeConsumed:!!s.mergeConsumed,mergeFromPieceIds:new Set(s.mergeFromPieceIds||[]),hingeMoved:!!s.hingeMoved,hingeOverride:clonePiece(s.hingeOverride),back:s.back.map(x=>({...x})),forward:s.forward.map(x=>({...x})),path:s.path.map(x=>({...x})),segments:s.segments.map(x=>({...x,from:{...x.from},to:{...x.to}})),events:s.events.map(x=>({...x})),traversals:s.traversals,rebounds:s.rebounds});
  function terminal(s,reason,meta={}){const events=[...s.events,{type:'die',reason}],output=s.output||0;return{output,gain:output-(s.initialOutput||0),path:s.path,segments:s.segments,events,zeroCharges:s.zeroCharges,zeroPortUsed:new Set(s.zeroPortUsed||[]),splitUsed:new Set(s.splitUsed||[]),usedEdges:new Set(s.usedEdges||[]),doubleDoubleUsed:!!s.doubleDoubleUsed,returnUsed:!!s.returnUsed,mergeConsumed:!!s.mergeConsumed,hingeMoved:!!s.hingeMoved,hingeOverride:clonePiece(s.hingeOverride),reason,traversals:s.traversals,rebounds:s.rebounds,...meta}}
  function better(a,b){if(!b)return true;const av=[a.traversals||0,a.output||0,a.rebounds||0,(a.path||[]).length],bv=[b.traversals||0,b.output||0,b.rebounds||0,(b.path||[]).length];for(let i=0;i<av.length;i++){if(av[i]!==bv[i])return av[i]>bv[i]}return false}
  function replaySelectedScoring(result,initialOutput,opts={}){
    const powers=opts.powerByPiece||new Map(),pieces=opts.pieces||[],modsByPiece=opts.modIdsByPiece||new Map(),circuitRanks=opts.circuitRankByPiece||new Map(),foundationAges=opts.foundationAgeByPiece||new Map(),knotCycles=opts.knotCycleCountByPiece||new Map(),powered=[...powers.values()].some(p=>p>1),modified=[...modsByPiece.values()].some(v=>v&&v.size);
    if(!powered&&!modified)return result;
    let output=initialOutput;const events=[],forks=new Map(),returnScores=new Map(),pieceMap=new Map(pieces.map(p=>[p.id,p]));
    let topologyGraph=null;const graph=()=>topologyGraph||(topologyGraph=physicalAdjacencyGraph(pieces));
    for(const raw of result.events||[]){
      if(raw.type==='signal-fork'){forks.set(raw.piece,{output,results:[]});events.push({...raw,output});continue}
      if(raw.type==='signal-start'){const fork=forks.get(raw.fork);output=fork.output;events.push({...raw,output});continue}
      if(raw.type==='signal-end'){const fork=forks.get(raw.fork);fork.results.push(output);events.push({...raw,output});continue}
      if(raw.type==='signal-join'){const fork=forks.get(raw.piece);output=fork.results.reduce((a,b)=>a+(Number(b)||0),0);events.push({...raw,output});forks.delete(raw.piece);continue}
      if(raw.type==='signal-merge'){const fork=forks.get(raw.fork);if(fork){output=fork.results.reduce((a,b)=>a+(Number(b)||0),0);forks.delete(raw.fork)}events.push({...raw,output});continue}
      if(raw.type==='return'){output=returnScores.get(raw.piece)??output;events.push({...raw,output});continue}
      if(raw.type==='op'){
        const e={...raw,before:output},mods=modsByPiece.get(e.piece)||new Set(),piece=pieceMap.get(e.piece),power=Math.max(1,Number(powers.get(e.piece))||1);
        const connections=piece?uniqueConnectionCount(piece,pieces):0,cornerTopology=piece?isCornerTopology(piece,pieces):false,straightLine=piece?straightLineLength(piece,pieces):0;
        const twinConnected=piece?hasTwinConnection(piece,pieces):false,pairTopology=piece?isPairTopology(piece,pieces):false;
        const needsProfiles=!!piece&&(mods.has('gate')||mods.has('fan')||mods.has('crown')||mods.has('frontier')),profiles=needsProfiles?physicalNeighbourProfiles(piece,pieces):[];
        const bridgeTopology=!!piece&&mods.has('bridge')?isBridgeTopology(piece,graph()):false,gateTopology=mods.has('gate')?isGateTopology(piece,profiles):false,fanTopology=mods.has('fan')?isFanTopology(profiles):false,frameTopology=!!piece&&mods.has('frame')?isFrameTopology(piece,graph()):false,crownTopology=mods.has('crown')?isCrownTopology(profiles):false,frontierTopology=mods.has('frontier')?isFrontierTopology(piece,profiles):false;
        const powerNeighbours=piece?poweredNeighbourCount(piece,pieces):0;
        const circuitRank=Math.max(0,Number(circuitRanks.get(e.piece))||0),resonatorActive=mods.has('resonator')&&circuitRank>0,upgradeTier=Math.max(0,Number(piece?.tile?.upgrade)||0),forgeActive=mods.has('forge')&&upgradeTier>0;
        const foundationAge=Math.max(0,Number(foundationAges.get(e.piece))||0),foundationActive=mods.has('foundation')&&foundationAge>=Math.max(1,Number(opts.foundationLowMarkets)||1),knotCycleCount=Math.max(0,Number(knotCycles.get(e.piece))||0),knotActive=mods.has('knot')&&knotCycleCount>=2,mirrorActive=!!piece&&mods.has('mirror')&&isMirrorTopology(piece,pieces),mintAssigned=mods.has('mint');
        let modMultiplier=1,operation=e.op;
        if(mods.has('parity-exchange')&&e.value!==0)operation=e.value%2===0?'multiply':'add';
        if(mods.has('corner')&&cornerTopology)modMultiplier*=Math.max(1,Number(opts.cornerMultiplier)||3);
        if(mods.has('long-line')&&straightLine>=Math.max(1,Number(opts.longLineThreshold)||3))modMultiplier*=straightLine>=Math.max(1,Number(opts.longLineHighThreshold)||5)?Math.max(1,Number(opts.longLineHighMultiplier)||3):Math.max(1,Number(opts.longLineMultiplier)||2);
        if(mods.has('overload'))modMultiplier*=Math.max(1,Math.min(Math.max(1,Number(opts.overloadMaxMultiplier)||4),connections||1));
        if(mods.has('terminal')&&connections===1)modMultiplier*=Math.max(1,Number(opts.terminalMultiplier)||3);
        if(mods.has('twin')&&twinConnected)modMultiplier*=Math.max(1,Number(opts.twinMultiplier)||3);
        if(mods.has('pair')&&pairTopology)modMultiplier*=Math.max(1,Number(opts.pairMultiplier)||3);
        if(mods.has('bridge')&&bridgeTopology)modMultiplier*=Math.max(1,Number(opts.bridgeMultiplier)||3);
        if(mods.has('gate')&&gateTopology)modMultiplier*=Math.max(1,Number(opts.gateMultiplier)||2);
        if(mods.has('fan')&&fanTopology)modMultiplier*=Math.max(1,Number(opts.fanMultiplier)||4);
        if(mods.has('frame')&&frameTopology)modMultiplier*=Math.max(1,Number(opts.frameMultiplier)||2);
        if(mods.has('crown')&&crownTopology)modMultiplier*=Math.max(1,Number(opts.crownMultiplier)||4);
        if(mods.has('frontier')&&frontierTopology)modMultiplier*=Math.max(1,Number(opts.frontierMultiplier)||2);
        if(resonatorActive)modMultiplier*=circuitRank>=Math.max(1,Number(opts.resonatorHighRankThreshold)||3)?Math.max(1,Number(opts.resonatorHighMultiplier)||3):Math.max(1,Number(opts.resonatorLowMultiplier)||2);
        if(forgeActive)modMultiplier*=upgradeTier>=Math.max(1,Number(opts.forgeHighUpgradeThreshold)||3)?Math.max(1,Number(opts.forgeHighMultiplier)||3):Math.max(1,Number(opts.forgeLowMultiplier)||2);
        if(foundationActive)modMultiplier*=foundationAge>=Math.max(1,Number(opts.foundationHighMarkets)||3)?Math.max(1,Number(opts.foundationHighMultiplier)||3):Math.max(1,Number(opts.foundationLowMultiplier)||2);
        if(knotActive)modMultiplier*=Math.max(1,Number(opts.knotMultiplier)||4);
        if(mirrorActive)modMultiplier*=Math.max(1,Number(opts.mirrorMultiplier)||3);
        const magnitude=power*modMultiplier,v=e.value,baseAdd=v*(e.doubleDouble?2:1),baseFactor=e.doubleDouble?v*v:v;
        const normalAdd=v*magnitude,normalFactor=v*magnitude;
        e.op=operation;e.powerMultiplier=power;e.modMultiplier=modMultiplier;e.connectionCount=connections;e.corner=cornerTopology;e.straightLineLength=straightLine;e.twin=twinConnected;e.pair=pairTopology;e.bridge=bridgeTopology;e.gate=gateTopology;e.fan=fanTopology;e.frame=frameTopology;e.crown=crownTopology;e.frontier=frontierTopology;e.powerNeighbourCount=powerNeighbours;e.circuitRank=circuitRank;e.resonator=resonatorActive;e.upgradeTier=upgradeTier;e.forge=forgeActive;e.foundationAge=foundationAge;e.foundation=foundationActive;e.knotCycleCount=knotCycleCount;e.knot=knotActive;e.mirror=mirrorActive;e.mint=mintAssigned;e.normalAdd=normalAdd;e.normalFactor=normalFactor;
        if(operation==='multiply'){e.factor=baseFactor*magnitude;e.add=0;e.after=output*(e.factor||1);e.delta=e.after-output;output=e.after}
        else if(operation==='add'){e.add=baseAdd*magnitude;e.factor=0;e.after=output+(e.add||0);e.delta=e.after-output;output=e.after}
        else{e.add=0;e.factor=0;e.after=output;e.delta=0}
        if(mods.has('return'))returnScores.set(e.piece,output);
        events.push(e);continue
      }
      events.push({...raw})
    }
    return{...result,selectionOutput:result.output,output,gain:output-initialOutput,events}
  }
  function replaySelectedEcho(result,opts={}){
    if(!opts.doubleEchoPieceId)return result;
    const events=[],scope=[],echoForks=new Map(),echoReturnScores=new Map();let echoActive=false,echoDone=false,activationScope=[],echoOutput=0,echoRebounds=0;
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
      if(raw.type==='signal-merge'){
        const fork=echoForks.get(raw.fork);if(fork){echoOutput=fork.results.reduce((sum,v)=>sum+(Number(v)||0),0);events.push({type:'echo-signal-merge',fork:raw.fork,piece:raw.piece,output:echoOutput});echoForks.delete(raw.fork)}
        continue
      }
      if(raw.type==='return'){if(echoReturnScores.has(raw.piece))echoOutput=echoReturnScores.get(raw.piece);events.push({type:'echo-return',piece:raw.piece,output:echoOutput});continue}
      if(raw.type==='op'){const echoOp=normalEchoOp(raw);events.push(echoOp);if(raw.piece===opts.returnPieceId)echoReturnScores.set(raw.piece,echoOutput)}
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
    const runtimePieces=s=>s.hingeOverride?pieces.map(p=>p.id===s.hingeOverride.id?s.hingeOverride:p):pieces;
    const runtimePiece=(s,id)=>s.hingeOverride?.id===id?s.hingeOverride:pieceById(pieces,id);
    const unionSets=(...sets)=>new Set(sets.flatMap(set=>[...(set||[])]));
    const maxMaps=(...maps)=>{const out=new Map();for(const map of maps)for(const [k,v] of map||[])out.set(k,Math.max(Number(out.get(k))||0,Number(v)||0));return out};
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
    function branchCarry(branch,result){
      branch.splitUsed=new Set(result.splitUsed||branch.splitUsed||[]);branch.doubleDoubleUsed=!!result.doubleDoubleUsed;branch.returnUsed=!!result.returnUsed;branch.mergeConsumed=!!result.mergeConsumed;
      branch.hingeMoved=!!result.hingeMoved;branch.hingeOverride=clonePiece(result.hingeOverride||branch.hingeOverride);
      return branch
    }
    function resumeMergeWait(result){
      if(result?.reason!=='merge-wait'||!result.mergeState)return result;
      const state=cloneState(result.mergeState);state.mergeCapture=false;return walk(state)
    }
    function mergeCapturedFork(s,cur,results,splitKind){
      if(results.length!==2||results.some(r=>r?.reason!=='merge-wait'||!r.mergeState))return null;
      if(results[0].mergeAt!==results[1].mergeAt||results[0].mergeEntryHalf!==results[1].mergeEntryHalf)return null;
      const first=results[0].mergeState,second=results[1].mergeState,mergePiece=runtimePiece(second,results[0].mergeAt)||runtimePiece(first,results[0].mergeAt);if(!mergePiece)return null;
      const events=[...s.events,{type:'signal-fork',piece:cur.id,output:s.output,splitKind}];
      results.forEach((r,arm)=>events.push({type:'signal-start',fork:cur.id,arm,output:s.output},...r.events,{type:'signal-end',fork:cur.id,arm,output:r.output}));
      const output=results.reduce((sum,r)=>sum+(Number(r.output)||0),0);events.push({type:'signal-merge',fork:cur.id,piece:mergePiece.id,entryHalf:results[0].mergeEntryHalf,output});
      const merged=cloneState(second);merged.output=output;merged.current={...second.current};merged.mode=1;merged.suppressZeroPiece=null;merged.mergeCapture=false;merged.mergeConsumed=true;merged.mergeFromPieceIds=new Set(results.map(r=>r.mergeState.current.fromPieceId).filter(id=>id!=null));merged.usedEdges=unionSets(first.usedEdges,second.usedEdges);merged.splitUsed=unionSets(first.splitUsed,second.splitUsed);merged.zeroPortUsed=unionSets(first.zeroPortUsed,second.zeroPortUsed);merged.zeroCharges=maxMaps(first.zeroCharges,second.zeroCharges);merged.doubleDoubleUsed=!!(first.doubleDoubleUsed||second.doubleDoubleUsed);merged.returnUsed=!!(first.returnUsed||second.returnUsed);merged.hingeMoved=!!(first.hingeMoved||second.hingeMoved);merged.hingeOverride=clonePiece(second.hingeOverride||first.hingeOverride);merged.back=[];merged.forward=[];merged.path=[...s.path,...results.flatMap(r=>r.path||[])];merged.segments=[...s.segments,...results.flatMap(r=>r.segments||[])];merged.events=events;merged.traversals=s.traversals+results.reduce((sum,r)=>sum+(r.traversals||0),0);merged.rebounds=s.rebounds+results.reduce((sum,r)=>sum+(r.rebounds||0),0);
      return walk(merged)
    }
    function tripleDoubleFork(s,cur,connections){
      if(!opts.bifurcate||cur.id!==opts.tripleDoublePieceId||s.splitUsed.has(cur.id)||!isFullCross(cur,runtimePieces(s)))return null;
      const byPiece=new Map();for(const c of connections)if(!byPiece.has(c.toPieceId))byPiece.set(c.toPieceId,c);const arms=[...byPiece.values()].sort((a,b)=>a.choiceKey.localeCompare(b.choiceKey));
      if(arms.length!==3)return null;
      if(searchLimit-expanded<3){truncated=true;return null}
      const seed=cloneState(s);seed.splitUsed.add(cur.id);seed.mergeCapture=false;
      const results=[],parentLimit=searchLimit;let carry=cloneState(seed);
      for(let arm=0;arm<arms.length;arm++){
        searchLimit=parentLimit-Math.max(0,arms.length-1-arm);
        const branch=cloneState(seed);branch.splitUsed=new Set(carry.splitUsed);branch.doubleDoubleUsed=carry.doubleDoubleUsed;branch.returnUsed=carry.returnUsed;branch.mergeConsumed=carry.mergeConsumed;branch.hingeMoved=carry.hingeMoved;branch.hingeOverride=clonePiece(carry.hingeOverride);branch.events=[];branch.path=[];branch.segments=[];branch.traversals=0;branch.rebounds=0;
        const c=arms[arm],r=follow(branch,[c],c.fromHalf);results.push(r);branchCarry(carry,r)
      }
      searchLimit=parentLimit;
      const output=results.reduce((sum,r)=>sum+r.output,0),events=[...s.events,{type:'signal-fork',piece:cur.id,output:s.output,splitKind:'triple-double'}];
      results.forEach((r,arm)=>events.push({type:'signal-start',fork:cur.id,arm,output:s.output},...r.events,{type:'signal-end',fork:cur.id,arm,output:r.output}));events.push({type:'signal-join',piece:cur.id,output});
      return{output,gain:output-s.initialOutput,events,reason:'triple-double-split',path:[...s.path,...results.flatMap(r=>r.path)],segments:[...s.segments,...results.flatMap(r=>r.segments)],traversals:s.traversals+results.reduce((sum,r)=>sum+r.traversals,0),rebounds:s.rebounds+results.reduce((sum,r)=>sum+r.rebounds,0),splitUsed:new Set(carry.splitUsed),doubleDoubleUsed:!!carry.doubleDoubleUsed,returnUsed:!!carry.returnUsed,mergeConsumed:!!carry.mergeConsumed,hingeMoved:!!carry.hingeMoved,hingeOverride:clonePiece(carry.hingeOverride),zeroCharges:s.zeroCharges,zeroPortUsed:s.zeroPortUsed,usedEdges:s.usedEdges}
    }
    function fork(s,cur,connections){
      if(!opts.bifurcate||!cur.double||cur.tile.a===0||s.splitUsed.has(cur.id))return null;
      const ps=runtimePieces(s),previous=pieceById(ps,s.current.fromPieceId),relation=previous&&pieceEdgeRelation(cur,previous);
      if(!relation||!isLongSide(cur,relation.sideA)||relation.len!==S)return null;
      const splitKind=isCenteredOnDouble(cur,relation,relation.sideA)?'centered':'offset-L';
      const arms=[0,1].map(half=>connections.filter(c=>c.fromHalf===half&&!isLongSide(cur,c.fromSide)));
      if(arms.some(cs=>!cs.length))return null;
      if(searchLimit-expanded<2){truncated=true;return null}
      const seed=cloneState(s);seed.splitUsed.add(cur.id);
      const results=[],parentLimit=searchLimit;let carry=cloneState(seed);
      for(let half=0;half<2;half++){
        searchLimit=parentLimit-(half===0?1:0);
        const branch=cloneState(seed);branch.splitUsed=new Set(carry.splitUsed);branch.doubleDoubleUsed=carry.doubleDoubleUsed;branch.returnUsed=carry.returnUsed;branch.mergeConsumed=carry.mergeConsumed;branch.hingeMoved=carry.hingeMoved;branch.hingeOverride=clonePiece(carry.hingeOverride);branch.mergeCapture=!!opts.mergePieceId&&!carry.mergeConsumed;branch.events=[];branch.path=[];branch.segments=[];branch.traversals=0;branch.rebounds=0;
        const r=follow(branch,arms[half],half);results.push(r);branchCarry(carry,r.mergeState||r)
      }
      searchLimit=parentLimit;
      const merged=mergeCapturedFork(s,cur,results,splitKind);if(merged)return merged;
      for(let i=0;i<results.length;i++)results[i]=resumeMergeWait(results[i]);
      const output=results.reduce((sum,r)=>sum+r.output,0),events=[...s.events,{type:'signal-fork',piece:cur.id,output:s.output,splitKind}];
      results.forEach((r,arm)=>events.push({type:'signal-start',fork:cur.id,arm,output:s.output},...r.events,{type:'signal-end',fork:cur.id,arm,output:r.output}));
      events.push({type:'signal-join',piece:cur.id,output});
      const last=results[results.length-1]||s;
      return{output,gain:output-s.initialOutput,events,reason:'split-complete',path:[...s.path,...results.flatMap(r=>r.path)],segments:[...s.segments,...results.flatMap(r=>r.segments)],traversals:s.traversals+results.reduce((sum,r)=>sum+r.traversals,0),rebounds:s.rebounds+results.reduce((sum,r)=>sum+r.rebounds,0),splitUsed:unionSets(...results.map(r=>r.splitUsed)),doubleDoubleUsed:results.some(r=>r.doubleDoubleUsed),returnUsed:results.some(r=>r.returnUsed),mergeConsumed:results.some(r=>r.mergeConsumed),hingeMoved:results.some(r=>r.hingeMoved),hingeOverride:clonePiece(last.hingeOverride),zeroCharges:s.zeroCharges,zeroPortUsed:s.zeroPortUsed,usedEdges:unionSets(...results.map(r=>r.usedEdges))}
    }
    function zeroPortFork(s,dest){
      const ps=runtimePieces(s),liveDest=pieceById(ps,dest.id)||dest,available=connectionsForPiece(liveDest,ps).map(c=>({...c,key:extKey(liveDest.id,c.fromHalf,c.toPieceId,c.toHalf),choiceKey:connectionKey(c)})).filter(c=>!s.usedEdges.has(c.key)).sort((a,b)=>a.choiceKey.localeCompare(b.choiceKey));
      const arms=[0,1].map(half=>available.filter(c=>c.fromHalf===half&&!isLongSide(liveDest,c.fromSide)));
      const results=[],seed=cloneState(s);seed.current={pieceId:liveDest.id,entryHalf:0,fromPieceId:s.current.pieceId,fromHalf:0};seed.back=[];seed.forward=[];let carry=cloneState(seed);
      for(let half=0;half<2;half++){
        const branch=cloneState(seed);branch.returnUsed=carry.returnUsed;branch.mergeConsumed=carry.mergeConsumed;branch.hingeMoved=carry.hingeMoved;branch.hingeOverride=clonePiece(carry.hingeOverride);branch.mergeCapture=!!opts.mergePieceId&&!carry.mergeConsumed;branch.events=[];branch.path=[];branch.segments=[];branch.traversals=0;branch.rebounds=0;
        const r=arms[half].length?follow(branch,arms[half],half):finish(branch,'zero-port-open-end');results.push(r);branchCarry(carry,r.mergeState||r)
      }
      const merged=mergeCapturedFork(s,liveDest,results,'zero-port');if(merged)return merged;
      for(let i=0;i<results.length;i++)results[i]=resumeMergeWait(results[i]);
      const output=results.reduce((sum,r)=>sum+r.output,0),events=[...s.events,{type:'signal-fork',piece:liveDest.id,output:s.output,splitKind:'zero-port'}];
      results.forEach((r,arm)=>events.push({type:'signal-start',fork:liveDest.id,arm,output:s.output},...r.events,{type:'signal-end',fork:liveDest.id,arm,output:r.output}));
      events.push({type:'signal-join',piece:liveDest.id,output});
      const last=results[results.length-1]||s;
      return{output,gain:output-s.initialOutput,events,reason:'zero-port-split',path:[...s.path,...results.flatMap(r=>r.path)],segments:[...s.segments,...results.flatMap(r=>r.segments)],traversals:s.traversals+results.reduce((sum,r)=>sum+r.traversals,0),rebounds:s.rebounds+results.reduce((sum,r)=>sum+r.rebounds,0),splitUsed:unionSets(...results.map(r=>r.splitUsed)),doubleDoubleUsed:results.some(r=>r.doubleDoubleUsed),returnUsed:results.some(r=>r.returnUsed),mergeConsumed:results.some(r=>r.mergeConsumed),hingeMoved:results.some(r=>r.hingeMoved),hingeOverride:clonePiece(last.hingeOverride),zeroCharges:s.zeroCharges,zeroPortUsed:unionSets(...results.map(r=>r.zeroPortUsed)),usedEdges:unionSets(...results.map(r=>r.usedEdges))}
    }
    function returnFollow(s,cur,connections,exitHalf){
      if(cur.id!==opts.returnPieceId||s.returnUsed||s.mode!==1||connections.length<2)return null;
      let selected=null;const checkpoint=cloneState(s);checkpoint.returnUsed=true;
      for(const first of connections){
        const firstResult=follow(cloneState(checkpoint),[first],exitHalf);
        if(firstResult.reason==='search-limit'||firstResult.reason==='merge-wait')continue;
        const retry=cloneState(checkpoint);retry.returnUsed=true;retry.output=checkpoint.output;retry.events=[...firstResult.events,{type:'return',piece:cur.id,output:checkpoint.output}];retry.path=[...(firstResult.path||[])];retry.segments=[...(firstResult.segments||[])];retry.traversals=firstResult.traversals||0;retry.rebounds=firstResult.rebounds||0;retry.usedEdges=new Set(firstResult.usedEdges||checkpoint.usedEdges);retry.splitUsed=new Set(firstResult.splitUsed||checkpoint.splitUsed);retry.zeroCharges=cloneMap(firstResult.zeroCharges||checkpoint.zeroCharges);retry.zeroPortUsed=new Set(firstResult.zeroPortUsed||checkpoint.zeroPortUsed);retry.doubleDoubleUsed=!!firstResult.doubleDoubleUsed;retry.mergeConsumed=!!firstResult.mergeConsumed;retry.hingeMoved=!!firstResult.hingeMoved;retry.hingeOverride=clonePiece(firstResult.hingeOverride||checkpoint.hingeOverride);retry.back=[];retry.forward=[];retry.current={...checkpoint.current};retry.mode=1;
        const retryPieces=runtimePieces(retry),retryCur=pieceById(retryPieces,cur.id)||cur,blocked=new Set([checkpoint.current.fromPieceId].filter(id=>id!=null));
        const alternatives=connectionsForPiece(retryCur,retryPieces).filter(c=>c.fromHalf===exitHalf&&!blocked.has(c.toPieceId)).map(c=>({...c,key:extKey(retryCur.id,c.fromHalf,c.toPieceId,c.toHalf),choiceKey:connectionKey(c)})).filter(c=>!retry.usedEdges.has(c.key)).sort((a,b)=>a.choiceKey.localeCompare(b.choiceKey));
        for(const second of alternatives){const result=follow(cloneState(retry),[second],exitHalf);if(better(result,selected))selected=result}
      }
      return selected
    }
    function walk(s){
      s.splitUsed??=new Set();s.zeroPortUsed??=new Set();s.mergeFromPieceIds??=new Set();
      if(++expanded>searchLimit){truncated=true;return finish(s,'search-limit')}
      let cur=runtimePiece(s,s.current.pieceId);if(!cur)return finish(s,'missing-piece');
      const entryHalf=s.mode===1?s.current.entryHalf:1-s.current.entryHalf;
      if(s.mergeCapture&&!s.mergeConsumed&&cur.id===opts.mergePieceId)return{output:s.output,gain:s.output-s.initialOutput,path:s.path,segments:s.segments,events:s.events,reason:'merge-wait',traversals:s.traversals,rebounds:s.rebounds,mergeAt:cur.id,mergeEntryHalf:entryHalf,mergeState:cloneState(s),splitUsed:new Set(s.splitUsed),doubleDoubleUsed:!!s.doubleDoubleUsed,returnUsed:!!s.returnUsed,mergeConsumed:!!s.mergeConsumed,hingeMoved:!!s.hingeMoved,hingeOverride:clonePiece(s.hingeOverride)};
      if(cur.id===opts.diodePieceId&&Number.isInteger(opts.diodeInHalf)&&entryHalf!==opts.diodeInHalf){s.events.push({type:'diode-block',piece:cur.id,entryHalf,inHalf:opts.diodeInHalf});return finish(s,'diode-blocked')}
      const inC=cur.cubes.find(c=>c.half===entryHalf)||cur.cubes[0],outC=cur.cubes.find(c=>c.half!==inC.half)||cur.cubes[1],from=cubeCenter(inC),to=cubeCenter(outC);
      s.path.push(from,to);s.segments.push({piece:cur.id,from,to,reverse:s.mode===-1,entryHalf:inC.half,exitHalf:outC.half});s.traversals++;
      const psBefore=runtimePieces(s),previous=pieceById(psBefore,s.current.fromPieceId),entryRelation=previous&&pieceEdgeRelation(cur,previous),entrySide=entryRelation?.sideA||null;
      const doubleDouble=cur.id===opts.doubleDoublePieceId&&!s.doubleDoubleUsed,powerMultiplier=1;const op=applyOp(outC.v,cur.double,s,doubleDouble,powerMultiplier);if(op.doubleDouble)s.doubleDoubleUsed=true;s.events.push({type:'op',piece:cur.id,entryHalf:inC.half,exitHalf:outC.half,fromPieceId:s.current.fromPieceId||null,entrySide,value:outC.v,op:op.type,before:op.before,after:op.after,add:op.add||0,factor:op.factor||0,delta:op.delta||0,doubleDouble:!!op.doubleDouble,powerMultiplier,reverse:s.mode===-1});
      if(cur.id===opts.hingePieceId&&!s.hingeMoved){
        s.hingeMoved=true;const target=opts.hingeTargetPlacement,pivotId=opts.hingePivotPieceId;
        if(opts.hingeBlockedReason||!target||pivotId==null)s.events.push({type:'hinge-blocked',piece:cur.id,reason:opts.hingeBlockedReason||'no-target'});
        else{
          const live=runtimePieces(s),others=live.filter(p=>p.id!==cur.id),valid=validatePlacement(cur.tile,target.x,target.y,target.z||0,target.rr,others),candidate=valid.ok?pieceFrom(cur.tile,target.x,target.y,target.z||0,target.rr,cur.id):null,pivot=candidate?pieceById(others,pivotId):null,contact=candidate&&pivot?contactBetweenPieces(candidate,pivot):null;
          if(candidate&&contact?.touch&&contact.ok){candidate.tile={...cur.tile};const before={x:cur.cubes[0].x,y:cur.cubes[0].y,z:cur.z||0,rr:cur.rr};s.hingeOverride=candidate;cur=candidate;s.events.push({type:'hinge-move',piece:cur.id,pivotPieceId:pivotId,from:before,to:{x:target.x,y:target.y,z:target.z||0,rr:target.rr}})}
          else s.events.push({type:'hinge-blocked',piece:cur.id,reason:'occupied'})
        }
      }
      if(outC.v===0){const zeroPorts=Array.isArray(opts.zeroPortPieceIds)?opts.zeroPortPieceIds.filter(Boolean):[];if(zeroPorts.length===2&&zeroPorts.includes(cur.id)){if(s.zeroPortUsed.has(cur.id))return finish(s,'zero-port-spent');const live=runtimePieces(s),partner=pieceById(live,zeroPorts.find(id=>id!==cur.id));if(partner){s.zeroPortUsed.add(cur.id);s.events.push({type:'zero-port',piece:cur.id,toPieceId:partner.id,fromHalf:outC.half});if(partner.double&&partner.tile.a===0)return zeroPortFork(s,partner);const zeroCube=partner.cubes.find(c=>c.v===0);if(zeroCube){s.mode=1;s.back=[];s.forward=[];s.current={pieceId:partner.id,entryHalf:zeroCube.half,fromPieceId:cur.id,fromHalf:outC.half};return walk(s)}}}
        const cap=cur.double?2:1,used=s.zeroCharges.get(cur.id)||0;if(s.suppressZeroPiece===cur.id){s.suppressZeroPiece=null;s.events.push({type:'zero-pass',piece:cur.id})}else if(used<cap){s.zeroCharges.set(cur.id,used+1);s.mode*=-1;s.rebounds++;if(cur.double)s.suppressZeroPiece=cur.id;s.events.push({type:'rebound',piece:cur.id,charge:used+1});return walk(s)}else return finish(s,'zero-spent')}
      if(s.mode===-1){if(!s.back.length)return finish(s,'back-at-origin');const prev=s.back[s.back.length-1],k=extKey(cur.id,outC.half,prev.pieceId,1-prev.entryHalf);s.forward.push({...s.current});s.current=s.back.pop();s.events.push({type:'move',fromPiece:cur.id,fromHalf:outC.half,toPiece:s.current.pieceId,toHalf:1-s.current.entryHalf,reverse:true,retrace:true,key:k});return walk(s)}
      if(s.forward.length){const nxt=s.forward[s.forward.length-1],k=extKey(cur.id,outC.half,nxt.pieceId,nxt.entryHalf);s.back.push({...s.current});s.current=s.forward.pop();s.events.push({type:'move',fromPiece:cur.id,fromHalf:outC.half,toPiece:s.current.pieceId,toHalf:s.current.entryHalf,reverse:false,replay:true,retrace:true,key:k});return walk(s)}
      const live=runtimePieces(s),routeCur=pieceById(live,cur.id)||cur,blockedFrom=new Set([s.current.fromPieceId,...s.mergeFromPieceIds].filter(id=>id!=null));s.mergeFromPieceIds=new Set();
      const available=connectionsForPiece(routeCur,live).filter(c=>!blockedFrom.has(c.toPieceId)).map(c=>({...c,key:extKey(routeCur.id,c.fromHalf,c.toPieceId,c.toHalf),choiceKey:connectionKey(c)})).filter(c=>!s.usedEdges.has(c.key)).sort((a,b)=>a.choiceKey.localeCompare(b.choiceKey));
      const tripleSplit=tripleDoubleFork(s,routeCur,available);if(tripleSplit)return tripleSplit;
      const split=fork(s,routeCur,available);if(split)return split;
      const conns=available.filter(c=>c.fromHalf===outC.half);if(!conns.length)return finish(s,'no-exit');
      const returned=returnFollow(s,routeCur,conns,outC.half);if(returned)return returned;
      return follow(s,conns,outC.half)
    }
    for(const first of starts){const st={current:{pieceId:first.toPieceId,entryHalf:first.entryHalf,fromPieceId:newPieceId,fromHalf:first.fromHalf},mode:1,output:initialOutput,initialOutput,suppressZeroPiece:null,doubleDoubleUsed:false,splitUsed:new Set(),usedEdges:new Set([extKey(newPieceId,first.fromHalf,first.toPieceId,first.toHalf)]),zeroCharges:new Map(),zeroPortUsed:new Set(),returnUsed:false,mergeCapture:false,mergeConsumed:false,mergeFromPieceIds:new Set(),hingeMoved:false,hingeOverride:null,back:[],forward:[],path:[],segments:[],events:[{type:'start',key:first.key,toPieceId:first.toPieceId,toHalf:first.entryHalf,fromHalf:first.fromHalf,flipped:first.flipped}],traversals:0,rebounds:0};const r=walk(st);if(better(r,best))best=r;if(expanded>=maxExpanded){truncated=true;break}}
    best=best||{output:initialOutput,gain:0,path:[],segments:[],events:[],reason:'no-route',traversals:0,rebounds:0};best.search={starts:starts.length,expanded,leaves,truncated};if(best.hingeOverride)best.hingeFinalPlacement={x:best.hingeOverride.cubes[0].x,y:best.hingeOverride.cubes[0].y,z:best.hingeOverride.z||0,rr:best.hingeOverride.rr};best=replaySelectedScoring(best,initialOutput,{...opts,pieces,powerByPiece:new Map(pieces.map(p=>[p.id,Math.max(1,Number(p.tile?.powerMultiplier)||1)]))});return replaySelectedEcho(best,{...opts,initialOutput})
  }
  function simulateSignal(newPieceId,pieces,opts={}){return bestSignal(newPieceId,pieces,opts)}
  function portKey(pieceId,half,side){return`${pieceId}:${half}:${side}`}
  function exposedPorts(tile,z,pieces){const placements=allPlacements(tile,z,pieces),groups=new Map();for(const pl of placements)for(const group of pl.contacts||[]){if(group.kind==='double-centered'&&group.piece.double){const side=group.relation.sideB,key=`${group.piece.id}:center:${side}`;if(!groups.has(key))groups.set(key,{key,pieceId:group.piece.id,half:null,side,value:group.piece.tile.a,centered:true,placements:[]});const g=groups.get(key);if(!g.placements.some(p=>placementKey(tile,p)===placementKey(tile,pl)))g.placements.push(pl);continue}for(const c of group.contacts||[]){const key=portKey(group.piece.id,c.bHalf,c.otherSide);if(!groups.has(key))groups.set(key,{key,pieceId:group.piece.id,half:c.bHalf,side:c.otherSide,value:c.bV,centered:false,placements:[]});const g=groups.get(key);if(!g.placements.some(p=>placementKey(tile,p)===placementKey(tile,pl)))g.placements.push(pl)}}return[...groups.values()]}
  const api={S,DIR,ARROW,axis,setBoardSize,getBoardSize,cubesFor,rectForCubes,pieceFrom,edgeContact,contactBetweenPieces,validatePlacement,allPlacements,hasAnyPlacement,hasLegalMove,cubeCenter,connectionsForPiece,connectionKey,startChoices,applyOp,replaySelectedScoring,replaySelectedEcho,bestSignal,simulateSignal,exposedPorts,modGeometryFacts,hingeAlternates};
  Object.defineProperties(api,{G:{enumerable:true,get:()=>G},H:{enumerable:true,get:()=>H}});
  return api;
});
