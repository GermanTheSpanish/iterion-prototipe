// Read-only, deterministic audio positions derived from physical domino topology.
// Stereo panning only: no 3D engine, listener camera/zoom or game-state mutation.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const meanX=nodes=>nodes.length?nodes.reduce((sum,node)=>sum+node.x,0)/nodes.length:null;
export function spatialMixForMachine(pieces=[],board={G:18,H:24}){
 const width=Math.max(12,Number(board?.G??board?.width)||18);
 const nodes=new Map(),cells=new Map();
 for(const piece of Array.isArray(pieces)?pieces:[]){
  if(piece?.id==null||!Array.isArray(piece.cubes))continue;
  const cubes=piece.cubes.filter(c=>Number.isFinite(c.x)&&Number.isFinite(c.y)&&Number.isFinite(c.v));
  if(cubes.length!==2)continue;
  const id=String(piece.id),node={id,x:cubes.reduce((n,c)=>n+c.x+.5,0)/2,
   neighbours:new Set(),directions:new Set()};
  nodes.set(id,node);
  for(const c of cubes)cells.set((c.z??piece.z??0)+':'+c.x+':'+c.y,{id,v:c.v});
 }
 for(const [key,from] of cells){
  const [z,x,y]=key.split(':').map(Number);
  for(const [dx,dy,one,two] of [[1,0,'E','W'],[0,1,'S','N']]){
   const other=cells.get(z+':'+(x+dx)+':'+(y+dy));
   if(!other||other.id===from.id||other.v!==from.v)continue;
   const a=nodes.get(from.id),b=nodes.get(other.id);
   if(!a||!b)continue;
   a.neighbours.add(b.id);b.neighbours.add(a.id);
   a.directions.add(one);b.directions.add(two);
  }
 }
 const all=[...nodes.values()];
 const straight=all.filter(n=>n.neighbours.size===1||
  n.neighbours.size===2&&(
   n.directions.has('E')&&n.directions.has('W')||
   n.directions.has('N')&&n.directions.has('S')));
 const junctions=all.filter(n=>n.neighbours.size>=3);
 const turns=all.filter(n=>n.neighbours.size===2&&!(
  n.directions.has('E')&&n.directions.has('W')||
  n.directions.has('N')&&n.directions.has('S')));
 const visited=new Set(),cyclic=[];
 for(const root of all){
  if(visited.has(root.id))continue;
  const queue=[root],component=[];visited.add(root.id);
  while(queue.length){
   const node=queue.pop();component.push(node);
   for(const id of node.neighbours)if(!visited.has(id)){
    const next=nodes.get(id);
    if(next){visited.add(id);queue.push(next)}
   }
  }
  const edgeCount=component.reduce((n,p)=>n+p.neighbours.size,0)/2;
  if(edgeCount>=component.length)cyclic.push(...component);
 }
 // Absolute left/right location in the physical hangar, unaffected by pinch
 // zoom or DOM coordinates. Moderate maximum width is mono-speaker-friendly.
 const panAt=x=>x===null?0:clamp((x-width/2)/(Math.max(8,width*.58)), -.62,.62);
 const center=meanX(all);
 const pans=Object.freeze({
  A:panAt(meanX(straight)),B:panAt(meanX(junctions)),
  C:panAt(meanX(cyclic)),D:panAt(center)*.35,
  E:panAt(meanX(turns)),F:0
 });
 return Object.freeze({pans,
  features:Object.freeze({tiles:all.length,straight:straight.length,
   branches:junctions.length,turns:turns.length,cycleRegionTiles:cyclic.length}),
  width,mode:'topology-stereo-v1'});
}
