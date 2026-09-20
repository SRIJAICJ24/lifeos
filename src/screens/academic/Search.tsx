import React, { useState } from "react";
import { Text, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useLife } from "../../state/store";
import { Card, Empty, ListRow, Tag } from "../../ui/components";
import { styles as s, colors } from "../../ui/theme";
import { subjectColour } from "../../domain/timetable";
import { displayName } from "../../domain/academic";
interface Hit {
  id: string;
  kind: string;
  title: string;
  detail: string;
  subjectId: string | null;
  section: string;
}
export function AcademicSearch() {
  const { data } = useLife(),
    router = useRouter();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const subject = (id: string | null) => data.subjects.find((x) => x.id === id);
  const path = (id: string | null) => displayName(subject(id));
  const hits: Hit[] = [];
  if (q.length >= 2) {
    const has = (...parts: (string | null | undefined)[]) =>
      parts.some((p) => (p ?? "").toLowerCase().includes(q));
    for (const x of data.subjects)
      if (has(x.title, x.code, x.shortName, x.facultyName, x.notes))
        hits.push({
          id: x.id,
          kind: "Subject",
          title: x.title,
          detail: `${x.code} · ${x.facultyName}`,
          subjectId: x.id,
          section: "subjects",
        });
    for (const x of data.syllabusTopics)
      if (has(x.title, x.personalNotes, x.pyqYears))
        hits.push({
          id: x.id,
          kind: "Topic",
          title: x.title,
          detail: `${path(x.subjectId)} · ${data.syllabusUnits.find((u) => u.id === x.unitId)?.title ?? "Unit"} · ${x.state}`,
          subjectId: x.subjectId,
          section: "syllabus",
        });
    for (const x of data.assignments)
      if (has(x.title, x.description, x.notes, x.facultyInstructions))
        hits.push({
          id: x.id,
          kind: "Assignment",
          title: x.title,
          detail: `${path(x.subjectId)} · due ${x.dueDate} · ${x.status}`,
          subjectId: x.subjectId,
          section: "assignments",
        });
    for (const x of data.assessments)
      if (has(x.title, x.syllabus, x.notes))
        hits.push({
          id: x.id,
          kind: x.assessmentType,
          title: x.title,
          detail: `${path(x.subjectId)} · ${x.date}`,
          subjectId: x.subjectId,
          section: "assessments",
        });
    for (const x of data.announcements)
      if (has(x.title, x.body))
        hits.push({
          id: x.id,
          kind: "Announcement",
          title: x.title,
          detail: `${x.scope} · ${x.date}`,
          subjectId: x.subjectId,
          section: "announcements",
        });
    for (const x of data.materials)
      if (has(x.title, x.notes, x.link))
        hits.push({
          id: x.id,
          kind: x.kind,
          title: x.title,
          detail: `${path(x.subjectId)} · material`,
          subjectId: x.subjectId,
          section: "materials",
        });
    for (const x of data.subjectTodos)
      if (has(x.title, x.notes))
        hits.push({
          id: x.id,
          kind: "Todo",
          title: x.title,
          detail: `${path(x.subjectId)} · ${x.done ? "done" : "open"}`,
          subjectId: x.subjectId,
          section: "subjects",
        });
    for (const x of data.studySessions)
      if (has(x.notes))
        hits.push({
          id: x.id,
          kind: "Study session",
          title: x.notes,
          detail: `${path(x.subjectId)} · ${x.date}`,
          subjectId: x.subjectId,
          section: "study",
        });
  }
  return (
    <>
      <Card>
        <TextInput
          accessibilityLabel="Search academic"
          style={s.input}
          value={query}
          autoFocus
          placeholder="VLSM, FT-2, Brindha, Unit 2…"
          placeholderTextColor={colors.muted}
          onChangeText={setQuery}
        />
        <Text style={s.muted}>
          Searches subjects, topics, assignments, tests, announcements,
          materials, todos and session notes.
        </Text>
      </Card>
      <Card>
        {q.length < 2 ? (
          <Empty text="Type at least two characters." />
        ) : hits.length ? (
          hits.slice(0, 60).map((hit) => (
            <ListRow
              key={`${hit.kind}-${hit.id}`}
              colour={subjectColour(subject(hit.subjectId))}
              title={hit.title}
              subtitle={hit.detail}
              right={<Tag text={hit.kind.toUpperCase()} color={colors.muted} />}
              onPress={() =>
                router.push({
                  pathname: "/academic/[section]",
                  params: { section: hit.section },
                })
              }
            />
          ))
        ) : (
          <Empty text={`Nothing matches "${query}".`} />
        )}
      </Card>
    </>
  );
}
