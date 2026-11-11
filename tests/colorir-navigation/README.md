# Colorir shell and typography regression tests

Use a full Git history containing baseline1038e03, existing Playwright and existing Chromium. Do not install or contact production services. Run from the repository root:

```sh
node tests/colorir-navigation/static.mjs
PLAYWRIGHT_MODULE=/existing/path/playwright/index.mjs CHROMIUM_PATH=/existing/path/chrome node tests/colorir-navigation/browser.mjs
```

The static test verifies that HTML only gains the host stylesheet, original CSS (including printing) remains byte-identical before screen-only appendices, and authorization/runtime/painting/palette/content/audio sources remain unchanged.

The browser test uses disposable contexts and synthetic sessions for aluno, educacao_infantil, escola and admin at1440/390/320. The shipped platform renders its own role-dependent shell. RPCs are mocked; a separate synthetic discovery mount supplies the eight existing catalog entries. No real authorization or account is validated. It checks the sidebar/drawer, platform Back/Home/logout hooks with synthetic destinations, eight themes, theme Back/Forward, painting/undo/redo, color dialog, optional sounds/letters UI and readable controls. Media playback is mocked, so this is not an acoustic quality test.

Screenshots and JSON go to qa/colorir-shell/evidence by default. COLORIR_QA_OUTPUT can choose another output. COLORIR_WIDTHS and COLORIR_ROLES can narrow a diagnostic run; omit them for the full matrix.

For pre-release draft testing only, COLORIR_DRAFT_ROOT can point at a local tree containing the four proposed runtime files. Normal tests require no private QA inputs. A draft run is not proof the same files were published.
