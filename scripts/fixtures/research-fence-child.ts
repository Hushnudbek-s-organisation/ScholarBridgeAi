import {withResearchLease,fenceResearchWrite,researchDb} from "../../src/lib/research-agent/writeFence";
import * as persist from "../../src/lib/research-agent/persist";
import * as audit from "../../src/lib/research-agent/audit";
import {sql} from "drizzle-orm";
import {pool} from "../../src/db";
process.on("message",async (message:{runId:string;token:string;stop?:boolean})=>{
  if(message.stop){await pool.end();process.disconnect?.();return;}
  const outcomes:Record<string,string>={};
  const evidence={field:"foundedYear",value:1990,sourceUrl:"https://fictional.example.edu/stale-a",sourceTitle:"FICTIONAL paused worker source",sourceType:"official_university",exactEvidence:"FICTIONAL fixture founded in 1990",confidence:0.99};
  // These are valid business arguments, not undefined-argument guard probes.
  const functions:Record<string,()=>Promise<unknown>>={
    upsertSource:()=>persist.upsertSource(evidence,1),
    writeUniversity:()=>persist.writeUniversity(1,{foundedYear:1990},[evidence],{university:{id:1,verificationStatus:"unverified",foundedYear:null},programs:[],cycles:[],scholarships:[],sourceUrls:new Set()}),
    upsertProgram:()=>persist.upsertProgram(1,{name:"FICTIONAL paused programme",degree:"Bachelor",field:"Computer Science"},evidence.sourceUrl),
    upsertRequirements:()=>persist.upsertRequirements(1,{minIelts:7},evidence.sourceUrl),
    upsertCycle:()=>persist.upsertCycle(1,{academicYear:"2027",deadline:"2027-01-01",applicationUrl:evidence.sourceUrl},evidence.sourceUrl),
    upsertScholarship:()=>persist.upsertScholarship({title:"FICTIONAL paused award",provider:"Fixture",country:"Test"},evidence.sourceUrl,1),
    logRunStart:()=>audit.logRunStart(1,["identity"]),
    logRunFinish:()=>audit.logRunFinish(1,null),
    genericFencedSql:fenceResearchWrite(()=>researchDb.execute(sql`UPDATE public.fence_business SET value=999 WHERE id=1`))};
  for(const [name,work] of Object.entries(functions)){
    try{await withResearchLease({runId:message.runId,workerId:message.token},work);outcomes[name]="WRITTEN";}
    catch(error){outcomes[name]=error instanceof Error?error.name:"unknown";}
  }
  process.send?.({outcomes});
});
process.send?.({ready:true});
