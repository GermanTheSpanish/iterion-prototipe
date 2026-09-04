(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.IterionMods=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const registry=new Map();
  function register(mod){if(!mod?.id)throw new Error('Mod requires id');registry.set(mod.id,Object.freeze({...mod}));return mod}
  function get(id){return registry.get(id)||null}
  function all(){return [...registry.values()]}
  register({id:'extra-placement',name:'+1 PLACEMENT',kind:'instant-next',cost:3,description:'Add one extra placement to the next round.'});
  register({id:'extra-reroll',name:'+1 REROLL',kind:'instant-next',cost:3,description:'Add one extra full-hand reroll to the next round.'});
  register({id:'long-machine',name:'LONG MACHINE',kind:'mod',cost:8,description:'Permanently add +1 maximum placement for the rest of this run.'});
  register({id:'coin-engine',name:'COIN ENGINE',kind:'mod',cost:7,description:'Gain +1 extra coin every time you clear a round.'});
  return{register,get,all};
});