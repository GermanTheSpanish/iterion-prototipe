const assert=require('node:assert/strict');
const fs=require('node:fs');
const {pathToFileURL}=require('node:url');
(async()=>{
 const src=fs.readFileSync('music-morphology.js','utf8');
 const {analyseMachine,mixForMachine,dbToGain}=await import('data:text/javascript,'+encodeURIComponent(src));
 const tile=(id,cubes)=>({id,cubes:cubes.map(([x,y,v])=>({x,y,v,z:0}))});
 const center=tile('c',[[0,0,2],[1,0,2]]);
 const west=tile('w',[[-2,0,2],[-1,0,2]]);
 const east=tile('e',[[2,0,2],[3,0,2]]);
 const north=tile('n',[[0,-2,2],[0,-1,2]]);
 assert.deepEqual(analyseMachine([]),{tiles:0,edges:0,junctions:0,turns:0,cycles:0,components:0});
 assert.deepEqual(analyseMachine([center,west,east]),{tiles:3,edges:2,junctions:0,turns:0,cycles:0,components:1});
 assert.equal(analyseMachine([center,west,north]).turns,1,'perpendicular physical neighbours yield a turn');
 assert.equal(analyseMachine([center,west,east,north]).junctions,1,'three physical neighbours yield a junction');
 const wrong=tile('wrong',[[2,0,5],[3,0,5]]);
 assert.equal(analyseMachine([center,wrong]).edges,0,'only matching printed values connect');
 const first=mixForMachine(analyseMachine([center]),0);
 assert(first.levels.F>0,'Drum plays on the first domino');
 for(const id of ['A','B','C','D','E'])assert.equal(first.levels[id],0,'only the Drum starts');
 const network=analyseMachine([center,west,east,north,
  tile('d',[[4,0,2],[5,0,2]]),tile('a',[[6,0,2],[7,0,2]]),
  tile('b',[[8,0,2],[9,0,2]]),tile('f',[[10,0,2],[11,0,2]])]);
 const early=mixForMachine(network,0),late=mixForMachine(network,140);
 assert(late.pressure>early.pressure);
 assert(late.levels.F>early.levels.F);
 assert(late.levels.D>early.levels.D);
 assert.deepEqual(mixForMachine(network,140),late,'pure deterministic mix');
 assert.deepEqual(network,analyseMachine([center,west,east,north,
  tile('d',[[4,0,2],[5,0,2]]),tile('a',[[6,0,2],[7,0,2]]),
  tile('b',[[8,0,2],[9,0,2]]),tile('f',[[10,0,2],[11,0,2]])]));
 assert.equal(dbToGain(-Infinity),0);
 assert.equal(dbToGain(0),1);
 assert.match(fs.readFileSync('index.html','utf8'),/music-runtime\.js/,'real game imports the runtime');
 assert.match(fs.readFileSync('music-runtime.js','utf8'),/createStemPlayer/);
 assert.match(fs.readFileSync('music-runtime.js','utf8'),/webkitdirectory/);
 assert.doesNotMatch(src,/Math\.random/);
 console.log('Adaptive game music physical topology + timing regression passed');
})().catch(error=>{console.error(error);process.exitCode=1});
