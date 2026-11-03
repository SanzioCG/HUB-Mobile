// Umumiy UI bo'laklari. Rang va o'lchamlar faqat theme.ts dan.
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { colors, fontSize, fonts, hit, radius, size, space } from '../theme';
import { uz } from '../i18n/uz';

export function T({ style, mono, muted, ...rest }: TextProps & { mono?: boolean; muted?: boolean }) {
  return <Text {...rest} style={[styles.text, mono && styles.mono, muted && styles.muted, style]} />;
}

export function Dot({ color }: { color: string }) {
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  /** Rangli urg'u faqat asosiy amal uchun. */
  primary?: boolean;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
  right?: ReactNode;
};

export function Button({ label, primary, active, disabled, style, right, ...rest }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        primary && styles.buttonPrimary,
        active && styles.buttonActive,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      <T style={[styles.buttonText, (active || primary) && styles.buttonTextStrong]}>{label}</T>
      {right}
    </Pressable>
  );
}

/** Segment: faol — och fon + oq qalin matn. */
export function Segmented<K extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { key: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
}) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.key)}
            style={[styles.segmentItem, on && styles.segmentItemOn]}
          >
            <T style={[styles.segmentText, on && styles.buttonTextStrong]}>{o.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Skeleton({ height = size.thumb, style }: { height?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.skeleton, { height }, style]} />;
}

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} />
      ))}
    </View>
  );
}

export function Centered({ children }: { children: ReactNode }) {
  return <View style={styles.centered}>{children}</View>;
}

export function EmptyState({ text }: { text: string }) {
  return (
    <Centered>
      <T muted>{text}</T>
    </Centered>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Centered>
      <T style={styles.errorText}>{message}</T>
      {onRetry && <Button label={uz.common.retry} onPress={onRetry} style={styles.retry} />}
    </Centered>
  );
}

export function Spinner() {
  return <ActivityIndicator color={colors.textMuted} />;
}

export const styles = StyleSheet.create({
  text: { color: colors.text, fontFamily: fonts.regular, fontSize: fontSize.md },
  mono: { fontFamily: fonts.mono },
  muted: { color: colors.textMuted, fontSize: fontSize.sm },
  dot: { width: size.dot, height: size.dot, borderRadius: size.dot / 2 },
  button: {
    minHeight: hit,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.panel2,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
  buttonPrimary: { backgroundColor: colors.accent },
  buttonActive: { backgroundColor: colors.active },
  buttonText: { fontFamily: fonts.medium, fontSize: fontSize.md },
  buttonTextStrong: { fontFamily: fonts.bold, color: colors.white },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    padding: space.xs,
    gap: space.xs,
  },
  segmentItem: {
    flex: 1,
    minHeight: hit - space.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  segmentItemOn: { backgroundColor: colors.active },
  segmentText: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.textMuted },
  skeleton: { backgroundColor: colors.panel, borderRadius: radius.md },
  list: { padding: space.lg, gap: space.sm },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.lg },
  errorText: { textAlign: 'center' },
  retry: { alignSelf: 'center' },
});
