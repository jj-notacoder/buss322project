"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  Bell,
  Bookmark,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { dateKey, daysFrom, instant, scheduleLabel } from "@/domain/dates";
import { canReadPost, canReadThread, isParent, member } from "@/domain/permissions";
import type { Reminder, Schedule } from "@/domain/model";
import { useStore } from "./provider";
import {
  Back,
  Button,
  Confirm,
  Empty,
  IconButton,
  PageHeading,
  PersonPicker,
  Pill,
} from "./ui";

export function ReminderRow({
  reminder: r,
  compact = false,
}: {
  reminder: Reminder;
  compact?: boolean;
}) {
  const { state, run, toast, now } = useStore();
  if (!state || r.owner !== state.current) return null;
  const overdue = r.state !== "completed" && instant(r.schedule) < now,
    assigned = r.assigner && member(state, r.assigner);
  return (
    <div
      className={`reminder-row ${compact ? "compact" : ""} ${r.state === "completed" ? "completed" : ""}`}
    >
      <button
        className={`reminder-check ${r.state === "completed" ? "checked" : ""}`}
        disabled={r.response === "pending" || r.change === "unavailable"}
        aria-label={`${r.state === "completed" ? "Reopen" : "Complete"} ${r.title}`}
        onClick={() =>
          void run({
            type: "reminderAction",
            id: r.id,
            action: r.state === "completed" ? "reopen" : "complete",
          })
            .then(() =>
              toast(
                r.schedule.recurrence === "none"
                  ? "Reminder updated."
                  : "Occurrence completed. Next date is ready.",
              ),
            )
            .catch(() => {})
        }
      >
        {r.state === "completed" && <Check size={13} />}
      </button>
      <Link href={`/app/reminders/${r.id}`}>
        <strong>{r.title}</strong>
        <small className={overdue ? "overdue" : ""}>
          {r.change === "changed"
            ? "Time changed · Review update"
            : r.change === "unavailable"
              ? "Source unavailable"
              : r.change === "cancelled"
                ? "Source cancelled"
                : r.response === "pending"
                  ? "Request · Accept to add"
                  : overdue
                    ? "Overdue · " + scheduleLabel(r.schedule)
                    : scheduleLabel(r.schedule)}
        </small>
        {!compact && (
          <span className="reminder-meta">
            {r.source
              ? "From a family post"
              : r.messageSource
                ? "From a conversation"
                : "Personal reminder"}
            {assigned ? ` · Assigned by ${assigned.name}` : ""} ·{" "}
            {r.lead === 0 ? "At the time" : `${r.lead} min before`}
            {r.override ? " · Your own time" : ""}
          </span>
        )}
      </Link>
      {!compact && <ChevronRight size={18} />}
    </div>
  );
}
export function Reminders() {
  const { state, now } = useStore();
  const search = useSearchParams();
  const [tab, setTab] = useState("upcoming"),
    [selected, setSelected] = useState(search.get("day") ?? ""),
    [week, setWeek] = useState(0);
  if (!state) return null;
  const me = member(state)!,
    today = dateKey(now, me.zone),
    tomorrow = daysFrom(now, 1, me.zone);
  const rows = state.reminders
    .filter(
      (r) =>
        r.owner === me.id &&
        r.state === tab &&
        r.response !== "declined" &&
        (!selected || r.schedule.date === selected),
    )
    .sort((a, b) => instant(a.schedule) - instant(b.schedule));
  const groups =
    tab === "completed"
      ? [["Completed", rows] as const]
      : ([
          ["Overdue", rows.filter((r) => r.schedule.date < today)],
          ["Today", rows.filter((r) => r.schedule.date === today)],
          ["Tomorrow", rows.filter((r) => r.schedule.date === tomorrow)],
          ["A little later", rows.filter((r) => r.schedule.date > tomorrow)],
        ] as const);
  return (
    <div className="standard-page">
      <PageHeading
        eyebrow="MAKE ROOM FOR WHAT MATTERS"
        title="A little peace of mind."
        description="Your plans and reminders, in your own time."
        action={
          <Link href="/app/reminders/new" className="button button-primary">
            <Plus size={18} />
            New reminder
          </Link>
        }
      />
      <div className="panel reminders-panel">
        <div className="reminder-tabs">
          <div className="segmented">
            <button
              className={tab === "upcoming" ? "active" : ""}
              onClick={() => setTab("upcoming")}
            >
              Upcoming
            </button>
            <button
              className={tab === "completed" ? "active" : ""}
              onClick={() => setTab("completed")}
            >
              Completed
            </button>
          </div>
          <Pill>
            <Bookmark size={13} />
            Just for you
          </Pill>
        </div>
        <div className="calendar-heading">
          <div>
            <h2>
              {format(new Date(daysFrom(state.anchor, week * 7) + "T12:00"), "MMMM yyyy")}
            </h2>
            <p>
              {selected ? "Showing the selected day" : "A little look at the week ahead"}
            </p>
          </div>
          <IconButton
            label="Previous week"
            icon={ChevronLeft}
            onClick={() => setWeek(week - 1)}
          />
          <IconButton
            label="Next week"
            icon={ChevronRight}
            onClick={() => setWeek(week + 1)}
          />
        </div>
        <div className="week-strip">
          {Array.from({ length: 7 }, (_, i) => {
            const key = daysFrom(state.anchor, week * 7 + i);
            return (
              <button
                key={key}
                className={`${key === today ? "is-today" : ""} ${selected === key ? "selected" : ""}`}
                onClick={() => setSelected(selected === key ? "" : key)}
                aria-pressed={selected === key}
              >
                <small>{format(new Date(key + "T12:00"), "EEE")}</small>
                <strong>{key.slice(-2)}</strong>
                <i
                  className={
                    state.reminders.some(
                      (r) => r.owner === me.id && r.schedule.date === key,
                    )
                      ? "has-item"
                      : ""
                  }
                />
              </button>
            );
          })}
        </div>
        {selected && (
          <button className="text-link clear-date" onClick={() => setSelected("")}>
            Show all dates
          </button>
        )}
        <div className="reminder-groups">
          {groups.map(
            ([title, items]) =>
              items.length > 0 && (
                <section key={title}>
                  <div className="group-title">
                    <h3>{title}</h3>
                    <span>{items.length}</span>
                  </div>
                  {items.map((r) => (
                    <ReminderRow key={r.id} reminder={r} />
                  ))}
                </section>
              ),
          )}
          {rows.length === 0 && (
            <Empty
              icon={CalendarDays}
              title={
                tab === "completed" ? "One thing at a time." : "A little breathing room."
              }
            >
              {tab === "completed"
                ? "Completed reminders will be kept here."
                : "There’s nothing planned for this view."}
              <Link href="/app/reminders/new" className="text-link">
                Add a reminder
              </Link>
            </Empty>
          )}
        </div>
      </div>
      <p className="page-footnote">
        <Bell size={14} />
        Demo reminders appear in your inbox while the page is open or on load. No
        closed-page delivery.
      </p>
    </div>
  );
}
export function ReminderDetail({ id }: { id: string }) {
  const { state, run, toast } = useStore();
  const [remove, setRemove] = useState(false);
  const router = useRouter();
  if (!state) return null;
  const me = member(state)!,
    r = state.reminders.find((r) => r.id === id && r.owner === me.id);
  if (!r)
    return (
      <>
        <Back href="/app/reminders" label="My reminders" />
        <Empty icon={Bookmark} title="This reminder is private">
          It belongs to another profile, or it has been removed.
        </Empty>
      </>
    );
  const source = r.source
    ? state.posts.find((p) => p.id === r.source && canReadPost(state, p))
    : undefined;
  return (
    <div className="detail-page">
      <Back href="/app/reminders" label="My reminders" />
      <PageHeading eyebrow="ONE LESS THING TO KEEP IN MIND" title={r.title} />
      <div className="panel reminder-detail">
        <div className="detail-badges">
          <Pill tone="teal">
            {r.state === "completed"
              ? "Completed"
              : r.response === "pending"
                ? "Acceptance requested"
                : "Your reminder"}
          </Pill>
          {r.assigner && (
            <Pill>From {member(state, r.assigner)?.name ?? "a former member"}</Pill>
          )}
        </div>
        {r.change === "changed" && source?.schedule && (
          <section className="source-change">
            <div className="section-heading">
              <Clock3 size={20} />
              <h2>The plan has a new time.</h2>
            </div>
            <p>Your reminder is paused until you choose what works for you.</p>
            <div className="change-comparison">
              <div>
                <small>YOUR SAVED TIME</small>
                <strong>{scheduleLabel(r.schedule, me.zone)}</strong>
                {r.sourcePlace && <p>{r.sourcePlace}</p>}
              </div>
              <ArrowRight size={18} />
              <div>
                <small>UPDATED PLAN</small>
                <strong>{scheduleLabel(source.schedule, me.zone)}</strong>
                {source.place && <p>{source.place}</p>}
              </div>
            </div>
            <div className="button-row">
              <Button
                onClick={() =>
                  void run({
                    type: "reminderAction",
                    id: r.id,
                    action: "adopt",
                  })
                    .then(() => toast("Reminder updated. Your lead time is preserved."))
                    .catch(() => {})
                }
              >
                Update reminder
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  void run({
                    type: "reminderAction",
                    id: r.id,
                    action: "override",
                  })
                    .then(() => toast("Keeping your time as a personal override."))
                    .catch(() => {})
                }
              >
                Keep my time
              </Button>
            </div>
          </section>
        )}
        {r.change === "unavailable" || r.change === "cancelled" ? (
          <div className="inline-warning">
            <strong>
              {r.change === "cancelled"
                ? "The original plan was cancelled."
                : "The source is no longer available."}
            </strong>
            <p>
              Notifications are paused. You can remove this reminder or create a separate
              one with newly entered details.
            </p>
            <Link href="/app/reminders/new" className="text-link">
              Make an independent reminder <ArrowRight size={15} />
            </Link>
          </div>
        ) : null}
        <div className="detail-schedule">
          <span className="row-icon">
            <CalendarDays size={23} />
          </span>
          <div>
            <strong>{scheduleLabel(r.schedule, me.zone)}</strong>
            <small>
              {r.schedule.zone} ·{" "}
              {r.schedule.recurrence === "none"
                ? "One-time reminder"
                : `Repeats ${r.schedule.recurrence}`}
            </small>
          </div>
        </div>
        {r.details && <p className="preserve-lines">{r.details}</p>}
        <div className="detail-info">
          <Bell size={18} />
          <span>
            {r.lead === 0
              ? "Remind me at the time"
              : `Remind me ${r.lead === 1440 ? "1 day" : r.lead + " minutes"} before`}
            {r.override ? " · Personal time override" : ""}
          </span>
        </div>
        {r.schedule.recurrence === "yearly" && (
          <p className="field-help">
            A yearly reminder keeps its local time. February 29 uses February 28 in
            non-leap years. Daylight-saving gaps move to the first valid time; repeated
            times use the earlier occurrence.
          </p>
        )}
        {source && (
          <Link className="source-link" href={`/app/posts/${source.id}`}>
            <Bookmark size={18} />
            <span>
              From a family post
              <strong>{source.title || "View original update"}</strong>
            </span>
            <ExternalLink size={17} />
          </Link>
        )}
        {r.messageSource && r.change !== "unavailable" && (
          <Link
            className="source-link"
            href={`/app/messages/${state.messages.find((m) => m.id === r.messageSource)?.conversation}`}
          >
            <ExternalLink size={18} />
            View source conversation
          </Link>
        )}
        {r.response === "pending" ? (
          <div className="button-row">
            <Button
              onClick={() =>
                void run({
                  type: "reminderAction",
                  id: r.id,
                  action: "accept",
                }).catch(() => {})
              }
            >
              Accept reminder
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                void run({
                  type: "reminderAction",
                  id: r.id,
                  action: "decline",
                })
                  .then(() => router.push("/app/reminders"))
                  .catch(() => {})
              }
            >
              Decline
            </Button>
          </div>
        ) : (
          <div className="button-row">
            <Button
              icon={r.state === "completed" ? RotateCcw : Check}
              disabled={r.change === "unavailable" || r.response === "declined"}
              onClick={() =>
                void run({
                  type: "reminderAction",
                  id: r.id,
                  action: r.state === "completed" ? "reopen" : "complete",
                }).catch(() => {})
              }
            >
              {r.state === "completed"
                ? "Reopen reminder"
                : r.schedule.recurrence === "none"
                  ? "Mark as complete"
                  : "Complete this occurrence"}
            </Button>
            <Link
              className="button button-secondary"
              href={`/app/reminders/new?edit=${r.id}`}
            >
              Reschedule
            </Link>
            <IconButton
              label="Remove personal reminder"
              icon={Trash2}
              onClick={() => setRemove(true)}
            />
          </div>
        )}
        {r.history.length > 0 && (
          <section className="completion-history">
            <h3>A little history</h3>
            {r.history.map((h, i) => (
              <p key={i}>
                <Check size={14} />
                {h} · Completed
              </p>
            ))}
          </section>
        )}
      </div>
      <Confirm
        open={remove}
        onClose={() => setRemove(false)}
        title="Remove your saved reminder?"
        label="Remove reminder"
        danger
        onConfirm={async () => {
          await run({ type: "reminderAction", id: r.id, action: "remove" });
          router.push("/app/reminders");
        }}
      >
        This only removes it from your own list. The original family post stays available.
      </Confirm>
    </div>
  );
}

export function ReminderEditor() {
  const { state, run, toast, now } = useStore();
  const router = useRouter(),
    search = useSearchParams();
  const me = member(state!)!,
    old = state!.reminders.find((r) => r.id === search.get("edit") && r.owner === me.id),
    post = state!.posts.find(
      (p) => p.id === search.get("source") && canReadPost(state!, p),
    ),
    msg = state!.messages.find(
      (m) =>
        m.id === search.get("message") &&
        !m.deleted &&
        state!.conversations.some(
          (t) => t.id === m.conversation && canReadThread(state!, t),
        ),
    ),
    snooze = search.get("snooze") === "1";
  const defaultSchedule: Schedule = old?.schedule ??
    post?.schedule ?? {
      date: dateKey(now, me.zone),
      time: "19:00",
      allDay: false,
      zone: me.zone,
      recurrence: "none",
    };
  const [title, setTitle] = useState(
      old?.title ?? post?.title ?? (msg ? msg.body.slice(0, 100) : ""),
    ),
    [details, setDetails] = useState(old?.details ?? post?.body ?? msg?.body ?? ""),
    [schedule, setSchedule] = useState(defaultSchedule),
    [lead, setLead] = useState(old?.lead ?? 30),
    [assign, setAssign] = useState(false),
    [assignees, setAssignees] = useState<string[]>([]),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [dirty, setDirty] = useState(false),
    [discard, setDiscard] = useState(false),
    [snoozeChoice, setSnoozeChoice] = useState("choose");
  const set = (patch: Partial<Schedule>) => {
    setSchedule((s) => ({ ...s, ...patch }));
    setDirty(true);
  };
  const sourceRequested =
    (search.has("source") && !post) ||
    (search.has("message") && !msg) ||
    (search.has("edit") && !old);
  if (sourceRequested)
    return (
      <>
        <Back href="/app/reminders" label="My reminders" />
        <Empty title="That source is unavailable">
          Create a new independent reminder with details you enter yourself.
        </Empty>
      </>
    );
  return (
    <div className="editor-page">
      <Back
        href={msg ? `/app/messages/${msg.conversation}` : "/app/reminders"}
        label={msg ? "Back to conversation" : "My reminders"}
      />
      <PageHeading
        eyebrow="LET YOUR MIND WANDER. WE’LL KEEP THE PLAN."
        title={
          old
            ? "A little change of plan."
            : snooze
              ? "Come back to this later."
              : "One less thing to remember."
        }
        description={
          msg
            ? "Turn this message into a personal reminder. Nothing is added until you confirm."
            : "Personal reminders are only visible to you and a parent who assigned them."
        }
      />
      <form
        className="panel editor-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          setError("");
          try {
            const before = state!.reminders.find(
              (r) => r.owner === me.id && r.source === post?.id && post,
            );
            const next = await run({
              type: "reminder",
              id: old?.id,
              title,
              details,
              schedule,
              lead,
              source: post?.id,
              messageSource: msg?.id,
              assignees: assign ? assignees : undefined,
            });
            setDirty(false);
            toast(
              before
                ? "Already saved — opening your existing reminder."
                : assign
                  ? "Personal reminder requests created."
                  : "Saved to your reminders.",
            );
            const r = before ?? next.reminders.filter((r) => r.owner === me.id).at(-1);
            router.push(assign ? "/app/reminders" : `/app/reminders/${old?.id ?? r?.id}`);
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Could not save. Your text is preserved.",
            );
          } finally {
            setSaving(false);
          }
        }}
      >
        {(msg || post) && (
          <div className="source-preview">
            <Bookmark size={18} />
            <div>
              <small>{msg ? "FROM YOUR CONVERSATION" : "FROM A FAMILY POST"}</small>
              <p>{post?.title ?? msg?.body}</p>
            </div>
          </div>
        )}
        <label>
          What would you like to remember?
          <input
            required
            maxLength={100}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setDirty(true);
            }}
            placeholder="A cake for Grandma’s birthday…"
          />
        </label>
        <label>
          Details <span className="muted">(optional)</span>
          <textarea
            maxLength={3000}
            rows={3}
            value={details}
            onChange={(e) => {
              setDetails(e.target.value);
              setDirty(true);
            }}
          />
        </label>
        {snooze && (
          <label>
            Come back to this
            <select
              value={snoozeChoice}
              onChange={(e) => {
                const choice = e.target.value;
                setSnoozeChoice(choice);
                if (choice === "hour") {
                  const d = new Date(now + 3600000);
                  const local = new Intl.DateTimeFormat("en-GB", {
                    timeZone: me.zone,
                    hour: "2-digit",
                    minute: "2-digit",
                    hourCycle: "h23",
                  }).format(d);
                  set({
                    date: dateKey(+d, me.zone),
                    time: local,
                    allDay: false,
                  });
                }
                if (choice === "evening") {
                  const evening = {
                    ...schedule,
                    date: dateKey(now, me.zone),
                    time: "19:00",
                    allDay: false,
                  };
                  set({
                    ...evening,
                    date:
                      instant(evening) < now ? daysFrom(now, 1, me.zone) : evening.date,
                  });
                }
              }}
            >
              <option value="choose">Choose a time</option>
              <option value="hour">In 1 hour</option>
              <option value="evening">Next 7:00 PM in {me.zone}</option>
            </select>
          </label>
        )}
        <div className="form-grid">
          <label>
            Date
            <input
              type="date"
              required
              value={schedule.date}
              onChange={(e) => set({ date: e.target.value })}
            />
          </label>
          {!schedule.allDay && (
            <label>
              Time
              <input
                type="time"
                required
                value={schedule.time}
                onChange={(e) => set({ time: e.target.value })}
              />
            </label>
          )}
        </div>
        <label className="check-label">
          <input
            type="checkbox"
            checked={schedule.allDay}
            onChange={(e) => set({ allDay: e.target.checked })}
          />
          All day
        </label>
        <div className="form-grid">
          <label>
            Repeat
            <select
              value={schedule.recurrence}
              onChange={(e) =>
                set({ recurrence: e.target.value as Schedule["recurrence"] })
              }
            >
              <option value="none">Doesn’t repeat</option>
              <option value="daily">Every day</option>
              <option value="weekly">Every week</option>
              <option value="yearly">Every year</option>
            </select>
          </label>
          <label>
            Remind me
            <select value={lead} onChange={(e) => setLead(Number(e.target.value))}>
              <option value={0}>At the time</option>
              <option value={5}>5 minutes before</option>
              <option value={15}>15 minutes before</option>
              <option value={30}>30 minutes before</option>
              <option value={60}>1 hour before</option>
              <option value={1440}>1 day before</option>
            </select>
          </label>
        </div>
        <p className="field-help">
          <Clock3 size={13} />
          Times use {me.zone}. All-day reminders use the calendar date. If a lead time has
          passed, a future plan is shown at its due time; past plans show as overdue.
        </p>
        {isParent(state!) && !msg && !old && (
          <>
            <hr />
            <label className="check-label">
              <input
                type="checkbox"
                checked={assign}
                onChange={(e) => setAssign(e.target.checked)}
              />
              Assign to someone in the family
            </label>
            {assign && (
              <>
                <p className="field-help">
                  Children receive an assigned reminder. Adults choose whether to accept.
                  Progress is private to each assignee and you.
                </p>
                <PersonPicker
                  selected={assignees}
                  onChange={setAssignees}
                  exclude={[me.id]}
                  allowed={post?.recipients}
                  legend="Who is this for?"
                />
              </>
            )}
          </>
        )}
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        <div className="editor-submit">
          <Button
            type="button"
            variant="secondary"
            onClick={() => (dirty ? setDiscard(true) : router.back())}
          >
            Cancel
          </Button>
          <Button icon={Bookmark} disabled={saving || (assign && assignees.length === 0)}>
            {saving
              ? "Saving…"
              : old
                ? "Save changes"
                : assign
                  ? "Assign reminders"
                  : "Save reminder"}
          </Button>
        </div>
      </form>
      <Confirm
        open={discard}
        onClose={() => setDiscard(false)}
        title="Discard this reminder?"
        label="Discard"
        onConfirm={() => router.back()}
      >
        This reminder has not been saved. Your source conversation will still be there.
      </Confirm>
    </div>
  );
}
