import React from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Task } from "../domain/types";
import { colors, styles as s } from "./theme";
import { Icon, Progress } from "./components";
import { duration, dateKey } from "../domain/time";
import { remaining } from "../domain/priority";
export function TaskRow({ task, time }: { task: Task; time?: string }) {
  const router = useRouter(),
    done = task.status === "Completed";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${task.title}`}
      onPress={() =>
        router.push({ pathname: "/task/[id]", params: { id: task.id } })
      }
      style={({ pressed }) => [
        s.row,
        {
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderColor: colors.border,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <View
        style={{
          width: 25,
          height: 25,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: done ? colors.accent : colors.border,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: done ? colors.accent + "15" : "transparent",
        }}
      >
        {done && <Icon name="check" size={14} color={colors.accent} />}
      </View>
      <View style={{ flex: 1, gap: 5 }}>
        <Text
          style={[
            s.text,
            {
              fontSize: 14,
              textDecorationLine: done ? "line-through" : "none",
              color: done ? colors.muted : colors.text,
            },
          ]}
        >
          {task.title}
        </Text>
        <View style={[s.row, { gap: 7 }]}>
          <View
            style={{
              width: 5,
              height: 5,
              borderRadius: 3,
              backgroundColor: colors[task.lifeArea],
            }}
          />
          <Text
            style={[s.muted, { fontSize: 11, textTransform: "capitalize" }]}
          >
            {task.lifeArea} · {time ?? task.status}
          </Text>
          {task.deadline && task.deadline < dateKey() && !done && (
            <Text style={{ color: colors.fitness, fontSize: 10 }}>Overdue</Text>
          )}
        </View>
        {task.progress > 0 && !done && (
          <Progress value={task.progress} color={colors[task.lifeArea]} />
        )}
      </View>
      <Text style={s.muted}>{duration(remaining(task))}</Text>
      <Icon name="chevron-right" size={15} />
    </Pressable>
  );
}
