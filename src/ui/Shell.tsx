import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, styles as s } from "./theme";
import { Icon } from "./components";
import { useLife } from "../state/store";
const nav = [
  { path: "/", title: "Today", icon: "grid" },
  { path: "/calendar", title: "Calendar", icon: "calendar" },
  { path: "/capture", title: "Capture", icon: "plus" },
  { path: "/life", title: "Life", icon: "layers" },
  { path: "/me", title: "Me", icon: "user" },
] as const;
export function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter(),
    path = usePathname(),
    wide = useWindowDimensions().width > 850,
    insets = useSafeAreaInsets();
  const { data, message, error, dismiss } = useLife();
  return (
    <View
      style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}
    >
      <View
        style={{
          borderBottomWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: wide ? 40 : 22,
          height: 72,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="LifeOS home"
          onPress={() => router.push("/")}
          style={s.row}
        >
          <View
            style={{
              width: 30,
              height: 30,
              backgroundColor: colors.accent,
              borderRadius: 9,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="command" color={colors.bg} size={19} />
          </View>
          <Text
            style={{
              fontWeight: "800",
              fontSize: 20,
              color: colors.text,
              letterSpacing: 2,
            }}
          >
            LIFE
            <Text style={{ color: colors.muted, fontWeight: "400" }}>OS</Text>
          </Text>
        </Pressable>
        {wide && (
          <Text style={s.muted}>A little structure. More room for life.</Text>
        )}
        <View style={s.row}>
          <View
            style={{
              height: 6,
              width: 6,
              borderRadius: 3,
              backgroundColor: colors.accent,
            }}
          />
          <Text style={[s.muted, { fontSize: 11 }]}>
            {data.settings.demo ? "DEMO · LOCAL" : "SAVED LOCALLY"}
          </Text>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={{
          padding: wide ? 36 : 20,
          paddingBottom: 28,
          width: "100%",
          maxWidth: 1180,
          alignSelf: "center",
          gap: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {(error || message) && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss message"
            onPress={dismiss}
            style={{
              padding: 13,
              borderRadius: 12,
              backgroundColor: error ? "#40282C" : "#283020",
            }}
          >
            <Text
              accessibilityRole={error ? "alert" : undefined}
              style={{ color: error ? "#FFB4B4" : colors.accent, fontSize: 13 }}
            >
              {error || message} ×
            </Text>
          </Pressable>
        )}
        {children}
        <Text
          style={[
            s.muted,
            { textAlign: "center", fontSize: 11, marginTop: 16 },
          ]}
        >
          PLAN → DO → ADJUST
        </Text>
      </ScrollView>
      <View
        style={{
          backgroundColor: "#17191B",
          borderTopWidth: 1,
          borderColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            maxWidth: 650,
            width: "100%",
            alignSelf: "center",
          }}
        >
          {nav.map((n) => {
            const selected =
              n.path === "/"
                ? path === "/"
                : path.startsWith(n.path) ||
                  (n.path === "/life" &&
                    (path.startsWith("/area") || path.startsWith("/subject")));
            return (
              <Pressable
                key={n.path}
                accessibilityRole="button"
                accessibilityLabel={n.title}
                accessibilityState={{ selected }}
                onPress={() => router.push(n.path)}
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  minHeight: 52,
                }}
              >
                <View
                  style={
                    n.icon === "plus"
                      ? {
                          backgroundColor: colors.accent,
                          width: 44,
                          height: 38,
                          borderRadius: 13,
                          alignItems: "center",
                          justifyContent: "center",
                        }
                      : {}
                  }
                >
                  <Icon
                    name={n.icon}
                    color={
                      n.icon === "plus"
                        ? colors.bg
                        : selected
                          ? colors.accent
                          : colors.muted
                    }
                    size={21}
                  />
                </View>
                <Text
                  style={{
                    color: selected ? colors.accent : colors.muted,
                    fontSize: 10,
                    fontWeight: "600",
                  }}
                >
                  {n.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
