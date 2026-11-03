// Loyihalar (dizayn 1-ekran): brend, sarlavha + kompaniya holati, qidiruv, segment filtr, ro'yxat, pull-to-refresh.
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { errorMessage } from '../../api/errors';
import { useProjectList } from '../../api/hooks';
import { filterProjects } from '../../api/projects';
import { statusLabel, statusTone, type ProjectSummary, type StatusFilter } from '../../api/types';
import { StatusLine, Thumb } from '../../components/parts';
import { Dot, EmptyState, ErrorState, Segmented, SkeletonList, T } from '../../components/ui';
import { uz } from '../../i18n/uz';
import { usePairedSession } from '../../session/SessionProvider';
import { colors, fontSize, fonts, hit, radius, space } from '../../theme';
import { relativeTime } from '../../utils/time';

const FILTERS = [
  { key: 'all', label: uz.projects.filterAll },
  { key: 'approved', label: uz.projects.filterApproved },
  { key: 'unapproved', label: uz.projects.filterUnapproved },
] as const satisfies readonly { key: StatusFilter; label: string }[];

export default function ProjectsScreen() {
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
        <T style={styles.brand}>
          U-HUB <T style={styles.brandSub}>MOBILE VIEWER</T>
        </T>
        <View style={styles.titleRow}>
          <T style={styles.title}>{uz.projects.title}</T>
          <View style={styles.company}>
            <Dot color={online === false ? colors.yellow : colors.green} />
            <T style={styles.companyText} numberOfLines={1}>
              {online === false ? uz.projects.offline : session?.company.name}
            </T>
          </View>
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={uz.projects.search}
          placeholderTextColor={colors.textMuted}
          style={styles.search}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
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
            <EmptyState text={state.data.length ? uz.projects.emptySearch : uz.projects.empty} />
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
        <T numberOfLines={1}>
          <T mono style={styles.number}>
            № {p.number}
          </T>
          {'  '}
          {p.name}
        </T>
        <T muted>
          {uz.projects.items(p.items_count)} · {relativeTime(p.updated_at)}
        </T>
        <StatusLine tone={statusTone(p.status)} label={statusLabel(p.status)} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  top: { padding: space.lg, gap: space.md },
  brand: { fontFamily: fonts.bold, fontSize: fontSize.lg, color: colors.accentTertiary, letterSpacing: 1 },
  brandSub: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm - 3,
    color: colors.textMuted,
    letterSpacing: 2,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { flex: 1, fontFamily: fonts.semibold, fontSize: fontSize.title },
  company: { flexDirection: 'row', alignItems: 'center', gap: space.sm, maxWidth: '50%' },
  companyText: { fontFamily: fonts.medium, fontSize: fontSize.sm },
  search: {
    minHeight: hit,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
  },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.sm, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.panel,
    minHeight: hit,
  },
  rowPressed: { backgroundColor: colors.surface },
  rowText: { flex: 1, gap: space.xs, justifyContent: 'center' },
  number: { fontFamily: fonts.monoMedium, color: colors.white },
});
