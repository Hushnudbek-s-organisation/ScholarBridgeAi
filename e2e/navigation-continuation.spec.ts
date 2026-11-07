import {test,expect} from "@playwright/test";
import {readFileSync} from "node:fs";
import en from "../src/i18n/messages/en.json";
const fixture=JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!,"utf8"));
// Exercise the production shell, not a replacement router or mocked panels.
// Same assertion budgets as the ordinary suite; no added sleeps/retries.
test.use({trace:{mode:"retain-on-failure",snapshots:false,screenshots:false,sources:true}});
for(const [width,height] of [[1440,900],[390,844]]){
 test(`URL, shell and pane stay aligned during rapid navigation ${width}`,async({page})=>{
  await page.setViewportSize({width,height});
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/");
  if(width<640)await page.getByRole("button",{name:en.landing.navAria,exact:true}).click();
  await page.getByRole("button",{name:en.landing.signIn,exact:true}).first().click();
  const dialog=page.getByRole("dialog");
  await dialog.locator('input[type="email"]').fill(fixture.studentEmail);
  await dialog.locator('input[type="password"]').fill(fixture.studentPassword);
  await dialog.locator('button[type="submit"]').click();
  await expect(page.locator("#main-content")).toBeVisible();
  // Do not wait for the dashboard's independent API requests before navigating.
  for(const [section,pane] of [["universities","search"],["scholarships","browse"],["universities","outlook"]]){
   await page.evaluate(hash=>{location.hash=hash;},`#${section}/${pane}`);
   await expect(page.locator(`#hub-tab-${pane}`)).toHaveAttribute("aria-selected","true");
   await expect(page.locator(`#hub-panel-${pane}`)).toBeVisible();
   await expect(page).toHaveURL(new RegExp(`#${section}/${pane}$`));
  }
  // Same-section pane clicks must not be reversed by URL reconciliation.
  await page.locator("#hub-tab-search").click();
  await expect(page.locator("#hub-tab-search")).toHaveAttribute("aria-selected","true");
  await expect(page).toHaveURL(/#universities\/search$/);
  await page.goBack();
  await expect(page.locator("#hub-tab-outlook")).toHaveAttribute("aria-selected","true");
  await page.goForward();
  await expect(page.locator("#hub-tab-search")).toHaveAttribute("aria-selected","true");
  // Multiple pending hash events must resolve to the latest destination.
  await page.evaluate(()=>{location.hash="#scholarships/browse";location.hash="#universities/outlook";location.hash="#universities/careers";});
  await expect(page.locator("#hub-tab-careers")).toHaveAttribute("aria-selected","true");
  await expect(page.locator("#hub-panel-careers")).toBeVisible();
  await expect(page).toHaveURL(/#universities\/careers$/);
  // Bad percent encoding is an unknown link, not an uncaught URIError.
  await page.evaluate(()=>{location.hash="#%E0%A4%A";});
  await expect(page.locator("#hub-tab-careers")).toHaveAttribute("aria-selected","true");
  await page.evaluate(()=>{location.hash="#universities/search";});
  await expect(page.locator("#hub-tab-search")).toHaveAttribute("aria-selected","true");
  await page.reload();
  await expect(page.locator("#hub-tab-search")).toHaveAttribute("aria-selected","true");
  expect(errors).toEqual([]);
 });
}
