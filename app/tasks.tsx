import React, { useState } from "react";
import { TextInput } from "react-native";
import { Shell } from "../src/ui/Shell";
import { Heading, Card, Choices, Empty, Button } from "../src/ui/components";
import { TaskRow } from "../src/ui/TaskRow";
import { useLife } from "../src/state/store";
import { styles, colors } from "../src/ui/theme";
import { useRouter } from "expo-router";
import { priority } from "../src/domain/priority";
import { dateKey } from "../src/domain/time";
export default function Tasks() {
  const data = useLife((s) => s.data),
    router = useRouter();
  const [filter, setFilter] = useState("Open"),
    [search, setSearch] = useState("");
  const rows = data.tasks
    .filter(
      (t) =>
        t.title.toLowerCase().includes(search.toLowerCase()) &&
        (filter === "All" || filter === "Completed"
          ? filter === "All" || t.status === "Completed"
          : filter === "Inbox"
            ? ["Inbox", "Not Started"].includes(t.status)
            : !["Completed", "Cancelled"].includes(t.status)),
    )
    .sort(
      (a, b) => priority(b, dateKey(), data) - priority(a, dateKey(), data),
    );
  return (
    <Shell>
      <Heading
        title="Everything on your mind."
        subtitle="One task list, across your whole life."
        right={
          <Button
            title="Add task"
            icon="plus"
            onPress={() => router.push("/capture")}
          />
        }
      />
      <Choices
        values={["Open", "Inbox", "Completed", "All"]}
        value={filter}
        onChange={setFilter}
      />
      <TextInput
        style={styles.input}
        accessibilityLabel="Search tasks"
        placeholder="Search your tasks"
        placeholderTextColor={colors.muted}
        value={search}
        onChangeText={setSearch}
      />
      <Card>
        {rows.map((t) => (
          <TaskRow key={t.id} task={t} />
        ))}
        {!rows.length && (
          <Empty text="Nothing here right now. A little less to carry." />
        )}
      </Card>
    </Shell>
  );
}
