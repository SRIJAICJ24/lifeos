import { Data, defaultSettings, emptyData } from "../domain/types";
import { migrations } from "./migrations";
export interface Database {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: any[]): Promise<unknown>;
  getAllAsync<T>(sql: string, ...params: any[]): Promise<T[]>;
  withTransactionAsync(fn: () => Promise<void>): Promise<void>;
}
export const tables = [
  "subjects",
  "skills",
  "projects",
  "habits",
  "tasks",
  "blocks",
  "calendar",
  "classes",
  "topics",
  "habitLogs",
  "sessions",
  "meals",
  "workouts",
  "exercises",
  "workoutLogs",
  "bodyMetrics",
  "dependencies",
] as const;
export type Table = (typeof tables)[number];
export class Repository {
  constructor(public db: Database) {}
  async migrate() {
    await this.db.execAsync(
      "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY);",
    );
    const versions = await this.db.getAllAsync<{ version: number }>(
      "SELECT version FROM schema_migrations",
    );
    for (let i = 0; i < migrations.length; i++) {
      if (!versions.some((v) => v.version === i + 1))
        await this.db.withTransactionAsync(async () => {
          await this.db.execAsync(migrations[i]!);
          await this.db.runAsync(
            "INSERT INTO schema_migrations VALUES (?)",
            i + 1,
          );
        });
    }
  }
  async upsert(table: Table, row: object) {
    if (!tables.includes(table)) throw new Error("Unknown table");
    const entries = Object.entries(row).filter(([, v]) => v !== undefined);
    if (entries.some(([k]) => !/^[A-Za-z]+$/.test(k)))
      throw new Error("Invalid field");
    const key = table === "calendar" ? "date" : "id";
    await this.db.runAsync(
      `INSERT INTO ${table} (${entries.map(([k]) => k).join(",")}) VALUES (${entries.map(() => "?").join(",")}) ON CONFLICT(${key}) DO UPDATE SET ${entries
        .filter(([k]) => k !== key)
        .map(([k]) => `${k}=excluded.${k}`)
        .join(",")}`,
      ...entries.map(([, v]) => v),
    );
  }
  async remove(table: Table, id: string) {
    if (!tables.includes(table)) throw new Error("Unknown table");
    if (["subjects", "skills", "projects"].includes(table))
      await this.db.runAsync("DELETE FROM topics WHERE ownerId=?", id);
    if (table === "tasks")
      await this.db.runAsync("DELETE FROM settings WHERE key=?", `focus-${id}`);
    await this.db.runAsync(
      `DELETE FROM ${table} WHERE ${table === "calendar" ? "date" : "id"}=?`,
      id,
    );
  }
  async settings(values: Partial<Data["settings"]>) {
    for (const [key, value] of Object.entries(values))
      await this.db.runAsync(
        "INSERT INTO settings VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        key,
        String(value),
      );
  }
  async read(): Promise<Data> {
    const data = emptyData();
    for (const table of tables)
      (data[table] as unknown[]) = await this.db.getAllAsync(
        `SELECT * FROM ${table}`,
      );
    const rows = await this.db.getAllAsync<{
      key: keyof Data["settings"];
      value: string;
    }>("SELECT * FROM settings");
    for (const r of rows)
      if (r.key in defaultSettings)
        (data.settings as any)[r.key] =
          typeof defaultSettings[r.key] === "number"
            ? Number(r.value)
            : r.value;
    return data;
  }
  async clear() {
    await this.db.withTransactionAsync(async () => {
      for (const table of [...tables].reverse())
        await this.db.execAsync(`DELETE FROM ${table};`);
      await this.db.execAsync(
        "DELETE FROM widget_snapshots; DELETE FROM notification_records; DELETE FROM milestones; DELETE FROM goals; DELETE FROM sync_outbox; DELETE FROM settings WHERE key LIKE 'focus-%';",
      );
      await this.settings({ demo: 0 });
    });
  }
}
