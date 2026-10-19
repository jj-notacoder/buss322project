# Family Space Build Specification

Version 1.1 · 19 October 2026 · Working product name · Responsive web application

## 1 Build objective and scope

Build an attractive, functional family app website: private chronological updates, personal reminders, controlled messaging, optional location, and parent-managed access. Children participate on approved browsers/tablets without a phone number. This specification overrides the earlier concept image.

**Default deliverable A:** complete interactive prototype using fictional identities, persistent IndexedDB data, and replaceable repository interfaces. Run without backend credentials, email, or map tokens. Identify demo mode unobtrusively; label profile switching, simulated invites/pairing, and sample locations. Never imply local actions reached real devices. Do not collect real child details or location.

**Later deliverable B:** connected MVP with independent authentication, server-enforced permissions, private media, cross-device updates, scheduling, and revocable child sessions. Select modes explicitly; missing connected configuration must fail visibly rather than silently load sample data. Do not launch real-family access before connected tests pass.

Defaults: English; 2–12 members; one active family per identity; roles parent/adult/child; one parent owns the family; whole-family/selected-member audiences; photo posts; in-app notifications; no/daily/weekly/yearly recurrence. Browser IANA timezone, editable; demo fallback Asia/Dubai.

**Exclude:** comments, likes/reactions, public read or response totals, followers, streaks, rankings, algorithms, advertisements, public discovery/contact import, external messaging, shopping lists, polls/RSVP, chat attachments, voice/video, payments, named custom groups, calendar integration, push/email delivery, multi-family accounts, geofences/arrival alerts, background tracking, automated moderation. No dead controls for deferred features. Do not claim end-to-end encryption, emergency response, or legal compliance.

Product success means finding plans and understanding responsibilities/access. Do not optimise time spent, posting frequency, or engagement.

## 2 Roles and access

| Capability | Parent | Adult | Child |
| --- | --- | --- | --- |
| Read addressed posts; save reminders | Yes | Yes | Yes |
| Publish updates/reminder posts | Yes | Yes | Default on; configurable |
| Publish alerts | Yes | Yes | Default off; configurable |
| Edit/delete own posts | Yes | Yes | Yes |
| Remove others’ posts; pin whole-family notice | Yes | No | No |
| Assign reminder | Child directly; adult by acceptance request | No | No |
| Family conversation | Yes | Yes | Default on; configurable |
| Private conversation | Yes | Yes | Default off; only approved contacts when enabled |
| Invite adults/create children; manage child settings/devices/reports | Yes | No | No |
| Activate another member’s location | Never | Never | Never |
| Start own location | Optional | Optional | Parent must allow feature; child initiates |
| Stop own location | Always | Always | Always |

Owner additionally transfers ownership/closes the family. Other parents cannot remove owner or grant themselves ownership. Maintain one active owner; owner must transfer before leaving. Child membership/role changes require a parent. Adults control their own preferences and sharing.

Parents cannot read nonparticipant private messages. Reports disclose only the excerpt the reporter explicitly submits. Child private-message restrictions block both directions, including existing threads; parents use permitted family conversation otherwise. Re-enabling reveals eligible history only to currently approved contacts.

Enforce current membership, permissions, participant access, and same-family relationships on every connected read/write/subscription. Hidden buttons and UUIDs are not authorisation. Identity/family-scope caches; clear on logout or access changes. Permission changes affect navigation, open threads, deep links, compose choices, and server writes.

Post audience is a recipient snapshot at publication: current family members or selected members, plus author. New joiners receive no old posts automatically. Explain “Current family members.” No audience expansion after publication; republish instead. Narrowing revokes source previews, acknowledgement access, and contextual discussion access. Contextual conversation participants must be a subset of the source audience; reuse matching source/participant threads. Whole-family chat membership is dynamic; newcomers see messages only from their join time. Never silently add someone to private history.

## 3 Visual system and responsive layout

Warm editorial design: off-white canvas, white cards, restrained teal, real everyday-activity photos, strong hierarchy, generous spacing, soft borders, doorway/house mark, and occasional overlapping family avatars. No dashboard vanity statistics, neon, rainbow gradients, decorative blobs, heavy shadows, or oversized empty heroes. Grey glass section-label pills with solid fallback; teal pills only indicate active state.

Tokens: background `#F6F7F4`; surface `#FFFFFF`; text `#182B2A`; secondary `#526562`; primary `#0F766E`; pressed `#115E59`; tint `#E7F3EF`; decorative border `#DCE4DE`; input outline `#7B8F88`; alert background/text `#FFF3D6`/`#79520D`; danger `#B42318`. Verify contrast. Radius: controls 12px/cards 20px/sheets 28px. Shadow `0 8px 28px rgba(24,43,42,.06)`. Spacing scale 4/8/12/16/20/24/32/40/48px.

Typography: Manrope-like headings, Inter-like body; bundled fonts/system fallback. Mobile body 16px, secondary 14px, nav ≥12px; headings 28–32px mobile/34–40px desktop; line-height 1.45–1.6. Motion 140–220ms, reduced-motion support; no confetti/gamification.

Bundle licensed/reusable photos of LEGO, baking, gardening, walks; stable dimensions, rounded thumbnails, full-image lightbox, initials avatar fallback. No random render-time image fetches or broken-image placeholders.

| Width | Layout |
| --- | --- |
| 320–767px | Full viewport app, 16px gutters/12px at 320 if needed; sticky header; fixed five-tab labelled bottom nav; safe-area and content clearance. Single-column feed/forms; full-screen composer. All tabs fit at 320px. |
| 768–1199px | ~88px labelled navigation rail; readable centred 680–760px content. Two-column messaging only if comfortable; naturally paired form fields may share a row. |
| ≥1200px | 240px sidebar; 640–720px feed; optional 280px utility column for own reminders/notice; overall max ~1480px. Hide utility before compressing content. Split messaging/map; readable settings panels. |

Tabs in order: **Feed · Reminders · Messages · Map · Family**. Profile/settings from avatar, notifications from header bell. Map remains reachable when disabled and explains its state. Desktop must not be a stretched phone layout; mobile must not be a shrunken desktop or decorative phone frame.

Targets ≥44×44px, preferably 48px. Wrap long names/actions/filters without horizontal overflow. Keep composer/input visible above keyboard; test dynamic viewport units, safe areas, landscape, browser Back/refresh, and text zoom. Collapsed body text needs Show more. Test widths 320/375/390/430/768/1024/1440px, phone height ≥667px, and 200% text zoom. Only map surface may deliberately pan.

## 4 Routes and screens

Route shorthand below expands under `/app`. Every route supports direct loading, refresh, Back, and permission-aware unavailable states without hidden content previews.

| Routes | Required experience |
| --- | --- |
| `/`, `/welcome`, `/sign-in` | Demo root opens feed; connected root routes by session/membership. Welcome: concise preview/benefits; Create family, Join family, Try demo. Adult email sign-in. No long marketing site. |
| `/onboarding/create` | Family name, parent display name, timezone; optional invite/create-child steps. Children need neither email nor phone. |
| `/join/[token]`, `/pair` | Invite review names family/inviter/role; expired/revoked/used/wrong-account recovery. Pair child browser with parent approval. Simulations labelled in demo. |
| `/app/feed` | Family header/date/avatar/bell; compact day summary occupying <¼ phone screen; obvious New post. ≤2 separate pinned notices. All/Updates/Reminders/Alerts filters; newest-created first, edits/actions never reorder. Load 20 then explicit Load more; end “You are up to date.” |
| `/app/posts/new`, `/app/posts/[id]/edit` | Permission-aware Update/Reminder/Alert selector, labelled fields, audience, photos; preserve draft across type switches/failures; confirm discard; progress/duplicate-submit protection; focus first validation error. Only author edits; parents remove rather than rewrite others. |
| `/app/posts/[id]` | Full content, author/time/edited indicator/audience, lightbox, current member’s saved state, contextual messaging, author-only private acknowledgement panel. Overflow: permitted edit/delete/pin/report. Confirm deletion; removed/inaccessible placeholder clears cached content. |
| `/app/reminders`, `/new`, `/[id]` | My reminders; Upcoming/Completed; week strip; optional list/calendar switch; New reminder. Group Overdue/Today/Tomorrow/Later. Row: checkbox/title/date/source/assigner/lead time/change badge. Detail: complete/reopen/reschedule/source/remove; removal affects only own saved item. |
| `/app/messages`, `/[id]` | Family/context/private conversation list with preview and unread count only. Mobile list→thread with Back; desktop split. Participants/source card/date separators/timestamps/plain-text input/send. No last-seen/online/typing/read-receipt/reaction signals. |
| `/app/map` | Own sharing status first; map + accessible member list. Local fictional map in demo, labelled Sample locations; no real home addresses. Token/load failure retains list. Sharing states and controls follow §7. |
| `/app/family`, `/members/[id]` | Directory/roles/own preferences. Parents get invite/create-child/moderation/devices/reports/settings. Child detail: post, alert, family/private message, approved contacts, location availability, notification quiet hours. Child sees readable My access summary and managing parents; explain disabled dependencies such as approved contacts when private messaging is off. |
| `/app/family/invites`, `/devices`, `/reports` | Manage invites; approve/revoke child devices; report queue. Owner administration separately grouped. Membership removal explains lost access/ended sharing. |
| `/app/settings`, `/app/notifications` | Own name/avatar/timezone/preferences/sessions/sign-out. Children cannot change role/membership. Demo switch/reset here. Private notification inbox: reminders/important updates/messages/family settings; read state personal only. |

For shorthand `/new` or `/[id]`, extend the immediately preceding full resource route: `/app/reminders/new`, `/app/reminders/[id]`, `/app/messages/[id]`. Family detail routes similarly expand to `/app/family/members/[id]`, `/app/family/invites`, `/app/family/devices`, `/app/family/reports`.

### Post fields and actions

- **Update:** body ≤3000 characters and/or 1–4 photos; optional activity/place label. Author/time, Message author, Message family only if destination audience may see content. No reaction/comment affordance.
- **Reminder post:** title 1–100 characters, optional details/photos/place, required date, timed/all-day choice, recurrence, audience. Add to Reminders opens personal lead-time choice then Saved. Publishing does not populate everyone’s lists. Separate assignment flow.
- **Alert:** title 1–100, required body, optional photos/place/date, no recurrence. Got it, Remind me later, and Add to Reminders when dated. Explain recipients privately acknowledge to author.
- Shared composer: body ≤3000 characters for every type; whole-family/selected-recipient picker, inline validation, optional-photo button, full draft retention, confirmation. Nested actions must not trigger card navigation.
- If Message author is disallowed, offer family chat only when audience permits; otherwise omit with permission help in detail. Never leak selected-audience content to family chat.

### Message behaviour

Limit 4000 characters; desktop Enter sends/Shift+Enter new line; mobile multiline input. Pending/sent/failed/retry states retain text; never simulate another person’s reply. Demo messages stay local. Preserve scroll/draft when returning from a derived action; load older messages without jumping.

Actions: Create reminder, Share as family post when allowed, Copy, Delete own, Report. Message→reminder pre-fills editable text; user confirms date/time/lead time, optional simple date suggestion, no AI dependency. Retain permission-checked source. Share→post opens audience-reviewed draft, never auto-publishes; omit private participant identity unless deliberately included.

### Reports and preferences

Report form: reason/note, explicit confirmation of the exact excerpt disclosed for a private message. Parent queue Open/Reviewed/Resolved; remove reported posts or adjust contact settings, without gaining full private-thread access. Route a report about a parent to another active parent; if none, explain no independent in-app reviewer and permit cancellation/local demo note. Do not invent support staff.

Preferences: category toggles, timezone, privacy of notification previews, quiet hours including midnight crossings. Child quiet hours limit notifications, not reading. Alerts obey quiet hours; “urgent” does not promise device bypass.

## 5 Reminders and source synchronisation

- One personal reminder per member/source post; unique key/idempotent save. Repeat save opens existing item, including completed history. Personal reminders may have no source.
- Parent→child assignment explicit and labelled; parent→adult request requires acceptance. Multiple assignees get separate records. Progress visible only to assignee/assigner; no public compliance stats. Normal source author cannot see saves/completion.
- Store source version/snapshot. Nonmaterial title/detail corrections may refresh after access check. Date/time/recurrence/place changes show old/new values and require Update reminder or Keep my time. Pause due notifications until resolved. Adoption preserves personal lead time; override explicitly resumes chosen old schedule and labels it personal.
- Cancellation immediately stops outstanding source-derived notifications; show Source cancelled and explicit independent-copy option. Source deletion/moderation/access loss clears cached source body/media, pauses delivery, shows unavailable state, and offers removal or a new independent item using newly entered text. Do not promise recall of downloaded content.
- Timed schedules: UTC instant + original IANA zone/local recurrence time. All-day: calendar date + zone, never invented midnight UTC. Show zone when viewer differs.
- Recurrence preserves wall time; use timezone-aware library. DST gap→first valid time after gap; ambiguity→earlier occurrence, visibly resolved. Yearly 29 February→28 February in non-leap years, explained in summary. Complete per occurrence, retain history, show next; edits affect future only. Expand/schedule rolling 30 days, never infinitely.
- Past-due shows Overdue without repeated nagging. If lead time passed but due is future, default notification to due time; if due passed, show no future notification.
- Got it applies only to alerts; idempotent/private to member+author. Material alert edit increments acknowledgement version, explains change, requires renewed acknowledgement; punctuation corrections do not.
- Remind me later revisits alert without acknowledging: 1 hour, This evening (7PM own zone), Choose time. If evening passed, offer Tomorrow at 7PM.
- Demo creates inbox events locally and evaluates due items while open/on load; explain closed-page delivery absent. Connected scheduler independently creates inbox notifications; OS push remains deferred. Unique delivery key: member+occurrence+type+source version. Quiet hours delay until window ends unless completed/cancelled/changed. Keep event/delivery timestamps separate; consolidate stale offline items instead of replaying a burst.

## 6 Required demonstration journeys

1. Parent publishes lunch reminder→child saves with lead time→Saved appears→own Upcoming links to source; second save creates no duplicate.
2. Family cake request→Create reminder→confirm date/time→personal item/source link; return retains conversation position/draft.
3. Source time changes→private update→old/new review→adopt or explicit personal override; notification state matches choice.
4. Parent disables child DMs→confirmation/access summary→both-direction sends and deep links blocked, family chat retained→approved history restored only when reallowed.
5. Eligible member chooses location audience/duration→consent/start→visible status→stop/expiry removes recipient coordinates; distinguish offline pending stop.

## 7 Location requirements

No real location in demo. Connected location is optional **foreground sharing**, not continuous tracking after browser closes. Before browser prompt explain updates require open/active page; HTTPS and explicit permission required. Start only after successful initial coordinate and server acceptance.

Choose approved recipients and 15min/1h/4h expiry; no unlimited option. Child feature default off; allowing it never remotely starts a session. Active indicator visible across app: audience/time remaining/Stop sharing.

States: off/requesting/active/stale/paused/stopping/expired/denied/unavailable. “Sharing now” requires valid session and coordinate ≤2min old; otherwise timestamped last-known while session remains valid. Show accuracy. Server checks expiry on every read/write; background suspension never extends expiry.

Stop/expiry/removal/device revocation revokes coordinate access and removes pins; reject late writes. Retain only latest coordinate per active session; purge on stop/expiry with server cleanup even when clients closed. No last-known pin after session ends.

Offline stop clears local collection immediately; say “Stopping sharing when connected” and retain server-expiry truth until acknowledged. Never claim remote access already ended. No routes/history/geofences/arrival predictions or safety guarantees.

## 8 Architecture and data

New project default: compatible supported stable Next.js App Router/React/TypeScript/Tailwind, accessible headless primitives, one outline icon set, timezone-aware date library. Extend an existing suitable stack. Commit lockfile; verify runtime/dependency docs during implementation.

Separate domain validation/permission/date logic, services, repository interfaces/adapters, shared UI, route components, fixtures, and tests. One authoritative state system. Demo IndexedDB for content/photo Blobs, localStorage only small preferences; bundled seed image paths. Schema-version persisted data; reset recovery. Quota failures preserve text and do not confirm failed uploads.

Connected option: Supabase Auth/Postgres/private Storage/scoped realtime with server operations. RLS/storage policies required; platform choice alone is not security. Adult provider auth; child separate restricted principal, never parent session plus switcher. No demo role switcher in connected mode.

Pairing: initiated on child browser; parent approves named child/device; hashed single-use code, 10min expiry, guess rate limits; child-only revocable session ≤30 days. Revocation blocks reads/writes/location on next server check. If auth adapter cannot support verifiable child sessions safely, pairing remains demo-only and connected children cannot launch.

### Logical entities

Use UUIDs/timestamps/foreign keys, server-owned author/family, same-family transactional constraints. All fields below are required concepts; normalise as appropriate.

| Entity | Fields beyond shared id/timestamps |
| --- | --- |
| Identity / Family | Auth principal, name/avatar/zone; family name/owner membership/zone/closure |
| Membership | Family, identity, role, status, joined/removed; one active family |
| ChildPermissions / ApprovedContact | Posting/alert/family-DM/private-DM/location flags, quiet hours, updater/version; unique child/contact pair |
| Invite / PairingRequest | Family/inviter/role/token hash/expiry/used/revoked; child/device/code hash/approver/expiry/consumed/failed attempts |
| DeviceSession | Identity/child membership/label/token hash or provider ref/last use/expiry/revoked |
| Post / PostRecipient | Family/author/type/title/body/place/audience/version/ack version/pinned/removed/cancelled; post/member/grant/revoke |
| PostSchedule / Media | All-day/local date/start/zone/recurrence; post/private path/type/dimensions/order/upload state |
| Acknowledgement | Unique post/member/ack version, acknowledged time |
| Reminder | Family/owner/title/details/schedule/lead/state/source post or message/source version+snapshot/update state/override/assigner/response |
| ReminderOccurrence | Reminder/scheduled instant or date/unique occurrence key/completion time+actor |
| Conversation / Participant | Family/kind/source; unique conversation/member, joined/access/last-read-message |
| Message | Conversation/sender/body/deleted/client mutation key; unique sender+key |
| Notification / Preference | Member/category/resource/safe summary/event/deliver-after/read/unique delivery key; category flags/quiet hours/preview/zone |
| LocationSession / Recipient / LatestLocation | Family/sharer/device/start/expiry/stop/status; session/member; session coordinate/accuracy/captured/received, one latest |
| Report / AuditEvent | Family/reporter/resource/confirmed excerpt/reason/note/reviewer/state/resolved; actor/action/target/safe metadata |

Operations: family create/invite/accept/revoke/child/device/permissions/remove/ownership; post list/create/edit/remove/pin/ack/narrow/cancel; reminder create/save/assign/accept/decline/complete/adopt/override; thread list/create/read/send/delete/report; location start/update/read/stop/expire; own notification list/read/preferences and due processing. Validate schemas, membership, audience, ownership, participant permissions for all.

Pagination: 20 posts/50 messages, cursors; index family+created, reminder owner+due, conversation+created, expiry cleanup. Connected clients must converge on posts/messages/permissions/ended sharing via scoped realtime or documented refresh; subscriptions enforce read permissions.

## 9 Media and connected controls

Photos: JPEG/PNG/WebP only, ≤10MB original, ≤4/post. Unsupported format gets conversion guidance. Validate actual types; optimise display/thumbnails; strip location metadata; private parent-resource-authorised storage. Reserve layout dimensions/lazy-load below fold.

Escape text, no arbitrary HTML; protect cross-site mutations per auth mechanism. Server-only privileged credentials; no public service key. Rate-limit auth/invite/pairing/message/upload. Never trust submitted role/author/family. No sensitive bodies/tokens/coordinates in logs.

Private media via authenticated proxy or authorised signed URL ≤60sec; signed access persists until expiry and downloaded bytes cannot be recalled. Sensitive resources needing immediate recheck use proxy. Clear sensitive caches on logout; no public indexing/content previews.

Deleted posts/messages leave UI/queries immediately; associated media deletion ≤24h. Audit metadata only, 90 days. Location latest-only retention as §7. Owner-confirmed family closure deletes family content/media within 30 days; disclose separate hosting backup retention and match real settings. Before real launch review jurisdiction, child-account requirements, retention, privacy terms; do not imply prototype compliance.

Connected writes fail visibly or remain explicitly pending; no false success/offline mutation queue. Preserve safe form/message drafts with retry. Demo persistence failures warn about refresh loss. Connected inbox scheduling must work without an open page; actual push remains excluded.

## 10 Shared components and quality

Reusable: responsive AppShell/PageHeader; avatar; update/reminder/alert PostCard; composer/audience picker/photo grid/lightbox; reminder row/editor/source-change panel; conversation row/message bubble/action menu; sharing status/map/member list; member/permission panels; notification row; dialog/menu/toast/inline error/skeleton/empty state; demo panel.

Design loading/empty/error/success/restricted states for each resource/action; row-specific variants include saved/pinned/removed, overdue/completed/assigned/changed/cancelled, pending/failed/deleted messages, location states, and saving/failed permissions. Empty state gets brief explanation and one action. Avoid full-page spinners on every tab change.

Semantic landmarks/headings/forms, permanent labels, skip link, visible keyboard focus, dialog focus trap+return, accessible live feedback, full lightbox keyboard/touch controls, descriptive photo alt/editable description. Contrast ≥4.5:1 normal text/≥3:1 large text and essential controls. State never colour-only; accessible member-list alternative to map; reduced motion.

Mobile performance targets: LCP ≤2.5s, CLS ≤0.1, visual interaction feedback normally ≤200ms. Measure rather than advertise. Lazy-load map only on map route; reserve image sizes/paginate/cache safely; usable slow-network skeletons never fake delivered messages.

## 11 Fixtures and verification

Seed Parker family: Maya/Mum owner, Daniel/Dad parent, Sam/Ella children, Nora/Grandma adult; start Maya. Consistent avatars/identities across features. Anchor relative dates at initialisation and persist anchor; do not shift dates every render.

Fixtures: LEGO photo, baking/garden update, next-weekend birthday lunch saved by Sam, pickup alert acknowledged by one member, permission slip assigned to Sam, dentist source-time change, cake family conversation, parent-private conversation, restricted child DM, two fictional fresh/stale locations plus nonsharing members, fictional report, overdue reminder, reachable empty states. No real child details/addresses/numbers/testimonials. Reset only app-owned state. Profile switch changes the entire permission/data context, never exposes one member’s personal reminders as another’s.

Prototype checks:

1. Credential-free labelled demo and persistent state; routes/Back/refresh work.
2. Create/edit/delete permitted posts; chronological order; zero forbidden engagement features.
3. Save idempotently; source links work; recurrence completion/history/next instance correct.
4. Source change adopt/override, cancellation, access loss and paused/resumed notifications match rules.
5. Message→reminder and audience-reviewed message→post work; pending/failure/retry retain drafts.
6. Child restrictions apply both directions/open threads/deep links; parent changes and access summary agree.
7. Profile switches isolate personal state; adult cannot use parent controls; acknowledgements author-private.
8. Map sample/off/fresh/stale/stop/expiry states correct across refresh and recipient views.
9. All specified viewports/zoom/keyboard/safe areas accessible; every loading/empty/error/restricted state reachable.
10. Reset restores fixtures only; no core dead controls.

Connected gates:

1. Cross-family API/storage/realtime reads/writes blocked; forged family/role/author/assignee/audience/participant IDs rejected.
2. Removed members/revoked devices lose access; restricted child sessions independent, no switcher backdoor.
3. Nonparticipant parents cannot read private messages; invite/pairing expiry/single-use/hash/rate limits verified.
4. Unauthorised media denied; metadata stripped; token expiry/revocation semantics honoured.
5. Scheduler idempotency, timezone/DST/recurrence/quiet-hour boundaries, cancellation/source changes tested with controlled time.
6. Location expiry enforced on every read/write, late writes rejected, coordinates purged without active clients.
7. Two authorised clients converge; missing connected config explicitly errors; logout clears sensitive state.
8. Reports/deletion/audit/family closure follow configured policy.

Automate permission/source-sync/duplicate-save/recurrence/quiet-hour/ack-version/location-expiry tests; browser-test main journeys and responsive screens; connected integration tests deliberately attack access boundaries. Run production build/typecheck/lint/relevant tests; inspect phone/tablet/desktop screenshots. Behaviour tests, not snapshots alone. Fix failures; report any remaining limitation honestly.

## 12 Build sequence and handoff

Implement: (1) tokens/responsive shell/routes/repository/fixtures; (2) feed/composer/reminders/source updates; (3) contextual messaging/conversion/inbox; (4) onboarding/roles/controls/reports/device-invite simulations; (5) sample map/accessibility/all states/responsive polish. These complete A. Then B: secure identity/database/storage policies before real data, followed by scheduling/synchronisation/optional real foreground location and deployment checks.

Deliver runnable source, lockfile, README setup/demo/mode instructions, placeholder-only `.env.example`, acceptance results and actual commands run. Connected work also needs migrations/seeds/policies/job setup/rollback guidance. Never commit/request secrets in chat. State exactly what is simulated; a finished-looking screen with a nonfunctional core action fails delivery.

**Codex instruction:** Implement A completely using this specification. Build the app, not a landing page. Preserve all permission/source-update/privacy rules, deliberately design each breakpoint, make core controls work, test and fix before handoff. Do not present B as complete without its server gates.

Later decisions: final brand, pilot feedback, shopping-list justification, adult invite verification, child-auth adapter, hosting region, push, native background-location need. Evaluate with five family groups: target ≥80% unassisted reminder-save/message-conversion completion plus correct understanding of child contact and location visibility. Targets are proposed, not measured findings.

Technical references: [Geolocation](https://www.w3.org/TR/geolocation/), [Next.js setup](https://nextjs.org/docs/app/getting-started/installation), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [private storage](https://supabase.com/docs/guides/storage/buckets/fundamentals), [storage access](https://supabase.com/docs/guides/storage/security/access-control). Checked 19 October 2026; verify current implementation docs. Product defaults above are project decisions.
