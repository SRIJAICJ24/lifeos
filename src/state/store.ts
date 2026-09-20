import { create } from "zustand";
import { Data, emptyData } from "../domain/types";
import { openRepository } from "../data/database";
import { seed } from "../data/seed";
import { LifeEngine } from "../services/lifeEngine";
import { dateKey, nowMinute } from "../domain/time";
interface State {
  data: Data;
  ready: boolean;
  busy: boolean;
  error: string;
  message: string;
  minute: number;
  engine: LifeEngine | null;
  initialize: () => Promise<void>;
  act: (
    fn: (engine: LifeEngine) => Promise<unknown>,
    message?: string,
  ) => Promise<boolean>;
  dismiss: () => void;
  tick: () => void;
}
let queue = Promise.resolve();
export const useLife = create<State>((set, get) => ({
  data: emptyData(),
  ready: false,
  busy: false,
  error: "",
  message: "",
  minute: nowMinute(),
  engine: null,
  initialize: async () => {
    try {
      const repo = await openRepository();
      await seed(repo);
      const engine = new LifeEngine(repo);
      await engine.rollover();
      await engine.ensureHabits(dateKey());
      const data = await engine.snapshot();
      set({ engine, data, ready: true, error: "" });
      void import("../services/nativeIntegrations")
        .then((m) => m.refreshIntegrations(data))
        .catch(() => {});
    } catch (e) {
      set({
        error: `Could not open the local database. ${String(e)}`,
        ready: false,
      });
    }
  },
  act: async (fn, message = "Saved on this device") => {
    let success = false;
    const run = async () => {
      set({ busy: true, error: "", message: "" });
      try {
        const engine = get().engine;
        if (!engine) throw new Error("Database is still opening.");
        const before = get().data;
        await fn(engine);
        await engine.reconcile(before);
        const data = await engine.snapshot();
        set({ data, message });
        success = true;
        void import("../services/nativeIntegrations")
          .then((m) => m.refreshIntegrations(data))
          .catch(() => {});
      } catch (e) {
        set({ error: e instanceof Error ? e.message : String(e) });
      } finally {
        set({ busy: false });
      }
    };
    queue = queue.then(run, run);
    await queue;
    return success;
  },
  dismiss: () => set({ error: "", message: "" }),
  tick: () => set({ minute: nowMinute() }),
}));
