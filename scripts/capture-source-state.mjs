// Immutable evidence index, not a release/CI/production attestation.
// Records hashes and paths only; never reads .env files or Git credentials.
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {existsSync,lstatSync,mkdirSync,readFileSync,readlinkSync,writeFileSync} from "node:fs";
import {dirname,resolve,relative,sep} from "node:path";
const root=process.cwd(),argument=process.argv[2];
if(!argument)throw new Error("Usage: node scripts/capture-source-state.mjs test-results/<new-index>.json");
const target=resolve(root,argument),targetRelative=relative(root,target);
if(targetRelative.startsWith(`..${sep}`)||targetRelative===".."||targetRelative.startsWith(sep))throw new Error("Output must remain in the workspace");
const hash=value=>createHash("sha256").update(value).digest("hex");
const git=(...args)=>execFileSync("git",args,{cwd:root,encoding:"utf8"}).trim();
const candidates=[...new Set(execFileSync("git",["ls-files","--cached","--others","--exclude-standard","-z"],{cwd:root,encoding:"utf8"}).split("\0").filter(Boolean))].sort();
const entries={runtime:[],verification:[],migrations:[]};
for(const path of candidates){
 if(path.split("/").some(part=>part.startsWith(".env")||part===".git"))continue;
 const category=path.startsWith("supabase/")?"migrations":/^(e2e|scripts|ci|\.github)\//.test(path)?"verification":/^(src|public|data)\//.test(path)||(!path.includes("/")&&/\.(?:[cm]?[jt]s|json|lock)$/.test(path))?"runtime":null;
 if(!category||!existsSync(path))continue;
 const stat=lstatSync(path);if(!stat.isFile()&&!stat.isSymbolicLink())continue;
 const content=stat.isSymbolicLink()?Buffer.from(readlinkSync(path)):readFileSync(path);
 entries[category].push({path,sha256:hash(content),bytes:content.length,symlink:stat.isSymbolicLink()});
}
const sets=Object.fromEntries(Object.entries(entries).map(([name,files])=>[name,{sha256:hash(JSON.stringify(files)),files:files.length,bytes:files.reduce((sum,file)=>sum+file.bytes,0),entries:files}]));
const next=JSON.parse(readFileSync("node_modules/next/package.json","utf8")),react=JSON.parse(readFileSync("node_modules/react/package.json","utf8"));
const snapshot={capturedAt:new Date().toISOString(),branch:git("branch","--show-current"),head:git("rev-parse","HEAD"),dirty:git("status","--porcelain=v1").length>0,node:process.version,next:next.version,react:react.version,buildId:existsSync(".next/BUILD_ID")?readFileSync(".next/BUILD_ID","utf8").trim():null,sets,limitations:["Source hashes do not attest which scripts a previous build typechecked.","Build ID is the currently available local production build; no CI/deploy assertion.","No credentials, environment values or file bodies are included."]};
mkdirSync(dirname(target),{recursive:true});writeFileSync(target,JSON.stringify(snapshot,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({path:targetRelative,branch:snapshot.branch,head:snapshot.head,buildId:snapshot.buildId,runtimeHash:sets.runtime.sha256,verificationHash:sets.verification.sha256,migrationHash:sets.migrations.sha256}));
