import React from "react";
import { useLocalSearchParams } from "expo-router";
import { Shell } from "../../src/ui/Shell";
import { Heading, Empty } from "../../src/ui/components";
import { Academic } from "../../src/screens/Academic";
import { Learning } from "../../src/screens/Learning";
import { Habits } from "../../src/screens/Habits";
import { FreeTime } from "../../src/screens/FreeTime";
import { Fitness } from "../../src/screens/Fitness";
import { Diet } from "../../src/screens/Diet";
const titles: Record<string, [string, string]> = {
  academic: ["Academic", "Less mental clutter. More room to learn."],
  skills: ["Skills", "Build the person you want to become."],
  projects: ["Projects", "Give your ideas a place to grow."],
  free: ["Free Time", "Your open windows. Your choice."],
  habits: ["Habits", "Consistency has many colours."],
  fitness: ["Fitness", "Movement that fits into your life."],
  diet: ["Diet", "A little awareness, meal by meal."],
};
export default function Area() {
  const { area } = useLocalSearchParams<{ area: string }>();
  const title = titles[area];
  return (
    <Shell>
      <Heading title={title?.[0] ?? "Life"} subtitle={title?.[1]} />
      {area === "academic" ? (
        <Academic />
      ) : area === "skills" || area === "projects" ? (
        <Learning kind={area} />
      ) : area === "habits" ? (
        <Habits />
      ) : area === "free" ? (
        <FreeTime />
      ) : area === "fitness" ? (
        <Fitness />
      ) : area === "diet" ? (
        <Diet />
      ) : (
        <Empty text="This life area was not found." />
      )}
    </Shell>
  );
}
