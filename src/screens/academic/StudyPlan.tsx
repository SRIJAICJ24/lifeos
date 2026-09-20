import React, { useState } from "react";
import { Text, View } from "react-native";
import { useLife } from "../../state/store";
import {
  Card,
  Button,
  Editor,
  Tag,
  Empty,
  Stat,
  Segmented,
  ListRow,
} from "../../ui/components";
import { styles as s, colors } from "../../ui/theme";
import { subjectColour } from "../../domain/timetable";
import { displayName } from "../../domain/academic";
import { studySuggestions, StudySuggestion } from "../../domain/study";
import { availability } from "../../domain/freeTime";
import { sessionTypes } from "../../domain/types";
import { clock, dateKey, duration } from "../../domain/time";
export function StudyPlan() {
  const { data, act, minute } = useLife(),
    today = dateKey();
  const [view, setView] = useState("What should I study?");
  const [window, setWindow] = useState("");
  const [log, setLog] = useState<StudySuggestion | null>(null);
  const free = availability(data, today, minute);
  const openWindow = free[0];
  const available = window
    ? Number(window)
    : openWindow
      ? openWindow.end - openWindow.start
      : 60;
  const suggestions = studySuggestions(data, today, available);
  const best = suggestions[0];
  const subject = (id: string) => data.subjects.find((x) => x.id === id);
  const planned = data.studySessions
    .filter((x) => x.status !== "Done")
    .sort((a, b) => a.date.localeCompare(b.date));
  const doneToday = data.studySessions.filter(
    (x) => x.date === today && x.actualDuration > 0,
  );
  const row = (x: StudySuggestion) => (
    <ListRow
      key={x.id}
      colour={subjectColour(subject(x.subjectId))}
      title={x.title}
      subtitle={`${x.detail} · ${x.reason}`}
      right={<Text style={s.muted}>{duration(x.minutes)}</Text>}
      onPress={() => setLog(x)}
    />
  );
  return (
    <>
      <Segmented
        values={["What should I study?", "Planned", "Logged"]}
        value={view}
        onChange={setView}
      />
      {view === "What should I study?" && (
        <>
          <Card>
            <Text style={s.h2}>Time available</Text>
            <Text style={s.muted}>
              {openWindow
                ? `Your next free window is ${clock(openWindow.start)}–${clock(openWindow.end)} — ${duration(openWindow.end - openWindow.start)}.`
                : "No free window left today; suggestions assume an hour."}
            </Text>
            <Segmented
              values={["Use my window", "20", "30", "45", "60", "90"]}
              value={window || "Use my window"}
              onChange={(v) => setWindow(v === "Use my window" ? "" : v)}
            />
          </Card>
          {best ? (
            <Card style={{ borderColor: colors.accent + "55" }}>
              <Tag text="BEST OPTION" color={colors.accent} />
              <Text style={[s.h2, { fontSize: 25 }]}>{best.title}</Text>
              <Text style={s.muted}>{best.detail}</Text>
              <View style={s.wrap}>
                <Stat
                  label="Why"
                  value={best.kind}
                  hint={best.reason}
                  color={subjectColour(subject(best.subjectId))}
                />
                <Stat
                  label="Recommended"
                  value={duration(best.minutes)}
                  color={colors.accent}
                />
              </View>
              <Button title="Log this session" onPress={() => setLog(best)} />
            </Card>
          ) : (
            <Card>
              <Empty text="Nothing to suggest yet. Add syllabus topics, an assignment or a test and this fills in." />
            </Card>
          )}
          {suggestions.length > 1 && (
            <Card>
              <Text style={s.h2}>Other good options</Text>
              {suggestions.slice(1, 8).map(row)}
            </Card>
          )}
        </>
      )}
      {view === "Planned" && (
        <Card>
          <Text style={s.h2}>Planned study</Text>
          <Text style={s.muted}>
            Sessions created from exam planning. Each one is a real task, so the
            scheduler places it in your free time.
          </Text>
          {planned.length ? (
            planned.map((x) => {
              const topic = data.syllabusTopics.find((t) => t.id === x.topicId);
              return (
                <ListRow
                  key={x.id}
                  colour={subjectColour(subject(x.subjectId))}
                  title={topic?.title ?? displayName(subject(x.subjectId))}
                  subtitle={`${x.sessionType} · planned ${duration(x.plannedDuration)} · by ${x.date}`}
                  right={<Text style={s.muted}>{x.status}</Text>}
                />
              );
            })
          ) : (
            <Empty text="Nothing planned. Open a test and choose Plan revision." />
          )}
        </Card>
      )}
      {view === "Logged" && (
        <Card>
          <Text style={s.h2}>Study logged today</Text>
          <View style={s.wrap}>
            <Stat
              label="Today"
              value={duration(
                doneToday.reduce((n, x) => n + x.actualDuration, 0),
              )}
              color={colors.accent}
            />
            <Stat label="Sessions" value={String(doneToday.length)} />
          </View>
          {data.studySessions
            .filter((x) => x.actualDuration > 0)
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 25)
            .map((x) => {
              const topic = data.syllabusTopics.find((t) => t.id === x.topicId);
              return (
                <ListRow
                  key={x.id}
                  colour={subjectColour(subject(x.subjectId))}
                  title={topic?.title ?? displayName(subject(x.subjectId))}
                  subtitle={`${x.date} · ${x.sessionType}${x.notes ? ` · ${x.notes}` : ""}`}
                  right={<Text style={s.muted}>{duration(x.actualDuration)}</Text>}
                />
              );
            })}
          {!data.studySessions.some((x) => x.actualDuration > 0) && (
            <Empty text="No study logged yet." />
          )}
        </Card>
      )}
      {log && (
        <Editor
          title={`Log study · ${log.title}`}
          initial={{
            minutes: log.minutes,
            sessionType:
              log.kind === "Assignment"
                ? "Assignment"
                : log.kind === "Revision"
                  ? "Revision"
                  : log.kind === "Practice"
                    ? "Practice"
                    : "Learn",
            notes: "",
            date: today,
          }}
          fields={[
            { key: "minutes", label: "Minutes studied", type: "number" },
            { key: "sessionType", label: "Kind", options: [...sessionTypes] },
            { key: "date", label: "Date · YYYY-MM-DD" },
            { key: "notes", label: "Notes", type: "multiline" },
          ]}
          onSave={(v) =>
            act(
              (e) =>
                e.logStudy({
                  subjectId: log.subjectId,
                  topicId: log.topicId ?? null,
                  minutes: Number(v.minutes),
                  sessionType: v.sessionType!,
                  notes: v.notes,
                  date: v.date,
                }),
              "Study logged",
            )
          }
          onClose={() => setLog(null)}
        />
      )}
    </>
  );
}
