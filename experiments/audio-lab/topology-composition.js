// Audio Lab only. Input contacts must come from the authoritative physical board,
// e.g. IterionEngine.connectionsForPiece(piece, pieces). Never infer route/scoring here.
const SIDES = new Set(['L', 'R', 'U', 'D']);
const REVERSE = { L: 'R', R: 'L', U: 'D', D: 'U' };
const compareIds = (a,b) => String(a).localeCompare(String(b), 'en', {numeric:true});
const tone = (piece) => (piece.tile.a + piece.tile.b) % 7;
function normalizedPieces(input) {
  if (!Array.isArray(input)) throw new TypeError('Expected physical pieces array');
  if (input.length > 2000) throw new RangeError('Too many pieces');
  const ids = new Set();
  return input.map(piece => {
    const id = piece?.id;
    const a = Number(piece?.tile?.a), b = Number(piece?.tile?.b);
    if ((typeof id !== 'string' && !Number.isSafeInteger(id)) || String(id)==='' || ids.has(String(id))) throw new Error('Missing or duplicate physical tile ID');
    if (![a,b].every(p => Number.isInteger(p) && p >= 0 && p <= 6)) throw new Error('Invalid printed pips');
    ids.add(String(id));
    const contacts = piece.connections || piece.contacts || [];
    if (!Array.isArray(contacts)) throw new Error('Invalid physical connections');
    return {id:String(id),tile:{a,b},connections:contacts.map(c=>({to:String(c.toPieceId??c.to),side:c.fromSide??c.side}))};
  }).sort((a,b)=>compareIds(a.id,b.id));
}
export function interpretTopology(input) {
  const pieces=normalizedPieces(input), byId=new Map(pieces.map(p=>[p.id,p]));
  const graph=new Map(pieces.map(p=>[p.id,new Map()]));
  for(const piece of pieces) for(const c of piece.connections) {
    if(!byId.has(c.to) || c.to===piece.id || !SIDES.has(c.side)) throw new Error('Invalid physical neighbour');
    const existing=graph.get(piece.id).get(c.to);
    if(existing && existing!==c.side) throw new Error('Conflicting physical neighbour sides');
    graph.get(piece.id).set(c.to,c.side);
  }
  for(const [id,links] of graph) for(const [to,side] of links) {
    if(graph.get(to).get(id)!==REVERSE[side]) throw new Error('Physical contacts must be reciprocal');
  }
  const degree=id=>graph.get(id).size;
  const endpoints=pieces.filter(p=>degree(p.id)===1).length;
  const corners=pieces.filter(p=>{
    const sides=[...graph.get(p.id).values()];
    return sides.length===2 && REVERSE[sides[0]]!==sides[1];
  }).length;
  const junctions=pieces.filter(p=>degree(p.id)>=3).length;
  const doubles=pieces.filter(p=>p.tile.a===p.tile.b).length;
  const visited=new Set();let components=0;
  for(const p of pieces) if(!visited.has(p.id)) {
    components++;const queue=[p.id];visited.add(p.id);
    for(let i=0;i<queue.length;i++) for(const to of graph.get(queue[i]).keys()) if(!visited.has(to)){visited.add(to);queue.push(to)}
  }
  const edges=pieces.reduce((n,p)=>n+degree(p.id),0)/2;
  const cycles=edges-pieces.length+components;
  const features={tiles:pieces.length,edges,components,endpoints,corners,junctions,cycles,doubles};
  if(!pieces.length) return {features,bpm:80,beatsPerLoop:8,voices:[],events:[]};
  const roots=pieces.slice(0,8),events=[],voices=[{id:'line',label:'Base sequence'}];
  // Stable slot assignment: adding a higher-ID tile preserves existing opening events.
  for(let i=0;i<roots.length;i++) events.push({voice:'line',beat:i,pip:tone(roots[i]),wave:'soft',volume:.11,release:.36,pan:0});
  if(corners>0){
    voices.push({id:'turn',label:'Turns / syncopation'});
    const turns=pieces.filter(p=>{
      const sides=[...graph.get(p.id).values()];return sides.length===2&&REVERSE[sides[0]]!==sides[1];
    }).slice(0,4);
    turns.forEach((p,i)=>events.push({voice:'turn',beat:(i*2+.5)%8,pip:tone(p),wave:'triangle',volume:.055,release:.48,pan:-.24}));
  }
  if(cycles>0){
    voices.push({id:'cycle',label:'Closed circuit'});
    for(let i=0;i<4;i++) events.push({voice:'cycle',beat:i*2+.75,pip:tone(pieces[i%pieces.length]),wave:'soft',volume:.065,release:.8,pan:.28});
  }
  if(junctions>0){
    voices.push({id:'junction',label:'Junction harmonics'});
    const junction=pieces.find(p=>degree(p.id)>=3);
    for(const offset of [0,2,4]) events.push({voice:'junction',beat:0,pip:(tone(junction)+offset)%7,wave:'reed',volume:.033,release:2.3,pan:0});
  }
  return {features,bpm:80,beatsPerLoop:8,voices:voices.slice(0,4),events:events.sort((a,b)=>a.beat-b.beat||a.voice.localeCompare(b.voice)||a.pip-b.pip)};
}
