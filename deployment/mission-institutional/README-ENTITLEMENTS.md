# Mission entitlement complements, review candidate 2026-11-09

No remote writes or deployment were performed. Original V2/seed/source-bindings files are preserved. Release control remains false. No tenant license is created by these complements.

## Apply order after review

1. `mission_institutional.v2.review.sql` (fresh install; V2 itself is not replayable).
2. `catalog-seed.review.sql`.
3. `source-bindings.review.sql` (227 BOOK root provenance links).
4. `colorir-registration.review.sql` (8 exact hash-pinned Colorir roots, deterministic PRINTABLE content IDs, transversal EI2/EI3/EI4/EI5 taxonomy, immutable provenance; replay never republishes a withdrawn item).
5. `mission_entitlements.complement.review.sql` (canonical license checks across catalog, assignment, student open, draft list/save/get, service finalization, private selections and artwork).
6. `mission_prints.complement.review.sql` (frontend's `mission_print_catalog_v1()` and `mission_print_open_v1(p_revision_id uuid)`, no assignment requirement or writes).
7. Separately reviewed Edge deployment and explicit release decision. None of the above enables release.

Complements 4–6 are idempotent and exercised twice. The registration preserves pedagogical_status=draft. Its editorial PUBLISHED records make the existing PRINTABLE license applicable; this is delivery registration, not a claim of pedagogical approval or a contract grant.

## Authorization and limits

`school_category_private.authorized_items_for_context` is the existing canonical authority. Current actor context is checked using the canonical actor resolver. The service-only finalizer validates its explicit teacher against live memberships and builds the same single-class taxonomy context without mutating JWT claims. Source bindings require GLOBAL_RAIZES BOOK for 227 missions or GLOBAL_RAIZES PRINTABLE for Colorir. Owned revisions retain their original root and ownership restrictions. All 162 unmapped V28 roots remain denied. Student author-derived access is by live assignment plus original source entitlement, not source author identity.

License checks run again after assignment/draft/artwork/finalization advisory locks. Assignment rechecks the release switch after the lock. The canonical resolver uses its existing transaction-time/contract-date semantics; these complements do not redefine license expiry. Private plan retrieval retains historical IDs, not snapshots. Cancel remains available to authorized teachers even if licenses were withdrawn.

Infantil still has no end date. The prints menu requires an authorized Infantil class/enrollment and a PRINTABLE license; it does not infer a child age, create assignments, write artwork, record completion or XP. Preview artwork remains temporary. The frontend hydrates colorir -> coloring from the returned pinned snapshot_json.

### Legacy compatibility blocker

Read-only production count on 2026-11-09: 9 active schools, 6 adopted by contract_operations, 3 nonadopted with 4 active classes. These are counts, not identified fixtures. The legacy content_category_legacy_resource_allowed gate returns true for published editorial items outside dynamic membership; it does not establish a BOOK contract/license. The canonical active_rules_for_context requires adopted school category entitlements. Therefore nonadopted schools fail closed for these mission APIs. No policy to manufacture/grant a missing license was introduced. Root coordinator accepted completing the safe adapter while explicitly disclosing this impact. Do not silently claim full legacy parity.

The canonical student actor selects its latest active enrollment. Multi-enrollment access is therefore limited to that context, even if the V2 membership predicate accepts more enrollments. This inherits current canonical behavior rather than widening authorization.

## Verification

Run from this directory: `node test-entitlements.mjs`.

25 grouped integrated checks pass on PGlite 0.3.14: exact registrations/replay, no license, release default, PRINTABLE and BOOK distinction, source inheritance, owned revision isolation, all162 unmapped roots, positive catalog/assign/open, real Edge validation + service finalizer, drafts, publication, artwork, block/revocation, contract/entitlement expiry, module disablement, atomic plan publication failure/restoration, and teacher/student print list/open including anon denial. Fixtures are synthetic only. `canonical-functions.test.sql` contains the production resolver bodies unchanged from read-only introspection, plus `canonical-fixture.test.sql` holds synthetic table shapes and exact in_scope/superseded bodies. It is TEST ONLY, never a migration.

Regressions rerun: V2 54 checks; Edge HTTP 14 checks (mock validator, as documented); real catalog 397 validated records,30 semantic mutations,11 real Edge+SQL author publication flows. Their existing tests intentionally exercise the original V2 separately from the entitlement complement; do not confuse those permissive V2 fixtures with final authorization tests.

Logs: `test-entitlements-results.log`, `test-v2-regression-entitlement.log`, `test-edge-regression-entitlement.log`, `test-real-catalog-regression-entitlement.log`.

No live user accounts, production class fixtures, remote mutations, multi-session race verification or live authenticated-browser assertions are included. `test-db-adapter.mjs` optionally uses pg.Client when MISSION_TEST_DATABASE_URL is set, restricted to loopback and a disposable mission_test* database. For a local Unix socket, also set MISSION_TEST_PGSOCKET to an absolute path without NUL; retain a loopback mission_test* URL for database, user and port. All URL query parameters/fragments are rejected and pg.Client receives explicit connection options (not connectionString). Install the pg driver in the test machine if required. Tests create roles/schema and need a fresh disposable database/cluster; never point at production. The coordinator is arranging separate PostgreSQL multi-session race tests.

Read-only evidence: `live-entitlement-audit.json`, `live-canonical-functions.json`. Neither contains credentials or personal student/teacher records. Supabase changelog and Database Functions documentation reviewed; no new SDK/CLI deployment behavior used. CLI is not installed here, so these are explicit review SQL complements, not invented CLI migration-history entries.
