// Barcha loyihalar (bosh ekrandagi "BARCHASI") — Figma 06 Mobile Viewer, "08 — Recent Projects" (152:82):
// sarlavha, qidiruv, loyihalar qatorlari ("OCHISH"), shu qurilmadagi modellar (oflayn kesh), "Fayldan loyiha ochish".
// Ro'yxat — ulangan serverdan (kontrakt 4); pull-to-refresh.
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { errorMessage } from '../../api/errors';
import { useProjectList } from '../../api/hooks';
import { filterProjects } from '../../api/projects';
import { statusLabel } from '../../api/types';
import { ListRow, ScreenTitle, SectionLabel, WideButton } from '../../components/screen';
import { ErrorState, SkeletonList, T } from '../../components/ui';
import { uz } from '../../i18n/uz';
import { cacheUsage } from '../../offline/glbCache';
import { formatMb } from '../../offline/policy';
import { colors, fonts } from '../../theme';
import { Icon } from '../../ui/Icon';
import { relativeTime } from '../../utils/time';

export default function AllProjectsScreen() {
  const { state, refreshing, reload, refresh } = useProjectList();
  const [query, setQuery] = useState('');
  const [usage, setUsage] = useState<{ count: number; bytes: number } | null>(null);
  useFocusEffect(
    useCallback(() => {
      void cacheUsage().then(setUsage, () => setUsage(null));
    }, []),
  );

  const visible = useMemo(
    () => (state.status === 'ok' ? filterProjects(state.data, query, 'all') : []),
    [state, query],
  );
  const t = uz.allUi;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.textMuted} />
        }
      >
        <ScreenTitle back title={t.title} subtitle={t.subtitle} />

        <View style={styles.search}>
          <Icon name="search" size={16} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t.search}
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            autoCorrect={false}
            clearButtonMode="while-editing"
            accessibilityLabel={t.search}
          />
        </View>

        <SectionLabel style={styles.sectionGap}>{t.section}</SectionLabel>
        {state.status === 'loading' && <SkeletonList rows={3} />}
        {state.status === 'error' && <ErrorState message={errorMessage(state.error)} onRetry={reload} />}
        {state.status === 'ok' && (
          <View style={styles.list}>
            {visible.length === 0 && (
              <T style={styles.empty}>{state.data.length ? uz.projects.emptySearch : uz.projects.empty}</T>
            )}
            {visible.map((p) => (
              <ListRow
                key={String(p.id)}
                title={p.name}
                detail={`№ ${p.number}  •  ${uz.projects.items(p.items_count)}  •  ${relativeTime(p.updated_at)}  •  ${statusLabel(p.status)}`}
                tag={t.open}
                onPress={() => router.push(`/projects/${p.id}`)}
              />
            ))}
          </View>
        )}

        {usage !== null && (
          <View style={styles.device}>
            <T style={styles.deviceLabel}>{t.device}</T>
            <T style={styles.deviceValue}>{t.deviceValue(usage.count, formatMb(usage.bytes))}</T>
          </View>
        )}
        <T style={styles.note}>{t.deviceNote}</T>

        <WideButton label={t.openFile} onPress={() => router.push('/files')} style={styles.openFile} />
      </ScrollView>
    </SafeAreaView>
  );
}

// O'lchamlar — Figma 152:82 (chetlar 24).
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },
  search: {
    marginTop: 14,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    borderRadius: 9,
    backgroundColor: colors.tabBar,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, height: 44, color: colors.text, fontFamily: fonts.regular, fontSize: 13 },
  sectionGap: { marginTop: 24, marginBottom: 6 },
  list: { gap: 10 },
  empty: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  device: {
    marginTop: 36,
    minHeight: 66,
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 16,
    borderRadius: 9,
    backgroundColor: colors.tabBar,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deviceLabel: { fontFamily: fonts.semibold, fontSize: 10, color: colors.textMuted, letterSpacing: 0.3 },
  deviceValue: { fontFamily: fonts.medium, fontSize: 13, color: colors.text },
  note: { marginTop: 20, fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },
  openFile: { marginTop: 48 },
});
