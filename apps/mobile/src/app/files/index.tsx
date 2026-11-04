// "Fayldan ochilganlar" (kontrakt 1.6, 10.3): `.uhub` ni hujjat tanlash bilan ochish, ro'yxat, o'chirish.
// Juftlashsiz ham ishlaydi. Tizim "Ulashish / Ochish" (intent filtri, UTI) — faqat dev build'da (Expo Go'da yo'q).
import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UHUB_LIMITS, UHUB_MESSAGES, isUhubError } from '@hub-mobile/viewer/uhub';
import { BackButton } from '../../components/parts';
import { Button, Dot, EmptyState, Spinner, T } from '../../components/ui';
import { readPickedFile } from '../../files/readPicked';
import { importUhub, listFiles, removeFile, type OpenedFile } from '../../files/store';
import { uz } from '../../i18n/uz';
import { colors, fontSize, fonts, hit, radius, size, space } from '../../theme';

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return uz.common.dash;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
};

export default function FilesScreen() {
  const [files, setFiles] = useState<OpenedFile[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    void listFiles().then(setFiles);
  }, []);
  useFocusEffect(refresh);

  const pick = async () => {
    setError(null);
    // Android / Expo Go: tanlagich keshi (`cache/DocumentPicker`) Expo Go tajribasi papkasidan tashqarida — o'qish rad
    // etiladi. Shuning uchun nusxasiz: manbaning `content://` havolasidan o'qiladi (`readPicked.ts`).
    const res = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: Platform.OS !== 'android',
    });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    // Hajm cheklovi (10.3) — o'qishdan oldin.
    if (asset.size !== undefined && asset.size > UHUB_LIMITS.maxFileBytes) {
      setError(UHUB_MESSAGES.too_large);
      return;
    }
    setBusy(true);
    try {
      const bytes = await readPickedFile(asset.uri);
      const opened = await importUhub(bytes);
      refresh();
      router.push({ pathname: '/files/[fileId]', params: { fileId: opened.id } });
    } catch (e) {
      // Buzilgan fayl — tushunarli xabar, ilova yiqilmaydi (10.3, 10.5). Dev'da asl sabab ham (diagnostika).
      if (isUhubError(e)) setError(e.message);
      else {
        console.warn('uhub import', e);
        const detail = __DEV__ ? ` (${e instanceof Error ? `${e.name}: ${e.message}` : String(e)})` : '';
        setError(`${uz.files.readFailed}${detail}`);
      }
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = (f: OpenedFile) =>
    Alert.alert(uz.files.removeTitle, uz.files.removeText(f.project_name || `№ ${f.project_number}`), [
      { text: uz.files.cancel, style: 'cancel' },
      { text: uz.files.remove, style: 'destructive', onPress: () => void removeFile(f.id).then(refresh) },
    ]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <View style={styles.head}>
          <BackButton />
          <T style={styles.title}>{uz.files.title}</T>
        </View>
        <T muted>{uz.files.hint}</T>
        <Button
          label={busy ? uz.files.opening : uz.files.open}
          primary
          disabled={busy}
          onPress={() => void pick()}
          right={
            busy ? <Spinner /> : <Ionicons name="folder-open-outline" size={size.icon} color={colors.white} />
          }
        />
        {error && (
          <View style={styles.error}>
            <Dot color={colors.yellow} />
            <T style={styles.errorText}>{error}</T>
          </View>
        )}
      </View>
      <FlatList
        data={files ?? []}
        keyExtractor={(f) => f.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={files ? <EmptyState text={uz.files.empty} /> : undefined}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/files/[fileId]', params: { fileId: item.id } })}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <View style={styles.rowText}>
              <T numberOfLines={1}>
                <T mono>№ {item.project_number}</T> · {item.project_name}
              </T>
              <T muted>
                {uz.files.items(item.items.length)} · {uz.files.exportedAt(formatDate(item.exported_at))}
              </T>
            </View>
            <Pressable
              onPress={() => confirmRemove(item)}
              accessibilityRole="button"
              accessibilityLabel={uz.files.remove}
              style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
            >
              <Ionicons name="trash-outline" size={size.icon} color={colors.textMuted} />
            </Pressable>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  top: { padding: space.lg, gap: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { fontFamily: fonts.semibold, fontSize: fontSize.title },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.panel,
  },
  errorText: { flex: 1 },
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
