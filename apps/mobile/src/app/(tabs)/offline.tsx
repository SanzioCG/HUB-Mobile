// Offline tabi: keshlangan buyumlar (nom, R, hajm), bittasini o'chirish, hammasini tozalash, band hajm (ADR-M002).
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, EmptyState, T } from '../../components/ui';
import { CACHE_LIMITS } from '../../config';
import { uz } from '../../i18n/uz';
import { cachedEntries, clearCache, removeCached } from '../../offline/glbCache';
import { formatMb, usageOf, type CacheEntry } from '../../offline/policy';
import { colors, fontSize, fonts, hit, radius, size, space } from '../../theme';

export default function OfflineScreen() {
  const [entries, setEntries] = useState<CacheEntry[] | null>(null);

  const refresh = useCallback(() => {
    void cachedEntries().then((e) => setEntries(Object.values(e).sort((a, b) => b.lastUsed - a.lastUsed)));
  }, []);
  useFocusEffect(refresh);

  const usage = usageOf(entries ?? []);
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.top}>
        <T style={styles.title}>{uz.offline.title}</T>
        <T muted>{uz.offline.hint}</T>
        <View style={styles.usage}>
          <T mono>{uz.offline.usage(usage.count, formatMb(usage.bytes))}</T>
          <T muted>{uz.offline.limits(CACHE_LIMITS.maxRevisions, formatMb(CACHE_LIMITS.maxBytes))}</T>
        </View>
        <Button
          label={uz.offline.clearAll}
          disabled={!usage.count}
          onPress={() => void clearCache().then(refresh)}
          style={styles.clear}
        />
      </View>
      <FlatList
        data={entries ?? []}
        keyExtractor={(e) => e.revisionId}
        contentContainerStyle={styles.list}
        ListEmptyComponent={entries ? <EmptyState text={uz.offline.empty} /> : undefined}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowText}>
              <T numberOfLines={1}>{item.name ?? uz.offline.unknownItem}</T>
              <T mono muted>
                {item.revisionLabel ?? item.revisionId} · {formatMb(item.bytes)}
              </T>
            </View>
            <Pressable
              onPress={() => void removeCached(item.revisionId).then(refresh)}
              accessibilityRole="button"
              accessibilityLabel={uz.offline.remove}
              style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
            >
              <Ionicons name="trash-outline" size={size.icon} color={colors.textMuted} />
            </Pressable>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  top: { padding: space.lg, gap: space.sm },
  title: { fontFamily: fonts.semibold, fontSize: fontSize.title },
  usage: { backgroundColor: colors.panel, borderRadius: radius.md, padding: space.md, gap: space.xs },
  clear: { alignSelf: 'flex-start' },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.sm, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.panel,
  },
  rowText: { flex: 1, gap: space.xxs },
  remove: {
    width: hit,
    height: hit,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  pressed: { backgroundColor: colors.surface },
});
