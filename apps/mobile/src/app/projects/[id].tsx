// Loyiha: nom, meta, tasdiqlanmagan buyum eslatmasi, buyumlar ro'yxati.
import { router, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { errorMessage } from '../../api/errors';
import { useProject } from '../../api/hooks';
import {
  formatSize,
  revisionLabel,
  statusLabel,
  type ProjectDetail,
  type ProjectItem,
} from '../../api/types';
import { Header, StatusLine, Thumb } from '../../components/parts';
import { Dot, EmptyState, ErrorState, SkeletonList, T } from '../../components/ui';
import { uz } from '../../i18n/uz';
import { colors, hit, radius, space } from '../../theme';
import { relativeTime } from '../../utils/time';

export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, reload } = useProject(id);
  const p = state.status === 'ok' ? state.data : null;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Header
        title={p ? `№ ${p.number} · ${p.name}` : uz.common.loading}
        meta={p && <T muted>{meta(p)}</T>}
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
          renderItem={({ item }) => <ItemRow projectId={id} item={item} />}
          ListEmptyComponent={<EmptyState text={uz.project.empty} />}
        />
      )}
    </SafeAreaView>
  );
}

const meta = (p: ProjectDetail) =>
  `${statusLabel(p.status)} · ${uz.projects.items(p.items_count)} · ${relativeTime(p.updated_at)}`;

function ItemRow({ projectId, item }: { projectId: string; item: ProjectItem }) {
  const rev = revisionLabel(item.revision_id);
  return (
    <Pressable
      onPress={() => router.push(`/item/${projectId}/${item.item_id}`)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <Thumb uri={item.thumb_url} />
      <View style={styles.rowText}>
        <T numberOfLines={1}>{item.name}</T>
        <T mono muted>
          {formatSize(item.size_mm)}
        </T>
        <StatusLine
          tone={item.approved ? 'green' : 'yellow'}
          label={`${item.approved ? uz.status.approved : uz.status.unapproved} · ${rev}`}
        />
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
  rowPressed: { backgroundColor: colors.panel2 },
  rowText: { flex: 1, gap: space.xs, justifyContent: 'center' },
});
