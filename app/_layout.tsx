import React, { useEffect } from "react";
import { View, Text } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useLife } from "../src/state/store";
import { Button, Loading } from "../src/ui/components";
import { colors, styles } from "../src/ui/theme";
export default function Root() {
  const { initialize, ready, error, tick } = useLife();
  useEffect(() => {
    void initialize();
    const timer = setInterval(tick, 30000);
    return () => clearInterval(timer);
  }, []);
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {ready ? (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        />
      ) : error ? (
        <View
          style={{
            flex: 1,
            backgroundColor: colors.bg,
            padding: 30,
            justifyContent: "center",
            gap: 20,
          }}
        >
          <Text style={styles.h2}>Your data needs a moment</Text>
          <Text style={styles.muted}>{error}</Text>
          <Button title="Try opening again" onPress={() => void initialize()} />
        </View>
      ) : (
        <Loading />
      )}
    </SafeAreaProvider>
  );
}
