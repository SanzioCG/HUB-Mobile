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
import { illustrations } from '../ui/generated';
import { Icon, type IconName } from '../ui/Icon';

export function T({ style, mono, muted, ...rest }: TextProps & { mono?: boolean; muted?: boolean }) {
  return <Text {...rest} style={[styles.text, mono && styles.mono, muted && styles.muted, style]} />;
}

export function Dot({ color }: { color: string }) {
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  /** Laym urg'u faqat asosiy amal uchun (ekranda bittadan ko'p emas). */
  primary?: boolean;
  /** Qaytarib bo'lmaydigan amal (tozalash, uzish): qizil matn, oddiy fon. */
  danger?: boolean;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
  /** M-A6: tugma ikonkasi (chapda). */
  icon?: IconName;
  right?: ReactNode;
};

export function Button({
  label,
  primary,
  danger,
  active,
  disabled,
  style,
  icon,
  right,
  ...rest
}: ButtonProps) {
  const fg = primary ? colors.onAccent : active ? colors.accent : danger ? colors.danger : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        primary && styles.buttonPrimary,
        active && styles.buttonActive,
        danger && styles.buttonDanger,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {icon && <Icon name={icon} size={size.icon - 2} color={fg} />}
      <T
        style={[styles.buttonText, { color: fg }, (active || primary) && styles.buttonTextStrong]}
        numberOfLines={1}
      >
        {label}
      </T>
      {right}
    </Pressable>
  );
}

/**
 * M-A6: pastki panel tugmasi — ikonka ustida, ostida bir qatorli yorliq (tor ekranda matn harfma-harf bo'linmasin).
 */
export function BarButton({
  icon,
  label,
  active,
  disabled,
  onPress,
}: {
  icon: IconName;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.barButton,
        active && styles.barButtonActive,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Icon name={icon} size={size.icon} color={active ? colors.accent : colors.text} />
      <T
        style={[styles.barLabel, active && styles.barLabelActive]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {label}
      </T>
    </Pressable>
  );
}

/** Segment: faol — ko'tarilgan fon + laym qalin matn. */
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
            <T style={[styles.segmentText, on && styles.segmentTextOn]} numberOfLines={1}>
              {o.label}
            </T>
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

/** Bo'sh holat; `illustration` — assets/illustrations (M-A6). */
export function EmptyState({
  text,
  illustration,
}: {
  text: string;
  illustration?: keyof typeof illustrations;
}) {
  const Art = illustration ? illustrations[illustration] : null;
  return (
    <Centered>
      {Art && <Art size={size.illustration} />}
      <T muted style={styles.emptyText}>
        {text}
      </T>
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
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
  buttonPrimary: { backgroundColor: colors.accent },
  buttonActive: { backgroundColor: colors.accentSoft },
  buttonDanger: { backgroundColor: colors.surface },
  buttonText: { fontFamily: fonts.medium, fontSize: fontSize.md, flexShrink: 1 },
  barButton: {
    flex: 1,
    minHeight: hit + space.sm,
    paddingVertical: space.xs,
    paddingHorizontal: space.xs,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxs,
  },
  barButtonActive: { backgroundColor: colors.accentSoft },
  barLabel: { fontFamily: fonts.medium, fontSize: fontSize.label, color: colors.textMuted },
  barLabelActive: { color: colors.accent },
  emptyText: { textAlign: 'center' },
  buttonTextStrong: { fontFamily: fonts.semibold },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.4 },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.xxs,
    gap: space.xxs,
  },
  segmentItem: {
    flex: 1,
    minHeight: hit - space.xs,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  segmentItemOn: { backgroundColor: colors.raised },
  segmentText: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.textMuted },
  segmentTextOn: { fontFamily: fonts.semibold, color: colors.accent },
  skeleton: { backgroundColor: colors.panel, borderRadius: radius.md },
  list: { padding: space.lg, gap: space.sm },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.lg },
  errorText: { textAlign: 'center' },
  retry: { alignSelf: 'center' },
});
