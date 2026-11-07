import {test,expect} from "@playwright/test";
import {readFileSync,readdirSync} from "node:fs";
import en from "../src/i18n/messages/en.json";
const f=JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!,"utf8"));
function compiledChunk(marker:string){
 const names=readdirSync(".next/static/chunks").filter(name=>name.endsWith(".js")&&readFileSync(`.next/static/chunks/${name}`,"utf8").includes(marker));
 expect(names,`unique compiled chunk for ${marker}`).toHaveLength(1);return `/_next/static/chunks/${names[0]}`;
}

test("university search chunk starts on navigation intent without waiting for the real hub module response",async({page})=>{
 const hub=compiledChunk('("introUniversities")'),explorer=compiledChunk('"data-university-id"');expect(hub).not.toBe(explorer);
 expect((await page.request.post("/api/auth/sign-in",{data:{email:f.studentEmail,password:f.studentPassword}})).status()).toBe(200);
 let release!:()=>void,started!:()=>void,explorerRequested=false;
 const held=new Promise<void>(resolve=>{release=resolve;}),ready=new Promise<void>(resolve=>{started=resolve;});
 page.on("request",request=>{if(new URL(request.url()).pathname===explorer)explorerRequested=true;});
 const routePattern=`**${hub}`;
 await page.route(routePattern,async route=>{
  // Hold delivery of the GENUINE compiled hub JS, not fabricated application
  // data. The child search chunk must be requested before this is released.
  const response=await route.fetch();expect(response.status()).toBe(200);started();await held;await route.fulfill({response});
 },{times:1});
 try{
  await page.goto("/#dashboard");await expect(page.locator("#main-content")).toBeVisible();expect(explorerRequested).toBe(false);
  await page.evaluate(()=>{location.hash="#universities/search";});await ready;
  await expect.poll(()=>explorerRequested,{message:"search JS starts before the delayed hub response, rather than after its render"}).toBe(true);
  release();await expect(page.getByRole("textbox",{name:en.university.exSearchPlaceholder,exact:true})).toBeVisible();
 }finally{release();await page.unroute(routePattern);}
});
