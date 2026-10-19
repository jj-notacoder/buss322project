import { describe, expect, it } from "vitest";
import { createSeed } from "../src/data/fixtures";
import { execute, processDue } from "../src/domain/actions";
import { IDS as I, type Schedule } from "../src/domain/model";
import {
  canDM,
  canReadPost,
  canReadThread,
  visibleLocations,
  visibleMessages,
} from "../src/domain/permissions";
import { inQuietHours, instant, nextSchedule } from "../src/domain/dates";
const now = Date.parse("2026-10-19T06:00:00Z");
const seed = () => createSeed(now);
const schedule: Schedule = {
  date: "2026-10-25",
  time: "12:30",
  allDay: false,
  zone: "Asia/Dubai",
  recurrence: "none",
};
describe("Permissions and personal state", () => {
  it("allows children to edit their own posts after new posting is disabled", () => {
    let s = seed();
    s.current = I.sam;
    s = execute(
      s,
      {
        type: "post",
        postType: "update",
        title: "",
        body: "My fictional project",
        place: "",
        photos: [],
        recipients: [I.maya],
      },
      now,
    );
    const post = s.posts.at(-1)!;
    s.members[2].permissions.posting = false;
    s = execute(
      s,
      {
        type: "post",
        id: post.id,
        postType: "update",
        title: "",
        body: "A corrected fictional project",
        place: "",
        photos: [],
        recipients: post.recipients,
      },
      now,
    );
    expect(s.posts.at(-1)?.body).toBe("A corrected fictional project");
  });
  it("isolates reminders after profile switching", () => {
    const s = execute(seed(), { type: "switch", id: I.ella }, now);
    expect(s.reminders.filter((r) => r.owner === s.current)).toHaveLength(0);
    expect(() =>
      execute(s, { type: "reminderAction", id: "r-maya-slip", action: "complete" }, now),
    ).toThrow();
  });
  it("denies adult family administration", () => {
    const s = execute(seed(), { type: "switch", id: I.nora }, now);
    expect(() =>
      execute(
        s,
        {
          type: "permissions",
          id: I.sam,
          permissions: s.members[2].permissions,
        },
        now,
      ),
    ).toThrow();
    expect(() =>
      execute(s, { type: "invite", name: "Fictional adult", role: "adult" }, now),
    ).toThrow();
  });
  it("denies child alerts but allows updates", () => {
    const s = execute(seed(), { type: "switch", id: I.sam }, now);
    expect(() =>
      execute(
        s,
        {
          type: "post",
          postType: "alert",
          title: "Alert",
          body: "Test",
          place: "",
          photos: [],
          recipients: [I.maya],
        },
        now,
      ),
    ).toThrow();
    const next = execute(
      s,
      {
        type: "post",
        postType: "update",
        title: "",
        body: "A small update",
        place: "",
        photos: [],
        recipients: [I.maya],
      },
      now,
    );
    expect(next.posts.at(-1)?.author).toBe(I.sam);
  });
  it("does not grant private messages to nonparticipant parents", () => {
    const s = seed();
    s.current = I.sam;
    expect(
      canReadThread(
        s,
        s.conversations.find((t) => t.id === I.parents)!,
      ),
    ).toBe(false);
  });
  it("blocks DMs in both directions and restores only approved history", () => {
    let s = seed();
    const permissions = {
      ...s.members[2].permissions,
      privateChat: true,
      contacts: [I.nora],
    };
    s = execute(s, { type: "permissions", id: I.sam, permissions }, now);
    expect(canDM(s, I.nora, I.sam)).toBe(true);
    const t = s.conversations.find((t) => t.id === I.restricted)!;
    expect(canReadThread(s, t, I.sam)).toBe(true);
    s = execute(
      s,
      {
        type: "permissions",
        id: I.sam,
        permissions: { ...permissions, privateChat: false },
      },
      now,
    );
    expect(canDM(s, I.sam, I.nora)).toBe(false);
    expect(canDM(s, I.nora, I.sam)).toBe(false);
    expect(visibleMessages(s, t, I.sam)).toEqual([]);
    expect(() =>
      execute(
        { ...s, current: I.nora },
        {
          type: "message",
          conversation: t.id,
          body: "blocked",
          mutationKey: "no",
        },
        now,
      ),
    ).toThrow();
    expect(canReadThread(s, s.conversations[0], I.sam)).toBe(true);
    s = execute(
      s,
      {
        type: "permissions",
        id: I.sam,
        permissions: { ...permissions, contacts: [I.maya] },
      },
      now,
    );
    expect(canReadThread(s, t, I.sam)).toBe(false);
  });
  it("preserves one owner and prevents removing the owner", () => {
    expect(() =>
      execute(seed(), { type: "member", id: I.maya, action: "remove" }, now),
    ).toThrow();
    const s = execute(seed(), { type: "member", id: I.daniel, action: "transfer" }, now);
    expect(s.owner).toBe(I.daniel);
  });
});
describe("Posts, reminders and source synchronization", () => {
  it("saves one source reminder per member including completed history", () => {
    let s = seed();
    const cmd = {
      type: "reminder" as const,
      title: "Birthday lunch",
      details: "",
      schedule,
      lead: 30,
      source: I.lunch,
    };
    s = execute(s, cmd, now);
    s = execute(s, cmd, now);
    expect(
      s.reminders.filter((r) => r.owner === I.maya && r.source === I.lunch),
    ).toHaveLength(1);
    s = execute(
      s,
      { type: "reminderAction", id: "r-maya-lunch", action: "complete" },
      now,
    );
    s = execute(s, cmd, now);
    expect(
      s.reminders.filter((r) => r.owner === I.maya && r.source === I.lunch),
    ).toHaveLength(1);
  });
  it("adopts source time without changing the personal lead time", () => {
    const s = execute(
      seed(),
      { type: "reminderAction", id: "r-maya-dentist", action: "adopt" },
      now,
    );
    const r = s.reminders.find((r) => r.id === "r-maya-dentist")!;
    expect(r.schedule.time).toBe("16:00");
    expect(r.lead).toBe(60);
    expect(r.change).toBe("none");
  });
  it("can explicitly keep a personal time", () => {
    const s = execute(
      seed(),
      { type: "reminderAction", id: "r-maya-dentist", action: "override" },
      now,
    );
    const r = s.reminders.find((r) => r.id === "r-maya-dentist")!;
    expect(r.schedule.time).toBe("15:00");
    expect(r.override).toBe(true);
    expect(r.change).toBe("none");
  });
  it("clears source snapshots on deletion and blocks late saves", () => {
    const s = execute(seed(), { type: "postAction", id: I.lunch, action: "delete" }, now);
    const r = s.reminders.find((r) => r.id === "r-sam-lunch")!;
    expect(r.change).toBe("unavailable");
    expect(r.details).toBe("");
    expect(r.sourceSchedule).toBeUndefined();
    expect(() =>
      execute(
        s,
        {
          type: "reminder",
          title: "Lunch",
          details: "",
          schedule,
          lead: 30,
          source: I.lunch,
        },
        now,
      ),
    ).toThrow();
  });
  it("pauses cancelled reminders", () => {
    const s = execute(seed(), { type: "postAction", id: I.lunch, action: "cancel" }, now);
    expect(s.reminders.find((r) => r.id === "r-maya-lunch")?.change).toBe("cancelled");
  });
  it("snapshots audiences and prevents expanding an old audience", () => {
    let s = seed();
    s = execute(
      s,
      {
        type: "postAction",
        id: I.lunch,
        action: "narrow",
        recipients: [I.daniel],
      },
      now,
    );
    expect(
      canReadPost(
        s,
        s.posts.find((p) => p.id === I.lunch)!,
        I.sam,
      ),
    ).toBe(false);
    expect(s.reminders.find((r) => r.id === "r-sam-lunch")?.change).toBe("unavailable");
    expect(() =>
      execute(
        s,
        {
          type: "post",
          id: I.lunch,
          postType: "reminder",
          title: "Lunch",
          body: "",
          place: "",
          photos: [],
          recipients: [I.sam],
          schedule,
        },
        now,
      ),
    ).toThrow();
  });
  it("does not reorder edited posts", () => {
    const s = seed(),
      p = s.posts.find((p) => p.id === I.lunch)!;
    const next = execute(
      s,
      {
        type: "post",
        id: p.id,
        postType: p.type,
        title: "Corrected title",
        body: p.body,
        place: p.place,
        photos: [],
        recipients: p.recipients,
        schedule: p.schedule,
      },
      now,
    );
    expect(next.posts.find((v) => v.id === p.id)?.created).toBe(p.created);
  });
  it("material alert edits invalidate acknowledgements", () => {
    const s = seed(),
      p = s.posts.find((p) => p.id === I.pickup)!;
    const next = execute(
      s,
      {
        type: "post",
        id: p.id,
        postType: "alert",
        title: p.title,
        body: "New pickup time: 4:30.",
        place: "",
        photos: [],
        recipients: p.recipients,
      },
      now,
    );
    expect(next.posts.find((v) => v.id === p.id)?.ackVersion).toBe(2);
  });
  it("punctuation does not invalidate acknowledgements", () => {
    const s = seed(),
      p = s.posts.find((p) => p.id === I.pickup)!;
    const next = execute(
      s,
      {
        type: "post",
        id: p.id,
        postType: "alert",
        title: p.title,
        body: p.body + "!",
        place: "",
        photos: [],
        recipients: p.recipients,
      },
      now,
    );
    expect(next.posts.find((v) => v.id === p.id)?.ackVersion).toBe(1);
  });
  it("requires adult acceptance and assigns children directly", () => {
    const s = execute(
      seed(),
      {
        type: "reminder",
        title: "A shared task",
        details: "",
        schedule,
        lead: 0,
        assignees: [I.nora, I.sam],
      },
      now,
    );
    expect(
      s.reminders.find((r) => r.title === "A shared task" && r.owner === I.nora)
        ?.response,
    ).toBe("pending");
    expect(
      s.reminders.find((r) => r.title === "A shared task" && r.owner === I.sam)?.response,
    ).toBe("accepted");
  });
  it("completes one recurring occurrence and keeps history", () => {
    const s = seed();
    const r = s.reminders[0];
    r.schedule = { ...schedule, recurrence: "weekly" };
    s.current = I.sam;
    const next = execute(
      s,
      { type: "reminderAction", id: r.id, action: "complete" },
      now,
    );
    const updated = next.reminders.find((v) => v.id === r.id)!;
    expect(updated.schedule.date).toBe("2026-11-01");
    expect(updated.state).toBe("upcoming");
    expect(updated.history).toHaveLength(1);
  });
});
describe("Messages, reports and membership", () => {
  it("deduplicates message retries by client mutation key", () => {
    const c = {
      type: "message" as const,
      conversation: I.family,
      body: "A little hello",
      mutationKey: "fixed",
    };
    const s = execute(execute(seed(), c, now), c, now);
    expect(s.messages.filter((m) => m.mutationKey === "fixed")).toHaveLength(1);
  });
  it("new members cannot read earlier family chat or posts", () => {
    const s = seed();
    s.members[4].joined = now;
    expect(visibleMessages(s, s.conversations[0], I.nora)).toHaveLength(0);
  });
  it("reports give only the submitted excerpt to an independent parent", () => {
    const s = execute(
      { ...seed(), current: I.sam },
      {
        type: "report",
        target: I.pickup,
        kind: "post",
        excerpt: "Dad is doing pickup today",
        reason: "Something else",
        note: "Demo",
        confirmed: true,
      },
      now,
    );
    expect(s.reports.at(-1)?.reviewer).toBe(I.daniel);
    expect(s.reports.at(-1)?.excerpt).toBe("Dad is doing pickup today");
    expect(() =>
      execute(
        s,
        {
          type: "report",
          target: I.pickup,
          kind: "post",
          excerpt: "Invented excerpt",
          reason: "Something else",
          note: "",
          confirmed: true,
        },
        now,
      ),
    ).toThrow();
  });
  it("removing someone ends location access and thread reads", () => {
    const s = execute(seed(), { type: "member", id: I.nora, action: "remove" }, now);
    expect(s.locations.some((l) => l.member === I.nora)).toBe(false);
    expect(s.locations.some((l) => l.recipients.includes(I.nora))).toBe(false);
    expect(canReadThread(s, s.conversations[0], I.nora)).toBe(false);
  });
});
describe("Location and notification boundaries", () => {
  it("never remotely starts sharing when a parent allows the feature", () => {
    const s = seed();
    const next = execute(
      s,
      {
        type: "permissions",
        id: I.sam,
        permissions: { ...s.members[2].permissions, location: true },
      },
      now,
    );
    expect(next.locations.some((l) => l.member === I.sam)).toBe(false);
  });
  it("expires coordinates on read and physically purges on due processing", () => {
    const s = seed(),
      later = now + 5 * 3600000;
    expect(visibleLocations(s, later)).toEqual([]);
    expect(processDue(s, later).locations).toEqual([]);
  });
  it("stops sample sharing for every recipient", () => {
    let s = execute(
      seed(),
      {
        type: "location",
        action: "start",
        duration: 15,
        recipients: [I.daniel],
      },
      now,
    );
    expect(s.locations.some((l) => l.member === I.maya)).toBe(true);
    s = execute(s, { type: "location", action: "stop" }, now);
    expect(s.locations.some((l) => l.member === I.maya)).toBe(false);
  });
  it("denies unlimited location duration", () => {
    expect(() =>
      execute(
        seed(),
        {
          type: "location",
          action: "start",
          duration: 99999,
          recipients: [I.daniel],
        },
        now,
      ),
    ).toThrow();
  });
  it("quiet hours support midnight crossings and exact boundaries", () => {
    expect(
      inQuietHours(Date.parse("2026-10-19T18:00:00Z"), "Asia/Dubai", "21:00", "07:00"),
    ).toBe(true);
    expect(
      inQuietHours(Date.parse("2026-10-19T02:30:00Z"), "Asia/Dubai", "21:00", "07:00"),
    ).toBe(true);
    expect(
      inQuietHours(Date.parse("2026-10-19T03:00:00Z"), "Asia/Dubai", "21:00", "07:00"),
    ).toBe(false);
  });
  it("delivers an occurrence only once", () => {
    const s = seed();
    const r = s.reminders.find((r) => r.id === "r-maya-slip")!;
    r.schedule = { ...schedule, date: "2026-10-19", time: "10:00" };
    r.lead = 30;
    const once = processDue(s, now),
      twice = processDue(once, now + 1000);
    expect(
      twice.notifications.filter((n) => n.key.startsWith("due:" + r.id)),
    ).toHaveLength(1);
  });
  it("pauses changed-source notification delivery", () => {
    const s = seed();
    const r = s.reminders.find((r) => r.id === "r-maya-dentist")!;
    r.schedule = { ...schedule, date: "2026-10-19", time: "10:00" };
    expect(
      processDue(s, now).notifications.filter((n) => n.key.startsWith("due:" + r.id)),
    ).toHaveLength(0);
  });
});
describe("Wall-time recurrence", () => {
  it("keeps wall time across daylight-saving transitions", () => {
    const s: Schedule = {
      date: "2026-03-07",
      time: "09:00",
      allDay: false,
      zone: "America/New_York",
      recurrence: "daily",
    };
    const next = nextSchedule(s);
    expect(next.time).toBe("09:00");
    expect(instant(next) - instant(s)).toBe(23 * 3600000);
  });
  it("uses February 28 for a yearly leap-day reminder in non-leap years", () => {
    expect(
      nextSchedule({ ...schedule, date: "2024-02-29", recurrence: "yearly" }).date,
    ).toBe("2025-02-28");
  });
  it("restores February 29 in the next leap year", () => {
    let s: Schedule = { ...schedule, date: "2024-02-29", recurrence: "yearly" };
    for (let i = 0; i < 4; i++) s = nextSchedule(s);
    expect(s.date).toBe("2028-02-29");
  });
  it("uses the first valid minute after a daylight-saving gap", () => {
    expect(
      new Date(
        instant({
          ...schedule,
          date: "2026-03-08",
          time: "02:30",
          zone: "America/New_York",
        }),
      ).toISOString(),
    ).toBe("2026-03-08T07:00:00.000Z");
  });
  it("chooses the earlier occurrence of an ambiguous wall time", () => {
    expect(
      new Date(
        instant({
          ...schedule,
          date: "2026-11-01",
          time: "01:30",
          zone: "America/New_York",
        }),
      ).toISOString(),
    ).toBe("2026-11-01T05:30:00.000Z");
  });
});
describe("Quiet inbox delivery", () => {
  it("uses the due time when a newly chosen lead time has already passed", () => {
    const s = execute(
      seed(),
      {
        type: "reminder",
        title: "A future plan",
        details: "",
        schedule: { ...schedule, date: "2026-10-19", time: "10:30" },
        lead: 60,
      },
      now,
    );
    const r = s.reminders.at(-1)!;
    expect(
      processDue(s, now).notifications.some((n) => n.key.startsWith("due:" + r.id)),
    ).toBe(false);
    expect(
      processDue(s, now + 30 * 60000).notifications.some((n) =>
        n.key.startsWith("due:" + r.id),
      ),
    ).toBe(true);
  });
  it("does not create future notifications for a newly saved past plan", () => {
    const s = execute(
      seed(),
      {
        type: "reminder",
        title: "A past plan",
        details: "",
        schedule: { ...schedule, date: "2026-10-19", time: "09:30" },
        lead: 0,
      },
      now,
    );
    const r = s.reminders.at(-1)!;
    expect(
      processDue(s, now).notifications.some((n) => n.key.startsWith("due:" + r.id)),
    ).toBe(false);
  });
  it("defers messages during quiet hours and delivers at the boundary", () => {
    const s = seed();
    s.members[4].preferences.quiet = true;
    const at = Date.parse("2026-10-19T18:00:00Z");
    const next = execute(
      s,
      {
        type: "message",
        conversation: I.family,
        body: "A quiet fictional hello",
        mutationKey: "quiet-test",
      },
      at,
    );
    const n = next.notifications.find(
      (n) => n.owner === I.nora && n.key.startsWith("message:"),
    )!;
    expect(n.event).toBe(at);
    expect(n.deliverAfter).toBe(Date.parse("2026-10-20T03:00:00Z"));
    const delivered = processDue(
      next,
      Date.parse("2026-10-20T03:00:00Z"),
    ).notifications.find((v) => v.id === n.id)!;
    expect(delivered.deliverAfter).toBeUndefined();
    expect(delivered.created).toBe(Date.parse("2026-10-20T03:00:00Z"));
  });
  it("respects disabled message notifications", () => {
    const s = seed();
    s.members[4].preferences.messages = false;
    const next = execute(
      s,
      {
        type: "message",
        conversation: I.family,
        body: "A fictional hello",
        mutationKey: "disabled-test",
      },
      now,
    );
    expect(
      next.notifications.some((n) => n.owner === I.nora && n.key.startsWith("message:")),
    ).toBe(false);
  });
  it("drops queued reminders if the source is cancelled", () => {
    const s = seed();
    const r = s.reminders.find((r) => r.id === "r-maya-lunch")!;
    r.schedule = { ...schedule, date: "2026-10-19", time: "22:00" };
    r.sourceSchedule = s.posts.find((p) => p.id === I.lunch)!.schedule;
    s.members[0].preferences.quiet = true;
    const at = Date.parse("2026-10-19T18:00:00Z");
    let next = processDue(s, at);
    expect(
      next.notifications.some((n) => n.key.startsWith("due:" + r.id) && n.deliverAfter),
    ).toBe(true);
    next = execute(next, { type: "postAction", id: I.lunch, action: "cancel" }, at);
    next = processDue(next, at + 1000);
    expect(next.notifications.some((n) => n.key.startsWith("due:" + r.id))).toBe(false);
  });
});
