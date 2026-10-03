const assert=require('assert');
const Profile=require('../profile.js');
const Telemetry=require('../playtest-telemetry.js');

function storage(seed={}){
  const map=new Map(Object.entries(seed).map(([key,value])=>[key,String(value)]));
  return{
    get length(){return map.size},
    key(index){return [...map.keys()][index]??null},
    getItem(key){return map.has(String(key))?map.get(String(key)):null},
    setItem(key,value){map.set(String(key),String(value))},
    removeItem(key){map.delete(String(key))},
    clear(){map.clear()},
    dump(){return Object.fromEntries(map)}
  }
}
function cryptoStub(){
  let value=100;
  return{getRandomValues(array){array[0]=value++;return array}}
}
function create(store,hostname='play.monoid.test'){
  return Profile.create({storage:store,crypto:cryptoStub(),now:()=>Date.parse('2026-10-02T16:00:00Z'),location:{hostname}})
}

{
  const store=storage(),profile=create(store);
  assert.equal(profile.currentContext(),'player');
  assert.deepEqual(profile.ensureProfile().unlockedModes,['classic']);
  assert.deepEqual(profile.ensureProfile().completedModes,[]);
  assert.equal(profile.isModeUnlocked('eyes'),false);
  assert.equal(profile.storageKey('iterion.activeRun.v1'),'iterion.activeRun.v1');
}

{
  const store=storage({'monoid.playtestPlayer.v1':JSON.stringify({version:1,playerId:'P-LEGACY1',runSequence:9})}),profile=create(store);
  const player=profile.ensureProfile();
  assert.equal(player.profileId,'P-LEGACY1');
  assert.deepEqual(player.unlockedModes,Profile.ALL_MODES);
  assert.equal(player.migration,'legacy-open-access');
}

{
  const store=storage(),profile=create(store,'127.0.0.1');
  assert.equal(profile.currentContext(),'player');
  assert.equal(profile.isDevAccess(),true);
  assert.equal(profile.isModeUnlocked('peaks'),true);
  assert.equal(profile.storageKey('iterion.activeRun.v1'),'iterion.activeRun.v1');
  profile.setContext('fresh',{reset:true});
  assert.equal(profile.isDevAccess(),false);
  assert.deepEqual(profile.ensureProfile().unlockedModes,['classic']);
  assert.equal(profile.isModeUnlocked('eyes'),false);
  assert.equal(profile.storageKey('iterion.activeRun.v1'),'monoid.ctx.fresh.iterion.activeRun.v1');
}

{
  const store=storage({'iterion.activeRun.v1':'PLAYER-SAVE'}),profile=create(store);
  profile.setContext('dev');
  assert.deepEqual(profile.ensureProfile().unlockedModes,Profile.ALL_MODES);
  assert.deepEqual(profile.ensureProfile().completedModes,[]);
  assert.equal(profile.storageKey('iterion.activeRun.v1'),'monoid.ctx.dev.iterion.activeRun.v1');
  store.setItem(profile.storageKey('iterion.activeRun.v1'),'DEV-SAVE');
  profile.setContext('fresh',{reset:true});
  store.setItem(profile.storageKey('iterion.activeRun.v1'),'FRESH-SAVE');
  profile.setContext('fresh',{reset:true});
  assert.equal(store.getItem('iterion.activeRun.v1'),'PLAYER-SAVE');
  assert.equal(store.getItem('monoid.ctx.dev.iterion.activeRun.v1'),'DEV-SAVE');
  assert.equal(store.getItem('monoid.ctx.fresh.iterion.activeRun.v1'),null);
}

{
  const store=storage(),profile=create(store);
  let result=profile.evaluateRun({gameMode:'classic',endlessMode:true,events:[],cores:[]},{gameMode:'classic',cores:{telemetry:{connectedCoreCount:0}},endless:{infinitePhase:false}});
  assert.deepEqual(result.unlocked,['eyes']);assert.deepEqual(result.completed,['classic']);
  result=profile.evaluateRun({gameMode:'eyes',events:[],cores:[]},{gameMode:'eyes',cores:{telemetry:{connectedCoreCount:2}},endless:{infinitePhase:false}});
  assert.deepEqual(result.unlocked,['frames']);assert.deepEqual(result.completed,['eyes']);
  const discovered=[1,2,3].map(stage=>({id:'core-frames-stage-'+stage,stage}));
  result=profile.evaluateRun({
    gameMode:'frames',cores:discovered,events:[
      {coreActivations:[{coreId:discovered[0].id}]},
      {coreActivations:[{coreId:discovered[1].id}]},
      {coreActivations:[{coreId:discovered[2].id}]}
    ]
  },{gameMode:'frames',cores:{telemetry:{connectedCoreCount:3}},endless:{infinitePhase:false}});
  assert.deepEqual(result.unlocked,['river']);assert.deepEqual(result.completed,['frames']);
  result=profile.evaluateRun({
    gameMode:'river',cores:[{id:'north',half:'north'},{id:'south',half:'south'}],
    events:[{turn:4,coreActivations:[{coreId:'north'},{coreId:'south'}]}]
  },{gameMode:'river',cores:{telemetry:{connectedCoreCount:2}},endless:{infinitePhase:false}});
  assert.deepEqual(result.unlocked,['loom']);assert.deepEqual(result.completed,['river']);
  result=profile.evaluateRun({
    gameMode:'loom',cores:[{id:'core-a'}],
    events:[{turn:7,coreActivations:[{coreId:'core-a'}]},{type:'circuit-closed',move:7}]
  },{gameMode:'loom',cores:{telemetry:{connectedCoreCount:1}},endless:{infinitePhase:false}});
  assert.deepEqual(result.unlocked,['peaks']);assert.deepEqual(result.completed,['loom']);

  result=profile.evaluateRun(
    {gameMode:'peaks',endlessMode:true,events:[],cores:[]},
    {gameMode:'peaks',cores:{telemetry:{connectedCoreCount:0}},endless:{infinitePhase:false}}
  );
  assert.deepEqual(result.unlocked,[],'Peaks Endless alone must not unlock Islands');
  assert.deepEqual(result.completed,[],'Peaks Endless alone must not complete Peaks');
  assert.equal(profile.isModeUnlocked('islands'),false);

  result=profile.evaluateRun(
    {gameMode:'peaks',endlessMode:true,events:[],cores:[]},
    {gameMode:'peaks',cores:{telemetry:{connectedCoreCount:0}},endless:{infinitePhase:true}}
  );
  assert.deepEqual(result.unlocked,['islands']);assert.deepEqual(result.completed,['peaks']);
  assert.equal(profile.modeProgress('islands').unlocked,true);
  assert.equal(profile.modeProgress('islands').completed,false);
  assert.equal(profile.modeProgress('islands').requirement.unlock,'Reach Infinite in The Peaks.');
  assert.equal(profile.modeProgress('islands').requirement.complete,'Clear one Ouroboros round.');

  result=profile.evaluateRun(
    {gameMode:'islands',ouroborosMode:true,ouroborosStartedRound:42,wins:[{round:41}],events:[],cores:[]},
    {gameMode:'islands',cores:{telemetry:{connectedCoreCount:0}},endless:{infinitePhase:true,ouroboros:true}}
  );
  assert.deepEqual(result.completed,[],'entering Ouroboros is not enough to complete Islands');

  result=profile.evaluateRun(
    {gameMode:'islands',ouroborosMode:true,ouroborosStartedRound:42,wins:[{round:41},{round:42}],events:[],cores:[]},
    {gameMode:'islands',cores:{telemetry:{connectedCoreCount:0}},endless:{infinitePhase:true,ouroboros:true}}
  );
  assert.deepEqual(result.completed,['islands']);
  assert.deepEqual(result.unlocked,[]);
  assert.equal(profile.isModeCompleted('islands'),true);
  assert.deepEqual(profile.ensureProfile().unlockedModes,['classic','eyes','frames','river','loom','peaks','islands']);
  assert.deepEqual(profile.ensureProfile().completedModes,['classic','eyes','frames','river','loom','peaks','islands']);
}

{
  const store=storage(),profile=create(store);
  profile.setContext('dev');
  const options=profile.telemetryOptions(),telemetry=Telemetry.create({storage:store,...options,now:()=>1000,randomUint32:()=>123});
  const snap=telemetry.bindRun({runId:'dev-run',round:1,stage:1});
  assert.equal(snap.playerId,profile.ensureProfile().profileId);
  assert.equal(snap.environment,'dev');
  assert.equal(snap.profileType,'dev');
  assert.equal(telemetry.identity().environment,'dev');
  assert.equal(store.getItem('monoid.playtestRun.v1'),null);
  assert.ok(store.getItem('monoid.ctx.dev.monoid.playtestRun.v1'));
}

console.log('profile context and progression tests passed');
