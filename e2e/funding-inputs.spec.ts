import {test,expect} from "@playwright/test";
import {Client} from "pg";
import {readFileSync} from "node:fs";
import en from "../src/i18n/messages/en.json";
import uz from "../src/i18n/messages/uz.json";
import ru from "../src/i18n/messages/ru.json";
const f=JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!,"utf8"));

test("funding writes reject unknown/coercible/invalid amounts atomically while keeping explicit zero and legacy rounding",async({request},testInfo)=>{
 const url=new URL(process.env.E2E_DATABASE_URL!);expect(url.hostname).toBe("127.0.0.1");expect(url.pathname).toMatch(/^\/sb_e2e_\d+$/);
 const db=new Client({connectionString:url.toString()});await db.connect();const ids:number[]=[];
 const invalid:[string,unknown][]=[["missing",undefined],["null",null],["false",false],["true",true],["blank",""],["whitespace","   "],["array",[]],["object",{}],["negative",-1],["nonnumeric","not-money"],["integer-overflow",2147483648]];
 expect((await request.post("/api/auth/sign-in",{data:{email:f.studentEmail,password:f.studentPassword}})).status()).toBe(200);
 const body={profileId:f.studentId,name:"FICTIONAL amount-validation regression",kind:"savings",status:"planned"};
 try{
  const postResults=[];
  for(const[label,value]of invalid){
   const response=await request.post("/api/funding",{data:{...body,amountUsd:value}});
   if(response.ok()){const data=await response.json();if(data.item?.id)ids.push(data.item.id);}
   postResults.push({label,status:response.status()});
  }
  // Positive controls preserve existing whole-dollar storage/nearest rounding;
  // this test does NOT claim original fractional amounts are durably retained.
  for(const[input,stored]of [[0,0],["0",0],[12.49,12],[12.5,13]] as const){
   const response=await request.post("/api/funding",{data:{...body,amountUsd:input}});expect(response.status()).toBe(200);const data=await response.json();ids.push(data.item.id);expect(data.item.amountUsd).toBe(stored);
  }
  const control=await request.post("/api/funding",{data:{...body,amountUsd:77}});expect(control.status()).toBe(200);const id=(await control.json()).item.id as number;ids.push(id);
  const patchResults=[];
  for(const[label,value]of invalid.filter(([label])=>label!=="missing")){
   expect((await request.patch("/api/funding",{data:{profileId:f.studentId,id,amountUsd:77,status:"planned"}})).status()).toBe(200);
   const response=await request.patch("/api/funding",{data:{profileId:f.studentId,id,amountUsd:value,status:"confirmed"}});
   const row=(await db.query("SELECT amount_usd,status FROM funding_items WHERE id=$1 AND profile_id=$2",[id,f.studentId])).rows[0];
   patchResults.push({label,status:response.status(),amount:row.amount_usd,fundingStatus:row.status});
  }
  // Omitting amount on PATCH keeps the known amount, unlike explicit null.
  expect((await request.patch("/api/funding",{data:{profileId:f.studentId,id,amountUsd:77,status:"planned"}})).status()).toBe(200);
  expect((await request.patch("/api/funding",{data:{profileId:f.studentId,id,notes:"FICTIONAL metadata-only patch"}})).status()).toBe(200);
  expect((await db.query("SELECT amount_usd FROM funding_items WHERE id=$1",[id])).rows[0].amount_usd).toBe(77);
  // Return all genuine fault outcomes together; do not stop at the first bug
  // and pretend subsequent input/atomicity cases executed successfully.
  await testInfo.attach("funding-input-matrix",{body:JSON.stringify({postResults,patchResults}),contentType:"application/json"});
  expect.soft(postResults).toEqual(invalid.map(([label])=>({label,status:400})));
  expect.soft(patchResults).toEqual(invalid.filter(([label])=>label!=="missing").map(([label])=>({label,status:400,amount:77,fundingStatus:"planned"})));
 }finally{if(ids.length)await db.query("DELETE FROM funding_items WHERE id=ANY($1::int[]) AND profile_id=$2",[ids,f.studentId]);await db.end();}
});


test("funding amount precision and invalid-input feedback are accessible in EN UZ RU without submitting an invalid write",async({page})=>{
 expect((await page.request.post("/api/auth/sign-in",{data:{email:f.studentEmail,password:f.studentPassword}})).status()).toBe(200);
 let posts=0;page.on("request",request=>{if(request.method()==="POST"&&new URL(request.url()).pathname==="/api/funding")posts++;});
 for(const[locale,copy]of [["en",en],["uz",uz],["ru",ru]] as const){
  await page.context().addCookies([{name:"scholarbridge_locale",value:locale,url:process.env.E2E_BASE_URL!}]);
  await page.setViewportSize({width:390,height:844});await page.goto("/#funding");await page.reload();await expect(page.locator("html")).toHaveAttribute("lang",locale);
  const amount=page.getByRole("spinbutton",{name:copy.journey.fpFieldAmount,exact:true});await expect(amount).toBeVisible();await expect(amount).toHaveAccessibleDescription(copy.journey.fpUsdRounding);
  await page.getByPlaceholder(copy.journey.fpNamePlaceholder,{exact:true}).fill("FICTIONAL invalid amount draft");await amount.fill("-1");
  await page.getByRole("button",{name:copy.journey.fpAdd,exact:true}).click();await expect(page.getByText(copy.journey.fpUsdAmountInvalid,{exact:true})).toBeVisible();
  expect(posts).toBe(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
});
