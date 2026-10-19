"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  LogOut,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { member } from "@/domain/permissions";
import { relative } from "@/domain/dates";
import { useStore } from "./provider";
import { Avatar, Button, Confirm, Empty, PageHeading, Pill, Toggle } from "./ui";
export function SettingsPage() {
  const { state, run, reset, toast } = useStore();
  const router = useRouter();
  const me = member(state!)!;
  const [name, setName] = useState(me.name),
    [zone, setZone] = useState(me.zone),
    [prefs, setPrefs] = useState({ ...me.preferences }),
    [confirm, setConfirm] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="standard-page settings-page">
      <PageHeading
        eyebrow="A SPACE THAT FEELS LIKE YOU"
        title="The little preferences."
        description="Choose what works for your everyday."
      />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          setError("");
          try {
            await run({ type: "profile", name, zone, preferences: prefs });
            toast("Your preferences are saved.");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Could not save.");
          } finally {
            setSaving(false);
          }
        }}
      >
        <section className="panel">
          <div className="settings-profile">
            <Avatar person={me} size="large" />
            <div>
              <h2>{me.name}</h2>
              <p>{me.label} · Fictional demo profile</p>
            </div>
            <Pill tone="teal">Your profile</Pill>
          </div>
          <div className="form-grid">
            <label>
              Display name
              <input
                value={name}
                required
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              Timezone
              <input
                list="timezones"
                value={zone}
                required
                onChange={(e) => setZone(e.target.value)}
              />
              <datalist id="timezones">
                {[
                  "Asia/Dubai",
                  "Europe/London",
                  "America/New_York",
                  "America/Los_Angeles",
                  "Asia/Kolkata",
                  "Australia/Sydney",
                  "UTC",
                ].map((z) => (
                  <option key={z}>{z}</option>
                ))}
              </datalist>
            </label>
          </div>
          <p className="field-help">
            Timezone uses an IANA name. Existing plans keep their original timezone.
          </p>
        </section>
        <section className="panel">
          <h2>A quieter kind of notification.</h2>
          <p className="muted">
            Your inbox is personal. These preferences control new local events.
          </p>
          <Toggle
            label="My reminders"
            description="A nudge for plans you’ve chosen to remember."
            checked={prefs.reminders}
            onChange={(v) => setPrefs({ ...prefs, reminders: v })}
          />
          <Toggle
            label="Important family updates"
            description="New plans and changes that include you."
            checked={prefs.updates}
            onChange={(v) => setPrefs({ ...prefs, updates: v })}
          />
          <Toggle
            label="Messages"
            description="A little hello from your conversations."
            checked={prefs.messages}
            onChange={(v) => setPrefs({ ...prefs, messages: v })}
          />
          <Toggle
            label="Family settings"
            description="Changes to your access and your family space."
            checked={prefs.family}
            onChange={(v) => setPrefs({ ...prefs, family: v })}
          />
          <Toggle
            label="Show notification previews"
            description="Include a short summary in your own inbox."
            checked={prefs.previews}
            onChange={(v) => setPrefs({ ...prefs, previews: v })}
          />
        </section>
        <section className="panel">
          <h2>A little time to switch off.</h2>
          <Toggle
            label="Quiet hours"
            description="Delay new inbox notifications until quiet time ends. You can always read your space."
            checked={prefs.quiet}
            onChange={(v) => setPrefs({ ...prefs, quiet: v })}
          />
          {prefs.quiet && (
            <div className="form-grid">
              <label>
                From
                <input
                  type="time"
                  required
                  value={prefs.quietStart}
                  onChange={(e) => setPrefs({ ...prefs, quietStart: e.target.value })}
                />
              </label>
              <label>
                Until
                <input
                  type="time"
                  required
                  value={prefs.quietEnd}
                  onChange={(e) => setPrefs({ ...prefs, quietEnd: e.target.value })}
                />
              </label>
            </div>
          )}
          <p className="field-help">
            Uses {zone}. Quiet hours can cross midnight. Alerts also wait; there is no
            device bypass.
          </p>
        </section>
        {error && (
          <div className="inline-error" role="alert">
            {error}
          </div>
        )}
        <div className="settings-save">
          <Button disabled={saving}>{saving ? "Saving…" : "Save my preferences"}</Button>
        </div>
      </form>
      <section className="panel demo-settings">
        <Pill>LOCAL DEMO</Pill>
        <h2>Try a different little perspective.</h2>
        <p>
          Profile switching simulates another family member in this browser. It is not
          independent authentication. No actions reach real people or devices.
        </p>
        <label>
          Explore as
          <select
            value={me.id}
            onChange={(e) =>
              void run({ type: "switch", id: e.target.value })
                .then(() => router.push("/app/feed"))
                .catch(() => {})
            }
          >
            {state!.members
              .filter((m) => m.active)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} · {m.label}
                </option>
              ))}
          </select>
        </label>
        <div className="info-box">
          <ShieldCheck size={20} />
          <p>
            Use fictional information only. Content and photos are saved in this browser’s
            IndexedDB. Location, invitations, and device pairing are simulations.
            Reminders are evaluated only on load and while the page is open.
          </p>
        </div>
        <Button variant="secondary" icon={RotateCcw} onClick={() => setConfirm(true)}>
          Reset the demo
        </Button>
        <Button variant="ghost" icon={LogOut} onClick={() => router.push("/welcome")}>
          Leave demo
        </Button>
      </section>
      <Confirm
        open={confirm}
        onClose={() => setConfirm(false)}
        title="A fresh start for the Parkers?"
        label="Reset local demo"
        danger
        onConfirm={async () => {
          await reset();
          router.push("/app/feed");
        }}
      >
        This removes only Family Space’s local demo data and uploaded photos, then
        restores the fictional family fixtures. Other browser data is untouched.
      </Confirm>
    </div>
  );
}
export function Notifications() {
  const { state, run, now } = useStore();
  const [filter, setFilter] = useState("all");
  if (!state) return null;
  const me = member(state)!,
    rows = state.notifications
      .filter(
        (n) =>
          n.owner === me.id &&
          (!n.deliverAfter || n.deliverAfter <= now) &&
          (filter === "all" || !n.read),
      )
      .sort((a, b) => b.created - a.created);
  const icons = {
    reminders: CalendarDays,
    updates: Bell,
    messages: MessageCircle,
    family: Users,
  };
  return (
    <div className="standard-page">
      <PageHeading
        eyebrow="JUST THE THINGS THAT MATTER"
        title="A little heads-up."
        description="Your personal inbox. Catch up when you’re ready."
        action={
          <Button
            variant="secondary"
            icon={Check}
            onClick={() => void run({ type: "readNotification" }).catch(() => {})}
          >
            Mark all as read
          </Button>
        }
      />
      <div className="panel notifications-panel">
        <div className="segmented">
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            All notifications
          </button>
          <button
            className={filter === "unread" ? "active" : ""}
            onClick={() => setFilter("unread")}
          >
            Unread
          </button>
        </div>
        {rows.map((n) => {
          const Icon = icons[n.category];
          return (
            <Link
              href={n.href}
              key={n.id}
              className={`notification-row ${n.read ? "read" : ""}`}
              onClick={() =>
                void run({ type: "readNotification", id: n.id }).catch(() => {})
              }
            >
              <span className="row-icon">
                <Icon size={20} />
              </span>
              <div>
                <strong>{n.title}</strong>
                {me.preferences.previews && <p>{n.body}</p>}
                <small>
                  {relative(n.event)}
                  {n.created - n.event > 60000 ? " · Delivered after quiet hours" : ""}
                </small>
              </div>
              {!n.read && <span className="unread-dot" aria-label="Unread" />}
              <ChevronRight size={16} />
            </Link>
          );
        })}
        {rows.length === 0 && (
          <Empty icon={Bell} title="A little quiet is good.">
            You’re all caught up. New personal updates will appear here.
          </Empty>
        )}
      </div>
      <p className="page-footnote">
        <ShieldCheck size={14} />
        Read status is personal. Notifications stay in this demo browser.
      </p>
    </div>
  );
}
