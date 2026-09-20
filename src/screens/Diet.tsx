import React, { useState } from "react";
import { View, Text } from "react-native";
import { useLife } from "../state/store";
import { Card, Button, Editor, Tag, Progress, Empty } from "../ui/components";
import { styles as s, colors } from "../ui/theme";
import { uid, dateKey } from "../domain/time";
export function Diet() {
  const { data, act } = useLife(),
    [edit, setEdit] = useState<any>(null);
  const today = dateKey(),
    meals = data.meals.filter((m) => m.date === today);
  const total = (key: "calories" | "protein" | "carbs" | "fat") =>
    meals.reduce((n, m) => n + m[key], 0);
  const water = data.habits.find((h) => h.unit === "glasses");
  const glasses =
    data.habitLogs.find((l) => l.habitId === water?.id && l.date === today)
      ?.value ?? 0;
  return (
    <>
      <Card>
        <Tag text="FUEL YOUR EVERYDAY" color={colors.diet} />
        <Text style={{ fontSize: 46, fontWeight: "500", color: colors.text }}>
          {Math.round(total("calories"))}
          <Text style={s.muted}> / {data.settings.calories} kcal</Text>
        </Text>
        <Progress
          value={(total("calories") / data.settings.calories) * 100}
          color={colors.diet}
        />
        <Text style={s.muted}>
          {Math.max(0, data.settings.calories - total("calories"))} kcal
          remaining
          {total("calories") > data.settings.calories
            ? ` · ${total("calories") - data.settings.calories} above target`
            : ""}
        </Text>
        <View style={s.grid}>
          {(["protein", "carbs", "fat"] as const).map((k) => (
            <View key={k} style={{ flex: 1, gap: 8, minWidth: 80 }}>
              <Text style={[s.label, { textTransform: "uppercase" }]}>{k}</Text>
              <Text style={s.text}>
                {Math.round(total(k))} / {data.settings[k]} g
              </Text>
              <Progress
                value={(total(k) / data.settings[k]) * 100}
                color={colors.diet}
              />
            </View>
          ))}
        </View>
      </Card>
      <View style={s.wrap}>
        <Button
          title="Log food"
          icon="plus"
          onPress={() =>
            setEdit({
              id: uid(),
              date: today,
              title: "",
              mealType: "Breakfast",
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0,
            })
          }
        />
        <Button
          title={`Water · ${glasses}/${data.settings.water} glasses · +1`}
          kind="secondary"
          onPress={() =>
            void act(async (e) => {
              let id = water?.id;
              if (!id) {
                id = uid();
                await e.save("habits", {
                  id,
                  title: "Water",
                  type: "counter",
                  target: data.settings.water,
                  unit: "glasses",
                  duration: 0,
                  startDate: today,
                });
              }
              await e.logHabit(id, glasses + 1);
            })
          }
        />
      </View>
      <Card>
        <Text style={s.h2}>Today’s meals</Text>
        <Text style={s.muted}>
          Log any food, in your own words. Use nutrition values for your
          portion.
        </Text>
        {meals.map((m) => (
          <View key={m.id} style={[s.row, { justifyContent: "space-between" }]}>
            <View style={s.grow}>
              <Text style={s.text}>{m.title}</Text>
              <Text style={s.muted}>
                {m.mealType} · {m.calories} kcal · {m.protein}g protein
              </Text>
            </View>
            <Button title="Edit meal" kind="quiet" onPress={() => setEdit(m)} />
          </View>
        ))}
        {!meals.length && (
          <Empty text="Idli and sambar, a home-cooked lunch, your favourite snack — start with your first meal." />
        )}
      </Card>
      <Card>
        <Text style={s.h2}>Recent food history</Text>
        {data.meals
          .filter((m) => m.date !== today)
          .slice()
          .reverse()
          .slice(0, 12)
          .map((m) => (
            <Button
              key={m.id}
              title={`${m.date} · ${m.title} · ${m.calories} kcal`}
              kind="quiet"
              onPress={() => setEdit(m)}
            />
          ))}
        {!data.meals.some((m) => m.date !== today) && (
          <Text style={s.muted}>Earlier meals will appear here.</Text>
        )}
      </Card>
      {edit && (
        <Editor
          title="Food log"
          initial={edit}
          fields={[
            { key: "title", label: "Food & portion (e.g. 3 idli + sambar)" },
            { key: "date", label: "Date" },
            {
              key: "mealType",
              label: "Meal",
              options: ["Breakfast", "Lunch", "Snacks", "Dinner"],
            },
            { key: "calories", label: "Calories · kcal", type: "number" },
            { key: "protein", label: "Protein · g", type: "number" },
            { key: "carbs", label: "Carbohydrates · g", type: "number" },
            { key: "fat", label: "Fat · g", type: "number" },
          ]}
          onSave={(v) =>
            act((e) => {
              const row: any = { ...edit, ...v };
              for (const k of ["calories", "protein", "carbs", "fat"]) {
                row[k] = Number(v[k]);
                if (!Number.isFinite(row[k]) || row[k] < 0)
                  throw new Error("Nutrition values must be zero or more.");
              }
              return e.save("meals", row);
            })
          }
          onDelete={() => act((e) => e.repo.remove("meals", edit.id))}
          onClose={() => setEdit(null)}
        />
      )}
    </>
  );
}
