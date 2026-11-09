// Offline tabi: keshlangan buyumlar (nom, R, hajm), bittasini o'chirish, hammasini tozalash, band hajm (ADR-M002).
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, EmptyState, T } from '../../components/ui';
import { CACHE_LIMITS } from '../../config';
import { uz } from '../../i18n/uz';
import { Icon } from '../../ui/Icon';
import { cachedEntries, clearCache, removeCached } from '../../offline/glbCache';
import { formatMb, usageOf, type CacheEntry } from '../../offline/policy';
import { colors, fontSize, fonts, hit, radius, size, space } from '../../theme';

/** Chegaraga nisbat 0…1: hajm yoki reviziya soni (qaysi biri yaqinroq). */
const fill = (u: { count: number; bytes: number }) =>
  Math.min(1, Math.max(u.bytes / CACHE_LIMITS.maxBytes, u.count / CACHE_LIMITS.maxRevisions));

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
          {/* Xotira chizig'i: hajm yoki reviziya soni chegarasiga yaqinligi (qaysi biri ko'p bo'lsa). */}
          <View
            style={styles.meter}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: Math.round(100 * fill(usage)) }}
          >
            <View style={[styles.meterFill, { width: `${Math.round(100 * fill(usage))}%` }]} />
          </View>
          <T muted>{uz.offline.limits(CACHE_LIMITS.maxRevisions, formatMb(CACHE_LIMITS.maxBytes))}</T>
        </View>
        <Button
          label={uz.offline.clearAll}
          icon="trash-2"
          danger
          disabled={!usage.count}
          onPress={() => void clearCache().then(refresh)}
          style={styles.clear}
        />
      </View>
      <FlatList
        data={entries ?? []}
        keyExtractor={(e) => e.revisionId}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          entries ? <EmptyState text={uz.offline.empty} illustration="empty-offline" /> : undefined
        }
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
              <Icon name="trash-2" size={size.icon} color={colors.textMuted} />
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
  usage: {
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    gap: space.sm,
  },
  meter: { height: 4, borderRadius: 2, backgroundColor: colors.surface, overflow: 'hidden' },
  meterFill: { height: '100%', backgroundColor: colors.accent },
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
