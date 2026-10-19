"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  House,
  MapPin,
  MessageCircle,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useStore } from "./provider";
import { member, visibleLocations } from "@/domain/permissions";
import { Avatar, Brand, Button, Modal } from "./ui";
import { format } from "date-fns";
const tabs = [
  { href: "/app/feed", name: "Feed", icon: House },
  { href: "/app/reminders", name: "Reminders", icon: CalendarDays },
  { href: "/app/messages", name: "Messages", icon: MessageCircle },
  { href: "/app/map", name: "Map", icon: MapPin },
  { href: "/app/family", name: "Family", icon: Users },
];
export function Shell({ children }: { children: ReactNode }) {
  const { state, error, reset, run, now } = useStore();
  const pathname = usePathname(),
    router = useRouter();
  const [profiles, setProfiles] = useState(false),
    [help, setHelp] = useState(false);
  if (!state)
    return (
      <div className="boot-screen">
        <Brand />
        {error ? (
          <>
            <h1>Let’s recover your space.</h1>
            <p>{error}</p>
            <Button onClick={() => void reset()}>Reset local demo</Button>
          </>
        ) : (
          <>
            <div className="skeleton skeleton-line" />
            <p>Making room for your family…</p>
          </>
        )}
      </div>
    );
  const me = member(state);
  if (!me || state.closed)
    return (
      <div className="boot-screen">
        <Brand />
        <h1>This space is closed.</h1>
        <p>The local family content is no longer available.</p>
        <Button onClick={() => void reset()}>Start the demo again</Button>
      </div>
    );
  const unread = state.notifications.filter(
    (n) => n.owner === me.id && !n.read && (!n.deliverAfter || n.deliverAfter <= now),
  ).length;
  const ownLocation = visibleLocations(state, now).find((l) => l.member === me.id);
  const nav = (
    <>
      {tabs.map(({ href, name, icon: Icon }) => {
        const active =
          pathname === href ||
          pathname.startsWith(href + "/") ||
          (name === "Feed" && (pathname === "/" || pathname.startsWith("/app/posts")));
        return (
          <Link
            key={name}
            href={href}
            className={`nav-item ${active ? "active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={21} strokeWidth={active ? 2 : 1.7} />
            <span>{name}</span>
            {active && <i />}
          </Link>
        );
      })}
    </>
  );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link href="/app/feed" aria-label="Family Space home">
          <Brand />
        </Link>
        <button className="family-switch" onClick={() => router.push("/app/family")}>
          <span className="family-monogram">
            <House size={19} />
          </span>
          <span>
            <strong>{state.familyName}</strong>
            <small>Our little corner</small>
          </span>
          <ChevronDown size={15} />
        </button>
        <span className="sidebar-label">YOUR SPACE</span>
        <nav aria-label="Main navigation">{nav}</nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="little-house">
              <House size={27} strokeWidth={1} />
            </span>
            <p>
              Less noise.
              <br />
              <strong>More family.</strong>
            </p>
            <small>A little space for what matters.</small>
          </div>
          <Link className="nav-item" href="/app/settings">
            <Settings size={20} />
            <span>Settings</span>
          </Link>
          <button className="nav-item" onClick={() => setHelp(true)}>
            <CircleHelp size={20} />
            <span>About this space</span>
          </button>
          <button className="profile-switch" onClick={() => setProfiles(true)}>
            <Avatar person={me} />
            <span>
              <strong>{me.name} Parker</strong>
              <small>
                {me.label}
                {state.owner === me.id ? " · Owner" : ""}
              </small>
            </span>
            <ChevronDown size={16} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-label">
            <House size={16} />
            <span>Your family, a little closer.</span>
          </div>
          <Link className="mobile-brand" href="/app/feed">
            <Brand />
          </Link>
          <div className="header-actions">
            <button className="demo-badge" onClick={() => setProfiles(true)}>
              Demo space <ChevronDown size={12} />
            </button>
            <span className="header-date">
              {format(new Date(state.anchor), "EEEE, d MMMM")}
            </span>
            <Link
              href="/app/notifications"
              className="icon-button notification-button"
              aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
            >
              <Bell size={21} />
              {unread > 0 && <i />}
            </Link>
            <button
              className="avatar-button"
              aria-label="Switch demo profile"
              onClick={() => setProfiles(true)}
            >
              <Avatar person={me} size="small" />
            </button>
          </div>
        </header>
        {ownLocation && (
          <div className="sharing-banner">
            <MapPin size={17} />
            <span>
              Sample location shared with {ownLocation.recipients.length} ·{" "}
              {Math.max(1, Math.ceil((ownLocation.expires - now) / 60000))} min left
            </span>
            <button
              onClick={() =>
                void run({ type: "location", action: "stop" }).catch(() => {})
              }
            >
              Stop sharing
            </button>
          </div>
        )}
        {error && <div className="inline-error">{error}</div>}
        <main id="main" className="main-content">
          {children}
        </main>
        <footer className="app-footer">
          <ShieldCheck size={14} /> A private place for your everyday.
          <span>Local demo · Fictional family</span>
        </footer>
      </div>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {nav}
      </nav>
      <Modal
        open={profiles}
        onClose={() => setProfiles(false)}
        title="Explore your family space"
        description="Demo profile switching changes the entire local view. These are fictional people, not signed-in accounts."
      >
        <div className="profile-list">
          {state.members
            .filter((m) => m.active)
            .map((m) => (
              <button
                key={m.id}
                onClick={async () => {
                  try {
                    await run({ type: "switch", id: m.id });
                    setProfiles(false);
                    router.push("/app/feed");
                  } catch {}
                }}
              >
                <Avatar person={m} />
                <span>
                  <strong>{m.name}</strong>
                  <small>
                    {m.label}
                    {m.id === state.owner ? " · Family owner" : ""}
                  </small>
                </span>
                {me.id === m.id ? (
                  <Check size={19} />
                ) : (
                  <span className="muted">View as</span>
                )}
              </button>
            ))}
        </div>
        <Link
          className="text-link"
          href="/app/settings"
          onClick={() => setProfiles(false)}
        >
          Demo settings & reset
        </Link>
      </Modal>
      <Modal
        open={help}
        onClose={() => setHelp(false)}
        title="A little space for what matters"
      >
        <div className="about-mark">
          <Brand />
        </div>
        <p>
          Keep up with the everyday, remember the little things, and make plans together.
        </p>
        <div className="info-box">
          <ShieldCheck size={20} />
          <div>
            <strong>You’re in a local demo.</strong>
            <p>
              Posts, messages, invitations, pairing, and map locations stay in this
              browser. Nothing reaches another device. Use fictional information only.
            </p>
          </div>
        </div>
        <p className="muted">
          Reminders are checked while this page is open and when it loads. There is no
          email, push, closed-page delivery, real tracking, or independent authentication.
        </p>
        <Button onClick={() => setHelp(false)}>Make yourself at home</Button>
      </Modal>
    </div>
  );
}
