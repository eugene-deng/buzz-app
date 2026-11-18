# Desktop toast coverage sweep — 2026-11-18

Audited source snapshot: c0f5cbcf6700545ea152809d763bea2b3f9fb432, plus the local workshop files.

The source index finds 148 direct toast/feedback call sites across 73 files in `src`. The workshop has 248 scenarios after adding source wording, dynamic branch examples, and timing exceptions. `coverage.json` maps each indexed caller to examples for its source family; this is not a claim that every possible runtime string is enumerated. `inventory.json` retains source excerpts, and `inventory.py` regenerates that index.

The sweep follows `ToastNotice`, aliases of `useToastNotification`, the media announcement wrapper, and direct Sonner imports/calls. Source search found direct Sonner rendering in the shared Toast owner. Dynamic message producers were inspected for community departure, conversation lifecycle, archive batches, forwarding, media actions, failed upload recovery, sign-in recovery, agent operations, workflow outcomes, and moderation.

Added families include settings persistence/application errors, identity/profile/emoji confirmations, clipboard and download failures, agent sharing/stopping, Huddle errors, lifecycle progress/failure/success, partial batch results, community leave/device-cleanup outcomes, attachment refusal and recovery, workflow rejected/unconfirmed outcomes, GitHub operations, and moderation results. The multiple-action renderer now shows both choices, stacked on the right with shared Buzz buttons.

Timers include 3-second immediate-archive Undo, 4-second feedback, 5-second profile/identity/emoji/report confirmations, 8-second action feedback, and persistent conditions. Optional action branches can change 8 seconds to 4 seconds; the catalog displays a representative branch. Error details and names are fictional. Open-ended backend error messages are represented by their owning error family rather than enumerated.

Scope excludes inline form errors/status text, native OS notifications, external plugins not present in this checkout, and native/mobile clients. Updater toolbar/settings adaptations remain explicitly labeled. The source-resolution lifecycle and action side effects remain simulated; X dismissal is the proposed workshop behavior, including samples whose production source is not dismissible. Existing 38 proposed-copy scenarios remain available alongside exact source-wording examples.

Verification: fixture TypeScript check; all 248 cards rendered in the WebKit mock app; source search and per-source coverage map; search filter; 3/5-second expiry; existing 4/8-second expiry, hover pause/resume, persistent notices and hover X check. Multiple-action layout visually inspected at 420px. Native app receives the fixture through its development server; this sweep does not exercise real destructive actions, authentication, or recovery. Full native interaction, dark/narrow/enlarged-text matrix, and broad CI are deferred during local iteration.
