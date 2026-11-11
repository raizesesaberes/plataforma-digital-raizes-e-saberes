# Typography regression checks

No installation required. All browser work is local and synthetic. No production login, user profile, remote font download, entitlement, database or deployment is used.

Run from repository root:

```sh
node tests/typography/static.mjs
PLAYWRIGHT_MODULE=/existing/path/to/playwright/index.mjs CHROMIUM_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node tests/typography/browser.mjs
```

`static.mjs` fixes the original reviewed commit as the comparison source and verifies that shared styles retain every non-family declaration byte-for-byte. It also checks the single home caption change, 104 reviewed shorthand-family substitutions (with identical size/weight/line-height prefixes), and the exception inventory.

`browser.mjs` serves original sources from that commit, varying only styles.css/master-pack.css/index.html between baseline and current. It visits the 37 published root entries at 1440, 390 and 320 px, then seven synthetic renderer fixtures. It compares page width, visible text, heading counts, font families and JavaScript errors, and saves current viewport screenshots for every case and both versions for role fixtures to `qa/typography-audit/matrix/`. Real authenticated UI is not claimed when a guest route redirects to login. Role renderers use shipped code with final boot suppressed, following the existing student-access test pattern. They do not establish access or authorization.

The fallback tests deliberately abort Google Fonts, like the existing local formation tests. They test system-first text and network-independent rendering, not prior Poppins/Inter downloads. Exact rendering in non-Mac engines and real signed-in sessions remains separate acceptance work. Baseline overflows are reported separately from new regressions and must not silently be presented as fixed.

The test does not run the destructive dist rebuild or change a manifest. The release coordinator owns reviewed overrides and aggregate validation.

For a second final-current pass against the same immutable commit, TYPOGRAPHY_REUSE_BASELINE=1 reuses the baseline metrics already saved by a complete first run and remeasures every current entry. Final-current file digests are recorded in report.json.

## Fresh clone

The static inventories are sanitized, versioned JSON under tests/typography/fixtures; there is no QA input dependency for a normal first run. Both tests require Git history containing commit 56aeb6832c8624532d7499612ff0006db39d2cab (a shallow clone without that commit must obtain the history first). Browser QA needs an already available Playwright module and Chromium, supplied through PLAYWRIGHT_MODULE and CHROMIUM_PATH if they are not discoverable normally. No user-specific installation path is hardcoded. The QA directory is created only for outputs. Optional TYPOGRAPHY_REUSE_BASELINE=1 explicitly requires a prior full matrix/report.json output for the same baseline; omit it in a fresh clone. No screenshots, private reports, credentials or production data belong in version control.
