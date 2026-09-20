import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useLife } from "../../state/store";
import {
  Card,
  Button,
  Editor,
  Tag,
  Empty,
  Segmented,
} from "../../ui/components";
import { styles as s, colors } from "../../ui/theme";
import { subjectColour } from "../../domain/timetable";
import { displayName } from "../../domain/academic";
import { announcementScopes } from "../../domain/types";
import { dateKey, uid } from "../../domain/time";
const actions = [
  "None",
  "Day order",
  "Move deadline",
  "Cancel class",
  "Update exam syllabus",
];
const hint: Record<string, string> = {
  "Day order": "Value: date | order — e.g. 2026-09-24 | 4",
  "Move deadline": "Value: assignment title | new date",
  "Cancel class": "Value: date. Also pick the subject above.",
  "Update exam syllabus": "Value: exam title | new portions",
};
export function Announcements({ startNew = false }: { startNew?: boolean }) {
  const { data, act } = useLife(),
    today = dateKey();
  const [edit, setEdit] = useState<any>(null);
  const [view, setView] = useState("Active");
  const list = data.announcements
    .filter((a) => (view === "Archived" ? a.archived : !a.archived))
    .sort(
      (a, b) =>
        b.pinned - a.pinned ||
        b.date.localeCompare(a.date) ||
        b.createdAt.localeCompare(a.createdAt),
    );
  const subject = (id: string | null) =>
    data.subjects.find((x) => x.id === id);
  const blank = () => ({
    id: uid(),
    date: today,
    scope: "Subject",
    subjectId: data.subjects[0]?.id ?? null,
    subjectTitle: data.subjects[0]?.title ?? "",
    title: "",
    body: "",
    actionType: "None",
    actionValue: "",
    actionStatus: "None",
    pinned: 0,
    read: 0,
    archived: 0,
    remindAt: "",
    createdAt: new Date().toISOString(),
  });
  /** Announcements name things the way a person would; resolve those to ids on apply. */
  const resolveValue = (type: string, value: string) => {
    const [first, second] = value.split("|").map((x) => x.trim());
    if (type === "Move deadline") {
      const found = data.assignments.find(
        (a) => a.title.toLowerCase() === (first ?? "").toLowerCase(),
      );
      return `${found?.id ?? first ?? ""}|${second ?? ""}`;
    }
    if (type === "Update exam syllabus") {
      const found = data.assessments.find(
        (a) => a.title.toLowerCase() === (first ?? "").toLowerCase(),
      );
      return `${found?.id ?? first ?? ""}|${second ?? ""}`;
    }
    return `${first ?? ""}|${second ?? ""}`;
  };
  // Arriving from a quick action opens the form straight away.
  useEffect(() => {
    if (startNew && data.subjects.length) setEdit(blank());
  }, []);
  return (
    <>
      <Button title="New announcement" icon="plus" onPress={() => setEdit(blank())} />
      <Segmented
        values={["Active", "Archived"]}
        value={view}
        onChange={setView}
      />
      {!list.length && (
        <Card>
          <Empty text="Nothing noted. Capture what was said in class and act on it here." />
        </Card>
      )}
      {list.map((a) => {
        const colour = a.subjectId
          ? subjectColour(subject(a.subjectId))
          : colors.academic;
        const pending = a.actionType !== "None" && a.actionStatus !== "Applied";
        return (
          <Card
            key={a.id}
            style={
              pending ? { borderColor: colors.fitness + "66" } : undefined
            }
          >
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <View style={{ flexDirection: "row", gap: 6 }}>
                <Tag text={a.scope.toUpperCase()} color={colour} />
                {a.pinned ? <Tag text="PINNED" color={colors.accent} /> : null}
                {!a.read ? <Tag text="NEW" color={colors.fitness} /> : null}
              </View>
              <Text style={[s.muted, { fontSize: 11 }]}>{a.date}</Text>
            </View>
            <Text style={[s.h2, { fontSize: 19 }]}>{a.title}</Text>
            {a.body ? <Text style={s.muted}>{a.body}</Text> : null}
            {a.subjectId ? (
              <Text style={[s.muted, { fontSize: 11 }]}>
                {displayName(subject(a.subjectId))}
              </Text>
            ) : null}
            {a.actionType !== "None" ? (
              <Card style={{ padding: 14, gap: 10, backgroundColor: colors.raised }}>
                <Text style={s.muted}>
                  Action: {a.actionType} · {a.actionValue || "no value set"}
                </Text>
                {a.actionStatus === "Applied" ? (
                  <Tag text="APPLIED" color={colors.accent} />
                ) : (
                  <Button
                    title={`Apply: ${a.actionType}`}
                    onPress={() =>
                      void act(
                        (e) => e.applyAnnouncement(a.id),
                        "Applied across LifeOS",
                      )
                    }
                  />
                )}
              </Card>
            ) : null}
            <View style={s.wrap}>
              <Button
                title={a.pinned ? "Unpin" : "Pin"}
                kind="quiet"
                onPress={() =>
                  void act((e) =>
                    e.save("announcements", { ...a, pinned: a.pinned ? 0 : 1 }),
                  )
                }
              />
              <Button
                title={a.read ? "Mark unread" : "Mark read"}
                kind="quiet"
                onPress={() =>
                  void act((e) =>
                    e.save("announcements", { ...a, read: a.read ? 0 : 1 }),
                  )
                }
              />
              <Button
                title={a.archived ? "Restore" : "Archive"}
                kind="quiet"
                onPress={() =>
                  void act((e) =>
                    e.save("announcements", {
                      ...a,
                      archived: a.archived ? 0 : 1,
                    }),
                  )
                }
              />
              <Button
                title="Edit"
                kind="quiet"
                icon="edit-2"
                onPress={() =>
                  setEdit({
                    ...a,
                    subjectTitle: subject(a.subjectId)?.title ?? "",
                  })
                }
              />
            </View>
          </Card>
        );
      })}
      {edit && (
        <Editor
          title="Announcement"
          initial={edit}
          fields={[
            { key: "title", label: "What was announced" },
            { key: "body", label: "Details", type: "multiline" },
            { key: "date", label: "Date · YYYY-MM-DD" },
            { key: "scope", label: "Scope", options: [...announcementScopes] },
            {
              key: "subjectTitle",
              label: "Subject (optional)",
              options: ["", ...data.subjects.map((x) => x.title)],
            },
            { key: "actionType", label: "Attach an action", options: actions },
            {
              key: "actionValue",
              label: "Action value",
              placeholder: hint[edit.actionType] ?? "date | value",
            },
          ]}
          onSave={(v) =>
            act((e) =>
              e.save("announcements", {
                ...edit,
                ...v,
                subjectId:
                  data.subjects.find((x) => x.title === v.subjectTitle)?.id ??
                  null,
                actionValue:
                  v.actionType === "None"
                    ? ""
                    : resolveValue(v.actionType!, v.actionValue ?? ""),
                actionStatus:
                  v.actionType === "None" ? "None" : edit.actionStatus,
                createdAt: edit.createdAt || new Date().toISOString(),
              }),
            )
          }
          onDelete={() => act((e) => e.repo.remove("announcements", edit.id))}
          onClose={() => setEdit(null)}
        />
      )}
    </>
  );
}
