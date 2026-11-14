import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import en from '../src/i18n/messages/en.json';
const f=JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!,'utf8'));

test('a superseded real catalogue body cannot replace newer cards or loading state',async({page})=>{
 const searches={old:'e2e-no-such-university-epoch',latest:String(f.verifiedUniversityName)};
 // Hold only JSON delivery AFTER the genuine fetch/body have completed. The
 // browser cannot retroactively abort this application await. No fabricated
 // payload, provider call, synthetic profile or production DB is involved.
 await page.addInitScript(({old,latest})=>{
  const state=window as Window & {heldUniversityBodies?:string[]};
  state.heldUniversityBodies=[];
  const original=window.fetch.bind(window);
  window.fetch=async(...args:Parameters<typeof fetch>)=>{
   const response=await original(...args);
   const url=new URL(response.url),search=url.searchParams.get('search');
   const label=search===old?'old':search===latest?'latest':null;
   if(url.pathname==='/api/universities'&&label){
    const json=response.json.bind(response);
    response.json=async()=>{
     const genuineBody=await json();
     await new Promise<void>(resolve=>{
      window.addEventListener(`e2e-release-${label}`,()=>resolve(),{once:true});
      state.heldUniversityBodies!.push(label);
     });
     return genuineBody;
    };
   }
   return response;
  };
 },searches);
 expect((await page.request.post('/api/auth/sign-in',{data:{email:f.studentEmail,password:f.studentPassword}})).status()).toBe(200);
 await page.context().addCookies([{name:'scholarbridge_locale',value:'en',url:process.env.E2E_BASE_URL!}]);
 const release=async(label:string)=>page.evaluate(value=>window.dispatchEvent(new Event(`e2e-release-${value}`)),label);
 try{
  await page.goto('/#universities/search');
  const card=page.locator(`[data-university-id="${f.verifiedUniversityId}"]`);
  await expect(card).toBeVisible();
  const search=page.getByRole('textbox',{name:en.university.exSearchPlaceholder,exact:true});
  const ready=async(label:string)=>page.waitForFunction(value=>(window as Window & {heldUniversityBodies?:string[]}).heldUniversityBodies?.includes(value),label);
  await search.fill(searches.old);await ready('old');
  await search.fill(searches.latest);await ready('latest');
  const grid=page.locator('div[aria-busy]').filter({has:card});
  await expect(grid).toHaveAttribute('aria-busy','true');
  await release('old');
  // Drain the resolved body promise and React's subsequent frame before
  // asserting, rather than passing while the stale writer is still queued.
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  await expect(card).toBeVisible();await expect(grid).toHaveAttribute('aria-busy','true');
  await release('latest');await expect(card).toBeVisible();await expect(grid).toHaveAttribute('aria-busy','false');
 }finally{
  await release('old');await release('latest');
 }
});
