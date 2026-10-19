"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, Home, MessageCircle, ShieldCheck } from "lucide-react";
import { useStore } from "./provider";
import { member } from "@/domain/permissions";
import { Brand, Button, Empty, Pill } from "./ui";
export function Welcome() {
  return (
    <main className="welcome-page">
      <div className="welcome-nav">
        <Brand />
        <Pill>Local demo</Pill>
      </div>
      <div className="welcome-content">
        <span className="section-label">
          <Home size={14} />A place for your people
        </span>
        <h1>
          A little closer.
          <br />
          Every day.
        </h1>
        <p>
          Make room for the plans, the little reminders, and the moments that make a
          family.
        </p>
        <div className="welcome-benefits">
          <span>
            <Home size={20} />A quieter family feed
          </span>
          <span>
            <CalendarDays size={20} />
            One less thing to remember
          </span>
          <span>
            <MessageCircle size={20} />
            Conversations, just for your people
          </span>
        </div>
        <Link className="button button-primary" href="/app/feed">
          Make yourself at home <ArrowRight size={18} />
        </Link>
        <div className="welcome-links">
          <Link href="/onboarding/create">Create a demo family</Link>
          <Link href="/join/demo">Review an invitation</Link>
        </div>
        <small>
          <ShieldCheck size={14} />
          Fictional profiles. Local data. No account needed.
        </small>
      </div>
      <div className="welcome-photo">
        <img
          src="/images/baking.jpg"
          width={900}
          height={1200}
          alt="Freshly baked pastries, a little everyday moment to share"
        />
        <div>
          <Brand />
          <p>
            Less noise.
            <br />
            More family.
          </p>
        </div>
      </div>
    </main>
  );
}
export function CreateFamily() {
  const { state, run, toast } = useStore();
  const router = useRouter();
  const [name, setName] = useState("The Parker family"),
    [parent, setParent] = useState("Maya"),
    [zone, setZone] = useState("Asia/Dubai"),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  return (
    <main className="onboarding-page">
      <Brand />
      <div className="panel">
        <Pill>SIMULATED SETUP</Pill>
        <h1>A little space of your own.</h1>
        <p>
          This customizes the fictional demo family in this browser. Use invented names
          only.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            try {
              if (state?.current !== state?.owner)
                await run({ type: "switch", id: state!.owner });
              await run({ type: "family", name });
              const me = member(state!, state!.owner)!;
              await run({
                type: "profile",
                name: parent,
                zone,
                preferences: me.preferences,
              });
              toast("Your demo family is ready.");
              router.push("/app/family");
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not create the demo.");
            } finally {
              setSaving(false);
            }
          }}
        >
          <label>
            Family name
            <input
              required
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Fictional parent name
            <input
              required
              maxLength={60}
              value={parent}
              onChange={(e) => setParent(e.target.value)}
            />
          </label>
          <label>
            Timezone
            <input required value={zone} onChange={(e) => setZone(e.target.value)} />
          </label>
          {error && <p className="inline-error">{error}</p>}
          <Button disabled={saving}>
            {saving ? "Making room…" : "Create demo family"}
          </Button>
          <Link href="/welcome" className="text-link">
            Back
          </Link>
        </form>
      </div>
    </main>
  );
}
export function Join({ token }: { token: string }) {
  const { state, run, toast, now } = useStore();
  const router = useRouter();
  const invite = state?.invites.find((i) => i.token === token);
  const valid = invite && invite.state === "Pending" && invite.expires > now;
  return (
    <main className="onboarding-page">
      <Brand />
      <div className="panel">
        <Pill>SIMULATED INVITATION</Pill>
        {valid ? (
          <>
            <h1>There’s a place for you.</h1>
            <p>
              {member(state!, invite.inviter)?.name} invited the fictional profile{" "}
              <strong>{invite.name}</strong> to {state!.familyName} as a {invite.role}.
            </p>
            <div className="info-box">
              Accepting simulates membership in this browser. Existing posts and private
              history won’t be automatically shared with a new member.
            </div>
            <Button
              onClick={async () => {
                try {
                  if (state!.current !== state!.owner)
                    await run({ type: "switch", id: state!.owner });
                  await run({
                    type: "inviteAction",
                    id: invite.id,
                    action: "accept",
                  });
                  toast("Simulated invitation accepted.");
                  router.push("/app/family");
                } catch {}
              }}
            >
              Simulate acceptance
            </Button>
          </>
        ) : (
          <Empty
            icon={Home}
            title={
              invite
                ? "This invitation is no longer available."
                : "A little invitation is needed."
            }
          >
            {invite
              ? `This demo invitation is ${invite.expires < now ? "expired" : invite.state.toLowerCase()}. Ask the inviting parent to create another.`
              : "Create a simulated invitation from the family management page."}
            <Link className="button button-secondary" href="/app/family/invites">
              Manage demo invitations
            </Link>
          </Empty>
        )}
        <Link href="/app/feed" className="text-link">
          Back to your space <ArrowRight size={15} />
        </Link>
      </div>
    </main>
  );
}
export function Pair() {
  const { state, run } = useStore();
  const [child, setChild] = useState(
      state?.members.find((m) => m.role === "child" && m.active)?.id ?? "",
    ),
    [label, setLabel] = useState("Kitchen tablet"),
    [code, setCode] = useState(""),
    [error, setError] = useState("");
  return (
    <main className="onboarding-page">
      <Brand />
      <div className="panel">
        <Pill>SIMULATED PAIRING</Pill>
        <h1>A doorway of their own.</h1>
        <p>
          A child can join a browser without an email or phone number. This flow is a
          local simulation and creates no real login.
        </p>
        {code ? (
          <>
            <div className="pair-code">
              <small>DEMO APPROVAL CODE</small>
              <strong>{code}</strong>
              <span>Valid for 10 minutes · single request</span>
            </div>
            <p>A parent can now review this request in Children’s devices.</p>
            <Link href="/app/family/devices" className="button button-primary">
              Review as a parent <ArrowRight size={17} />
            </Link>
          </>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const next = await run({ type: "pair", child, label });
                setCode(next.devices.at(-1)!.id.slice(-6).toUpperCase());
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not request pairing.");
              }
            }}
          >
            <label>
              Fictional child
              <select value={child} onChange={(e) => setChild(e.target.value)}>
                {state?.members
                  .filter((m) => m.active && m.role === "child")
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Device label
              <input
                required
                value={label}
                maxLength={60}
                onChange={(e) => setLabel(e.target.value)}
              />
            </label>
            {error && <p className="inline-error">{error}</p>}
            <Button>Request demo pairing</Button>
          </form>
        )}
        <Link href="/app/family" className="text-link">
          Back to family
        </Link>
      </div>
    </main>
  );
}
