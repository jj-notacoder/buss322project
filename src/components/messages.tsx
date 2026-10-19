"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarPlus,
  Check,
  ChevronRight,
  Copy,
  Flag,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import {
  canDM,
  canPublish,
  canReadPost,
  canReadThread,
  member,
  visibleMessages,
} from "@/domain/permissions";
import { dateKey, relative } from "@/domain/dates";
import type { Conversation, Message } from "@/domain/model";
import { useStore } from "./provider";
import { Avatar, Button, Confirm, Empty, Modal, PageHeading, PersonPicker } from "./ui";
import { ReportDialog } from "./posts";

export function Messages({ threadId }: { threadId?: string }) {
  const { state, run } = useStore();
  const router = useRouter();
  const [query, setQuery] = useState(""),
    [create, setCreate] = useState(false),
    [people, setPeople] = useState<string[]>([]),
    [error, setError] = useState("");
  if (!state) return null;
  const me = member(state)!;
  const threads = state.conversations
    .filter((t) => canReadThread(state, t))
    .sort(
      (a, b) =>
        (visibleMessages(state, b).at(-1)?.created ?? b.created) -
        (visibleMessages(state, a).at(-1)?.created ?? a.created),
    );
  const selected = threadId
    ? state.conversations.find((t) => t.id === threadId)
    : undefined;
  const eligible = state.members
    .filter((m) => canDM(state, me.id, m.id))
    .map((m) => m.id);
  return (
    <div className={`messages-page ${threadId ? "has-thread" : ""}`}>
      <PageHeading
        eyebrow="CLOSE, EVEN WHEN YOU’RE APART"
        title="A place to catch up."
        description="Just your people. Just the conversation."
        action={
          eligible.length > 0 && (
            <Button icon={Plus} onClick={() => setCreate(true)}>
              New conversation
            </Button>
          )
        }
      />
      <div className="messages-layout">
        <section className="conversation-list">
          <label className="search-field">
            <Search size={18} />
            <span className="visually-hidden">Search conversations</span>
            <input
              placeholder="Find a conversation"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <span className="sidebar-label">YOUR CONVERSATIONS</span>
          {threads
            .filter((t) => t.title.toLowerCase().includes(query.toLowerCase()))
            .map((t) => {
              const messages = visibleMessages(state, t),
                last = messages.at(-1),
                unread = messages.filter(
                  (m) =>
                    m.sender !== me.id &&
                    m.created > (state.read[`${me.id}:${t.id}`] ?? 0),
                ).length;
              return (
                <Link
                  href={`/app/messages/${t.id}`}
                  key={t.id}
                  className={`conversation-row ${t.id === threadId ? "active" : ""}`}
                >
                  <ThreadAvatar thread={t} />
                  <div>
                    <div>
                      <strong>{t.title}</strong>
                      <small>{last ? relative(last.created) : ""}</small>
                    </div>
                    <p>
                      {last
                        ? `${last.sender === me.id ? "You" : (member(state, last.sender)?.name ?? "Former member")}: ${last.body}`
                        : "A little room to say hello."}
                    </p>
                  </div>
                  {unread > 0 && (
                    <span
                      className="unread-badge"
                      aria-label={`${unread} unread messages`}
                    >
                      {unread}
                    </span>
                  )}
                </Link>
              );
            })}
          {threads.length === 0 && (
            <Empty icon={MessageCircle} title="A quiet corner">
              No conversations are available under your current access.
            </Empty>
          )}
          <div className="conversation-privacy">
            <ShieldCheck size={18} />
            <p>Private conversations are only visible to their participants.</p>
          </div>
        </section>
        <section className="conversation-pane">
          {selected && canReadThread(state, selected) ? (
            <Thread key={selected.id + me.id} thread={selected} />
          ) : threadId ? (
            <div className="thread-unavailable">
              <Link href="/app/messages" className="back-link">
                <ArrowLeft size={17} />
                All conversations
              </Link>
              <Empty icon={ShieldCheck} title="This conversation isn’t available">
                Current contact settings or source access prevent opening this history.
                You can still use the family room if it is enabled.
              </Empty>
            </div>
          ) : (
            <Empty icon={MessageCircle} title="Come on in.">
              Choose a conversation to catch up with your family.
            </Empty>
          )}
        </section>
      </div>
      <p className="page-footnote">
        Demo messages stay in this browser. No messages reach real devices.
      </p>
      <Modal
        open={create}
        onClose={() => setCreate(false)}
        title="Start a little conversation"
        description="Only members who can currently message each other can be included."
      >
        <PersonPicker
          selected={people}
          onChange={setPeople}
          allowed={eligible}
          legend="Choose family"
        />
        {error && <p className="inline-error">{error}</p>}
        <div className="dialog-actions">
          <Button variant="secondary" onClick={() => setCreate(false)}>
            Cancel
          </Button>
          <Button
            disabled={!people.length}
            onClick={async () => {
              try {
                const next = await run({
                  type: "thread",
                  participants: people,
                });
                const t = next.conversations.find(
                  (t) =>
                    t.kind === "private" &&
                    t.participants.length === people.length + 1 &&
                    people.every((id) => t.participants.includes(id)) &&
                    t.participants.includes(me.id),
                );
                if (t) {
                  setCreate(false);
                  router.push(`/app/messages/${t.id}`);
                }
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Could not create this conversation.",
                );
              }
            }}
          >
            Open conversation
          </Button>
        </div>
      </Modal>
    </div>
  );
}
function ThreadAvatar({ thread: t }: { thread: Conversation }) {
  const { state } = useStore();
  return t.kind === "family" ? (
    <span className="thread-family-avatar">
      <Users size={22} />
    </span>
  ) : (
    <Avatar
      person={state?.members.find(
        (m) => t.participants.includes(m.id) && m.id !== state.current,
      )}
    />
  );
}
function Thread({ thread: t }: { thread: Conversation }) {
  const { state, run, toast } = useStore();
  const router = useRouter();
  const me = member(state!)!,
    key = `message:${me.id}:${t.id}`;
  const [initialView] = useState<{ top?: number; count?: number }>(() => {
    try {
      return JSON.parse(state!.drafts[`view:${key}`] ?? "{}");
    } catch {
      return {};
    }
  });
  const [body, setBody] = useState(state!.drafts[key] ?? ""),
    [status, setStatus] = useState<"idle" | "pending" | "failed">("idle"),
    [count, setCount] = useState(initialView.count ?? 50),
    [report, setReport] = useState<Message | null>(null),
    [remove, setRemove] = useState<Message | null>(null);
  const bottom = useRef<HTMLDivElement>(null),
    keyRef = useRef(crypto.randomUUID()),
    input = useRef<HTMLTextAreaElement>(null),
    history = useRef<HTMLDivElement>(null),
    restored = useRef(false),
    olderHeight = useRef(0);
  const messages = visibleMessages(state!, t),
    visible = messages.slice(-count),
    source = t.source
      ? state!.posts.find((p) => p.id === t.source && canReadPost(state!, p))
      : undefined;
  useEffect(() => {
    void run({ type: "readThread", id: t.id }).catch(() => {});
  }, [t.id, run]);
  useEffect(() => {
    if (!restored.current) {
      restored.current = true;
      try {
        const view = initialView;
        if (view.top !== undefined && history.current) {
          history.current.scrollTop = view.top;
          return;
        }
      } catch {}
    }
    bottom.current?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [messages.length, initialView]);
  useLayoutEffect(() => {
    if (olderHeight.current && history.current) {
      history.current.scrollTop += history.current.scrollHeight - olderHeight.current;
      olderHeight.current = 0;
    }
  }, [count]);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (body !== (state!.drafts[key] ?? ""))
        void run({ type: "draft", key, text: body }).catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [body, key, run, state]);
  async function send() {
    if (!body.trim() || status === "pending") return;
    setStatus("pending");
    try {
      await run({
        type: "message",
        conversation: t.id,
        body,
        mutationKey: keyRef.current,
      });
      setBody("");
      keyRef.current = crypto.randomUUID();
      setStatus("idle");
      input.current?.focus();
    } catch {
      setStatus("failed");
    }
  }
  async function derived(href: string) {
    try {
      await run({ type: "draft", key, text: body });
      await run({
        type: "draft",
        key: `view:${key}`,
        text: JSON.stringify({ top: history.current?.scrollTop ?? 0, count }),
      });
      router.push(href);
    } catch {}
  }
  return (
    <div className="thread">
      <header className="thread-header">
        <Link
          href="/app/messages"
          className="icon-button thread-back"
          aria-label="Back to conversations"
        >
          <ArrowLeft size={20} />
        </Link>
        <ThreadAvatar thread={t} />
        <div>
          <h2>{t.title}</h2>
          <p>
            {t.kind === "family"
              ? "A shared room for the family"
              : t.participants.map((id) => member(state!, id)?.name).join(", ")}
          </p>
        </div>
        <span className="thread-kind">
          <ShieldCheck size={17} />
          {t.kind === "family" ? "Family" : "Private"}
        </span>
      </header>
      {source && (
        <Link className="thread-source" href={`/app/posts/${source.id}`}>
          <CalendarPlus size={17} />
          <span>About: {source.title || source.body.slice(0, 65)}</span>
          <ChevronRight size={17} />
        </Link>
      )}
      <div className="message-history" ref={history}>
        {messages.length > count && (
          <Button
            variant="ghost"
            onClick={() => {
              olderHeight.current = history.current?.scrollHeight ?? 0;
              setCount(count + 50);
            }}
          >
            Load older messages
          </Button>
        )}
        <div className="chat-intro">
          <ShieldCheck size={15} />
          <span>
            {t.kind === "family"
              ? "A room for current family members. New members see messages from when they joined."
              : "Only participants can read this conversation. Parents don’t get extra access."}
          </span>
        </div>
        {visible.map((m, i) => {
          const mine = m.sender === me.id,
            author = member(state!, m.sender),
            date = dateKey(m.created, me.zone),
            prev = visible[i - 1];
          return (
            <div key={m.id}>
              {(!prev || dateKey(prev.created, me.zone) !== date) && (
                <div className="date-separator">
                  {format(new Date(m.created), "EEEE, d MMMM")}
                </div>
              )}
              <div className={`message-row ${mine ? "mine" : ""}`}>
                {!mine && <Avatar person={author} size="small" />}
                <div className="message-content">
                  {!mine && (
                    <strong className="message-author">
                      {author?.name ?? "Former member"}
                    </strong>
                  )}
                  <div className="message-bubble">
                    <p>{m.body}</p>
                    <span>
                      {format(new Date(m.created), "h:mm a")}
                      {mine && <Check size={12} aria-label="Saved locally" />}
                    </span>
                  </div>
                </div>
                <details className="action-menu message-actions">
                  <summary aria-label={`Actions for message from ${author?.name}`}>
                    <MoreHorizontal size={17} />
                  </summary>
                  <div>
                    <button
                      onClick={() => void derived(`/app/reminders/new?message=${m.id}`)}
                    >
                      <CalendarPlus size={15} />
                      Create reminder
                    </button>
                    {canPublish(me, "update") && (
                      <button
                        onClick={() =>
                          void derived(
                            `/app/posts/new?body=${encodeURIComponent(m.body)}`,
                          )
                        }
                      >
                        <Share2 size={15} />
                        Share as family post
                      </button>
                    )}
                    <button
                      onClick={() =>
                        void navigator.clipboard
                          .writeText(m.body)
                          .then(() => toast("Message copied."))
                          .catch(() => toast("Your browser could not copy this message."))
                      }
                    >
                      <Copy size={15} />
                      Copy message
                    </button>
                    {mine ? (
                      <button onClick={() => setRemove(m)}>
                        <Trash2 size={15} />
                        Delete message
                      </button>
                    ) : (
                      <button onClick={() => setReport(m)}>
                        <Flag size={15} />
                        Share a concern
                      </button>
                    )}
                  </div>
                </details>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <Empty icon={MessageCircle} title="A conversation starts with hello.">
            Your messages will appear here.
          </Empty>
        )}
        <div ref={bottom} />
      </div>
      <form
        className="message-input-area"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        {status === "failed" && (
          <div className="inline-error" role="alert">
            Your message wasn’t saved. Your text is still here.{" "}
            <button type="button" className="text-link" onClick={() => void send()}>
              Retry
            </button>
          </div>
        )}
        <label htmlFor="message-body" className="visually-hidden">
          Message to {t.title}
        </label>
        <div className="message-input-wrap">
          <textarea
            ref={input}
            id="message-body"
            rows={2}
            maxLength={4000}
            value={body}
            placeholder="A little hello goes a long way…"
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                window.matchMedia("(min-width: 768px)").matches
              ) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <button
            type="submit"
            aria-label={status === "pending" ? "Saving message" : "Send message locally"}
            disabled={!body.trim() || status === "pending"}
            className="send-button"
          >
            <Send size={19} />
          </button>
        </div>
        <small>
          {status === "pending"
            ? "Saving locally…"
            : `${body.length}/4,000 · Messages stay in this demo browser`}
        </small>
      </form>
      {report && (
        <ReportDialog
          target={report.id}
          kind="message"
          excerpt={report.body.slice(0, 500)}
          author={report.sender}
          onClose={() => setReport(null)}
        />
      )}
      <Confirm
        open={!!remove}
        onClose={() => setRemove(null)}
        title="Delete this message?"
        label="Delete message"
        danger
        onConfirm={() =>
          remove ? run({ type: "deleteMessage", id: remove.id }) : undefined
        }
      >
        It will be removed from the local conversation for every demo profile. Derived
        reminders will show the source is unavailable.
      </Confirm>
    </div>
  );
}
