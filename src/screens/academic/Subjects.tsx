import React, { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useLife } from "../../state/store";
import {
  Card,
  Button,
  Editor,
  Tag,
  Empty,
  Progress,
} from "../../ui/components";
import { styles as s } from "../../ui/theme";
import { subjectColour } from "../../domain/timetable";
import {
  subjectAttendance,
  subjectTopics,
  syllabusProgress,
  assignmentOpen,
} from "../../domain/academic";
import { uid } from "../../domain/time";
const blank = () => ({
  id: uid(),
  title: "",
  code: "",
  shortName: "",
  credits: 3,
  category: "Professional Core",
  courseType: "Theory",
  facultyName: "",
  facultyContact: "",
  colour: "#80B7FF",
  semester: 5,
  academicYear: "",
  active: 1,
  notes: "",
});
export function Subjects() {
  const { data, act } = useLife(),
    router = useRouter();
  const [edit, setEdit] = useState<any>(null);
  const [slot, setSlot] = useState<any>(null);
  return (
    <>
      <View style={s.wrap}>
        <Button
          title="Add subject"
          icon="plus"
          onPress={() => setEdit({ ...blank(), academicYear: data.settings.academicYear })}
        />
        <Button
          title="Restore semester setup"
          kind="secondary"
          icon="refresh-cw"
          onPress={() =>
            void act((e) => e.restoreAcademicSetup(), "Semester setup restored")
          }
        />
      </View>
      {!data.subjects.length && (
        <Card>
          <Empty text="No subjects yet. Add one, or restore the semester setup." />
        </Card>
      )}
      {data.subjects.map((subject) => {
        const slots = data.courseSlots.filter((c) => c.subjectId === subject.id);
        const topics = subjectTopics(data, subject.id);
        const progress = syllabusProgress(topics);
        const attendance = subjectAttendance(data, subject.id);
        const open = data.assignments.filter(
          (a) => a.subjectId === subject.id && assignmentOpen(a),
        ).length;
        const colour = subjectColour(subject);
        return (
          <Card
            key={subject.id}
            style={{ borderTopColor: colour, borderTopWidth: 3 }}
          >
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Tag text={subject.code || "NO CODE"} color={colour} />
              <Button
                title="Edit"
                kind="quiet"
                icon="edit-2"
                onPress={() => setEdit(subject)}
              />
            </View>
            <Text style={[s.h2, { fontSize: 23 }]}>{subject.title}</Text>
            <Text style={s.muted}>
              {subject.credits} credit{subject.credits === 1 ? "" : "s"} ·{" "}
              {subject.category} · {subject.courseType}
              {subject.facultyName ? ` · ${subject.facultyName}` : ""}
            </Text>
            <View style={s.wrap}>
              {slots.length ? (
                slots.map((c) => (
                  <Button
                    key={c.id}
                    title={`${c.slotCode} · ${c.kind}${c.room ? ` · ${c.room}` : ""}`}
                    kind="secondary"
                    onPress={() => setSlot({ ...c, subjectTitle: subject.title })}
                  />
                ))
              ) : (
                <Text style={s.muted}>No slots yet — this subject never appears on the timetable.</Text>
              )}
              <Button
                title="Add slot"
                kind="quiet"
                icon="plus"
                onPress={() =>
                  setSlot({
                    id: uid(),
                    subjectId: subject.id,
                    subjectTitle: subject.title,
                    slotCode: "",
                    kind: "Theory",
                    room: "",
                  })
                }
              />
            </View>
            <Progress value={progress.overall} color={colour} />
            <Text style={[s.muted, { fontSize: 11 }]}>
              Syllabus {progress.overall}% · class covered {progress.covered}% ·
              attendance{" "}
              {attendance.held ? `${attendance.percentage}%` : "not logged"} ·{" "}
              {open} open assignment{open === 1 ? "" : "s"}
            </Text>
            <Button
              title={`Open ${subject.shortName || subject.title}`}
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
      {edit && (
        <Editor
          title="Subject"
          initial={edit}
          fields={[
            { key: "title", label: "Course title" },
            { key: "code", label: "Course code" },
            { key: "shortName", label: "Short name (CN, DM…)" },
            { key: "credits", label: "Credits", type: "number" },
            {
              key: "category",
              label: "Category",
              options: [
                "Professional Core",
                "Professional Elective",
                "Basic Science",
                "Open Elective",
                "Project Course",
                "Mandatory",
                "Other",
              ],
            },
            {
              key: "courseType",
              label: "Course type",
              options: [
                "Theory",
                "Lab Based Theory",
                "Project Based Theory",
                "Practical",
                "Project",
              ],
            },
            { key: "facultyName", label: "Faculty" },
            { key: "facultyContact", label: "Faculty contact" },
            { key: "colour", label: "Colour · hex", placeholder: "#80B7FF" },
            { key: "notes", label: "Notes", type: "multiline" },
          ]}
          onSave={(v) =>
            act((e) =>
              e.save("subjects", {
                ...edit,
                ...v,
                credits: Number(v.credits) || 0,
                semester: edit.semester || data.settings.semester,
                academicYear: edit.academicYear || data.settings.academicYear,
                active: 1,
              }),
            )
          }
          onDelete={() => act((e) => e.repo.remove("subjects", edit.id))}
          onClose={() => setEdit(null)}
        />
      )}
      {slot && (
        <Editor
          title={`Slot for ${slot.subjectTitle}`}
          initial={slot}
          fields={[
            { key: "slotCode", label: "Slot code", placeholder: "A, P1, L51…" },
            {
              key: "kind",
              label: "Kind",
              options: ["Theory", "Lab", "Practical", "Project"],
            },
            { key: "room", label: "Room" },
          ]}
          onSave={(v) =>
            act((e) => {
              const slotCode = (v.slotCode ?? "").trim().toUpperCase();
              if (!slotCode) throw new Error("Give the slot a code.");
              const clash = data.courseSlots.find(
                (c) => c.slotCode === slotCode && c.id !== slot.id,
              );
              if (clash)
                throw new Error(
                  `Slot ${slotCode} is already used by another subject. Two subjects cannot share a slot.`,
                );
              return e.save("courseSlots", {
                id: slot.id,
                subjectId: slot.subjectId,
                slotCode,
                kind: v.kind,
                room: v.room ?? "",
              });
            }, "Slot saved")
          }
          onDelete={() => act((e) => e.repo.remove("courseSlots", slot.id))}
          onClose={() => setSlot(null)}
        />
      )}
    </>
  );
}
