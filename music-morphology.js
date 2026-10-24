// Read-only, deterministic interpretation of MONOID's physical board.
// Audio never mutates placement, routing, gameplay RNG, or saved state.
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
 const n=Math.max(0,Number(topology.tiles)||0),edges=Math.max(0,Number(topology.edges)||0);
 const junctions=Math.max(0,Number(topology.junctions)||0);
 const turns=Math.max(0,Number(topology.turns)||0),cycles=Math.max(0,Number(topology.cycles)||0);
 const size=clamp((n-1)/18),connectivity=clamp((edges-n/2)/12);
 // A distinct *leading* stem, not all stems gradually accumulating with tile count.
 // Physical structure wins over the pace influence.
 const scene=cycles?'circuit':junctions?'branch':turns?'winding':'line';
 const leadingStem={line:'A',winding:'E',branch:'B',circuit:'C'}[scene];
 // Decision pace affects colour rather than pressuring the player to act faster.
 const pressure=clamp((Math.max(0,Number(thinkingSeconds)||0)-16)/54);
 const db={
  F:-10+1.2*size+0.9*pressure,
  D:n<2?-Infinity:-21+3*size+4*pressure,
  A:-Infinity,B:-Infinity,C:-Infinity,E:-Infinity
 };
 if(n>=3)db[leadingStem]=-15+1.5*size+2*connectivity-2.5*pressure;
 // Quiet secondary colour only when a different physical characteristic exists.
 if(n>=6&&scene!=='winding'&&turns>0)db.E=-25+3*clamp(turns/4);
 if(n>=6&&scene!=='branch'&&junctions>0)db.B=-26+3*clamp(junctions/3);
 if(n>=6&&scene!=='circuit'&&cycles>0)db.C=-26+3*clamp(cycles/2);
 const levels=Object.fromEntries(Object.entries(db).map(([id,value])=>[id,dbToGain(value)]));
 return Object.freeze({levels:Object.freeze(levels),db:Object.freeze(db),pressure,scene,leadingStem,
  topology:Object.freeze({...topology})});
}
