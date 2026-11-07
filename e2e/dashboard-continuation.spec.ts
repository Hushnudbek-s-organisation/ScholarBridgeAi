import {test,expect,type Locator,type Page} from "@playwright/test";
import {readFileSync,mkdirSync,writeFileSync} from "node:fs";
const f=JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!,"utf8")),out=process.env.DASHBOARD_EVIDENCE_OUTPUT_DIR??"test-results/continuation-2026-11-07/screens";mkdirSync(out,{recursive:true});
async function hit(locator:Locator){await locator.scrollIntoViewIfNeeded();await locator.evaluate(element=>element.scrollIntoView({block:"nearest",behavior:"instant"}));await expect(locator).toBeVisible();const evidence=await locator.evaluate(element=>{const r=element.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {hit:!!top&&(top===element||element.contains(top)),target:element.textContent,rect:r.toJSON(),occluder:top?.outerHTML.slice(0,400),scrollY};});await test.info().attach("bottom-hit",{body:JSON.stringify(evidence),contentType:"application/json"});expect(evidence.hit).toBe(true);}
async function settled(page:Page){const elements=page.getByTestId("journey-dashboard").locator('h1,h2,h3,p,button');await expect.poll(()=>elements.evaluateAll(nodes=>nodes.filter(element=>{const r=element.getBoundingClientRect();if(!r.width||!r.height||r.bottom<0||r.top>innerHeight)return false;let node:Element|null=element;while(node){const style=getComputedStyle(node);if(Number(style.opacity)<.95||style.filter.includes("blur("))return true;node=node.parentElement;}return false;}).length)).toBe(0);}
for(const locale of ["en","uz","ru"])test(`C01–C07 real dashboard geometry, settled states and bottom hit tests ${locale}`,async({page})=>{
 await page.context().addCookies([{name:"scholarbridge_locale",value:locale,url:process.env.E2E_BASE_URL!}]);
 await page.addInitScript(()=>localStorage.setItem("scholarbridge_theme","dark"));
 expect((await page.request.post("/api/auth/sign-in",{data:{email:f.studentEmail,password:f.studentPassword}})).status()).toBe(200);
 await page.setViewportSize({width:1366,height:768});await page.goto("/#dashboard");await expect(page.getByTestId("journey-dashboard")).toBeVisible();
 const samples=[];
 for(const [width,height] of [[1366,768],[1440,900],[768,900],[390,844],[360,800],[320,720]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>scrollTo(0,0));
  const hero=page.getByTestId("dashboard-next-action"),dock=page.getByTestId("grouped-dock");
  await expect(hero).toBeVisible();await expect(dock).toBeVisible();
  const overflow=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,elements:Array.from(document.querySelectorAll("body *")).flatMap(element=>{const r=element.getBoundingClientRect();return r.right>innerWidth+1||r.left< -1?[{tag:element.tagName,text:element.textContent?.slice(0,60),class:element.className,left:r.left,right:r.right,width:r.width}]:[];})}));if(overflow.scrollWidth>overflow.width+1)await test.info().attach("horizontal-overflow",{body:JSON.stringify(overflow),contentType:"application/json"});expect(overflow.scrollWidth<=overflow.width+1).toBe(true);
  await settled(page);samples.push({width,height,hero:await hero.boundingBox(),dock:await dock.boundingBox(),layout:await page.evaluate(()=>({height:getComputedStyle(document.documentElement).getPropertyValue("--sb-dock-height"),scrollElement:document.scrollingElement?.tagName}))});
  expect(await hero.locator('[data-action="primary"]').count()).toBe(1);
  expect(await hero.locator('svg[aria-hidden="true"]').count()).toBeGreaterThan(0);
  await page.screenshot({path:`${out}/first-${locale}-${width}.png`,animations:"disabled"});
  await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await settled(page);
  const last=page.getByTestId("journey-dashboard").locator('button:visible,a[href]:visible').last();await hit(last);await last.focus();await expect(last).toBeFocused();
  await page.screenshot({path:`${out}/final-${locale}-${width}.png`,animations:"disabled"});
 }
 await page.setViewportSize({width:390,height:500});await page.evaluate(()=>scrollTo(0,0));
 const dock=page.getByTestId("grouped-dock");const first=dock.locator('button[aria-expanded]').first();await first.click();await expect(page.locator('[id^="dock-panel-"]')).toBeVisible();await page.keyboard.press("Escape");await expect(first).toBeFocused();
 await page.emulateMedia({reducedMotion:"reduce"});await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await settled(page);
 // Actual keyboard shortcut/focus and an input hit test while the visible
 // viewport shrinks. This is a desktop-lab resize, not a real mobile IME claim.
 await page.setViewportSize({width:390,height:844});await page.keyboard.press("Control+k");
 const dialog=page.getByRole("dialog"),input=dialog.locator("input").first();await expect(input).toBeFocused();await input.fill("FICTIONAL");
 await page.setViewportSize({width:390,height:320});await hit(input);await page.keyboard.press("Escape");await expect(dialog).not.toBeVisible();
 expect(await page.evaluate(()=>getComputedStyle(document.body).overflowY)).not.toBe("hidden");
 // CSS 200% zoom is labelled explicitly; native browser/mobile pinch-zoom
 // and an actual OS keyboard still need device-level acceptance.
 await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>{document.body.style.zoom="2";scrollTo(0,0);});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.screenshot({path:`${out}/zoom-${locale}.png`,animations:"disabled"});
 await page.evaluate(()=>{document.body.style.zoom="";});
 writeFileSync(`${out}/geometry-${locale}.json`,JSON.stringify(samples,null,2));
});
