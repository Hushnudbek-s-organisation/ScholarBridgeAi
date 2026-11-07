import {test as base,expect} from "@playwright/test";
import {readFileSync} from "node:fs";
import en from "../src/i18n/messages/en.json";
const fixture=JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!,"utf8"));
// The bundled headless Chromium reproducibly stalls creating the third auth
// context in a shared process, before that test body runs (three preserved
// diagnostics, including one with external HTTPS blocked). Isolate this new
// regression family by browser process, not by skipping assertions/retrying or
// increasing timeouts. Built-in page, context options, trace and screenshots
// still use Playwright's automatic instrumentation. Performance keeps its
// original shared-browser protocol; no app network response is changed here.
const test=base.extend({
 context:async({playwright,browserName,launchOptions,headless},runTestWithContext)=>{
  const browser=await playwright[browserName].launch({...launchOptions,headless});
  try{const context=await browser.newContext();try{await runTestWithContext(context);}finally{await context.close();}}
  finally{await browser.close();}
 }
});
async function openSignIn(page:import("@playwright/test").Page){
 await page.goto("/");await page.getByRole("button",{name:en.landing.signIn,exact:true}).first().click();
 const dialog=page.getByRole("dialog");await dialog.locator('input[type="email"]').fill(fixture.studentEmail);await dialog.locator('input[type="password"]').fill(fixture.studentPassword);return dialog;
}

test("fresh server-authenticated sign-in enters the shell without a redundant session probe; backend permissions remain authoritative",async({page})=>{
 const dialog=await openSignIn(page);let probes=0;
 // Inject an HTTP failure only into the redundant browser probe. The actual
 // sign-in, HttpOnly cookie and subsequent backend authorization remain real.
 await page.route("**/api/auth/session",route=>{probes++;return route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({error:"FICTIONAL unavailable extra session probe"})});});
 const signedIn=page.waitForResponse(response=>new URL(response.url()).pathname==="/api/auth/sign-in");await dialog.locator('button[type="submit"]').click();expect((await signedIn).status()).toBe(200);
 await expect(page.locator("#main-content")).toBeVisible();expect(probes).toBe(0);
 const session=await page.request.get("/api/auth/session");expect(session.status()).toBe(200);expect((await session.json()).session.profileId).toBe(fixture.studentId);
 expect((await page.request.get(`/api/dashboard?profileId=${fixture.studentId}`)).status()).toBe(200);
 expect((await page.request.get(`/api/dashboard?profileId=${fixture.otherProfileId}`)).status()).toBe(403);
 expect((await page.request.get("/api/admin/accounts" )).status()).toBe(403);
 await page.unroute("**/api/auth/session");
});

test("malformed login success without a matching session envelope cannot enter a profile",async({page})=>{
 const dialog=await openSignIn(page);let probes=0;page.on("request",request=>{if(new URL(request.url()).pathname==="/api/auth/session")probes++;});
 // A deliberately MALFORMED envelope, not a fabricated valid auth result.
 // No cookie is minted; the backend independently remains unauthenticated.
 await page.route("**/api/auth/sign-in",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({profile:{id:fixture.studentId,name:"FICTIONAL malformed response",email:fixture.studentEmail,isAdmin:false}})}),{times:1});
 await dialog.locator('button[type="submit"]').click();await expect(dialog.getByText(en.picker.failed,{exact:true})).toBeVisible();await expect(page.locator("#main-content")).toHaveCount(0);expect(probes).toBe(0);
 expect((await page.request.get("/api/auth/session")).status()).toBe(401);
});

test("real invalid credentials remain a visible failure and never enter the shell",async({page})=>{
 const dialog=await openSignIn(page);await dialog.locator('input[type="password"]').fill(`${fixture.studentPassword}-FICTIONAL-wrong`);
 await dialog.locator('button[type="submit"]').click();await expect(dialog.getByText(en.picker.wrongCredentials,{exact:true})).toBeVisible();await expect(page.locator("#main-content")).toHaveCount(0);
 expect((await page.request.get("/api/auth/session")).status()).toBe(401);
});

test("closing sign-in before a real response arrives cannot apply an unmounted picker callback",async({page})=>{
 const dialog=await openSignIn(page);let release!:()=>void,started!:()=>void,probes=0;
 const held=new Promise<void>(resolve=>{release=resolve;}),ready=new Promise<void>(resolve=>{started=resolve;});
 page.on("request",request=>{if(new URL(request.url()).pathname==="/api/auth/session")probes++;});
 await page.route("**/api/auth/sign-in",async route=>{
  const response=await route.fetch();expect(response.status()).toBe(200);started();await held;await route.fulfill({response});
 });
 try{
  await dialog.locator('button[type="submit"]').click();await ready;
  await dialog.getByRole("button",{name:en.picker.close,exact:true}).click();await expect(dialog).toHaveCount(0);
  const received=page.waitForResponse(response=>new URL(response.url()).pathname==="/api/auth/sign-in");release();await (await received).finished();
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  expect(probes).toBe(0);await expect(page.locator("#main-content")).toHaveCount(0);await expect(page.locator("h1")).toBeVisible();
  // The actual server may already have minted a cookie before close. This is
  // UI cancellation, not a claim that closing a dialog revokes that session.
 }finally{release();await page.unroute("**/api/auth/sign-in");}
});
