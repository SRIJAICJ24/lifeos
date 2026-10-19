import React, { useMemo, useState } from "react";
import { View, Text, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { Shell } from "../src/ui/Shell";
import {
  Button,
  Card,
  Heading,
  Icon,
  Tag,
  Progress,
  Empty,
  Choices,
} from "../src/ui/components";
import { colors, styles as s } from "../src/ui/theme";
import { useLife } from "../src/state/store";
import { dayOrder } from "../src/domain/dayOrder";
import { availability } from "../src/domain/freeTime";
import { nextClass } from "../src/domain/timetable";
import { recommendations, actionable, priority } from "../src/domain/priority";
import { dateKey, clock, duration, addDays } from "../src/domain/time";
import { TaskRow } from "../src/ui/TaskRow";
import { habitStats } from "../src/domain/analytics";

export default function Today() {
  const { data, minute, act, busy } = useLife(),
    router = useRouter(),
    today = dateKey();
  const [showNow, setNow] = useState(false);
  const wide = useWindowDimensions().width > 850;
  const order = useMemo(
    () => dayOrder(today, data.calendar, data.settings),
    [data, today],
  );
  const free = useMemo(
    () => availability(data, today, minute),
    [data, minute, today],
  );
  const total = free.reduce((n, b) => n + b.end - b.start, 0);
  const plan = data.blocks
    .filter((b) => b.date === today && b.kind === "session")
    .sort((a, b) => a.start - b.start);
  const next = nextClass(data, today, minute);
  const nextSubject = data.subjects.find((x) => x.id === next?.subjectId);
  const urgent = data.tasks
    .filter((t) => actionable(t) && t.deadline)
    .sort((a, b) => priority(b, today, data) - priority(a, today, data))
    .slice(0, 3);
  const current = free.find((f) => f.start <= minute && f.end > minute);
  const currentBlock = plan.find(
    (b) => b.start <= minute && b.end > minute && b.status === "Scheduled",
  );
  const currentTask = data.tasks.find((t) => t.id === currentBlock?.taskId);
  const choices = current
    ? recommendations(data, today, current.end - minute)
    : [];
  const complete = plan.filter((b) => b.status === "Completed").length;

  const nextBlock = plan.find(
    (b) => b.start > minute && b.status === "Scheduled",
  );
  const nextBlockTask = data.tasks.find((t) => t.id === nextBlock?.taskId);

  const tomorrow = addDays(today, 1);
  const tomorrowOrder = useMemo(
    () => dayOrder(tomorrow, data.calendar, data.settings),
    [data, tomorrow],
  );
  const tomorrowTasks = data.tasks.filter(
    (t) => actionable(t) && t.deadline === tomorrow,
  );
  const tomorrowBlocks = data.blocks
    .filter((b) => b.date === tomorrow && b.kind === "session")
    .sort((a, b) => a.start - b.start);

  const remainingByArea = useMemo(() => {
    const active = data.tasks.filter(actionable);
    return {
      academic: active.filter((t) => t.lifeArea === "academic").length,
      skills: active.filter((t) => t.lifeArea === "skills").length,
      projects: active.filter((t) => t.lifeArea === "projects").length,
      fitness: active.filter((t) => t.lifeArea === "fitness").length,
      habits: active.filter((t) => t.lifeArea === "habits").length,
      total: active.length,
    };
  }, [data.tasks]);

  return (
    <Shell>
      <Heading
        title={
          new Date().getHours() < 12
            ? "Good morning."
            : new Date().getHours() < 17
              ? "Good afternoon."
              : "Good evening."
        }
        subtitle={new Date().toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
        right={wide ? <Tag text="YOUR DAILY PICTURE" /> : undefined}
      />
      {!data.settings.onboarded && (
        <Card style={{ borderColor: "#586540", backgroundColor: "#20271C" }}>
          <Text style={s.h2}>Make this day your own.</Text>
          <Text style={s.muted}>
            Your semester is already set up. Add your wake and sleep times, then
            capture what you are carrying.
          </Text>
          <View style={s.wrap}>
            <Button
              title="Set up my rhythm"
              onPress={() =>
                router.push({
                  pathname: "/me",
                  params: { section: "settings" },
                })
              }
            />
            <Button
              title="Open Academic"
              kind="secondary"
              onPress={() =>
                router.push({
                  pathname: "/area/[area]",
                  params: { area: "academic" },
                })
              }
            />
            <Button
              title="Dismiss"
              kind="quiet"
              onPress={() =>
                void act(
                  (e) => e.repo.settings({ onboarded: 1 }),
                  "You can change your rhythm in Me.",
                )
              }
            />
          </View>
        </Card>
      )}
      <View style={s.grid}>
        <Card
          style={{
            flex: 1,
            minWidth: 260,
            backgroundColor: "#D0EE88",
            borderColor: "#D0EE88",
            gap: 20,
          }}
        >
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <Text style={[s.label, { color: "#4C5D32" }]}>
              MAKE SPACE FOR WHAT MATTERS
            </Text>
            <Icon name="sun" color="#465C28" />
          </View>
          <Text
            style={{
              fontSize: wide ? 34 : 30,
              fontWeight: "600",
              letterSpacing: -1.1,
              color: "#20281A",
              maxWidth: 420,
            }}
          >
            A plan that fits your life.
          </Text>
          <Text style={{ color: "#4C5D32", fontSize: 14, lineHeight: 22 }}>
            You have {duration(total)} open ahead. Let's find a good place to
            start.
          </Text>
          <Button
            title="What should I do now?"
            icon="arrow-up-right"
            kind="secondary"
            onPress={() => setNow(!showNow)}
          />
        </Card>
        <Card style={{ flex: 1, minWidth: 260 }}>
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <Text style={s.label}>UP NEXT · ACADEMIC</Text>
            <Icon name="book-open" color={colors.academic} />
          </View>
          <Tag
            text={
              order.order
                ? `DAY ORDER ${order.order}`
                : order.type.toUpperCase()
            }
            color={colors.academic}
          />
          <Text style={[s.h2, { fontSize: 26 }]}>
            {nextSubject?.title ??
              (order.order ? "Classes wrapped up." : "A change of pace.")}
          </Text>
          <Text style={s.muted}>
            {next
              ? `${clock(next.start)} – ${clock(next.end)}  ·  ${next.room}`
              : order.order
                ? "Your time is yours again."
                : order.note}
          </Text>
          <Button
            title="View academic calendar"
            kind="quiet"
            icon="arrow-right"
            onPress={() => router.push("/area/academic")}
          />
        </Card>
      </View>

      {nextBlockTask && (
        <Card
          style={{
            borderLeftColor: colors.accent,
            borderLeftWidth: 4,
          }}
        >
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <View style={[s.row, { gap: 8 }]}>
              <Icon name="clock" color={colors.accent} />
              <Text style={s.label}>NEXT UP</Text>
            </View>
            <Tag
              text={`AT ${clock(nextBlock!.start)}`}
              color={colors.accent}
            />
          </View>
          <TaskRow
            task={nextBlockTask}
            time={`${clock(nextBlock!.start)} – ${clock(nextBlock!.end)}`}
          />
        </Card>
      )}

      {showNow && (
        <Card>
          <Text style={s.h2}>
            {current
              ? `You have ${duration(current.end - minute)} right now.`
              : "You're in a planned activity."}
          </Text>
          <Text style={s.muted}>
            {current
              ? "Ranked by urgency, importance, remaining work and fit."
              : free[0]
                ? `Your next opening starts at ${clock(free[0].start)}. Open Free Time to plan ahead.`
                : "There are no free windows left today. It's okay to leave work for tomorrow."}
          </Text>
          {choices.slice(0, 3).map((t, i) => (
            <View key={t.id}>
              {i === 0 && <Tag text="BEST CHOICE" />}
              <TaskRow task={t} />
            </View>
          ))}
          {!current && currentTask && (
            <TaskRow task={currentTask} time="Your current planned session" />
          )}
          {current && choices.length === 0 && (
            <Empty text="No flexible tasks fit this window. Enjoy a little breathing room." />
          )}
        </Card>
      )}
      <View style={s.grid}>
        <View style={[s.column, { flex: 1.5 }]}>
          <Card>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Text style={s.h2}>
                Today's plan <Text style={s.muted}> / {plan.length}</Text>
              </Text>
              <Button
                title={busy ? "Planning…" : "Plan my day"}
                disabled={busy}
                kind="secondary"
                icon="zap"
                onPress={() =>
                  void act(
                    (e) => e.generate(today),
                    "Your plan is ready. Breathing room included.",
                  )
                }
              />
            </View>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Text style={s.muted}>
                {complete} completed · {data.settings.intensity.toLowerCase()}{" "}
                pace
              </Text>
              <Text style={s.muted}>
                {duration(plan.reduce((n, b) => n + b.end - b.start, 0))}{" "}
                planned
              </Text>
            </View>
            <Progress
              value={plan.length ? (complete / plan.length) * 100 : 0}
            />
            {plan.length ? (
              plan.map((b) => {
                const t = data.tasks.find((t) => t.id === b.taskId);
                return t ? (
                  <TaskRow
                    key={b.id}
                    task={t}
                    time={`${clock(b.start)} – ${clock(b.end)}`}
                  />
                ) : null;
              })
            ) : (
              <Empty text="Your day is a clean slate. Generate a plan to fit flexible work around the things already in your calendar." />
            )}
            <Button
              title="Capture something new"
              kind="quiet"
              icon="plus"
              onPress={() => router.push("/capture")}
            />
          </Card>
          <Card>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Text style={s.h2}>On your radar</Text>
              <Tag text="UPCOMING" color={colors.fitness} />
            </View>
            {urgent.map((t) => (
              <TaskRow key={t.id} task={t} time={`Due ${t.deadline}`} />
            ))}
            {!urgent.length && <Empty text="No deadlines on the horizon." />}
            <Button
              title="View all tasks"
              kind="secondary"
              onPress={() => router.push("/tasks")}
            />
          </Card>
        </View>
        <View style={s.column}>
          <Card>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Text style={s.h2}>Task overview</Text>
              <Icon name="layers" color={colors.accent} />
            </View>
            <View style={{ gap: 10 }}>
              {[
                {
                  label: "Academic",
                  count: remainingByArea.academic,
                  color: colors.academic,
                },
                {
                  label: "Skills",
                  count: remainingByArea.skills,
                  color: colors.skills,
                },
                {
                  label: "Projects",
                  count: remainingByArea.projects,
                  color: colors.projects,
                },
                {
                  label: "Fitness",
                  count: remainingByArea.fitness,
                  color: colors.fitness,
                },
                {
                  label: "Habits",
                  count: remainingByArea.habits,
                  color: colors.habits,
                },
              ]
                .filter((a) => a.count > 0)
                .map((a) => (
                  <View
                    key={a.label}
                    style={[s.row, { justifyContent: "space-between" }]}
                  >
                    <View style={[s.row, { gap: 8 }]}>
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: a.color,
                        }}
                      />
                      <Text style={s.text}>{a.label}</Text>
                    </View>
                    <Text
                      style={{ color: a.color, fontWeight: "700", fontSize: 15 }}
                    >
                      {a.count}
                    </Text>
                  </View>
                ))}
              {remainingByArea.total === 0 && (
                <Text style={s.muted}>All clear. Nothing pending.</Text>
              )}
            </View>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Text style={s.muted}>Total open</Text>
              <Text
                style={{
                  color: colors.text,
                  fontWeight: "700",
                  fontSize: 18,
                }}
              >
                {remainingByArea.total}
              </Text>
            </View>
          </Card>
          <Card>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Text style={s.h2}>Room to breathe</Text>
              <Icon name="wind" color={colors.personal} />
            </View>
            <Text
              style={{
                fontSize: 36,
                color: colors.text,
                fontWeight: "600",
                letterSpacing: -1,
              }}
            >
              {duration(total)}
              <Text style={s.muted}> available</Text>
            </Text>
            {free.slice(0, 3).map((b, i) => (
              <View
                key={i}
                style={[
                  s.row,
                  { justifyContent: "space-between", paddingVertical: 8 },
                ]}
              >
                <View style={s.row}>
                  <View
                    style={{
                      width: 3,
                      height: 30,
                      backgroundColor: colors.personal,
                      borderRadius: 2,
                    }}
                  />
                  <Text style={s.text}>
                    {clock(b.start)} – {clock(b.end)}
                  </Text>
                </View>
                <Text style={s.muted}>{duration(b.end - b.start)}</Text>
              </View>
            ))}
            <Button
              title="Explore free time"
              icon="arrow-right"
              kind="quiet"
              onPress={() => router.push("/area/free")}
            />
          </Card>
          <Card>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Text style={s.h2}>Small things, daily</Text>
              <Icon name="heart" color={colors.habits} />
            </View>
            {data.habits.slice(0, 3).map((h) => {
              const stat = habitStats(h, data, today);
              const done = stat.value >= h.target;
              return (
                <View key={h.id} style={{ gap: 10 }}>
                  <View style={[s.row, { justifyContent: "space-between" }]}>
                    <View style={[s.row, { gap: 8 }]}>
                      {done && (
                        <Text style={{ color: colors.accent, fontSize: 14 }}>
                          ✓
                        </Text>
                      )}
                      <Text
                        style={[
                          s.text,
                          done && {
                            textDecorationLine: "line-through",
                            color: colors.muted,
                          },
                        ]}
                      >
                        {h.title}
                      </Text>
                    </View>
                    <Text style={s.muted}>
                      {stat.value}/{h.target}
                    </Text>
                  </View>
                  <Progress
                    value={(stat.value / h.target) * 100}
                    color={done ? colors.accent : colors.habits}
                  />
                </View>
              );
            })}
            <Button
              title="Check in with your habits"
              kind="quiet"
              onPress={() => router.push("/area/habits")}
            />
          </Card>
          {(tomorrowTasks.length > 0 || tomorrowBlocks.length > 0) && (
            <Card>
              <View style={[s.row, { justifyContent: "space-between" }]}>
                <Text style={s.h2}>Tomorrow</Text>
                <Tag
                  text={
                    tomorrowOrder.order
                      ? `DO${tomorrowOrder.order}`
                      : tomorrowOrder.type.toUpperCase().slice(0, 10)
                  }
                  color={colors.academic}
                />
              </View>
              {tomorrowTasks.slice(0, 3).map((t) => (
                <TaskRow key={t.id} task={t} time="Due tomorrow" />
              ))}
              {tomorrowBlocks.slice(0, 3).map((b) => {
                const t = data.tasks.find((t) => t.id === b.taskId);
                return t ? (
                  <TaskRow
                    key={b.id}
                    task={t}
                    time={`${clock(b.start)} – ${clock(b.end)}`}
                  />
                ) : null;
              })}
              <Button
                title="Plan tomorrow"
                kind="quiet"
                icon="arrow-right"
                onPress={() => router.push("/calendar")}
              />
            </Card>
          )}
        </View>
      </View>
    </Shell>
  );
}
