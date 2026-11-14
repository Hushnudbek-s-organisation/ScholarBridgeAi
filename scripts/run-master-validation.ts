import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { isolatedServiceEnvironment } from "../e2e/isolated-env";
const env = isolatedServiceEnvironment(process.env, process.cwd());
Object.assign(env, { DATABASE_URL: "postgresql://blocked:blocked@127.0.0.1:1/master_offline", SESSION_SECRET: "master-audit-disposable-only-session-secret", NEXT_TELEMETRY_DISABLED: "1" });
const out = "test-results/master-2026-11-07"; mkdirSync(out,{recursive:true});
const names=process.argv.slice(2);let failed=false;const results=[];
for(const name of names){const r=spawnSync("npm",["run",name],{env,timeout:600000,maxBuffer:24*1024*1024,encoding:"utf8"});writeFileSync(`${out}/${name.replaceAll(":","-")}.log`,`${r.stdout??""}\n${r.stderr??""}${r.error?String(r.error):""}`);const reportedFailure=/^\s*[✗❌]|^\s*(?:FATAL:|FAIL\b)|^[\w-]+:\s*FAIL\b/m.test(`${r.stdout??""}\n${r.stderr??""}`);const ok=r.status===0&&!r.error&&!reportedFailure;results.push({name,ok,exit:r.status});console.log(`${ok?"PASS":"FAIL"} ${name}`);if(!ok){failed=true;console.log((r.stderr||r.stdout||String(r.error)).slice(-2000));}}
writeFileSync(`${out}/last-run.json`,JSON.stringify(results,null,2)+"\n");process.exitCode=failed?1:0;
