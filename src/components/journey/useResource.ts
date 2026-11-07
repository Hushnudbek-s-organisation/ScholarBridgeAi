"use client";

/**
 * One tiny data-loading hook for every Journey panel.
 *
 * WHY
 * ---
 * Eleven panels each need the same three things: load on mount, show a
 * spinner, show an error, and reload after a mutation. Written inline that is
 * ~30 duplicated lines per panel — and the copy-paste version tripped the
 * React compiler's `set-state-in-effect` rule, because a `useCallback` loader
 * invoked directly from an effect reads as a synchronous state write.
 *
 * This hook keeps the fetch inside the effect (state writes happen after the
 * `await`, behind a `live` guard so a fast tab switch cannot set state on an
 * unmounted panel) and exposes an explicit `reload` for event handlers.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { cachedFetchJson, invalidateClientCache } from "@/lib/clientCache";

export interface Resource<T> {
  data: T;
  loading: boolean;
  error: string | null;
  /** Re-fetch with a spinner — call after a create / update / delete. */
  reload: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T>>;
}

function message(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

const sameDependencies=(a:React.DependencyList,b:React.DependencyList)=>a.length===b.length&&a.every((value,index)=>Object.is(value,b[index]));

export function useResource<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList,
  options: { initial: T; errorFallback?: string; enabled?: boolean }
): Resource<T> {
  const [state,setState]=useState(()=>({data:options.initial,dataDeps:deps,error:null as string|null,errorDeps:deps,loading:true}));
  const sequence=useRef(0);
  const invalidateRequests=useCallback(()=>{sequence.current++;},[]);
  const latest=useRef({fetcher,deps,options});
  useEffect(()=>{latest.current={fetcher,deps,options};});

  useEffect(()=>{
    const request=++sequence.current;
    const current=latest.current;
    // Disabled scopes (e.g. no authenticated owner) do not fetch or schedule
    // a synthetic empty-success render. Enablement belongs in the caller deps.
    if(current.options.enabled===false)return invalidateRequests;
    let live=true;
    void (async()=>{
      try{
        const data=await current.fetcher();
        if(live&&request===sequence.current)setState({data,dataDeps:current.deps,error:null,errorDeps:current.deps,loading:false});
      }catch(error){
        if(live&&request===sequence.current)setState(previous=>({...previous,error:message(error,current.options.errorFallback??"Something went wrong"),errorDeps:current.deps,loading:false}));
      }
    })();
    // Dependency changes and unmount invalidate reloads too, not just this read.
    return ()=>{live=false;invalidateRequests();};
    // The caller supplies the scope, as with React's own dependency list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },deps);

  const reload=useCallback(async()=>{
    const request=++sequence.current,current=latest.current;
    setState(previous=>({...previous,loading:true,error:null}));
    invalidateClientCache();
    try{
      const data=await current.fetcher();
      if(request===sequence.current)setState({data,dataDeps:current.deps,error:null,errorDeps:current.deps,loading:false});
    }catch(error){
      if(request===sequence.current)setState(previous=>({...previous,error:message(error,current.options.errorFallback??"Something went wrong"),errorDeps:current.deps,loading:false}));
    }
  },[]);
  const setData=useCallback<React.Dispatch<React.SetStateAction<T>>>(action=>{
    const current=latest.current;
    setState(previous=>{
      const data=sameDependencies(previous.dataDeps,current.deps)?previous.data:current.options.initial;
      return {...previous,data:typeof action==="function"?(action as (value:T)=>T)(data):action,dataDeps:current.deps};
    });
  },[]);
  const dataMatches=sameDependencies(state.dataDeps,deps);
  const error=state.error&&sameDependencies(state.errorDeps,deps)?state.error:null;
  // Mask on the first render of a new owner/application/scenario, before effects
  // run. An old success/error must never appear under new scope controls.
  return {data:dataMatches?state.data:options.initial,loading:state.loading||(!dataMatches&&!error),error,reload,setData};
}

/**
 * `fetch` + JSON + throw-on-error, in the shape `useResource` expects.
 * Reads go through the 15-second client cache (tab switches are instant);
 * every `sendJson` mutation invalidates it, and `opts.noCache` forces a
 * fresh request for callers that mutate through raw `fetch` themselves.
 */
export async function getJson<T>(
  url: string,
  fallback: string,
  opts?: { noCache?: boolean }
): Promise<T> {
  return cachedFetchJson<T>(url, fallback, opts?.noCache ? 0 : undefined);
}

export async function sendJson<T>(
  url: string,
  init: RequestInit,
  fallback: string
): Promise<T> {
  // Any mutation attempt (even a failing one) may have changed server state,
  // so the shared GET cache is cleared before the request goes out.
  invalidateClientCache();
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || fallback);
  return json as T;
}
