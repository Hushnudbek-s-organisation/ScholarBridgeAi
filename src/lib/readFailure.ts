/** Fixed, non-sensitive error taxonomy. No SQL, URLs, profile ids or raw
 * messages are ever returned. A moving snapshot is NOT a successful stale read. */
export type ReadFailureClass="snapshot_changed"|"database_auth"|"database_transient"|"schema_unavailable"|"internal";
export function classifyReadFailure(error:unknown):ReadFailureClass {
 const value=error as {name?:unknown;code?:unknown;cause?:{code?:unknown}}|null;
 if(value?.name==="CacheRevisionChangedError")return "snapshot_changed";
 const code=value?.cause?.code??value?.code;
 if(typeof code!=="string")return "internal";
 if(code==="28P01")return "database_auth";
 if(code==="42P01"||code==="42703")return "schema_unavailable";
 if(["40001","40P01","53300","57P01","08006"].includes(code))return "database_transient";
 return "internal";
}

/** Fixed allowlist only: never serialize the error, message, SQL or cause.
 * `where` must be a route-owned constant, not a request URL or user input. */
export function readFailureDiagnostic(where:string,error:unknown){
 const value=error as {name?:unknown;code?:unknown;cause?:{code?:unknown}}|null;
 const rawCode=value?.cause?.code??value?.code;
 const codes=["23505","23503","22P02","22007","40001","40P01","28P01","42P01","42703","53300","57P01","08006"];
 const names=["TypeError","RangeError","CacheRevisionChangedError","DrizzleQueryError"];
 return {category:classifyReadFailure(error),kind:typeof value?.name==="string"&&names.includes(value.name)?value.name:"Error",dbCode:typeof rawCode==="string"&&codes.includes(rawCode)?rawCode:"other",where:/^[a-zA-Z/ -]{1,100}$/.test(where)?where:"route"};
}

/** Only an explicitly rejected moving-snapshot GET is read once more.
 * No retry for generic 500, permissions, CAS conflicts, or mutations. No sleep,
 * unbounded loop, increased timeout, or stale-success fallback. */
export async function readJsonWithSnapshotRecovery(url:string,fallback:string,fetcher:typeof fetch=fetch):Promise<unknown>{
 for(let attempt=0;attempt<2;attempt++){
  const response=await fetcher(url,{method:"GET",cache:"no-store"});
  const body=await response.json().catch(()=>({}));
  if(response.ok)return body;
  if(attempt===0&&response.status===409&&body?.code==="snapshot_changed")continue;
  throw new Error(typeof body?.error==="string"&&body.error?body.error:fallback);
 }
 throw new Error(fallback);
}
