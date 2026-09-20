const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const Mods=require('../mods.js');

const slots=Mods.collection(),assigned=slots.filter(slot=>slot.mod);
assert.equal(slots.length,28,'double-six collection must contain 28 canonical dominoes');
assert.equal(new Set(slots.map(slot=>slot.key)).size,28,'every collection domino must be unique');
assert.deepEqual(slots.map(({a,b})=>[a,b]),slots.map(({a,b})=>[a,b]).sort((x,y)=>x[0]-y[0]||x[1]-y[1]),'collection order must be deterministic');
assert.equal(assigned.length,14,'all ten currently available Mods must be represented');
assert.equal(new Set(assigned.map(slot=>slot.mod.id)).size,14,'one Mod must occupy exactly one collection domino');
assert.equal(new Set(assigned.map(slot=>slot.mod.collectionCode)).size,14,'revealed collection codes must be unique');
for(const slot of assigned)assert.equal(slot.mod.collectionDefaultUnlocked,true,`${slot.mod.id} is currently available and cannot appear locked`);
assert.equal(slots.find(slot=>slot.key==='0|0').mod.id,'zero-port');
assert.equal(slots.find(slot=>slot.key==='0|3').mod.id,'pair');
assert.equal(slots.find(slot=>slot.key==='1|6').mod.id,'twin');
assert.equal(slots.find(slot=>slot.key==='2|4').mod.id,'sequence');
assert.equal(slots.find(slot=>slot.key==='2|5').mod.id,'complement');
assert.equal(slots.find(slot=>slot.key==='3|3').mod.id,'triple-double');
assert.equal(slots.find(slot=>slot.key==='4|4').mod.id,'overload');
assert.equal(slots.find(slot=>slot.key==='6|6').mod.id,'long-run');

const source=fs.readFileSync(path.join(__dirname,'..','mod-collection.js'),'utf8');
assert.match(source,/STORAGE_KEY='monoid\.modCollection\.v1'/,'future discoveries need durable meta progression');
assert.match(source,/grid-template-columns:repeat\(4/);assert.match(source,/grid-template-rows:repeat\(7/,'the gallery must remain a 4 × 7 double-six archive');
assert.match(source,/modCollectionSelectionButton/);assert.match(source,/modCollectionMenuButton/,'both requested entry points must use the same gallery');
assert.match(source,/This domino will turn over when its Mod is discovered/);
assert.match(source,/monoid:mod-unlocked/,'future unlocks must expose one deterministic integration event');
assert.doesNotMatch(source,/IterionEngine|finishPlacement|buyMarketMod\s*=/,'collection UI must not redefine gameplay');
console.log('MONOID 28-domino Mod Collection regressions passed');
