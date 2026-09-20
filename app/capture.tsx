import React, { useState } from "react";
import { View, Text, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { Shell } from "../src/ui/Shell";
import { Heading, Card, Choices, Button } from "../src/ui/components";
import { colors, styles as s } from "../src/ui/theme";
import { useLife } from "../src/state/store";
import { newTask } from "../src/data/seed";
import { Area, areas } from "../src/domain/types";
import { clock, minutes, dateKey, uid } from "../src/domain/time";
export default function Capture() {
  const { act, data } = useLife(),
    router = useRouter();
  const [kind, setKind] = useState("Task"),
    [title, setTitle] = useState(""),
    [area, setArea] = useState("personal"),
    [length, setLength] = useState(String(data.settings.defaultDuration)),
    [deadline, setDeadline] = useState(""),
    [priority, setPriority] = useState("Medium"),
    [split, setSplit] = useState("Yes"),
    [date, setDate] = useState(dateKey()),
    [start, setStart] = useState("18:00"),
    [end, setEnd] = useState("19:00"),
    [repeat, setRepeat] = useState("none"),
    [link, setLink] = useState("None");
  const options =
    area === "academic"
      ? data.subjects
      : area === "skills"
        ? data.skills
        : area === "projects"
          ? data.projects
          : [];
  async function save() {
    const ok = await act(async (e) => {
      const id = uid();
      if (["Event", "Personal reminder"].includes(kind)) {
        await e.save("blocks", {
          id,
          title,
          date,
          start: minutes(start),
          end: minutes(end),
          kind: "event",
          taskId: null,
          status: "Scheduled",
        });
      } else if (kind === "Habit") {
        await e.save("habits", {
          id,
          title,
          type: "boolean",
          target: 1,
          unit: "done",
          duration: Number(length),
          startDate: dateKey(),
        });
      } else if (["Idea", "Project"].includes(kind)) {
        await e.save("projects", {
          id,
          title,
          description: "",
          status: "Idea",
          targetDate: deadline || null,
          link: "",
          notes: "",
        });
      } else {
        const related = options.find((o) => o.title === link);
        if (kind === "Exam") {
          await e.repo.db.withTransactionAsync(async () => {
            await e.save("tasks", {
              ...newTask(title, "academic", id),
              subcategory: "Exam",
              fixed: 1,
              deadline: date,
              estimatedDuration: minutes(end) - minutes(start),
              subjectId: related?.id ?? null,
            });
            await e.save("blocks", {
              id: uid(),
              title,
              date,
              start: minutes(start),
              end: minutes(end),
              kind: "exam",
              taskId: id,
              status: "Scheduled",
            });
          });
          return;
        }
        await e.save("tasks", {
          ...newTask(title, area as Area, id),
          subcategory: kind,
          estimatedDuration: Number(length),
          minimumSessionLength: Math.min(15, Number(length)),
          deadline: deadline || null,
          priority: priority === "High" ? 3 : priority === "Low" ? 1 : 2,
          splittable: split === "Yes" ? 1 : 0,
          recurrence: repeat === "none" ? "" : repeat,
          subjectId: area === "academic" ? (related?.id ?? null) : null,
          skillId: area === "skills" ? (related?.id ?? null) : null,
          projectId: area === "projects" ? (related?.id ?? null) : null,
        });
      }
    }, "Captured. Ready when you are.");
    if (ok) {
      setTitle("");
      router.push("/");
    }
  }
  const input = (
    label: string,
    value: string,
    set: (s: string) => void,
    placeholder?: string,
  ) => (
    <View style={{ gap: 8 }}>
      <Text style={s.muted}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={set}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={s.input}
      />
    </View>
  );
  return (
    <Shell>
      <Heading
        title="Get it out of your head."
        subtitle="Capture now. Find the right time later."
      />
      <Card style={{ maxWidth: 760, width: "100%", alignSelf: "center" }}>
        <Choices
          values={[
            "Task",
            "Assignment",
            "Exam",
            "Event",
            "Habit",
            "Idea",
            "Project",
            "Workout",
            "Personal reminder",
          ]}
          value={kind}
          onChange={(k) => {
            setKind(k);
            if (["Assignment", "Exam"].includes(k)) setArea("academic");
            if (k === "Workout") setArea("fitness");
          }}
        />
        {input("Title", title, setTitle, "What’s on your mind?")}
        {!["Event", "Personal reminder", "Idea", "Project", "Habit"].includes(
          kind,
        ) && (
          <>
            <Text style={s.muted}>Life area</Text>
            <Choices
              values={[...areas]}
              value={area}
              onChange={(a) => {
                setArea(a);
                setLink("None");
              }}
            />
            {options.length > 0 && (
              <>
                <Text style={s.muted}>Connect to</Text>
                <Choices
                  values={["None", ...options.map((o) => o.title)]}
                  value={link}
                  onChange={setLink}
                />
              </>
            )}
          </>
        )}
        {["Event", "Personal reminder", "Exam"].includes(kind) ? (
          <>
            {input("Date · YYYY-MM-DD", date, setDate)}
            {input("Start · HH:mm", start, setStart)}
            {input("End · HH:mm", end, setEnd)}
          </>
        ) : (
          <>
            {!["Idea", "Project"].includes(kind) &&
              input("Estimated minutes", length, setLength)}
            {kind !== "Habit" &&
              input(
                "Deadline · YYYY-MM-DD (optional)",
                deadline,
                setDeadline,
                "2026-09-20",
              )}
            {!["Idea", "Project", "Habit"].includes(kind) && (
              <>
                <Text style={s.muted}>Priority</Text>
                <Choices
                  values={["Low", "Medium", "High"]}
                  value={priority}
                  onChange={setPriority}
                />
                <Text style={s.muted}>Can this be split into sessions?</Text>
                <Choices
                  values={["Yes", "No"]}
                  value={split}
                  onChange={setSplit}
                />
                <Text style={s.muted}>Repeats</Text>
                <Choices
                  values={["none", "daily", "weekly"]}
                  value={repeat}
                  onChange={setRepeat}
                />
              </>
            )}
          </>
        )}
        <Button title="Capture" icon="plus" onPress={() => void save()} />
      </Card>
    </Shell>
  );
}
