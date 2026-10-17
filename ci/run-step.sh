#!/usr/bin/env bash
# ci/run-step.sh — run one CI step and, when it fails, publish WHY.
#
# GitHub's runner log archive is not always downloadable (the blob host can be
# unreachable), which turns an intermittent failure into a bare "Process
# completed with exit code 1" — that is exactly how this repo's flaky
# embedded-Postgres suites stayed undiagnosed. This wrapper tees the command's
# output and, on a non-zero exit, writes the tail into the job summary and
# republishes the interesting lines as check annotations, which ARE readable
# from the API (`check-runs/{id}/annotations`) and in the UI.
#
# usage: bash ci/run-step.sh "<title>" <command> [args...]
#   e.g. bash ci/run-step.sh "Typecheck" npm run typecheck
#
# The exit code is always the wrapped command's own. No `set -e` on purpose: the
# status is captured, reported and returned explicitly.

title="${1:-CI step}"
shift

if [ "$#" -eq 0 ]; then
  echo "usage: bash ci/run-step.sh \"<title>\" <command> [args...]" >&2
  exit 64
fi

log="$(mktemp "${TMPDIR:-/tmp}/ci-step-XXXXXX.log")"
trap 'rm -f "$log"' EXIT

"$@" 2>&1 | tee "$log"
code=${PIPESTATUS[0]}

if [ "$code" != "0" ]; then
  {
    echo "## FAILED: ${title} (exit ${code})"
    echo
    echo '```'
    tail -n 80 "$log"
    echo '```'
  } >> "${GITHUB_STEP_SUMMARY:-/dev/null}"

  # Annotation titles may not contain ':' (it terminates the title field).
  safe_title=$(printf '%s' "$title" | sed -e 's/%/%25/g' -e 's/:/-/g' -e 's/\r//g')
  n=0
  while IFS= read -r line; do
    if [ "$n" -ge 25 ]; then
      break
    fi
    safe=$(printf '%s' "$line" | sed -e 's/%/%25/g' -e 's/\r//g' | cut -c1-400)
    if [ -z "$safe" ]; then
      continue
    fi
    echo "::error title=${safe_title} (exit ${code})::${safe}"
    n=$((n + 1))
  done < <(grep -aE "✗|FAIL|Error|error:|npm error|npm ERR|failed|Timed out|timeout|EADDRINUSE|ECONNREFUSED|ENOSPC|Cannot find|not ok|initdb|pg_ctl|drizzle|AssertionError|expected" "$log" | head -25)

  if [ "$n" -eq 0 ]; then
    echo "::error title=${safe_title}::exit ${code} — no diagnostic line matched; see the tail in the job summary"
  fi
fi

exit "$code"
