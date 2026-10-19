import type {
  Conversation,
  Invite,
  Member,
  Message,
  Photo,
  Post,
  PostType,
  Preferences,
  Reminder,
  Schedule,
  State,
} from "./model";
import {
  canDM,
  canPublish,
  canReadPost,
  canReadThread,
  isParent,
  member,
} from "./permissions";
import { dateKey, daysFrom, inQuietHours, instant, nextSchedule } from "./dates";

export type Command =
  | { type: "switch"; id: string }
  | {
      type: "post";
      id?: string;
      postType: PostType;
      title: string;
      body: string;
      place: string;
      recipients: string[];
      photos: Photo[];
      schedule?: Schedule;
    }
  | {
      type: "postAction";
      id: string;
      action: "delete" | "pin" | "ack" | "cancel" | "narrow";
      recipients?: string[];
    }
  | {
      type: "reminder";
      id?: string;
      title: string;
      details: string;
      schedule: Schedule;
      lead: number;
      source?: string;
      messageSource?: string;
      assignees?: string[];
    }
  | {
      type: "reminderAction";
      id: string;
      action:
        "complete" | "reopen" | "remove" | "adopt" | "override" | "accept" | "decline";
    }
  | { type: "thread"; participants: string[]; source?: string }
  | { type: "message"; conversation: string; body: string; mutationKey: string }
  | { type: "deleteMessage"; id: string }
  | { type: "readThread"; id: string }
  | { type: "draft"; key: string; text: string }
  | { type: "permissions"; id: string; permissions: Member["permissions"] }
  | {
      type: "childQuiet";
      id: string;
      quiet: boolean;
      start: string;
      end: string;
    }
  | { type: "profile"; name: string; zone: string; preferences: Preferences }
  | { type: "readNotification"; id?: string }
  | {
      type: "location";
      action: "start" | "stop";
      recipients?: string[];
      duration?: number;
    }
  | {
      type: "report";
      target: string;
      kind: "post" | "message";
      reason: string;
      note: string;
      excerpt: string;
      confirmed: boolean;
    }
  | { type: "review"; id: string; state: "Open" | "Reviewed" | "Resolved" }
  | { type: "invite"; name: string; role: Invite["role"] }
  | { type: "inviteAction"; id: string; action: "revoke" | "accept" }
  | { type: "child"; name: string }
  | { type: "device"; id: string; action: "Approved" | "Revoked" }
  | { type: "pair"; child: string; label: string }
  | {
      type: "member";
      id: string;
      action: "remove" | "parent" | "adult" | "transfer";
    }
  | { type: "family"; name: string }
  | { type: "close" };
const uuid = () => crypto.randomUUID();
function requireThat(test: unknown, message: string): asserts test {
  if (!test) throw new Error(message);
}
function validSchedule(s: Schedule) {
  requireThat(
    /^\d{4}-\d{2}-\d{2}$/.test(s.date) &&
      (s.allDay || /^([01]\d|2[0-3]):[0-5]\d$/.test(s.time)),
    "Choose a valid date and time.",
  );
  requireThat(
    ["none", "daily", "weekly", "yearly"].includes(s.recurrence),
    "Choose a supported recurrence.",
  );
  try {
    new Intl.DateTimeFormat("en", { timeZone: s.zone }).format();
  } catch {
    throw new Error("Choose a valid IANA timezone.");
  }
  requireThat(Number.isFinite(instant(s)), "This date is not valid.");
  requireThat(
    new Date(s.date + "T12:00:00Z").toISOString().slice(0, 10) === s.date,
    "Choose an existing calendar date.",
  );
}
function notify(
  s: State,
  owner: string,
  title: string,
  body: string,
  href: string,
  category: "reminders" | "updates" | "messages" | "family",
  key: string,
  now: number,
) {
  if (s.notifications.some((n) => n.key === key && n.owner === owner)) return;
  const m = member(s, owner);
  if (!m || !m.preferences[category]) return;
  let deliverAfter: number | undefined;
  if (
    m.preferences.quiet &&
    inQuietHours(now, m.zone, m.preferences.quietStart, m.preferences.quietEnd)
  ) {
    const end: Schedule = {
      date: dateKey(now, m.zone),
      time: m.preferences.quietEnd,
      allDay: false,
      zone: m.zone,
      recurrence: "none",
    };
    if (instant(end) <= now) end.date = daysFrom(now, 1, m.zone);
    deliverAfter = instant(end);
  }
  s.notifications.push({
    id: uuid(),
    owner,
    title,
    body,
    href,
    category,
    key,
    created: now,
    event: now,
    read: false,
    deliverAfter,
  });
}
export function syncSources(s: State) {
  for (const r of s.reminders) {
    if (r.source) {
      const p = s.posts.find((p) => p.id === r.source);
      if (!p || !canReadPost(s, p, r.owner)) {
        r.change = "unavailable";
        r.details = "";
        r.sourceSchedule = undefined;
        r.title = "Source unavailable";
        continue;
      }
      if (p.cancelled) {
        r.change = "cancelled";
        continue;
      }
      if (r.sourceVersion !== p.version) {
        if (
          JSON.stringify(r.sourceSchedule) !== JSON.stringify(p.schedule) ||
          (r.sourcePlace ?? "") !== p.place
        )
          r.change = "changed";
        else {
          r.title = p.title;
          r.details = p.body;
          r.sourceVersion = p.version;
        }
      }
    }
    if (r.messageSource) {
      const msg = s.messages.find((m) => m.id === r.messageSource && !m.deleted);
      const thread = msg && s.conversations.find((t) => t.id === msg.conversation);
      if (!msg || !thread || !canReadThread(s, thread, r.owner)) {
        r.change = "unavailable";
        r.title = "Source unavailable";
        r.details = "";
      }
    }
  }
  s.notifications = s.notifications.filter((n) => {
    if (n.href.startsWith("/app/messages/")) {
      const thread = s.conversations.find((t) => n.href === `/app/messages/${t.id}`);
      return !!thread && canReadThread(s, thread, n.owner);
    }
    if (n.href.startsWith("/app/posts/")) {
      const p = s.posts.find((p) => n.href === `/app/posts/${p.id}`);
      if (!p || !canReadPost(s, p, n.owner)) {
        n.title = "A family update is unavailable";
        n.body = "";
      }
    }
    return true;
  });
}
export function processDue(input: State, now = Date.now()): State {
  const s = structuredClone(input);
  s.locations = s.locations.filter((l) => l.expires > now && member(s, l.member));
  syncSources(s);
  s.notifications = s.notifications.filter((n) => {
    if (!n.deliverAfter) return true;
    if (n.key.startsWith("due:")) {
      const r = s.reminders.find((r) => n.href === `/app/reminders/${r.id}`);
      if (!r || r.state !== "upcoming" || r.change !== "none") return false;
    }
    if (n.deliverAfter <= now) {
      n.created = now;
      n.deliverAfter = undefined;
    }
    return true;
  });
  for (const r of s.reminders) {
    const m = member(s, r.owner);
    if (
      !m ||
      !m.preferences.reminders ||
      r.state !== "upcoming" ||
      r.change !== "none" ||
      r.response === "pending" ||
      r.response === "declined"
    )
      continue;
    const due = instant(r.schedule);
    if (r.scheduledAt && due < r.scheduledAt) continue;
    const leadTime = due - r.lead * 60000;
    const trigger =
      r.scheduledAt && leadTime < r.scheduledAt && due > r.scheduledAt ? due : leadTime;
    if (now < trigger || now > due + 86400000) continue;
    const key = `due:${r.id}:${r.schedule.date}:${r.schedule.time}:${r.sourceVersion ?? 0}`;
    notify(
      s,
      r.owner,
      "A reminder for you",
      r.title,
      `/app/reminders/${r.id}`,
      "reminders",
      key,
      now,
    );
    const n = s.notifications.find((n) => n.key === key);
    if (n) n.event = trigger;
  }
  return s;
}
export function execute(input: State, c: Command, now = Date.now()): State {
  const s = structuredClone(input);
  const me = member(s);
  requireThat(
    me && !s.closed,
    "This family space is unavailable. Reset the demo to start again.",
  );
  const parent = () => requireThat(isParent(s), "Only a parent can manage this setting.");
  const active = s.members.filter((m) => m.active).map((m) => m.id);
  if (c.type === "switch") {
    requireThat(member(s, c.id), "This profile is unavailable.");
    s.current = c.id;
  }
  if (c.type === "post") {
    requireThat(
      !!c.id || canPublish(me, c.postType),
      "Your current access does not allow this post type.",
    );
    requireThat(
      c.body.length <= 3000 && c.title.length <= 100,
      "Keep the title within 100 characters and the message within 3,000.",
    );
    requireThat(
      c.postType === "update" ? c.body.trim() || c.photos.length : c.title.trim(),
      "Add a title or write something to share.",
    );
    requireThat(c.postType !== "alert" || c.body.trim(), "Alerts need a message.");
    requireThat(c.photos.length <= 4, "Choose up to four photos.");
    const recipients = [...new Set([...c.recipients, me.id])];
    requireThat(
      recipients.every((id) => active.includes(id)),
      "Choose current family members.",
    );
    if (c.postType === "reminder") requireThat(c.schedule, "Reminders need a date.");
    if (c.schedule) validSchedule(c.schedule);
    const old = c.id ? s.posts.find((p) => p.id === c.id) : undefined;
    if (c.id)
      requireThat(
        old && canReadPost(s, old) && old.author === me.id,
        "Only the author can edit this post.",
      );
    if (old) {
      requireThat(old.type === c.postType, "The type cannot change after publication.");
      requireThat(
        recipients.every((id) => old.recipients.includes(id)),
        "You can narrow the audience. Republish to add recipients.",
      );
    }
    const material =
      !!old &&
      (JSON.stringify(old.schedule) !== JSON.stringify(c.schedule) ||
        old.place !== c.place ||
        (old.type === "alert" &&
          (old.title.replace(/\W/g, "") !== c.title.replace(/\W/g, "") ||
            old.body.replace(/\W/g, "") !== c.body.replace(/\W/g, ""))));
    const p: Post = {
      id: old?.id ?? uuid(),
      author: me.id,
      type: c.postType,
      title: c.title.trim(),
      body: c.body.trim(),
      place: c.place.trim(),
      recipients,
      photos: c.photos,
      schedule: c.schedule,
      created: old?.created ?? now,
      edited: old ? now : undefined,
      version: (old?.version ?? 0) + 1,
      ackVersion: (old?.ackVersion ?? 1) + (material ? 1 : 0),
      acknowledgements: old?.acknowledgements ?? {},
      pinned: old?.pinned ?? false,
      removed: false,
      cancelled: old?.cancelled ?? false,
    };
    if (old) s.posts[s.posts.indexOf(old)] = p;
    else s.posts.push(p);
    if (material)
      for (const id of recipients.filter((id) => id !== me.id))
        notify(
          s,
          id,
          "A family plan has changed",
          p.title,
          `/app/posts/${p.id}`,
          "updates",
          `change:${p.id}:${p.version}`,
          now,
        );
    if (!old)
      for (const id of recipients.filter((id) => id !== me.id))
        notify(
          s,
          id,
          "A little update from your family",
          p.title || "A new everyday moment.",
          `/app/posts/${p.id}`,
          "updates",
          `post:${p.id}`,
          now,
        );
  }
  if (c.type === "postAction") {
    const p = s.posts.find((p) => p.id === c.id);
    requireThat(p && canReadPost(s, p), "This post is unavailable.");
    if (c.action === "delete") {
      requireThat(p.author === me.id || isParent(s), "You cannot remove this post.");
      p.removed = true;
      p.body = "";
      p.title = "";
      p.photos = [];
      p.acknowledgements = {};
    }
    if (c.action === "cancel") {
      requireThat(p.author === me.id, "Only the author can cancel this plan.");
      p.cancelled = true;
    }
    if (c.action === "pin") {
      parent();
      requireThat(
        active.every((id) => p.recipients.includes(id)),
        "Only a whole-family notice can be pinned.",
      );
      requireThat(
        p.pinned || s.posts.filter((v) => v.pinned && !v.removed).length < 2,
        "Unpin another notice first (maximum two).",
      );
      p.pinned = !p.pinned;
    }
    if (c.action === "ack") {
      requireThat(p.type === "alert", "Only alerts have acknowledgements.");
      p.acknowledgements[me.id] = p.ackVersion;
    }
    if (c.action === "narrow") {
      requireThat(p.author === me.id, "Only the author can narrow the audience.");
      p.recipients = p.recipients.filter(
        (id) => id === me.id || c.recipients?.includes(id),
      );
      for (const id of Object.keys(p.acknowledgements))
        if (!p.recipients.includes(id)) delete p.acknowledgements[id];
    }
  }
  if (c.type === "reminder") {
    requireThat(
      c.title.trim() && c.title.length <= 100 && c.details.length <= 3000,
      "Add a title (up to 100 characters).",
    );
    validSchedule(c.schedule);
    requireThat(
      [0, 5, 10, 15, 30, 60, 1440].includes(c.lead),
      "Choose a supported lead time.",
    );
    const old = c.id
      ? s.reminders.find((r) => r.id === c.id && r.owner === me.id)
      : undefined;
    if (c.id) requireThat(old, "This personal reminder is unavailable.");
    const sourceId = c.source ?? old?.source;
    const source = sourceId ? s.posts.find((p) => p.id === sourceId) : undefined;
    if (sourceId)
      requireThat(
        source && canReadPost(s, source) && !source.cancelled,
        "The source is unavailable or cancelled.",
      );
    if (c.messageSource) {
      const msg = s.messages.find((m) => m.id === c.messageSource && !m.deleted);
      requireThat(
        msg &&
          s.conversations.some((t) => t.id === msg.conversation && canReadThread(s, t)),
        "The source message is unavailable.",
      );
    }
    const owners = c.assignees?.length ? c.assignees : [me.id];
    if (owners.some((id) => id !== me.id)) parent();
    for (const owner of owners) {
      const recipient = member(s, owner);
      requireThat(recipient, "The assignee is unavailable.");
      if (source)
        requireThat(
          canReadPost(s, source!, owner),
          "An assignee cannot access this source.",
        );
      requireThat(!c.messageSource || owner === me.id, "Message reminders are personal.");
      if (
        !old &&
        source &&
        s.reminders.some((r) => r.owner === owner && r.source === source.id)
      )
        continue;
      const r: Reminder = {
        id: old?.id ?? uuid(),
        owner,
        title: c.title.trim(),
        details: c.details.trim(),
        schedule: c.schedule,
        lead: c.lead,
        scheduledAt: now,
        source: c.source ?? old?.source,
        messageSource: c.messageSource ?? old?.messageSource,
        sourceVersion: source?.version ?? old?.sourceVersion,
        sourceSchedule: source?.schedule ?? old?.sourceSchedule,
        sourcePlace: source?.place ?? old?.sourcePlace,
        state: old?.state ?? "upcoming",
        change: "none",
        override: !!old?.source,
        assigner: owner !== me.id ? me.id : old?.assigner,
        response:
          owner !== me.id
            ? recipient.role === "child"
              ? "accepted"
              : "pending"
            : old?.response,
        history: old?.history ?? [],
      };
      if (old) s.reminders[s.reminders.indexOf(old)] = r;
      else s.reminders.push(r);
      if (owner !== me.id)
        notify(
          s,
          owner,
          recipient.role === "child"
            ? "A reminder was assigned to you"
            : "A reminder request",
          r.title,
          `/app/reminders/${r.id}`,
          "reminders",
          `assign:${r.id}`,
          now,
        );
    }
  }
  if (c.type === "reminderAction") {
    const r = s.reminders.find((r) => r.id === c.id && r.owner === me.id);
    requireThat(r, "This personal reminder is unavailable.");
    if (c.action === "remove") s.reminders = s.reminders.filter((v) => v.id !== r.id);
    if (c.action === "complete") {
      requireThat(r.state === "upcoming", "This occurrence is already complete.");
      requireThat(
        r.response !== "pending" && r.response !== "declined",
        "Accept this reminder first.",
      );
      r.history.push(`${r.schedule.date} ${r.schedule.time}`);
      if (r.schedule.recurrence === "none") r.state = "completed";
      else r.schedule = nextSchedule(r.schedule);
    }
    if (c.action === "reopen") r.state = "upcoming";
    if (c.action === "accept" || c.action === "decline")
      r.response = c.action === "accept" ? "accepted" : "declined";
    if (c.action === "adopt") {
      const p = s.posts.find((p) => p.id === r.source);
      requireThat(
        p && canReadPost(s, p) && p.schedule && !p.cancelled,
        "This source is unavailable.",
      );
      r.schedule = p.schedule;
      r.scheduledAt = now;
      r.sourceSchedule = p.schedule;
      r.sourcePlace = p.place;
      r.sourceVersion = p.version;
      r.title = p.title;
      r.details = p.body;
      r.change = "none";
      r.override = false;
    }
    if (c.action === "override") {
      requireThat(r.change === "changed", "Review a source change first.");
      const p = s.posts.find((p) => p.id === r.source);
      r.sourceVersion = p?.version;
      r.sourceSchedule = p?.schedule;
      r.sourcePlace = p?.place;
      r.change = "none";
      r.override = true;
      r.scheduledAt = now;
    }
  }
  if (c.type === "thread") {
    const participants = [...new Set([me.id, ...c.participants])].sort();
    requireThat(
      participants.length >= 2 &&
        participants.every((a) => participants.every((b) => a === b || canDM(s, a, b))),
      "Private messaging is not allowed between these members. Family conversation is still available if enabled.",
    );
    if (c.source)
      requireThat(
        s.posts.some(
          (p) => p.id === c.source && participants.every((id) => canReadPost(s, p, id)),
        ),
        "Everyone in this conversation must have access to the post.",
      );
    if (
      !s.conversations.some(
        (t) =>
          t.source === c.source &&
          t.kind !== "family" &&
          JSON.stringify([...t.participants].sort()) === JSON.stringify(participants),
      )
    ) {
      const t: Conversation = {
        id: uuid(),
        kind: c.source ? "context" : "private",
        participants,
        source: c.source,
        title: participants.map((id) => member(s, id)!.name).join(" & "),
        created: now,
      };
      s.conversations.push(t);
    }
  }
  if (c.type === "message") {
    const t = s.conversations.find((t) => t.id === c.conversation);
    requireThat(
      t && canReadThread(s, t),
      "This conversation is unavailable under current permissions.",
    );
    requireThat(
      c.body.trim() && c.body.length <= 4000,
      "Write a message of up to 4,000 characters.",
    );
    if (!s.messages.some((m) => m.sender === me.id && m.mutationKey === c.mutationKey)) {
      const m: Message = {
        id: uuid(),
        conversation: t.id,
        sender: me.id,
        body: c.body.trim(),
        created: now,
        deleted: false,
        mutationKey: c.mutationKey,
      };
      s.messages.push(m);
      const ids = t.kind === "family" ? active : t.participants;
      for (const id of ids.filter((id) => id !== me.id && canReadThread(s, t, id)))
        notify(
          s,
          id,
          `Message from ${me.name}`,
          "Open the conversation to read it.",
          `/app/messages/${t.id}`,
          "messages",
          `message:${m.id}`,
          now,
        );
      delete s.drafts[`message:${me.id}:${t.id}`];
    }
  }
  if (c.type === "deleteMessage") {
    const m = s.messages.find((m) => m.id === c.id);
    requireThat(
      m &&
        m.sender === me.id &&
        s.conversations.some((t) => t.id === m.conversation && canReadThread(s, t)),
      "Only your own accessible messages can be deleted.",
    );
    m.deleted = true;
    m.body = "";
  }
  if (c.type === "readThread") {
    const t = s.conversations.find((t) => t.id === c.id);
    requireThat(t && canReadThread(s, t), "Conversation unavailable.");
    s.read[`${me.id}:${c.id}`] = now;
  }
  if (c.type === "draft") s.drafts[c.key] = c.text;
  if (c.type === "permissions") {
    parent();
    const child = member(s, c.id);
    requireThat(child?.role === "child", "Choose a child profile.");
    requireThat(
      c.permissions.contacts.every((id) => id !== child.id && active.includes(id)),
      "Choose active approved contacts.",
    );
    child.permissions = c.permissions;
    if (!child.permissions.location)
      s.locations = s.locations.filter((l) => l.member !== child.id);
    notify(
      s,
      child.id,
      "Your family access changed",
      "See what you can do in My access.",
      `/app/family/members/${child.id}`,
      "family",
      `permissions:${child.id}:${now}`,
      now,
    );
  }
  if (c.type === "profile") {
    requireThat(
      c.name.trim() && c.name.length <= 60,
      "Use a name of up to 60 characters.",
    );
    try {
      new Intl.DateTimeFormat("en", { timeZone: c.zone }).format();
    } catch {
      throw new Error("Enter a valid IANA timezone, such as Asia/Dubai.");
    }
    me.name = c.name.trim();
    me.zone = c.zone;
    me.preferences = c.preferences;
  }
  if (c.type === "childQuiet") {
    parent();
    const child = member(s, c.id);
    requireThat(child?.role === "child", "Choose a child profile.");
    requireThat(
      /^([01]\d|2[0-3]):[0-5]\d$/.test(c.start) &&
        /^([01]\d|2[0-3]):[0-5]\d$/.test(c.end),
      "Choose valid quiet hours.",
    );
    child.preferences.quiet = c.quiet;
    child.preferences.quietStart = c.start;
    child.preferences.quietEnd = c.end;
  }
  if (c.type === "readNotification")
    for (const n of s.notifications.filter(
      (n) => n.owner === me.id && (!c.id || c.id === n.id),
    ))
      n.read = true;
  if (c.type === "location") {
    if (c.action === "stop") s.locations = s.locations.filter((l) => l.member !== me.id);
    else {
      requireThat(
        me.role !== "child" || me.permissions.location,
        "A parent needs to enable location first.",
      );
      requireThat(
        [15, 60, 240].includes(c.duration ?? 0),
        "Choose 15 minutes, 1 hour or 4 hours.",
      );
      if (me.role === "child")
        requireThat(
          c.recipients?.every((id) => me.permissions.contacts.includes(id)),
          "Choose approved location recipients.",
        );
      requireThat(
        c.recipients?.length &&
          c.recipients.every((id) => id !== me.id && active.includes(id)),
        "Choose current family members to share with.",
      );
      s.locations = s.locations.filter((l) => l.member !== me.id);
      s.locations.push({
        id: uuid(),
        member: me.id,
        recipients: c.recipients,
        started: now,
        expires: now + c.duration! * 60000,
        captured: now,
        x: 48,
        y: 45,
        accuracy: 25,
        status: "active",
      });
    }
  }
  if (c.type === "report") {
    requireThat(c.confirmed, "Confirm the exact excerpt you want to disclose.");
    let author = "";
    if (c.kind === "post") {
      const p = s.posts.find((p) => p.id === c.target);
      requireThat(p && canReadPost(s, p), "Post unavailable.");
      author = p.author;
      requireThat(
        (p.title + " " + p.body).includes(c.excerpt),
        "The excerpt must come from this post.",
      );
    } else {
      const m = s.messages.find((m) => m.id === c.target && !m.deleted);
      requireThat(
        m && s.conversations.some((t) => t.id === m.conversation && canReadThread(s, t)),
        "Message unavailable.",
      );
      author = m.sender;
      requireThat(m.body.includes(c.excerpt), "The excerpt must come from this message.");
    }
    const reviewer = s.members.find(
      (m) => m.active && m.role === "parent" && m.id !== author,
    );
    s.reports.push({
      id: uuid(),
      reporter: me.id,
      target: c.target,
      kind: c.kind,
      excerpt: c.excerpt.slice(0, 500),
      reason: c.reason,
      note: c.note.slice(0, 1000),
      reviewer: reviewer?.id,
      state: "Open",
      created: now,
    });
  }
  if (c.type === "review") {
    parent();
    const r = s.reports.find((r) => r.id === c.id && r.reviewer === me.id);
    requireThat(r, "This report is assigned to another reviewer.");
    r.state = c.state;
  }
  if (c.type === "invite") {
    parent();
    requireThat(
      c.name.trim() && active.length < 12,
      "Add a display name. Families support up to 12 members.",
    );
    s.invites.push({
      id: uuid(),
      name: c.name.trim(),
      role: c.role,
      state: "Pending",
      expires: now + 7 * 86400000,
      token: uuid(),
      inviter: me.id,
    });
  }
  if (c.type === "inviteAction") {
    parent();
    const i = s.invites.find((i) => i.id === c.id);
    requireThat(i, "Invite unavailable.");
    if (c.action === "revoke") i.state = "Revoked";
    else {
      requireThat(
        i.state === "Pending" && i.expires > now && active.length < 12,
        "This invite is expired, used, revoked or the family is full.",
      );
      s.members.push({
        ...me,
        id: uuid(),
        name: i.name,
        initials: i.name.slice(0, 2).toUpperCase(),
        label: i.role === "parent" ? "Parent" : "Adult",
        role: i.role,
        color: "sage",
        joined: now,
        preferences: { ...me.preferences },
        permissions: { ...me.permissions, contacts: [] },
      });
      i.state = "Used";
    }
  }
  if (c.type === "child") {
    parent();
    requireThat(
      c.name.trim() && c.name.length <= 60 && active.length < 12,
      "Enter a name (up to 60 characters). Maximum 12 family members.",
    );
    s.members.push({
      ...me,
      id: uuid(),
      name: c.name.trim(),
      initials: c.name.slice(0, 2).toUpperCase(),
      label: "Child",
      role: "child",
      color: "blue",
      joined: now,
      permissions: {
        posting: true,
        alerts: false,
        familyChat: true,
        privateChat: false,
        location: false,
        contacts: s.members
          .filter((m) => m.active && m.role === "parent")
          .map((m) => m.id),
      },
      preferences: { ...me.preferences },
    });
  }
  if (c.type === "device") {
    parent();
    const d = s.devices.find((d) => d.id === c.id);
    requireThat(d, "Device unavailable.");
    if (c.action === "Approved")
      requireThat(
        d.state === "Pending",
        "This pairing request has already been handled. Start a new request.",
      );
    requireThat(
      c.action === "Revoked" || d.expires > now,
      "Pairing request expired. Start again.",
    );
    d.state = c.action;
    if (c.action === "Approved") d.expires = now + 30 * 86400000;
    if (c.action === "Revoked")
      s.locations = s.locations.filter((l) => l.member !== d.member);
  }
  if (c.type === "pair") {
    requireThat(
      member(s, c.child)?.role === "child" && c.label.trim(),
      "Choose a fictional child and a device label.",
    );
    s.devices.push({
      id: uuid(),
      member: c.child,
      label: c.label.trim() + " · simulated",
      state: "Pending",
      expires: now + 600000,
    });
  }
  if (c.type === "member") {
    const m = member(s, c.id);
    requireThat(m, "Member unavailable.");
    if (!(c.action === "remove" && m.id === me.id && m.role !== "child")) parent();
    if (c.action === "transfer") {
      requireThat(
        s.owner === me.id && m.role === "parent" && m.id !== me.id,
        "Only the owner can transfer to another parent.",
      );
      s.owner = m.id;
    } else {
      requireThat(
        s.owner !== m.id,
        "Transfer ownership before removing or changing the owner.",
      );
      if (c.action === "remove") {
        m.active = false;
        s.locations = s.locations
          .filter((l) => l.member !== m.id)
          .map((l) => ({
            ...l,
            recipients: l.recipients.filter((id) => id !== m.id),
          }));
      } else m.role = c.action;
    }
  }
  if (c.type === "family") {
    parent();
    requireThat(
      c.name.trim() && c.name.length <= 60,
      "Use a family name of up to 60 characters.",
    );
    s.familyName = c.name.trim();
  }
  if (c.type === "close") {
    requireThat(s.owner === me.id, "Only the family owner can close the space.");
    s.closed = true;
    s.posts = [];
    s.messages = [];
    s.reminders = [];
    s.locations = [];
    s.notifications = [];
    s.drafts = {};
  }
  syncSources(s);
  return s;
}
