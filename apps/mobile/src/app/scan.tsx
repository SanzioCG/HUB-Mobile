// QR skaner (kontrakt 6, 4.1): qorong'i kamera, markazda accent ramka, chiroq, yo'riqnoma, "Oxirgi skanerlar".
// Prefikslar: `uhub:` — etiketka, `uhub-pair:` — juftlash (server manzili bilan), boshqasi — "Bu U-HUB etiketkasi emas".
import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Linking, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Centered, Spinner, T } from '../components/ui';
import { uz } from '../i18n/uz';
import { errorMessage } from '../api/errors';
import { classifyQr, parsePairQr, type PairQr } from '../scan/pairQr';
import { useSession } from '../session/SessionProvider';
import { colors, fontSize, fonts, hit, radius, size, space } from '../theme';
import { hapticError, hapticSuccess } from '../scan/haptics';
import { createDebouncer } from '../scan/qr';
import { addRecent, loadRecent, type RecentScan } from '../scan/recent';
import { resolveLabel } from '../scan/resolveLabel';
import { emitSelection, itemKey, putSelection, type ScanSelection } from '../scan/selection';

const FRAME = 240;
const CORNER = 36;
const CORNER_W = 4;

export default function ScanScreen() {
  /** `from` — skaner ochilgan 3D ekrandagi buyum kaliti (itemKey). */
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { client, state, pair, unpair } = useSession();
  const paired = state.status === 'paired';
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentScan[]>([]);
  const debounce = useRef(createDebouncer()).current;

  useEffect(() => {
    void loadRecent().then(setRecent);
  }, []);

  const open = (sel: ScanSelection) => {
    const r = sel.result;
    // Ketma-ket skanerlash: o'sha buyum va reviziya ochiq bo'lsa — faqat tanlov almashadi (kontrakt 6.6).
    if (from && from === itemKey(r.item_id, r.revision_id) && emitSelection(sel)) {
      router.back();
      return;
    }
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

  const onScanned = async ({ data }: BarcodeScanningResult) => {
    if (busy || !debounce(data)) return;
    setBusy(true);
    try {
      const kind = classifyQr(data);
      if (kind === 'pair') return await onPairQr(data);
      if (kind === 'label' && !paired) {
        hapticError();
        setMessage(uz.pair.needPair);
        return;
      }
      const res = await resolveLabel(client, data);
      if (!res.ok) {
        hapticError();
        setMessage(res.message); // ekranda qoladi, skaner davom etadi
        return;
      }
      hapticSuccess();
      setMessage(null);
      setRecent(await addRecent({ qr: data, at: Date.now(), result: res.selection.result }));
      open(res.selection);
    } finally {
      setBusy(false);
    }
  };

  if (!permission)
    return (
      <Centered>
        <Spinner />
      </Centered>
    );
  if (!permission.granted)
    return <PermissionScreen canAsk={permission.canAskAgain} onAsk={requestPermission} />;

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={busy ? undefined : (r) => void onScanned(r)}
      />
      <View style={styles.scrim} pointerEvents="none" />

      <SafeAreaView style={styles.top} edges={['top']}>
        <IconButton name="close" label={uz.common.close} onPress={() => router.back()} />
        <T style={styles.title}>{uz.scan.title}</T>
        <IconButton
          name={torch ? 'flashlight' : 'flashlight-outline'}
          label={uz.scan.torch}
          active={torch}
          onPress={() => setTorch(!torch)}
        />
      </SafeAreaView>

      <View style={styles.center} pointerEvents="none">
        <View style={styles.frame}>
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
        </View>
        <T style={styles.hint}>{uz.scan.hint}</T>
        <View style={styles.status}>
          {busy ? (
            <View style={styles.row}>
              <Spinner />
              <T>{uz.scan.resolving}</T>
            </View>
          ) : (
            message && <T style={styles.message}>{message}</T>
          )}
        </View>
      </View>

      <SafeAreaView style={styles.bottom} edges={['bottom']}>
        <T muted style={styles.recentTitle}>
          {uz.scan.recent}
        </T>
        <FlatList
          data={recent}
          keyExtractor={(s) => s.qr}
          style={styles.recentList}
          ListEmptyComponent={<T muted>{uz.scan.recentEmpty}</T>}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => open({ qr: item.qr, result: item.result, offline: false })}
              style={({ pressed }) => [styles.recentRow, pressed && styles.pressed]}
            >
              <T mono style={styles.recentNo}>
                № {item.part_number ?? uz.common.dash}
              </T>
              <View style={styles.recentText}>
                <T numberOfLines={1}>{item.result.part_name}</T>
                <T muted numberOfLines={1}>
                  {uz.scan.meta(
                    item.result.project_number,
                    item.result.item_name,
                    item.result.revision_label,
                  )}
                </T>
              </View>
            </Pressable>
          )}
        />
      </SafeAreaView>
    </View>
  );
}

function IconButton({
  name,
  label,
  onPress,
  active,
}: {
  name: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.icon, active && styles.iconActive, pressed && styles.pressed]}
    >
      <Ionicons name={name} size={size.icon} color={colors.white} />
    </Pressable>
  );
}

function PermissionScreen({ canAsk, onAsk }: { canAsk: boolean; onAsk: () => void }) {
  return (
    <SafeAreaView style={styles.permission}>
      <View style={styles.permissionTop}>
        <IconButton name="close" label={uz.common.close} onPress={() => router.back()} />
      </View>
      <Centered>
        <T style={styles.title}>{uz.scan.permissionTitle}</T>
        <T muted style={styles.permissionText}>
          {uz.scan.permissionText}
        </T>
        {canAsk ? (
          <Button label={uz.scan.permissionAsk} primary onPress={onAsk} />
        ) : (
          <Button label={uz.scan.permissionSettings} primary onPress={() => void Linking.openSettings()} />
        )}
      </Centered>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingBottom: space.sm,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.semibold,
    fontSize: fontSize.lg,
    color: colors.white,
  },
  icon: {
    width: hit,
    height: hit,
    borderRadius: radius.pill,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActive: { backgroundColor: colors.border },
  pressed: { opacity: 0.7 },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: space.lg },
  frame: { width: FRAME, height: FRAME },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: colors.accent },
  tl: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_W,
    borderLeftWidth: CORNER_W,
    borderTopLeftRadius: radius.md,
  },
  tr: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_W,
    borderRightWidth: CORNER_W,
    borderTopRightRadius: radius.md,
  },
  bl: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_W,
    borderLeftWidth: CORNER_W,
    borderBottomLeftRadius: radius.md,
  },
  br: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_W,
    borderRightWidth: CORNER_W,
    borderBottomRightRadius: radius.md,
  },
  hint: { textAlign: 'center', paddingHorizontal: space.xl, color: colors.white },
  status: { minHeight: hit, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  message: {
    color: colors.yellow,
    textAlign: 'center',
    backgroundColor: colors.panel,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.panel,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: space.md,
    paddingHorizontal: space.lg,
    maxHeight: '40%',
  },
  recentTitle: { marginBottom: space.sm },
  recentList: { flexGrow: 0 },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: hit + space.sm },
  recentNo: { width: 64, fontFamily: fonts.monoMedium, color: colors.white },
  recentText: { flex: 1, gap: space.xxs },
  permission: { flex: 1, backgroundColor: colors.bg },
  permissionTop: { padding: space.md },
  permissionText: { textAlign: 'center' },
});
