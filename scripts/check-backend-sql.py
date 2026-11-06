"""Read-only PostgreSQL grammar check. Never connects to a database or executes SQL.

Optional tooling (not a runtime dependency):
  python -m pip install --target .cache/backend-sql-parser pglast==8.7
  PYTHONPATH=.cache/backend-sql-parser python scripts/check-backend-sql.py

Parsing is not execution/semantic verification, migration ordering validation,
PL/pgSQL function-body compilation, or proof of compatibility with every server.
"""
import hashlib
import json
from pathlib import Path

import pglast
from pglast import parse_sql

results = []
for root in ("supabase", "archive/supabase"):
    for path in sorted(Path(root).rglob("*.sql")):
        data = path.read_bytes()
        # role is explicit: recovery/rollback files are PARSED for grammar like
        # everything else, but are NEVER applied by this tool. A grammar parse
        # is not a migration run.
        role = "grammar_only"
        if "rollback" in path.name or "recovery" in path.name:
            role = "recovery_grammar_only"
        result = {"path": str(path), "sha256": hashlib.sha256(data).hexdigest(),
                  "archived": root.startswith("archive/"), "role": role, "ok": True}
        try:
            result["statements"] = len(parse_sql(data.decode("utf8")))
        except Exception as error:
            result.update(ok=False, error=str(error))
        results.append(result)
summary = {"files": len(results), "passed": sum(row["ok"] for row in results), "failed": sum(not row["ok"] for row in results), "active": sum(not row["archived"] for row in results), "archived": sum(row["archived"] for row in results), "parser": f"pglast {pglast.__version__}", "method": "Read-only PostgreSQL grammar parse; no SQL execution, production access or PL/pgSQL body compilation."}
output = Path("test-results/backend/backend-sql-grammar.json")
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps({"summary": summary, "files": results}, indent=2) + "\n")
print(json.dumps(summary, indent=2))
raise SystemExit(0 if summary["failed"] == 0 else 1)
