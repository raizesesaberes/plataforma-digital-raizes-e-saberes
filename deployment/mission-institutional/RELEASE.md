# Missão do Dia e Colorir: release package

This package adds authenticated teacher planning and student assignments to the existing Raízes e Saberes platform. It has not been deployed. The production database remains unchanged and the release switch defaults to false.

## Verified candidate

- Frontend: 14 unit tests; syntax checks; 5,513 build-manifest files verified.
- Browser: desktop 1440 and mobile 390, real Studio/Colorir engines with synthetic RPCs, zero page errors. Direct Studio entry points are blocked before loading the interactive bundle.
- Runtime isolation: snapshot editing and asynchronous save acknowledgments, no browser-storage persistence, altered-content rejection.
- Backend: 54 original V2 checks; 397 real catalog entries and 30 semantic mutation cases; 11 integrated author publications; 14 Edge HTTP/auth checks.
- Final entitlement integration: 25 checks using unchanged canonical authorization functions and synthetic records, also passed on PostgreSQL 17.6.
- PostgreSQL multi-session tests: 11 concurrency checks and 4 service-finalizer checks passed, including observed lock waits and revocation while waiting. No production users/classes were used as fixtures.

Browser RPCs and identity issuer fixtures are synthetic. These checks are not a claim that the production Edge function or authenticated production writes were tested.

## License behavior

227 derived roots follow their verified source BOOK entitlement. Eight Colorir roots follow PRINTABLE. The 162 unbound V28 roots cannot be assigned. Infantil has no assignment deadline. No tenant entitlement is created or expanded.

The canonical resolver currently covers six adopted schools. Three active nonadopted schools, with four active classes, fail closed because the legacy gate does not prove a source-specific license. These require separate license verification. Student multi-enrollment behavior follows the canonical latest-active-enrollment rule.

Static assets are not DRM. The institutional interactive entry points require the platform's authenticated workflow; the Studio fallback gallery is disabled in this copy.

## Deployment and recovery

Apply the six SQL files in README-ENTITLEMENTS.md order, retaining release_control.enabled=false. Deploy the matching mission-publish-revision Edge source with JWT verification enabled and verify its authentication rejection and grants. Deploy the exact tested frontend commit, check production routes and manifest identities, then enable release only after all checks pass.

If release must be stopped, disable mission_private.release_control. Preserve plans, assignments, revisions and artwork for recovery. Do not delete data or alter licenses as a rollback shortcut.

`README-V2.md` and `README-ENTITLEMENTS.md` retain historical review notes. Test fixture SQL is not a migration. `verification/` logs contain synthetic-only results; local machine paths in logs were replaced with $QA.

For isolated tests run `npm ci --ignore-scripts && npm test` in this directory. PostgreSQL race scripts live in postgres-qa; finalizer-concurrency imports ../edge/validate.ts. Use a disposable local PostgreSQL 17.6 cluster only, with the fixture suite initialized first. See postgres-qa/QA-REPORT.md for the tested execution order.
