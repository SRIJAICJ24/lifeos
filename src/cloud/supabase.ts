import { Data } from "../domain/types";
import { tables } from "../data/repository";
import { randomUUID } from "expo-crypto";
export interface CloudConfig {
  url: string;
  publishableKey: string;
}
export interface CloudSession {
  access_token: string;
  refresh_token: string;
  user: { id: string };
}
const snake = (key: string) =>
  key.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
const camel = (key: string) =>
  key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
/** Optional, explicit backups. No requests occur during local startup. The caller owns secure session storage. */
export class SupabaseBackup {
  constructor(
    private config: CloudConfig,
    private request: typeof fetch = fetch,
  ) {
    if (!/^https:\/\/[a-z0-9.-]+\/?$/i.test(config.url))
      throw new Error("Use your HTTPS Supabase project URL.");
  }
  private async call(
    path: string,
    body?: unknown,
    session?: CloudSession,
    method = body ? "POST" : "GET",
  ) {
    const response = await this.request(
      this.config.url.replace(/\/$/, "") + path,
      {
        method,
        headers: {
          apikey: this.config.publishableKey,
          "Content-Type": "application/json",
          ...(session
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
    );
    if (!response.ok)
      throw new Error(
        `Cloud request failed (${response.status}). Your local data is safe.`,
      );
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }
  async requestEmailCode(email: string) {
    await this.call("/auth/v1/otp", { email, create_user: true });
  }
  async verifyEmailCode(email: string, token: string): Promise<CloudSession> {
    return this.call("/auth/v1/verify", { email, token, type: "email" });
  }
  async refresh(refreshToken: string): Promise<CloudSession> {
    return this.call("/auth/v1/token?grant_type=refresh_token", {
      refresh_token: refreshToken,
    });
  }
  async upload(data: Data, session: CloudSession): Promise<string> {
    const backupId = randomUUID();
    const scope = { owner_id: session.user.id, backup_id: backupId };
    await this.call(
      "/rest/v1/lifeos_backups",
      {
        id: backupId,
        owner_id: session.user.id,
        status: "uploading",
        version: 1,
      },
      session,
    );
    for (const table of tables) {
      const ordered =
        table === "tasks"
          ? data.tasks
              .slice()
              .sort((a, b) => Number(!!a.parentId) - Number(!!b.parentId))
          : data[table];
      if (ordered.length)
        await this.call(
          `/rest/v1/lifeos_${snake(table)}`,
          ordered.map((row) => ({
            ...scope,
            ...Object.fromEntries(
              Object.entries(row).map(([k, v]) => [snake(k), v]),
            ),
          })),
          session,
        );
    }
    await this.call(
      "/rest/v1/lifeos_settings",
      Object.entries(data.settings).map(([key, value]) => ({
        ...scope,
        key,
        value: String(value),
      })),
      session,
    );
    await this.call(
      `/rest/v1/lifeos_backups?id=eq.${backupId}&owner_id=eq.${session.user.id}`,
      { status: "complete" },
      session,
      "PATCH",
    );
    return backupId;
  }
  async list(
    session: CloudSession,
  ): Promise<{ id: string; created_at: string }[]> {
    return this.call(
      `/rest/v1/lifeos_backups?owner_id=eq.${session.user.id}&status=eq.complete&order=created_at.desc&select=id,created_at`,
      undefined,
      session,
    );
  }
  async download(backupId: string, session: CloudSession) {
    if (!/^[a-f0-9-]{36}$/i.test(backupId))
      throw new Error("Invalid backup identifier.");
    const scope = `backup_id=eq.${backupId}&owner_id=eq.${session.user.id}`;
    const available = await this.list(session);
    if (!available.some((b) => b.id === backupId))
      throw new Error("This backup is incomplete or unavailable.");
    const data: any = {};
    for (const table of tables) {
      const rows: any[] = [];
      for (let offset = 0; ; offset += 500) {
        const page = await this.call(
          `/rest/v1/lifeos_${snake(table)}?${scope}&order=${table === "calendar" ? "date" : "id"}&limit=500&offset=${offset}`,
          undefined,
          session,
        );
        rows.push(...page);
        if (page.length < 500) break;
      }
      data[table] = rows.map((row: any) =>
        Object.fromEntries(
          Object.entries(row)
            .filter(([k]) => !["owner_id", "backup_id"].includes(k))
            .map(([k, v]) => [camel(k), v]),
        ),
      );
    }
    const settings = await this.call(
      `/rest/v1/lifeos_settings?${scope}`,
      undefined,
      session,
    );
    const { defaultSettings } = await import("../domain/types");
    data.settings = Object.fromEntries(
      settings.map((s: any) => [
        s.key,
        typeof (defaultSettings as any)[s.key] === "number"
          ? Number(s.value)
          : s.value,
      ]),
    );
    return JSON.stringify({ format: "lifeos", version: 1, data });
  }
}
