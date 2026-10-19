import { Suspense } from "react";
import { Application } from "@/components/application";
export default function Page() {
  if (process.env.NEXT_PUBLIC_APP_MODE && process.env.NEXT_PUBLIC_APP_MODE !== "demo")
    return (
      <main className="boot-screen">
        <h1>Connected mode is unavailable</h1>
        <p>
          This build supports the local demo only. Set NEXT_PUBLIC_APP_MODE=demo and
          restart. No sample data has been loaded in connected mode.
        </p>
      </main>
    );
  return (
    <Suspense fallback={<div className="boot-screen">Opening Family Space…</div>}>
      <Application />
    </Suspense>
  );
}
