const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const directory=path.join(__dirname,'../experiments/audio-lab');
const html=fs.readFileSync(path.join(directory,'index.html'),'utf8');
const modules=[...new Set([...html.matchAll(/from ['"]\.\/(.+?\.js)['"]/g)].map(match=>match[1]))];
assert.ok(modules.includes('instrument.js'),'Audio Lab must load the instrument module');
for(const file of modules){
 const source=path.join(directory,file);
 assert.ok(fs.existsSync(source),'Missing Audio Lab module: '+file);
 const result=spawnSync(process.execPath,['--check','--input-type=module'],{input:fs.readFileSync(source,'utf8'),encoding:'utf8'});
 assert.equal(result.status,0,file+' must parse as an ES module:\n'+result.stderr);
}
const script=html.match(/<script type="module">([\s\S]*?)<\/script>/);
assert.ok(script,'Missing Audio Lab entry module');
const entry=spawnSync(process.execPath,['--check','--input-type=module'],{input:script[1],encoding:'utf8'});
assert.equal(entry.status,0,'Audio Lab entry module must parse:\n'+entry.stderr);
console.log('Audio Lab ES module syntax regression passed');
