import React, { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useLife } from "../state/store";
import {
  Card,
  Button,
  Choices,
  Editor,
  Tag,
  Empty,
  Progress,
} from "../ui/components";
import { styles as s, colors } from "../ui/theme";
import { dayOrder } from "../domain/dayOrder";
import { dateKey, uid, clock, minutes } from "../domain/time";
import { TaskRow } from "../ui/TaskRow";
export function Academic() {
  const { data, act } = useLife(),
    router = useRouter(),
    today = dateKey();
  const order = dayOrder(today, data.calendar, data.settings);
  const [tab, setTab] = useState("Overview"),
    [day, setDay] = useState(String(order.order ?? 1)),
    [edit, setEdit] = useState<{ kind: string; row: any } | null>(null);
  return (
    <>
      <Choices
        values={["Overview", "Timetable", "Academic dates"]}
        value={tab}
        onChange={setTab}
      />
      {tab === "Overview" && (
        <>
          <Card>
            <Tag
              text={
                order.order
                  ? `TODAY · DAY ORDER ${order.order}`
                  : order.type.toUpperCase()
              }
              color={colors.academic}
            />
            <Text style={s.muted}>{order.note}</Text>
            <View style={s.wrap}>
              <Button
                title="Set date / holiday"
                kind="secondary"
                onPress={() => {
                  setTab("Academic dates");
                  setEdit({
                    kind: "calendar",
                    row: {
                      date: today,
                      type: "Academic Day",
                      dayOrder: order.order ?? 1,
                      note: "",
                    },
                  });
                }}
              />
              <Button
                title="Add subject"
                icon="plus"
                kind="secondary"
                onPress={() =>
                  setEdit({
                    kind: "subject",
                    row: {
                      id: uid(),
                      title: "",
                      code: "",
                      attended: 0,
                      total: 0,
                      marks: "",
                      notes: "",
                    },
                  })
                }
              />
            </View>
          </Card>
          <View style={s.grid}>
            {data.subjects.map((subject) => {
              const topics = data.topics.filter(
                (t) => t.ownerId === subject.id,
              );
              const done = topics.filter((t) => t.done).length;
              return (
                <Card key={subject.id} style={{ flexBasis: 280, flexGrow: 1 }}>
                  <Tag text={subject.code} color={colors.academic} />
                  <Text style={s.h2}>{subject.title}</Text>
                  <Text style={s.muted}>
                    {topics.length
                      ? Math.round((done / topics.length) * 100)
                      : 0}
                    % syllabus ·{" "}
                    {subject.total
                      ? Math.round((subject.attended / subject.total) * 100) +
                        "% attendance"
                      : "Attendance not logged"}
                  </Text>
                  <Progress
                    value={topics.length ? (done / topics.length) * 100 : 0}
                    color={colors.academic}
                  />
                  <Button
                    title={`Open ${subject.code || subject.title}`}
                    kind="quiet"
                    icon="arrow-right"
                    onPress={() =>
                      router.push({
                        pathname: "/subject/[id]",
                        params: { id: subject.id },
                      })
                    }
                  />
                </Card>
              );
            })}
          </View>
          <Card>
            <Text style={s.h2}>Assignments, exams & study</Text>
            {data.tasks
              .filter((t) => t.lifeArea === "academic")
              .map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            <Button
              title="Add academic task"
              kind="secondary"
              onPress={() => router.push("/capture")}
            />
          </Card>
        </>
      )}
      {tab === "Timetable" && (
        <>
          <Choices
            values={["1", "2", "3", "4", "5"]}
            value={day}
            onChange={setDay}
          />
          <Card>
            <Text style={s.h2}>Day Order {day}</Text>
            {data.classes
              .filter((c) => c.dayOrder === Number(day))
              .sort((a, b) => a.start - b.start)
              .map((c) => (
                <View
                  key={c.id}
                  style={[s.row, { justifyContent: "space-between" }]}
                >
                  <View style={s.grow}>
                    <Text style={s.text}>
                      {data.subjects.find((x) => x.id === c.subjectId)?.title}
                    </Text>
                    <Text style={s.muted}>
                      {clock(c.start)} – {clock(c.end)} · {c.room}
                    </Text>
                  </View>
                  <Button
                    title="Edit class"
                    kind="quiet"
                    onPress={() =>
                      setEdit({
                        kind: "class",
                        row: {
                          ...c,
                          start: clock(c.start),
                          end: clock(c.end),
                          subject: data.subjects.find(
                            (s) => s.id === c.subjectId,
                          )?.title,
                        },
                      })
                    }
                  />
                </View>
              ))}
            <Button
              title="Add class"
              kind="secondary"
              icon="plus"
              onPress={() =>
                setEdit({
                  kind: "class",
                  row: {
                    id: uid(),
                    dayOrder: Number(day),
                    subject: data.subjects[0]?.title ?? "",
                    start: "07:40",
                    end: "08:30",
                    room: "",
                  },
                })
              }
            />
          </Card>
        </>
      )}
      {tab === "Academic dates" && (
        <Card>
          <Text style={s.h2}>Exceptions to your rhythm</Text>
          <Text style={s.muted}>
            Holidays, exams and non-academic days pause the rotation. A manual
            override sets the rotation from that day onward.
          </Text>
          <Button
            title="Add date override"
            icon="plus"
            onPress={() =>
              setEdit({
                kind: "calendar",
                row: { date: today, type: "Holiday", dayOrder: "", note: "" },
              })
            }
          />
          {data.calendar
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((c) => (
              <View
                key={c.date}
                style={[s.row, { justifyContent: "space-between" }]}
              >
                <View>
                  <Text style={s.text}>
                    {c.date} · {c.type}
                  </Text>
                  <Text style={s.muted}>
                    {c.dayOrder ? `DO ${c.dayOrder} · ` : ""}
                    {c.note}
                  </Text>
                </View>
                <Button
                  title="Edit date"
                  kind="quiet"
                  onPress={() => setEdit({ kind: "calendar", row: c })}
                />
              </View>
            ))}
          {!data.calendar.length && (
            <Empty text="No exceptions yet. Regular academic days follow your configured rotation." />
          )}
        </Card>
      )}
      {edit && (
        <Editor
          key={edit.kind}
          title={
            edit.kind === "class"
              ? "Timetable class"
              : edit.kind === "calendar"
                ? "Academic date"
                : "Subject"
          }
          initial={edit.row}
          fields={
            edit.kind === "class"
              ? [
                  {
                    key: "subject",
                    label: "Subject",
                    options: data.subjects.map((s) => s.title),
                  },
                  { key: "start", label: "Start · HH:mm" },
                  { key: "end", label: "End · HH:mm" },
                  { key: "room", label: "Room" },
                ]
              : edit.kind === "calendar"
                ? [
                    { key: "date", label: "Date · YYYY-MM-DD" },
                    {
                      key: "type",
                      label: "Day type",
                      options: [
                        "Academic Day",
                        "Holiday",
                        "Exam Day",
                        "Special Timetable",
                        "Non-Academic Day",
                        "Manual Override",
                      ],
                    },
                    {
                      key: "dayOrder",
                      label: "Day Order (for academic / special / override)",
                      options: ["", "1", "2", "3", "4", "5"],
                    },
                    { key: "note", label: "Note" },
                  ]
                : [
                    { key: "title", label: "Subject name" },
                    { key: "code", label: "Short code" },
                  ]
          }
          onSave={(v) =>
            act(async (e) => {
              if (edit.kind === "calendar") {
                const academic = [
                  "Academic Day",
                  "Special Timetable",
                  "Manual Override",
                ].includes(v.type!);
                if (
                  ["Special Timetable", "Manual Override"].includes(v.type!) &&
                  !v.dayOrder
                )
                  throw new Error("Select a Day Order for this date.");
                await e.repo.db.withTransactionAsync(async () => {
                  if (edit.row.date !== v.date)
                    await e.repo.remove("calendar", edit.row.date);
                  await e.save("calendar", {
                    date: v.date,
                    type: v.type,
                    dayOrder:
                      academic && v.dayOrder ? Number(v.dayOrder) : null,
                    note: v.note,
                  });
                });
              } else if (edit.kind === "class") {
                const subject = data.subjects.find(
                  (s) => s.title === v.subject,
                );
                if (!subject) throw new Error("Add a subject first.");
                const start = minutes(v.start!),
                  end = minutes(v.end!);
                if (
                  data.classes.some(
                    (c) =>
                      c.id !== edit.row.id &&
                      c.dayOrder === Number(day) &&
                      c.start < end &&
                      c.end > start,
                  )
                )
                  throw new Error(
                    "This class overlaps another class in the Day Order.",
                  );
                await e.save("classes", {
                  id: edit.row.id,
                  dayOrder: Number(day),
                  subjectId: subject.id,
                  start,
                  end,
                  room: v.room,
                });
              } else await e.save("subjects", { ...edit.row, ...v });
            })
          }
          onDelete={() =>
            act((e) =>
              e.repo.remove(
                edit.kind === "calendar"
                  ? "calendar"
                  : edit.kind === "class"
                    ? "classes"
                    : "subjects",
                edit.row.date ?? edit.row.id,
              ),
            )
          }
          onClose={() => setEdit(null)}
        />
      )}
    </>
  );
}
