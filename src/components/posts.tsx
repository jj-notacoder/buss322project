"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bell,
  Bookmark,
  CalendarDays,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Flag,
  ImagePlus,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Pin,
  Plus,
  Send,
  ShieldCheck,
  Sprout,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type { Photo, Post, PostType, Schedule } from "@/domain/model";
import {
  canDM,
  canPublish,
  canReadPost,
  canReadThread,
  isParent,
  member,
} from "@/domain/permissions";
import { dateKey, daysFrom, relative, scheduleLabel } from "@/domain/dates";
import { format } from "date-fns";
import { useStore } from "./provider";
import {
  Avatar,
  Back,
  Button,
  Confirm,
  Empty,
  IconButton,
  Modal,
  PageHeading,
  PersonPicker,
  PhotoView,
} from "./ui";
import { ReminderRow } from "./reminders";

export function ReportDialog({
  target,
  kind,
  excerpt,
  author,
  onClose,
}: {
  target: string;
  kind: "post" | "message";
  excerpt: string;
  author: string;
  onClose: () => void;
}) {
  const { state, run, toast } = useStore();
  const [reason, setReason] = useState("Something feels inappropriate"),
    [note, setNote] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [saving, setSaving] = useState(false);
  const reviewer = state?.members.find(
    (m) => m.active && m.role === "parent" && m.id !== author,
  );
  return (
    <Modal
      open
      onClose={onClose}
      title="Share a concern"
      description="Only the excerpt below and your note will be shared with the reviewing parent."
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          try {
            await run({
              type: "report",
              target,
              kind,
              excerpt,
              reason,
              note,
              confirmed,
            });
            toast(
              reviewer
                ? `Concern shared with ${reviewer.name}.`
                : "Saved as a local demo note.",
            );
            onClose();
          } catch {
          } finally {
            setSaving(false);
          }
        }}
      >
        <blockquote className="source-excerpt">{excerpt}</blockquote>
        <label>
          Reason
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            <option>Something feels inappropriate</option>
            <option>Unkind or hurtful</option>
            <option>Privacy concern</option>
            <option>Something else</option>
          </select>
        </label>
        <label>
          Your note
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
            rows={3}
          />
        </label>
        <div className="info-box">
          {reviewer
            ? `${reviewer.name} will see this excerpt. They will not receive access to the rest of a private conversation.`
            : "There is no independent parent reviewer for this concern. You can cancel, or keep a local demo note. There is no external support team."}
        </div>
        <label className="check-label">
          <input
            type="checkbox"
            required
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          I confirm this exact excerpt can be disclosed.
        </label>
        <div className="dialog-actions">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!confirmed || saving}>
            {saving ? "Saving…" : reviewer ? "Submit concern" : "Save demo note"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function PostCard({ post: p, detail = false }: { post: Post; detail?: boolean }) {
  const { state, run, toast, busy } = useStore();
  const router = useRouter();
  const [remove, setRemove] = useState(false),
    [cancel, setCancel] = useState(false),
    [report, setReport] = useState(false),
    [lightbox, setLightbox] = useState<number | null>(null),
    [expanded, setExpanded] = useState(false),
    [lead, setLead] = useState<number | null>(null),
    [saving, setSaving] = useState(false);
  if (!state || !canReadPost(state, p))
    return (
      <Empty title="This update is unavailable">
        It may have been removed, or its audience may have changed.
      </Empty>
    );
  const me = member(state)!,
    author = member(state, p.author),
    own = p.author === me.id,
    saved = state.reminders.find((r) => r.owner === me.id && r.source === p.id),
    all = state.members.filter((m) => m.active).every((m) => p.recipients.includes(m.id)),
    ack = p.acknowledgements[me.id] === p.ackVersion;
  const messageAuthor = async () => {
    try {
      const next = await run({
        type: "thread",
        participants: [p.author],
        source: p.id,
      });
      const t = next.conversations.find(
        (t) =>
          t.source === p.id &&
          t.participants.length === 2 &&
          t.participants.includes(me.id) &&
          t.participants.includes(p.author),
      );
      if (t) router.push(`/app/messages/${t.id}`);
    } catch {}
  };
  const save = async () => {
    if (saved) {
      router.push(`/app/reminders/${saved.id}`);
      return;
    }
    if (!p.schedule) return;
    setSaving(true);
    try {
      await run({
        type: "reminder",
        title: p.title,
        details: p.body,
        schedule: p.schedule,
        lead: lead ?? 30,
        source: p.id,
      });
      toast("Saved to your personal reminders.");
      setLead(null);
    } catch {
    } finally {
      setSaving(false);
    }
  };
  return (
    <article className={`post-card ${p.type === "alert" ? "alert-post" : ""}`}>
      <div className="post-header">
        <Avatar person={author} />
        <div className="post-byline">
          <strong>
            {author?.name ?? "Former member"} <span>{author?.label}</span>
          </strong>
          <small>
            {relative(p.created)}
            {p.edited ? " · Edited" : ""}
            <span className="byline-dot">·</span>
            <Users size={12} />
            {all ? "Family" : "Selected family"}
          </small>
        </div>
        <span className={`post-type ${p.type}`}>
          <span />
          {p.type === "update"
            ? "Everyday update"
            : p.type === "reminder"
              ? "Family reminder"
              : "Important update"}
        </span>
        <details className="action-menu">
          <summary aria-label="Post actions">
            <MoreHorizontal size={21} />
          </summary>
          <div>
            {own && (
              <Link href={`/app/posts/${p.id}/edit`}>
                <Pencil size={15} />
                Edit post
              </Link>
            )}
            {(own || isParent(state)) && (
              <button onClick={() => setRemove(true)}>
                <Trash2 size={15} />
                Remove post
              </button>
            )}
            {own && p.schedule && !p.cancelled && (
              <button onClick={() => setCancel(true)}>
                <X size={15} />
                Cancel plan
              </button>
            )}
            {isParent(state) && all && (
              <button
                onClick={() =>
                  void run({
                    type: "postAction",
                    id: p.id,
                    action: "pin",
                  }).catch(() => {})
                }
              >
                <Pin size={15} />
                {p.pinned ? "Unpin notice" : "Pin notice"}
              </button>
            )}
            {!own && (
              <button onClick={() => setReport(true)}>
                <Flag size={15} />
                Share a concern
              </button>
            )}
          </div>
        </details>
      </div>
      <div className="post-body">
        {p.title && (
          <h2>
            <Link href={`/app/posts/${p.id}`}>{p.title}</Link>
          </h2>
        )}
        <p>
          {p.body.length > 360 && !expanded && !detail
            ? p.body.slice(0, 360) + "…"
            : p.body}
          {p.body.length > 360 && !detail && (
            <button className="text-link inline" onClick={() => setExpanded(!expanded)}>
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
        </p>
        {p.place && (
          <div className="place-label">
            <MapPin size={14} />
            {p.place}
          </div>
        )}
        {p.cancelled && (
          <div className="inline-warning">
            This plan has been cancelled. Source reminders are paused.
          </div>
        )}
        {p.schedule && (
          <Link href={`/app/posts/${p.id}`} className="schedule-card">
            <span className="date-tile">
              <small>{format(new Date(p.schedule.date + "T12:00:00"), "MMM")}</small>
              <strong>{p.schedule.date.slice(-2)}</strong>
            </span>
            <span>
              <strong>{scheduleLabel(p.schedule, me.zone)}</strong>
              <small>
                {p.schedule.recurrence === "none"
                  ? "A little something to look forward to"
                  : `Repeats ${p.schedule.recurrence} · ${p.schedule.zone}`}
              </small>
            </span>
            <ChevronRight size={18} />
          </Link>
        )}
      </div>
      {p.photos.length > 0 && (
        <div className={`post-photos photos-${p.photos.length}`}>
          {p.photos.map((photo, i) => (
            <button
              className="photo-button"
              key={photo.blobId ?? photo.url}
              onClick={() => setLightbox(i)}
              aria-label={`Open photo: ${photo.alt}`}
            >
              <PhotoView
                {...photo}
                width={1000}
                height={650}
                loading={p.id.endsWith("0001") ? "eager" : "lazy"}
              />
              {i === 0 && (
                <span>
                  <ImagePlus size={14} />{" "}
                  {p.photos.length > 1 ? `${p.photos.length} photos` : "A family moment"}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      <div className="post-footer">
        {p.type === "reminder" || (p.type === "alert" && p.schedule) ? (
          <button
            className={`post-action ${saved ? "is-saved" : ""}`}
            disabled={p.cancelled}
            onClick={() =>
              saved ? router.push(`/app/reminders/${saved.id}`) : setLead(30)
            }
          >
            {saved ? <Check size={17} /> : <Bookmark size={17} />}
            <span>{saved ? "Saved to Reminders" : "Add to Reminders"}</span>
          </button>
        ) : p.type === "alert" ? (
          <button
            className={`post-action ${ack ? "is-saved" : ""}`}
            disabled={ack || busy}
            onClick={() =>
              void run({ type: "postAction", id: p.id, action: "ack" })
                .then(() => toast("Acknowledged privately to the author."))
                .catch(() => {})
            }
          >
            <Check size={17} />
            {ack ? "Got it, thank you" : "Got it"}
          </button>
        ) : (
          <Link href={`/app/posts/${p.id}`} className="post-action">
            <ArrowRight size={17} />
            <span>View update</span>
          </Link>
        )}
        {p.type === "alert" && p.schedule && (
          <button
            className="post-action"
            disabled={ack}
            onClick={() =>
              void run({ type: "postAction", id: p.id, action: "ack" }).catch(() => {})
            }
          >
            <Check size={17} />
            {ack ? "Acknowledged" : "Got it"}
          </button>
        )}
        {!own && canDM(state, me.id, p.author) ? (
          <button className="post-action" onClick={() => void messageAuthor()}>
            <MessageCircle size={17} />
            <span>Message {author?.name}</span>
          </button>
        ) : all &&
          state.conversations.some(
            (t) => t.kind === "family" && canReadThread(state, t),
          ) ? (
          <Link
            className="post-action"
            href={`/app/messages/${state.conversations.find((t) => t.kind === "family")?.id}`}
          >
            <MessageCircle size={17} />
            <span>Message family</span>
          </Link>
        ) : null}
      </div>
      {p.type === "alert" && (
        <div className="alert-explainer">
          <ShieldCheck size={13} />
          Your acknowledgement is only visible to you and the author.
          <Link href={`/app/reminders/new?source=${p.id}&snooze=1`}>Remind me later</Link>
        </div>
      )}
      {detail && (
        <div className="post-detail-meta">
          <p>
            <strong>Audience at publication</strong>
            <br />
            {p.recipients
              .map((id) => state.members.find((m) => m.id === id)?.name)
              .filter(Boolean)
              .join(", ")}
            . New members are not added automatically.
          </p>
          {own && p.type === "alert" && (
            <div className="info-box">
              <div>
                <strong>Private acknowledgements</strong>
                {p.recipients
                  .filter((id) => id !== me.id)
                  .map((id) => (
                    <p key={id}>
                      {state.members.find((m) => m.id === id)?.name}:{" "}
                      {p.acknowledgements[id] === p.ackVersion
                        ? "Acknowledged"
                        : "Awaiting acknowledgement"}
                    </p>
                  ))}
              </div>
            </div>
          )}
          {!all && !canDM(state, me.id, p.author) && (
            <p className="muted">
              Messaging is unavailable for this audience under current contact
              permissions.
            </p>
          )}
        </div>
      )}
      <Modal
        open={lead !== null}
        onClose={() => setLead(null)}
        title={saved ? "Already in your reminders" : "Make a little room for this"}
        description="This saves a personal reminder. Other family members choose for themselves."
      >
        <label>
          Remind me
          <select
            aria-label="Remind me"
            value={lead ?? 30}
            onChange={(e) => setLead(Number(e.target.value))}
          >
            <option value={0}>At the time</option>
            <option value={15}>15 minutes before</option>
            <option value={30}>30 minutes before</option>
            <option value={60}>1 hour before</option>
            <option value={1440}>1 day before</option>
          </select>
        </label>
        <div className="dialog-actions">
          <Button variant="secondary" onClick={() => setLead(null)}>
            Cancel
          </Button>
          <Button icon={Bookmark} disabled={saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save reminder"}
          </Button>
        </div>
      </Modal>
      <Confirm
        open={remove}
        onClose={() => setRemove(false)}
        title="Remove this post?"
        danger
        label="Remove post"
        onConfirm={async () => {
          await run({ type: "postAction", id: p.id, action: "delete" });
          toast("Post removed. Source reminders are paused.");
          if (detail) router.push("/app/feed");
        }}
      >
        It will disappear for its recipients. Saved source reminders will show an
        unavailable state.
      </Confirm>
      <Confirm
        open={cancel}
        onClose={() => setCancel(false)}
        title="Cancel this plan?"
        label="Cancel plan"
        onConfirm={() => run({ type: "postAction", id: p.id, action: "cancel" })}
      >
        This stops source-derived reminders. Family members can make their own independent
        reminder.
      </Confirm>
      {report && (
        <ReportDialog
          target={p.id}
          kind="post"
          excerpt={(p.title + " " + p.body).trim().slice(0, 500)}
          author={p.author}
          onClose={() => setReport(false)}
        />
      )}
      <Modal
        open={lightbox !== null}
        onClose={() => setLightbox(null)}
        title="A family moment"
        wide
        onKeyDown={(e) => {
          if (lightbox === null) return;
          if (e.key === "ArrowRight") setLightbox((lightbox + 1) % p.photos.length);
          if (e.key === "ArrowLeft")
            setLightbox((lightbox - 1 + p.photos.length) % p.photos.length);
        }}
      >
        {lightbox !== null && (
          <div className="lightbox">
            <PhotoView {...p.photos[lightbox]} width={1200} height={900} />
            <div>
              <IconButton
                label="Previous photo"
                icon={ChevronLeft}
                onClick={() =>
                  setLightbox((lightbox - 1 + p.photos.length) % p.photos.length)
                }
              />
              <p>
                {p.photos[lightbox].alt} · {lightbox + 1}/{p.photos.length}
              </p>
              <IconButton
                label="Next photo"
                icon={ChevronRight}
                onClick={() => setLightbox((lightbox + 1) % p.photos.length)}
              />
            </div>
          </div>
        )}
      </Modal>
    </article>
  );
}

export function Feed() {
  const { state } = useStore();
  const [filter, setFilter] = useState("all"),
    [count, setCount] = useState(20);
  if (!state) return null;
  const me = member(state)!;
  const posts = state.posts
    .filter((p) => canReadPost(state, p))
    .sort((a, b) => b.created - a.created);
  const filtered = posts.filter((p) => filter === "all" || p.type === filter);
  return (
    <>
      <PageHeading
        eyebrow="A LITTLE CLOSER, EVERY DAY"
        title={`Hello, ${me.name}.`}
        description="The everyday moments. The things to remember. All here."
        action={
          (canPublish(me, "update") || canPublish(me, "alert")) && (
            <Link href="/app/posts/new" className="button button-primary desktop-new">
              <Plus size={18} />
              New post
            </Link>
          )
        }
      />
      <div className="feed-layout">
        <div className="feed-column">
          <section className="welcome-strip">
            <div>
              <span className="section-label">
                <Sprout size={13} />
                Together is a good place to be
              </span>
              <h2>A little space for your everyday.</h2>
              <p>Big plans, small moments, and everything in between.</p>
            </div>
            <div className="home-illustration" aria-hidden="true">
              <svg viewBox="0 0 150 120" fill="none">
                <path
                  d="M27 61 75 22l48 39M39 53v51h72V53M65 104V73h22v31M44 72h12v14H44M95 39V22h14v29"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M18 104h115M20 104V78m0 13L10 81m10 4 10-12M131 104V86m0 7 9-11"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M69 45c0-6 6-7 7-1 3-6 10-2 7 3l-7 7-7-7"
                  fill="currentColor"
                  opacity=".6"
                />
              </svg>
            </div>
          </section>
          {(canPublish(me, "update") || canPublish(me, "alert")) && (
            <section className="quick-compose">
              <Link href="/app/posts/new" className="compose-prompt">
                <Avatar person={me} />
                <span>What’s happening in your corner, {me.name}?</span>
                <span className="compose-plus">
                  <Plus size={20} />
                </span>
              </Link>
              <div className="compose-options">
                {canPublish(me, "update") && (
                  <Link href="/app/posts/new?type=update">
                    <Camera size={17} />
                    <span>Share an update</span>
                  </Link>
                )}
                {canPublish(me, "reminder") && (
                  <Link href="/app/posts/new?type=reminder">
                    <CalendarDays size={17} />
                    <span>Add a reminder</span>
                  </Link>
                )}
                {canPublish(me, "alert") && (
                  <Link href="/app/posts/new?type=alert">
                    <Bell size={17} />
                    <span>Post an alert</span>
                  </Link>
                )}
              </div>
            </section>
          )}
          <div className="feed-toolbar">
            <span className="section-label">Family feed</span>
            <div className="feed-filters" aria-label="Filter feed">
              {[
                ["all", "All"],
                ["update", "Updates"],
                ["reminder", "Reminders"],
                ["alert", "Alerts"],
              ].map(([v, label]) => (
                <button
                  key={v}
                  className={filter === v ? "active" : ""}
                  onClick={() => {
                    setFilter(v);
                    setCount(20);
                  }}
                  aria-pressed={filter === v}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {filter === "all" &&
            posts
              .filter((p) => p.pinned)
              .map((p) => (
                <Link key={p.id} className="pinned-notice" href={`/app/posts/${p.id}`}>
                  <span className="pin-icon">
                    <Pin size={17} />
                  </span>
                  <span>
                    <small>PINNED FOR THE FAMILY</small>
                    <strong>{p.title || p.body.slice(0, 80)}</strong>
                  </span>
                  <ChevronRight size={18} />
                </Link>
              ))}
          <div className="posts-list">
            {filtered.slice(0, count).map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
            {filtered.length === 0 && (
              <Empty icon={Sprout} title="Room for something new">
                No {filter === "all" ? "updates" : filter + "s"} here yet. Share a little
                piece of your day.
                <Link href="/app/posts/new" className="text-link">
                  Create a post
                </Link>
              </Empty>
            )}
          </div>
          {filtered.length > count ? (
            <Button variant="secondary" onClick={() => setCount(count + 20)}>
              Load more updates
            </Button>
          ) : (
            <div className="feed-end">
              <span>
                <Check size={16} />
              </span>
              <p>You are up to date.</p>
              <small>Go make a little more everyday.</small>
            </div>
          )}
        </div>
        <FeedAside />
      </div>
    </>
  );
}
export function FeedAside() {
  const { state } = useStore();
  if (!state) return null;
  const me = member(state)!,
    reminders = state.reminders
      .filter(
        (r) => r.owner === me.id && r.state === "upcoming" && r.response !== "declined",
      )
      .sort((a, b) => a.schedule.date.localeCompare(b.schedule.date));
  return (
    <aside className="utility-column">
      <section className="utility-card">
        <div className="section-heading">
          <span className="section-label">
            <CalendarDays size={14} />
            Coming up
          </span>
          <Link href="/app/reminders" aria-label="View all reminders">
            <ArrowRight size={18} />
          </Link>
        </div>
        <div className="week-heading">
          <strong>{format(new Date(state.anchor), "MMMM yyyy")}</strong>
          <span>Your week, at a glance</span>
        </div>
        <div className="mini-week">
          {Array.from({ length: 7 }, (_, i) => {
            const date = daysFrom(state.anchor, i);
            return (
              <Link
                key={date}
                href={`/app/reminders?day=${date}`}
                className={i === 0 ? "today" : ""}
              >
                <small>{format(new Date(date + "T12:00"), "EEEEE")}</small>
                <strong>{date.slice(-2)}</strong>
                <i
                  className={
                    reminders.some((r) => r.schedule.date === date) ? "has-item" : ""
                  }
                />
              </Link>
            );
          })}
        </div>
        <div className="aside-reminders">
          {reminders.slice(0, 3).map((r) => (
            <ReminderRow key={r.id} reminder={r} compact />
          ))}
          {reminders.length === 0 && (
            <p className="muted">A little breathing room. No upcoming reminders.</p>
          )}
        </div>
        <Link href="/app/reminders/new" className="aside-add">
          <Plus size={16} />
          Add a personal reminder
        </Link>
      </section>
      <section className="utility-card family-card">
        <div className="section-heading">
          <span className="section-label">
            <Users size={14} />
            Your people
          </span>
          <Link href="/app/family" aria-label="View family">
            <ArrowRight size={18} />
          </Link>
        </div>
        <div className="family-avatar-row">
          {state.members
            .filter((m) => m.active)
            .map((m) => (
              <Link key={m.id} href={`/app/family/members/${m.id}`}>
                <Avatar person={m} />
                <span>{m.name}</span>
              </Link>
            ))}
        </div>
        <p>
          A shared space.
          <br />A family’s worth of little moments.
        </p>
      </section>
      <div className="quiet-note">
        <Sprout size={25} strokeWidth={1.3} />
        <p>
          Good things don’t always
          <br />
          need a notification.
        </p>
        <small>Catch up at your own pace.</small>
      </div>
      <div className="aside-demo">
        <span>MADE FOR YOUR FAMILY</span>
        <p>
          You’re exploring a local demo.
          <br />
          Every Parker here is fictional.
        </p>
        <Link href="/app/settings">
          About demo mode <ArrowRight size={13} />
        </Link>
      </div>
    </aside>
  );
}

interface Draft {
  postType: PostType;
  title: string;
  body: string;
  place: string;
  audience: string;
  recipients: string[];
  photos: Photo[];
  date: string;
  time: string;
  allDay: boolean;
  dated: boolean;
  recurrence: Schedule["recurrence"];
}
export function PostEditor({ id }: { id?: string }) {
  const { state, run, repository, toast } = useStore();
  const router = useRouter(),
    search = useSearchParams();
  const me = member(state!)!,
    old = state!.posts.find((p) => p.id === id),
    key = `post:${me.id}:${id ?? "new"}`;
  const initial: Draft = {
    postType:
      old?.type ??
      (["update", "reminder", "alert"].includes(search.get("type") ?? "") &&
      canPublish(me, search.get("type") as PostType)
        ? (search.get("type") as PostType)
        : canPublish(me, "update")
          ? "update"
          : "alert"),
    title: old?.title ?? "",
    body: old?.body ?? search.get("body") ?? "",
    place: old?.place ?? "",
    audience: old ? "selected" : "family",
    recipients:
      old?.recipients ?? state!.members.filter((m) => m.active).map((m) => m.id),
    photos: old?.photos ?? [],
    date: old?.schedule?.date ?? dateKey(),
    time: old?.schedule?.time ?? "12:30",
    allDay: old?.schedule?.allDay ?? false,
    dated: !!old?.schedule,
    recurrence: old?.schedule?.recurrence ?? "none",
  };
  const [draft, setDraft] = useState<Draft>(() => {
      try {
        return state!.drafts[key] ? JSON.parse(state!.drafts[key]) : initial;
      } catch {
        return initial;
      }
    }),
    [saving, setSaving] = useState(false),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState(""),
    [discard, setDiscard] = useState(false),
    [dirty, setDirty] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const update = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
  };
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => {
      void run({ type: "draft", key, text: JSON.stringify(draft) }).catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
  }, [draft, dirty, key, run]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  if (!id && !canPublish(me, "update") && !canPublish(me, "alert"))
    return (
      <>
        <Back />
        <Empty icon={ShieldCheck} title="Posting isn’t enabled right now.">
          Your parents manage this part of your family space. You can still save personal
          reminders and read updates addressed to you.
          <Link className="text-link" href={`/app/family/members/${me.id}`}>
            See my access
          </Link>
        </Empty>
      </>
    );
  if (id && (!old || old.author !== me.id || !canReadPost(state!, old)))
    return (
      <>
        <Back />
        <Empty title="This post can’t be edited">
          Only the original author can edit an available post.
        </Empty>
      </>
    );
  async function upload(files: FileList | null) {
    if (!files) return;
    setUploading(true);
    setError("");
    const next = [...draft.photos];
    try {
      for (const file of Array.from(files)) {
        if (next.length >= 4) throw new Error("You can add up to four photos.");
        if (file.size > 10 * 1024 * 1024)
          throw new Error("Choose photos smaller than 10 MB.");
        const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
        const valid =
          (bytes[0] === 0xff && bytes[1] === 0xd8) ||
          (bytes[0] === 0x89 &&
            bytes[1] === 0x50 &&
            bytes[2] === 0x4e &&
            bytes[3] === 0x47) ||
          (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
            String.fromCharCode(...bytes.slice(8, 12)) === "WEBP");
        if (!valid)
          throw new Error("Use a JPEG, PNG or WebP photo. Convert HEIC photos first.");
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement("canvas"),
          scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (v) => (v ? resolve(v) : reject(new Error("Could not prepare this image."))),
            "image/webp",
            0.85,
          ),
        );
        const blobId = crypto.randomUUID();
        await repository.putPhoto(blobId, blob);
        next.push({ url: "", blobId, alt: "Family activity photo" });
      }
      update({ photos: next });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Photo could not be saved. Your text is preserved.",
      );
    } finally {
      setUploading(false);
    }
  }
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const recipients =
        draft.audience === "family"
          ? state!.members.filter((m) => m.active).map((m) => m.id)
          : draft.recipients;
      await run({
        type: "post",
        id,
        postType: draft.postType,
        title: draft.title,
        body: draft.body,
        place: draft.place,
        recipients,
        photos: draft.photos,
        schedule:
          draft.postType === "reminder" || (draft.postType === "alert" && draft.dated)
            ? {
                date: draft.date,
                time: draft.time,
                allDay: draft.allDay,
                zone: me.zone,
                recurrence: draft.postType === "alert" ? "none" : draft.recurrence,
              }
            : undefined,
      });
      setDirty(false);
      await run({ type: "draft", key, text: "" });
      toast(id ? "Post updated." : "A little moment, shared with your family.");
      router.push(id ? `/app/posts/${id}` : "/app/feed");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not publish. Your draft is preserved.",
      );
      form.current?.querySelector<HTMLElement>("input,textarea")?.focus();
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="editor-page">
      <Back />
      <PageHeading
        eyebrow="A LITTLE SOMETHING TO SHARE"
        title={id ? "Edit your post" : "Bring your family into the moment."}
        description="A plan, a photo, or a little piece of your day."
      />
      <form ref={form} className="panel editor-form" onSubmit={submit}>
        <div className="editor-author">
          <Avatar person={me} />
          <div>
            <strong>{me.name}</strong>
            <small>Sharing in {state!.familyName}</small>
          </div>
          <ShieldCheck size={18} />
        </div>
        <div className="type-selector">
          {(["update", "reminder", "alert"] as PostType[])
            .filter((t) => canPublish(me, t) || (!!id && old?.type === t))
            .map((t) => (
              <button
                key={t}
                type="button"
                disabled={!!id && t !== old?.type}
                aria-pressed={draft.postType === t}
                className={draft.postType === t ? "active" : ""}
                onClick={() => update({ postType: t })}
              >
                {t === "update" ? (
                  <Camera size={17} />
                ) : t === "reminder" ? (
                  <CalendarDays size={17} />
                ) : (
                  <Bell size={17} />
                )}
                <span>
                  {t === "update" ? "Update" : t === "reminder" ? "Reminder" : "Alert"}
                </span>
              </button>
            ))}
        </div>
        {draft.postType !== "update" && (
          <label>
            Title <span className="muted">(required)</span>
            <input
              required
              maxLength={100}
              value={draft.title}
              placeholder={
                draft.postType === "reminder"
                  ? "What’s the plan?"
                  : "What does everyone need to know?"
              }
              onChange={(e) => update({ title: e.target.value })}
            />
          </label>
        )}
        <label>
          {draft.postType === "update" ? "Your update" : "A little more detail"}
          <textarea
            aria-label={
              draft.postType === "update" ? "Your update" : "A little more detail"
            }
            required={
              draft.postType === "alert" ||
              (draft.postType === "update" && draft.photos.length === 0)
            }
            maxLength={3000}
            rows={5}
            value={draft.body}
            placeholder="The little things are worth sharing…"
            onChange={(e) => update({ body: e.target.value })}
          />
          <small className="field-count">{draft.body.length} / 3,000</small>
        </label>
        {draft.postType === "alert" && (
          <label className="check-label">
            <input
              type="checkbox"
              checked={draft.dated}
              onChange={(e) => update({ dated: e.target.checked })}
            />
            Add an optional date
          </label>
        )}
        {(draft.postType === "reminder" ||
          (draft.postType === "alert" && draft.dated)) && (
          <>
            <div className="form-grid">
              <label>
                Date
                <input
                  type="date"
                  required
                  value={draft.date}
                  onChange={(e) => update({ date: e.target.value })}
                />
              </label>
              {!draft.allDay && (
                <label>
                  Time
                  <input
                    type="time"
                    required
                    value={draft.time}
                    onChange={(e) => update({ time: e.target.value })}
                  />
                </label>
              )}
            </div>
            <label className="check-label">
              <input
                type="checkbox"
                checked={draft.allDay}
                onChange={(e) => update({ allDay: e.target.checked })}
              />
              All-day plan
            </label>
            {draft.postType === "reminder" && (
              <label>
                Repeat
                <select
                  value={draft.recurrence}
                  onChange={(e) =>
                    update({
                      recurrence: e.target.value as Schedule["recurrence"],
                    })
                  }
                >
                  <option value="none">Doesn’t repeat</option>
                  <option value="daily">Every day</option>
                  <option value="weekly">Every week</option>
                  <option value="yearly">Every year</option>
                </select>
              </label>
            )}
            <p className="field-help">
              Times use {me.zone}. Publishing lets recipients save the plan themselves.
            </p>
          </>
        )}
        <label>
          Activity or place <span className="muted">(optional)</span>
          <input
            maxLength={100}
            value={draft.place}
            onChange={(e) => update({ place: e.target.value })}
            placeholder="A little context, like ‘Grandma’s garden’"
          />
        </label>
        <div className="photo-upload">
          <label className="button button-secondary">
            <ImagePlus size={18} />
            {uploading ? "Preparing photos…" : "Add photos"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={uploading || draft.photos.length >= 4}
              onChange={(e) => void upload(e.target.files)}
              className="visually-hidden"
            />
          </label>
          <small>Up to 4 · JPEG, PNG, WebP · 10 MB each</small>
        </div>
        {draft.photos.length > 0 && (
          <div className="edit-photos">
            {draft.photos.map((photo, i) => (
              <div key={photo.blobId ?? photo.url}>
                <PhotoView {...photo} width={180} height={130} />
                <IconButton
                  label="Remove photo"
                  icon={X}
                  onClick={() =>
                    update({ photos: draft.photos.filter((_, j) => j !== i) })
                  }
                  type="button"
                />
                <label>
                  Photo description
                  <input
                    value={photo.alt}
                    required
                    onChange={(e) =>
                      update({
                        photos: draft.photos.map((p, j) =>
                          j === i ? { ...p, alt: e.target.value } : p,
                        ),
                      })
                    }
                  />
                </label>
              </div>
            ))}
          </div>
        )}
        <hr />
        <label>
          Who is this for?
          <select
            value={draft.audience}
            onChange={(e) => update({ audience: e.target.value })}
          >
            <option
              value="family"
              disabled={
                !!id &&
                !state!.members
                  .filter((m) => m.active)
                  .every((m) => old?.recipients.includes(m.id))
              }
            >
              Current family members
            </option>
            <option value="selected">Selected family members</option>
          </select>
        </label>
        <p className="field-help">
          The audience is saved when you publish. New members won’t automatically see
          older posts.
          {id ? " You can remove recipients; republish to add someone." : ""}
        </p>
        {draft.audience === "selected" && (
          <PersonPicker
            selected={draft.recipients}
            onChange={(recipients) => update({ recipients })}
            exclude={[me.id]}
            allowed={old?.recipients}
            legend="Choose recipients"
          />
        )}
        {draft.postType === "alert" && (
          <div className="info-box">
            <Bell size={19} />
            <p>
              Recipients can acknowledge privately to you. Alerts respect quiet hours and
              don’t send a device notification in this demo.
            </p>
          </div>
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
            onClick={() => (dirty ? setDiscard(true) : router.push("/app/feed"))}
          >
            Cancel
          </Button>
          <span className="draft-note">
            {dirty ? "Draft kept in this browser" : "Only your family can see this"}
          </span>
          <Button icon={Send} disabled={saving || uploading}>
            {saving ? "Saving…" : id ? "Save changes" : "Share with family"}
          </Button>
        </div>
      </form>
      <Confirm
        open={discard}
        onClose={() => setDiscard(false)}
        title="Leave this draft?"
        label="Keep draft & leave"
        onConfirm={async () => {
          await run({ type: "draft", key, text: JSON.stringify(draft) });
          setDirty(false);
          router.push("/app/feed");
        }}
      >
        Your draft will stay here for when you’re ready to finish it.
      </Confirm>
    </div>
  );
}
