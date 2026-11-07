// Start an already-built REAL Next application in the disposable E2E harness.
// A cached artifact allows before/after measurements without reverting source,
// changing branches or rebuilding the historical baseline with newer code.
import next from "next";
import {createServer} from "node:http";
import {readFileSync} from "node:fs";
import {resolve,relative,sep,join} from "node:path";
const root=process.cwd(),artifact=resolve(root,process.argv[2]??".next"),path=relative(root,artifact);
if(path===".."||path.startsWith(`..${sep}`)||path.startsWith(sep))throw new Error("E2E artifact must be inside this workspace");
const port=Number(process.env.PORT);if(!Number.isSafeInteger(port)||port<1024)throw new Error("An allocated E2E PORT is required");
const {config}=JSON.parse(readFileSync(join(artifact,"required-server-files.json"),"utf8"));
const app=next({dev:false,dir:root,hostname:"127.0.0.1",port,conf:{...config,distDir:path}});
await app.prepare();const server=createServer(app.getRequestHandler());
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(port,"127.0.0.1",resolve);});
console.log("Disposable E2E server: archived production build loaded; no source rebuild.");
let closing=false;
async function close(){if(closing)return;closing=true;server.close();await app.close();}
process.on("SIGTERM",()=>void close());process.on("SIGINT",()=>void close());
