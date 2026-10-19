export type Role = "parent" | "adult" | "child";
export type PostType = "update" | "reminder" | "alert";
export type Recurrence = "none" | "daily" | "weekly" | "yearly";
export interface Permissions {
  posting: boolean;
  alerts: boolean;
  familyChat: boolean;
  privateChat: boolean;
  location: boolean;
  contacts: string[];
}
export interface Preferences {
  reminders: boolean;
  updates: boolean;
  messages: boolean;
  family: boolean;
  previews: boolean;
  quiet: boolean;
  quietStart: string;
  quietEnd: string;
}
export interface Member {
  id: string;
  name: string;
  label: string;
  role: Role;
  color: string;
  initials: string;
  avatar?: string;
  zone: string;
  joined: number;
  active: boolean;
  permissions: Permissions;
  preferences: Preferences;
}
export interface Schedule {
  date: string;
  time: string;
  allDay: boolean;
  zone: string;
  recurrence: Recurrence;
  originDate?: string;
}
export interface Photo {
  url: string;
  alt: string;
  blobId?: string;
}
export interface Post {
  id: string;
  author: string;
  type: PostType;
  title: string;
  body: string;
  place: string;
  recipients: string[];
  photos: Photo[];
  created: number;
  edited?: number;
  version: number;
  ackVersion: number;
  acknowledgements: Record<string, number>;
  pinned: boolean;
  removed: boolean;
  cancelled: boolean;
  schedule?: Schedule;
}
export interface Reminder {
  id: string;
  owner: string;
  title: string;
  details: string;
  schedule: Schedule;
  lead: number;
  scheduledAt?: number;
  source?: string;
  messageSource?: string;
  sourceVersion?: number;
  sourceSchedule?: Schedule;
  sourcePlace?: string;
  state: "upcoming" | "completed";
  change: "none" | "changed" | "unavailable" | "cancelled";
  override: boolean;
  assigner?: string;
  response?: "pending" | "accepted" | "declined";
  history: string[];
}
export interface Conversation {
  id: string;
  kind: "family" | "private" | "context";
  title: string;
  participants: string[];
  source?: string;
  created: number;
}
export interface Message {
  id: string;
  conversation: string;
  sender: string;
  body: string;
  created: number;
  deleted: boolean;
  mutationKey: string;
}
export interface Notification {
  id: string;
  owner: string;
  category: "reminders" | "updates" | "messages" | "family";
  title: string;
  body: string;
  href: string;
  created: number;
  event: number;
  read: boolean;
  key: string;
  deliverAfter?: number;
}
export interface LocationSession {
  id: string;
  member: string;
  recipients: string[];
  started: number;
  expires: number;
  captured: number;
  x: number;
  y: number;
  accuracy: number;
  status: "active" | "paused" | "stopping";
}
export interface Report {
  id: string;
  reporter: string;
  target: string;
  kind: "post" | "message";
  excerpt: string;
  reason: string;
  note: string;
  reviewer?: string;
  state: "Open" | "Reviewed" | "Resolved";
  created: number;
}
export interface Device {
  id: string;
  member: string;
  label: string;
  state: "Pending" | "Approved" | "Revoked";
  expires: number;
}
export interface Invite {
  id: string;
  name: string;
  role: "parent" | "adult";
  state: "Pending" | "Used" | "Revoked";
  expires: number;
  token: string;
  inviter: string;
}
export interface State {
  schema: 1;
  anchor: number;
  current: string;
  familyName: string;
  owner: string;
  closed: boolean;
  members: Member[];
  posts: Post[];
  reminders: Reminder[];
  conversations: Conversation[];
  messages: Message[];
  notifications: Notification[];
  locations: LocationSession[];
  reports: Report[];
  devices: Device[];
  invites: Invite[];
  read: Record<string, number>;
  drafts: Record<string, string>;
}
export const IDS = {
  maya: "a0000000-0000-4000-8000-000000000001",
  daniel: "a0000000-0000-4000-8000-000000000002",
  sam: "a0000000-0000-4000-8000-000000000003",
  ella: "a0000000-0000-4000-8000-000000000004",
  nora: "a0000000-0000-4000-8000-000000000005",
  lego: "b0000000-0000-4000-8000-000000000001",
  lunch: "b0000000-0000-4000-8000-000000000002",
  pickup: "b0000000-0000-4000-8000-000000000003",
  garden: "b0000000-0000-4000-8000-000000000004",
  dentist: "b0000000-0000-4000-8000-000000000005",
  family: "c0000000-0000-4000-8000-000000000001",
  parents: "c0000000-0000-4000-8000-000000000002",
  restricted: "c0000000-0000-4000-8000-000000000003",
};
