import React, { useState } from "react";
import { Text, View } from "react-native";
import { useLife } from "../../state/store";
import {
  Card,
  Button,
  Editor,
  Tag,
  Empty,
  Progress,
  ListRow,
} from "../../ui/components";
import { styles as s } from "../../ui/theme";
import { subjectColour } from "../../domain/timetable";
import { subjectMarks } from "../../domain/academic";
import { dateKey, uid } from "../../domain/time";
export function Marks() {
  const { data, act } = useLife();
  const [edit, setEdit] = useState<any>(null);
  if (!data.subjects.length)
    return (
      <Card>
        <Empty text="Add a subject before recording marks." />
      </Card>
    );
  return (
    <>
      <Card>
        <Text style={s.h2}>How internals are calculated</Text>
        <Text style={s.muted}>
          Weightage is yours to set, because courses count components
          differently. Leave weightage at zero and a component is recorded but
          not totalled.
        </Text>
      </Card>
      {data.subjects.map((subject) => {
        const m = subjectMarks(data, subject.id);
        const colour = subjectColour(subject);
        return (
          <Card key={subject.id}>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Text style={s.h2}>{subject.title}</Text>
              {m.outOf ? (
                <Tag
                  text={`${Math.round(m.total * 10) / 10} / ${m.outOf}`}
                  color={colour}
                />
              ) : null}
            </View>
            {m.rows.length ? (
              <>
                {m.rows.map((row) => (
                  <ListRow
                    key={row.id}
                    colour={colour}
                    title={row.component}
                    subtitle={`${row.weightage ? `${row.weightage} weightage` : "not weighted"}${row.date ? ` · ${row.date}` : ""}`}
                    right={
                      <Text style={s.text}>
                        {row.obtained} / {row.maximum}
                      </Text>
                    }
                    onPress={() => setEdit(row)}
                  />
                ))}
                {m.outOf ? (
                  <Progress
                    value={(m.total / m.outOf) * 100}
                    color={colour}
                  />
                ) : null}
                <Text style={[s.muted, { fontSize: 11 }]}>
                  Average across components: {m.average}%
                </Text>
              </>
            ) : (
              <Text style={s.muted}>Nothing recorded yet.</Text>
            )}
            <Button
              title="Add a component"
              kind="secondary"
              icon="plus"
              onPress={() =>
                setEdit({
                  id: uid(),
                  subjectId: subject.id,
                  component: "",
                  obtained: 0,
                  maximum: 10,
                  weightage: 0,
                  date: dateKey(),
                  notes: "",
                })
              }
            />
          </Card>
        );
      })}
      {edit && (
        <Editor
          title="Mark"
          initial={edit}
          fields={[
            { key: "component", label: "Component", placeholder: "FT1, Quiz, Assignment" },
            { key: "obtained", label: "Scored", type: "number" },
            { key: "maximum", label: "Out of", type: "number" },
            { key: "weightage", label: "Weightage toward internals", type: "number" },
            { key: "date", label: "Date · YYYY-MM-DD" },
            { key: "notes", label: "Notes", type: "multiline" },
          ]}
          onSave={(v) =>
            act((e) => {
              const maximum = Number(v.maximum);
              if (!(maximum > 0)) throw new Error("Out of must be more than zero.");
              const obtained = Number(v.obtained);
              if (obtained < 0 || obtained > maximum)
                throw new Error("The score must fall within the maximum.");
              return e.save("marks", {
                ...edit,
                ...v,
                obtained,
                maximum,
                weightage: Number(v.weightage) || 0,
              });
            })
          }
          onDelete={() => act((e) => e.repo.remove("marks", edit.id))}
          onClose={() => setEdit(null)}
        />
      )}
    </>
  );
}
