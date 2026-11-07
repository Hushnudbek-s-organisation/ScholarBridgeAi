import {test,expect} from "@playwright/test";
import {readFileSync} from "node:fs";
import {Client} from "pg";
import en from "../src/i18n/messages/en.json";
import uz from "../src/i18n/messages/uz.json";
import ru from "../src/i18n/messages/ru.json";
const f=JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!,"utf8"));

test("funding defaults to confirmed, keeps restricted gaps, and fences optimistic reads without losing drafts",async({page})=>{
 test.setTimeout(120_000);
 const url=new URL(process.env.E2E_DATABASE_URL!);expect(url.hostname).toBe("127.0.0.1");expect(url.pathname).toMatch(/^\/sb_e2e_\d+$/);
 const db=new Client({connectionString:url.toString()});await db.connect();
 expect((await page.request.post("/api/auth/sign-in",{data:{email:f.studentEmail,password:f.studentPassword}})).status()).toBe(200);
 const saved=(await db.query("SELECT award_amount,award_currency,award_period FROM scholarships WHERE id=$1",[f.scholarshipId])).rows[0];
 const ids:number[]=[];
 let release:(()=>void)|undefined;
 const base=`/api/funding?profileId=${f.studentId}`;
 const read=async(scenario?:string)=>{const response=await page.request.get(base+(scenario?`&scenario=${scenario}`:""));expect(response.status()).toBe(200);return response.json();};
 try{
  const initial=await read();expect(initial.annualCost).toBeGreaterThan(0);expect(initial.plan.scenario).toBe("confirmed");
  const created=await page.request.post("/api/funding",{data:{profileId:f.studentId,kind:"scholarship",name:"FICTIONAL conditional funding proof",amountUsd:1000000,status:"planned"}});
  expect(created.status()).toBe(200);const id=(await created.json()).item.id;ids.push(id);
  const confirmed=await read();expect(confirmed.plan.fundingGap).toBe(initial.annualCost);expect(confirmed.plan.securedTotal).toBe(0);expect(confirmed.plan.isCovered).toBe(false);expect(confirmed.plan.byLine.every((line:{covered:number|null})=>line.covered===0||line.covered===null)).toBe(true);
  const optimistic=await read("optimistic");expect(optimistic.plan.fundingGap).toBe(0);expect(optimistic.plan.securedGap).toBe(initial.annualCost);expect(optimistic.plan.upfrontGap).toBeNull();
  expect((await page.request.patch("/api/funding",{data:{profileId:f.studentId,id,status:"awarded"}})).status()).toBe(200);expect((await read()).plan.securedTotal).toBe(0);
  expect((await page.request.patch("/api/funding",{data:{profileId:f.studentId,id,status:"confirmed"}})).status()).toBe(200);expect((await read()).plan.fundingGap).toBe(0);
  expect((await page.request.patch("/api/funding",{data:{profileId:f.studentId,id,status:"planned"}})).status()).toBe(200);
  expect((await page.request.get(base+"&scenario=unknown" )).status()).toBe(400);
  expect((await page.request.get(`/api/funding?profileId=${f.otherProfileId}`)).status()).toBe(403);
  // Known monthly value is not an annual award; reference FX is not a fixed
  // USD award. Keep discovery, but do not silently add either to an annual plan.
  await db.query("UPDATE scholarships SET award_amount=1000000,award_currency='USD',award_period='month' WHERE id=$1",[f.scholarshipId]);
  const candidate=(await read()).gapActions.scholarships.find((value:{id:number})=>value.id===f.scholarshipId);expect(candidate).toBeTruthy();expect(candidate.annualComparable).toBe(false);expect(candidate.coversGap).toBe(false);expect(candidate.discoveryOnly).toBe(true);expect(candidate.eligibility).toBe("unknown");
  await db.query("UPDATE scholarships SET award_currency='EUR',award_period='year' WHERE id=$1",[f.scholarshipId]);expect((await read()).gapActions.scholarships.find((value:{id:number})=>value.id===f.scholarshipId).annualComparable).toBe(false);
  await db.query("UPDATE scholarships SET award_currency='USD',award_period='year' WHERE id=$1",[f.scholarshipId]);expect((await read()).gapActions.scholarships.find((value:{id:number})=>value.id===f.scholarshipId).annualComparable).toBe(true);

  await page.setViewportSize({width:390,height:844});await page.goto("/#funding");
  const select=page.locator("#funding-scenario");await expect(select).toBeVisible();await expect(page.locator('[data-funding-scenario="confirmed"]')).toHaveAttribute("data-funding-gap",String(initial.annualCost));
  const draft=page.getByPlaceholder(en.journey.fpNamePlaceholder);await draft.fill("FICTIONAL unsaved draft");
  await select.focus();await select.selectOption("optimistic");await expect(page.locator('[data-funding-scenario="optimistic"]')).toHaveAttribute("data-funding-gap","0");await expect(select).toBeFocused();await expect(draft).toHaveValue("FICTIONAL unsaved draft");
  await select.selectOption("confirmed");await expect(page.locator('[data-funding-scenario="confirmed"]')).toBeVisible();
  // Hold only a REAL outgoing request. No numeric response is mocked. A late
  // optimistic response cannot overwrite the newer confirmed selection.
  let started!:()=>void;const requested=new Promise<void>(resolve=>{started=resolve;});const held=new Promise<void>(resolve=>{release=resolve;});
  await page.route("**/api/funding?**",async route=>{if(new URL(route.request().url()).searchParams.get("scenario")==="optimistic"){started();await held;}await route.continue();});
  // Force a fresh read rather than a legitimate same-key client-cache hit.
  await page.reload();await expect(page.locator('[data-funding-scenario="confirmed"]')).toBeVisible();
  await page.getByPlaceholder(en.journey.fpNamePlaceholder).fill("FICTIONAL unsaved draft");
  await select.selectOption("optimistic");await requested;await expect(page.locator('[data-funding-scenario="confirmed"]')).toHaveCount(0);await expect(select).toBeEnabled();
  await select.selectOption("confirmed");await expect(page.locator('[data-funding-scenario="confirmed"]')).toBeVisible();
  const late=page.waitForResponse(response=>response.url().includes("/api/funding?")&&new URL(response.url()).searchParams.get("scenario")==="optimistic");release!();await late;
  await expect(select).toHaveValue("confirmed");await expect(page.locator('[data-funding-scenario="confirmed"]')).toHaveAttribute("data-funding-gap",String(initial.annualCost));await expect(page.getByPlaceholder(en.journey.fpNamePlaceholder)).toHaveValue("FICTIONAL unsaved draft");
  await page.unroute("**/api/funding?**");
  // One explicit HTTP fault (not a fabricated finance payload) clears the
  // success state and keeps scenario controls/draft/retry available.
  await page.reload();await expect(page.locator('[data-funding-scenario="confirmed"]')).toBeVisible();
  await page.route("**/api/funding?**",route=>route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({error:"FICTIONAL one-shot funding read fault"})}),{times:1});
  await select.selectOption("optimistic");await expect(page.getByText("FICTIONAL one-shot funding read fault",{exact:true})).toBeVisible();
  await expect(page.locator("[data-funding-scenario]")).toHaveCount(0);await expect(select).toBeEnabled();
  await page.getByRole("button",{name:en.journey.fpRetry,exact:true}).click();await expect(page.locator('[data-funding-scenario="optimistic"]')).toHaveAttribute("data-funding-gap","0");
  for(const [locale,copy] of [["uz",uz],["ru",ru]] as const){
   await page.context().addCookies([{name:"scholarbridge_locale",value:locale,url:process.env.E2E_BASE_URL!}]);await page.reload();
   await expect(page.getByRole("combobox",{name:copy.journey.fpScenario,exact:true})).toHaveValue("confirmed");await expect(page.locator('[data-funding-scenario="confirmed"]')).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
 }finally{
  release?.();await page.unroute("**/api/funding?**");
  for(const id of ids)expect((await page.request.delete(base+`&id=${id}`)).status()).toBe(200);
  await db.query("UPDATE scholarships SET award_amount=$1,award_currency=$2,award_period=$3 WHERE id=$4",[saved.award_amount,saved.award_currency,saved.award_period,f.scholarshipId]);
  await db.end();
 }
});
