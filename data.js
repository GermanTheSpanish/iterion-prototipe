(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.IterionData=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  return Object.freeze({
    VERSION:'0.16.1',
    ENGINE_VERSION:'0.11.1-longest-route',
    TARGETS:[
      20,100,500,2500,10000,
      50000,250000,1000000,5000000,25000000,
      100000000,500000000,2500000000,10000000000,50000000000
    ],
    BOARD_SIZES:[[18,24],[24,32],[30,40]],
    MAX_PLACEMENTS:7,
    HAND_SIZE:5,
    TOTAL_ROUNDS:15,
    STAGE_SIZE:5,
    DRAG_Y_OFFSET:72,
    SHAKE_THRESHOLD:10,
    SHAKE_SWITCHES:2,
    SHAKE_WINDOW_MS:460,
    SHAKE_COOLDOWN_MS:420,
    OUTCOME_SCREEN_DELAY_MS:550,
    REROLL_BLACK_MS:500,
    HAND_REVEAL_STAGGER_MS:75,
    DRAW_BLACK_MS:180,
    STARTING_COINS:0,
    MINI_SHOP_CHANCE:0.5,
    MINI_SHOP_OFFERS:2,
    BIG_SHOP_RANDOM_TILE_COST:1,
    BIG_SHOP_EXACT_TILE_COST:10,
    BIG_SHOP_RANDOM_STOCK:3,
    OVERKILL_TIERS:[3,5,10],
    UPGRADE_TRIGGER_BONUS:2,
    COIN_ENGINE_BONUS:1,
    FIRST_TILE_MUST_BE_DOUBLE:true,
    PERSIST_MACHINE_BETWEEN_ROUNDS:true
  });
});