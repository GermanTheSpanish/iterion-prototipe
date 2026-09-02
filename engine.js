(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.IterionEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const G=18,S=2;
  const DIR=[[1,0],[0,1],[-1,0],[0,-1]];
  const ARROW=['→','↓','←','↑'];
  function axis(rr){return rr%2===0?'H':'V'}
  function cubesFor(tile,x,y,z=0,rr=0){const [dx,dy]=DIR[rr];return [{x,y,z,v:tile.a,half:0},{x:x+dx*S,y:y+dy*S,z,v:tile.b,half:1}]}
  function rectForCubes(cs){return {minx:Math.min(...cs.map(c=>c.x)),miny:Math.min(...cs.map(c=>c.y)),maxx:Math.max(...cs.map(c=>c.x+S)),maxy:Math.max(...cs.map(c=>c.y+S))}}
  function overlap(a,b){return a.x<b.x+S&&a.x+S>b.x&&a.y<b.y+S&&a.y+S>b.y}
  function edgeContact(a,b){if(a.z!==b.z)return null;const oy=Math.max(0,Math.min(a.y+S,b.y+S)-Math.max(a.y,b.y)),ox=Math.max(0,Math.min(a.x+S,b.x+S)-Math.max(a.x,b.x));if(a.x+S===b.x&&oy>0)return{side:'R',otherSide:'L',len:oy};if(b.x+S===a.x&&oy>0)return{side:'L',otherSide:'R',len:oy};if(a.y+S===b.y&&ox>0)return{side:'D',otherSide:'U',len:ox};if(b.y+S===a.y&&ox>0)return{side:'U',otherSide:'D',len:ox};return null}
  function pieceFrom(tile,x,y,z=0,rr=0,id=0){const cubes=cubesFor(tile,x,y,z,rr);return{id,tile:{a:tile.a,b:tile.b},double:tile.a===tile.b,axis:axis(rr),rr,z,cubes,rect:rectForCubes(cubes)}}
  function pieceEdgeRelation(a,b){if(a.z!==b.z)return null;const A=a.rect,B=b.rect,oy=Math.max(0,Math.min(A.maxy,B.maxy)-Math.max(A.miny,B.miny)),ox=Math.max(0,Math.min(A.maxx,B.maxx)-Math.max(A.minx,B.minx));if(A.maxx===B.minx&&oy>0)return{sideA:'R',sideB:'L',len:oy,start:Math.max(A.miny,B.miny),end:Math.min(A.maxy,B.maxy)};if(B.maxx===A.minx&&oy>0)return{sideA:'L',sideB:'R',len:oy,start:Math.max(A.miny,B.miny),end:Math.min(A.maxy,B.maxy)};if(A.maxy===B.miny&&ox>0)return{sideA:'D',sideB:'U',len:ox,start:Math.max(A.minx,B.minx),end:Math.min(A.maxx,B.maxx)};if(B.maxy===A.miny&&ox>0)return{sideA:'U',sideB:'D',len:ox,start:Math.max(A.minx,B.minx),end:Math.min(A.maxx,B.maxx)};return null}
  function isLongSide(piece,side){return piece.axis==='H'?(side==='U'||side==='D'):(side==='L'||side==='R')}
  function isCenteredOnDouble(doublePiece,relation,sideOfDouble){if(!doublePiece.double||!isLongSide(doublePiece,sideOfDouble)||relation.len!==S)return false;if(doublePiece.axis==='H'){const center=(doublePiece.rect.minx+doublePiece.rect.maxx)/2;return relation.start===center-S/2&&relation.end===center+S/2}const center=(doublePiece.rect.miny+doublePiece.rect.maxy)/2;return relation.start===center-S/2&&relation.end===center+S/2}
  function contactBetweenPieces(a,b){const raw=[];for(const ca of a.cubes)for(const cb of b.cubes){const e=edgeContact(ca,cb);if(e)raw.push({...e,aHalf:ca.half,bHalf:cb.half,aV:ca.v,bV:cb.v,aCube:ca,bCube:cb})}if(!raw.length)return{touch:false,ok:true,contacts:[]};if(raw.some(r=>r.aV!==r.bV))return{touch:true,ok:false,reason:'value-mismatch',contacts:raw};const rel=pieceEdgeRelation(a,b);if(!rel)return{touch:true,ok:false,reason:'partial',contacts:raw};const aLong=a.double&&isLongSide(a,rel.sideA),bLong=b.double&&isLongSide(b,rel.sideB);if(aLong||bLong){const aSpecial=isCenteredOnDouble(a,rel,rel.sideA),bSpecial=isCenteredOnDouble(b,rel,rel.sideB);if(aSpecial!==bSpecial&&rel.len===S)return{touch:true,ok:true,kind:'double-centered',contacts:raw,relation:rel};return{touch:true,ok:false,reason:'off-centre-double-port',contacts:raw,relation:rel}}if(raw.every(r=>r.len===S))return{touch:true,ok:true,kind:'full',contacts:raw,relation:rel};return{touch:true,ok:false,reason:'partial-or-corner',contacts:raw,relation:rel}}
  function validatePlacement(tile,x,y,z,rr,pieces){const cand=pieceFrom(tile,x,y,z,rr,-1);if(cand.rect.minx<0||cand.rect.miny<0||cand.rect.maxx>G||cand.rect.maxy>G)return{ok:false,reason:'bounds'};for(const p of pieces)for(const c of cand.cubes)for(const o of p.cubes)if(overlap(c,o))return{ok:false,reason:'overlap'};if(!pieces.length){const center=cand.cubes.some(c=>Math.abs(c.x+1-G/2)<=4&&Math.abs(c.y+1-G/2)<=4);return center?{ok:true,contacts:[],piece:cand}:{ok:false,reason:'root-zone'}}const contacts=[];for(const p of pieces){const r=contactBetweenPieces(cand,p);if(r.touch&&!r.ok)return{ok:false,reason:r.reason};if(r.touch&&r.ok)contacts.push({piece:p,kind:r.kind,contacts:r.contacts,relation:r.relation})}if(!contacts.length)return{ok:false,reason:'no-contact'};return{ok:true,contacts,piece:cand}}
  function placementKey(tile,p){const cs=cubesFor(tile,p.x,p.y,p.z,p.rr).map(c=>`${c.x},${c.y},${c.v}`).sort().join('|');return`${p.z}|${cs}`}
  function allPlacements(tile,z,pieces){const out=[],seen=new Set();for(let rr=0;rr<4;rr++)for(let y=0;y<=G-S;y++)for(let x=0;x<=G-S;x++){const v=validatePlacement(tile,x,y,z,rr,pieces);if(!v.ok)continue;const p={x,y,z,rr,contacts:v.contacts},k=placementKey(tile,p);if(seen.has(k))continue;seen.add(k);out.push(p)}return out}
  function hasLegalMove(hand,pieces,levels=[0,1,2]){for(const tile of hand)for(const z of levels)if(allPlacements(tile,z,pieces).length)return true;return false}
  function cubeCenter(c){return{x:c.x+S/2,y:c.y+S/2,z:c.z}}
  function pieceById(pieces,id){return pieces.find(p=>p.id===id)}
  function connectionsForPiece(piece,pieces){const out=[];for(const p of pieces){if(p.id===piece.id||p.z!==piece.z)continue;const r=contactBetweenPieces(piece,p);if(r.ok&&r.touch){for(const c of r.contacts)out.push({toPieceId:p.id,fromHalf:c.aHalf,toHalf:c.bHalf,fromSide:c.side,toSide:c.otherSide,kind:r.kind})}}return out}
  function applyOp(v,isDouble,state){if(v===0)return 0;if(v===2||v===4||v===6){state.lastEven=v;return v*(isDouble?2:1)}if(v===1||v===3||v===5)return(state.lastEven||0)*v*(isDouble?2:1);return 0}
  function simulateSignal(newPieceId,pieces,startConnectionIndex=0,maxSteps=200){
    const newPiece=pieceById(pieces,newPieceId); if(!newPiece)return{gain:0,path:[],events:[],reason:'missing-new-piece'};
    const starts=connectionsForPiece(newPiece,pieces); if(!starts.length)return{gain:0,path:[],events:[],reason:'no-start'};
    const first=starts[Math.min(startConnectionIndex,starts.length-1)];
    let curId=first.toPieceId, entryHalf=first.toHalf, prevId=newPieceId, score=0, steps=0;
    const state={lastEven:null}, traversed=new Set(), zeroCharges=new Map(), path=[], events=[];
    const history=[];
    let reverse=false, suppressImmediateZero=false;
    while(steps++<maxSteps){
      const cur=pieceById(pieces,curId); if(!cur){events.push({type:'die',reason:'missing-piece'});break}
      const inC=cur.cubes.find(c=>c.half===entryHalf)||cur.cubes[0];
      const outC=cur.cubes.find(c=>c.half!==inC.half)||cur.cubes[1];
      const internalKey=`I:${cur.id}:${inC.half}>${outC.half}`;
      if(traversed.has(internalKey)){events.push({type:'die',reason:'internal-used',piece:cur.id});break}
      traversed.add(internalKey); path.push(cubeCenter(inC),cubeCenter(outC));
      const add=applyOp(outC.v,cur.double,state); score+=add; events.push({type:'op',piece:cur.id,value:outC.v,add,reverse});
      if(outC.v===0){
        const cap=cur.double?2:1,used=zeroCharges.get(cur.id)||0;
        if(suppressImmediateZero){suppressImmediateZero=false;events.push({type:'zero-pass',piece:cur.id});}
        else if(used<cap){
          zeroCharges.set(cur.id,used+1); reverse=!reverse; suppressImmediateZero=cur.double; events.push({type:'rebound',piece:cur.id,charge:used+1});
          entryHalf=outC.half;
          continue;
        } else {events.push({type:'die',reason:'zero-spent',piece:cur.id});break}
      }
      if(reverse){
        if(!history.length){events.push({type:'die',reason:'back-at-origin'});break}
        const h=history.pop();
        const extKey=`E:${cur.id}:${outC.half}>${h.fromPiece}:${h.fromHalf}`;
        if(traversed.has(extKey)){events.push({type:'die',reason:'edge-used-reverse'});break}
        traversed.add(extKey);
        curId=h.fromPiece; entryHalf=h.fromHalf; prevId=cur.id;
        continue;
      }
      const conns=connectionsForPiece(cur,pieces).filter(c=>c.fromHalf===outC.half && c.toPieceId!==prevId);
      let next=null;
      for(const c of conns){const k=`E:${cur.id}:${c.fromHalf}>${c.toPieceId}:${c.toHalf}`;if(!traversed.has(k)){next=c;break}}
      if(!next){events.push({type:'die',reason:'no-exit',piece:cur.id});break}
      traversed.add(`E:${cur.id}:${next.fromHalf}>${next.toPieceId}:${next.toHalf}`);
      history.push({fromPiece:cur.id,fromHalf:outC.half,toPiece:next.toPieceId,toHalf:next.toHalf});
      prevId=cur.id;curId=next.toPieceId;entryHalf=next.toHalf;
    }
    if(steps>=maxSteps)events.push({type:'die',reason:'max-steps'});
    return{gain:score,path,events,state,zeroCharges,reason:events[events.length-1]?.reason||'ended'};
  }
  function portKey(pieceId,half,side){return`${pieceId}:${half}:${side}`}
  function exposedPorts(tile,z,pieces){
    const placements=allPlacements(tile,z,pieces),groups=new Map();
    for(const pl of placements){
      for(const group of pl.contacts||[]){
        if(group.kind==='double-centered' && group.piece.double){
          const side=group.relation.sideB, key=`${group.piece.id}:center:${side}`;
          if(!groups.has(key))groups.set(key,{key,pieceId:group.piece.id,half:null,side,value:group.piece.tile.a,centered:true,placements:[]});
          const g=groups.get(key);if(!g.placements.some(p=>placementKey(tile,p)===placementKey(tile,pl)))g.placements.push(pl);
          continue;
        }
        for(const c of group.contacts||[]){const key=portKey(group.piece.id,c.bHalf,c.otherSide);if(!groups.has(key))groups.set(key,{key,pieceId:group.piece.id,half:c.bHalf,side:c.otherSide,value:c.bV,centered:false,placements:[]});const g=groups.get(key);if(!g.placements.some(p=>placementKey(tile,p)===placementKey(tile,pl)))g.placements.push(pl)}
      }
    }
    return [...groups.values()];
  }
  return{G,S,DIR,ARROW,axis,cubesFor,rectForCubes,pieceFrom,edgeContact,contactBetweenPieces,validatePlacement,allPlacements,hasLegalMove,cubeCenter,connectionsForPiece,simulateSignal,exposedPorts};
});