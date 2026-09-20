import React, { useState } from "react";
import { Text } from "react-native";
import { useLife } from "../../state/store";
import {
  Card,
  Button,
  Editor,
  Empty,
  Segmented,
  ListRow,
} from "../../ui/components";
import { styles as s } from "../../ui/theme";
import { subjectColour } from "../../domain/timetable";
import { displayName } from "../../domain/academic";
import { materialKinds } from "../../domain/types";
import { uid } from "../../domain/time";
export function Materials() {
  const { data, act } = useLife();
  const [subjectId, setSubjectId] = useState(data.subjects[0]?.id ?? "");
  const [edit, setEdit] = useState<any>(null);
  if (!data.subjects.length)
    return (
      <Card>
        <Empty text="Add a subject before filing its materials." />
      </Card>
    );
  const subject = data.subjects.find((x) => x.id === subjectId);
  const rows = data.materials.filter((m) => m.subjectId === subjectId);
  const colour = subjectColour(subject);
  return (
    <>
      <Segmented
        values={data.subjects.map((x) => displayName(x))}
        value={displayName(subject)}
        onChange={(v) =>
          setSubjectId(data.subjects.find((x) => displayName(x) === v)?.id ?? "")
        }
      />
      <Card>
        <Text style={s.h2}>{subject?.title}</Text>
        <Text style={s.muted}>
          References, not storage — a title, a kind and where to find it. Files
          stay where they already live.
        </Text>
        <Button
          title="Add material"
          icon="plus"
          onPress={() =>
            setEdit({
              id: uid(),
              subjectId,
              title: "",
              kind: "Lecture notes",
              link: "",
              notes: "",
              addedAt: new Date().toISOString(),
            })
          }
        />
      </Card>
      {materialKinds
        .filter((kind) => rows.some((r) => r.kind === kind))
        .map((kind) => (
          <Card key={kind}>
            <Text style={s.label}>{kind.toUpperCase()}</Text>
            {rows
              .filter((r) => r.kind === kind)
              .map((r) => (
                <ListRow
                  key={r.id}
                  colour={colour}
                  title={r.title}
                  subtitle={r.link || r.notes || "No link recorded"}
                  onPress={() => setEdit(r)}
                />
              ))}
          </Card>
        ))}
      {!rows.length && (
        <Card>
          <Empty text="Nothing filed for this subject yet." />
        </Card>
      )}
      {edit && (
        <Editor
          title="Material"
          initial={edit}
          fields={[
            { key: "title", label: "Title" },
            { key: "kind", label: "Kind", options: [...materialKinds] },
            { key: "link", label: "Link or where it lives" },
            { key: "notes", label: "Notes", type: "multiline" },
          ]}
          onSave={(v) => act((e) => e.save("materials", { ...edit, ...v }))}
          onDelete={() => act((e) => e.repo.remove("materials", edit.id))}
          onClose={() => setEdit(null)}
        />
      )}
    </>
  );
}
