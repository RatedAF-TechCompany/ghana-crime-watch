// Upload build/modules as a NEW VERSION of ghanacrimes with a preview alias. Does NOT deploy / shift traffic.
// Bindings are inherited (strict) from the latest uploaded version; assets kept. Token never printed.
import fs from 'fs'; import path from 'path';
import {cf,ACCT} from '/workspace/gc-sources-box-patch/scripts/cf.mjs';
const dir='build/modules';
const base=JSON.parse(fs.readFileSync('/workspace/gc-sources-box-patch/backup/c871c19a/version-meta.json','utf8'));
const alias=process.argv[2]||'junk500-fix';
const names=base.bindings.map(b=>b.name);
const meta={
  main_module:'worker-entry.js',
  compatibility_date:base.compatibility_date,
  compatibility_flags:base.compatibility_flags,
  usage_model:base.usage_model,
  bindings:names.map(n=>({type:'inherit',name:n})),
  keep_assets:true,
  assets:{config:base.assets.config},
  annotations:{'workers/tag':process.env.GC_TAG||'junk500-fix-20261116','workers/alias':alias,
    'workers/message':process.env.GC_MSG||'PREVIEW. c871c19a + edge 404/400 for junk Next-Action POSTs and malformed router-state RSC requests (were 500s). Rollback: c871c19a-3cb5-4188-a90f-04de9da6138d'}
};
const types={'.js':'application/javascript+module','.wasm':'application/wasm','.bin':'application/octet-stream'};
const fd=new FormData();
fd.append('metadata',new Blob([JSON.stringify(meta)],{type:'application/json'}));
for(const f of fs.readdirSync(dir)){
  const name=f==='worker-entry.js'?f:'./'+f;
  fd.append(name,new Blob([fs.readFileSync(path.join(dir,f))],{type:types[path.extname(f)]}),name);
}
const r=await cf(`/accounts/${ACCT}/workers/scripts/ghanacrimes/versions?bindings_inherit=strict`,{method:'POST',body:fd});
const j=await r.json();
if(!j.success){console.error('HTTP',r.status,JSON.stringify(j.errors),JSON.stringify(j.messages||''));process.exit(1);}
const res=j.result; console.log('version',res.id,'number',res.number,'hasPreview',res.metadata?.hasPreview);
fs.writeFileSync('upload-result.json',JSON.stringify({id:res.id,number:res.number,metadata:res.metadata,bindings:(res.resources?.bindings||[]).map(b=>({name:b.name,type:b.type}))},null,1));
