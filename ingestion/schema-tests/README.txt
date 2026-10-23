ENEM global preflight — controlled schema review only

Base: 311613ca7b448a2ca64892bad166de1cd086dcaf on the existing technical branch.
No migration was applied remotely. Do not run these commands against Supabase.
The historical installation 20261022182921 is unchanged.

Migration: supabase/migrations/20261023003409_enem_worker_global_preflight.sql
Rollback: supabase/review/enem_worker_global_preflight.rollback.sql (manual only)

The forward migration guards exact existing function and constraint definitions,
installed ledger entry, empty releases/lease and restricted NOLOGIN role. It changes
only the two branch/workflow CHECKs, adds a private assertion with EXECUTE revoked
from consumer/runtime roles, and replaces three existing functions without changing
signatures, owners or ACLs. No table, RLS, credentials, flags or commercial contracts
are changed. CREATE OR REPLACE preserves ACLs on the existing functions.

material(text) now returns:
{contract:'enem-global-preflight-v1',state:'READY',manifest:<digest>,material:[...]}
The Node handler refuses the old unverified array response. Roll out schema before
this runtime, with the worker inactive and empty approval catalog; this is not an
authorization to deploy. The five API wrappers and their signatures stay unchanged.
OIDC is still verified by Node before material; the wrapper still requires the exact
session_user. acquire repeats the verified workload checks without calling the old
state-writing assert_workload until the global assertion has passed.

material validates the entire frozen batch without registering runs/lease/progress.
acquire and execute_one repeat it before their first DML. Short transaction table
locks exclude unrelated writers too, including duplicate-identity phantoms and rights
revocation within each transaction. A five-second lock timeout limits contention. acquire/execute_one require READ COMMITTED
to avoid stale transaction snapshots.
These locks cover shared question/content/source tables, so production contention
must be reviewed. They are never held across RPCs or the whole lease. Each item
revalidates again; a later failure does not roll back previously confirmed items.
No runtime grants, global unique indexes or parallel importer are introduced.

Admission covers approval records, release binding/state/expiry, quarantines, batch
limits, payload hashes and UUID bindings, source/dual publication licenses, official
identity/occurrence/nullable language, alternatives/key, images and existing taxonomy.
This ENEM admission deliberately accepts the reviewed TRANSVERSAL category subset;
other category modes fail closed. It does not change the general platform contract.
PNG byte/hash/dimension/reference/size checks reuse assert_rich_alternatives. Full PNG
CRC/decompression validation remains in the existing Node preflight, before acquire;
the immutable SHA binding is checked again by SQL. Editorial/legal evidence is
required, not inferred or approved by this code.

Duplicates are checked by external identity, occurrence, code, request_id and official
tuple (year, number, application, booklet, nullable language, source URL or official
ENEM origin), plus the existing metadata.import_request_id. Existing
receipts require exact content/alternatives/category/publication readback; they do
not grant permission to update existing questions. Invalid or quarantined later items
block acquisition for the whole batch.

Local tests
- Install the pinned runtime dependency with npm ci --ignore-scripts in ingestion/runtime
  if it is unavailable. No dependency or lockfile change belongs in this patch.
- Use an EMPTY, disposable local PostgreSQL 17 database, no remote connection strings.
- initdb a scratch cluster with no TCP listeners and Unix socket /tmp/rs-enem04-pg.
- psql -h /tmp/rs-enem04-pg -d postgres -v ON_ERROR_STOP=1 -f ingestion/schema-tests/bootstrap.sql
- psql -h /tmp/rs-enem04-pg -d postgres -v ON_ERROR_STOP=1 -f supabase/migrations/20261023003409_enem_worker_global_preflight.sql
- node --test ingestion/schema-tests/global-preflight.test.mjs
- In ingestion/runtime: node --test *.test.mjs
- Stop the disposable cluster afterwards.
bootstrap.sql is a reduced synthetic schema harness with exact captured function
bodies, an auth.uid() null stub and synthetic taxonomy. It is NOT a platform schema
migration or a production clone. Fixtures are synthetic, transactionally rolled back
or cleaned up; no real question content or human approvals are used. The local socket
is fixed; no database host/password/token environment values are read by this test.

Tests include real PostgreSQL compilation/application, READ ONLY material, later-item
rejection with unchanged state snapshots, revocation between material/acquire,
worker mismatch, cross-code identity/tuple collisions, receipt/category drift,
external-writer lock exclusion, NOLOGIN/ACL preservation and forward/rollback roundtrip.
They do not exercise real OIDC/TLS or a live platform deployment.

Before a future authorized remote application: recheck definitions/ACLs, ledger,
empty release state, NOLOGIN and preserved question hashes; require independent SQL
review and backup/rollback approval. Stop on drift; do not bypass guards. Rollback
refuses changed function fingerprints and requires NOLOGIN/empty release state.
Never modify the historical ledger or rerun installation as a shortcut.
