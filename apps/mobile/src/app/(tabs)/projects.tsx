// Loyihalar tabi — Figma 06 Mobile Viewer, "03 — Welcome / Start Screen" (141:2): brend sarlavhasi, "Loyihani oching",
// ikki amal (QR skaner — laym; `.uhub` fayli), so'nggi loyihalar (serverdan, oxirgi o'zgarish bo'yicha) va "BARCHASI"
// (to'liq ro'yxat — `/projects/all`), pastda maxfiylik izohi va versiya.
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { errorMessage } from '../../api/errors';
import { useProjectList } from '../../api/hooks';
import { statusLabel, statusTone, type ProjectSummary } from '../../api/types';
import { ProjectThumb, toneColor } from '../../components/parts';
import { ErrorState, Skeleton, T } from '../../components/ui';
import { uz } from '../../i18n/uz';
import { colors, fonts, radius } from '../../theme';
import { Icon, type IconName } from '../../ui/Icon';
import { relativeTime } from '../../utils/time';

const RECENT = 3;
const version = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '';

export default function HomeScreen() {
  const { state, refreshing, reload, refresh } = useProjectList();
  const recent = useMemo(
    () =>
      state.status === 'ok'
        ? [...state.data].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, RECENT)
        : [],
    [state],
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.textMuted} />
        }
      >
        <View style={styles.brand}>
          <T style={styles.wordmark}>U-HUB</T>
          <T style={styles.product}>{uz.brand.product}</T>
        </View>
        <View style={styles.divider} />

        <T style={styles.title} accessibilityRole="header">
          {uz.home.title}
        </T>
        <T style={styles.lead}>{uz.home.lead}</T>

        <Action
          primary
          icon="qr-scan"
          title={uz.home.scanTitle}
          hint={uz.home.scanHint}
          onPress={() => router.push('/scan')}
        />
        <Action
          icon="file-open"
          title={uz.home.fileTitle}
          hint={uz.home.fileHint}
          onPress={() => router.push('/files')}
        />

        <View style={styles.recentHead}>
          <T style={styles.recentTitle}>{uz.home.recent}</T>
          {state.status === 'ok' && state.data.length > 0 && (
            <Pressable onPress={() => router.push('/projects/all')} accessibilityRole="button" hitSlop={12}>
              <T style={styles.seeAll}>{uz.home.seeAll}</T>
            </Pressable>
          )}
        </View>
        {state.status === 'loading' && <Skeleton height={112} style={styles.cardRadius} />}
        {state.status === 'error' && <ErrorState message={errorMessage(state.error)} onRetry={reload} />}
        {state.status === 'ok' && recent.length === 0 && <T style={styles.empty}>{uz.home.recentEmpty}</T>}
        <View style={styles.recentList}>
          {recent.map((p) => (
            <RecentCard key={String(p.id)} project={p} />
          ))}
        </View>

        <View style={styles.footer}>
          <View style={styles.divider} />
          <View style={styles.privacy}>
            <Icon name="secure-local" size={15} color={colors.textMuted} />
            <T style={styles.privacyText}>{uz.home.privacy}</T>
          </View>
          {version !== '' && <T style={styles.version}>{uz.home.footer(version)}</T>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Action({
  icon,
  title,
  hint,
  primary,
  onPress,
}: {
  icon: IconName;
  title: string;
  hint: string;
  primary?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.action,
        primary ? styles.actionPrimary : styles.actionSecondary,
        pressed && styles.pressed,
      ]}
    >
      <Icon name={icon} size={primary ? 28 : 26} color={primary ? colors.onAccent : colors.text} />
      <View style={styles.actionText}>
        <T style={[styles.actionTitle, primary && styles.actionTitlePrimary]}>{title}</T>
        <T style={[styles.actionHint, primary && styles.actionHintPrimary]}>{hint}</T>
      </View>
    </Pressable>
  );
}

function RecentCard({ project: p }: { project: ProjectSummary }) {
  return (
    <Pressable
      onPress={() => router.push(`/projects/${p.id}`)}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <ProjectThumb uri={p.thumb_url} />
      <View style={styles.cardText}>
        <T style={styles.cardName} numberOfLines={1}>
          {p.name}
        </T>
        <T style={styles.cardDetail} numberOfLines={1}>
          № {p.number} · {uz.projects.items(p.items_count)} · {relativeTime(p.updated_at)}
        </T>
        <View style={styles.status}>
          <View style={[styles.statusDot, { backgroundColor: toneColor[statusTone(p.status)] }]} />
          <T style={styles.cardDetail}>{statusLabel(p.status)}</T>
        </View>
      </View>
    </Pressable>
  );
}

// O'lchamlar — Figma 141:2 (390 × 844, chetlar 24).
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 28 },
  brand: { gap: 1 },
  wordmark: { fontFamily: fonts.semibold, fontSize: 22, color: colors.text },
  product: { fontFamily: fonts.semibold, fontSize: 10, color: colors.accent },
  divider: { height: 1, backgroundColor: colors.border, marginTop: 24 },
  title: { marginTop: 31, fontFamily: fonts.semibold, fontSize: 25, color: colors.text },
  lead: { marginTop: 8, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.textMuted },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: radius.md,
    paddingHorizontal: 20,
  },
  actionPrimary: { marginTop: 23, minHeight: 82, backgroundColor: colors.accent },
  actionSecondary: {
    marginTop: 14,
    minHeight: 72,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionText: { flex: 1, gap: 4 },
  actionTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  actionTitlePrimary: { fontSize: 16, color: colors.onAccent },
  actionHint: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  actionHintPrimary: { fontFamily: fonts.medium, color: '#2E381A' },
  pressed: { opacity: 0.85 },
  recentHead: {
    marginTop: 37,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  seeAll: { fontFamily: fonts.semibold, fontSize: 10, color: colors.accent, letterSpacing: 0.5 },
  recentList: { gap: 10 },
  empty: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  cardRadius: { borderRadius: radius.md },
  card: {
    flexDirection: 'row',
    gap: 14,
    padding: 14,
    minHeight: 112,
    borderRadius: radius.md,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPressed: { backgroundColor: colors.surface },
  cardText: { flex: 1, paddingTop: 6, gap: 6 },
  cardName: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  cardDetail: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },
  status: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  footer: { marginTop: 'auto', paddingTop: 32, paddingBottom: 16 },
  privacy: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  privacyText: { flex: 1, fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },
  version: {
    marginTop: 14,
    textAlign: 'center',
    fontFamily: fonts.medium,
    fontSize: 9,
    color: colors.faint,
    letterSpacing: 0.5,
  },
});
