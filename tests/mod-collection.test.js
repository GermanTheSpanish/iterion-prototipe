const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const Mods=require('../mods.js');

const slots=Mods.collection(),assigned=slots.filter(slot=>slot.mod),empty=slots.filter(slot=>!slot.mod);
assert.equal(slots.length,28,'double-six collection remains a 28-domino physical archive');
assert.equal(new Set(slots.map(slot=>slot.key)).size,28,'every collection domino must be unique');
assert.deepEqual(slots.map(({a,b})=>[a,b]),slots.map(({a,b})=>[a,b]).sort((x,y)=>x[0]-y[0]||x[1]-y[1]),'collection order must be deterministic');
assert.equal(assigned.length,23,'five network terminals occupy collection dominoes');
assert.equal(empty.length,5,'retired roster slots remain empty rather than pretending to be locked Mods');
assert.equal(new Set(assigned.map(slot=>slot.mod.id)).size,20);assert.equal(new Set(assigned.map(slot=>slot.mod.collectionCode)).size,23);
for(const slot of assigned)assert.equal(slot.mod.collectionDefaultUnlocked,true,slot.mod.id+' remains available until unlock progression lands');

const current={'0|0':'zero-port','0|1':'zero-port','1|3':'quantum-port','2|4':'quantum-port','2|5':'quantum-port','0|2':'foundation','0|3':'pair','0|4':'bridge','0|5':'pivot','0|6':'long-line','1|1':'double-echo','1|2':'parity-exchange','1|4':'broker','1|5':'knot','1|6':'recall','2|2':'double-double','2|3':'corner','3|3':'triple-double','4|4':'overload','4|5':'hinge','4|6':'bank','5|6':'mint','6|6':'long-run'};
for(const [key,id] of Object.entries(current))assert.equal(slots.find(slot=>slot.key===key).mod.id,id,key);
for(const key of ['2|6','3|4','3|5','3|6','5|5'])assert.equal(slots.find(slot=>slot.key===key).mod,null,key+' must be empty');

const source=fs.readFileSync(path.join(__dirname,'..','mod-collection.js'),'utf8');
assert.match(source,/STORAGE_KEY='monoid\.modCollection\.v1'/);assert.match(source,/grid-template-columns:repeat\(4/);assert.match(source,/grid-template-rows:repeat\(7/);
assert.match(source,/isEmpty/,'empty archive slots must be distinct from future locked Mods');assert.match(source,/No Mod is assigned to this domino/);
assert.match(source,/monoid:mod-unlocked/,'future unlocks retain one deterministic integration event');
assert.doesNotMatch(source,/IterionEngine|finishPlacement|buyMarketMod\s*=/,'collection UI must not redefine gameplay');
console.log('MONOID 20-Mod / 28-domino Collection regressions passed');
