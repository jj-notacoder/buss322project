"use client";
import { useState } from "react";
import { Clock3, MapPin, Navigation, ShieldCheck, Square, Users } from "lucide-react";
import { member, visibleLocations } from "@/domain/permissions";
import { relative } from "@/domain/dates";
import { useStore } from "./provider";
import { Avatar, Button, Modal, PageHeading, PersonPicker } from "./ui";
export default function FamilyMap() {
  const { state, run, toast, now } = useStore();
  const [sharing, setSharing] = useState(false),
    [recipients, setRecipients] = useState<string[]>([]),
    [duration, setDuration] = useState(60),
    [consent, setConsent] = useState(false),
    [selected, setSelected] = useState(""),
    [saving, setSaving] = useState(false);
  if (!state) return null;
  const me = member(state)!,
    locations = visibleLocations(state, now),
    own = locations.find((l) => l.member === me.id),
    allowed = me.role !== "child" || me.permissions.location;
  const people = state.members
    .filter((m) => m.active)
    .sort((a, b) => (a.id === me.id ? -1 : b.id === me.id ? 1 : 0));
  return (
    <div className="map-page">
      <PageHeading
        eyebrow="A LITTLE CLOSER, ON YOUR TERMS"
        title="Share a little of your day."
        description="Your location is always your choice."
      />
      <section className={`own-sharing-card ${own ? "sharing-active" : ""}`}>
        <span className="sharing-status-icon">
          <Navigation size={24} />
        </span>
        <div>
          <h2>
            {own
              ? "Your sample location is shared."
              : allowed
                ? "Your location is off."
                : "Location sharing isn’t enabled."}
          </h2>
          <p>
            {own
              ? `With ${own.recipients.map((id) => member(state, id)?.name).join(", ")} · ${Math.ceil((own.expires - now) / 60000)} minutes left`
              : allowed
                ? "Choose who, choose how long. Stop whenever you like."
                : "A parent needs to allow this feature first. Only you can start a session."}
          </p>
        </div>
        {own ? (
          <Button
            variant="secondary"
            icon={Square}
            onClick={() =>
              void run({ type: "location", action: "stop" })
                .then(() => toast("Sample sharing stopped. Recipient pins are removed."))
                .catch(() => {})
            }
          >
            Stop sharing
          </Button>
        ) : (
          <Button
            disabled={!allowed}
            icon={MapPin}
            onClick={() => {
              setRecipients(
                state.members
                  .filter((m) => m.active && m.role === "parent" && m.id !== me.id)
                  .map((m) => m.id),
              );
              setSharing(true);
            }}
          >
            Share sample location
          </Button>
        )}
      </section>
      <div className="map-layout">
        <div className="map-surface">
          <div className="map-label">
            <span />
            <strong>Sample locations</strong>
            <span>Fictional neighborhood</span>
          </div>
          <svg
            className="neighborhood-map"
            viewBox="0 0 800 640"
            role="img"
            aria-label="Fictional neighborhood map. The accessible family location list is beside or below the map."
          >
            <defs>
              <pattern id="houses" width="100" height="100" patternUnits="userSpaceOnUse">
                <rect x="18" y="15" width="26" height="32" rx="4" fill="#e4e5db" />
                <rect x="59" y="55" width="25" height="30" rx="4" fill="#e4e5db" />
                <rect x="17" y="55" width="25" height="25" rx="4" fill="#e9e7dd" />
              </pattern>
              <pattern
                id="small-grid"
                width="100"
                height="100"
                patternUnits="userSpaceOnUse"
              >
                <rect width="100" height="100" fill="url(#houses)" />
                <path d="M0 0H100M0 0V100" stroke="#fcfcf8" strokeWidth="15" />
              </pattern>
            </defs>
            <rect width="800" height="640" fill="#eeeee5" />
            <rect width="800" height="640" fill="url(#small-grid)" />
            <path
              d="M-50 120C160 10 200 300 430 255S700 120 860 260"
              stroke="#cadfdf"
              strokeWidth="62"
              fill="none"
            />
            <path
              d="M-50 120C160 10 200 300 430 255S700 120 860 260"
              stroke="#e0ece8"
              strokeWidth="35"
              fill="none"
            />
            <path
              d="M-20 490 800 380M250-20 470 660M-20 320 800 100"
              stroke="#d9dcd2"
              strokeWidth="30"
            />
            <path
              d="M-20 490 800 380M250-20 470 660M-20 320 800 100"
              stroke="#fffef8"
              strokeWidth="23"
            />
            <path d="m460 600 180-300" stroke="#fffef8" strokeWidth="17" />
            <path d="M500 0v135" stroke="#fffef8" strokeWidth="22" />
            <path d="M42 334q58-25 135-19l34 111-125 24Z" fill="#d1dfc3" />
            <path d="m495 450 165-20 47 142-151 51Z" fill="#d1dfc3" />
            <path
              d="m485 456 36 95 156-24"
              stroke="#e6eedc"
              strokeWidth="8"
              fill="none"
            />
            {[
              [95, 350],
              [145, 390],
              [120, 420],
              [175, 350],
              [575, 485],
              [615, 480],
              [660, 540],
              [555, 570],
              [704, 70],
              [735, 90],
              [84, 570],
              [110, 590],
            ].map(([x, y], i) => (
              <g key={i}>
                <circle cx={x} cy={y} r="13" fill="#b7cfaa" />
                <circle cx={x - 3} cy={y - 3} r="8" fill="#c3d8b5" />
              </g>
            ))}
            <g fill="#6b796a" fontFamily="Inter, sans-serif" fontSize="13">
              <text x="79" y="385" transform="rotate(-7 79 385)">
                Meadow Park
              </text>
              <text x="542" y="540" transform="rotate(-7 542 540)">
                Community garden
              </text>
              <text x="475" y="105">
                Willow café
              </text>
              <text
                x="95"
                y="210"
                fill="#82918a"
                fontSize="11"
                transform="rotate(13 95 210)"
              >
                WILLOW CREEK
              </text>
              <text
                x="200"
                y="470"
                fontSize="10"
                fill="#8d9287"
                transform="rotate(-8 200 470)"
              >
                MEADOW WALK
              </text>
              <text
                x="400"
                y="350"
                fontSize="10"
                fill="#8d9287"
                transform="rotate(71 400 350)"
              >
                GARDEN LANE
              </text>
            </g>
          </svg>
          {locations.map((l) => {
            const person = member(state, l.member)!,
              fresh = now - l.captured <= 120000;
            return (
              <button
                key={l.id}
                className={`map-pin ${fresh ? "" : "stale"} ${selected === l.member ? "selected" : ""}`}
                style={{ left: `${l.x}%`, top: `${l.y}%` }}
                onClick={() => setSelected(selected === l.member ? "" : l.member)}
                aria-label={`${person.name}, ${fresh ? "fresh sample" : "last known sample"}, accuracy ${l.accuracy} meters`}
              >
                <Avatar person={person} />
                <span>{person.name}</span>
              </button>
            );
          })}
          <div className="map-bottom-label">
            <ShieldCheck size={14} />
            Fictional map · No real coordinates collected
          </div>
        </div>
        <section className="panel location-list">
          <div className="section-heading">
            <h2>Your people</h2>
            <Users size={18} />
          </div>
          <p className="muted">Only locations shared with you appear.</p>
          {people.map((m) => {
            const l = locations.find((l) => l.member === m.id),
              fresh = !!l && now - l.captured <= 120000;
            return (
              <button
                className={`location-person ${selected === m.id ? "selected" : ""}`}
                key={m.id}
                disabled={!l}
                onClick={() => setSelected(selected === m.id ? "" : m.id)}
              >
                <Avatar person={m} />
                <span>
                  <strong>
                    {m.name}
                    {m.id === me.id ? " (you)" : ""}
                  </strong>
                  <small>
                    {l
                      ? fresh
                        ? "Fresh sample location"
                        : `Last known sample · ${relative(l.captured, now)}`
                      : "Not sharing with you"}
                  </small>
                  {l && (
                    <small>
                      ±{l.accuracy} m · Ends in {Math.ceil((l.expires - now) / 60000)} min
                    </small>
                  )}
                </span>
                {l && <span className={`location-dot ${fresh ? "fresh" : ""}`} />}
              </button>
            );
          })}
          <div className="location-note">
            <Clock3 size={17} />
            <p>
              Last-known samples are labelled after 2 minutes. Pins disappear when sharing
              ends or expires.
            </p>
          </div>
        </section>
      </div>
      <div className="info-box map-info">
        <ShieldCheck size={21} />
        <div>
          <strong>A little reassurance, with clear boundaries.</strong>
          <p>
            This map is fictional. Connected sharing would require an active page,
            explicit browser permission, and a working server. Closing the page would stop
            updates; the session’s original expiry would still apply.
          </p>
        </div>
      </div>
      <Modal
        open={sharing}
        onClose={() => setSharing(false)}
        title="A little here, for a little while"
        description="This starts a fictional sample session. Your browser’s real location will never be requested."
      >
        <PersonPicker
          selected={recipients}
          onChange={setRecipients}
          exclude={[me.id]}
          allowed={me.role === "child" ? me.permissions.contacts : undefined}
          legend="Who can see your sample location?"
        />
        <label>
          For how long?
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            <option value={15}>15 minutes</option>
            <option value={60}>1 hour</option>
            <option value={240}>4 hours</option>
          </select>
        </label>
        <div className="info-box">
          You choose when to start. You can always stop. After expiry, recipient profiles
          lose access to the sample pin.
        </div>
        <label className="check-label">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          I understand this is a sample location shared only in this browser.
        </label>
        <div className="dialog-actions">
          <Button variant="secondary" onClick={() => setSharing(false)}>
            Cancel
          </Button>
          <Button
            disabled={!consent || !recipients.length || saving}
            onClick={async () => {
              setSaving(true);
              try {
                await run({
                  type: "location",
                  action: "start",
                  recipients,
                  duration,
                });
                setSharing(false);
                toast("Sample sharing started in this browser only.");
              } catch {
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Starting…" : "Start sample sharing"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
