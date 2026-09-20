import React, { useState } from "react";
import { Text, View, Pressable } from "react-native";
import { useLife } from "../../state/store";
import {
  Card,
  Button,
  Editor,
  Empty,
  Segmented,
  ListRow,
} from "../../ui/components";
import { styles as s, colors } from "../../ui/theme";
import { dayOrder } from "../../domain/dayOrder";
import { activeClasses } from "../../domain/timetable";
import { displayName } from "../../domain/academic";
import { dayTypes } from "../../domain/types";
import {
  addDays,
  addMonths,
  clock,
  dateKey,
  parseDate,
} from "../../domain/time";
const weekdays = ["S", "M", "T", "W", "T", "F", "S"];
export function AcademicCalendar() {
  const { data, act } = useLife(),
    today = dateKey();
  const [month, setMonth] = useState(today.slice(0, 7) + "-01");
  const [selected, setSelected] = useState(today);
  const [edit, setEdit] = useState<any>(null);
  const [view, setView] = useState("Month");
  const first = parseDate(month);
  const startPad = first.getDay();
  const lastDay = new Date(
    first.getFullYear(),
    first.getMonth() + 1,
    0,
  ).getDate();
  const days = Array.from({ length: lastDay }, (_, i) => addDays(month, i));
  const order = dayOrder(selected, data.calendar, data.settings);
  const classes = activeClasses(data, selected);
  const marker = (date: string) => ({
    exam: data.assessments.some((a) => a.date === date),
    due: data.assignments.some((a) => a.dueDate === date),
    entry: data.calendar.find((c) => c.date === date),
  });
  return (
    <>
      <Segmented
        values={["Month", "Academic dates"]}
        value={view}
        onChange={setView}
      />
      {view === "Month" && (
        <>
          <Card>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Button
                title="←"
                kind="secondary"
                onPress={() => setMonth(addMonths(month, -1))}
              />
              <Text style={s.h2}>
                {first.toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              </Text>
              <Button
                title="→"
                kind="secondary"
                onPress={() => setMonth(addMonths(month, 1))}
              />
            </View>
            <View style={{ flexDirection: "row" }}>
              {weekdays.map((d, i) => (
                <Text
                  key={i}
                  style={[
                    s.muted,
                    { flex: 1, textAlign: "center", fontSize: 11 },
                  ]}
                >
                  {d}
                </Text>
              ))}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {Array.from({ length: startPad }, (_, i) => (
                <View key={`pad-${i}`} style={{ width: `${100 / 7}%`, height: 54 }} />
              ))}
              {days.map((date) => {
                const o = dayOrder(date, data.calendar, data.settings);
                const m = marker(date);
                const isToday = date === today;
                const isSelected = date === selected;
                return (
                  <Pressable
                    key={date}
                    accessibilityRole="button"
                    accessibilityLabel={`${date}${o.order ? `, Day Order ${o.order}` : `, ${o.type}`}`}
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => setSelected(date)}
                    style={{
                      width: `${100 / 7}%`,
                      height: 54,
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 2,
                    }}
                  >
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 10,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isSelected
                          ? colors.accent
                          : isToday
                            ? colors.raised
                            : "transparent",
                      }}
                    >
                      <Text
                        style={{
                          color: isSelected
                            ? colors.bg
                            : o.order
                              ? colors.text
                              : colors.muted,
                          fontSize: 13,
                          fontWeight: isToday ? "700" : "400",
                        }}
                      >
                        {Number(date.slice(8))}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 9,
                        color: o.order ? colors.academic : colors.muted,
                        fontWeight: "700",
                      }}
                    >
                      {o.order ? `DO${o.order}` : m.entry ? "•" : ""}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 2, height: 4 }}>
                      {m.exam ? (
                        <View style={dot(colors.fitness)} />
                      ) : null}
                      {m.due ? <View style={dot(colors.accent)} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Card>
          <Card>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <View style={s.grow}>
                <Text style={s.h2}>{selected}</Text>
                <Text style={s.muted}>
                  {order.order ? `Day Order ${order.order}` : order.type}
                  {order.entry?.eventTitle ? ` · ${order.entry.eventTitle}` : ""}
                </Text>
              </View>
              <Button
                title="Set day"
                kind="secondary"
                onPress={() =>
                  setEdit(
                    order.entry ?? {
                      date: selected,
                      type: "Holiday",
                      dayOrder: "",
                      note: "",
                      eventTitle: "",
                    },
                  )
                }
              />
            </View>
            {classes.map((c) => (
              <ListRow
                key={c.key}
                title={c.title}
                subtitle={`${clock(c.start)} – ${clock(c.end)}${c.room ? ` · ${c.room}` : ""}`}
              />
            ))}
            {data.assessments
              .filter((a) => a.date === selected)
              .map((a) => (
                <ListRow
                  key={a.id}
                  colour={colors.fitness}
                  title={`${a.title} · ${a.assessmentType}`}
                  subtitle={`${displayName(data.subjects.find((x) => x.id === a.subjectId))} · ${clock(a.startTime)}`}
                />
              ))}
            {data.assignments
              .filter((a) => a.dueDate === selected)
              .map((a) => (
                <ListRow
                  key={a.id}
                  colour={colors.accent}
                  title={`${a.title} due`}
                  subtitle={`${displayName(data.subjects.find((x) => x.id === a.subjectId))} · ${a.dueTime}`}
                />
              ))}
            {!classes.length && <Text style={s.muted}>No classes on this date.</Text>}
          </Card>
        </>
      )}
      {view === "Academic dates" && (
        <Card>
          <Text style={s.h2}>Exceptions to the rotation</Text>
          <Text style={s.muted}>
            Holidays and non-working days pause the Day Order rotation rather than
            consuming one. A manual override sets the order for that date and the
            rotation carries on from it. No planner dates were assumed — add yours
            here.
          </Text>
          <Button
            title="Add academic date"
            icon="plus"
            onPress={() =>
              setEdit({
                date: selected,
                type: "Holiday",
                dayOrder: "",
                note: "",
                eventTitle: "",
              })
            }
          />
          {data.calendar
            .slice()
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((c) => (
              <ListRow
                key={c.date}
                colour={c.working ? colors.academic : colors.muted}
                title={`${c.date} · ${c.type}`}
                subtitle={`${c.dayOrder ? `Day Order ${c.dayOrder} · ` : ""}${c.eventTitle || c.note || (c.working ? "Working day" : "No classes")}`}
                onPress={() => setEdit(c)}
              />
            ))}
          {!data.calendar.length && (
            <Empty text="No exceptions recorded. Every weekday follows the rotation." />
          )}
        </Card>
      )}
      {edit && (
        <Editor
          title="Academic date"
          initial={{ ...edit, dayOrder: edit.dayOrder ?? "" }}
          fields={[
            { key: "date", label: "Date · YYYY-MM-DD" },
            { key: "type", label: "Day type", options: [...dayTypes] },
            {
              key: "dayOrder",
              label: "Day Order (working days only)",
              options: ["", "1", "2", "3", "4", "5"],
            },
            { key: "eventTitle", label: "Event title" },
            { key: "note", label: "Note" },
          ]}
          onSave={(v) =>
            act(async (e) => {
              if (edit.date && edit.date !== v.date)
                await e.repo.remove("calendar", edit.date);
              await e.setDayOrder(
                v.date!,
                v.dayOrder ? Number(v.dayOrder) : null,
                v.type!,
                v.note ?? "",
              );
              const saved = (await e.repo.read()).calendar.find(
                (c) => c.date === v.date,
              );
              if (saved)
                await e.save("calendar", { ...saved, eventTitle: v.eventTitle ?? "" });
            }, "Academic date saved")
          }
          onDelete={
            edit.date
              ? () => act((e) => e.repo.remove("calendar", edit.date))
              : undefined
          }
          onClose={() => setEdit(null)}
        />
      )}
    </>
  );
}
const dot = (color: string) => ({
  width: 4,
  height: 4,
  borderRadius: 2,
  backgroundColor: color,
});
