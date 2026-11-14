import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {spawnSync,execFileSync} from 'node:child_process';
import {join} from 'node:path';
mkdirSync('.cache',{recursive:true});
const dir=mkdtempSync(join(process.cwd(),'.cache/verify-summary-'));let pass=0,fail=0;
try{
 const bin=join(dir,'bin');mkdirSync(bin);
 writeFileSync(join(bin,'npm'),'#!/bin/bash\nprintf "MISSING fixture_only_table\\n"\nexit "$FIXTURE_EXIT"\n',{mode:0o700});
 for(const path of ['.github/workflows/supabase-verify.yml','ci/supabase-verify.yml']){
  const source=process.argv.includes('--baseline')?execFileSync('git',['show',`HEAD:${path}`],{encoding:'utf8'}):readFileSync(path,'utf8');
  const start=source.indexOf('          set +e\n');const end=source.indexOf('          exit "$code"',start);
  assert(start>=0&&end>start,'actual verification script must be present');
  const script=source.slice(start,end+'          exit "$code"'.length).replace(/^          /gm,'').replaceAll('/tmp/verify.log',join(dir,'fixture-verify.log'));
  for(const code of [0,2]){
   const summary=join(dir,`summary-${pass+fail}`);
   const result=spawnSync('bash',['-c',script],{encoding:'utf8',env:{...process.env,PATH:`${bin}:${process.env.PATH}`,FIXTURE_EXIT:String(code),GITHUB_STEP_SUMMARY:summary}});
   try{
    assert.equal(result.status,code,'original verifier exit must survive summary rendering');
    assert.match(readFileSync(summary,'utf8'),new RegExp(`## Supabase live schema verify — exit ${code}\\n`));
    assert.doesNotMatch(result.stderr,/command not found/);
    if(code===2)assert.match(result.stdout,/::error title=Supabase live verify failed::exit 2/);
    console.log(`PASS ${path}: verifier=${code}, summary safe, original exit preserved`);pass++;
   }catch(e){console.error(`FAIL ${path} code ${code}: ${e.message}`);fail++;}
  }
 }
 writeFileSync(join(bin,'npm'),'#!/bin/bash\nprintf "%s\\n" "$FIXTURE_OUTPUT"\nexit "$FIXTURE_EXIT"\n',{mode:0o700});
 for(const [output,code,expected] of [['fixture: PASS',0,0],['fixture: FAIL (2 failed)',0,1],['FAIL fixture assertion',0,1],['fixture: PASS',2,1]]){
  const result=spawnSync(process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/run-master-validation.ts','fixture:validation-status'],{encoding:'utf8',env:{...process.env,PATH:`${bin}:${process.env.PATH}`,FIXTURE_OUTPUT:output,FIXTURE_EXIT:String(code)}});
  try{assert.equal(result.status,expected,`reported failure or child exit must survive the real runner: ${output}`);console.log(`PASS runner negative control: child=${code}, reported=${output}, runner=${expected}`);pass++;}
  catch(e){console.error(`FAIL runner negative control: ${e.message}`);fail++;}
 }
}finally{rmSync(dir,{recursive:true,force:true});}
console.log(`VERIFY_SUMMARY: ${pass} passed, ${fail} failed`);if(fail)process.exitCode=1;
