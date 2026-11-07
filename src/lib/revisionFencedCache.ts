import type {AsyncTtlCache} from "./asyncTtlCache";
export class CacheRevisionChangedError extends Error{constructor(){super("Data changed during both bounded snapshot attempts; retry instead of serving an old successful snapshot");this.name="CacheRevisionChangedError";}}
/** Fence completion as well as cache lookup. One bounded retry; concurrent
 * writes cannot publish an old in-flight load under the newer revision. */
export async function revisionFencedCache<T>(cache:AsyncTtlCache<string,T>,key:()=>Promise<string>,load:()=>Promise<T>):Promise<T>{
 for(let attempt=0;attempt<2;attempt++){
  const before=await key(),value=await cache.getOrCreate(before,load);
  if(before===await key())return value;
  cache.invalidate(before);
 }
 throw new CacheRevisionChangedError();
}
