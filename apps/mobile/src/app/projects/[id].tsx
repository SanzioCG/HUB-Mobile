// Loyiha: nom, meta, tasdiqlanmagan buyum eslatmasi, buyumlar ro'yxati.
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { errorMessage } from '../../api/errors';
import { useProject } from '../../api/hooks';
import { formatSize, statusLabel, type ProjectDetail, type ProjectItem } from '../../api/types';
import { Header, StatusLine, Thumb } from '../../components/parts';
import { Dot, EmptyState, ErrorState, SkeletonList, T } from '../../components/ui';
import { uz } from '../../i18n/uz';
import { colors, hit, radius, space } from '../../theme';
import { relativeTime } from '../../utils/time';
import { cachedEntries } from '../../offline/glbCache';
import { formatMb, type CacheEntry } from '../../offline/policy';

/** Keshdagi reviziyalar; ekranga qaytilganda yangilanadi. */
function useCachedRevisions(): Record<string, CacheEntry> {
  const [entries, setEntries] = useState<Record<string, CacheEntry>>({});
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void cachedEntries().then((e) => alive && setEntries(e));
      return () => {
        alive = false;
      };
    }, []),
  );
  return entries;
}

export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, reload } = useProject(id);
  const p = state.status === 'ok' ? state.data : null;
  const offline = state.status === 'ok' && state.offline === true;
  const cached = useCachedRevisions();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Header
        title={p ? `№ ${p.number} · ${p.name}` : uz.common.loading}
        meta={
          p && (
            <T muted>
              {offline ? `${uz.projects.offline} · ` : ''}
              {meta(p)}
            </T>
          )
        }
      />
      {state.status === 'loading' && <SkeletonList rows={3} />}
      {state.status === 'error' && <ErrorState message={errorMessage(state.error)} onRetry={reload} />}
      {p && (
        <FlatList
          data={p.items}
          keyExtractor={(it) => it.item_id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            p.items.some((it) => !it.approved) ? (
              <View style={styles.note}>
                <Dot color={colors.yellow} />
                <T style={styles.noteText}>{uz.project.unapprovedNote}</T>
              </View>
            ) : undefined
          }
          renderItem={({ item }) => <ItemRow projectId={id} item={item} cached={cached[item.revision_id]} />}
          ListEmptyComponent={<EmptyState text={uz.project.empty} />}
        />
      )}
    </SafeAreaView>
  );
}

const meta = (p: ProjectDetail) =>
  `${statusLabel(p.status)} · ${uz.projects.items(p.items.length)} · ${relativeTime(p.updated_at)}`;

function ItemRow({ projectId, item, cached }: { projectId: string; item: ProjectItem; cached?: CacheEntry }) {
  const rev = item.revision_label;
  // Kontrakt 4: export_status ≠ ready — GLB yo'q, buyum ochilmaydi.
  const ready = item.export_status === 'ready' && item.glb_url !== null;
  return (
    <Pressable
      disabled={!ready}
      onPress={() => router.push(`/item/${projectId}/${item.item_id}`)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed, !ready && styles.rowDisabled]}
    >
      <Thumb uri={item.thumb_url} />
      <View style={styles.rowText}>
        <T numberOfLines={1}>{item.name}</T>
        <T mono muted>
          {formatSize(item.size_mm)}
        </T>
        {item.export_status === 'pending' ? (
          <StatusLine tone="muted" label={uz.project.exportPending} />
        ) : item.export_status === 'failed' ? (
          <StatusLine tone="yellow" label={uz.project.exportFailed} />
        ) : (
          <StatusLine
            tone={item.approved ? 'green' : 'yellow'}
            label={`${item.approved ? uz.status.approved : uz.status.unapproved} · ${rev}`}
          />
        )}
        {cached && (
          <T muted mono>
            {uz.project.offlineAvailable(formatMb(cached.bytes))}
          </T>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  list: { padding: space.lg, gap: space.sm, flexGrow: 1 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.panel,
    marginBottom: space.sm,
  },
  noteText: { flex: 1 },
  row: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.panel,
    minHeight: hit,
  },
  rowPressed: { backgroundColor: colors.surface },
  rowDisabled: { opacity: 0.55 },
  rowText: { flex: 1, gap: space.xs, justifyContent: 'center' },
});
