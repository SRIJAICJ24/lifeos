import { Repository, tables } from "../data/repository";
import { Data } from "../domain/types";
export function exportBackup(data: Data) {
  return JSON.stringify(
    {
      format: "lifeos",
      version: 1,
      exportedAt: new Date().toISOString(),
      data,
    },
    null,
    2,
  );
}
export async function importBackup(repo: Repository, text: string) {
  const parsed = JSON.parse(text);
  if (parsed.format !== "lifeos" || parsed.version !== 1 || !parsed.data)
    throw new Error("This is not a supported LifeOS backup.");
  const data = parsed.data;
  for (const table of tables)
    if (!Array.isArray(data[table]))
      throw new Error(`Backup is missing ${table}.`);
  if (!data.settings || typeof data.settings.wake !== "number")
    throw new Error("Backup settings are missing.");
  await repo.db.withTransactionAsync(async () => {
    for (const table of [...tables].reverse())
      await repo.db.execAsync(`DELETE FROM ${table};`);
    for (const table of tables) {
      const rows =
        table === "tasks"
          ? [...data[table]].sort(
              (a: any, b: any) => Number(!!a.parentId) - Number(!!b.parentId),
            )
          : data[table];
      for (const row of rows) await repo.upsert(table, row);
    }
    await repo.settings({ ...data.settings, demo: 0, onboarded: 1 });
  });
}
