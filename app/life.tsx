import React from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Shell } from "../src/ui/Shell";
import { Heading, Icon, Tag } from "../src/ui/components";
import { colors, styles as s } from "../src/ui/theme";
import { useLife } from "../src/state/store";
export default function Life() {
  const router = useRouter(),
    data = useLife((x) => x.data);
  const areas = [
    {
      id: "academic",
      title: "Academic",
      icon: "book-open",
      subtitle: "Your semester, in perspective.",
      stat: `${data.subjects.length} subjects`,
    },
    {
      id: "skills",
      title: "Skills",
      icon: "code",
      subtitle: "Stay curious. Keep building.",
      stat: `${data.skills.length} learning paths`,
    },
    {
      id: "projects",
      title: "Projects",
      icon: "box",
      subtitle: "From a spark to something real.",
      stat: `${data.projects.length} projects`,
    },
    {
      id: "free",
      title: "Free Time",
      icon: "wind",
      subtitle: "Find room for what matters.",
      stat: "Your available windows",
    },
    {
      id: "fitness",
      title: "Fitness",
      icon: "activity",
      subtitle: "Show up for yourself.",
      stat: `${data.workouts.length} workout plans`,
    },
    {
      id: "diet",
      title: "Diet",
      icon: "coffee",
      subtitle: "Fuel your everyday.",
      stat: `${data.settings.calories} kcal daily target`,
    },
    {
      id: "habits",
      title: "Habits",
      icon: "heart",
      subtitle: "Small actions, steady change.",
      stat: `${data.habits.length} daily intentions`,
    },
  ];
  return (
    <Shell>
      <Heading
        title="A life with many sides."
        subtitle="One place to bring them all together."
      />
      <View style={s.grid}>
        {areas.map((a) => (
          <Pressable
            key={a.id}
            accessibilityRole="button"
            accessibilityLabel={`Open ${a.title}`}
            onPress={() =>
              router.push({ pathname: "/area/[area]", params: { area: a.id } })
            }
            style={({ pressed }) => [
              s.card,
              {
                flexGrow: 1,
                flexBasis: 300,
                minHeight: 200,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <View
                style={{
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor:
                    (colors[a.id as keyof typeof colors] ?? colors.personal) +
                    "15",
                }}
              >
                <Icon
                  name={a.icon as any}
                  color={colors[a.id as keyof typeof colors] ?? colors.personal}
                  size={24}
                />
              </View>
              <Icon name="arrow-up-right" size={18} />
            </View>
            <Text style={[s.h2, { fontSize: 24 }]}>{a.title}</Text>
            <Text style={s.muted}>{a.subtitle}</Text>
            <Tag
              text={a.stat.toUpperCase()}
              color={colors[a.id as keyof typeof colors] ?? colors.personal}
            />
          </Pressable>
        ))}
      </View>
    </Shell>
  );
}
