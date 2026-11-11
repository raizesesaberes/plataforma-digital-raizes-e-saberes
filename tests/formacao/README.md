# Formação docente frontend validation

All tests are local and synthetic. They never sign in, issue a real media URL, change a school license, or publish a lesson.

```sh
node tests/formacao/unit.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs CHROMIUM_PATH=/absolute/path/to/chrome node tests/formacao/browser.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs CHROMIUM_PATH=/absolute/path/to/chrome node tests/formacao/gateway-browser.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs CHROMIUM_PATH=/absolute/path/to/chrome node tests/formacao/navigation-browser.mjs
```

- `unit.mjs`: authenticated client contract, live-server authority, denied licenses, unpublished teacher filtering, asset URL origin/path, session refresh, concurrent logout, lesson grouping and durations.
- `browser.mjs`: guest, legacy access-denied response, admin, teacher with unpublished content excluded, teacher with both lessons published, empty/error/denied states at 1440, 390 and 320 px; search by title and collection/component, empty results and reset; keyboard selection; browser Back; private asset requested only by user action; canceled/stale response; retry; mock media element lifecycle; expired session and cross-tab logout; no horizontal overflow or JavaScript errors. The media element and API are test doubles. Playback itself is not verified.
- `gateway-browser.mjs`: canonical University entrance vs external panel, hash Back/Forward, `?curso` and four course deep links, actual local public University scripts and course data; retired teacher Formation renderer absent; all four course-detail links; desktop and mobile.
- `navigation-browser.mjs`: actual teacher menu with a synthetic session; clean/HTML paths and formação/formacao/universidade aliases; replace/history Back/Forward/popstate; hash navigation; role-aware panel exits; protected collections and personal-space home returns; welcome remount with one storage listener. Runs at 1440/390/320, with all external requests blocked or synthetic. Outputs go to `/tmp/formacao-navigation-qa-20261111` by default.
- `evidence/`: screenshots and machine-readable reports from the latest run. Lesson data in screenshots is synthetic UI test data aligned to current supplied metadata, not evidence of a production entitlement or playable upload.

Actual production login, real signed media playback/seek/expiry, Safari and assistive technology verification remain deployment checks. No completion record or Raízes certificate issuance is implemented or claimed.
