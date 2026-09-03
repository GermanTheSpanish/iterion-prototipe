(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.IterionMods=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const registry=new Map();
  function register(mod){if(!mod?.id)throw new Error('Mod requires id');registry.set(mod.id,Object.freeze({...mod}));return mod}
  function get(id){return registry.get(id)||null}
  function all(){return [...registry.values()]}
  return{register,get,all};
});
