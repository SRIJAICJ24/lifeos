import React, { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { View, Text, Platform, Share } from "react-native";
import { Shell } from "../src/ui/Shell";
import {
  Heading,
  Card,
  Button,
  Editor,
  Choices,
  Field,
  Tag,
  Progress,
} from "../src/ui/components";
import { styles as s, colors } from "../src/ui/theme";
import { useLife } from "../src/state/store";
import { analytics, habitStats } from "../src/domain/analytics";
import { dateKey, clock, minutes, duration } from "../src/domain/time";
import { exportBackup, importBackup } from "../src/services/backup";
import { enableNotifications } from "../src/services/nativeIntegrations";
import { TaskRow } from "../src/ui/TaskRow";
const timeKeys = ["wake", "sleep", "lunch", "dinner", "workoutTime"];
export default function Me() {
  const { data, act } = useLife(),
    today = dateKey(),
    a = analytics(data, today);
  const { section } = useLocalSearchParams<{ section?: string }>();
  const [tab, setTab] = useState(
      section === "settings" ? "Settings" : "This week",
    ),
    [edit, setEdit] = useState(""),
    [confirm, setConfirm] = useState(false);
  const settingsFields: Field[] = [
    { key: "wake", label: "Wake time · HH:mm" },
    { key: "sleep", label: "Sleep time · HH:mm" },
    { key: "commute", label: "Commute each way · minutes", type: "number" },
    { key: "lunch", label: "Lunch time · HH:mm" },
    { key: "dinner", label: "Dinner time · HH:mm" },
    { key: "mealDuration", label: "Meal duration · minutes", type: "number" },
    { key: "workoutTime", label: "Preferred workout time · HH:mm" },
    {
      key: "studyPreference",
      label: "Study preference",
      options: ["Morning", "Afternoon", "Evening"],
    },
    { key: "focusDuration", label: "Focus session · minutes", type: "number" },
    { key: "defaultDuration", label: "Default task · minutes", type: "number" },
    {
      key: "buffer",
      label: "Buffer between activities · minutes",
      type: "number",
    },
    {
      key: "intensity",
      label: "Planning intensity",
      options: ["Relaxed", "Balanced", "Focused"],
    },
    { key: "anchorDate", label: "Day Order rotation anchor · YYYY-MM-DD" },
    {
      key: "anchorOrder",
      label: "Day Order on anchor date",
      options: ["1", "2", "3", "4", "5"],
    },
    {
      key: "weekends",
      label: "Non-academic weekdays · 0 Sun / 6 Sat (comma separated)",
    },
    {
      key: "freePeriods",
      label: "Free periods between classes",
      options: ["Off", "Study only", "Light tasks", "Any task"],
    },
    {
      key: "attendanceThreshold",
      label: "Attendance threshold · %",
      type: "number",
    },
    { key: "studentName", label: "Your name" },
    { key: "programme", label: "Programme" },
    { key: "department", label: "Department" },
    { key: "institution", label: "Institution" },
    { key: "semester", label: "Semester", type: "number" },
    { key: "section", label: "Section" },
    { key: "batch", label: "Batch", type: "number" },
    { key: "academicYear", label: "Academic year" },
    {
      key: "notifyClasses",
      label: "Remind me before a class",
      options: ["0", "1"],
    },
    {
      key: "notifyClassLead",
      label: "How many minutes before",
      type: "number",
    },
    {
      key: "notifyDayOrder",
      label: "Tell me the Day Order each morning",
      options: ["0", "1"],
    },
    { key: "notifyExams", label: "Remind me about exams", options: ["0", "1"] },
    { key: "notifyTasks", label: "Remind me before scheduled tasks", options: ["0", "1"] },
    { key: "notifyWeekly", label: "Sunday weekly review notification", options: ["0", "1"] },
    { key: "calories", label: "Daily calorie target", type: "number" },
    { key: "protein", label: "Protein target · g", type: "number" },
    { key: "carbs", label: "Carbs target · g", type: "number" },
    { key: "fat", label: "Fat target · g", type: "number" },
    { key: "water", label: "Water target · glasses", type: "number" },
    { key: "weightGoal", label: "Weight goal · kg", type: "number" },
  ];
  async function exportData() {
    const text = exportBackup(data);
    if (Platform.OS === "web") {
      const blob = new Blob([text], { type: "application/json" }),
        url = URL.createObjectURL(blob),
        anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `lifeos-${today}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } else await Share.share({ message: text, title: "LifeOS backup" });
  }
  return (
    <Shell>
      <Heading
        title="The bigger picture."
        subtitle="Notice what’s working. Adjust what isn’t."
      />
      <Choices
        values={["This week", "Weekly review", "Settings", "Your data"]}
        value={tab}
        onChange={setTab}
      />
      {["This week", "Weekly review"].includes(tab) && (
        <>
          <View style={s.grid}>
            {[
              {
                label: "FOCUSED TIME",
                value: duration(a.actual),
                note: `${duration(a.previous)} in previous 7 days`,
              },
              {
                label: "TASKS COMPLETED",
                value: String(a.completed),
                note: `${a.missed} sessions to rethink`,
              },
              {
                label: "PLANNED VS ACTUAL",
                value: `${a.accuracy}%`,
                note: `${duration(a.planned)} planned · ${duration(a.actual)} actual`,
              },
            ].map((m) => (
              <Card key={m.label} style={{ flex: 1, minWidth: 230 }}>
                <Text style={s.label}>{m.label}</Text>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 38,
                    fontWeight: "500",
                  }}
                >
                  {m.value}
                </Text>
                <Text style={s.muted}>{m.note}</Text>
              </Card>
            ))}
          </View>
          <View style={s.grid}>
            <Card style={s.column}>
              <Text style={s.h2}>Your focus, day by day</Text>
              <View
                style={{
                  height: 170,
                  flexDirection: "row",
                  alignItems: "flex-end",
                  gap: 12,
                }}
              >
                {a.days.map((d) => (
                  <View
                    key={d.date}
                    style={{ flex: 1, alignItems: "center", gap: 9 }}
                  >
                    <Text style={[s.muted, { fontSize: 10 }]}>
                      {d.minutes}m
                    </Text>
                    <View
                      style={{
                        width: "100%",
                        maxWidth: 44,
                        height: Math.max(
                          4,
                          (d.minutes /
                            Math.max(60, ...a.days.map((d) => d.minutes))) *
                            115,
                        ),
                        backgroundColor:
                          d.date === today ? colors.accent : "#586544",
                        borderRadius: 6,
                      }}
                    />
                    <Text style={[s.muted, { fontSize: 10 }]}>
                      {new Date(d.date + "T12:00:00").toLocaleDateString("en", {
                        weekday: "short",
                      })}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
            <Card style={s.column}>
              <Text style={s.h2}>Time across your life</Text>
              {Object.entries(a.byArea).map(([area, n]) => (
                <View key={area} style={{ gap: 8 }}>
                  <View style={[s.row, { justifyContent: "space-between" }]}>
                    <Text style={[s.text, { textTransform: "capitalize" }]}>
                      {area}
                    </Text>
                    <Text style={s.muted}>{duration(n)}</Text>
                  </View>
                  <Progress
                    value={a.actual ? (n / a.actual) * 100 : 0}
                    color={colors[area as keyof typeof colors]}
                  />
                </View>
              ))}
            </Card>
          </View>
          <Card>
            <Text style={s.h2}>Consistency, gently measured</Text>
            {data.habits.map((h) => (
              <View
                key={h.id}
                style={[s.row, { justifyContent: "space-between" }]}
              >
                <Text style={s.text}>{h.title}</Text>
                <Text style={s.muted}>
                  {habitStats(h, data, today).rate}% · last 7 days
                </Text>
              </View>
            ))}
            <Text style={s.muted}>
              {data.workoutLogs.filter((l) => l.date >= a.days[0]!.date).length}{" "}
              workouts recorded this week
            </Text>
            <Text style={s.muted}>
              A missed plan is information. Use it to make the next one kinder.
            </Text>
          </Card>
          {tab === "Weekly review" && (
            <Card>
              <Text style={s.h2}>Next week’s priorities</Text>
              {data.tasks
                .filter(
                  (t) =>
                    t.status !== "Completed" &&
                    t.status !== "Cancelled" &&
                    t.deadline,
                )
                .sort((a, b) => a.deadline!.localeCompare(b.deadline!))
                .slice(0, 6)
                .map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              <Text style={s.muted}>
                {a.actual
                  ? `Your most focused day was ${a.days.slice().sort((a, b) => b.minutes - a.minutes)[0]!.date}.`
                  : "Log a focus session to start discovering your productive patterns."}
              </Text>
            </Card>
          )}
        </>
      )}
      {tab === "Settings" && (
        <>
          <Card>
            <Text style={s.h2}>Your daily rhythm</Text>
            <Text style={s.muted}>
              {clock(data.settings.wake)} wake · {clock(data.settings.sleep)}{" "}
              sleep · {data.settings.intensity.toLowerCase()} planning
            </Text>
            <Choices
              values={["Relaxed", "Balanced", "Focused"]}
              value={data.settings.intensity}
              onChange={(v) =>
                void act((e) => e.repo.settings({ intensity: v as any }))
              }
            />
            <Text style={s.muted}>
              Relaxed 60% · Balanced 75% · Focused 90% of flexible time.
              Generate your plan again after changing intensity.
            </Text>
            <Button
              title="Edit schedule & preferences"
              icon="sliders"
              onPress={() => setEdit("settings")}
            />
          </Card>
          <Card>
            <Text style={s.h2}>Gentle reminders</Text>
            <Text style={s.muted}>
              Review up to three nearby deadlines. Phone permission is optional.
            </Text>
            <Button
              title="Enable deadline reminders"
              kind="secondary"
              onPress={() =>
                void act(async (e) => {
                  await enableNotifications(data);
                  await e.repo.settings({ notifications: 1 });
                }, "Reminders prepared on this phone.")
              }
            />
            <Button
              title="Turn off reminders"
              kind="quiet"
              onPress={() =>
                void act(async (e) => {
                  if (Platform.OS !== "web") {
                    const n = await import("expo-notifications");
                    await n.cancelAllScheduledNotificationsAsync();
                  }
                  await e.repo.settings({ notifications: 0 });
                })
              }
            />
          </Card>
        </>
      )}
      {tab === "Your data" && (
        <>
          <Card>
            <Tag text="LOCAL FIRST" />
            <Text style={s.h2}>Your life stays with you.</Text>
            <Text style={s.muted}>
              Your records are stored in SQLite on this device. Export a backup
              before clearing browser data or reinstalling. Cloud sync is
              optional and not connected.
            </Text>
            <View style={s.wrap}>
              <Button
                title="Export backup"
                icon="download"
                onPress={() => void exportData()}
              />
              <Button
                title="Restore backup"
                kind="secondary"
                onPress={() => setEdit("restore")}
              />
            </View>
          </Card>
          <Card>
            <Text style={s.h2}>Semester setup</Text>
            <Text style={s.muted}>
              Puts the period times, the college slot grid, your registered
              courses and their unit skeletons back the way they were verified.
              It repairs the setup in place; your assignments, marks, attendance
              and notes are untouched.
            </Text>
            <Button
              title="Restore academic setup"
              kind="secondary"
              icon="refresh-cw"
              onPress={() =>
                void act(
                  (e) => e.restoreAcademicSetup(),
                  "Semester setup restored",
                )
              }
            />
          </Card>
          <Card>
            <Text style={s.h2}>Start with a clean slate</Text>
            <Text style={s.muted}>
              This removes every record, including your subjects and timetable.
              Your preferences stay, and you can restore the semester setup
              afterwards. Export first if you want to keep a copy.
            </Text>
            <Button
              title={
                confirm
                  ? "Confirm erase all records"
                  : "Erase records & start fresh"
              }
              kind="danger"
              onPress={() =>
                confirm
                  ? void act(async (e) => {
                      await e.repo.clear();
                      await e.repo.settings({ onboarded: 1, demo: 0 });
                      setConfirm(false);
                    }, "A clean slate. Ready for your life.")
                  : setConfirm(true)
              }
            />
          </Card>
        </>
      )}
      {edit === "settings" && (
        <Editor
          title="Your rhythm & preferences"
          initial={{
            ...data.settings,
            ...Object.fromEntries(
              timeKeys.map((k) => [k, clock((data.settings as any)[k])]),
            ),
          }}
          fields={settingsFields}
          onSave={(v) =>
            act(async (e) => {
              const next: any = { ...data.settings };
              for (const [key, value] of Object.entries(v)) {
                next[key] = timeKeys.includes(key)
                  ? minutes(value)
                  : typeof (data.settings as any)[key] === "number"
                    ? Number(value)
                    : value;
              }
              for (const key of [
                "focusDuration",
                "defaultDuration",
                "calories",
                "protein",
                "carbs",
                "fat",
                "water",
              ])
                if (!Number.isFinite(next[key]) || next[key] <= 0)
                  throw new Error("Targets and durations must be positive.");
              next.onboarded = 1;
              await e.settings(next);
            })
          }
          onClose={() => setEdit("")}
        />
      )}
      {edit === "restore" && (
        <Editor
          title="Restore backup (replaces current records)"
          initial={{ backup: "" }}
          fields={[
            {
              key: "backup",
              label: "Paste the contents of a LifeOS .json backup",
              type: "multiline",
            },
          ]}
          onSave={(v) =>
            act((e) => importBackup(e.repo, v.backup!), "Backup restored.")
          }
          onClose={() => setEdit("")}
        />
      )}
    </Shell>
  );
}
