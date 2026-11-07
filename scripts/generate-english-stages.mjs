import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
// Two bounded tiers, not a runtime translation loader/DSL. Synchronous helper
// namespaces and the complete front door/dashboard remain in the first tier.
const deferred=new Set(["ai","adminChannel","samples","growthSeed","university","careers","careerDiscovery","visa","studyInterest","scholarshipHub","feeWaiver","twin","apostille","timeline","recommend","adminAccounts","adminDiagnostics","adminReviewQueue","admin","adminRefresh","countryCompare","outreach","recLetter","scholarshipDetail","universityDetail","chancing"]);
const en=JSON.parse(readFileSync("src/i18n/messages/en.json","utf8")),bootstrap={},features={};
for(const [key,value] of Object.entries(en))(deferred.has(key)?features:bootstrap)[key]=value;
mkdirSync("src/i18n/staged",{recursive:true});
for(const [name,data] of Object.entries({bootstrap,features})){
 const file=`src/i18n/staged/en-${name}.json`,content=JSON.stringify(data,null,2)+"\n";
 if(process.argv.includes("--check")){if(readFileSync(file,"utf8")!==content)throw new Error(`Stale ${file}: run node scripts/generate-english-stages.mjs`);}
 else writeFileSync(file,content);
}
// Country identity helpers are shared by server and client. Importing the
// server dictionary registry there pulled ALL three complete languages into
// catalogue chunks. Keep only this exact, generated synchronous projection.
const countries=Object.fromEntries(["en","uz","ru"].map(locale=>[locale,JSON.parse(readFileSync(`src/i18n/messages/${locale}.json`,"utf8")).countryNames]));
const file="src/i18n/staged/country-names.json",content=JSON.stringify(countries,null,2)+"\n";
if(process.argv.includes("--check")){if(readFileSync(file,"utf8")!==content)throw new Error(`Stale ${file}: run node scripts/generate-english-stages.mjs`);}
else writeFileSync(file,content);
console.log("English bootstrap/deferred and country-label projection parity verified");
