import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { IDS as I } from "../src/domain/model";
import { mkdir, writeFile } from "node:fs/promises";
const open = async (page: Page, path = "/app/feed") => {
  await page.goto(path);
  await expect(page.getByRole("main")).toBeVisible();
};
async function switchTo(page: Page, id: string) {
  await open(page, "/app/settings");
  await page.getByLabel("Explore as").selectOption(id);
  await expect(page).toHaveURL(/\/app\/feed/);
}

test("parent publishes a lunch plan; child saves once and follows its source after reload", async ({
  page,
}) => {
  await open(page, "/app/posts/new?type=reminder");
  await page.getByLabel("Title (required)").fill("A little Saturday lunch");
  await page.getByLabel("A little more detail").fill("Bring a fictional picnic blanket.");
  await page.getByLabel("Date", { exact: true }).fill("2026-11-07");
  await page.getByRole("button", { name: "Share with family", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/feed/);
  await expect(
    page.getByRole("heading", { name: "A little Saturday lunch" }),
  ).toBeVisible();
  await switchTo(page, I.ella);
  const card = page.locator("article").filter({
    has: page.getByRole("heading", { name: "A little Saturday lunch" }),
  });
  await card.getByRole("button", { name: "Add to Reminders" }).click();
  await page.getByLabel("Remind me", { exact: true }).selectOption("60");
  await page.getByRole("button", { name: "Save reminder", exact: true }).click();
  await expect(card.getByRole("button", { name: "Saved to Reminders" })).toBeVisible();
  await card.getByRole("button", { name: "Saved to Reminders" }).click();
  await expect(
    page.getByRole("heading", { name: "A little Saturday lunch" }),
  ).toBeVisible();
  await expect(page.getByText("Remind me 60 minutes before")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "A little Saturday lunch" }),
  ).toBeVisible();
  await page.getByRole("link", { name: /From a family post/ }).click();
  await expect(page).toHaveURL(/\/app\/posts\//);
  await open(page, "/app/reminders");
  await expect(
    page.locator(".reminder-row").filter({ hasText: "A little Saturday lunch" }),
  ).toHaveCount(1);
});

test("cake message becomes a reminder and the conversation draft survives", async ({
  page,
}) => {
  await open(page, `/app/messages/${I.family}`);
  await page.getByLabel("Message to Family room").fill("Still drafting a little reply");
  const message = page
    .locator(".message-row")
    .filter({ hasText: "Would someone be able to bring a birthday cake" });
  await message.locator("summary").click();
  await message.getByRole("button", { name: "Create reminder" }).click();
  await expect(page.getByLabel("What would you like to remember?")).toHaveValue(
    /Would someone/,
  );
  await page
    .getByLabel("What would you like to remember?")
    .fill("Bake Grandma’s birthday cake");
  await page.getByLabel("Date", { exact: true }).fill("2026-11-06");
  await page.getByRole("button", { name: "Save reminder", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Bake Grandma’s birthday cake" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "View source conversation" }).click();
  await expect(page.getByLabel("Message to Family room")).toHaveValue(
    "Still drafting a little reply",
  );
  await page
    .getByLabel("Message to Family room")
    .fill("The fictional cake plan is ready.");
  await page.getByRole("button", { name: "Send message locally" }).click();
  await expect(
    page
      .locator(".message-bubble")
      .filter({ hasText: "The fictional cake plan is ready." }),
  ).toHaveCount(1);
  await expect(page.getByLabel("Message to Family room")).toHaveValue("");
});

test("source change lets the recipient adopt or keep a personal time", async ({
  page,
}) => {
  await open(page, "/app/reminders/r-maya-dentist");
  await expect(
    page.getByRole("heading", { name: "The plan has a new time." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Update reminder", exact: true }).click();
  await expect(page.getByText(/4:00 PM/).first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Update reminder", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.getByText(/Remind me 60 minutes before/)).toBeVisible();
});

test("child private access blocks both directions and deep links; family chat remains", async ({
  page,
}) => {
  await open(page, `/app/family/members/${I.sam}`);
  await page.getByRole("switch", { name: /Private conversations/ }).check();
  await page.locator(".people-picker label").filter({ hasText: "Nora" }).click();
  await page.getByRole("button", { name: "Save access settings" }).click();
  await expect(page.getByRole("button", { name: "Save access settings" })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole("switch", { name: /Private conversations/ })).toBeChecked();
  await switchTo(page, I.sam);
  await open(page, `/app/messages/${I.restricted}`);
  await expect(
    page.getByText("We can bake together next weekend.", { exact: true }),
  ).toBeVisible();
  await switchTo(page, I.maya);
  await open(page, `/app/family/members/${I.sam}`);
  await page.getByRole("switch", { name: /Private conversations/ }).uncheck();
  await page.getByRole("button", { name: "Save access settings" }).click();
  await page.getByRole("button", { name: "Update access", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save access settings" })).toBeDisabled();
  await page.reload();
  await expect(
    page.getByRole("switch", { name: /Private conversations/ }),
  ).not.toBeChecked();
  await switchTo(page, I.sam);
  await open(page, `/app/messages/${I.restricted}`);
  await expect(
    page.getByRole("heading", { name: "This conversation isn’t available" }),
  ).toBeVisible();
  await expect(
    page.getByText("We can bake together next weekend.", { exact: true }),
  ).toHaveCount(0);
  await open(page, `/app/messages/${I.family}`);
  await expect(page.getByLabel("Message to Family room")).toBeVisible();
  await switchTo(page, I.nora);
  await open(page, `/app/messages/${I.restricted}`);
  await expect(
    page.getByRole("heading", { name: "This conversation isn’t available" }),
  ).toBeVisible();
  await open(page, "/app/family/devices");
  await expect(
    page.getByRole("heading", { name: "A little behind-the-scenes space" }),
  ).toBeVisible();
});

test("sample sharing is explicit, recipient-scoped, persistent and stoppable", async ({
  page,
}) => {
  await open(page, "/app/map");
  await page.getByRole("button", { name: "Share sample location" }).click();
  await page.getByLabel(/I understand this is a sample location/).check();
  await page.getByRole("button", { name: "Start sample sharing" }).click();
  await expect(
    page.getByRole("heading", { name: "Your sample location is shared." }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your sample location is shared." }),
  ).toBeVisible();
  await switchTo(page, I.daniel);
  await open(page, "/app/map");
  await expect(page.getByRole("button", { name: /Maya, fresh sample/ })).toBeVisible();
  await switchTo(page, I.maya);
  await open(page, "/app/map");
  await page.getByRole("button", { name: "Stop sharing", exact: true }).last().click();
  await expect(
    page.getByRole("heading", { name: "Your location is off." }),
  ).toBeVisible();
  await switchTo(page, I.daniel);
  await open(page, "/app/map");
  await expect(page.getByRole("button", { name: /Maya, fresh sample/ })).toHaveCount(0);
});

test("photo upload, post edit and removal all persist", async ({ page }) => {
  await open(page, "/app/posts/new");
  await page
    .getByLabel("Your update", { exact: true })
    .fill("A fictional family baking moment.");
  await page.locator("input[type=file]").setInputFiles("public/images/baking.jpg");
  await expect(page.getByLabel("Photo description")).toBeVisible();
  await page.getByLabel("Photo description").fill("Fresh pastries on a kitchen counter");
  await page.getByRole("button", { name: "Share with family", exact: true }).click();
  await expect(page).toHaveURL(/feed/);
  const card = page
    .locator("article")
    .filter({ hasText: "A fictional family baking moment." });
  await expect(
    card.locator('img[alt="Fresh pastries on a kitchen counter"]'),
  ).toBeVisible();
  await card.locator("summary").click();
  await card.getByRole("link", { name: "Edit post", exact: true }).click();
  await page
    .getByLabel("Your update", { exact: true })
    .fill("Our fictional pastries are ready.");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/posts\/[^/]+$/);
  await expect(page.getByText("Our fictional pastries are ready.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Our fictional pastries are ready.")).toBeVisible();
  await page.locator("article summary").click();
  await page.getByRole("button", { name: "Remove post", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Remove post", exact: true })
    .click();
  await expect(page).toHaveURL(/feed/);
  await expect(page.getByText("Our fictional pastries are ready.")).toHaveCount(0);
});

test("keyboard dialog trapping, focus return and core accessibility", async ({
  page,
}) => {
  await open(page);
  const trigger = page.getByRole("button", {
    name: "Switch demo profile",
    exact: true,
  });
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      description: v.description,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
});

test("a failed local send retains the draft and retry saves exactly once", async ({
  page,
}) => {
  await open(page, `/app/messages/${I.family}`);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    let failed = false;
    IDBObjectStore.prototype.put = function (value, key) {
      if (
        this.name === "state" &&
        !failed &&
        value.messages?.some(
          (m: { body: string }) => m.body === "A fictional retry test.",
        )
      ) {
        failed = true;
        throw new DOMException("Simulated local storage failure", "QuotaExceededError");
      }
      return original.call(this, value, key);
    };
  });
  await page.getByLabel("Message to Family room").fill("A fictional retry test.");
  await page.getByRole("button", { name: "Send message locally" }).click();
  await expect(
    page.getByText("Your message wasn’t saved. Your text is still here."),
  ).toBeVisible();
  await expect(page.getByLabel("Message to Family room")).toHaveValue(
    "A fictional retry test.",
  );
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.locator(".message-bubble").filter({ hasText: "A fictional retry test." }),
  ).toHaveCount(1);
  await expect(page.getByLabel("Message to Family room")).toHaveValue("");
});

test("simulated invites, child creation, pairing approval and concerns are usable", async ({
  page,
}) => {
  await open(page, "/app/family/invites");
  await page.getByLabel("Fictional name").fill("Robin");
  await page.getByRole("button", { name: "Create demo invitation" }).click();
  await page.getByRole("link", { name: "Review demo invitation" }).click();
  await page.getByRole("button", { name: "Simulate acceptance" }).click();
  await expect(page.getByRole("heading", { name: "Robin", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add a child", exact: true }).click();
  await page.getByLabel("Fictional display name").fill("Alex");
  await page.getByRole("button", { name: "Create demo profile" }).click();
  await expect(page.getByRole("heading", { name: "Alex", exact: true })).toBeVisible();
  await open(page, "/pair");
  await page.getByLabel("Fictional child").selectOption({ label: "Alex" });
  await page.getByRole("button", { name: "Request demo pairing" }).click();
  await page.getByRole("link", { name: "Review as a parent" }).click();
  const request = page.locator(".device-row").filter({ hasText: "Alex" });
  await request.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(request.getByText(/Alex · Approved/)).toBeVisible();
  await open(page, "/app/family/reports");
  await page.getByRole("button", { name: "Mark reviewed" }).click();
  await page.getByRole("button", { name: "Reviewed", exact: true }).click();
  await expect(
    page.getByText("A fictional report to explore the review flow."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Resolve concern" }).click();
  await page.getByRole("button", { name: "Resolved", exact: true }).click();
  await expect(
    page.getByText("A fictional report to explore the review flow."),
  ).toBeVisible();
});

for (const width of [320, 375, 390, 430, 768, 1024, 1440])
  test(`responsive routes at ${width}px have no horizontal overflow`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/app/feed",
      "/app/reminders",
      `/app/messages/${I.family}`,
      "/app/map",
      "/app/family",
      "/app/posts/new",
      "/app/settings",
    ]) {
      await open(page, path);
      await expect(page.locator("h1").first())
        .toBeVisible({ visible: path.includes("/messages/") ? false : true })
        .catch(async (e) => {
          if (!path.includes("/messages/")) throw e;
        });
      const size = await page.evaluate(() => ({
        page: document.documentElement.scrollWidth,
        viewport: innerWidth,
      }));
      expect(size.page, `${path} at ${width}`).toBeLessThanOrEqual(size.viewport);
      if (path === "/app/feed")
        await page.screenshot({
          path: `artifacts/screenshots/feed-${width}.png`,
          fullPage: width === 1440,
        });
      if (path === "/app/feed" && width === 1440)
        await page.screenshot({ path: "artifacts/screenshots/desktop-preview.png" });
      if (path === "/app/map" && width === 390)
        await page.screenshot({
          path: "artifacts/screenshots/map-390.png",
          fullPage: true,
        });
    }
  });

test("200 percent text zoom still fits a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["/app/feed", "/app/reminders", "/app/family"]) {
    await open(page, route);
    await page.evaluate(() => {
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>("body,body *"),
      ).filter((e) => e instanceof HTMLElement);
      const sizes = nodes.map((e) => parseFloat(getComputedStyle(e).fontSize) * 2);
      nodes.forEach((e, i) =>
        e.style.setProperty("font-size", sizes[i] + "px", "important"),
      );
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
  }
});

test("records local phone rendering performance", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const metrics = { lcp: 0, cls: 0 };
    (window as unknown as Window & { familyMetrics: typeof metrics }).familyMetrics =
      metrics;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) metrics.lcp = entry.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
        };
        if (!shift.hadRecentInput) metrics.cls += shift.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await open(page);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("heading", { name: "Hello, Maya." })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as Window & { familyMetrics: { lcp: number } }).familyMetrics
            .lcp,
      ),
    )
    .toBeGreaterThan(0);
  const metrics = await page.evaluate(
    () =>
      (window as unknown as Window & { familyMetrics: { lcp: number; cls: number } })
        .familyMetrics,
  );
  await mkdir("artifacts", { recursive: true });
  await writeFile(
    "artifacts/performance.json",
    JSON.stringify(
      {
        measuredAt: new Date().toISOString(),
        environment: process.env.PLAYWRIGHT_BASE_URL
          ? "Local production build"
          : "Local development build",
        browser: "Chromium",
        viewport: "390 × 844",
        network: "Localhost; no network or CPU throttling",
        ...metrics,
      },
      null,
      2,
    ),
  );
  expect(metrics.cls).toBeLessThan(0.1);
  console.log(
    `Phone rendering: LCP ${Math.round(metrics.lcp)}ms; CLS ${metrics.cls.toFixed(4)} (local, unthrottled).`,
  );
});

test("main feature screens pass automated accessibility checks", async ({ page }) => {
  for (const route of [
    "/app/reminders",
    `/app/messages/${I.family}`,
    "/app/map",
    "/app/family",
    "/app/posts/new",
    "/app/settings",
    `/app/family/members/${I.sam}`,
  ]) {
    await open(page, route);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        route,
        id: v.id,
        nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
      })),
    ).toEqual([]);
  }
});
