// Fayldan ochilgan buyum yoki "Butun loyiha" 3D'da (kontrakt 1.6, 10.4): detal kartasi, eshik/tortmalar (ichki tortma —
// avval eshik), o'lchamlar, ochilish zonalari. QR → detal (10.4): `uid` va (3-holat) sariq banner parametrlardan.
// AR, juftlash va server ro'yxati — fayl rejimida yo'q ("AR server ulanganda ishlaydi").
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { itemKey } from '@hub-mobile/viewer/uhub';
import { BackButton } from '../../components/parts';
import { PartSheet } from '../../components/PartSheet';
import { BarButton, Dot, ErrorState, Segmented, Spinner, T } from '../../components/ui';
import { ViewerRail } from '../../components/ViewerRail';
import { fileDir, getFile, type OpenedFile } from '../../files/store';
import { formatSize } from '../../api/types';
import { uz } from '../../i18n/uz';
import { colors, fontSize, fonts, radius, space } from '../../theme';
import type { LocalSource } from '../../viewer/delivery';
import type { HostMessage, MaterialInfo, PartExtras, ViewerMessage, ViewMode } from '../../viewer/bridge';
import { ViewerView, type ViewerHandle, type ViewerPhase } from '../../viewer/ViewerView';

const MODES = [
  { key: 'solid', label: uz.viewer.modeSolid },
  { key: 'edges', label: uz.viewer.modeEdges },
  { key: 'xray', label: uz.viewer.modeXray },
] as const satisfies readonly { key: ViewMode; label: string }[];

export default function FileViewScreen() {
  const params = useLocalSearchParams<{ fileId: string; item: string; uid?: string; banner?: string }>();
  const [file, setFile] = useState<OpenedFile | null | undefined>(undefined);
  useEffect(() => {
    void getFile(params.fileId).then(setFile);
  }, [params.fileId]);

  if (file === undefined)
    return (
      <View style={[styles.root, styles.center]}>
        <Spinner />
      </View>
    );
  if (file === null)
    return (
      <SafeAreaView style={styles.root}>
        <BackButton />
        <ErrorState message={uz.files.notFound} />
      </SafeAreaView>
    );
  return <FileView file={file} item={params.item} uid={params.uid} banner={params.banner} />;
}

function FileView({
  file,
  item,
  uid,
  banner,
}: {
  file: OpenedFile;
  item: string;
  uid?: string;
  banner?: string;
}) {
  const viewer = useRef<ViewerHandle>(null);
  const whole = item === 'all';
  const one = whole ? null : (file.items.find((it) => itemKey(it) === item) ?? null);
  const local = useMemo<LocalSource>(
    () =>
      whole
        ? {
            dirUri: fileDir(file.id).uri,
            project: file.items.map((it) => ({ key: itemKey(it), glbUrl: it.glb, transform: it.transform })),
          }
        : { dirUri: fileDir(file.id).uri, glbUrl: one?.glb ?? '' },
    [file, whole, one],
  );
  const [phase, setPhase] = useState<ViewerPhase>('preparing');
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode>('solid');
  const [dims, setDims] = useState(false);
  const [zonesOn, setZonesOn] = useState(false);
  const [clips, setClips] = useState<string[]>([]);
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const [selected, setSelected] = useState<{
    part: PartExtras;
    clip: string | null;
    material: MaterialInfo | null;
  } | null>(null);
  const pendingUid = useRef<string | null>(uid ?? null);

  const send = (msg: HostMessage) => viewer.current?.send(msg);
  const anyOpen = open.size > 0;

  const onMessage = (m: ViewerMessage) => {
    switch (m.type) {
      case 'progress':
        setProgress(m.total ? Math.round((100 * m.loaded) / m.total) : null);
        break;
      case 'loaded':
        setProgress(null);
        setClips(m.item.clips);
        // QR → detal (10.4, 2–3-holat): 6-bo'lim 4–7 qadamlari — reveal, shaffoflik, kontur, kamera.
        if (pendingUid.current) send({ type: 'select', uid: pendingUid.current });
        pendingUid.current = null;
        break;
      case 'selected':
        setSelected({ part: m.extras, clip: m.clip, material: m.material });
        break;
      case 'deselected':
        setSelected(null);
        break;
      case 'clipState':
        setOpen(new Set(m.open));
        break;
      case 'error':
        if (m.code === 'contract_mismatch') {
          setPhase('error');
          setError(uz.viewer.contractMismatch);
        }
        if (m.code === 'part_not_found') setNotice(uz.select.partNotFound);
        break;
    }
  };

  const title = whole ? file.project_name : (one?.name ?? file.project_name);
  const meta = whole
    ? `№ ${file.project_number} · ${uz.files.items(file.items.length)}`
    : one
      ? `${one.size_mm ? `${formatSize(one.size_mm)} · ` : ''}${one.revision_label}`
      : '';

  return (
    <View style={styles.root}>
      <ViewerView
        ref={viewer}
        style={StyleSheet.absoluteFill}
        delivery="offline"
        local={local}
        glbUrl=""
        revisionId={`${file.id}:${item}`}
        token=""
        onMessage={onMessage}
        onPhase={(p, e) => {
          setPhase(p);
          if (e) setError(e);
        }}
      />

      <SafeAreaView style={styles.overlayTop} edges={['top']} pointerEvents="box-none">
        <View style={styles.header}>
          <BackButton />
          <View style={styles.headerText}>
            <T style={styles.title} numberOfLines={1}>
              {title}
            </T>
            <T mono muted>
              {meta}
            </T>
          </View>
        </View>
        {banner && (
          <View style={styles.banner}>
            <Dot color={colors.yellow} />
            <T style={styles.bannerText}>{banner}</T>
          </View>
        )}
        {one && (
          <View style={styles.badge}>
            <Dot color={one.approved ? colors.green : colors.yellow} />
            <T style={styles.badgeText}>{uz.files.exported(one.approved)}</T>
          </View>
        )}
        {notice && (
          <View style={styles.badge}>
            <Dot color={colors.yellow} />
            <T style={styles.badgeText}>{notice}</T>
          </View>
        )}
        <View style={styles.modes}>
          <Segmented
            options={MODES}
            value={mode}
            onChange={(m) => {
              setMode(m);
              send({ type: 'setMode', mode: m });
            }}
          />
        </View>
      </SafeAreaView>

      {(phase === 'preparing' || phase === 'loading') && (
        <View style={styles.center} pointerEvents="none">
          <Spinner />
          <T muted>{progress !== null ? uz.select.loadingPercent(progress) : uz.viewer.loading}</T>
        </View>
      )}
      {!selected && (
        <ViewerRail
          send={send}
          disabled={phase !== 'loaded'}
          zonesOn={zonesOn}
          onToggleZones={() => {
            send({ type: 'setHelpers', on: !zonesOn });
            setZonesOn(!zonesOn);
          }}
          info={{
            revisionLabel: one?.revision_label ?? uz.common.dash,
            approved: one ? one.approved : null,
            updatedAt: file.exported_at || null,
          }}
        />
      )}
      {phase === 'error' && (
        <View style={styles.errorBox}>
          <ErrorState message={`${uz.viewer.loadFailed}\n${error ?? ''}`} />
        </View>
      )}

      {selected ? (
        <PartSheet
          part={selected.part}
          clip={selected.clip}
          material={selected.material}
          clipOpen={selected.clip ? open.has(selected.clip) : false}
          onToggle={(clip) => send({ type: 'toggle', clip })}
          onClose={() => {
            setSelected(null);
            send({ type: 'deselect' });
          }}
        />
      ) : (
        <SafeAreaView style={styles.overlayBottom} edges={['bottom']}>
          <View style={styles.bar}>
            <BarButton
              icon="open-all"
              label={anyOpen ? uz.viewer.closeAll : uz.viewer.openAll}
              onPress={() => send({ type: anyOpen ? 'closeAll' : 'openAll' })}
              disabled={phase !== 'loaded' || !clips.length}
            />
            <BarButton
              icon="ruler"
              label={uz.viewer.dims}
              active={dims}
              disabled={phase !== 'loaded'}
              onPress={() => {
                setDims(!dims);
                send({ type: 'setDims', on: !dims });
              }}
            />
            {/* Kontrakt 10.1: fayldan AR yo'q — AR server orqali. */}
            <BarButton icon="box" label={uz.viewer.ar} onPress={() => setNotice(uz.files.arNeedsServer)} />
            <BarButton
              icon="rotate-ccw"
              label={uz.viewer.reset}
              onPress={() => {
                send({ type: 'showAll' });
                send({ type: 'resetView' });
                setSelected(null);
              }}
            />
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  overlayTop: { position: 'absolute', top: 0, left: 0, right: 0, gap: space.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.md,
    paddingRight: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.panel,
  },
  headerText: { flex: 1, paddingVertical: space.sm },
  title: { fontFamily: fonts.semibold, fontSize: fontSize.lg },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.md,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.panel,
    borderLeftWidth: 3,
    borderLeftColor: colors.yellow,
  },
  bannerText: { flex: 1, fontSize: fontSize.sm },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    alignSelf: 'flex-start',
    marginHorizontal: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.panel,
  },
  badgeText: { fontSize: fontSize.sm },
  modes: { marginHorizontal: space.md },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: space.md },
  errorBox: { ...StyleSheet.absoluteFill, backgroundColor: colors.bg },
  overlayBottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  bar: {
    flexDirection: 'row',
    gap: space.sm,
    margin: space.md,
    padding: space.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.panel,
  },
  grow: { flex: 1 },
});
