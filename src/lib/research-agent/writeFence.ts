/** Short business-write transactions, never a transaction around network/AI work. */
import { AsyncLocalStorage } from "node:async_hooks";
import { sql } from "drizzle-orm";
import { db as baseDb } from "@/db";
import { isDurableStoreEnabled } from "./durableStore";

export type ResearchLease = {runId:string;workerId:string};
type Context = ResearchLease & {transaction?:typeof baseDb};
const context=new AsyncLocalStorage<Context>();
export class ResearchLeaseLostError extends Error {
  constructor(){super("Research write rejected: a live claim token is required.");this.name="ResearchLeaseLostError";}
}
export const researchWriteIsFenced=()=>!!context.getStore()?.workerId;
export function withResearchLease<T>(lease:ResearchLease,work:()=>Promise<T>):Promise<T>{
  return context.run(lease,work);
}

/** Every imported persistence method resolves to this transaction, including nested upserts. */
export const researchDb=new Proxy(baseDb,{
  get(_target,key){
    const active=context.getStore();
    if(isDurableStoreEnabled()&&["insert","update","delete","execute"].includes(String(key))&&!active?.transaction)
      throw new ResearchLeaseLostError();
    const database=active?.transaction??baseDb;
    const value=Reflect.get(database,key);
    return typeof value==="function"?value.bind(database):value;
  },
});

export function fenceResearchWrite<Args extends unknown[],Result>(write:(...args:Args)=>Promise<Result>):(...args:Args)=>Promise<Result>{
  return async (...args)=>{
    const active=context.getStore();
    if(active?.transaction)return write(...args);
    // Explicit process-local mode retains its old manual behaviour. It is not
    // advertised as restart-safe. Durable mode NEVER falls back to that path.
    if(!active){if(isDurableStoreEnabled())throw new ResearchLeaseLostError();return write(...args);}
    return baseDb.transaction(async tx=>{
      await tx.execute(sql`SET LOCAL lock_timeout = '3s'`);
      await tx.execute(sql`SET LOCAL statement_timeout = '15s'`);
      const predicate=sql`id=${active.runId} AND lease_owner=${active.workerId} AND lease_until>clock_timestamp() AND NOT cancel_requested AND status IN ('queued','running') AND (timeout_at IS NULL OR timeout_at>clock_timestamp())`;
      const lease=await tx.execute(sql`SELECT id FROM public.research_runs WHERE ${predicate} FOR UPDATE`);
      if(lease.rows.length!==1)throw new ResearchLeaseLostError();
      const result=await context.run({...active,transaction:tx as unknown as typeof baseDb},()=>write(...args));
      // now() is transaction-start time; use the actual clock for commit fencing.
      const stillLive=await tx.execute(sql`SELECT id FROM public.research_runs WHERE ${predicate}`);
      if(stillLive.rows.length!==1)throw new ResearchLeaseLostError();
      return result;
    });
  };
}
