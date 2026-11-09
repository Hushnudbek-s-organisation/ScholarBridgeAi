import {test,expect} from '@playwright/test';
import {readFileSync,mkdirSync} from 'node:fs';
import {Pool} from 'pg';
import en from '../src/i18n/messages/en.json';
import uz from '../src/i18n/messages/uz.json';
import ru from '../src/i18n/messages/ru.json';
const f=JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!,'utf8'));
test('real four-surface award scope parity and localized unknown disclosure across themes',async({page})=>{
 const database=new URL(process.env.E2E_DATABASE_URL!);expect(database.hostname).toBe('127.0.0.1');expect(database.pathname).toMatch(/^\/sb_e2e_\d+$/);
 const db=new Pool({connectionString:database.toString()});
 const fields=['degree_levels','country','coverage_type','tuition_coverage','amount_usd_value','award_amount','award_currency','award_period','verification_status','last_verified_at'];
 const original=(await db.query(`SELECT ${fields.join(',')} FROM scholarships WHERE id=$1`,[f.scholarshipId])).rows[0];expect(original).toBeTruthy();
 const existing=(await db.query('SELECT id FROM saved_universities WHERE profile_id=$1 AND university_id=$2',[f.studentId,f.verifiedUniversityId])).rows.length>0;
 const bump=()=>db.query("INSERT INTO cache_revisions(scope,revision) VALUES('catalogue',2) ON CONFLICT(scope) DO UPDATE SET revision=cache_revisions.revision+1");
 try{
  expect((await page.request.post('/api/auth/sign-in',{data:{email:f.studentEmail,password:f.studentPassword}})).status()).toBe(200);
  expect([200,201]).toContain((await page.request.post('/api/saved-universities',{data:{profileId:f.studentId,universityId:f.verifiedUniversityId}})).status());
  // Deliberately misleading FICTIONAL legacy metadata, not factual award data.
  await db.query(`UPDATE scholarships SET degree_levels='["Bachelor"]',country='Global',coverage_type='Full tuition',tuition_coverage='Full',amount_usd_value=50000,award_amount=50000,award_currency='USD',award_period='total',verification_status='verified',last_verified_at=now() WHERE id=$1`,[f.scholarshipId]);await bump();
  const json=async(path:string)=>{const response=await page.request.get(path);expect(response.status(),path).toBe(200);return response.json();};
  const hub=await json(`/api/scholarships?profileId=${f.studentId}`),dashboard=await json(`/api/dashboard?profileId=${f.studentId}`),autopilot=await json(`/api/autopilot?profileId=${f.studentId}`),deadlines=await json(`/api/deadlines?profileId=${f.studentId}`);
  const rows=[hub.scholarships.find((r:{id:number})=>r.id===f.scholarshipId),dashboard.recommended.scholarships.find((r:{id:number})=>r.id===f.scholarshipId),autopilot.queue.find((r:{id:number})=>r.id===f.scholarshipId),deadlines.items.find((r:{id:string})=>r.id===`sch-${f.scholarshipId}`)];
  for(const row of rows){expect(row).toBeTruthy();expect(row.coverageState).toBe('unknown');expect(row.coversSavedUni).toBe(false);expect(row.coverageAssessment.isFullCoverage).toBe(false);expect(row.coverageAssessment.totalCostCoverage).toBe('unknown');expect(row.coverageAssessment.discoveryUniNames).toContain(f.verifiedUniversityName);expect(row.coverageAssessment.universities[0].reason).toBe('scope_missing');}
  expect(rows[2].tags.fullFunding).toBe(false);expect(rows[2].coverageTier).toBe(0);expect(rows[3].isFullCoverage).toBe(false);
  mkdirSync('test-results/master-followup/screens',{recursive:true});
  // Real rendered disclosure, not a static message-key existence check. One
  // browser context avoids the known third-context headless-runtime stall.
  await page.goto('/#scholarships/browse');
  const preferenceTab=await page.context().newPage();await preferenceTab.goto('/robots.txt');
  await page.emulateMedia({colorScheme:'dark'});
  for(const [locale,messages] of [['en',en],['uz',uz],['ru',ru]] as const){
   await page.context().addCookies([{name:'scholarbridge_locale',value:locale,url:process.env.E2E_BASE_URL!}]);
   await page.setViewportSize({width:locale==='uz'?390:1440,height:900});await page.reload();
   for(const theme of ['dark','light','system']){
    // A real second same-origin tab produces the native storage event. This
    // tests existing cross-tab theme sync without nine expensive app reloads
    // or bypassing the provider by directly changing document classes.
    await preferenceTab.evaluate(value=>localStorage.setItem('scholarbridge_theme',value),theme);
    const card=page.locator(`[data-scholarship-id="${f.scholarshipId}"]`),note=card.locator('[data-award-coverage="unknown"]');
    await expect(note).toHaveText(messages.common.awardCoverageUnknown);await expect(page.locator('html')).toHaveAttribute('lang',locale);
    if(theme==='light')await expect(page.locator('html')).not.toHaveClass(/dark/);else await expect(page.locator('html')).toHaveClass(/dark/);
    await note.scrollIntoViewIfNeeded();await expect(note).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    await note.screenshot({path:`test-results/master-followup/screens/award-${locale}-${theme}.png`,animations:'disabled'});
   }
  }
  await preferenceTab.close();
 }finally{
  await db.query(`UPDATE scholarships SET ${fields.map((field,i)=>`${field}=$${i+2}`).join(',')} WHERE id=$1`,[f.scholarshipId,...fields.map(field=>original[field])]);
  if(!existing)await db.query('DELETE FROM saved_universities WHERE profile_id=$1 AND university_id=$2',[f.studentId,f.verifiedUniversityId]);await bump();
  const restored=(await db.query(`SELECT ${fields.join(',')} FROM scholarships WHERE id=$1`,[f.scholarshipId])).rows[0];expect(restored).toEqual(original);await db.end();
 }
});
