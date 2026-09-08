const fs=require('fs');
const path=require('path');

const dataPath=path.join(__dirname,'..','data.js');
let data=fs.readFileSync(dataPath,'utf8');
const oldVersion="VERSION:'0.22.1'";
const newVersion="VERSION:'0.23.0'";
if(!data.includes(oldVersion))throw new Error('Expected pre-release VERSION 0.22.1 exactly before release bump');
data=data.replace(oldVersion,newVersion);
if(data.includes(oldVersion))throw new Error('Unexpected duplicate pre-release VERSION declaration');
fs.writeFileSync(dataPath,data);

const testsDir=path.join(__dirname,'..','tests');
let changed=0;
for(const name of fs.readdirSync(testsDir).filter(n=>n.endsWith('.test.js'))){
  const file=path.join(testsDir,name);
  let source=fs.readFileSync(file,'utf8'),next=source;
  next=next.replaceAll("D.VERSION,'0.22.1'","D.VERSION,'0.23.0'");
  next=next.replaceAll("Data.VERSION,'0.22.1'","Data.VERSION,'0.23.0'");
  next=next.replaceAll("VERSION:'0\\.22\\.1'","VERSION:'0\\.23\\.0'");
  if(next!==source){fs.writeFileSync(file,next);changed++}
}
if(changed<5)throw new Error(`Expected multiple retained version assertions to update; changed ${changed}`);

console.log(`Release bump prepared: data.js -> 0.23.0; updated version assertions in ${changed} test files`);
fs.unlinkSync(__filename);
