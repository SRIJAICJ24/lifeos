# LifeOS MVP verification

Final browser smoke check: 20 September 2026. Android artifact built 16 September 2026.

## Passed

- Strict TypeScript check and all 38 automated tests (`npm run check`). Evidence: `output/tests.log`.
- Real SQLite migrations, seed idempotence, transactions, foreign keys, backup rollback, close/reopen persistence and deletion behavior.
- Holiday-safe Day Orders, overrides, free-time overlap merging, priorities, dependencies, planning intensity, splitting, recurrence, partial progress, missed history, cross-date reservations, active focus and month boundaries.
- Production web export. Evidence: `output/web-build.log`.
- Browser launch with Expo SQLite WASM; all seven life areas plus Calendar, Capture, Me and Tasks rendered on direct navigation. Reproducible smoke script: `scripts/browser-smoke.js`.
- Interactive browser checks during implementation: daily plan generation, partial progress and actual minutes, task-note editing and reload persistence, rescheduling, Day Order override, habit increment and reload persistence.
- Desktop and 390-pixel mobile visual inspection. Screenshots: `output/playwright/`.
- Standalone Android release-mode build including custom widget module. Evidence: `output/android-final-build.log` (`BUILD SUCCESSFUL`). APK signature verification passed with v2 signing; manifest inspection confirmed widget receiver and LifeOS deep link.

## Android artifact

`output/lifeos-preview.apk`, 37,750,690 bytes, arm64-v8a, application ID `com.personal.lifeos`, minimum Android API 24, target API 36.

SHA-256:

```text
844A5D11AC5C42B22A745FFDDC9883EB0D3B05F23D5EA72B9A59389A7BD911DD
```

This uses the generated development signing key. It is suitable for personal acceptance testing, not a Play Store release.

## Remaining device acceptance checks

No Android device was attached. A successful build does not establish runtime behavior on a phone. Install the APK on an arm64 Android phone and check:

1. Launch, edit preferences, capture a task, generate a plan and log partial completion.
2. Force-close and reopen; confirm records and any active focus timer persist. Repeat without a network connection.
3. Add the LifeOS launcher widget; change a plan in the app and confirm its snapshot updates and tapping opens LifeOS.
4. Grant notification permission and verify a relevant deadline digest; check denial behavior and next-day delivery.
5. Export a backup, restore it, and confirm the records. Check keyboard, safe areas and navigation on the device.

These checks require a physical device or suitable emulator. Widget refresh uses the latest app snapshot; there is no background scheduling service.

## Cloud and scope limits

Supabase transport and SQL ownership policies are prepared, but no live project or credentials were configured. Cloud login is not exposed in the UI; secure token storage and live integration testing are required before doing so. Background multi-device conflict resolution is not implemented.

The README lists MVP scope and deferred features. Browser smoke tests establish screen rendering, not exhaustive testing of every form or native integration.
