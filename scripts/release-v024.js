const fs=require('fs');
const path=require('path');

function replaceOnce(file,from,to){
  const src=fs.readFileSync(file,'utf8');
  const first=src.indexOf(from);
  if(first<0)throw new Error(`Missing expected version text in ${file}`);
  if(src.indexOf(from,first+from.length)>=0)throw new Error(`Expected one version declaration in ${file}`);
  fs.writeFileSync(file,src.slice(0,first)+to+src.slice(first+from.length));
}

replaceOnce('data.js',"VERSION:'0.23.0'","VERSION:'0.24.0'");

let replacements=0;
for(const name of fs.readdirSync('tests')){
  if(!name.endsWith('.test.js'))continue;
  const file=path.join('tests',name);
  const src=fs.readFileSync(file,'utf8');
  const count=(src.match(/0\.23\.0/g)||[]).length;
  if(!count)continue;
  fs.writeFileSync(file,src.replaceAll('0.23.0','0.24.0'));
  replacements+=count;
}
if(replacements<1)throw new Error('Expected at least one current-version test assertion to update');

const endlessTest='tests/v024-endless.test.js';
let endless=fs.readFileSync(endlessTest,'utf8');
if(!endless.includes("assert.strictEqual(D.VERSION,'0.24.0')")){
  endless=endless.replace("assert.strictEqual(D.ENDLESS_TARGET_MULTIPLIER,5);","assert.strictEqual(D.VERSION,'0.24.0');\nassert.strictEqual(D.ENDLESS_TARGET_MULTIPLIER,5);");
  fs.writeFileSync(endlessTest,endless);
}

fs.unlinkSync(__filename);
console.log(`Prepared ITERION v0.24.0; updated ${replacements} existing version references`);
