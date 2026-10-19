# Family Space

A warm, responsive family app built from `Family_Space_PRD.md`. This is deliverable A: a credential-free interactive demo with fictional Parker family profiles and browser-local persistence.

## Run

Use Node.js 22.12 or newer (verified with Node.js 24.13) and npm.

```sh
npm ci
npm run dev
```

Open [Family Space](http://localhost:3000). No environment file, account, API key, database, email service, or map token is needed.

For a production build:

```sh
npm run build
npm start
```

The demo opens as Maya/Mum. Use the header avatar or Settings → Explore as to switch fictional profiles. Switching changes feed access, personal reminders, messages, notifications, location recipients, and family administration together.

## What works

- Chronological feed with update/reminder/alert filters, two pinned notices, snapshot audiences, author editing, parent removal, private alert acknowledgements, and reports.
- Composer with retained drafts, selected recipients, optional dates, 1–4 validated photo uploads, editable alt text, metadata-stripping WebP conversion, and image lightbox.
- Personal reminders, idempotent source saves, lead times, assignment/request acceptance, completion history, recurrence, source-time review, personal overrides, cancellation, and revoked-source handling.
- Family/private/context conversations with participant checks, child contact restrictions in both directions, local sending, retry, drafts, older-message loading, copy, own deletion, reporting, and message-to-reminder/post conversion.
- Family directory, child permissions and approved contacts, quiet hours, simulated adult/parent invitations, child creation, pairing requests, device approval/revocation, excerpt-only concerns, ownership transfer, and local family closure.
- Fictional map with an accessible member list, fresh/stale samples, recipient/duration consent, expiry, and stop controls. The browser's actual location is never requested.
- Personal notification inbox, read state, category preferences, preview preferences, timezone and quiet hours that cross midnight.
- Responsive desktop sidebar and utility column, tablet rail, phone bottom navigation, keyboard dialogs, focus return, reduced motion, and schema-versioned IndexedDB persistence.

## Demo boundaries

All identities are fictional. Avatar photos illustrate fictional characters; the pictured people are not the Parkers. Use invented details and sample photos only.

Posts, messages, invitations, pairing, devices, reports, ownership, and sharing are local simulations. Nothing reaches another device. Profile switching is not authentication. IndexedDB holds the state and uploaded photo Blobs under the app-owned `family-space-demo` database. Settings → Reset the demo clears that database only and restores the fixtures. The fixture date anchor is persisted, so dates do not slide on every render.

Reminder events are evaluated on load and every 30 seconds while the page is open. There is no closed-page delivery, push notification, or email. Quiet hours delay local inbox entries; completion, cancellation, or unavailable sources stop pending source-derived entries. Sample sharing does not collect coordinates and cannot demonstrate real device permission prompts, offline server revocation, or background behavior.

`NEXT_PUBLIC_APP_MODE` defaults to `demo`. Any explicit non-demo value shows a connected-mode unavailable screen; it does not silently fall back to fixtures. Public Next.js environment values are set when building. `.env.example` contains placeholders only.

Deliverable B is intentionally unavailable. Independent adult/child authentication, server authorization, private storage, RLS, scoped realtime, real scheduling, rate limits, actual pairing tokens, server expiry/cleanup, and retention operations must be implemented and pass the PRD's connected gates before real families or real location data are used. This demo makes no compliance, emergency-response, or end-to-end-encryption claims.

## Try the main journeys

1. As Maya, share a new reminder post. Switch to Ella, save it with a lead time, and open My reminders. Saving the same post again opens the existing personal item.
2. Open Messages → Family room. Use the cake message's action menu → Create reminder, confirm the date, save, and return through View source conversation. The reply draft is retained.
3. As Maya, open Reminders → Sam's dentist appointment. Compare the old/new time, then Update reminder or Keep my time.
4. As Maya, open Family → Sam. Enable private messaging and explicitly approve Nora. Switch to Sam to view eligible history. Disable it as Maya and confirm; Sam and Nora both lose private-thread access while family chat remains available.
5. Open Map, choose sample recipients and a duration, confirm consent, and start. Switch to a recipient profile to see the pin. Stop as the sharer; the recipient pin disappears. Sessions also expire on reads and are purged by the next local due pass.

## Architecture

```text
src/domain/        Types, validation, authorization, date/recurrence logic, commands
src/data/          Fictional fixtures and replaceable IndexedDB repository
src/components/    Shared UI, one authoritative provider, feature screens
src/app/           Next.js layout, metadata, catch-all route entry, design tokens/CSS
tests/             Domain behavior tests with controlled time
e2e/               Browser journeys, responsive checks, accessibility checks
artifacts/         Acceptance evidence and screenshots
```

Mutations are validated in the domain layer, serialized, and persisted before success is shown. Text remains available on persistence failure. This local permission layer demonstrates product behavior; it is not a substitute for server enforcement.

Schedules use calendar dates and IANA zones. Timed occurrences resolve through `@date-fns/tz`; recurring dates retain local wall time, gaps use the first valid minute, ambiguous times choose the earlier instant, and leap-day yearly reminders restore February 29 in leap years. All-day dates remain calendar dates; 09:00 local is used only for a demo inbox nudge.

## Verify

```sh
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm audit
```

Playwright reuses an existing localhost:3000 server or starts one. To test a separately running production server, set `PLAYWRIGHT_BASE_URL` to its URL before running the browser tests. Tests use isolated browser contexts, not your own demo data. Screenshots are written to `artifacts/screenshots/`. See `artifacts/ACCEPTANCE.md` for actual results and limits.

## Bundled assets

Inter and Manrope are bundled from `@fontsource` under their included SIL Open Font License. Icons use Lucide under its included ISC license. Photos are bundled locally, with stable dimensions; the app makes no image-service request at runtime.

Photographs were downloaded from Unsplash under the [Unsplash License](https://unsplash.com/license), which permits free commercial and noncommercial use. Source image identifiers:

| Local file | Unsplash source |
| --- | --- |
| `lego.jpg` | `photo-1587654780291-39c9404d746b` |
| `garden.jpg` | `photo-1592841200221-a6898f307baa` |
| `baking.jpg` | `photo-1555507036-ab1f4038808a` |
| `maya.jpg` | `photo-1580489944761-15a19d654956` |
| `daniel.jpg` | `photo-1500648767791-00dcc994a43e` |
| `nora.jpg` | `photo-1438761681033-6461ffad8d80` |

Original source URLs use `https://images.unsplash.com/` followed by the identifier. Character labels do not identify the real people pictured.
# buss322project
