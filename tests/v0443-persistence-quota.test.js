const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const D=require('../data.js'),E=require('../engine.js'),Game=require('../game.js');

assert.equal(D.VERSION,'0.45.1');

const g=Game.createGame(E,{seed:44301,STARTING_UNDO_CONSUMABLES:1});
const s=g.state();
const opening=s.hand.findIndex(t=>t&&t.a===t.b);
assert(opening>=0,'fixture must expose the opening double');
const candidate=g.candidatesForIndex(opening)[0];
assert(candidate,'opening double must have a legal root placement');
const ctx=g.beginPlacement(opening,candidate);
assert(ctx.ok);
g.finishPlacement(ctx);
assert(g.canUndo(),'real placement must retain an Undo frame');

const hugeTrace=Array.from({length:8000},(_,i)=>({
  type:i%3===0?'op':'move',
  piece:(i%17)+1,
  before:i*987654321,
  after:(i+1)*987654321,
  factor:(i%6)+1,
  reverse:i%2===0,
  payload:'signal-resolution-persistence-regression'
}));
s.events.push({
  type:'signal-resolution',
  round:s.round+1,
  move:s.turn,
  baseOutput:s.score,
  splitCount:3,
  selectionOutput:s.score,
  events:hugeTrace
});

const liveSignal=s.events.findLast(e=>e.type==='signal-resolution');
assert.equal(liveSignal.events.length,8000,'live session keeps the full signal trace for current debug/animation evidence');

const saved=g.exportState();
const persistedSignal=saved.state.events.findLast(e=>e.type==='signal-resolution');
assert(persistedSignal,'signal-resolution marker survives persistence');
assert.equal(persistedSignal.events,undefined,'nested signal trace is omitted from the active-run save');
assert.equal(persistedSignal.traceCompacted,true);
assert(saved.state.undoFrame,'Undo state survives persistence');
assert.deepEqual(saved.state.undoFrame.events,[],'Undo save does not duplicate historical debug events');
assert(Number.isInteger(saved.state.undoFrame.persistenceEventCursor));
assert(JSON.stringify(saved).length<JSON.stringify(g.state()).length/4,'persisted state must be dramatically smaller than the live diagnostic state');

const restored=Game.createGame(E,{seed:9,STARTING_UNDO_CONSUMABLES:1});
assert(restored.restoreState(saved));
assert.match(restored.debugText(),/SIGNAL TREE .*trace=COMPACTED_AFTER_RESTORE/,'restored debug explicitly identifies compacted historical signal traces');
const beforeUndoPieces=restored.state().pieces.length;
const undo=restored.useUndo();
assert(undo.ok,'Undo must remain usable after restoring the compact persistence format');
assert.equal(restored.state().pieces.length,beforeUndoPieces-1,'restored Undo still removes the last physical placement');

const storage=new Map();
global.localStorage={
  getItem:key=>storage.has(key)?storage.get(key):null,
  setItem:(key,value)=>storage.set(key,String(value)),
  removeItem:key=>storage.delete(key)
};
try{
  g.save();
  const legacy=JSON.parse(storage.get('iterion.latestRun.v9'));
  const legacySignal=legacy.turns.findLast(e=>e.type==='signal-resolution');
  assert(legacySignal&&legacySignal.traceCompacted);
  assert.equal(legacySignal.events,undefined,'legacy debug snapshot also avoids the quota-heavy nested trace');
  assert.equal(liveSignal.events.length,8000,'saving never mutates the in-memory diagnostic trace');
}finally{
  delete global.localStorage
}

const ui=fs.readFileSync(path.join(__dirname,'..','ui.js'),'utf8');
assert.match(ui,/ACTIVE_RUN_KEY='iterion\.activeRun\.v1'/);
assert.match(ui,/LEGACY_RUN_KEY='iterion\.latestRun\.v9'/);
assert.match(ui,/localStorage\.removeItem\(LEGACY_RUN_KEY\)/,'active save frees the obsolete duplicate snapshot before writing');
assert.doesNotMatch(ui,/const snap=GAME\.save\(\)/,'UI persistence must not write a second full run snapshot on every checkpoint');
assert.match(ui,/SAVE FAILED · DOWNLOAD RUN DATA/,'quota/write failure must be visible instead of silently losing progress');

console.log('v0.45.1 quota-safe active-run persistence and restored Undo regressions passed');
