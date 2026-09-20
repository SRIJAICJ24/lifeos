import { DatabaseSync } from "node:sqlite";
import { mkdirSync, writeFileSync } from "node:fs";
import { migrations } from "../src/data/migrations";
import { tables } from "../src/data/repository";
const db = new DatabaseSync(":memory:");
for (const migration of migrations) db.exec(migration);
mkdirSync("supabase/migrations", { recursive: true });
mkdirSync("docs", { recursive: true });
writeFileSync("docs/sqlite-schema.sql", migrations.join("\n"));
const snake = (k: string) => k.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
let sql = `-- Optional normalized backup storage. Apply to your own Supabase project.
-- No service-role key is needed in the app. Every row is scoped to auth.uid().
CREATE TABLE public.lifeos_backups (
 id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), status text NOT NULL CHECK(status IN ('uploading','complete')), version integer NOT NULL,
 UNIQUE(owner_id,id)
);
ALTER TABLE public.lifeos_backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_backups ON public.lifeos_backups FOR ALL TO authenticated USING ((SELECT auth.uid())=owner_id) WITH CHECK ((SELECT auth.uid())=owner_id);
`;
for (const table of [...tables, "settings"]) {
  const fields = db.prepare(`PRAGMA table_info(${table})`).all() as unknown as {
    name: string;
    type: string;
    notnull: number;
    pk: number;
  }[];
  const key = fields.find((f) => f.pk)!.name;
  const cloud = "lifeos_" + snake(table);
  sql += `\nCREATE TABLE public.${cloud} (\n owner_id uuid NOT NULL, backup_id uuid NOT NULL,\n ${fields.map((f) => `${snake(f.name)} ${f.type === "INTEGER" ? "integer" : f.type === "REAL" ? "double precision" : "text"}${f.notnull || f.pk ? " NOT NULL" : ""}`).join(",\n ")},\n PRIMARY KEY(owner_id,backup_id,${snake(key)}),\n FOREIGN KEY(owner_id,backup_id) REFERENCES public.lifeos_backups(owner_id,id) ON DELETE CASCADE\n);\nALTER TABLE public.${cloud} ENABLE ROW LEVEL SECURITY;\nCREATE POLICY own_rows ON public.${cloud} FOR ALL TO authenticated USING ((SELECT auth.uid())=owner_id) WITH CHECK ((SELECT auth.uid())=owner_id);\n`;
}
// Relational references include backup and owner, preventing cross-account links.
for (const table of tables) {
  const fks = db
    .prepare(`PRAGMA foreign_key_list(${table})`)
    .all() as unknown as { from: string; table: string; to: string }[];
  for (const fk of fks)
    sql += `ALTER TABLE public.lifeos_${snake(table)} ADD FOREIGN KEY(owner_id,backup_id,${snake(fk.from)}) REFERENCES public.lifeos_${snake(fk.table)}(owner_id,backup_id,${snake(fk.to)}) DEFERRABLE INITIALLY DEFERRED;\n`;
}
writeFileSync("supabase/migrations/001_normalized_backups.sql", sql);
db.close();
