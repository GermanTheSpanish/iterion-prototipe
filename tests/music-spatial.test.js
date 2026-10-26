const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const source=fs.readFileSync('music-spatial.js','utf8');
 const {spatialMixForMachine}=await import('data:text/javascript,'+encodeURIComponent(source));
 const tile=(id,x,y,vertical=false,value=2)=>({id,cubes:vertical?
  [{x,y,v:value,z:0},{x,y:y+1,v:value,z:0}]:
  [{x,y,v:value,z:0},{x:x+1,y,v:value,z:0}]});
 const board={G:18,H:24};
 assert.deepEqual(spatialMixForMachine([],board).features,
  {tiles:0,straight:0,branches:0,turns:0,cycleRegionTiles:0});
 const left=[tile('L1',0,5),tile('L2',2,5),tile('L3',4,5)];
 const right=left.map(p=>({...p,id:'R'+p.id,
  cubes:p.cubes.map(c=>({...c,x:c.x+11}))}));
 const l=spatialMixForMachine(left,board),r=spatialMixForMachine(right,board);
 assert(l.pans.A<0&&r.pans.A>0,'linear source follows physical left/right position');
 assert(l.pans.F===0&&r.pans.F===0,'F Drum is always the centered heartbeat');
 assert(l.pans.D<0&&r.pans.D>0,'pads softly follow machine centroid');
 assert(Math.abs(l.pans.D)<Math.abs(l.pans.A),'pad bed stays narrower than lead');
 const branch=[tile('W',2,5),tile('C',4,5),tile('E',6,5),tile('N',4,3,true)];
 const b=spatialMixForMachine(branch,board);
 assert.equal(b.features.branches,1,'matching pips with three neighbours identify a branch');
 assert(b.pans.B<0,'branch colour is located at physical junction');
 const turn=spatialMixForMachine([tile('W',2,5),tile('C',4,5),tile('N',4,3,true)],board);
 assert.equal(turn.features.turns,1);
 assert(turn.pans.E<0,'winding voice follows turning node');
 const loop=[
  tile('top',5,5),tile('right',7,5,true),
  tile('bottom',6,7),tile('left',5,6,true)
 ];
 const cycle=spatialMixForMachine(loop,board);
 assert.equal(cycle.features.cycleRegionTiles,4,'cyclic physical component groups C voice');
 assert(cycle.pans.C<0);
 const incompatible=spatialMixForMachine([tile('left',1,1,false,2),tile('wrong',3,1,false,5)],board);
 assert.equal(incompatible.features.straight,0,'nonmatching values do not connect');
 assert.equal(incompatible.pans.B,0);
 assert.deepEqual(spatialMixForMachine(branch,board),b,'spatial calculations deterministic');
 assert.doesNotMatch(source,/Math\.random/);
 const percussion=fs.readFileSync('music-percussion.js','utf8');
 assert.match(percussion,/hissEnv\.gain\.setValueAtTime\(0,at\)/,'noise has zero-gain attack');
 assert.match(percussion,/hissEnv\.gain\.linearRampToValueAtTime\(0,at\+\.032\)/,'noise has zero-gain release');
 assert.match(percussion,/oldGroup\.gain\.linearRampToValueAtTime\(0,now\+\.02\)/,'stop uses output fade');
 const stem=fs.readFileSync('experiments/audio-lab/stem-player.js','utf8');
 assert.match(stem,/createStereoPanner/,'music stems have native per-stem panners');
 assert.match(stem,/gate\.gain\.setValueAtTime\(0,when\)/,'late AAC fragments start at silence');
 assert.match(fs.readFileSync('music-runtime.js','utf8'),/spatialMixForMachine/);
 console.log('Topology stereo, fixed drum centering, noise envelopes and AAC entry regressions passed');
})().catch(error=>{console.error(error);process.exitCode=1});
