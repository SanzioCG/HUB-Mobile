// Figma 06 Mobile Viewer (07–11) ekranlarining umumiy bo'laklari: sarlavha + izoh, bo'lim yorlig'i ("RECENT FILES"),
// qator kartasi (342 × 66: nom, izoh, o'ngda laym teg), keng tugma (laym yoki kulrang).
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts } from '../theme';
import { BackButton } from './parts';
import { T } from './ui';

/** Sarlavha (21 px) va izoh (12 px); `back` — chapda orqaga tugmasi (stack ekrani). */
export function ScreenTitle({
  title,
  subtitle,
  back,
  onBack,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  /** Orqaga — o'z amali (berilmasa router.back). */
  onBack?: () => void;
}) {
  return (
    <View style={styles.titleRow}>
      {back && (onBack ? <BackButton onPress={onBack} /> : <BackButton />)}
      <View style={styles.titleText}>
        <T style={styles.title} accessibilityRole="header" numberOfLines={1}>
          {title}
        </T>
        {subtitle !== undefined && (
          <T style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </T>
        )}
      </View>
    </View>
  );
}

export function SectionLabel({ children, style }: { children: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style}>
      <T style={styles.section}>{children}</T>
    </View>
  );
}

export function ListRow({
  title,
  detail,
  tag,
  onPress,
  onLongPress,
  children,
}: {
  title: string;
  detail?: string;
  tag?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  children?: ReactNode;
}) {
  const body = (
    <>
      <View style={styles.rowText}>
        <T style={styles.rowTitle} numberOfLines={1}>
          {title}
        </T>
        {detail !== undefined && (
          <T style={styles.rowDetail} numberOfLines={2}>
            {detail}
          </T>
        )}
        {children}
      </View>
      {tag !== undefined && <T style={styles.rowTag}>{tag}</T>}
    </>
  );
  if (!onPress) return <View style={styles.row}>{body}</View>;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {body}
    </Pressable>
  );
}

export function WideButton({
  label,
  onPress,
  primary,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.buttonPrimary : styles.buttonSecondary,
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      <T style={primary ? styles.buttonPrimaryLabel : styles.buttonLabel}>{label}</T>
    </Pressable>
  );
}

// O'lchamlar — Figma 152:59, 152:82, 152:132, 152:159.
const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleText: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.semibold, fontSize: 21, color: colors.text },
  subtitle: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  section: { fontFamily: fonts.semibold, fontSize: 10, color: colors.textMuted, letterSpacing: 0.3 },
  row: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9,
    backgroundColor: colors.tabBar,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowPressed: { backgroundColor: colors.surface },
  rowText: { flex: 1, gap: 4 },
  rowTitle: { fontFamily: fonts.medium, fontSize: 13, color: colors.text },
  rowDetail: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },
  rowTag: { maxWidth: 110, textAlign: 'right', fontFamily: fonts.medium, fontSize: 11, color: colors.accent },
  button: {
    minHeight: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonPrimary: { backgroundColor: colors.accent },
  buttonSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  buttonPrimaryLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.onAccent },
  buttonLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
});
