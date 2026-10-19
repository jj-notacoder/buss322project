"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  ChevronRight,
  Crown,
  Flag,
  Laptop,
  MailPlus,
  Plus,
  Settings,
  Shield,
  ShieldCheck,
  Sprout,
  UserPlus,
} from "lucide-react";
import { isParent, member } from "@/domain/permissions";
import type { Member } from "@/domain/model";
import { relative } from "@/domain/dates";
import { useStore } from "./provider";
import {
  Avatar,
  Back,
  Button,
  Confirm,
  Empty,
  Modal,
  PageHeading,
  PersonPicker,
  Pill,
  RowLink,
  Toggle,
} from "./ui";
import { scheduleLabel } from "@/domain/dates";

export function Family() {
  const { state, run, toast } = useStore();
  const [child, setChild] = useState(false),
    [name, setName] = useState(""),
    [saving, setSaving] = useState(false);
  if (!state) return null;
  const me = member(state)!,
    parent = isParent(state),
    people = state.members.filter((m) => m.active);
  return (
    <div className="standard-page">
      <PageHeading
        eyebrow="YOUR PEOPLE. YOUR LITTLE CORNER."
        title="Better, together."
        description="Different days. Shared plans. One family space."
        action={
          parent && (
            <Button icon={UserPlus} onClick={() => setChild(true)}>
              Add a child
            </Button>
          )
        }
      />
      <section className="family-banner">
        <div className="family-banner-avatars">
          {people.map((m) => (
            <Avatar key={m.id} person={m} size="large" />
          ))}
        </div>
        <div>
          <span className="section-label">
            <ShieldCheck size={13} />
            Our private space
          </span>
          <h2>{state.familyName}</h2>
          <p>A place for every one of us.</p>
        </div>
        <Sprout size={45} strokeWidth={1} />
      </section>
      <div className="section-heading family-section-heading">
        <h2>The whole family</h2>
        <Pill>{people.length} people</Pill>
      </div>
      <div className="member-grid">
        {people.map((m) => (
          <Link href={`/app/family/members/${m.id}`} className="member-card" key={m.id}>
            <Avatar person={m} size="large" />
            <div>
              <h3>
                {m.name}
                {m.id === me.id && <span> (you)</span>}
              </h3>
              <p>
                {m.label}
                {m.role === "parent" ? " · Parent" : m.role === "adult" ? " · Adult" : ""}
              </p>
              <Pill tone={m.role === "child" ? "neutral" : "teal"}>
                {state.owner === m.id ? (
                  <>
                    <Crown size={12} />
                    Family owner
                  </>
                ) : m.role === "child" ? (
                  "Parent-managed"
                ) : m.role === "parent" ? (
                  "Parent"
                ) : (
                  "Adult"
                )}
              </Pill>
            </div>
            <ChevronRight size={18} />
          </Link>
        ))}
      </div>
      {parent ? (
        <section className="panel family-management">
          <div className="section-heading">
            <h2>A little care, behind the scenes.</h2>
            <Shield size={20} />
          </div>
          <p className="muted">Keep this space comfortable for everyone.</p>
          <RowLink
            href="/app/family/invites"
            icon={MailPlus}
            title="Invite someone in"
            description="Manage simulated parent and adult invitations"
          />
          <RowLink
            href="/app/family/devices"
            icon={Laptop}
            title="Children’s devices"
            description="Review, approve, or revoke a demo browser"
          />
          <RowLink
            href="/app/family/reports"
            icon={Flag}
            title="Shared concerns"
            description="Review only the excerpts shared with you"
          />
          <RowLink
            href="/app/family/admin"
            icon={Settings}
            title="Family settings"
            description="Name, membership, and owner administration"
          />
        </section>
      ) : me.role === "child" ? (
        <section className="panel">
          <h2>A space that grows with you.</h2>
          <p>
            Your parents help choose what you can do here. You can always see your access.
          </p>
          <Link href={`/app/family/members/${me.id}`} className="button button-secondary">
            <ShieldCheck size={17} />
            See my access
          </Link>
        </section>
      ) : null}
      <Modal
        open={child}
        onClose={() => setChild(false)}
        title="A little room for someone new"
        description="Create a fictional child profile. No email address or phone number is needed. Pairing a real device is not available in this demo."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            try {
              await run({ type: "child", name });
              toast("Fictional child profile created.");
              setChild(false);
              setName("");
            } catch {
            } finally {
              setSaving(false);
            }
          }}
        >
          <label>
            Fictional display name
            <input
              required
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <div className="dialog-actions">
            <Button variant="secondary" type="button" onClick={() => setChild(false)}>
              Cancel
            </Button>
            <Button disabled={saving}>
              {saving ? "Creating…" : "Create demo profile"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
export function MemberDetail({ id }: { id: string }) {
  const { state } = useStore();
  const person = state && member(state, id);
  if (!person || !state)
    return (
      <Empty title="Member unavailable">This profile is no longer in the family.</Empty>
    );
  return <MemberPanel key={id + JSON.stringify(person.permissions)} person={person} />;
}
function MemberPanel({ person: m }: { person: Member }) {
  const { state, run, toast } = useStore();
  const me = member(state!)!,
    parent = isParent(state!),
    own = m.id === me.id;
  const [permissions, setPermissions] = useState({ ...m.permissions }),
    [confirm, setConfirm] = useState(false),
    [saving, setSaving] = useState(false),
    [remove, setRemove] = useState(false);
  const router = useRouter();
  const changes = JSON.stringify(permissions) !== JSON.stringify(m.permissions);
  const labels: {
    key: keyof Omit<Member["permissions"], "contacts">;
    label: string;
    description: string;
  }[] = [
    {
      key: "posting",
      label: "Share updates & reminder posts",
      description: "A little room to share their day and family plans.",
    },
    {
      key: "alerts",
      label: "Publish alerts",
      description: "Share important updates that can be privately acknowledged.",
    },
    {
      key: "familyChat",
      label: "Join the family conversation",
      description: "Read and send messages in the shared family room.",
    },
    {
      key: "privateChat",
      label: "Private conversations",
      description: "Only with the approved contacts you choose below.",
    },
    {
      key: "location",
      label: "Allow sample location sharing",
      description:
        "Makes the feature available. They must choose to start it themselves.",
    },
  ];
  async function save() {
    setSaving(true);
    try {
      await run({ type: "permissions", id: m.id, permissions });
      toast("Access updated across this demo.");
      setConfirm(false);
    } catch {
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="detail-page">
      <Back href="/app/family" label="Our family" />
      <div className="member-profile-heading">
        <Avatar person={m} size="large" />
        <div>
          <div className="eyebrow">
            {own ? "YOUR LITTLE CORNER" : "PART OF YOUR EVERYDAY"}
          </div>
          <h1>
            {m.name}
            {own ? " (you)" : ""}
          </h1>
          <p>
            {m.label} · {m.zone}
          </p>
        </div>
        <Pill tone="teal">{state!.owner === m.id ? "Owner" : m.role}</Pill>
      </div>
      {m.role === "child" && (parent || own) ? (
        <section className="panel permissions-panel">
          <div className="section-heading">
            <h2>{parent && !own ? `${m.name}’s access` : "My access"}</h2>
            <ShieldCheck size={22} />
          </div>
          <p className="muted">
            {parent
              ? "Clear boundaries, a comfortable space. Changes apply immediately to all demo profiles."
              : "Your parents help manage these settings. Here’s what you can do."}
          </p>
          {labels.map(({ key, label, description }) =>
            parent ? (
              <Toggle
                key={key}
                label={label}
                description={description}
                checked={permissions[key]}
                onChange={(v) => setPermissions({ ...permissions, [key]: v })}
              />
            ) : (
              <div key={key} className="access-summary-row">
                <span>
                  <strong>{label}</strong>
                  <small>{description}</small>
                </span>
                <Pill tone={m.permissions[key] ? "teal" : "neutral"}>
                  {m.permissions[key] ? "Allowed" : "Not enabled"}
                </Pill>
              </div>
            ),
          )}
          <div className={!permissions.privateChat ? "contacts-disabled" : ""}>
            <h3>Approved private contacts</h3>
            {!permissions.privateChat && (
              <p className="field-help">
                Private messaging is off. These contacts are saved for when it is enabled;
                no private messages can be sent in either direction now.
              </p>
            )}
            {parent ? (
              <fieldset disabled={!permissions.privateChat}>
                <PersonPicker
                  selected={permissions.contacts}
                  onChange={(contacts) => setPermissions({ ...permissions, contacts })}
                  exclude={[m.id]}
                  legend="Family contacts"
                />
              </fieldset>
            ) : (
              <p>
                {m.permissions.contacts
                  .map((id) => member(state!, id)?.name)
                  .filter(Boolean)
                  .join(", ") || "No contacts selected"}
              </p>
            )}
          </div>
          <div className="info-box">
            <Shield size={19} />
            <p>
              {m.permissions.privateChat
                ? "Both people must be eligible to message. Existing history is only visible to currently approved contacts."
                : "Private messages are blocked both ways, including existing conversations."}{" "}
              Parents do not gain access to private conversations by managing this
              setting.
            </p>
          </div>
          {parent && (
            <div className="dialog-actions">
              <Button
                disabled={!changes || saving}
                onClick={() =>
                  m.permissions.privateChat && !permissions.privateChat
                    ? setConfirm(true)
                    : void save()
                }
              >
                {saving ? "Saving…" : "Save access settings"}
              </Button>
            </div>
          )}
          <h3>Managing parents</h3>
          <div className="managing-parents">
            {state!.members
              .filter((p) => p.active && p.role === "parent")
              .map((p) => (
                <span key={p.id}>
                  <Avatar person={p} size="small" />
                  {p.name}
                </span>
              ))}
          </div>
        </section>
      ) : (
        <section className="panel">
          <h2>A little about {own ? "your access" : m.name}</h2>
          <p>
            {m.role === "parent"
              ? "Parents can manage family membership, children’s access, device approvals, and shared concerns."
              : "Adults manage their own preferences, reminders, and sharing."}
          </p>
          <p className="muted">
            Private conversations remain private to their participants.
          </p>
          {own && (
            <Link href="/app/settings" className="text-link">
              My preferences <ArrowRight size={15} />
            </Link>
          )}
        </section>
      )}
      {parent && m.role === "child" && <ChildQuiet person={m} />}
      {parent && (
        <section className="panel">
          <h2>Reminders you assigned</h2>
          <p className="muted">Visible only to you as the assigner, and to {m.name}.</p>
          {state!.reminders
            .filter((r) => r.owner === m.id && r.assigner === me.id)
            .map((r) => (
              <div key={r.id} className="assigned-row">
                <span>
                  <strong>{r.title}</strong>
                  <small>{scheduleLabel(r.schedule)}</small>
                </span>
                <Pill>
                  {r.response === "pending"
                    ? "Awaiting acceptance"
                    : r.state === "completed"
                      ? "Completed"
                      : "Upcoming"}
                </Pill>
              </div>
            ))}
          {!state!.reminders.some((r) => r.owner === m.id && r.assigner === me.id) && (
            <p className="field-help">No reminders assigned by you.</p>
          )}
        </section>
      )}
      {parent && m.id !== state!.owner && m.id !== me.id && (
        <section className="panel">
          <h2>Membership</h2>
          {m.role !== "child" && (
            <Button
              variant="secondary"
              onClick={() =>
                void run({
                  type: "member",
                  id: m.id,
                  action: m.role === "parent" ? "adult" : "parent",
                })
                  .then(() => toast("Family role updated."))
                  .catch(() => {})
              }
            >
              {m.role === "parent" ? "Change to adult" : "Make a parent"}
            </Button>
          )}
          <Button variant="danger" onClick={() => setRemove(true)}>
            Remove from family
          </Button>
        </section>
      )}
      <Confirm
        open={confirm}
        onClose={() => setConfirm(false)}
        title={`Turn off ${m.name}’s private messages?`}
        label="Update access"
        onConfirm={save}
      >
        This blocks sending and reading in both directions, including existing private
        threads. The family conversation stays available if enabled. Approved history
        returns only when eligible contacts are re-enabled.
      </Confirm>
      <Confirm
        open={remove}
        onClose={() => setRemove(false)}
        title={`Remove ${m.name} from the family?`}
        label="Remove member"
        danger
        onConfirm={async () => {
          await run({ type: "member", id: m.id, action: "remove" });
          router.push("/app/family");
        }}
      >
        They will lose family access. Their active sample sharing will end, and their
        access to others’ locations will be removed.
      </Confirm>
    </div>
  );
}
export function ParentGate({ children }: { children: React.ReactNode }) {
  const { state } = useStore();
  return state && isParent(state) ? (
    children
  ) : (
    <>
      <Back href="/app/family" label="Our family" />
      <Empty icon={Shield} title="A little behind-the-scenes space">
        Only parents can open these family management tools.
      </Empty>
    </>
  );
}
function ChildQuiet({ person: m }: { person: Member }) {
  const { run, toast } = useStore();
  const [quiet, setQuiet] = useState(m.preferences.quiet),
    [start, setStart] = useState(m.preferences.quietStart),
    [end, setEnd] = useState(m.preferences.quietEnd);
  return (
    <form
      className="panel"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await run({ type: "childQuiet", id: m.id, quiet, start, end });
          toast(`${m.name}’s quiet hours are saved.`);
        } catch {}
      }}
    >
      <h2>A little time to switch off.</h2>
      <p className="muted">
        Manage {m.name}’s notification quiet hours in {m.zone}. Reading is always
        available.
      </p>
      <Toggle
        label="Quiet hours"
        description="Important updates also wait. Nothing bypasses quiet time."
        checked={quiet}
        onChange={setQuiet}
      />
      {quiet && (
        <div className="form-grid">
          <label>
            Start
            <input
              type="time"
              value={start}
              required
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            End
            <input
              type="time"
              value={end}
              required
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
        </div>
      )}
      <div className="dialog-actions">
        <Button>Save quiet hours</Button>
      </div>
    </form>
  );
}
export function Invites() {
  const { state, run, toast, now } = useStore();
  const [name, setName] = useState(""),
    [role, setRole] = useState<"adult" | "parent">("adult");
  return (
    <ParentGate>
      <div className="standard-page">
        <Back href="/app/family" label="Our family" />
        <PageHeading
          title="Invite someone in."
          description="Simulated invitations, kept in this browser. No email is sent."
        />
        <form
          className="panel"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await run({ type: "invite", name, role });
              setName("");
              toast("Demo invitation created.");
            } catch {}
          }}
        >
          <h2>A familiar face, a new invitation.</h2>
          <div className="form-grid">
            <label>
              Fictional name
              <input
                required
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              Family role
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "adult" | "parent")}
              >
                <option value="adult">Adult</option>
                <option value="parent">Parent</option>
              </select>
            </label>
          </div>
          <Button icon={MailPlus}>Create demo invitation</Button>
        </form>
        <section className="panel">
          <h2>Invitations</h2>
          {state?.invites.length === 0 && (
            <Empty icon={MailPlus} title="An open door, when you’re ready.">
              Your simulated invitations will appear here.
            </Empty>
          )}
          {state?.invites.map((i) => (
            <div className="invite-row" key={i.id}>
              <div>
                <strong>{i.name}</strong>
                <small>
                  {i.role} · {i.expires < now ? "Expired" : i.state} · Expires{" "}
                  {new Date(i.expires).toLocaleDateString()}
                </small>
                <Link href={`/join/${i.token}`} className="text-link">
                  Review demo invitation <ArrowRight size={14} />
                </Link>
              </div>
              {i.state === "Pending" && (
                <Button
                  variant="secondary"
                  onClick={() =>
                    void run({
                      type: "inviteAction",
                      id: i.id,
                      action: "revoke",
                    }).catch(() => {})
                  }
                >
                  Revoke
                </Button>
              )}
            </div>
          ))}
        </section>
      </div>
    </ParentGate>
  );
}
export function Devices() {
  const { state, run, now } = useStore();
  const [revoke, setRevoke] = useState("");
  return (
    <ParentGate>
      <div className="standard-page">
        <Back href="/app/family" label="Our family" />
        <PageHeading
          title="Their own little doorway."
          description="Simulated child browsers. Approval here does not pair a real device."
          action={
            <Link href="/pair" className="button button-secondary">
              <Plus size={17} />
              Simulate pairing
            </Link>
          }
        />
        <section className="panel">
          <h2>Device approvals</h2>
          {state?.devices.map((d) => (
            <div key={d.id} className="device-row">
              <span className="row-icon">
                <Laptop size={23} />
              </span>
              <div>
                <strong>{d.label}</strong>
                <small>
                  {member(state, d.member)?.name} ·{" "}
                  {d.expires < now ? "Expired" : d.state}
                </small>
                <small>
                  {d.state === "Pending"
                    ? "Request valid for 10 minutes"
                    : "Session valid for up to 30 days"}
                </small>
              </div>
              {d.state === "Pending" && (
                <Button
                  variant="secondary"
                  disabled={d.expires < now}
                  onClick={() =>
                    void run({
                      type: "device",
                      id: d.id,
                      action: "Approved",
                    }).catch(() => {})
                  }
                >
                  Approve
                </Button>
              )}
              {d.state === "Approved" && (
                <Button variant="secondary" onClick={() => setRevoke(d.id)}>
                  Revoke
                </Button>
              )}
            </div>
          ))}
        </section>
        <div className="info-box">
          <ShieldCheck size={20} />
          <p>
            These are local lifecycle simulations. Connected children require independent,
            restricted authentication; this demo does not create real sessions.
          </p>
        </div>
        <Confirm
          open={!!revoke}
          onClose={() => setRevoke("")}
          title="Revoke this demo device?"
          label="Revoke device"
          danger
          onConfirm={() => run({ type: "device", id: revoke, action: "Revoked" })}
        >
          Its simulated access is revoked and the child’s active sample location sharing
          ends.
        </Confirm>
      </div>
    </ParentGate>
  );
}
export function Reports() {
  const { state, run } = useStore();
  const [tab, setTab] = useState("Open");
  return (
    <ParentGate>
      <div className="standard-page">
        <Back href="/app/family" label="Our family" />
        <PageHeading
          title="A little care goes a long way."
          description="Only the exact excerpts shared with you are shown here."
        />
        <div className="segmented reports-tabs">
          {["Open", "Reviewed", "Resolved"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={tab === t ? "active" : ""}
            >
              {t}
            </button>
          ))}
        </div>
        {state?.reports
          .filter((r) => r.reviewer === state.current && r.state === tab)
          .map((r) => (
            <section className="panel report-card" key={r.id}>
              <div className="section-heading">
                <h2>{r.reason}</h2>
                <Pill>{r.state}</Pill>
              </div>
              <p className="muted">
                Shared by {member(state, r.reporter)?.name} · {relative(r.created)}
              </p>
              <blockquote>{r.excerpt}</blockquote>
              <p>{r.note}</p>
              <p className="field-help">
                This excerpt does not grant access to the rest of a private conversation.
              </p>
              <div className="button-row">
                {r.state === "Open" && (
                  <Button
                    onClick={() =>
                      void run({
                        type: "review",
                        id: r.id,
                        state: "Reviewed",
                      }).catch(() => {})
                    }
                  >
                    Mark reviewed
                  </Button>
                )}
                {r.state !== "Resolved" && (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      void run({
                        type: "review",
                        id: r.id,
                        state: "Resolved",
                      }).catch(() => {})
                    }
                  >
                    Resolve concern
                  </Button>
                )}
                {r.kind === "post" &&
                  state.posts.some((p) => p.id === r.target && !p.removed) && (
                    <Link className="text-link" href={`/app/posts/${r.target}`}>
                      Review post
                    </Link>
                  )}
                <Link href="/app/family" className="text-link">
                  Manage family access
                </Link>
              </div>
            </section>
          ))}
        {!state?.reports.some((r) => r.reviewer === state.current && r.state === tab) && (
          <div className="panel">
            <Empty icon={ShieldCheck} title="All quiet here.">
              No {tab.toLowerCase()} concerns are assigned to you.
            </Empty>
          </div>
        )}
      </div>
    </ParentGate>
  );
}
export function FamilyAdmin() {
  const { state, run, toast } = useStore();
  const [name, setName] = useState(state?.familyName ?? ""),
    [transfer, setTransfer] = useState(""),
    [close, setClose] = useState(false);
  if (!state) return null;
  const owner = state.owner === state.current;
  return (
    <ParentGate>
      <div className="standard-page">
        <Back href="/app/family" label="Our family" />
        <PageHeading
          title="Make this space your own."
          description="A little administration for your family’s shared space."
        />
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault();
            void run({ type: "family", name })
              .then(() => toast("Family name updated."))
              .catch(() => {});
          }}
        >
          <h2>Family details</h2>
          <label>
            Family name
            <input
              value={name}
              required
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <Button>Save family name</Button>
        </form>
        {owner && (
          <section className="panel owner-admin">
            <h2>
              <Crown size={20} />
              Owner administration
            </h2>
            <p>One parent owns the family space. Transfer ownership before leaving.</p>
            <label>
              Transfer ownership to
              <select value={transfer} onChange={(e) => setTransfer(e.target.value)}>
                <option value="">Choose another parent</option>
                {state.members
                  .filter(
                    (m) => m.active && m.role === "parent" && m.id !== state.current,
                  )
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </label>
            <Button
              variant="secondary"
              disabled={!transfer}
              onClick={() =>
                void run({ type: "member", id: transfer, action: "transfer" })
                  .then(() => toast("Ownership transferred."))
                  .catch(() => {})
              }
            >
              Transfer ownership
            </Button>
            <hr />
            <h3>Close this demo family</h3>
            <p className="muted">
              Removes this family’s local content. You can restore the original fixtures
              using demo reset.
            </p>
            <Button variant="danger" onClick={() => setClose(true)}>
              Close family space
            </Button>
          </section>
        )}
        <Confirm
          open={close}
          onClose={() => setClose(false)}
          title="Close this local family space?"
          label="Close family"
          danger
          onConfirm={() => run({ type: "close" })}
        >
          All local family posts, reminders, messages, and sharing will be removed from
          this demo. This does not contact a server.
        </Confirm>
      </div>
    </ParentGate>
  );
}
