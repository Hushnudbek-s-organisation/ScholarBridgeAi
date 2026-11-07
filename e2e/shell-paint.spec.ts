import {test,expect} from "@playwright/test";
import {readFileSync,mkdirSync,writeFileSync} from "node:fs";
import en from "../src/i18n/messages/en.json";
test.use({trace:{mode:"on",snapshots:false,screenshots:false,sources:true}});
const fixture=JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!,"utf8"));

/** Diagnostic timeline, separate from the immutable six-sample benchmark.
 * No raised timing budget and no field-INP claim. Trace categories omit network
 * headers/body, screenshots and variable values (including sign-in credentials). */
test("mobile sign-in dispatch, shell DOM and frame timeline remain observable",async({page,baseURL})=>{
 await page.setViewportSize({width:390,height:844});
 const cdp=await page.context().newCDPSession(page);
 await cdp.send("Network.enable");await cdp.send("Network.setBlockedURLs",{urls:["https://*"]});
 await cdp.send("Emulation.setCPUThrottlingRate",{rate:4});
 await cdp.send("Network.emulateNetworkConditions",{offline:false,latency:150,downloadThroughput:1.6*1024*1024/8,uploadThroughput:750*1024/8});
 await page.goto("/",{waitUntil:"domcontentloaded"});await expect(page.locator("h1")).toBeVisible();await page.waitForTimeout(4000);
 await page.getByRole("button",{name:en.landing.navAria,exact:true}).click();
 await page.getByRole("button",{name:en.landing.signIn,exact:true}).first().click();
 const dialog=page.getByRole("dialog");await dialog.locator('input[type="email"]').fill(fixture.studentEmail);await dialog.locator('input[type="password"]').fill(fixture.studentPassword);
 await cdp.send("Tracing.start",{categories:"devtools.timeline,v8,blink.user_timing,toplevel,disabled-by-default-v8.cpu_profiler",transferMode:"ReturnAsStream"});
 await page.evaluate(()=>{
  document.addEventListener("click",()=>performance.mark("shell.dispatch"),{capture:true,once:true});
  const observer=new MutationObserver(()=>{if(!document.querySelector("#main-content"))return;observer.disconnect();performance.mark("shell.dom");requestAnimationFrame(()=>requestAnimationFrame(()=>performance.mark("shell.frames")));});
  observer.observe(document,{subtree:true,childList:true});
 });
 await dialog.locator('button[type="submit"]').click();
 await expect(page.locator("#main-content")).toBeVisible();
 await page.waitForFunction(()=>performance.getEntriesByName("shell.frames").length===1);
 const marks=await page.evaluate(()=>["shell.dispatch","shell.dom","shell.frames"].map(name=>({name,ms:performance.getEntriesByName(name)[0]?.startTime??null})));
 expect(marks.every(mark=>mark.ms!==null)).toBe(true);
 const complete=new Promise<{stream?:string;dataLossOccurred?:boolean}>(resolve=>cdp.once("Tracing.tracingComplete",resolve));
 await cdp.send("Tracing.end");const {stream,dataLossOccurred}=await complete;
 if(!stream||dataLossOccurred)throw new Error("Incomplete Chromium diagnostic trace");
 let raw="";
 for(;;){const result=await cdp.send("IO.read",{handle:stream});raw+=result.base64Encoded?Buffer.from(result.data,"base64").toString():result.data;if(result.eof)break;}
 await cdp.send("IO.close",{handle:stream});
 const dir=process.env.SHELL_TRACE_OUTPUT_DIR??"test-results/continuation-2026-11-07/shell-diagnostic";mkdirSync(dir,{recursive:true});
 writeFileSync(`${dir}/timeline.json`,raw);writeFileSync(`${dir}/marks.json`,JSON.stringify({marks,conditions:{cpuSlowdown:4,viewport:[390,844],latencyMs:150,downloadMbps:1.6,externalHttpsBlocked:true,origin:new URL(baseURL!).origin},metric:"dispatch / shell DOM / two RAFs; separate instrumented diagnostic, not field INP"},null,2)+"\n");
 await test.info().attach("shell-diagnostic-marks",{body:JSON.stringify(marks),contentType:"application/json"});
});
