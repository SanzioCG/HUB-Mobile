// Ekranlar uchun bo'laklar: sarlavha, eskiz, holat qatori.
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { usePairedSession } from '../session/SessionProvider';
import type { StatusTone } from '../api/types';
import { uz } from '../i18n/uz';
import { colors, fontSize, fonts, hit, radius, size, space } from '../theme';
import { Icon } from '../ui/Icon';
import { Dot, T } from './ui';

export const toneColor: Record<StatusTone, string> = {
  yellow: colors.yellow,
  green: colors.green,
  muted: colors.textMuted,
};

export function BackButton({ onPress = () => router.back() }: { onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={uz.common.back}
      hitSlop={space.sm}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
    >
      <Icon name="chevron-left" size={size.icon} color={colors.text} />
    </Pressable>
  );
}

export function Header({ title, meta, right }: { title: string; meta?: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      <BackButton />
      <View style={styles.headerText}>
        <T style={styles.headerTitle} numberOfLines={1}>
          {title}
        </T>
        {meta}
      </View>
      {right}
    </View>
  );
}

export function Thumb({ uri }: { uri: string | null }) {
  // Eskiz (`thumb_url`) yo'q — `cabinet` ikonkasi `surface` fonda (M-A6).
  if (!uri)
    return (
      <View style={[styles.thumb, styles.thumbEmpty]}>
        <Icon name="cabinet" size={size.icon + 4} color={colors.textMuted} />
      </View>
    );
  return <AuthImage uri={uri} />;
}

/**
 * Server eskizi: kontrakt 4 — server fayllari ham `Authorization: Bearer <device_token>` bilan (U-HUB V-1
 * `/mobile/files/*` tokensiz 401 qaytaradi). Yuklanmasa — ikonka.
 */
function AuthImage({ uri }: { uri: string }) {
  const token = usePairedSession()?.token;
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <View style={[styles.thumb, styles.thumbEmpty]}>
        <Icon name="cabinet" size={size.icon + 4} color={colors.textMuted} />
      </View>
    );
  return (
    <Image
      source={{ uri, ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}) }}
      style={styles.thumb}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}

export function StatusLine({ tone, label }: { tone: StatusTone; label: string }) {
  return (
    <View style={styles.status}>
      <Dot color={toneColor[tone]} />
      <T muted>{label}</T>
    </View>
  );
}

/** Ixcham holat chipi (sarlavhada, kartada): nuqta + rangli matn. */
export function StatusPill({ tone, label }: { tone: StatusTone; label: string }) {
  return (
    <View style={styles.pill} accessibilityRole="text" accessibilityLabel={label}>
      <Dot color={toneColor[tone]} />
      <T style={[styles.pillText, { color: toneColor[tone] }]} numberOfLines={1}>
        {label}
      </T>
    </View>
  );
}

export const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.sm,
    minHeight: hit + space.md,
  },
  headerText: { flex: 1, gap: space.xxs },
  headerTitle: { fontFamily: fonts.semibold, fontSize: fontSize.lg, color: colors.text },
  iconButton: {
    width: hit,
    height: hit,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: colors.raised },
  thumb: { width: size.thumb, height: size.thumb, borderRadius: radius.sm, backgroundColor: colors.surface },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  status: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space.xs + 2,
    paddingHorizontal: space.sm + 2,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillText: { fontFamily: fonts.medium, fontSize: fontSize.label },
});
