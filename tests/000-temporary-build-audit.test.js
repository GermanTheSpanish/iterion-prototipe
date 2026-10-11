// Temporary read-only diagnostic. Delete before merging.
const fs=require('node:fs'),path=require('node:path');
const dir=__dirname,names=fs.readdirSync(dir).filter(name=>name.endsWith('.test.js'));
const legacy=names.map(name=>({name,text:fs.readFileSync(path.join(dir,name),'utf8')}))
  .filter(x=>x.text.includes('20261010.3')||x.text.includes('20261010\\.3')||x.text.includes('0.75.0')||x.text.includes('0\\.75\\.0'))
  .map(x=>x.name);
console.log('OBSOLETE_BUILD_TESTS='+JSON.stringify(legacy));
