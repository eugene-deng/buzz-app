# Toast workshop

Development-only viewer for 248 desktop notification scenarios. Open a conversation
in the development app, then choose **Toast workshop**. Actions are simulated;
the surrounding native app still uses its signed-in account. Release builds do not
register the workshop. Production toast rendering and caller behavior are unchanged.

The default **Sonner stack · Buzz styles** mode previews:

- Native Sonner stacking and hover expansion at the top right.
- Shared Buzz Button controls, typography, translucent floating material, shadow,
  and light/dark status colors.
- 16px corners, derived from an approximate 24px window corner minus an 8px inset.
- Dark action buttons with a brighter resting fill and distinct hover/pressed fills.
- Optional subtitles, multiple actions, and a close button on hover or keyboard focus.
- Source timing examples: 3, 4, 5, and 8 seconds, plus persistent notices. Hover
  pauses expiry; persistent conditions must be cleared manually in this simulation.

Search by scenario, message, or source file. Selecting several samples builds a
stack; **Clear toast** removes the preview stack. Use Buzz Settings to change theme
and text size. Disable Sonner mode to inspect the earlier toolbar experiment or
**Current main defaults** comparison. Placement/padding controls apply to that
older experiment; the Sonner preview uses its fixed top-right placement.

## Run

Use the repository's normal development command (`bin/just desktop` or
`bin/just web`). The development-only registration lives in `src/app/services.ts`.
No plugin installation is required.

An isolated comparison viewer is also available:

```sh
bin/pnpm exec vite --config tests/fixtures/toast-lab/vite.config.ts
```

Open http://127.0.0.1:5189/tests/fixtures/toast-lab/index.html. This earlier viewer
compares the shared production renderer with experimental overrides in isolated
frames. It does not initialize live services or show the new Sonner workshop.

For a fictional full-shell preview, contributors with the optional local
`buzz-plugin-demos` skill can run:

```sh
bin/node --experimental-transform-types --no-warnings tests/fixtures/toast-lab/serve-shell.mjs /path/to/buzz-plugin-demos
```

This serves http://127.0.0.1:5299/ with the skill's fictional seed and mock bridge.
The `check-*.mjs` scripts expect this server and exercise rendering, search, timers,
and interactions. They are manual fixture checks, not CI browser journeys.

```sh
bin/pnpm exec tsc -p tests/fixtures/toast-lab/tsconfig.json
bin/node tests/fixtures/toast-lab/check-sweep.mjs
bin/node tests/fixtures/toast-lab/check-timers.mjs
```

## Coverage and limits

[COVERAGE.md](COVERAGE.md) describes the source snapshot and mapping. The inventory
records 148 direct call sites across 73 files at
`c0f5cbcf6700545ea152809d763bea2b3f9fb432`; regenerate it with
`python3 tests/fixtures/toast-lab/inventory.py`. `coverage.json` maps source families
to representative scenarios, rather than claiming every runtime string is covered.

Dynamic error details and names are fictional. Updater toolbar/settings states
adapted as toasts are labeled. Source resolution, retries, permissions, navigation,
and destructive actions are not exercised. The proposed close affordance also
appears on samples whose production source is not dismissible. Inline form errors,
OS notifications, mobile clients, and external plugins are outside the catalog.

Fixture CSS is an experimental design surface, not a shared design-system recipe.
Promoting this treatment into production requires a separate shared-owner change.
