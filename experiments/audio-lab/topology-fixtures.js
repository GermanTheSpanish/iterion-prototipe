// Synthetic structural listening studies only. Not legal placement or scoring fixtures.
// All three use the same six physical IDs and printed tiles; only topology changes.
const tiles=[[2,2],[2,3],[3,4],[4,5],[5,6],[6,1]];
const reverse={L:'R',R:'L',U:'D',D:'U'};
function fixture(id,label,description,links){
 const pieces=tiles.map(([a,b],i)=>({id:i+1,tile:{a,b},connections:[]}));
 for(const [a,b,side] of links){
  pieces[a-1].connections.push({toPieceId:b,fromSide:side});
  pieces[b-1].connections.push({toPieceId:a,fromSide:reverse[side]});
 }
 return {id,label,description,pieces};
}
export const TOPOLOGY_STUDIES=Object.freeze([
 fixture('line','Linear machine','One regular voice; no turns or loops.',[[1,2,'R'],[2,3,'R'],[3,4,'R'],[4,5,'R'],[5,6,'R']]),
 fixture('turns','Winding machine','The same tiles with three changes of direction.',[[1,2,'R'],[2,3,'D'],[3,4,'R'],[4,5,'U'],[5,6,'R']]),
 fixture('network','Circuit and junction','A closed cycle and a physical junction add two voices.',[[1,2,'R'],[2,3,'D'],[3,4,'L'],[4,1,'U'],[2,5,'R'],[5,6,'R']])
]);
