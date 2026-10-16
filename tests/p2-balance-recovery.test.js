const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const E=require('../engine.js'),Game=require('../game.js'),Score=require('../score.js');

const g=Game.createGame(E,{seed:2085700609});
const s=g.state();
s.round=47;s.endlessMode=true;s.standardComplete=true;s.roundTurn=7;s.blocked=true;
s.failureReason='placement-limit';s.running=false;s.cleared=false;
s.systemStrain=48;s.inflation=12;s.coins=60;s.consumables.move=0;
const recovery=g.recoveryOptions();
assert.equal(recovery.prices.move,63,'R48: 3 base + 12 inflation + 48 Strain');
assert.equal(recovery.toolMove,false,'60 coins cannot buy a 63-coin Move');
assert.equal(recovery.recoverable,false,'R48 with no stored Move/Undo ends the run');
assert.equal(g.canBuyTool('move'),true,'purchase is context-legal but unaffordable');

const exampleTarget='9007199254740993';
const win=(round,target,output,placements,overflowSkipped=false)=>({
  round,target:Number(target),targetExact:target,output:Number(output),outputExact:output,
  placements,machineSize:10,setSize:28,setGeneration:1,reward:3,upgradeCoins:0,
  anchor:{a:2,b:2},upgradeTier:1,overflowSkipped
});
s.wins.push(win(1,'20','200',1),win(2,exampleTarget,Score.multiply(exampleTarget,'1000'),1),
  win(3,exampleTarget,Score.multiply(exampleTarget,'1000000'),2),
  win(4,exampleTarget,Score.multiply(exampleTarget,'999999'),0,true));
const debug=g.debugText();
assert.match(debug,/RECOVERY MOVE QUOTE: base=3 inflation=12 strain=48 total=63 coins=60 short=3 affordable=no/);
assert.match(debug,/BALANCE: playedClears=3 oneMove=2 overkill10x=3 overkill1000x=2 overkill1000000x=1/);
assert.match(debug,/Recovery: recoverable=no/);
assert.match(debug,/Run ID:/,'normal reconstruction fields must survive');

s.coins=63;
assert.equal(g.recoveryOptions().toolMove,true,'one affordable Move becomes available');
assert.equal(g.recoveryOptions().recoverable,true,'recovery does not lock purchased Moves');
assert.equal(g.toolPrice('move'),63);
assert.match(g.debugText(),/RECOVERY MOVE QUOTE: base=3 inflation=12 strain=48 total=63 coins=63 short=0 affordable=yes/);

const ui=fs.readFileSync(path.join(__dirname,'..','ui.js'),'utf8');
assert.match(ui,/const moveShortfall=limit&&!stalled/);
assert.match(ui,/The next Move costs/);
assert.match(ui,/Remaining Hand tiles do not grant additional Moves/);
assert.match(ui,/moveBreakdown\|\|'You used every move/);
console.log('P2 placement-limit economics and exact balance diagnostics passed');
