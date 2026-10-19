"use client";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Provider, useStore } from "./provider";
import { Shell } from "./shell";
import { Feed, PostCard, PostEditor } from "./posts";
import { ReminderDetail, ReminderEditor, Reminders } from "./reminders";
import { Messages } from "./messages";
import { Devices, Family, FamilyAdmin, Invites, MemberDetail, Reports } from "./family";
import { Notifications, SettingsPage } from "./settings";
import { CreateFamily, Join, Pair, Welcome } from "./onboarding";
import { Back, Empty, PageHeading } from "./ui";
import { canReadPost } from "@/domain/permissions";
const FamilyMap = dynamic(() => import("./map"), {
  loading: () => (
    <div className="panel">
      <div className="skeleton map-skeleton" />
      Opening your sample map…
    </div>
  ),
});
export function Application() {
  return (
    <Provider>
      <Routes />
    </Provider>
  );
}
function Routes() {
  const pathname = usePathname();
  const { state } = useStore();
  if (pathname === "/welcome" || pathname === "/sign-in") return <Welcome />;
  if (
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/join/") ||
    pathname === "/pair"
  ) {
    if (!state)
      return (
        <Shell>
          <></>
        </Shell>
      );
    return pathname === "/pair" ? (
      <Pair />
    ) : pathname.startsWith("/join/") ? (
      <Join token={pathname.split("/")[2]} />
    ) : (
      <CreateFamily />
    );
  }
  return (
    <Shell>
      <RouteContent key={pathname + state?.current} path={pathname} />
    </Shell>
  );
}
function RouteContent({ path }: { path: string }) {
  const { state } = useStore();
  if (!state) return null;
  if (path === "/" || path === "/app" || path === "/app/feed") return <Feed />;
  const parts = path.split("/").filter(Boolean);
  if (parts[1] === "posts") {
    if (parts[2] === "new") return <PostEditor />;
    if (parts[3] === "edit") return <PostEditor id={parts[2]} />;
    const post = state.posts.find((p) => p.id === parts[2] && canReadPost(state, p));
    return (
      <div className="detail-page">
        <Back />
        {post ? (
          <>
            <PageHeading title={post.title || "A little moment, shared."} />
            <PostCard post={post} detail />
          </>
        ) : (
          <Empty title="This update is unavailable">
            It may have been removed, or you may no longer be in its audience.
          </Empty>
        )}
      </div>
    );
  }
  if (parts[1] === "reminders")
    return parts[2] === "new" ? (
      <ReminderEditor />
    ) : parts[2] ? (
      <ReminderDetail id={parts[2]} />
    ) : (
      <Reminders />
    );
  if (parts[1] === "messages") return <Messages threadId={parts[2]} />;
  if (parts[1] === "map") return <FamilyMap />;
  if (parts[1] === "family") {
    if (parts[2] === "members" && parts[3]) return <MemberDetail id={parts[3]} />;
    if (parts[2] === "invites") return <Invites />;
    if (parts[2] === "devices") return <Devices />;
    if (parts[2] === "reports") return <Reports />;
    if (parts[2] === "admin") return <FamilyAdmin />;
    return <Family />;
  }
  if (parts[1] === "settings") return <SettingsPage />;
  if (parts[1] === "notifications") return <Notifications />;
  return (
    <>
      <Back />
      <Empty title="A little off the beaten path.">
        That page isn’t part of this family space. Head back to the feed.
      </Empty>
    </>
  );
}
