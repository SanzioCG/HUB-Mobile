// Barcha loyihalar (bosh ekrandagi "BARCHASI"): logo + kompaniya holati, sarlavha, qidiruv (ikonkali), segment filtr,
// kartalar ro'yxati, pull-to-refresh. Figma 08 Recent Projects ko'rinishi — keyingi bosqich.
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { errorMessage } from '../../api/errors';
import { useProjectList } from '../../api/hooks';
import { filterProjects } from '../../api/projects';
import { statusLabel, statusTone, type ProjectSummary, type StatusFilter } from '../../api/types';
import { BackButton, StatusPill, Thumb } from '../../components/parts';
import { Dot, EmptyState, ErrorState, Segmented, SkeletonList, T } from '../../components/ui';
import { uz } from '../../i18n/uz';
import { Icon } from '../../ui/Icon';
import { usePairedSession } from '../../session/SessionProvider';
import { colors, fontSize, fonts, hit, radius, size, space } from '../../theme';
import { relativeTime } from '../../utils/time';

const FILTERS = [
  { key: 'all', label: uz.projects.filterAll },
  { key: 'approved', label: uz.projects.filterApproved },
  { key: 'unapproved', label: uz.projects.filterUnapproved },
] as const satisfies readonly { key: StatusFilter; label: string }[];

export default function AllProjectsScreen() {
  const session = usePairedSession();
  const { state, refreshing, online, reload, refresh } = useProjectList();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');

  const visible = useMemo(
    () => (state.status === 'ok' ? filterProjects(state.data, query, filter) : []),
    [state, query, filter],
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.top}>
        <View style={styles.brandRow}>
          <BackButton />
          <T style={styles.brand}>
            U-HUB <T style={styles.brandSub}>VIEWER</T>
          </T>
          <View style={styles.company}>
            <Dot color={online === false ? colors.yellow : colors.green} />
            <T style={styles.companyText} numberOfLines={1}>
              {online === false ? uz.projects.offline : session?.company.name}
            </T>
          </View>
        </View>
        <T style={styles.title} accessibilityRole="header">
          {uz.projects.title}
        </T>
        <View style={styles.search}>
          <Icon name="search" size={size.icon - 2} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={uz.projects.search}
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            autoCorrect={false}
            clearButtonMode="while-editing"
            accessibilityLabel={uz.projects.search}
          />
          {query !== '' && (
            <Pressable
              onPress={() => setQuery('')}
              accessibilityRole="button"
              accessibilityLabel={uz.common.close}
              hitSlop={space.sm}
            >
              <Icon name="x" size={size.icon - 4} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
        <Segmented options={FILTERS} value={filter} onChange={setFilter} />
      </View>

      {state.status === 'loading' && <SkeletonList />}
      {state.status === 'error' && <ErrorState message={errorMessage(state.error)} onRetry={reload} />}
      {state.status === 'ok' && (
        <FlatList
          data={visible}
          keyExtractor={(p) => String(p.id)}
          renderItem={({ item }) => <ProjectRow project={item} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.textMuted} />
          }
          ListEmptyComponent={
            <EmptyState
              text={state.data.length ? uz.projects.emptySearch : uz.projects.empty}
              illustration="empty-projects"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

function ProjectRow({ project: p }: { project: ProjectSummary }) {
  return (
    <Pressable
      onPress={() => router.push(`/projects/${p.id}`)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <Thumb uri={p.thumb_url} />
      <View style={styles.rowText}>
        <T mono style={styles.number}>
          № {p.number}
        </T>
        <T style={styles.name} numberOfLines={2}>
          {p.name}
        </T>
        <T muted numberOfLines={1}>
          {uz.projects.items(p.items_count)} · {relativeTime(p.updated_at)}
        </T>
      </View>
      <View style={styles.rowSide}>
        <StatusPill tone={statusTone(p.status)} label={statusLabel(p.status)} />
        <Icon name="chevron-right" size={size.icon - 4} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  top: { padding: space.lg, gap: space.md },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  brand: { flex: 1, fontFamily: fonts.bold, fontSize: fontSize.lg, color: colors.text, letterSpacing: 0.5 },
  brandSub: { fontFamily: fonts.medium, fontSize: fontSize.label, color: colors.textMuted, letterSpacing: 2 },
  title: { fontFamily: fonts.semibold, fontSize: fontSize.title + 4, color: colors.text },
  company: { flexDirection: 'row', alignItems: 'center', gap: space.sm, maxWidth: '50%' },
  companyText: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.textMuted },
  search: {
    minHeight: hit,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
  },
  searchInput: {
    flex: 1,
    minHeight: hit,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
  },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.sm, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: hit,
  },
  rowPressed: { backgroundColor: colors.surface },
  rowText: { flex: 1, gap: space.xxs, justifyContent: 'center' },
  rowSide: { alignItems: 'flex-end', justifyContent: 'space-between', alignSelf: 'stretch', gap: space.sm },
  number: { fontFamily: fonts.monoMedium, fontSize: fontSize.sm, color: colors.textMuted },
  name: { fontFamily: fonts.medium, fontSize: fontSize.lg, color: colors.text },
});
