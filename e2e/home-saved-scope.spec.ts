import {test,expect} from "@playwright/test";
import {readFileSync} from "node:fs";
import {Client} from "pg";
import en from "../src/i18n/messages/en.json";
const f=JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!,"utf8"));
async function cleanupCreatedSaved(id:number|null){
 if(id==null)return;
 const url=new URL(process.env.E2E_DATABASE_URL!);expect(url.hostname).toBe("127.0.0.1");expect(url.pathname).toMatch(/^\/sb_e2e_\d+$/);
 const db=new Client({connectionString:url.toString()});await db.connect();
 try{await db.query("DELETE FROM saved_universities WHERE id=$1 AND profile_id=$2",[id,f.studentId]);}finally{await db.end();}
}
async function ensureSaved(page:import("@playwright/test").Page){
 expect((await page.request.post("/api/auth/sign-in",{data:{email:f.studentEmail,password:f.studentPassword}})).status()).toBe(200);
 const previous=await page.request.get(`/api/saved-universities?profileId=${f.studentId}`);expect(previous.status()).toBe(200);
 const existed=(await previous.json()).savedUniversities.some((item:{universityId:number})=>item.universityId===f.verifiedUniversityId);
 const response=await page.request.post("/api/saved-universities",{data:{profileId:f.studentId,universityId:f.verifiedUniversityId}});expect(response.status()).toBe(200);
 const id=(await response.json()).saved.id as number;return {id,created:existed?null:id};
}

test("a held real saved-university response from A cannot mark B's catalogue saved",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const saved=await ensureSaved(page);
 let release!:()=>void,started!:()=>void;
 const held=new Promise<void>(resolve=>{release=resolve;}),ready=new Promise<void>(resolve=>{started=resolve;});
 const path=`**/api/saved-universities?profileId=${f.studentId}`;
 await page.route(path,async route=>{
  // Complete the real authorized A read, then hold only delivery to the UI.
  // No fabricated data/cookie or unauthorized backend success is substituted.
  const response=await route.fetch();expect(response.status()).toBe(200);
  expect((await response.json()).savedUniversities.some((item:{universityId:number})=>item.universityId===f.verifiedUniversityId)).toBe(true);
  started();await held;await route.fulfill({response});
 },{times:1});
 try{
  await page.goto("/");await ready;await expect(page.locator("#main-content")).toBeVisible();
  await page.getByRole("button",{name:en.nav.openMenu,exact:true}).filter({visible:true}).first().click();
  await page.getByRole("dialog",{name:en.nav.mainNav,exact:true}).getByTitle(en.nav.switchAccountTitle,{exact:true}).click();
  const dialog=page.getByRole("dialog");await dialog.locator('input[type="email"]').fill("phase12-e2e-other@example.test");await dialog.locator('input[type="password"]').fill("Different-E2E-Password-Only-2026!");
  await dialog.locator('button[type="submit"]').click();await expect(dialog).toHaveCount(0);
  const session=await page.request.get("/api/auth/session");expect(session.status()).toBe(200);expect((await session.json()).session.profileId).toBe(f.otherProfileId);
  await expect((await page.request.get(`/api/saved-universities?profileId=${f.otherProfileId}`)).json().then(b=>b.savedUniversities.length)).resolves.toBe(0);
  await page.evaluate(()=>{location.hash="#universities/search";});
  const card=page.locator(`[data-university-id="${f.verifiedUniversityId}"]`);await expect(card).toBeVisible();await expect(card.getByTitle(en.university.exSaved,{exact:true})).toHaveCount(0);
  const received=page.waitForResponse(response=>new URL(response.url()).pathname==="/api/saved-universities"&&new URL(response.url()).searchParams.get("profileId")===String(f.studentId));release();await(await received).finished();
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  await expect(card.getByTitle(en.university.exSaved,{exact:true})).toHaveCount(0);
  expect((await page.request.get(`/api/saved-universities?profileId=${f.studentId}`)).status()).toBe(403);
 }finally{release();await page.unroute(path);await cleanupCreatedSaved(saved.created);}
});


test("a failed saved-university DELETE cannot falsely remove the saved marker",async({page})=>{
 const saved=await ensureSaved(page);const path=`**/api/saved-universities?id=${saved.id}`;
 try{
  await page.goto("/#universities/search");const card=page.locator(`[data-university-id="${f.verifiedUniversityId}"]`);
  await expect(card.getByTitle(en.university.exSaved,{exact:true})).toBeVisible();
  // Fault only the attempted mutation; no successful write is fabricated.
  await page.route(path,route=>route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({error:"FICTIONAL unavailable DELETE"})}),{times:1});
  const response=page.waitForResponse(r=>r.request().method()==="DELETE"&&new URL(r.url()).pathname==="/api/saved-universities");
  await card.getByTitle(en.university.exSaved,{exact:true}).click();expect((await response).status()).toBe(503);
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  await expect(card.getByTitle(en.university.exSaved,{exact:true})).toBeVisible();
  const actual=await page.request.get(`/api/saved-universities?profileId=${f.studentId}`);expect(actual.status()).toBe(200);expect((await actual.json()).savedUniversities.some((item:{id:number})=>item.id===saved.id)).toBe(true);
 }finally{await page.unroute(path);await cleanupCreatedSaved(saved.created);}
});
