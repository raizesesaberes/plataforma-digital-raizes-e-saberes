# Formação docente release, 2026-11-11

Base: production commit `c2d112908a8d357ede1ffca75a13b8be929e300c`.

## Included

- Protected own-course hierarchy with on-demand playback, active profile/school/membership checks and the existing strict TRAINING entitlement model.
- Two verified private video objects: Aula 1 published, Aula 2 in administrative review only. No contract, entitlement or school license has been enabled by this release.
- Public curation: 28 new courses, four reverified existing offers, official sources and conditional external certification. One unavailable historical offer archived without deleting its metadata.
- Personal external courses with owner-only storage, explicit self-declared completion and reversible archive. Private PDF/PNG/JPEG certificate evidence, maximum 10 MiB, signed download valid for 60 seconds. No authenticity or Raízes-issued certificate claim.
- Original scalable editorial illustrations. No external provider art or course materials copied.

## Verification

- Teacher training: 12 live PostgreSQL authorization groups passed in a rollback-only transaction. Licenses, profiles and memberships remained unchanged.
- Personal learning: 14 live PostgreSQL isolation groups passed in a rollback-only transaction. No Auth users or certificate file objects were created.
- Independent review closed ambiguous insert cleanup, session-switch response and concurrent archive/upload races.
- Local synthetic browser QA covers desktop 1440 px and mobile 390/320 px, navigation, denial, session expiry, refresh, logout, filter/detail flow and certificate management.
- Hosted endpoints reject anonymous/forged sessions (401), allow the production-origin preflight (204) and reject other origins (403).
- Static build remains allowlisted and hash-verified. Reversing only the reviewed Formation template changes restores the exact previous public platform menu; the private App beta remains unadvertised. Existing Carla media hashes remain unchanged.

## Explicit limits

Authenticated production browser playback/seek and real owner upload/download still require a signed-in educator/admin session. Local browser fixtures and SQL role tests are not described as end-to-end authentication tests. Safari and assistive-technology checks were not run. File signatures are not antivirus scanning or certificate authenticity validation.

## Rollback

Frontend: restore production deployment `dpl_3RhEma72an2aHaSLaZxD8vZbMxTi`.

Backend: `supabase/review/teacher_training_disable_delivery.sql` revokes the new delivery endpoints and readiness without deleting material. `qa/personal-learning/rollback.sql` revokes access while preserving personal data. Remove/disable the corresponding Edge functions and UI entrypoints together. Existing signed media links expire after at most 300 seconds; certificate links after 60 seconds. No destructive rollback is included.

## Adding the next lesson

Upload to the private videos/audio bucket using an immutable lesson-specific SHA-256 object name. Download and compare the full digest and size before marking the binding ready. Insert the canonical TRAINING content and private hierarchy metadata in review state, using the existing entitlement/category rules. Publish only after editorial approval. The classroom derives its tree from actual authorized records; no empty lesson placeholders or public media links are needed. Never enable a school or contract entitlement as a side effect of ingesting a lesson.

## Revision: direct platform access and clear navigation (2026-11-11)

This revision supersedes the initial separate TRAINING-license requirement and Aula 2 review-only availability above, at the owner's explicit direction.

- University is a brief introduction with collection lessons, external courses, and personal learning cards. External curation remains public in its own searchable panel; official-source links and all 32 verified active courses are preserved.
- Own lessons have title and hierarchy filters. Both current videos are published for active authorized teachers. Publishing Aula 2 does not assert pedagogical/listening approval.
- The server continues checking authoritative active professor profile, teacher, school and current membership, canonical publication, owner scope, BLOCK and EMBARGO. It no longer requires an extra TRAINING contract. No contracts, entitlements, school grants, identities or memberships are changed.
- A shared refresh coordinator reuses the existing platform session, serializes refresh between clients/tabs, preserves sessions during outages and rejects logout/account-switch races. Demonstration flags and orphan local tokens never authorize paid content.
- Family/student role `educacao_infantil` is excluded from the professional personal-course panel in both owner-only RLS and Edge policy.
- Verification: 239 Node tests, separate Formation unit suite, 22 live rollback-only SQL groups, responsive synthetic browser suites and static allowlist build passed. Raw evidence remains private and is not part of the public runtime or repository release.
- Applied migration: `20261111114824_teacher_training_platform_access.sql`; personal-learning Edge v2. Teacher-training Edge and private media bytes unchanged.

Revision rollback: restore frontend deployment `dpl_GQDwKZ47Vfe7crS69PuzUaD3TtBu` (commit `562e1ed5b5bb61da987e929d1b09e5e3d749c9e3`), and if required apply `supabase/review/teacher_training_platform_access_rollback.sql` to restore the old access gate/Aula 2 review. The family-role security correction intentionally remains. No files or user learning records are deleted.
