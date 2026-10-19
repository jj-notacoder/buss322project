"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DemoRepository } from "@/data/repository";
import { createSeed } from "@/data/fixtures";
import { execute, processDue, type Command } from "@/domain/actions";
import type { State } from "@/domain/model";
interface Store {
  state: State | null;
  error: string;
  busy: boolean;
  now: number;
  run: (command: Command) => Promise<State>;
  reset: () => Promise<void>;
  toast: (message: string) => void;
  repository: DemoRepository;
}
const Context = createContext<Store | null>(null);
export function Provider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [now, setNow] = useState(Date.now);
  const [repository] = useState(() => new DemoRepository());
  const current = useRef<State | null>(null),
    lock = useRef(false),
    queue = useRef<Promise<unknown>>(Promise.resolve()),
    toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useCallback((message: string) => {
    setNotice(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setNotice(""), 4500);
  }, []);
  useEffect(() => {
    let alive = true;
    async function init() {
      try {
        const saved = await repository.load();
        if (saved && saved.schema !== 1)
          throw new Error(
            "This demo data version is unsupported. Reset the demo to recover.",
          );
        const s = processDue(
          saved ??
            createSeed(
              Date.now(),
              Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Dubai",
            ),
        );
        await repository.save(s);
        if (alive) {
          current.current = s;
          setState(s);
        }
      } catch (e) {
        if (alive)
          setError(e instanceof Error ? e.message : "Local storage could not open.");
      }
    }
    void init();
    return () => {
      alive = false;
    };
  }, [repository]);
  const run = useCallback(
    (c: Command) => {
      const operation = queue.current
        .catch(() => {})
        .then(async () => {
          if (!current.current) throw new Error("The demo is still loading.");
          lock.current = true;
          setBusy(true);
          try {
            const next = execute(current.current, c);
            await repository.save(next);
            current.current = next;
            setState(next);
            return next;
          } catch (e) {
            const message =
              e instanceof Error ? e.message : "Could not save. Your text is still here.";
            toast(message);
            throw e;
          } finally {
            lock.current = false;
            setBusy(false);
          }
        });
      queue.current = operation;
      return operation;
    },
    [toast, repository],
  );
  const reset = useCallback(async () => {
    await queue.current.catch(() => {});
    await repository.reset();
    const s = createSeed(
      Date.now(),
      Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Dubai",
    );
    await repository.save(s);
    current.current = s;
    setState(s);
    setError("");
    toast("The fictional Parker family is ready again.");
  }, [toast, repository]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (!current.current || lock.current || current.current.closed) return;
      queue.current = queue.current
        .catch(() => {})
        .then(async () => {
          if (!current.current) return;
          lock.current = true;
          try {
            const next = processDue(current.current);
            if (JSON.stringify(next) !== JSON.stringify(current.current)) {
              await repository.save(next);
              current.current = next;
              setState(next);
            }
            setError("");
          } catch {
            setError("Local changes could not be saved. Keep this page open and retry.");
          } finally {
            lock.current = false;
          }
        });
    }, 30000);
    return () => clearInterval(timer);
  }, [repository]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);
  return (
    <Context.Provider value={{ state, error, busy, now, run, reset, toast, repository }}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {notice && (
          <div className="toast">
            {notice}
            <button aria-label="Dismiss notification" onClick={() => setNotice("")}>
              ×
            </button>
          </div>
        )}
      </div>
    </Context.Provider>
  );
}
export function useStore() {
  const value = useContext(Context);
  if (!value) throw new Error("Provider is missing");
  return value;
}
