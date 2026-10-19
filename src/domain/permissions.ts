import type { Conversation, Member, Post, State } from "./model";
export const member = (s: State, id = s.current) =>
  s.members.find((m) => m.id === id && m.active);
export const isParent = (s: State) => member(s)?.role === "parent";
export const canReadPost = (s: State, p: Post, id = s.current) =>
  !s.closed && !!member(s, id) && !p.removed && p.recipients.includes(id);
export const canPublish = (m: Member, type: Post["type"]) =>
  m.active &&
  (m.role !== "child" ||
    (type === "alert" ? m.permissions.alerts : m.permissions.posting));
export function canDM(s: State, a: string, b: string): boolean {
  const x = member(s, a),
    y = member(s, b);
  return (
    !!x &&
    !!y &&
    a !== b &&
    [x, y].every(
      (m) =>
        m.role !== "child" ||
        (m.permissions.privateChat &&
          m.permissions.contacts.includes(m.id === a ? b : a)),
    )
  );
}
export function canReadThread(s: State, t: Conversation, id = s.current): boolean {
  const m = member(s, id);
  if (!m || s.closed) return false;
  if (t.kind === "family") return m.role !== "child" || m.permissions.familyChat;
  if (!t.participants.includes(id) || t.participants.some((p) => !member(s, p)))
    return false;
  if (
    t.kind === "context" &&
    (!t.source ||
      !s.posts.some(
        (p) =>
          p.id === t.source &&
          canReadPost(s, p, id) &&
          t.participants.every((v) => p.recipients.includes(v)),
      ))
  )
    return false;
  return t.participants.every((a) =>
    t.participants.every((b) => a === b || canDM(s, a, b)),
  );
}
export function visibleMessages(s: State, t: Conversation, id = s.current) {
  if (!canReadThread(s, t, id)) return [];
  const m = member(s, id)!;
  return s.messages
    .filter(
      (msg) =>
        msg.conversation === t.id &&
        !msg.deleted &&
        (t.kind !== "family" || msg.created >= m.joined),
    )
    .sort((a, b) => a.created - b.created);
}
export function visibleLocations(s: State, now = Date.now()) {
  return s.locations.filter(
    (l) =>
      l.expires > now &&
      member(s, l.member) &&
      (l.member === s.current || l.recipients.includes(s.current)),
  );
}
