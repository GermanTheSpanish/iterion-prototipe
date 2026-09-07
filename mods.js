(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.IterionMods=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const registry=new Map();
  function register(mod){if(!mod?.id)throw new Error('Mod requires id');const displayName=mod.displayName||mod.name||mod.id,shortDescription=mod.shortDescription||mod.description||'',rulesDescription=mod.rulesDescription||mod.description||shortDescription;const normalized={...mod,displayName,shortDescription,rulesDescription,name:mod.name||displayName,description:mod.description||shortDescription};registry.set(mod.id,Object.freeze(normalized));return normalized}
  function get(id){return registry.get(id)||null}
  function all(){return [...registry.values()]}
  register({id:'move',displayName:'+1 MOVE',name:'+1 MOVE',kind:'consumable',cost:3,shortDescription:'Store one extra move.',rulesDescription:'Store one extra move. Spend it whenever you need one additional placement in the current round.',description:'Store one extra move. Use it whenever you need one more placement in the current round.'});
  register({id:'reroll',displayName:'REROLL',name:'REROLL',kind:'consumable',cost:3,shortDescription:'Store one full-hand reroll.',rulesDescription:'Store one full-hand reroll. It remains available until you choose to spend it, replacing the current hand with a new draw.',description:'Store one full-hand reroll. It remains available until you choose to spend it.'});
  register({id:'undo',displayName:'UNDO',name:'UNDO',kind:'consumable',cost:4,shortDescription:'Store one undo.',rulesDescription:'Store one undo. Revert the last placement and its gameplay result. Shop purchases made after that placement remain spent and remain owned.',description:'Store one undo. Revert the last placement; emergency Shop purchases made afterwards are not refunded.'});
  register({id:'double-double',displayName:'DOUBLE DOUBLE',name:'DOUBLE DOUBLE',kind:'tile-modification',shortDescription:'One physical double gets an amplified first activation each Move.',rulesDescription:'Applies only to the randomly selected physical double. Its first activation each Move applies both halves; later passes in the same Move use the normal double operation.',description:'A random physical double is selected in the Market. Its first activation each Move applies both halves; later passes use the normal double operation.'});
  return{register,get,all};
});
