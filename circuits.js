(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.IterionCircuits=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const compare=(a,b)=>a<b?-1:a>b?1:0;
  function adjacency(pieces,contact){
    const graph=new Map(pieces.map(p=>[p.tile.id,new Set()]));
    if(typeof contact!=='function')return graph;
    for(let i=0;i<pieces.length;i++)for(let j=i+1;j<pieces.length;j++){
      const r=contact(pieces[i],pieces[j]);
      if(r.touch&&r.ok){graph.get(pieces[i].tile.id).add(pieces[j].tile.id);graph.get(pieces[j].tile.id).add(pieces[i].tile.id)}
    }
    return graph
  }
  // An undirected edge set is invariant under cycle rotation and reversal.
  function signature(ids){
    return JSON.stringify(ids.map((id,i)=>[id,ids[(i+1)%ids.length]].sort(compare)).sort((a,b)=>compare(JSON.stringify(a),JSON.stringify(b))))
  }
  function reward(size,cfg){return cfg.CIRCUIT_REWARDS.reduce((best,t)=>size>=t.minSize?t.ranks:best,0)}
  // Sorted BFS: one shortest path per neighbour pair in the graph WITHOUT newId.
  // O(degree(newId)^2 * (V+E)), not enumeration of all simple cycles.
  // Equal-length paths use physical-ID order, never values or insertion order.
  function shortestPath(graph,start,end,excluded){
    const queue=[start],parent=new Map([[start,null]]);
    for(let i=0;i<queue.length;i++){
      const current=queue[i];
      if(current===end){const path=[];for(let p=end;p!==null;p=parent.get(p))path.push(p);return path.reverse()}
      for(const next of [...(graph.get(current)||[])].sort(compare))if(next!==excluded&&!parent.has(next)){parent.set(next,current);queue.push(next)}
    }
    return null
  }
  function primaryCircuit(graph,newId,cfg){
    const neighbours=[...(graph.get(newId)||[])].sort(compare);let best=null;
    for(let i=0;i<neighbours.length;i++)for(let j=i+1;j<neighbours.length;j++){
      const path=shortestPath(graph,neighbours[i],neighbours[j],newId);if(!path)continue;
      const tileIds=[newId,...path],ranks=reward(tileIds.length,cfg);if(!ranks)continue;
      const candidate={tileIds,size:tileIds.length,reward:ranks,signature:signature(tileIds)};
      if(!best||candidate.reward>best.reward||candidate.reward===best.reward&&(candidate.size>best.size||candidate.size===best.size&&compare(candidate.signature,best.signature)<0))best=candidate;
    }
    return best
  }
  function shortestPathWithoutEdge(graph,start,end,excluded,blockedA,blockedB){
    const queue=[start],parent=new Map([[start,null]]);
    for(let i=0;i<queue.length;i++){
      const current=queue[i];
      if(current===end){const path=[];for(let p=end;p!==null;p=parent.get(p))path.push(p);return path.reverse()}
      for(const next of [...(graph.get(current)||[])].sort(compare)){
        const blocked=current===blockedA&&next===blockedB||current===blockedB&&next===blockedA;
        if(next!==excluded&&!blocked&&!parent.has(next)){parent.set(next,current);queue.push(next)}
      }
    }
    return null
  }
  function cycleSignaturesThrough(graph,tileId,minSize=4){
    const neighbours=[...(graph.get(tileId)||[])].sort(compare),found=new Set(),minimum=Math.max(3,Number(minSize)||4);
    const add=path=>{if(path&&path.length+1>=minimum)found.add(signature([tileId,...path]))};
    for(let i=0;i<neighbours.length;i++)for(let j=i+1;j<neighbours.length;j++){
      const first=shortestPath(graph,neighbours[i],neighbours[j],tileId);if(!first)continue;add(first);
      for(let edge=0;edge<first.length-1;edge++)add(shortestPathWithoutEdge(graph,neighbours[i],neighbours[j],tileId,first[edge],first[edge+1]))
    }
    return[...found].sort(compare)
  }
  function eligibleTiles(circuit,ranks,placedIds,cfg,tileLimit=cfg.CIRCUIT_TILE_LIMIT){
    const count=placedIds.filter(id=>(ranks[id]||0)>0).length;
    return circuit.tileIds.filter(id=>(ranks[id]||0)<cfg.CIRCUIT_MAX_RANK&&(count<tileLimit||(ranks[id]||0)>0)).sort(compare)
  }
  function upgradedRank(before,reward,cfg){return Math.min(cfg.CIRCUIT_MAX_RANK,before+reward)}
  function rankInfo(rank,cfg){return rank>0?cfg.CIRCUIT_RANKS[rank-1]||null:null}
  function resonance(baseOutput,events,pieces,ranks,cfg){
    const byPiece=new Map(pieces.map(p=>[p.id,p.tile.id])),ids=new Set();
    for(const event of events||[])if(event.type==='op'||event.type==='echo-op'){
      const id=byPiece.get(event.piece);if(id!==undefined)ids.add(id);
    }
    const active=[...ids].sort(compare).filter(id=>rankInfo(ranks[id]||0,cfg)).map(tileId=>({tileId,rank:ranks[tileId],bonus:rankInfo(ranks[tileId],cfg).bonus}));
    const bonus=active.reduce((sum,t)=>sum+t.bonus,0),multiplier=1+bonus;
    const output=Math.floor(baseOutput*multiplier);
    return{active,bonus,multiplier,baseOutput,output,safeInteger:Number.isSafeInteger(baseOutput)&&Number.isSafeInteger(output)}
  }
  return{adjacency,signature,reward,shortestPath,primaryCircuit,cycleSignaturesThrough,eligibleTiles,upgradedRank,rankInfo,resonance};
});
