// Static discovery inventory. This is NOT a runtime authorization/parity audit.
// Reads source files only; never dotenv, credentials, provider calls or databases.
import {readdirSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]).sort();}
const source=walk('src'),tests=[...walk('scripts'),...walk('e2e')].filter(p=>/\.(?:[cm]?[jt]sx?|sh)$/.test(p));
const testText=tests.map(path=>({path,text:readFileSync(path,'utf8')}));
const schema=readFileSync('src/db/schema.ts','utf8');
const tables=[...schema.matchAll(/export\s+const\s+(\w+)\s*=\s*pgTable\(\s*"([^"]+)"/g)].map(m=>({symbol:m[1],table:m[2]}));
const routes=source.filter(p=>p.startsWith('src/app/api/')&&p.endsWith('/route.ts')).map(path=>{
 const text=readFileSync(path,'utf8'),endpoint=path.replace('src/app','').replace('/route.ts','');
 const imports=[...text.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']@\/db\/schema["']/g)].flatMap(m=>m[1].split(',').map(x=>x.trim()).filter(Boolean));
 return {path,endpoint,methods:[...text.matchAll(/export (?:async )?function (GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g)].map(m=>m[1]),schemaImports:imports.map(symbol=>({symbol,table:tables.find(t=>t.symbol===symbol)?.table??null})),permissionCallCandidates:[...new Set([...text.matchAll(/\b(require\w*(?:Access|Session|Admin|Auth|Profile|Permission)|authorize\w*|withPrivate\w*)\s*\(/g)].map(m=>m[1]))],literalEndpointTestReferences:testText.filter(test=>test.text.includes(endpoint)).map(test=>test.path)};
});
const report={kind:'static_discovery_only',branch:'arena/5970dc95-scholarbridgeai',routes,pages:source.filter(p=>p.startsWith('src/app/')&&p.endsWith('/page.tsx')),tables,migrationFiles:walk('supabase').filter(p=>p.endsWith('.sql')),jobFiles:source.filter(p=>p.includes('/research-agent/')),navigationCandidates:source.filter(p=>/\.(?:ts|tsx)$/.test(p)&&/Dock|Sidebar|AppShell|AdminPanel|HomeClient/.test(p)),testFiles:tests,limitations:['No entry is marked authorized merely because a matching function name was found.','Indirect wrappers, raw SQL, dynamic endpoints and role-specific runtime behavior require separate tests.','No production connection, source merge, model request or deployment was performed.']};
mkdirSync('docs/master-followup',{recursive:true});writeFileSync('docs/master-followup/STATIC-INVENTORY.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({routes:routes.length,methods:routes.reduce((n,r)=>n+r.methods.length,0),pages:report.pages.length,tables:tables.length,migrations:report.migrationFiles.length,testFiles:tests.length}));
