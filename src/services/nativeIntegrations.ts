import { Platform } from "react-native";
import { Data } from "../domain/types";
import { widgetSnapshot } from "./widget";
import { activeClasses } from "../domain/timetable";
import { dayOrder } from "../domain/dayOrder";
import {
  assessmentPreparation,
  displayName,
} from "../domain/academic";
import { clock, dateKey, addDays, daysBetween, duration } from "../domain/time";
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
  if (data.settings.notifications) await syncNotifications(data).catch(() => {});
}
export interface Planned {
  id: string;
  fire: Date;
  title: string;
  body: string;
  url: string;
}
const at = (date: string, minute: number) => {
  const d = new Date(`${date}T00:00:00`);
  d.setMinutes(minute);
  return d;
};
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
/**
 * Everything worth a nudge today, each with a stable id so re-planning replaces a reminder
 * rather than stacking another one beside it.
 */
export function plannedNotifications(
  data: Data,
  now = new Date(),
  date = dateKey(now),
): Planned[] {
  const out: Planned[] = [];
  const s = data.settings;
  const order = dayOrder(date, data.calendar, s);
  const classes = activeClasses(data, date);
  if (s.notifyDayOrder && order.order) {
    const first = classes[0];
    out.push({
      id: `dayorder-${date}`,
      fire: at(date, Math.max(300, s.wake)),
      title: `Today follows Day Order ${order.order}`,
      body: first
        ? `First class: ${first.title} at ${clock(first.start)}${first.room ? ` · ${first.room}` : ""}`
        : "No classes resolve for today.",
      url: "lifeos:///area/academic",
    });
  }
  if (s.notifyClasses)
    for (const c of classes) {
      const fire = at(date, c.start - s.notifyClassLead);
      if (fire.getTime() <= now.getTime()) continue;
      out.push({
        id: `class-${date}-${c.positions[0] ?? 0}`,
        fire,
        title: `${c.title} starts in ${s.notifyClassLead} minutes`,
        body: `${clock(c.start)} – ${clock(c.end)}${c.room ? ` · ${c.room}` : ""}`,
        url: "lifeos:///area/academic",
      });
    }
  const digest = notificationCandidates(data, date);
  if (digest.length)
    out.push({
      id: `digest-${date}`,
      fire: at(date, 1080),
      title: "A little look ahead",
      body: digest.map((c) => c.body).join("\n"),
      url: "lifeos:///tasks",
    });
  if (s.notifyExams)
    for (const exam of data.assessments
      .filter(
        (a) => a.date >= date && daysBetween(date, a.date) <= 3,
      )
      .slice(0, 3)) {
      const prep = assessmentPreparation(data, exam);
      const days = daysBetween(date, exam.date);
      out.push({
        id: `exam-${exam.id}-${date}`,
        fire: at(date, 1245),
        title: `${exam.title} ${days === 0 ? "is today" : days === 1 ? "is tomorrow" : `in ${days} days`}`,
        body: prep.topics.length
          ? `${prep.remaining.length} topic${prep.remaining.length === 1 ? "" : "s"} left · about ${duration(prep.minutesRemaining)} of study`
          : `${displayName(data.subjects.find((x) => x.id === exam.subjectId))} · ${clock(exam.startTime)}${exam.room ? ` · ${exam.room}` : ""}`,
        url: "lifeos:///academic/assessments",
      });
    }
  return out.filter((p) => p.fire.getTime() > now.getTime() + 1000);
}
async function syncNotifications(data: Data) {
  const Notifications = await import("expo-notifications");
  if (!(await Notifications.getPermissionsAsync()).granted) return 0;
  const { openRepository } = await import("../data/database");
  const repo = await openRepository();
  const records = await repo.db.getAllAsync<{
    id: string;
    nativeId: string;
    fireAt: string;
  }>("SELECT * FROM notification_records");
  const desired = plannedNotifications(data);
  const wanted = new Map(desired.map((d) => [d.id, d]));
  for (const record of records) {
    const fired = new Date(record.fireAt).getTime() <= Date.now();
    const keep = wanted.get(record.id);
    // Once a reminder has fired, editing data never conjures a second one that day.
    if (fired) {
      if (!keep) continue;
      wanted.delete(record.id);
      continue;
    }
    if (keep && new Date(record.fireAt).getTime() === keep.fire.getTime()) {
      wanted.delete(record.id);
      continue;
    }
    await Notifications.cancelScheduledNotificationAsync(record.nativeId);
    await repo.db.runAsync(
      "DELETE FROM notification_records WHERE id=?",
      record.id,
    );
  }
  for (const plan of wanted.values()) {
    const nativeId = await Notifications.scheduleNotificationAsync({
      identifier: plan.id,
      content: {
        title: plan.title,
        body: plan.body,
        data: { url: plan.url },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: plan.fire,
        channelId: "lifeos",
      },
    });
    await repo.db.runAsync(
      "INSERT INTO notification_records VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET nativeId=excluded.nativeId,fireAt=excluded.fireAt",
      plan.id,
      nativeId,
      plan.fire.toISOString(),
    );
  }
  return desired.length;
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
  return syncNotifications(data);
}
