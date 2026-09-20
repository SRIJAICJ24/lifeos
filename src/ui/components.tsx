import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, styles as s } from "./theme";
import { useLife } from "../state/store";
export const Icon = ({
  name,
  size = 20,
  color = colors.muted,
}: {
  name: React.ComponentProps<typeof Feather>["name"];
  size?: number;
  color?: string;
}) => <Feather name={name} size={size} color={color} />;
export const Card = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) => <View style={[s.card, style]}>{children}</View>;
export const Heading = ({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) => (
  <View style={[s.row, { justifyContent: "space-between", marginBottom: 4 }]}>
    <View style={s.grow}>
      <Text style={s.title}>{title}</Text>
      {subtitle && <Text style={[s.muted, { marginTop: 8 }]}>{subtitle}</Text>}
    </View>
    {right}
  </View>
);
export function Button({
  title,
  onPress,
  kind = "primary",
  icon,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  kind?: "primary" | "secondary" | "quiet" | "danger";
  icon?: React.ComponentProps<typeof Feather>["name"];
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor:
          kind === "primary"
            ? colors.accent
            : kind === "secondary"
              ? colors.raised
              : kind === "danger"
                ? "#40282C"
                : "transparent",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 13,
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
        minHeight: 44,
      })}
    >
      {icon && (
        <Icon
          name={icon}
          size={16}
          color={kind === "primary" ? colors.bg : colors.text}
        />
      )}
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color:
            kind === "primary"
              ? colors.bg
              : kind === "danger"
                ? "#FFB4B4"
                : colors.text,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export const Tag = ({
  text,
  color = colors.accent,
}: {
  text: string;
  color?: string;
}) => (
  <View
    style={{
      backgroundColor: color + "15",
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 7,
      alignSelf: "flex-start",
    }}
  >
    <Text
      style={{ color, fontSize: 10, fontWeight: "700", letterSpacing: 0.7 }}
    >
      {text}
    </Text>
  </View>
);
export const Progress = ({
  value,
  color = colors.accent,
}: {
  value: number;
  color?: string;
}) => (
  <View
    style={{
      height: 5,
      backgroundColor: colors.border,
      borderRadius: 4,
      overflow: "hidden",
    }}
  >
    <View
      style={{
        height: 5,
        width: `${Math.min(100, Math.max(0, value))}%`,
        backgroundColor: color,
        borderRadius: 4,
      }}
    />
  </View>
);
export const Empty = ({
  text = "A little space to start something.",
  action,
}: {
  text?: string;
  action?: React.ReactNode;
}) => (
  <View style={{ paddingVertical: 22, gap: 14 }}>
    <Icon name="sun" color={colors.accent} />
    <Text style={s.muted}>{text}</Text>
    {action}
  </View>
);
export function Choices({
  values,
  value,
  onChange,
}: {
  values: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={[s.wrap, { gap: 7 }]}>
      {values.map((v) => (
        <Pressable
          key={v}
          accessibilityRole="button"
          accessibilityState={{ selected: v === value }}
          onPress={() => onChange(v)}
          style={{
            paddingHorizontal: 13,
            paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: value === v ? colors.accent : colors.raised,
          }}
        >
          <Text
            style={{
              color: value === v ? colors.bg : colors.muted,
              fontSize: 12,
              fontWeight: "600",
            }}
          >
            {v || "None"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
export interface Field {
  key: string;
  label: string;
  type?: "number" | "multiline";
  options?: string[];
  placeholder?: string;
}
export function Editor({
  title,
  fields,
  initial,
  onSave,
  onClose,
  onDelete,
}: {
  title: string;
  fields: Field[];
  initial: Record<string, any>;
  onSave: (values: Record<string, string>) => Promise<boolean>;
  onClose: () => void;
  onDelete?: () => Promise<boolean>;
}) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(
      fields.map(({ key }) => [
        key,
        initial[key] == null ? "" : String(initial[key]),
      ]),
    ),
  );
  const [confirm, setConfirm] = useState(false);
  const busy = useLife((x) => x.busy),
    error = useLife((x) => x.error);
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "#000B",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <View
          style={{
            backgroundColor: colors.panel,
            borderRadius: 24,
            width: "100%",
            maxWidth: 560,
            maxHeight: "92%",
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View
            style={[s.row, { padding: 22, justifyContent: "space-between" }]}
          >
            <Text style={s.h2}>{title}</Text>
            <Button title="Close" kind="quiet" onPress={onClose} />
          </View>
          <ScrollView
            contentContainerStyle={{ padding: 22, paddingTop: 0, gap: 18 }}
            keyboardShouldPersistTaps="handled"
          >
            {fields.map((f) => (
              <View key={f.key} style={{ gap: 8 }}>
                <Text style={s.muted}>{f.label}</Text>
                {f.options ? (
                  <Choices
                    values={f.options}
                    value={values[f.key] ?? ""}
                    onChange={(v) => setValues({ ...values, [f.key]: v })}
                  />
                ) : (
                  <TextInput
                    accessibilityLabel={f.label}
                    style={[
                      s.input,
                      f.type === "multiline" && {
                        minHeight: 90,
                        textAlignVertical: "top",
                      },
                    ]}
                    value={values[f.key] ?? ""}
                    onChangeText={(v) => setValues({ ...values, [f.key]: v })}
                    keyboardType={f.type === "number" ? "numeric" : "default"}
                    multiline={f.type === "multiline"}
                    placeholder={f.placeholder}
                    placeholderTextColor={colors.muted}
                  />
                )}
              </View>
            ))}
            {error && (
              <Text accessibilityRole="alert" style={{ color: "#FFB4B4" }}>
                {error}
              </Text>
            )}
            <Button
              title={busy ? "Saving…" : "Save"}
              disabled={busy}
              onPress={() =>
                void onSave(values).then((ok) => {
                  if (ok) onClose();
                })
              }
            />
            {onDelete && (
              <Button
                title={confirm ? "Confirm delete" : "Delete"}
                kind="danger"
                disabled={busy}
                onPress={() =>
                  confirm
                    ? void onDelete().then((ok) => {
                        if (ok) onClose();
                      })
                    : setConfirm(true)
                }
              />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
export const Loading = () => (
  <View
    style={{
      flex: 1,
      backgroundColor: colors.bg,
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
    }}
  >
    <ActivityIndicator color={colors.accent} />
    <Text style={s.muted}>Opening your LifeOS…</Text>
  </View>
);
