import assert from "node:assert/strict";
import {fork,type ChildProcess} from "node:child_process";
import type {Client} from "pg";
import {readFileSync} from "node:fs";
function next(child:ChildProcess){return new Promise<Record<string,unknown>>((resolve,reject)=>{const cleanup=()=>{clearTimeout(timer);child.off("message",receive);child.off("error",error);};const receive=(value:Record<string,unknown>)=>{cleanup();resolve(value);};const error=(value:Error)=>{cleanup();reject(value);};const timer=setTimeout(()=>{cleanup();reject(new Error("Revision child timed out"));},20000);child.once("message",receive);child.once("error",error);});}
async function call(child:ChildProcess,kind:string){const result=next(child);child.send({kind});return result;}
export async function proveCacheRevisionRaces(client:Client){
 await client.query("ALTER TABLE user_documents ADD COLUMN profile_id integer;INSERT INTO student_profiles VALUES(8);CREATE TABLE applications(id integer PRIMARY KEY,profile_id integer);CREATE TABLE student_activities(id integer PRIMARY KEY,profile_id integer);CREATE TABLE activity_evidence(id integer PRIMARY KEY,activity_id integer)");
 await client.query(readFileSync("supabase/atomic_cache_revisions_2026-11-07.sql","utf8"));
 await client.query("INSERT INTO user_documents VALUES(1,7)");
 const child=fork("scripts/fixtures/revision-cache-child.ts",[],{execArgv:["--import","tsx"],env:{PATH:process.env.PATH,DATABASE_URL:process.env.DATABASE_URL,NODE_ENV:"test"},stdio:["ignore","ignore","inherit","ipc"]});
 try{
  assert.equal((await next(child)).ready,true);
  const warm=await call(child,"get");assert.equal(warm.value,1);
  assert.deepEqual(await call(child,"get"),warm,"actual second-process cache hit before mutation");
  await client.query("INSERT INTO user_documents VALUES(2,7)");
  assert.equal((await call(child,"get")).value,2,"B reloads after A's committed document insert");
  await call(child,"clear");assert.equal((await call(child,"pending")).pending,true);
  await client.query("INSERT INTO user_documents VALUES(3,7)");
  const resumed=await call(child,"resume");assert.equal(resumed.value,3,"old pending result is discarded, bounded retry sees commit");
  const before=(await client.query("SELECT revision FROM cache_revisions WHERE scope='profile:7'")).rows[0].revision;
  await client.query("BEGIN;INSERT INTO user_documents VALUES(4,7);ROLLBACK");
  assert.equal((await client.query("SELECT revision FROM cache_revisions WHERE scope='profile:7'")).rows[0].revision,before);
  assert.deepEqual(await call(child,"get"),resumed,"rollback does not flush a still-valid snapshot");
  await client.query("UPDATE user_documents SET profile_id=8 WHERE id=3");
  assert.equal((await call(child,"get")).value,2,"owner reassignment invalidates the former owner too");
  assert.ok(Number((await client.query("SELECT revision FROM cache_revisions WHERE scope='profile:8'")).rows[0].revision)>1);
  const beforeChild=(await client.query("SELECT revision FROM cache_revisions WHERE scope='profile:7'")).rows[0].revision;
  await client.query("INSERT INTO student_activities VALUES(1,7);INSERT INTO activity_evidence VALUES(1,1)");
  assert.ok(Number((await client.query("SELECT revision FROM cache_revisions WHERE scope='profile:7'")).rows[0].revision)>Number(beforeChild),"child activity evidence resolves parent ownership");
  await client.query("DELETE FROM user_documents WHERE profile_id=7");assert.equal((await call(child,"get")).value,0);
  const catBefore=Number((await client.query("SELECT revision FROM cache_revisions WHERE scope='catalogue'")).rows[0]?.revision??1);
  await client.query("UPDATE catalogue_facts SET notes='fixture revision assertion' WHERE entity_type='program' AND entity_id=211");
  assert.ok(Number((await client.query("SELECT revision FROM cache_revisions WHERE scope='catalogue'")).rows[0].revision)>catBefore);
  console.log("PASS C10: real A SQL -> B process warm/in-flight/delete/owner-change; rollback preserves cache; child evidence and fact mutation share atomic revision.");
 }finally{child.kill("SIGTERM");}
}
