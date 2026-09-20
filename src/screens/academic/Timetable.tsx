import React, { useState } from "react";
import { Text, View } from "react-native";
import { useLife } from "../../state/store";
import {
  Card,
  Button,
  Segmented,
  Editor,
  Tag,
  Empty,
  ListRow,
} from "../../ui/components";
import { styles as s, colors } from "../../ui/theme";
import { dayOrder } from "../../domain/dayOrder";
import {
  classesOn,
  orderedPeriods,
  registration,
  slotKindColour,
  subjectColour,
  timetableFor,
} from "../../domain/timetable";
import { displayName } from "../../domain/academic";
import { clock, dateKey, minutes, uid } from "../../domain/time";
const views = ["Today", "DO 1", "DO 2", "DO 3", "DO 4", "DO 5", "College grid"];
export function Timetable() {
  const { data, act } = useLife(),
    today = dateKey();
  const order = dayOrder(today, data.calendar, data.settings);
  const [view, setView] = useState(views[0]!);
  const [edit, setEdit] = useState<any>(null);
  const periods = orderedPeriods(data);
  const registered = registration(data);
  const selected = view.startsWith("DO ") ? Number(view.slice(3)) : null;
  const subjectFor = (id: string | null) =>
    data.subjects.find((x) => x.id === id);
  const kindTag = (kind: string) => (
    <Tag text={kind.toUpperCase()} color={slotKindColour(kind as any)} />
  );
  /** Every period of a Day Order, so free periods are as visible as classes. */
  const gridRows = (dayOrderValue: number) => {
    const classes = timetableFor(data, dayOrderValue);
    return periods.map((period) => {
      const cell = data.dayOrderSlots.find(
        (d) => d.dayOrder === dayOrderValue && d.position === period.position,
      );
      const instance = classes.find((c) => c.positions.includes(period.position));
      return { period, cell, instance };
    });
  };
  return (
    <>
      <Segmented values={views} value={view} onChange={setView} />
      {view === "Today" && (
        <Card>
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <Text style={s.h2}>
              {order.order ? `Day Order ${order.order}` : order.type}
            </Text>
            <Tag text={today} color={colors.academic} />
          </View>
          {classesOn(data, today).length ? (
            classesOn(data, today).map((c) => (
              <ListRow
                key={c.key}
                colour={subjectColour(subjectFor(c.subjectId))}
                title={c.title}
                subtitle={`${clock(c.start)} – ${clock(c.end)}${c.room ? ` · ${c.room}` : ""}${c.faculty ? ` · ${c.faculty}` : ""}${c.note ? ` · ${c.note}` : ""}`}
                right={
                  c.status === "Scheduled" ? (
                    kindTag(c.kind)
                  ) : (
                    <Tag text={c.status.toUpperCase()} color={colors.fitness} />
                  )
                }
                onPress={() =>
                  setEdit({
                    kind: "change",
                    row: {
                      id: `change-${today}-${c.positions[0] ?? 0}`,
                      date: today,
                      position: c.positions[0] ?? 0,
                      subjectId: c.subjectId,
                      subject: subjectFor(c.subjectId)?.title ?? "",
                      slotCode: c.slotCode,
                      status: "Cancelled",
                      start: clock(c.start),
                      end: clock(c.end),
                      room: c.room,
                      faculty: c.faculty,
                      note: "",
                    },
                  })
                }
              />
            ))
          ) : (
            <Empty text="No classes resolve for today." />
          )}
          <Button
            title="Add a change or extra class"
            kind="secondary"
            icon="plus"
            onPress={() =>
              setEdit({
                kind: "change",
                row: {
                  id: uid(),
                  date: today,
                  position: 0,
                  subjectId: data.subjects[0]?.id ?? "",
                  subject: data.subjects[0]?.title ?? "",
                  slotCode: "",
                  status: "Extra class",
                  start: "16:00",
                  end: "16:50",
                  room: "",
                  faculty: "",
                  note: "",
                },
              })
            }
          />
        </Card>
      )}
      {selected !== null && (
        <Card>
          <Text style={s.h2}>Day Order {selected}</Text>
          <Text style={s.muted}>
            The college grid for this Day Order, filtered to the slots you are
            registered for. Everything else is a free period.
          </Text>
          {gridRows(selected).map(({ period, cell, instance }) => {
            const first = instance?.positions[0] === period.position;
            return (
              <View
                key={period.position}
                style={[s.row, { justifyContent: "space-between", gap: 10 }]}
              >
                <View
                  style={{
                    width: 3,
                    alignSelf: "stretch",
                    minHeight: 28,
                    borderRadius: 2,
                    backgroundColor: instance
                      ? subjectColour(subjectFor(instance.subjectId))
                      : colors.border,
                  }}
                />
                <Text style={[s.muted, { width: 92, fontSize: 12 }]}>
                  {clock(period.start)}–{clock(period.end)}
                </Text>
                <View style={s.grow}>
                  {instance ? (
                    <>
                      <Text style={s.text}>
                        {first ? instance.title : "…continues"}
                      </Text>
                      <Text style={[s.muted, { fontSize: 11 }]}>
                        Slot {cell?.slotCode} · {instance.kind}
                        {instance.room ? ` · ${instance.room}` : ""}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={[s.muted, { fontStyle: "italic" }]}>Free</Text>
                      <Text style={[s.muted, { fontSize: 11 }]}>
                        {cell?.slotCode
                          ? `Slot ${cell.slotCode} · not registered`
                          : "No slot assigned"}
                      </Text>
                    </>
                  )}
                </View>
                {cell && !cell.verified ? (
                  <Tag text="CHECK" color={colors.fitness} />
                ) : null}
              </View>
            );
          })}
        </Card>
      )}
      {view === "College grid" && (
        <>
          <Card>
            <Text style={s.h2}>The college slot grid</Text>
            <Text style={s.muted}>
              This is the college-wide timetable, not yours. A cell becomes your
              class only when its slot code is one you are registered for. Cells
              marked CHECK were inferred and are worth confirming against the
              official timetable.
            </Text>
          </Card>
          {[1, 2, 3, 4, 5].map((o) => (
            <Card key={o}>
              <Text style={s.h2}>Day Order {o}</Text>
              {periods.map((period) => {
                const cell = data.dayOrderSlots.find(
                  (d) => d.dayOrder === o && d.position === period.position,
                );
                const slot = cell?.slotCode
                  ? registered.get(cell.slotCode)
                  : undefined;
                return (
                  <ListRow
                    key={period.position}
                    title={cell?.slotCode || "— unassigned —"}
                    subtitle={`Period ${period.position} · ${clock(period.start)}–${clock(period.end)}${
                      slot
                        ? ` · ${displayName(subjectFor(slot.subjectId))}`
                        : " · free for you"
                    }`}
                    right={
                      cell && !cell.verified ? (
                        <Tag text="CHECK" color={colors.fitness} />
                      ) : undefined
                    }
                    onPress={() =>
                      setEdit({
                        kind: "cell",
                        row: {
                          id: cell?.id ?? `grid-${o}-${period.position}`,
                          dayOrder: o,
                          position: period.position,
                          slotCode: cell?.slotCode ?? "",
                          verified: cell?.verified ?? 1,
                        },
                      })
                    }
                  />
                );
              })}
            </Card>
          ))}
          <Card>
            <Text style={s.h2}>Period times</Text>
            {periods.map((p) => (
              <ListRow
                key={p.id}
                title={`Period ${p.position}`}
                subtitle={`${clock(p.start)} – ${clock(p.end)}`}
                onPress={() =>
                  setEdit({
                    kind: "period",
                    row: { ...p, start: clock(p.start), end: clock(p.end) },
                  })
                }
              />
            ))}
          </Card>
        </>
      )}
      {edit && (
        <Editor
          key={edit.kind}
          title={
            edit.kind === "cell"
              ? "College slot for this period"
              : edit.kind === "period"
                ? "Period time"
                : "Class change"
          }
          initial={edit.row}
          fields={
            edit.kind === "cell"
              ? [
                  {
                    key: "slotCode",
                    label: "Slot code (blank means no class in this period)",
                    placeholder: "A, B, P1, L11…",
                  },
                ]
              : edit.kind === "period"
                ? [
                    { key: "start", label: "Start · HH:mm" },
                    { key: "end", label: "End · HH:mm" },
                  ]
                : [
                    { key: "date", label: "Date · YYYY-MM-DD" },
                    {
                      key: "status",
                      label: "What changed",
                      options: [
                        "Cancelled",
                        "Room changed",
                        "Time changed",
                        "Faculty changed",
                        "Extra class",
                        "Replacement",
                      ],
                    },
                    {
                      key: "subject",
                      label: "Subject",
                      options: data.subjects.map((x) => x.title),
                    },
                    { key: "start", label: "Start · HH:mm" },
                    { key: "end", label: "End · HH:mm" },
                    { key: "room", label: "Room" },
                    { key: "faculty", label: "Faculty" },
                    { key: "note", label: "Note" },
                  ]
          }
          onSave={(v) =>
            act(async (e) => {
              if (edit.kind === "cell")
                await e.save("dayOrderSlots", {
                  ...edit.row,
                  slotCode: (v.slotCode ?? "").trim().toUpperCase(),
                  verified: 1,
                });
              else if (edit.kind === "period")
                await e.save("periods", {
                  ...edit.row,
                  start: minutes(v.start!),
                  end: minutes(v.end!),
                  label: `${v.start}–${v.end}`,
                });
              else {
                const subject = data.subjects.find((x) => x.title === v.subject);
                const timed = ["Time changed", "Extra class", "Replacement"].includes(
                  v.status!,
                );
                await e.saveClassChange({
                  id: edit.row.id,
                  date: v.date,
                  position: edit.row.position,
                  subjectId: subject?.id ?? null,
                  slotCode: edit.row.slotCode ?? "",
                  status: v.status,
                  start: timed ? minutes(v.start!) : 0,
                  end: timed ? minutes(v.end!) : 0,
                  room: v.room ?? "",
                  faculty: v.faculty ?? "",
                  note: v.note ?? "",
                });
              }
            }, "Timetable updated")
          }
          onDelete={
            edit.kind === "change"
              ? () => act((e) => e.repo.remove("classChanges", edit.row.id))
              : undefined
          }
          onClose={() => setEdit(null)}
        />
      )}
    </>
  );
}
