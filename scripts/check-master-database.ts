/** Disposable PostgreSQL proof. No production connection or official-page fetch. */
import EmbeddedPostgres from "embedded-postgres";
import { Client } from "pg";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import assert from "node:assert/strict";

async function main() {
  const port = await new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = (server.address() as { port: number }).port;
      server.close(() => resolve(port));
    });
  });
  const directory = mkdtempSync(join(tmpdir(), "scholarbridge-master-db-"));
  const pg = new EmbeddedPostgres({
    databaseDir: directory,
    user: "test",
    password: "disposable-only",
    port,
    persistent: false,
    onLog: () => {},
    onError: () => {},
  });
  let client: Client | undefined;
  let pool: { end: () => Promise<void> } | undefined;
  try {
    await pg.initialise();
    await pg.start();
    await pg.createDatabase("master_test");
    process.env.DATABASE_URL = `postgresql://test:disposable-only@127.0.0.1:${port}/master_test`;
    client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    const historical = readFileSync(
      "supabase/security_evidence_research_2026-11-06.sql",
      "utf8",
    );
    for (const table of ["catalogue_facts", "official_source_checks"]) {
      const start = historical.indexOf(
        `CREATE TABLE IF NOT EXISTS public.${table}`,
      );
      const end = historical.indexOf(`ALTER TABLE public.${table}`, start);
      assert.ok(start > 0 && end > start);
      await client.query(historical.slice(start, end));
    }
    await client.query(
      "CREATE TABLE public.sources(id serial PRIMARY KEY,domain text,is_official boolean); INSERT INTO public.sources(domain,is_official) VALUES('fictional.example.edu',true)",
    );
    await client.query(
      readFileSync(
        "supabase/official_source_program_checks_2026-11-07.sql",
        "utf8",
      ),
    );
    await client.query(
      "INSERT INTO public.catalogue_facts(entity_type,entity_id,field_key,value_numeric,source_url,verification_status,value_type,verified_at,admission_cycle) SELECT CASE WHEN n<=210 THEN 'university' WHEN n<=225 THEN 'program' ELSE 'scholarship' END,n,'min_ielts',7,'https://fictional.example.edu/requirements','verified','official_requirement','2026-01-01','2027' FROM generate_series(1,235) n",
    );
    const cacheStart=historical.indexOf("CREATE TABLE IF NOT EXISTS public.cache_revisions");
    assert.ok(cacheStart>0);
    await client.query(historical.slice(cacheStart,historical.indexOf(";",cacheStart)+1));
    const databaseModule = await import("../src/db");
    pool = databaseModule.pool;
    const {DbCacheRevisionStore}=await import("../src/lib/cacheRevision");
    const cacheA=new DbCacheRevisionStore(),cacheB=new DbCacheRevisionStore();
    assert.equal(await cacheB.read("profile:7"),1);
    assert.equal(await cacheA.bump("profile:7","disposable fixture first bump"),2);
    assert.equal(await cacheB.read("profile:7"),2,"second store observes first persisted bump");
    const bumps=await Promise.all([cacheA.bump("profile:7","A"),cacheB.bump("profile:7","B")]);
    assert.deepEqual(bumps.sort(),[3,4]);
    assert.equal(await cacheB.read("profile:8"),1,"profile scopes remain isolated");

    await client.query("CREATE TABLE public.student_profiles(id integer PRIMARY KEY);INSERT INTO student_profiles VALUES(7);CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE ROLE postgres");
    await client.query(readFileSync("supabase/fact_scope_cas_2026-11-07.sql","utf8"));
    const { loadOfficialSourceTargets } =
      await import("../src/lib/officialSourceAdapter.server");
    const first = await loadOfficialSourceTargets("universities");
    assert.equal(first.length, 200);
    assert.ok(first.every((row) => row.entityType !== "scholarship"));
    assert.deepEqual(
      await loadOfficialSourceTargets("universities"),
      first,
      "stable ordering before any check",
    );
    for (const row of first)
      await client.query(
        "INSERT INTO public.official_source_checks(entity_type,entity_id,field_key,source_url,fact_id,checked_at) VALUES($1,$2,$3,$4,$5,now())",
        [row.entityType, row.entityId, row.fieldKey, row.sourceUrl, row.factId],
      );
    const second = await loadOfficialSourceTargets("universities");
    const firstIds = new Set(first.map((row) => row.factId));
    assert.ok(
      second.slice(0, 25).every((row) => !firstIds.has(row.factId)),
      "unseen due facts precede recently checked facts",
    );
    assert.equal(
      (await loadOfficialSourceTargets("scholarships")).length,
      10,
      "SQL scope prevents university batch starvation",
    );
    assert.ok(
      [...first, ...second.slice(0, 25)].some(
        (row) => row.entityType === "program",
      ),
      "programme facts participate",
    );
    const { loadCatalogueFacts } =
      await import("../src/lib/catalogueFacts.server");
    const facts = await loadCatalogueFacts("program", [211]);
    assert.equal(
      facts.get(211)?.[0].publisherOfficial,
      true,
      "batched source domain proof is actually queried",
    );
    assert.equal(facts.get(211)?.[0].valueNumeric, 7);
    await (await import("./proofs/fact-cas")).proveFactCAS(client);
    await client.query(
      "CREATE TABLE public.user_documents(id integer PRIMARY KEY)",
    );

    await client.query(
      readFileSync("supabase/document_review_records_2026-11-07.sql", "utf8"),
    );
    for (const role of ["anon", "authenticated"]) {
      const result: { rows: { allowed: boolean }[] } = await client.query(
        "SELECT has_table_privilege($1,'public.document_review_records','SELECT') AS allowed",
        [role],
      );
      assert.equal(result.rows[0].allowed, false);
      assert.equal((await client.query("SELECT has_table_privilege($1,'public.catalogue_fact_reviews','SELECT') AS allowed",[role])).rows[0].allowed,false);
    }
    await(await import("./proofs/cache-revision-races")).proveCacheRevisionRaces(client);
    // An optional evidence schema can be absent during rollout. Helpers used
    // inside a transaction must throw to its SAVEPOINT, not swallow 42P01 and
    // leave every later statement with 25P02. Keep pool limits unchanged.
    const {sql}=await import("drizzle-orm");
    const {loadDocumentReviews}=await import("../src/lib/documentReviews.server");
    await client.query("ALTER TABLE catalogue_facts RENAME TO fixture_hidden_catalogue_facts");
    try{
      await databaseModule.db.transaction(async tx=>{
        await assert.rejects(()=>tx.transaction(inner=>loadCatalogueFacts("program",[211],inner)),(error:unknown)=>{const e=error as {code?:string;cause?:{code?:string}};return (e.cause?.code??e.code)==="42P01";});
        assert.equal((await tx.execute(sql`SELECT 1 AS alive`)).rows[0].alive,1,"missing catalogue table must not poison parent tx");
      });
    }finally{await client.query("ALTER TABLE fixture_hidden_catalogue_facts RENAME TO catalogue_facts");}
    await client.query("ALTER TABLE document_review_records RENAME TO fixture_hidden_document_reviews");
    try{
      await databaseModule.db.transaction(async tx=>{
        await assert.rejects(()=>tx.transaction(inner=>loadDocumentReviews([1],inner)),(error:unknown)=>{const e=error as {code?:string;cause?:{code?:string}};return (e.cause?.code??e.code)==="42P01";});
        assert.equal((await tx.execute(sql`SELECT 1 AS alive`)).rows[0].alive,1,"missing review table must not poison parent tx");
      });
    }finally{await client.query("ALTER TABLE fixture_hidden_document_reviews RENAME TO document_review_records");}
    console.log("PASS missing optional catalogue/review schema: savepoint rollback preserves live parent transactions; no permission bypass.");
    console.log(
      "PASS: actual additive SQL, UUID FK, deterministic >200 due queue, SQL scope, programme inclusion, batched publisher proof and private review grants (disposable PostgreSQL).",
    );
  } finally {
    await client?.end().catch(() => {});
    await pool?.end().catch(() => {});
    await pg.stop().catch(() => {});
    rmSync(directory, { recursive: true, force: true });
  }
}
void main().catch((error) => {
  console.error(
    "FAIL disposable master database:",
    error instanceof Error ? error.message : "unknown",
  );
  process.exit(1);
});
