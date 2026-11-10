// Fayllar — Figma 06 Mobile Viewer, "07 — Open Project from File" (152:59): sarlavha, `.uhub` tanlash maydoni,
// so'nggi fayllar (bosib turish — o'chirish), format izohi, "Fayllarni ko'rish" va maxfiylik izohi.
// Kontrakt 1.6, 10.3: juftlashsiz ham ishlaydi. Tizim "Ulashish / Ochish" (intent filtri, UTI) — faqat dev build'da.
import * as DocumentPicker from 'expo-document-picker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UHUB_LIMITS, UHUB_MESSAGES, isUhubError } from '@hub-mobile/viewer/uhub';
import { ListRow, ScreenTitle, SectionLabel, WideButton } from '../../components/screen';
import { Dot, Spinner, T } from '../../components/ui';
import { SHOW_DEV_UI } from '../../config';
import { readPickedFile } from '../../files/readPicked';
import { importUhub, listFiles, removeFile, type OpenedFile } from '../../files/store';
import { uz } from '../../i18n/uz';
import { FileDiscIllustration } from '../../ui/generated/FileDiscIllustration';
import { colors, fonts, radius } from '../../theme';

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
    await importFrom(asset.uri);
  };

  /** Tanlangan yoki tizim "Ochish" orqali kelgan fayl (`content://` / `file://`). */
  const importFrom = async (uri: string) => {
    setError(null);
    setBusy(true);
    try {
      const bytes = await readPickedFile(uri);
      const opened = await importUhub(bytes);
      refresh();
      router.push({ pathname: '/files/[fileId]', params: { fileId: opened.id } });
    } catch (e) {
      // Buzilgan fayl — tushunarli xabar, ilova yiqilmaydi (10.3, 10.5). Dev'da asl sabab ham (diagnostika).
      if (isUhubError(e)) setError(e.message);
      else {
        console.warn('uhub import', e);
        const detail = SHOW_DEV_UI ? ` (${e instanceof Error ? `${e.name}: ${e.message}` : String(e)})` : '';
        setError(`${uz.files.readFailed}${detail}`);
      }
    } finally {
      setBusy(false);
    }
  };

  // Tizim "Ochish" orqali kelgan fayl (+native-intent → `?incoming=`) — bir marta ochiladi.
  const { incoming } = useLocalSearchParams<{ incoming?: string }>();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!incoming || handled.current === incoming) return;
    handled.current = incoming;
    void importFrom(incoming);
    // importFrom — har renderda yangi; faqat `incoming` o'zgarganda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming]);

  const confirmRemove = (f: OpenedFile) =>
    Alert.alert(uz.files.removeTitle, uz.files.removeText(f.project_name || `№ ${f.project_number}`), [
      { text: uz.files.cancel, style: 'cancel' },
      { text: uz.files.remove, style: 'destructive', onPress: () => void removeFile(f.id).then(refresh) },
    ]);

  const t = uz.filesUi;
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenTitle back title={t.title} subtitle={t.subtitle} />

        <Pressable
          onPress={() => void pick()}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={t.dropTitle}
          style={({ pressed }) => [styles.drop, pressed && styles.pressed]}
        >
          <View style={styles.disc}>
            <FileDiscIllustration size={58} />
            <View style={styles.discGlyph}>{busy ? <Spinner /> : <T style={styles.arrow}>↥</T>}</View>
          </View>
          <T style={styles.dropTitle}>{busy ? uz.files.opening : t.dropTitle}</T>
          <T style={styles.dropHint}>{t.dropHint}</T>
        </Pressable>

        {error && (
          <View style={styles.error}>
            <Dot color={colors.yellow} />
            <T style={styles.errorText}>{error}</T>
          </View>
        )}

        {files !== null && files.length > 0 && (
          <>
            <SectionLabel style={styles.sectionGap}>{t.recent}</SectionLabel>
            <View style={styles.list}>
              {files.map((f) => (
                <ListRow
                  key={f.id}
                  title={f.project_name || `№ ${f.project_number}`}
                  detail={`№ ${f.project_number}  •  ${uz.files.items(f.items.length)}  •  ${formatDate(f.exported_at)}`}
                  tag={t.local}
                  onPress={() => router.push({ pathname: '/files/[fileId]', params: { fileId: f.id } })}
                  onLongPress={() => confirmRemove(f)}
                />
              ))}
            </View>
            <T style={styles.note}>{t.removeHint}</T>
          </>
        )}
        {files !== null && files.length === 0 && <T style={styles.empty}>{uz.files.empty}</T>}

        <T style={styles.format}>{t.format}</T>
        <WideButton
          primary
          label={t.browse}
          onPress={() => void pick()}
          disabled={busy}
          style={styles.browse}
        />
        <T style={styles.privacy}>{t.privacy}</T>
      </ScrollView>
    </SafeAreaView>
  );
}

// O'lchamlar — Figma 152:59 (chetlar 24).
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },
  drop: {
    marginTop: 36,
    minHeight: 164,
    borderRadius: 14,
    backgroundColor: colors.tabBar,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    paddingTop: 23,
    paddingBottom: 20,
    paddingHorizontal: 18,
  },
  pressed: { opacity: 0.85 },
  disc: { width: 58, height: 58 },
  discGlyph: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  arrow: { fontFamily: fonts.semibold, fontSize: 27, color: colors.accent },
  dropTitle: {
    marginTop: 13,
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
    textAlign: 'center',
  },
  dropHint: {
    marginTop: 6,
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
  error: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.panel,
  },
  errorText: { flex: 1 },
  sectionGap: { marginTop: 31, marginBottom: 6 },
  list: { gap: 10 },
  note: { marginTop: 8, fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },
  empty: { marginTop: 31, fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  format: { marginTop: 32, fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  browse: { marginTop: 36 },
  privacy: {
    marginTop: 20,
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
});
