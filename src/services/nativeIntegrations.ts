import { Platform } from "react-native";
import { Data } from "../domain/types";
import { widgetSnapshot } from "./widget";
import { dateKey, addDays } from "../domain/time";
export async function refreshIntegrations(data: Data) {
  if (Platform.OS === "web") return;
  try {
    const { requireOptionalNativeModule } = await import("expo-modules-core");
    const bridge = requireOptionalNativeModule("LifeOSWidget");
    if (bridge)
      await bridge.updateSnapshot(JSON.stringify(widgetSnapshot(data)));
  } catch {
    /* Custom widgets are unavailable inside Expo Go. */
  }
  if (data.settings.notifications) await syncDigest(data).catch(() => {});
}
export function notificationCandidates(data: Data, date = dateKey()) {
  const tomorrow = addDays(date, 1);
  return data.tasks
    .filter(
      (t) =>
        t.deadline &&
        t.deadline <= tomorrow &&
        !["Completed", "Cancelled", "Skipped"].includes(t.status),
    )
    .sort(
      (a, b) =>
        (a.deadline ?? "").localeCompare(b.deadline ?? "") ||
        b.priority - a.priority,
    )
    .slice(0, 3)
    .map((t) => ({
      id: t.id,
      title: t.title,
      body: `${t.title}: ${Math.ceil(t.estimatedDuration * (1 - t.progress / 100))}m left, due ${t.deadline}`,
    }));
}
async function syncDigest(data: Data) {
  const Notifications = await import("expo-notifications");
  if (!(await Notifications.getPermissionsAsync()).granted) return 0;
  const { openRepository } = await import("../data/database");
  const repo = await openRepository();
  const today = dateKey(),
    id = `lifeos-digest-${today}`,
    candidates = notificationCandidates(data);
  const records = await repo.db.getAllAsync<{
    nativeId: string;
    fireAt: string;
  }>("SELECT * FROM notification_records WHERE id=?", id);
  const old = records[0];
  // Once today's digest has fired, edits never generate another one that day.
  if (old && new Date(old.fireAt).getTime() <= Date.now()) return 0;
  if (old) await Notifications.cancelScheduledNotificationAsync(old.nativeId);
  if (!candidates.length) {
    await repo.db.runAsync("DELETE FROM notification_records WHERE id=?", id);
    return 0;
  }
  const fire = old ? new Date(old.fireAt) : new Date();
  if (!old) {
    fire.setHours(18, 0, 0, 0);
    if (fire.getTime() <= Date.now()) fire.setTime(Date.now() + 15 * 60 * 1000);
  }
  const nativeId = await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: "A little look ahead",
      body: candidates.map((c) => c.body).join("\n"),
      data: { url: "lifeos:///tasks" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fire,
      channelId: "lifeos",
    },
  });
  await repo.db.runAsync(
    "INSERT INTO notification_records VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET nativeId=excluded.nativeId,fireAt=excluded.fireAt",
    id,
    nativeId,
    fire.toISOString(),
  );
  return candidates.length;
}
export async function enableNotifications(data: Data) {
  if (Platform.OS === "web")
    throw new Error("Local reminders are available in the Android or iOS app.");
  const Notifications = await import("expo-notifications");
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("lifeos", {
      name: "LifeOS gentle reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted
    ? current
    : await Notifications.requestPermissionsAsync();
  if (!permission.granted)
    throw new Error(
      "Notifications are off. Your plans still work; enable permission in phone settings if you want reminders.",
    );
  return syncDigest(data);
}
