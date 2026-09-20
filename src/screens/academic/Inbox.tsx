import React, { useState } from "react";
import { Text, View, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useLife } from "../../state/store";
import { Card, Button, Empty, ListRow, Tag } from "../../ui/components";
import { styles as s, colors } from "../../ui/theme";
/** Where a half-formed thought can land before it has a home. */
export function Inbox() {
  const { data, act } = useLife(),
    router = useRouter();
  const [text, setText] = useState("");
  const open = data.inbox.filter((i) => i.status === "New");
  const go = (section: string) =>
    router.push({ pathname: "/academic/[section]", params: { section } });
  return (
    <>
      <Card>
        <Text style={s.h2}>Capture it now</Text>
        <Text style={s.muted}>
          "CN assignment Friday", "GPU test Unit 2", "Tomorrow DO4". Write it
          down while it is fresh and turn it into the real thing later.
        </Text>
        <TextInput
          accessibilityLabel="Academic note"
          style={[s.input, { minHeight: 70, textAlignVertical: "top" }]}
          multiline
          value={text}
          placeholder="What did you just hear?"
          placeholderTextColor={colors.muted}
          onChangeText={setText}
        />
        <Button
          title="Add to inbox"
          icon="plus"
          onPress={() =>
            void act((e) => e.captureInbox(text), "Captured").then((ok) => {
              if (ok) setText("");
            })
          }
        />
      </Card>
      <Card>
        <Text style={s.h2}>Waiting to be sorted</Text>
        {open.length ? (
          open
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map((item) => (
              <View key={item.id} style={{ gap: 10 }}>
                <ListRow
                  colour={colors.academic}
                  title={item.text}
                  subtitle={item.createdAt.slice(0, 10)}
                />
                <View style={s.wrap}>
                  <Button
                    title="Make assignment"
                    kind="secondary"
                    onPress={() => go("assignments")}
                  />
                  <Button
                    title="Make test"
                    kind="secondary"
                    onPress={() => go("assessments")}
                  />
                  <Button
                    title="Make announcement"
                    kind="secondary"
                    onPress={() => go("announcements")}
                  />
                  <Button
                    title="Done with it"
                    kind="quiet"
                    onPress={() =>
                      void act((e) =>
                        e.save("inbox", { ...item, status: "Filed" }),
                      )
                    }
                  />
                  <Button
                    title="Delete"
                    kind="quiet"
                    onPress={() => void act((e) => e.repo.remove("inbox", item.id))}
                  />
                </View>
              </View>
            ))
        ) : (
          <Empty text="Inbox clear." />
        )}
      </Card>
      {data.inbox.some((i) => i.status !== "New") && (
        <Card>
          <Text style={s.label}>FILED</Text>
          {data.inbox
            .filter((i) => i.status !== "New")
            .slice(0, 20)
            .map((item) => (
              <ListRow
                key={item.id}
                title={item.text}
                subtitle={item.createdAt.slice(0, 10)}
                right={<Tag text="FILED" color={colors.muted} />}
              />
            ))}
        </Card>
      )}
    </>
  );
}
