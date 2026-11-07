import {AsyncTtlCache} from "../../src/lib/asyncTtlCache";
import {revisionFencedCache} from "../../src/lib/revisionFencedCache";
import {sharedDashboardRecommendationCacheKey} from "../../src/lib/dashboardRecommendationCache";
import {db,pool} from "../../src/db";
import {sql} from "drizzle-orm";
const cache=new AsyncTtlCache<string,number>(15000,10);let count=0;
let resume:(()=>void)|undefined;
process.on("message",async(message:{kind:string})=>{
 if(message.kind==="resume"){resume?.();return;}
 if(message.kind==="clear"){cache.clear();process.send?.({cleared:true});return;}
 try{
  let pause=message.kind==="pending";
  const value=await revisionFencedCache(cache,()=>sharedDashboardRecommendationCacheKey(7,"en","2026-11-07","fixture"),async()=>{
   count++;const rows=await db.execute(sql`SELECT count(*)::integer AS n FROM user_documents WHERE profile_id=7`);
   if(pause){pause=false;await new Promise<void>(resolve=>{resume=resolve;process.send?.({pending:true});});}
   return Number(rows.rows[0].n);
  });
  process.send?.({value,count});
 }catch(error){process.send?.({error:error instanceof Error?error.name:"unknown"});}
});
process.on("disconnect",()=>{void pool.end();});
process.send?.({ready:true});
