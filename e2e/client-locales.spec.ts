import {test,expect} from "@playwright/test";
import {readFileSync} from "node:fs";
import ru from "../src/i18n/messages/ru.json";
import uz from "../src/i18n/messages/uz.json";
const f=JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!,"utf8"));
const leaves=(value:unknown):string[]=>typeof value==="string"?[value]:value&&typeof value==="object"?Object.values(value).flatMap(leaves):[];

test("English catalogue does not download complete Russian/Uzbek admin dictionaries through shared country helpers",async({page})=>{
 const bodies:Promise<string>[]=[];
 page.on("response",response=>{if(new URL(response.url()).pathname.startsWith("/_next/static/")&&/\.js(?:\?|$)/.test(response.url()))bodies.push(response.text().catch(()=>""));});
 expect((await page.request.post("/api/auth/sign-in",{data:{email:f.studentEmail,password:f.studentPassword}})).status()).toBe(200);
 await page.context().addCookies([{name:"scholarbridge_locale",value:"en",url:process.env.E2E_BASE_URL!}]);
 await page.goto("/#universities/search");await expect(page.locator(`[data-university-id="${f.verifiedUniversityId}"]`)).toBeVisible();
 // Distinct source-language admin text cannot belong to the small country-name
 // projection or catalogue lexicon. Assert multiple sentinels per dictionary.
 const sentinels=[ru,uz].flatMap(messages=>leaves(messages.admin).filter(value=>value.length>100&&!/[\n"\\]/.test(value)).slice(0,2).map(value=>value.slice(0,90)));
 expect(sentinels).toHaveLength(4);
 const scripts=await Promise.all(bodies);expect(scripts.length).toBeGreaterThan(0);
 for(const text of sentinels)expect(scripts.some(body=>body.includes(text))).toBe(false);
 await test.info().attach("client-locale-boundary",{body:JSON.stringify({locale:"en",loadedScriptCount:scripts.length,decodedScriptBytes:scripts.reduce((sum,body)=>sum+Buffer.byteLength(body),0),fullDictionarySentinelsAbsent:sentinels.length,note:"Decoded bodies, not compressed transfer. The small three-locale country-label projection is intentional."}),contentType:"application/json"});
});
