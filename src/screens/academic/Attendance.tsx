import React, { useState } from "react";
import { Text, View } from "react-native";
import { useLife } from "../../state/store";
import {
  Card,
  Button,
  Tag,
  Empty,
  Progress,
  Stat,
  Segmented,
  Editor,
} from "../../ui/components";
import { styles as s, colors } from "../../ui/theme";
import { subjectColour } from "../../domain/timetable";
import {
  attendanceQueue,
  displayName,
  subjectAttendance,
} from "../../domain/academic";
import { dayOrder } from "../../domain/dayOrder";
import { addDays, clock, dateKey } from "../../domain/time";
const states = ["Present", "Absent", "OD", "Cancelled"] as const;
export function Attendance() {
  const { data, act } = useLife();
  const [date, setDate] = useState(dateKey());
  const [view, setView] = useState("Mark today");
  const [settings, setSettings] = useState(false);
  const order = dayOrder(date, data.calendar, data.settings);
  const queue = attendanceQueue(data, date);
  const threshold = data.settings.attendanceThreshold;
  return (
    <>
      <Segmented
        values={["Mark today", "By subject", "Forecast"]}
        value={view}
        onChange={setView}
      />
      {view === "Mark today" && (
        <>
          <Card>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <View style={s.grow}>
                <Text style={s.h2}>{date}</Text>
                <Text style={s.muted}>
                  {order.order ? `Day Order ${order.order}` : order.type}
                </Text>
              </View>
              <Tag text={`${threshold}% TARGET`} color={colors.academic} />
            </View>
            <View style={s.wrap}>
              <Button
                title="← Previous day"
                kind="secondary"
                onPress={() => setDate(addDays(date, -1))}
              />
              <Button
                title="Today"
                kind="quiet"
                onPress={() => setDate(dateKey())}
              />
              <Button
                title="Next day →"
                kind="secondary"
                disabled={date >= dateKey()}
                onPress={() => setDate(addDays(date, 1))}
              />
            </View>
            {queue.length ? (
              <Button
                title="Mark everything present"
                onPress={() =>
                  void act(
                    (e) => e.markDayAttendance(date, "Present"),
                    "Attendance recorded",
                  )
                }
              />
            ) : null}
          </Card>
          {queue.length ? (
            queue.map(({ instance, records }) => {
              const current = records[0]?.state ?? "Not recorded";
              const colour = subjectColour(
                data.subjects.find((x) => x.id === instance.subjectId),
              );
              return (
                <Card key={instance.key}>
                  <View style={[s.row, { justifyContent: "space-between" }]}>
                    <View style={s.grow}>
                      <Text style={s.h2}>{instance.title}</Text>
                      <Text style={s.muted}>
                        {clock(instance.start)} – {clock(instance.end)} ·{" "}
                        {instance.positions.length} hour
                        {instance.positions.length === 1 ? "" : "s"} ·{" "}
                        {instance.kind}
                      </Text>
                    </View>
                    <Tag text={current.toUpperCase()} color={colour} />
                  </View>
                  <View style={s.wrap}>
                    {states.map((state) => (
                      <Button
                        key={state}
                        title={state}
                        kind={current === state ? "primary" : "secondary"}
                        onPress={() =>
                          void act(
                            (e) =>
                              e.markAttendance(
                                date,
                                instance.subjectId!,
                                instance.positions,
                                state,
                              ),
                            `${displayName(data.subjects.find((x) => x.id === instance.subjectId))} · ${state}`,
                          )
                        }
                      />
                    ))}
                  </View>
                </Card>
              );
            })
          ) : (
            <Card>
              <Empty
                text={
                  order.order
                    ? "No classes on this Day Order, so there is nothing to mark."
                    : "Not a working day — nothing to record."
                }
              />
            </Card>
          )}
        </>
      )}
      {view === "By subject" &&
        (data.subjects.length ? (
          data.subjects.map((subject) => {
            const a = subjectAttendance(data, subject.id);
            const colour = subjectColour(subject);
            return (
              <Card key={subject.id}>
                <View style={[s.row, { justifyContent: "space-between" }]}>
                  <Text style={s.h2}>{subject.title}</Text>
                  <Tag
                    text={a.held ? `${a.percentage}%` : "NOT LOGGED"}
                    color={a.atRisk ? "#FF9C9C" : colour}
                  />
                </View>
                <Progress
                  value={a.percentage}
                  color={a.atRisk ? "#FF9C9C" : colour}
                />
                <View style={s.wrap}>
                  <Stat label="Held" value={String(a.held)} hint="hours" />
                  <Stat label="Present" value={String(a.present)} color={colour} />
                  <Stat label="Absent" value={String(a.absent)} />
                  <Stat label="OD" value={String(a.od)} />
                  <Stat
                    label="Cancelled"
                    value={String(a.cancelled)}
                    hint="not counted"
                  />
                </View>
              </Card>
            );
          })
        ) : (
          <Card>
            <Empty text="No subjects yet." />
          </Card>
        ))}
      {view === "Forecast" && (
        <>
          <Card>
            <Text style={s.h2}>What happens next</Text>
            <Text style={s.muted}>
              A projection from what you have recorded, at a {threshold}%
              threshold. It is arithmetic, not advice — attend what you can.
            </Text>
            <Button
              title="Change threshold"
              kind="secondary"
              onPress={() => setSettings(true)}
            />
          </Card>
          {data.subjects.map((subject) => {
            const a = subjectAttendance(data, subject.id);
            if (!a.held)
              return (
                <Card key={subject.id}>
                  <Text style={s.h2}>{subject.title}</Text>
                  <Text style={s.muted}>
                    No hours recorded yet, so there is nothing to project.
                  </Text>
                </Card>
              );
            return (
              <Card key={subject.id}>
                <Text style={s.h2}>{subject.title}</Text>
                <Text
                  style={{
                    color: a.atRisk ? "#FF9C9C" : subjectColour(subject),
                    fontSize: 32,
                    fontWeight: "700",
                  }}
                >
                  {a.percentage}%
                </Text>
                <View style={s.wrap}>
                  <Stat
                    label="If you attend 5"
                    value={`${a.ifAttendNext(5)}%`}
                    color={colors.accent}
                  />
                  <Stat
                    label="If you miss 1"
                    value={`${a.ifMissNext(1)}%`}
                    color={colors.fitness}
                  />
                  <Stat
                    label="Room to miss"
                    value={String(a.canMiss)}
                    hint={`and stay at ${threshold}%`}
                  />
                  {a.atRisk ? (
                    <Stat
                      label="Attend next"
                      value={String(a.mustAttend)}
                      hint="to recover"
                      color="#FF9C9C"
                    />
                  ) : null}
                </View>
              </Card>
            );
          })}
        </>
      )}
      {settings && (
        <Editor
          title="Attendance threshold"
          initial={{ attendanceThreshold: threshold }}
          fields={[
            {
              key: "attendanceThreshold",
              label: "Required attendance %",
              type: "number",
            },
          ]}
          onSave={(v) =>
            act((e) =>
              e.settings({
                ...data.settings,
                attendanceThreshold: Number(v.attendanceThreshold),
              }),
            )
          }
          onClose={() => setSettings(false)}
        />
      )}
    </>
  );
}
