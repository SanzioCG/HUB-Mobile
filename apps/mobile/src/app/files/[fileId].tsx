// Fayldan ochilgan loyiha (kontrakt 1.6, 10.2 / 10.4): "Butun loyiha" va buyumlar; eksport paytidagi holat va
// eksport ogohlantirishlari (`warnings`, sariq belgi; bo'sh bo'lsa hech narsa).
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { itemKey } from '@hub-mobile/viewer/uhub';
import { BackButton } from '../../components/parts';
import { Dot, ErrorState, Spinner, T } from '../../components/ui';
import { getFile, type OpenedFile } from '../../files/store';
import { formatSize } from '../../api/types';
import { uz } from '../../i18n/uz';
import { colors, fontSize, fonts, radius, size, space } from '../../theme';

export default function FileProjectScreen() {
  const { fileId } = useLocalSearchParams<{ fileId: string }>();
  const [file, setFile] = useState<OpenedFile | null | undefined>(undefined);
  useEffect(() => {
    void getFile(fileId).then(setFile);
  }, [fileId]);

  if (file === undefined)
    return (
      <SafeAreaView style={[styles.root, styles.center]}>
        <Spinner />
      </SafeAreaView>
    );
  if (file === null)
    return (
      <SafeAreaView style={styles.root}>
        <BackButton />
        <ErrorState message={uz.files.notFound} />
      </SafeAreaView>
    );

  const view = (item: string) => router.push({ pathname: '/files/view', params: { fileId: file.id, item } });

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.head}>
        <BackButton />
        <View style={styles.headText}>
          <T style={styles.title} numberOfLines={1}>
            {file.project_name}
          </T>
          <T mono muted>
            № {file.project_number} · {uz.files.items(file.items.length)}
          </T>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        <Pressable
          onPress={() => view('all')}
          style={({ pressed }) => [styles.row, styles.whole, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Ionicons name="grid-outline" size={size.icon} color={colors.accent} />
          <View style={styles.rowText}>
            <T style={styles.itemName}>{uz.files.wholeProject}</T>
            <T muted>{uz.files.wholeProjectHint}</T>
          </View>
        </Pressable>
        {file.items.map((it) => (
          <Pressable
            key={it.item_id}
            onPress={() => view(itemKey(it))}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <View style={styles.rowText}>
              <T style={styles.itemName} numberOfLines={1}>
                {it.name}
              </T>
              <T mono muted>
                {it.size_mm ? `${formatSize(it.size_mm)} · ` : ''}
                {it.revision_label}
              </T>
              <View style={styles.status}>
                <Dot color={it.approved ? colors.green : colors.yellow} />
                <T muted>{uz.files.exported(it.approved)}</T>
              </View>
              {it.warnings.length > 0 && (
                <View style={styles.warn}>
                  <View style={styles.status}>
                    <Ionicons name="warning-outline" size={size.icon - 4} color={colors.yellow} />
                    <T style={styles.warnTitle}>{uz.files.warnings}</T>
                  </View>
                  {it.warnings.map((w) => (
                    <T key={w} style={styles.warnText}>
                      {w}
                    </T>
                  ))}
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={size.icon} color={colors.textMuted} />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.lg },
  headText: { flex: 1 },
  title: { fontFamily: fonts.semibold, fontSize: fontSize.title },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.panel,
  },
  whole: { borderWidth: 1, borderColor: colors.accent },
  rowText: { flex: 1, gap: space.xxs },
  itemName: { fontFamily: fonts.semibold, fontSize: fontSize.lg },
  status: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  warn: {
    marginTop: space.xs,
    padding: space.sm,
    borderRadius: radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.yellow,
    backgroundColor: colors.surface,
    gap: space.xxs,
  },
  warnTitle: { color: colors.yellow, fontFamily: fonts.semibold },
  warnText: { fontSize: fontSize.sm },
  pressed: { backgroundColor: colors.surface },
});
