import type en from "./messages/en.json";
import bootstrap from "./staged/en-bootstrap.json";
export type Messages=typeof en;
/** Synchronous helper/front-door namespaces only; feature strings arrive with
 * the existing lazy screen boundary, never as missing-key flashes. */
export const englishMessages=bootstrap as unknown as Messages;
export const dictionaries:Record<string,Messages>={en:englishMessages};
export const MESSAGE_LOCALES=["en","uz","ru"] as const;
const listeners=new Set<(locale:string,messages:Messages)=>void>();
export function subscribeMessages(listener:(locale:string,messages:Messages)=>void){listeners.add(listener);return ()=>{listeners.delete(listener);};}
export async function loadMessages(locale:string):Promise<Messages>{
 if(locale==="uz")return(await import("./messages/uz.json")).default as unknown as Messages;
 if(locale==="ru")return(await import("./messages/ru.json")).default as unknown as Messages;
 return {...bootstrap,...(await import("./staged/en-features.json")).default} as Messages;
}
export function registerMessages(locale:string,messages:Messages|null|undefined){
 if(!messages||dictionaries[locale]===messages)return;
 dictionaries[locale]=messages;
}
let englishFeatures:Promise<void>|null=null;
export function ensureEnglishFeatures():Promise<void>{
 return englishFeatures??(englishFeatures=loadMessages("en").then(messages=>{registerMessages("en",messages);for(const listener of listeners)listener("en",messages);}).catch(error=>{englishFeatures=null;throw error;}));
}
/** Resolve translations before the existing lazy feature can render. */
export async function withFeatureMessages<T>(module:Promise<T>):Promise<T>{if(typeof document!=="undefined"&&document.documentElement.lang!=="en")return module;const [loaded]=await Promise.all([module,ensureEnglishFeatures()]);return loaded;}
