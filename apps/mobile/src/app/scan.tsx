// QR skaner (kontrakt 6, 4.1) — Figma 06 Mobile Viewer:
//   04 "QR Scanner / Active State" (144:2): to'liq ekran kamera, tepada va pastda qorong'i qatlam, laym burchakli ramka,
//      chiroq va "Rasmdan tanlash" (QR rasmi galereyadan);
//   05 "Camera Permission Denied" (150:2): ruxsat so'rash / qurilma sozlamalari, rasmdan tanlash, "Hozir emas";
//   06 "QR Detected / Confirmation" (150:19): etiketka topilgach — loyiha va detal, "Loyihani ochish" yoki qayta skaner.
// Prefikslar: `uhub:` — etiketka, `uhub-pair:` — juftlash (server manzili bilan), boshqasi — "Bu U-HUB etiketkasi emas".
// 3D ekrandan ketma-ket skanerlash (`from`) tasdiqsiz: o'sha buyum ochiq bo'lsa faqat tanlov almashadi (kontrakt 6.6).
import { CameraView, scanFromURLAsync, useCameraPermissions } from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Centered, Spinner, T } from '../components/ui';
import { uz } from '../i18n/uz';
import { CameraDiscIllustration, CameraLensIllustration, SuccessDiscIllustration } from '../ui/generated';
import { Icon, type IconName } from '../ui/Icon';
import { errorMessage } from '../api/errors';
import { classifyQr, parsePairQr, type PairQr } from '../scan/pairQr';
import { useSession } from '../session/SessionProvider';
import { colors, fonts, radius } from '../theme';
import { hapticError, hapticSuccess } from '../scan/haptics';
import { createDebouncer } from '../scan/qr';
import { addRecent } from '../scan/recent';
import { resolveLabel } from '../scan/resolveLabel';
import { fileIndexes } from '../files/store';
import { fileLabelTarget } from '../files/resolveFile';
import { emitSelection, itemKey, putSelection, type ScanSelection } from '../scan/selection';

/** 06: topilgan kod — ko'rsatiladigan qatorlar va ochish. */
interface Found {
  project: string;
  detailLabel: string;
  detail: string;
  open: () => void;
}

/** Figma 144:2: ramka 294 × 294 (chetlar 48), burchak 26 × 3. */
const FRAME = 294;
const CORNER = 26;
const CORNER_W = 3;

export default function ScanScreen() {
  /** `from` — skaner ochilgan 3D ekrandagi buyum kaliti (itemKey). */
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { client, state, pair, unpair } = useSession();
  const paired = state.status === 'paired';
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [found, setFound] = useState<Found | null>(null);
  const debounce = useRef(createDebouncer()).current;

  const openSelection = (sel: ScanSelection) => {
    const r = sel.result;
    putSelection(sel);
    router.replace({
      pathname: '/item/[projectId]/[itemId]',
      params: { projectId: String(r.project_id), itemId: r.item_id, qr: sel.qr },
    });
  };

  /** Juftlash QR'i: server manzili saqlanadi va pair; juftlangan bo'lsa — avval tasdiq, keyin eski qurilma uziladi. */
  const pairWith = async (p: PairQr) => {
    try {
      if (paired) await unpair();
      await pair(p.code, p.server);
      hapticSuccess();
      router.replace('/projects');
    } catch (e) {
      hapticError();
      setMessage(errorMessage(e));
    }
  };

  const onPairQr = (data: string) =>
    new Promise<void>((resolve) => {
      const p = parsePairQr(data);
      if (!p) {
        hapticError();
        setMessage(uz.pair.badPairQr);
        return resolve();
      }
      if (!paired) return void pairWith(p).finally(resolve);
      Alert.alert(uz.pair.otherServerTitle, uz.pair.otherServerText(p.server), [
        { text: uz.pair.cancel, style: 'cancel', onPress: () => resolve() },
        { text: uz.pair.otherServerOk, onPress: () => void pairWith(p).finally(resolve) },
      ]);
    });

  /** Etiketka telefondagi `.uhub` faylida — 06 tasdiq (fayldan). Topilmasa — xabar. */
  const foundInFile = async (data: string): Promise<boolean> => {
    const files = await fileIndexes();
    const ft = fileLabelTarget(data, files);
    if (!ft.ok) {
      setMessage(ft.message);
      return false;
    }
    const file = files.find((f) => f.id === ft.params.fileId);
    hapticSuccess();
    setMessage(null);
    setFound({
      project: file ? `№ ${file.project_number}` : uz.common.dash,
      detailLabel: uz.scan.found.file,
      detail: uz.scan.found.fromFile,
      open: () => router.push({ pathname: '/files/view', params: ft.params }),
    });
    return true;
  };

  const handle = async (data: string) => {
    if (busy || !debounce(data)) return;
    setBusy(true);
    try {
      const kind = classifyQr(data);
      if (kind === 'pair') return await onPairQr(data);
      // Kontrakt 1.6 (10.4): juftlanmagan — etiketka telefondagi `.uhub` fayllaridan.
      if (kind === 'label' && !paired) {
        if (!(await foundInFile(data))) hapticError();
        return;
      }
      const res = await resolveLabel(client, data);
      if (!res.ok) {
        // Server topmadi yoki oflayn — shu loyiha fayli telefonda bo'lsa, fayldan.
        if (await foundInFile(data)) return;
        hapticError();
        setMessage(res.message); // ekranda qoladi, skaner davom etadi
        return;
      }
      const sel = res.selection;
      const r = sel.result;
      await addRecent({ qr: data, at: Date.now(), result: r });
      // Ketma-ket skanerlash: o'sha buyum va reviziya ochiq bo'lsa — faqat tanlov almashadi (kontrakt 6.6).
      if (from && from === itemKey(r.item_id, r.revision_id) && emitSelection(sel)) {
        hapticSuccess();
        router.back();
        return;
      }
      hapticSuccess();
      setMessage(null);
      setFound({
        project: `№ ${r.project_number} · ${r.item_name}`,
        detailLabel: uz.scan.found.part,
        detail: `${r.part_name}  •  ${r.revision_label}`,
        open: () => openSelection(sel),
      });
    } finally {
      setBusy(false);
    }
  };

  /** QR rasmini galereyadan tanlash (kamera ruxsatisiz ham ishlaydi). */
  const pickImage = async () => {
    const pick = await DocumentPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: true });
    const asset = pick.canceled ? undefined : pick.assets[0];
    if (!asset) return;
    try {
      const [code] = await scanFromURLAsync(asset.uri, ['qr']);
      if (code) return void (await handle(code.data));
    } catch {
      // o'qilmadi — pastdagi xabar
    }
    hapticError();
    setMessage(uz.scan.galleryNone);
  };

  if (found)
    return (
      <FoundScreen
        found={found}
        onAgain={() => {
          setFound(null);
          setMessage(null);
        }}
      />
    );
  if (!permission)
    return (
      <Centered>
        <Spinner />
      </Centered>
    );
  if (!permission.granted)
    return (
      <PermissionScreen
        canAsk={permission.canAskAgain}
        onAsk={requestPermission}
        onPick={() => void pickImage()}
        message={message}
      />
    );

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={busy ? undefined : (r) => void handle(r.data)}
      />

      <View style={styles.center} pointerEvents="none">
        <View style={[styles.chip, message !== null && !busy && styles.chipWarn]}>
          {busy ? (
            <View style={styles.chipRow}>
              <Spinner />
              <T style={styles.chipText}>{uz.scan.resolving}</T>
            </View>
          ) : (
            <T style={[styles.chipText, message !== null && styles.chipTextWarn]}>
              {message ?? uz.scan.chip}
            </T>
          )}
        </View>
        <View style={styles.frame}>
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
          <View style={styles.scanLine} />
        </View>
      </View>

      <SafeAreaView style={styles.top} edges={['top']}>
        <View style={styles.topRow}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={uz.common.close}
            hitSlop={12}
          >
            <Icon name="scanner-close" size={24} color={colors.text} />
          </Pressable>
          <T style={styles.title}>{uz.scan.title}</T>
        </View>
        <T style={styles.subtitle}>{uz.scan.subtitle}</T>
      </SafeAreaView>

      <SafeAreaView style={styles.bottom} edges={['bottom']}>
        <T style={styles.auto}>{uz.scan.auto}</T>
        <View style={styles.controls}>
          <Control
            icon="torch"
            label={uz.scan.torch}
            active={torch}
            onPress={() => setTorch(!torch)}
            width={120}
          />
          <Control icon="gallery" label={uz.scan.gallery} onPress={() => void pickImage()} width={146} />
        </View>
      </SafeAreaView>
    </View>
  );
}

function Control({
  icon,
  label,
  onPress,
  active,
  width,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  active?: boolean;
  width: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={active === undefined ? undefined : { selected: active }}
      style={({ pressed }) => [
        styles.control,
        { width },
        active && styles.controlActive,
        pressed && styles.pressed,
      ]}
    >
      <Icon name={icon} size={22} color={active ? colors.accent : colors.text} />
      <T style={styles.controlLabel} numberOfLines={2}>
        {label}
      </T>
    </Pressable>
  );
}

/** 05: kameraga ruxsat yo'q. */
function PermissionScreen({
  canAsk,
  onAsk,
  onPick,
  message,
}: {
  canAsk: boolean;
  onAsk: () => void;
  onPick: () => void;
  message: string | null;
}) {
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.permissionBody}>
        <View style={styles.cameraIcon}>
          <CameraDiscIllustration size={80} />
          <View style={styles.cameraTop} />
          <View style={styles.cameraBody} />
          <View style={styles.cameraLens}>
            <CameraLensIllustration size={14} />
          </View>
        </View>
        <T style={styles.eyebrow}>{uz.scan.permissionEyebrow}</T>
        <T style={styles.permissionTitle}>{uz.scan.permissionTitle}</T>
        <T style={styles.permissionText}>{uz.scan.permissionText}</T>
        {message !== null && <T style={styles.permissionMessage}>{message}</T>}
        <View style={styles.permissionActions}>
          <PageButton
            primary
            label={canAsk ? uz.scan.permissionAsk : uz.scan.permissionSettings}
            onPress={canAsk ? onAsk : () => void Linking.openSettings()}
          />
          <PageButton label={uz.scan.gallery} onPress={onPick} />
          <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.textButton}>
            <T style={styles.notNow}>{uz.scan.notNow}</T>
          </Pressable>
        </View>
      </View>
      <View style={styles.note}>
        <T style={styles.noteText}>{uz.scan.permissionNote}</T>
      </View>
    </SafeAreaView>
  );
}

/** 06: kod topildi — tasdiq. */
function FoundScreen({ found, onAgain }: { found: Found; onAgain: () => void }) {
  const t = uz.scan.found;
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.foundHead}>
        <T style={styles.foundTitle}>{t.title}</T>
        <T style={styles.foundSubtitle}>{t.subtitle}</T>
      </View>
      <View style={styles.preview}>
        <View style={[styles.marker, styles.mTl]} />
        <View style={[styles.marker, styles.mTr]} />
        <View style={styles.qrBox}>
          <T style={styles.qrText}>QR</T>
        </View>
      </View>
      <View style={styles.sheet}>
        <View style={styles.sheetHead}>
          <View>
            <SuccessDiscIllustration size={36} />
            <T style={styles.check}>✓</T>
          </View>
          <View style={styles.sheetHeadText}>
            <T style={styles.sheetTitle}>{t.heading}</T>
            <T style={styles.sheetHint}>{t.hint}</T>
          </View>
        </View>
        <View style={styles.sheetDivider} />
        <T style={styles.metaLabel}>{t.project}</T>
        <T style={styles.metaValue} numberOfLines={2}>
          {found.project}
        </T>
        <T style={[styles.metaLabel, styles.metaGap]}>{found.detailLabel}</T>
        <T style={styles.metaDetail} numberOfLines={2}>
          {found.detail}
        </T>
        <View style={styles.sheetActions}>
          <PageButton primary label={t.open} onPress={found.open} height={52} />
          <PageButton label={t.again} onPress={onAgain} height={48} />
        </View>
      </View>
    </SafeAreaView>
  );
}

function PageButton({
  label,
  onPress,
  primary,
  height = primary ? 54 : 52,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  height?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.pageButton,
        { minHeight: height },
        primary ? styles.pageButtonPrimary : styles.pageButtonSecondary,
        pressed && styles.pressed,
      ]}
    >
      <T style={primary ? styles.pageButtonPrimaryLabel : styles.pageButtonLabel}>{label}</T>
    </Pressable>
  );
}

// O'lchamlar — Figma 144:2, 150:2, 150:19 (390 × 844).
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pressed: { opacity: 0.8 },

  // 04 — tepadagi qatlam (128) va pastki boshqaruv (170)
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.cameraScrim,
    paddingBottom: 19,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 22, paddingHorizontal: 24, paddingTop: 20 },
  title: { fontFamily: fonts.semibold, fontSize: 18, color: colors.text },
  subtitle: {
    marginTop: 18,
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.cameraHint,
  },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 22 },
  chip: {
    minHeight: 32,
    maxWidth: 342,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.cameraChip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipWarn: { paddingVertical: 8 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chipText: { textAlign: 'center', fontFamily: fonts.medium, fontSize: 10, color: colors.text },
  chipTextWarn: { fontSize: 12, color: colors.yellow },
  frame: { width: FRAME, height: FRAME, justifyContent: 'center', alignItems: 'center' },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: colors.accent },
  tl: { top: 0, left: 0, borderTopWidth: CORNER_W, borderLeftWidth: CORNER_W },
  tr: { top: 0, right: 0, borderTopWidth: CORNER_W, borderRightWidth: CORNER_W },
  bl: { bottom: 0, left: 0, borderBottomWidth: CORNER_W, borderLeftWidth: CORNER_W },
  br: { bottom: 0, right: 0, borderBottomWidth: CORNER_W, borderRightWidth: CORNER_W },
  scanLine: { width: 258, height: 2, borderRadius: 1, backgroundColor: colors.accent, opacity: 0.9 },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.cameraControls,
    paddingTop: 21,
    paddingBottom: 20,
    alignItems: 'center',
  },
  auto: { fontFamily: fonts.medium, fontSize: 12, color: colors.text },
  controls: { marginTop: 18, flexDirection: 'row', gap: 16 },
  control: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: colors.cameraButton,
    borderWidth: 1,
    borderColor: colors.cameraButtonBorder,
  },
  controlActive: { borderColor: colors.accent },
  controlLabel: { flex: 1, fontFamily: fonts.medium, fontSize: 11, color: colors.text },

  // 05 — ruxsat yo'q
  page: { flex: 1, backgroundColor: colors.bg },
  permissionBody: { flex: 1, paddingHorizontal: 24, paddingTop: 110, alignItems: 'center' },
  cameraIcon: { width: 80, height: 80 },
  cameraTop: {
    position: 'absolute',
    left: 28,
    top: 21,
    width: 17,
    height: 8,
    borderRadius: 3,
    backgroundColor: colors.textMuted,
  },
  cameraBody: {
    position: 'absolute',
    left: 19,
    top: 27,
    width: 42,
    height: 28,
    borderRadius: 7,
    backgroundColor: colors.textMuted,
  },
  cameraLens: { position: 'absolute', left: 33, top: 33 },
  eyebrow: { marginTop: 46, fontFamily: fonts.semibold, fontSize: 11, color: colors.accent },
  permissionTitle: {
    marginTop: 10,
    textAlign: 'center',
    fontFamily: fonts.semibold,
    fontSize: 25,
    color: colors.text,
  },
  permissionText: {
    marginTop: 11,
    maxWidth: 306,
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  permissionMessage: { marginTop: 12, textAlign: 'center', fontSize: 13, color: colors.yellow },
  permissionActions: { marginTop: 54, alignSelf: 'stretch', gap: 16 },
  textButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  notNow: { fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted },
  note: {
    marginHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  noteText: { textAlign: 'center', fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  pageButton: { borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  pageButtonPrimary: { backgroundColor: colors.accent },
  pageButtonSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  pageButtonPrimaryLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.onAccent },
  pageButtonLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },

  // 06 — kod topildi
  foundHead: { paddingHorizontal: 24, paddingTop: 22, gap: 3 },
  foundTitle: { fontFamily: fonts.semibold, fontSize: 20, color: colors.text },
  foundSubtitle: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  preview: {
    marginTop: 21,
    marginHorizontal: 16,
    height: 386,
    borderRadius: radius.lg,
    backgroundColor: colors.cameraButton,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    paddingTop: 111,
  },
  marker: { position: 'absolute', width: 26, height: 26, borderColor: colors.accent },
  mTl: { top: 21, left: 21, borderTopWidth: 3, borderLeftWidth: 3 },
  mTr: { top: 21, right: 21, borderTopWidth: 3, borderRightWidth: 3 },
  qrBox: {
    width: 134,
    height: 134,
    borderRadius: radius.md,
    backgroundColor: colors.tabBar,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrText: { fontFamily: fonts.semibold, fontSize: 30, color: colors.textMuted },
  sheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    padding: 16,
    paddingTop: 20,
    borderRadius: 18,
    backgroundColor: colors.tabBar,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  check: {
    position: 'absolute',
    width: 36,
    top: 3,
    textAlign: 'center',
    fontFamily: fonts.semibold,
    fontSize: 21,
    color: colors.success,
  },
  sheetHeadText: { flex: 1, gap: 2 },
  sheetTitle: { fontFamily: fonts.semibold, fontSize: 18, color: colors.text },
  sheetHint: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  sheetDivider: { marginTop: 28 - 14, marginBottom: 17, height: 1, backgroundColor: colors.border },
  metaLabel: { fontFamily: fonts.semibold, fontSize: 10, color: colors.textMuted, letterSpacing: 0.3 },
  metaGap: { marginTop: 14 },
  metaValue: { marginTop: 2, fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  metaDetail: { marginTop: 2, fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  sheetActions: { marginTop: 22, gap: 12 },
});
