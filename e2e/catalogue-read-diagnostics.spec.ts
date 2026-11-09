import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {Pool} from 'pg';

/** Destructive fault is exclusively inside the global setup's disposable DB.
 * Never use a hosted DATABASE_URL or silently skip a missing fixture. */
test('actual catalogue 503 retains its contract and safely correlates a missing relation without stale success',async({request})=>{
 const url=process.env.E2E_DATABASE_URL!;
 const parsed=new URL(url);
 expect(parsed.hostname).toBe('127.0.0.1');expect(parsed.pathname).toMatch(/^\/sb_e2e_\d+$/);
 const db=new Pool({connectionString:url});let hidden=false;
 const bump=()=>db.query("UPDATE cache_revisions SET revision=revision+1 WHERE scope IN ('catalogue','universities','evidence')");
 try{
  const warm=await request.get('/api/universities');expect(warm.status()).toBe(200);
  await db.query('ALTER TABLE universities RENAME TO fixture_hidden_universities');hidden=true;
  await bump();
  const failed=await request.get('/api/universities');
  expect(failed.status()).toBe(503);
  expect(await failed.json()).toEqual({error:'University data is temporarily unavailable. Please try again shortly.',code:'data_unavailable'});
  expect(failed.headers()['x-failure-class']).toBe('schema_unavailable');
  const id=failed.headers()['x-request-id'];expect(id).toMatch(/^[0-9a-f-]{36}$/);
  await expect.poll(()=>readFileSync('test-results/e2e-safe-failures.jsonl','utf8').split('\n').filter(Boolean).map(line=>JSON.parse(line)).find(row=>row.requestId===id)).toMatchObject({requestId:id,category:'schema_unavailable',dbCode:'42P01',where:'universities GET'});
 }finally{
  if(hidden){await db.query('ALTER TABLE fixture_hidden_universities RENAME TO universities');await bump();expect((await db.query("SELECT to_regclass('public.universities') AS table_name")).rows[0].table_name).toBe('universities');}
  await db.end();
 }
 const recovered=await request.get('/api/universities');expect(recovered.status()).toBe(200);expect(recovered.headers()['x-failure-class']).toBeUndefined();
});
