const assert=require('assert');
const fs=require('fs');
const path=require('path');

const data=fs.readFileSync(path.join(__dirname,'..','data.js'),'utf8');
const game=fs.readFileSync(path.join(__dirname,'..','game.js'),'utf8');
const ui=fs.readFileSync(path.join(__dirname,'..','ui.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');

assert.match(data,/VERSION:'0\.20\.0'/,'build must identify as v0.20.0');
assert.doesNotMatch(ui,/EXACT DOMINO/,'Exact Domino must be removed from the Market UI');
assert.doesNotMatch(ui,/exactGridHtml|exactTile|buyMarketExactTile|marketExactPrice/,'Exact Domino UI handlers must be removed');
assert.doesNotMatch(game,/buyMarketExactTile|marketExactPrice|MARKET_EXACT_TILE_COST/,'Exact Domino gameplay API must be removed');

assert.match(ui,/Randomly upgrades one physical double you own\./,'Double Double must explain random selection');
assert.match(ui,/id="doubleDoubleBuy"/,'Market must expose one Double Double roll button');
assert.match(ui,/ROLL DOUBLE DOUBLE/,'Double Double action must be presented as a random roll');
assert.doesNotMatch(ui,/data-dd-id|doubleDoubleChoice|doubleDoubleGridHtml/,'player must no longer choose a specific Double Double target');
assert.match(ui,/GAME\.buyDoubleDouble\(\)/,'UI must invoke random Double Double purchase without a tile id');
assert.match(ui,/DOUBLE DOUBLE → \[\$\{r\.tile\.a\}\|\$\{r\.tile\.b\}\]/,'random result must be revealed after purchase');
assert.match(ui,/SUPPLY \$\{supply\} · \$\{nextMarket\}/,'Market supply warning must remain');

assert.match(game,/openingProtectionActive/,'opening anti-brick protection must live in game state logic');
assert.match(game,/type:'opening-protection'/,'opening protection must be recorded in telemetry');
assert.match(game,/source:'reroll'|ensureOpeningContinuation\('reroll'\)/,'opening reroll must use the same protection');

console.log('v0.20 UI regression tests passed');
