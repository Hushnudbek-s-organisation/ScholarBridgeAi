import {test,expect} from "@playwright/test";
import {readFileSync} from "node:fs";
import {Client} from "pg";
import en from "../src/i18n/messages/en.json";
import uz from "../src/i18n/messages/uz.json";
import ru from "../src/i18n/messages/ru.json";
const f=JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!,"utf8"));
type Offer={id:number;applicationId:number;funding:{scenario:string;tuitionBasis:string;tuition:number|null;tuitionRemaining:number|null;scholarship:number;conditionalTotal:number;confirmedAllocatedToTuition:number;confirmedNotAllocatedToTuition:number;repayableTotal:number;upfrontGap:number|null;timingRecorded:boolean;payableNow:{amount:number|null}}};

test("post-admission offers and comparison use confirmed restricted allocations, explicit periods, loans and owned application scope",async({page})=>{
 const url=new URL(process.env.E2E_DATABASE_URL!);expect(url.hostname).toBe("127.0.0.1");expect(url.pathname).toMatch(/^\/sb_e2e_\d+$/);
 const db=new Client({connectionString:url.toString()});await db.connect();
 const apps:number[]=[],items:number[]=[];const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
 expect((await page.request.post("/api/auth/sign-in",{data:{email:f.studentEmail,password:f.studentPassword}})).status()).toBe(200);
 const offersPath=`/api/offers?profileId=${f.studentId}`;
 const read=async()=>{const response=await page.request.get(offersPath);expect(response.status()).toBe(200);return (await response.json()).offers as Offer[];};
 try{
  for(let index=0;index<3;index++)apps.push((await db.query("INSERT INTO applications(profile_id,university_name,program_name) VALUES($1,$2,'FICTIONAL programme; period unrecorded') RETURNING id",[f.studentId,`FICTIONAL post-admission ${index+1}`])).rows[0].id);
  const [a,b,unknown]=apps;
  for(const [applicationId,tuitionCommitment] of [[a,60000],[b,10000],[unknown,null]] as const){const response=await page.request.post("/api/offers",{data:{profileId:f.studentId,applicationId,status:"accepted",tuitionCommitment,depositAmount:3000,depositDueDate:"2027-01-01"}});expect(response.status()).toBe(200);}
  for(const [applicationId,kind,status,amountUsd,covers] of [[a,"scholarship","awarded",90000,[]],[a,"scholarship","confirmed",70000,["living"]],[a,"savings","confirmed",3000,[]],[a,"loan","confirmed",2000,[]],[a,"family","planned",30000,[]],[a,"aid","declined",1000000,[]],[b,"loan","confirmed",5000,[]],[null,"savings","confirmed",200000,[]]] as const){
   const response=await page.request.post("/api/funding",{data:{profileId:f.studentId,applicationId,kind,status,amountUsd,covers,name:"FICTIONAL scoped post-admission funding"}});expect(response.status()).toBe(200);items.push((await response.json()).item.id);
  }
  const offers=await read(),offer=offers.find(value=>value.applicationId===a)!;
  expect(offer.funding).toMatchObject({scenario:"confirmed",tuitionBasis:"offer_recorded_usd",tuition:60000,scholarship:70000,tuitionRemaining:55000,conditionalTotal:120000,confirmedAllocatedToTuition:5000,confirmedNotAllocatedToTuition:70000,repayableTotal:2000,upfrontGap:null,timingRecorded:false,payableNow:{amount:3000}});
  expect(offers.find(value=>value.applicationId===b)!.funding).toMatchObject({tuitionRemaining:5000,conditionalTotal:0,repayableTotal:5000});
  const unknownOffer=offers.find(value=>value.applicationId===unknown)!;expect(unknownOffer.funding).toMatchObject({tuition:null,tuitionBasis:"unknown",tuitionRemaining:null});
  expect((await page.request.patch("/api/offers",{data:{profileId:f.studentId,id:unknownOffer.id,tuitionCommitment:0,depositAmount:0}})).status()).toBe(200);
  expect((await read()).find(value=>value.applicationId===unknown)!.funding).toMatchObject({tuition:0,tuitionRemaining:0,payableNow:{amount:0}});
  // The annual planner has a different, explicitly separate cost basis; compare
  // status/scope semantics, never claim its estimated annual gap equals an
  // offer amount whose programme period is not recorded.
  const planResponse=await page.request.get(`/api/funding?profileId=${f.studentId}&applicationId=${a}`);expect(planResponse.status()).toBe(200);const plan=await planResponse.json();expect(plan.plan.scenario).toBe("confirmed");expect(plan.plan.conditionalTotal).toBe(120000);expect(plan.items.map((item:{applicationId:number})=>item.applicationId)).toEqual(Array(6).fill(a));
  expect((await page.request.get(`/api/offers?profileId=${f.otherProfileId}`)).status()).toBe(403);
  for(const [locale,copy] of [["en",en],["uz",uz],["ru",ru]] as const){
   await page.context().addCookies([{name:"scholarbridge_locale",value:locale,url:process.env.E2E_BASE_URL!}]);await page.setViewportSize({width:390,height:844});await page.goto("/#offers");
   // Hash-only navigation does not re-read a server locale cookie. Perform an
   // actual document reload before checking that locale's real rendered copy.
   await page.reload();await expect(page.locator("html")).toHaveAttribute("lang",locale);
   const panel=page.locator(`[data-offer-funding="${offer.id}"]`);await expect(panel).toHaveAttribute("data-funding-scenario","confirmed");await expect(panel).toHaveAttribute("data-tuition-remaining","55000");
   await expect(panel.getByText(copy.journey.opTuitionAllocated,{exact:true})).toBeVisible();await expect(panel.getByText(copy.journey.opFundingTiming,{exact:true})).toBeVisible();await expect(panel.getByText(copy.journey.opTuitionBasisRecorded,{exact:true})).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
   await page.goto("/#post-admission-funding");const table=page.getByRole("table").filter({has:page.getByRole("rowheader",{name:copy.journey.pamNetAnnualCost,exact:true})});await expect(table).toBeVisible();
   const gap=table.getByRole("row").filter({has:page.getByRole("rowheader",{name:copy.journey.pamNetAnnualCost,exact:true})});await expect(gap).toContainText("$55,000");await expect(gap).toContainText("$5,000");await expect(gap).toContainText("$0");
   await expect(table.getByRole("rowheader",{name:copy.journey.opTuitionBasisLabel,exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
  expect(errors).toEqual([]);
 }finally{
  if(items.length)await db.query("DELETE FROM funding_items WHERE id=ANY($1::int[])",[items]);if(apps.length){await db.query("DELETE FROM journey_deadlines WHERE entity_type='application' AND entity_id=ANY($1::int[])",[apps]);await db.query("DELETE FROM applications WHERE id=ANY($1::int[])",[apps]);}await db.end();
 }
});
