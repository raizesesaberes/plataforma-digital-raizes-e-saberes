# Institutional backend V2, in review

This document and `mission_institutional.v2.review.sql` supersede V1's single-week plan and direct restricted author publication. No remote migration, function deployment, production assignment or XP write has been performed.

## Changes from V1

- Plans are keyed by teacher + class + week_start. Saving a new week does not overwrite another week's draft or published organization.
- `mission_teacher_get_plan_v1(p_class_id uuid,p_week date default null)` gets that week. Without p_week, returns latest saved week; callers should pass explicitly.
- `mission_teacher_save_plan_v1(p_class_id uuid,p_document jsonb,p_expected_version integer)` uses document.week; optimistic version is per week.
- `mission_teacher_publish_plan_v1(p_class_id uuid,p_expected_version integer,p_request_id uuid,p_week date default null)` publishes the selected week transactionally. If multiple weeks exist, omitted week fails MISSION_WEEK_REQUIRED. Existing request-id receipts remain idempotent.
- Old direct-client `mission_teacher_publish_revision_v1` and its private implementation are revoked. Teacher-authored publication must pass through the full, trusted engine validator.
- New `mission_teacher_get_draft_for_publish_v1(p_draft_id uuid)` authenticates author and live class access, and returns the immutable draft/base source strings and SHA256 identities. No other teacher's draft is exposed.
- New `mission_service_finalize_revision_v1(p_teacher_auth_id uuid,p_draft_id uuid,p_draft_sha256 text,p_base_sha256 text,p_source_json text,p_content_hash text)` is executable only by service_role. Browser roles cannot invoke it. The Edge function derives teacher ID from verified getUser, never a request-body identity. Database finalization rechecks author/class membership and both immutable source hashes, binds final content to the draft, serializes on draft ID, and returns the same immutable revision on exact replay.
- Draft save/list responses include source_sha256.
- Membership interval checks use clock_timestamp. Blocking write paths recheck membership after advisory locks. Artwork rechecks student membership/active interval after its lock. Explicit cancellation retains history.

## Planned Edge contract

`supabase.functions.invoke('mission-publish-revision', {body:{draft_id, expected_draft_sha256?}})` returns the standard revision JSON on success. Get/list/save drafts remain regular authenticated RPCs. Do not fall back to the revoked direct-client publish RPC or treat a browser validator result as server approval.

The Edge handler must use only platform-provided SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY at runtime. No secret is embedded in files, tools, client responses or logs. Authenticate via getUser for the incoming token, fetch the draft with that same user's token, verify ownership and hashes, execute the pure V28 gameSchema and semantic refinements, then use service_role only for finalization. Invalid authorization, cross-owner access, structural/semantic errors and source/hash drift must not finalize.

Pure V28 source and real397-record seed were transferred with verified hashes. The server uses the complete strict Zod schema and semantic refinements. It rejects transformations/defaults/stripping rather than persisting raw bytes different from validated input. Asset hydration is restricted to existing trusted rsplay references; original source bytes remain pinned by SHA256.

## Verified source identities

Source path: `studio-integrado-v28/rs-play-04/src/domain`, Zod4.6.7.

- content.ts: 8638a86a4db3c4ead8cffdf9ee86b899f9f4cad579d66f305f75bda70b82d48f
- fields.ts: 83df5bc5222bcc61a7ddc913d1891f8a0d6c620681598a8ad4ef388eb062fbaa
- extended-content.ts: 978e2a84b4350ac9db180abb2b69f6ecbf10db07cf9095a35155cf52a0f5ddd6
- grid.ts: 095acc6c575cd50ad95ccff208b90c19e293cddc0a20b0587f25d90c1b954f07
- bundled-images.ts: 5e7d5601830fa194041e4c344a82b6f07ae59bbb69ed6c5b8835848793de00ec

Runtime worker independently compared source semantics with active minified Q; this is not a source rebuild/byte-equivalence assertion.

Verified real397-record seed is present in cloud:
- catalog seed SHA256: 9985d3f5b13a703a9f3127e37d82772d2d56e40b31a30959a13193684f01df02
- V28 catalog source SHA256: 361202d9b412813230728c435f6c37248fdd46a636824f6d74303e689091e199
- Colorir catalog source SHA256: 8268f4b3ba3ef27ce952c667c34b6199ebf555f7c0d490e770f615633515821c

20 records are explicit demonstration/pilot/gallery without an unambiguous curricular grade. They remain preserved, not silently mapped or assigned. Other377 are grade-mapped, including8 Colorir. All source pedagogical_status remains draft; content hashes do not establish pedagogical approval.

## Verification status

`test-v2.mjs` currently passes54 isolated PGlite tests, including multiweek preservation, service-only finalizer ACL, cross-owner denial, stale draft/base hashes, final payload mismatch, idempotent finalization and revocation. V1's46-test result is historical; do not report it as current final test total. Real multi-session PostgreSQL races, live authenticated browser flows remain pending. Production accounts/classes have not been used as fixtures.


## Additional verification and release controls

- All397 real catalogue records validate (389V28 +8Colorir), with matching exact serialized hashes.
-30 semantic mutation cases exercise valid edits and invalid relationship/geometry/unknown-key/normalization cases.
-11 real-content author publications exercise actual Edge validator + SQL finalizer + assignment/open, with mocked identity issuer only.
-14 Edge HTTP/authentication tests cover invalid token, owner mismatch, source drift, malformed/oversize body, replay and service-finalization isolation.
-227 provenance bindings resolve26 synthetic editorial records by natural official source IDs, replay safely, and remain immutable/private. Provenance alone grants no license.
- Private plans preserve multiple weeks, independent selected_revision_ids and incomplete schedule fields. Publication requires complete valid cards and rolls back the whole transaction on failure.
- Private release_control defaults false. There is no client enabling endpoint. No remote DDL, content registration, assignment or deployment has occurred.
- License policy explicitly approved:227 derived missions follow their source BOOK entitlement; Colorir follows existing ATIVIDADES/PRINTABLE.162 other V28 entries remain unassignable pending origin review. The final canonical entitlement adapter and8 PRINTABLE registrations are being prepared; do not enable release until reviewed and tested.
- No official completion/XP endpoint is introduced. Static assets can be cached; institutional assignment access and active runtime are revalidated, not represented as DRM.
