// Read-only, deterministic interpretation of the physical MONOID machine.
// Music does not change placement, routing, score, RNG, or saved game state.
const clamp=(value,low=0,high=1)=>Math.max(low,Math.min(high,value));
export function dbToGain(db){
 return Number.isFinite(db)?Math.pow(10,db/20):0;
}
export function analyseMachine(pieces=[]){
 const tiles=Array.isArray(pieces)?pieces.filter(p=>p&&p.id!=null&&Array.isArray(p.cubes)):[],cells=new Map();
 for(const p of tiles)for(const c of p.cubes){
  if(Number.isFinite(c.x)&&Number.isFinite(c.y)&&Number.isFinite(c.v))
   cells.set(String(c.z??p.z??0)+':'+c.x+':'+c.y,{id:String(p.id),v:c.v});
 }
 const contacts=new Map(tiles.map(p=>[String(p.id),new Set()]));
 const directions=new Map(tiles.map(p=>[String(p.id),new Set()]));
 const parent=new Map(tiles.map(p=>[String(p.id),String(p.id)]));
 function root(id){while(parent.get(id)!==id)id=parent.get(id);return id}
 function union(a,b){const ra=root(a),rb=root(b);if(ra!==rb)parent.set(ra,rb)}
 let edges=0;
 const seen=new Set();
 for(const [key,from] of cells){
  const [z,x,y]=key.split(':').map(Number);
  for(const [dx,dy,da,db] of [[1,0,'E','W'],[0,1,'S','N']]){
   const to=cells.get(z+':'+(x+dx)+':'+(y+dy));
   if(!to||from.id===to.id||from.v!==to.v||!parent.has(from.id)||!parent.has(to.id))continue;
   const edge=[from.id,to.id].sort().join('\u0000');
   if(!seen.has(edge)){seen.add(edge);edges++;union(from.id,to.id)}
   contacts.get(from.id).add(to.id);contacts.get(to.id).add(from.id);
   directions.get(from.id).add(da);directions.get(to.id).add(db);
  }
 }
 const junctions=[...contacts.values()].filter(s=>s.size>=3).length;
 const turns=[...directions].filter(([id,s])=>{
  if(contacts.get(id).size!==2||s.size!==2)return false;
  return !((s.has('N')&&s.has('S'))||(s.has('E')&&s.has('W')));
 }).length;
 const components=new Set([...parent.keys()].map(root)).size;
 return Object.freeze({tiles:tiles.length,edges,junctions,turns,cycles:Math.max(0,edges-tiles.length+components),components});
}
export function mixForMachine(topology={},thinkingSeconds=0){
 const n=Math.max(0,Number(topology.tiles)||0);
 const size=clamp((n-1)/22);
 const branching=clamp((Number(topology.junctions)||0)/3);
 const loops=clamp((Number(topology.cycles)||0)/2);
 const bends=clamp((Number(topology.turns)||0)/6);
 // Decision time is secondary to physical morphology, resets every round.
 const pressure=clamp((Math.max(0,Number(thinkingSeconds)||0)-25)/100);
 const db={
  F: -9+2*size+1.2*pressure,
  D: n<3?-Infinity:-25+9*size+2*pressure,
  A: n<5?-Infinity:-24+10*size-4*branching-3*loops,
  E: n<5?-Infinity:-28+8*bends+7*size+2*pressure,
  B: n<6||branching+loops<.25?-Infinity:-29+10*branching+8*loops+3*pressure,
  C: n<8||loops<.3?-Infinity:-32+14*loops+4*pressure
 };
 const levels=Object.fromEntries(Object.entries(db).map(([id,value])=>[id,dbToGain(value)]));
 return Object.freeze({levels:Object.freeze(levels),db:Object.freeze(db),pressure,topology:Object.freeze({...topology})});
}
