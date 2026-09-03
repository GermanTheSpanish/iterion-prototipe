(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.IterionData=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  return Object.freeze({
    VERSION:'0.13.0',
    ENGINE_VERSION:'0.10.3-accumulator',
    TARGETS:[20,100,500,2500,10000],
    MAX_PLACEMENTS:7,
    HAND_SIZE:5,
    TOTAL_ROUNDS:5,
    DRAG_Y_OFFSET:66,
    SHAKE_THRESHOLD:10,
    SHAKE_SWITCHES:2,
    SHAKE_WINDOW_MS:460,
    SHAKE_COOLDOWN_MS:420,
    OUTCOME_SCREEN_DELAY_MS:1100,
    STARTING_COINS:5,
    MARKET_AFTER_PLACEMENT:3
  });
});
