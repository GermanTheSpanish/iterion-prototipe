(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{
    root.MonoidProfile=api.create({
      storage:root.localStorage,
      crypto:root.crypto,
      now:function(){return Date.now()},
      location:root.location
    });
    root.MonoidProfile.ensureProfile();
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const CONTEXT_KEY='monoid.profileContext.v1';
  const PROFILE_KEYS=Object.freeze({
    player:'monoid.profile.player.v1',
    dev:'monoid.profile.dev.v1',
    fresh:'monoid.profile.fresh.v1'
  });
  const CONTEXT_PREFIX=Object.freeze({
    player:'',
    dev:'monoid.ctx.dev.',
    fresh:'monoid.ctx.fresh.'
  });
  const CONTEXTS=Object.freeze(['player','dev','fresh']);
  const ALL_MODES=Object.freeze(['classic','eyes','frames','river','loom','peaks','islands']);
  const LEGACY_PLAYER_KEY='monoid.playtestPlayer.v1';
  const LEGACY_ACTIVITY_KEYS=Object.freeze([
    LEGACY_PLAYER_KEY,
    'iterion.activeRun.v1',
    'iterion.latestRun.v9',
    'iterion.tutorialChoice.v1'
  ]);

  const clone=function(value){return value==null?value:JSON.parse(JSON.stringify(value))};

  function create(options){
    options=options||{};
    const storage=options.storage||null;
    const cryptoApi=options.crypto||null;
    const now=options.now||function(){return Date.now()};
    const location=options.location||null;

    const readJson=function(key){
      try{return JSON.parse((storage&&storage.getItem(key))||'null')}catch(_){return null}
    };
    const writeJson=function(key,value){
      try{if(storage)storage.setItem(key,JSON.stringify(value));return true}catch(_){return false}
    };
    const randomUint32=function(){
      try{
        if(cryptoApi&&cryptoApi.getRandomValues)return cryptoApi.getRandomValues(new Uint32Array(1))[0]>>>0
      }catch(_){}
      return((Math.random()*0xffffffff)>>>0)
    };
    const makeProfileId=function(){
      return 'P-'+randomUint32().toString(36).toUpperCase().padStart(7,'0').slice(-7)
    };
    const isLocalDevHost=function(){
      const host=String((location&&location.hostname)||'').toLowerCase();
      return host==='localhost'||host==='127.0.0.1'||host==='::1'
    };
    const validContext=function(value){return CONTEXTS.includes(value)?value:null};

    function currentContext(){
      const stored=validContext(storage&&storage.getItem(CONTEXT_KEY));
      return stored||'player'
    }

    function implicitLocalDevAccess(){
      return !validContext(storage&&storage.getItem(CONTEXT_KEY))&&isLocalDevHost()
    }

    function storageKey(baseKey,context){
      const id=validContext(context)||currentContext();
      return id==='player'?String(baseKey):CONTEXT_PREFIX[id]+String(baseKey)
    }

    function profileKey(context){
      return PROFILE_KEYS[validContext(context)||currentContext()]
    }

    function legacyPlayer(){
      const value=readJson(LEGACY_PLAYER_KEY);
      return value&&value.playerId?value:null
    }

    function hasLegacyPlayerActivity(){
      return LEGACY_ACTIVITY_KEYS.some(function(key){
        try{return storage&&storage.getItem(key)!=null}catch(_){return false}
      })
    }

    function defaultUnlockedModes(context){
      if(context==='dev')return ALL_MODES.slice();
      if(context==='player'&&hasLegacyPlayerActivity())return ALL_MODES.slice();
      return['classic']
    }

    function makeProfile(context){
      const legacy=context==='player'?legacyPlayer():null;
      const migrated=context==='player'&&hasLegacyPlayerActivity();
      return{
        version:1,
        profileId:(legacy&&legacy.playerId)||makeProfileId(),
        createdAt:new Date(now()).toISOString(),
        context:context,
        unlockedModes:defaultUnlockedModes(context),
        unlockedMods:[],
        collection:{numbers:[]},
        stats:{
          runsStarted:0,
          runsFinished:0,
          endlessRuns:0,
          ouroborosRuns:0
        },
        migration:migrated?'legacy-open-access':null
      }
    }

    function normalizeProfile(value,context){
      const base=value&&typeof value==='object'?value:makeProfile(context);
      if(!base.profileId)base.profileId=makeProfileId();
      base.version=1;
      base.context=context;
      if(!Array.isArray(base.unlockedModes))base.unlockedModes=defaultUnlockedModes(context);
      base.unlockedModes=Array.from(new Set(base.unlockedModes.filter(function(mode){return ALL_MODES.includes(mode)})));
      if(!base.unlockedModes.includes('classic'))base.unlockedModes.unshift('classic');
      if(context==='dev')base.unlockedModes=ALL_MODES.slice();
      if(!Array.isArray(base.unlockedMods))base.unlockedMods=[];
      if(!base.collection||typeof base.collection!=='object')base.collection={numbers:[]};
      if(!Array.isArray(base.collection.numbers))base.collection.numbers=[];
      if(!base.stats||typeof base.stats!=='object')base.stats={};
      ['runsStarted','runsFinished','endlessRuns','ouroborosRuns'].forEach(function(key){
        if(!Number.isFinite(Number(base.stats[key]))||Number(base.stats[key])<0)base.stats[key]=0;
        else base.stats[key]=Math.trunc(Number(base.stats[key]))
      });
      return base
    }

    function ensureProfile(context){
      const id=validContext(context)||currentContext();
      const key=profileKey(id);
      const profile=normalizeProfile(readJson(key),id);
      writeJson(key,profile);
      return clone(profile)
    }

    function saveProfile(profile,context){
      const id=validContext(context)||currentContext();
      const normalized=normalizeProfile(clone(profile),id);
      writeJson(profileKey(id),normalized);
      return clone(normalized)
    }

    function isDevAccess(){
      return currentContext()==='dev'||implicitLocalDevAccess()
    }

    function isModeUnlocked(mode,context){
      if(!ALL_MODES.includes(mode))return false;
      const explicit=validContext(context),id=explicit||currentContext();
      if(id==='dev'||(!explicit&&implicitLocalDevAccess()))return true;
      return ensureProfile(id).unlockedModes.includes(mode)
    }

    function unlockMode(mode,context){
      if(!ALL_MODES.includes(mode))return{changed:false,profile:ensureProfile(context)};
      const id=validContext(context)||currentContext();
      const profile=ensureProfile(id);
      if(profile.unlockedModes.includes(mode))return{changed:false,profile:profile};
      profile.unlockedModes.push(mode);
      return{changed:true,profile:saveProfile(profile,id)}
    }

    function resetContext(context){
      const id=validContext(context);
      if(!id||id==='player')return false;
      const prefix=CONTEXT_PREFIX[id],remove=[];
      try{
        for(let i=0;i<(storage?storage.length:0);i++){
          const key=storage.key(i);
          if(key&&key.startsWith(prefix))remove.push(key)
        }
        remove.forEach(function(key){storage.removeItem(key)});
        if(storage)storage.removeItem(profileKey(id));
        return true
      }catch(_){return false}
    }

    function setContext(context,settings){
      const id=validContext(context);
      settings=settings||{};
      if(!id)throw new Error('Unknown profile context: '+context);
      if(settings.reset)resetContext(id);
      if(storage)storage.setItem(CONTEXT_KEY,id);
      return ensureProfile(id)
    }

    function telemetryOptions(context){
      const id=validContext(context)||currentContext();
      const profile=ensureProfile(id);
      return{
        playerId:profile.profileId,
        environment:id==='player'?'player':id==='dev'?'dev':'qa',
        profileType:id,
        keys:{
          player:storageKey('monoid.playtestPlayer.v1',id),
          run:storageKey('monoid.playtestRun.v1',id),
          batch:storageKey('monoid.playtestBatch.v1',id),
          lastBatch:storageKey('monoid.playtestLastBatch.v1',id)
        }
      }
    }

    function evaluateRun(state,snapshot,context){
      const id=validContext(context)||currentContext();
      if(id==='dev'||!state||!snapshot)return{unlocked:[],profile:ensureProfile(id)};
      const mode=String(state.gameMode||snapshot.gameMode||'classic'),events=Array.isArray(state.events)?state.events:[],cores=Array.isArray(state.cores)?state.cores:[],unlocked=[];
      const unlock=function(next){const result=unlockMode(next,id);if(result.changed)unlocked.push(next)};
      if(mode==='classic'&&state.endlessMode)unlock('eyes');
      if(mode==='eyes'&&Number(snapshot.cores?.telemetry?.connectedCoreCount||0)>=2)unlock('frames');
      if(mode==='frames'){
        const discovered=new Set(cores.filter(function(core){return Number.isFinite(Number(core.stage))}).map(function(core){return core.id})),activated=new Set();
        events.forEach(function(event){(event.coreActivations||[]).forEach(function(item){if(discovered.has(item.coreId))activated.add(item.coreId)})});
        if(activated.size>=3)unlock('river')
      }
      if(mode==='river'){
        const halfByCore=new Map(cores.filter(function(core){return core.half==='north'||core.half==='south'}).map(function(core){return[core.id,core.half]}));
        const crossed=events.some(function(event){if(!Array.isArray(event.coreActivations))return false;const halves=new Set(event.coreActivations.map(function(item){return halfByCore.get(item.coreId)}).filter(Boolean));return halves.has('north')&&halves.has('south')});
        if(crossed)unlock('loom')
      }
      if(mode==='loom'){
        const activatedMoves=new Set(events.filter(function(event){return Array.isArray(event.coreActivations)&&event.coreActivations.length}).map(function(event){return Number(event.turn)}));
        const circuitThroughCore=events.some(function(event){return event.type==='circuit-closed'&&activatedMoves.has(Number(event.move))});
        if(circuitThroughCore)unlock('peaks')
      }
      if(mode==='peaks'&&state.endlessMode)unlock('islands');
      return{unlocked:unlocked,profile:ensureProfile(id)}
    }

    function contextInfo(){
      const context=currentContext(),profile=ensureProfile(context);
      return{
        context:context,
        label:context==='player'?'PLAYER':context==='dev'?'DEV':'FRESH PLAYER',
        devAccess:isDevAccess(),
        profile:profile
      }
    }

    return Object.freeze({
      CONTEXT_KEY:CONTEXT_KEY,
      PROFILE_KEYS:PROFILE_KEYS,
      CONTEXTS:CONTEXTS,
      ALL_MODES:ALL_MODES,
      currentContext:currentContext,
      implicitLocalDevAccess:implicitLocalDevAccess,
      storageKey:storageKey,
      profileKey:profileKey,
      ensureProfile:ensureProfile,
      saveProfile:saveProfile,
      isDevAccess:isDevAccess,
      isModeUnlocked:isModeUnlocked,
      unlockMode:unlockMode,
      resetContext:resetContext,
      setContext:setContext,
      telemetryOptions:telemetryOptions,
      evaluateRun:evaluateRun,
      contextInfo:contextInfo
    })
  }

  return{
    create:create,
    CONTEXT_KEY:CONTEXT_KEY,
    PROFILE_KEYS:PROFILE_KEYS,
    CONTEXT_PREFIX:CONTEXT_PREFIX,
    CONTEXTS:CONTEXTS,
    ALL_MODES:ALL_MODES
  }
});
