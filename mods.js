(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.IterionMods=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const registry=new Map();
  function register(mod){if(!mod?.id)throw new Error('Mod requires id');registry.set(mod.id,Object.freeze({...mod}));return mod}
  function get(id){return registry.get(id)||null}
  function all(){return [...registry.values()]}
  register({id:'extra-placement',name:'+1 PLACEMENT',kind:'instant',cost:3,description:'Una colocación extra esta ronda.'});
  register({id:'fresh-reroll',name:'REROLL REFRESH',kind:'instant',cost:3,description:'Recupera el reroll de esta ronda.'});
  register({id:'long-machine',name:'LONG MACHINE',kind:'mod',cost:8,description:'+1 colocación máxima en todas las rondas restantes.'});
  register({id:'coin-engine',name:'COIN ENGINE',kind:'mod',cost:7,description:'+2 coins cada vez que superas una ronda.'});
  return{register,get,all};
});
