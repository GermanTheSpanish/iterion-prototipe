(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.IterionMods=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const registry=new Map();
  function register(mod){if(!mod?.id)throw new Error('Mod requires id');registry.set(mod.id,Object.freeze({...mod}));return mod}
  function get(id){return registry.get(id)||null}
  function all(){return [...registry.values()]}
  register({id:'move',name:'+1 MOVE',kind:'consumable',cost:3,description:'Store one extra move. Use it whenever you need one more placement in the current round.'});
  register({id:'reroll',name:'REROLL',kind:'consumable',cost:3,description:'Store one full-hand reroll. It remains available until you choose to spend it.'});
  register({id:'undo',name:'UNDO',kind:'consumable',cost:4,description:'Store one undo. Revert the last placement, including score, draw, coins and RNG state.'});
  register({id:'double-double',name:'DOUBLE DOUBLE',kind:'tile-modification',description:'Choose one physical double in the Market. Its first activation each Move applies both halves; later passes use the normal double operation.'});
  return{register,get,all};
});
