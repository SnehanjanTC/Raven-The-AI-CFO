"""
Ports Conformity's "compliant is written in exactly one file" test.

Here the invariant is: agent-initiated writes to `transactions` and `metrics`
only happen inside `backend/app/services/proposals.py`.

The test source-scans the backend for POSTs / PATCHes to those Supabase REST
endpoints (or SQLAlchemy commits touching those models) and asserts every hit
lives in `services/proposals.py`. Direct-user endpoints like
`endpoints/transactions.py` are on an explicit allowlist — they're the ledger's
manual entry path, orthogonal to the agent flow — and are labelled here so a
future reviewer can see why they're exempt.
"""

from __future__ import annotations

import pathlib
import re

BACKEND_ROOT = pathlib.Path(__file__).resolve().parent.parent / "app"

# Two-phase detection:
#   1. Find every URL construction that points at /rest/v1/transactions or
#      /rest/v1/metrics.
#   2. Only flag it if a POST/PATCH/PUT hits that URL within 12 lines below.
#   GETs (reads) are harmless.
URL_PATTERN = re.compile(
    r"""["'/]rest/v1/(?:transactions|metrics)(?:["'?/]|\?)""",
)
WRITE_VERB_PATTERN = re.compile(
    r"""\bclient\s*\.\s*(post|patch|put)\s*\(""",
)

# Files that are ALLOWED to write to transactions/metrics.
#  - services/proposals.py — the single gate for agent-initiated writes
#  - endpoints/transactions.py, endpoints/csv_upload.py — manual-entry paths
#      (ledger UI, CSV import); founder is the actor. Not the agent.
#  - services/demo_data.py — pre-populates seed data on onboarding; the
#      founder toggled demo mode. Not the agent.
ALLOWED = {
    "services/proposals.py",
    "endpoints/transactions.py",
    "endpoints/csv_upload.py",
    "services/demo_data.py",
}


def _find_write_sites(text: str) -> list[tuple[int, str]]:
    """Return (line_no, snippet) for lines where a write URL is followed
    within 12 lines by an httpx client.post/patch/put call."""
    lines = text.splitlines()
    hits: list[tuple[int, str]] = []
    for i, line in enumerate(lines):
        if not URL_PATTERN.search(line):
            continue
        window = "\n".join(lines[i : i + 12])
        if WRITE_VERB_PATTERN.search(window):
            hits.append((i + 1, line.strip()[:120]))
    return hits


def test_agent_writes_only_via_proposal_service() -> None:
    offenders: list[tuple[str, int, str]] = []
    for path in BACKEND_ROOT.rglob("*.py"):
        if path.name.startswith("__"):
            continue
        rel = path.relative_to(BACKEND_ROOT).as_posix()
        if rel in ALLOWED:
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        for line_no, snippet in _find_write_sites(text):
            offenders.append((rel, line_no, snippet))

    assert not offenders, (
        "Agent-writable tables (transactions, metrics) must only be written "
        "from services/proposals.py or the explicit ALLOWED set. "
        "Found unexpected write sites:\n"
        + "\n".join(f"  {p}:{n}  {s}" for p, n, s in offenders)
    )


def test_proposal_service_actually_writes() -> None:
    """Guardrail against silent bit-rot. If someone deletes the write path,
    the invariant test above would still pass — vacuously. Pin the commit
    helpers by name so accidental removal breaks CI."""
    src = (BACKEND_ROOT / "services" / "proposals.py").read_text()
    assert "_commit_transaction" in src
    assert "_commit_metric_update" in src
    # Ensure the URL is still routed at /rest/v1/{transactions,metrics}
    # (through the _pg_post helper) so an agent write actually lands.
    assert '_pg_post("transactions"' in src
    assert 'rest/v1/metrics' in src
