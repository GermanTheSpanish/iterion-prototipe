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
  function contactBetweenPieces(a,b){const raw=[];for(const ca of a.cubes)for(const cb of b.cubes){const e=edgeContact(ca,cb);if(e)raw.push({...e,aHalf:ca.half,bHalf:cb.half,aV:ca.v,bV:cb.v,aCube:ca,bCube:cb})}if(!raw.length)return{touch:false,ok:true,contacts:[]};if(raw.some(r=>r.aV!==r.bV))return{touch:true,ok:false,reason:'value-mismatch',contacts:raw};const rel=pieceEdgeRelation(a,b);if(!rel)return{touch:true,ok:false,reason:'partial',contacts:raw};const aLong=a.double&&isLongSide(a,rel.sideA),bLong=b.double&&isLongSide(b,rel.sideB);if(aLong||bLong){const as=isCenteredOnDouble(a,rel,rel.sideA),bs=isCenteredOnDouble(b,rel,rel.sideB);if(as!==bs&&rel.len===S)return{touch:true,ok:true,kind:'double-centered',contacts:raw,relation:rel};return{touch:true,ok:false,reason:'off-centre-double-port',contacts:raw,relation:rel}}if(raw.every(r=>r.len===S))return{touch:true,ok:true,kind:'full',contacts:raw,relation:rel};return{touch:true,ok:false,reason:'partial-or-corner',contacts:raw,relation:rel}}
  function validatePlacement(tile,x,y,z,rr,pieces){const cand=pieceFrom(tile,x,y,z,rr,-1);if(cand.rect.minx<0||cand.rect.miny<0||cand.rect.maxx>G||cand.rect.maxy>H)return{ok:false,reason:'bounds'};for(const p of pieces)for(const c of cand.cubes)for(const o of p.cubes)if(overlap(c,o))return{ok:false,reason:'overlap'};if(!pieces.length){const center=cand.cubes.some(c=>Math.abs(c.x+1-G/2)<=4&&Math.abs(c.y+1-H/2)<=4);return center?{ok:true,contacts:[],piece:cand}:{ok:false,reason:'root-zone'}}const contacts=[];for(const p of pieces){const r=contactBetweenPieces(cand,p);if(r.touch&&!r.ok)return{ok:false,reason:r.reason};if(r.touch&&r.ok)contacts.push({piece:p,kind:r.kind,contacts:r.contacts,relation:r.relation})}return contacts.length?{ok:true,contacts,piece:cand}:{ok:false,reason:'no-contact'}}
  function placementKey(tile,p){const cs=cubesFor(tile,p.x,p.y,p.z,p.rr).map(c=>`${c.x},${c.y},${c.v}`).sort().join('|');return`${p.z}|${cs}`}
  function allPlacements(tile,z,pieces){const out=[],seen=new Set();for(let rr=0;rr<4;rr++)for(let y=0;y<=H-S;y++)for(let x=0;x<=G-S;x++){const v=validatePlacement(tile,x,y,z,rr,pieces);if(!v.ok)continue;const p={x,y,z,rr,contacts:v.contacts},k=placementKey(tile,p);if(seen.has(k))continue;seen.add(k);out.push(p)}return out}
  function hasAnyPlacement(tile,z,pieces){for(let rr=0;rr<4;rr++)for(let y=0;y<=H-S;y++)for(let x=0;x<=G-S;x++)if(validatePlacement(tile,x,y,z,rr,pieces).ok)return true;return false}
  function hasLegalMove(hand,pieces,levels=[0,1,2,3,4]){for(const t of hand)for(const z of levels)if(hasAnyPlacement(t,z,pieces))return true;return false}
  const cubeCenter=c=>({x:c.x+S/2,y:c.y+S/2,z:c.z});
  const pieceById=(ps,id)=>ps.find(p=>p.id===id);
  function connectionsForPiece(piece,pieces){const out=[];for(const p of pieces){if(p.id===piece.id||p.z!==piece.z)continue;const r=contactBetweenPieces(piece,p);if(r.ok&&r.touch)for(const c of r.contacts)out.push({toPieceId:p.id,fromHalf:c.aHalf,toHalf:c.bHalf,fromSide:c.side,toSide:c.otherSide,kind:r.kind})}return out}
  const connectionKey=c=>`${c.toPieceId}:${c.toHalf}:${c.fromSide}>${c.toSide}`;
  function applyOp(v,isDouble,state){
    const before=state.output||0;
    if(v===0)return{type:'zero',before,after:before,delta:0};
    if(v===2||v===4||v===6){const add=v*(isDouble?2:1),after=before+add;state.output=after;return{type:'add',before,after,add,delta:add}}
    if(v===1||v===3||v===5){const factor=isDouble?v*v:v,after=before*factor;state.output=after;return{type:'multiply',before,after,factor,delta:after-before}}
    return{type:'none',before,after:before,delta:0}
  }
  function startChoices(newPieceId,pieces){const p=pieceById(pieces,newPieceId);if(!p)return[];const out=[];for(const c of connectionsForPiece(p,pieces)){out.push({...c,entryHalf:c.toHalf,flipped:false,key:connectionKey(c)+':N'});out.push({...c,entryHalf:1-c.toHalf,flipped:true,key:connectionKey(c)+':F'})}const seen=new Set();return out.filter(c=>{const k=`${c.toPieceId}:${c.entryHalf}:${c.fromHalf}`;if(seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>a.key.localeCompare(b.key))}
  const extKey=(a,ah,b,bh)=>`E:${a}:${ah}>${b}:${bh}`;
  const cloneMap=m=>new Map(m);
  const cloneState=s=>({current:{...s.current},mode:s.mode,output:s.output,initialOutput:s.initialOutput,suppressZeroPiece:s.suppressZeroPiece,usedEdges:new Set(s.usedEdges),zeroCharges:cloneMap(s.zeroCharges),back:s.back.map(x=>({...x})),forward:s.forward.map(x=>({...x})),path:s.path.map(x=>({...x})),segments:s.segments.map(x=>({...x,from:{...x.from},to:{...x.to}})),events:s.events.map(x=>({...x})),traversals:s.traversals,rebounds:s.rebounds});
  function terminal(s,reason,meta={}){const events=[...s.events,{type:'die',reason}],output=s.output||0;return{output,gain:output-(s.initialOutput||0),path:s.path,segments:s.segments,events,zeroCharges:s.zeroCharges,reason,traversals:s.traversals,rebounds:s.rebounds,...meta}}
  function better(a,b){if(!b)return true;const av=[a.traversals||0,a.output||0,a.rebounds||0,(a.path||[]).length],bv=[b.traversals||0,b.output||0,b.rebounds||0,(b.path||[]).length];for(let i=0;i<av.length;i++){if(av[i]!==bv[i])return av[i]>bv[i]}return false}
  function bestSignal(newPieceId,pieces,opts={}){
    const initialOutput=Number.isFinite(opts.initialOutput)?opts.initialOutput:0;
    const newPiece=pieceById(pieces,newPieceId);if(!newPiece)return{output:initialOutput,gain:0,path:[],segments:[],events:[],reason:'missing-new-piece',traversals:0,rebounds:0,search:{starts:0,expanded:0,leaves:0,truncated:false}};
    const starts=startChoices(newPieceId,pieces);if(!starts.length)return{output:initialOutput,gain:0,path:[],segments:[],events:[],reason:'no-start',traversals:0,rebounds:0,search:{starts:0,expanded:0,leaves:1,truncated:false}};
    const maxExpanded=opts.maxExpanded||50000;let expanded=0,leaves=0,truncated=false,best=null;
    function finish(s,reason){leaves++;const r=terminal(s,reason);if(better(r,best))best=r;return r}
    function walk(s){
      if(++expanded>maxExpanded){truncated=true;return finish(s,'search-limit')}
      const cur=pieceById(pieces,s.current.pieceId);if(!cur)return finish(s,'missing-piece');
      const entryHalf=s.mode===1?s.current.entryHalf:1-s.current.entryHalf,inC=cur.cubes.find(c=>c.half===entryHalf)||cur.cubes[0],outC=cur.cubes.find(c=>c.half!==inC.half)||cur.cubes[1],from=cubeCenter(inC),to=cubeCenter(outC);
      s.path.push(from,to);s.segments.push({piece:cur.id,from,to,reverse:s.mode===-1,entryHalf:inC.half,exitHalf:outC.half});s.traversals++;
      const op=applyOp(outC.v,cur.double,s);s.events.push({type:'op',piece:cur.id,entryHalf:inC.half,exitHalf:outC.half,value:outC.v,op:op.type,before:op.before,after:op.after,add:op.add||0,factor:op.factor||0,delta:op.delta||0,reverse:s.mode===-1});
      if(outC.v===0){const cap=cur.double?2:1,used=s.zeroCharges.get(cur.id)||0;if(s.suppressZeroPiece===cur.id){s.suppressZeroPiece=null;s.events.push({type:'zero-pass',piece:cur.id})}else if(used<cap){s.zeroCharges.set(cur.id,used+1);s.mode*=-1;s.rebounds++;if(cur.double)s.suppressZeroPiece=cur.id;s.events.push({type:'rebound',piece:cur.id,charge:used+1});return walk(s)}else return finish(s,'zero-spent')}
      if(s.mode===-1){if(!s.back.length)return finish(s,'back-at-origin');const prev=s.back[s.back.length-1],k=extKey(cur.id,outC.half,prev.pieceId,1-prev.entryHalf);s.forward.push({...s.current});s.current=s.back.pop();s.events.push({type:'move',fromPiece:cur.id,fromHalf:outC.half,toPiece:s.current.pieceId,toHalf:1-s.current.entryHalf,reverse:true,retrace:true,key:k});return walk(s)}
      if(s.forward.length){const nxt=s.forward[s.forward.length-1],k=extKey(cur.id,outC.half,nxt.pieceId,nxt.entryHalf);s.back.push({...s.current});s.current=s.forward.pop();s.events.push({type:'move',fromPiece:cur.id,fromHalf:outC.half,toPiece:s.current.pieceId,toHalf:s.current.entryHalf,reverse:false,replay:true,retrace:true,key:k});return walk(s)}
      const conns=connectionsForPiece(cur,pieces).filter(c=>c.fromHalf===outC.half&&c.toPieceId!==s.current.fromPieceId).map(c=>({...c,key:extKey(cur.id,c.fromHalf,c.toPieceId,c.toHalf),choiceKey:connectionKey(c)})).filter(c=>!s.usedEdges.has(c.key)).sort((a,b)=>a.choiceKey.localeCompare(b.choiceKey));if(!conns.length)return finish(s,'no-exit');let localBest=null;
      for(const c of conns){if(expanded>=maxExpanded){truncated=true;break}const n=cloneState(s);n.usedEdges.add(c.key);n.back.push({...n.current});n.current={pieceId:c.toPieceId,entryHalf:c.toHalf,fromPieceId:cur.id,fromHalf:c.fromHalf};n.events.push({type:'route',piece:cur.id,entryHalf:inC.half,exitHalf:outC.half,toPieceId:c.toPieceId,toHalf:c.toHalf,key:c.choiceKey});const r=walk(n);if(better(r,localBest))localBest=r}return localBest||finish(s,'search-limit')
    }
    for(const first of starts){const st={current:{pieceId:first.toPieceId,entryHalf:first.entryHalf,fromPieceId:newPieceId,fromHalf:first.fromHalf},mode:1,output:initialOutput,initialOutput,suppressZeroPiece:null,usedEdges:new Set([extKey(newPieceId,first.fromHalf,first.toPieceId,first.toHalf)]),zeroCharges:new Map(),back:[],forward:[],path:[],segments:[],events:[{type:'start',key:first.key,toPieceId:first.toPieceId,toHalf:first.entryHalf,fromHalf:first.fromHalf,flipped:first.flipped}],traversals:0,rebounds:0};const r=walk(st);if(better(r,best))best=r;if(expanded>=maxExpanded){truncated=true;break}}
    best=best||{output:initialOutput,gain:0,path:[],segments:[],events:[],reason:'no-route',traversals:0,rebounds:0};best.search={starts:starts.length,expanded,leaves,truncated};return best
  }
  function simulateSignal(newPieceId,pieces,opts={}){return bestSignal(newPieceId,pieces,opts)}
  function portKey(pieceId,half,side){return`${pieceId}:${half}:${side}`}
  function exposedPorts(tile,z,pieces){const placements=allPlacements(tile,z,pieces),groups=new Map();for(const pl of placements)for(const group of pl.contacts||[]){if(group.kind==='double-centered'&&group.piece.double){const side=group.relation.sideB,key=`${group.piece.id}:center:${side}`;if(!groups.has(key))groups.set(key,{key,pieceId:group.piece.id,half:null,side,value:group.piece.tile.a,centered:true,placements:[]});const g=groups.get(key);if(!g.placements.some(p=>placementKey(tile,p)===placementKey(tile,pl)))g.placements.push(pl);continue}for(const c of group.contacts||[]){const key=portKey(group.piece.id,c.bHalf,c.otherSide);if(!groups.has(key))groups.set(key,{key,pieceId:group.piece.id,half:c.bHalf,side:c.otherSide,value:c.bV,centered:false,placements:[]});const g=groups.get(key);if(!g.placements.some(p=>placementKey(tile,p)===placementKey(tile,pl)))g.placements.push(pl)}}return[...groups.values()]}
  const api={S,DIR,ARROW,axis,setBoardSize,getBoardSize,cubesFor,rectForCubes,pieceFrom,edgeContact,contactBetweenPieces,validatePlacement,allPlacements,hasAnyPlacement,hasLegalMove,cubeCenter,connectionsForPiece,connectionKey,startChoices,applyOp,bestSignal,simulateSignal,exposedPorts};
  Object.defineProperties(api,{G:{enumerable:true,get:()=>G},H:{enumerable:true,get:()=>H}});
  return api;
});