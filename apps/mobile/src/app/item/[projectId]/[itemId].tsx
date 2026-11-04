// 3D ko'rish: WebView to'liq ekran, suzuvchi sarlavha, rejimlar, pastki panel, detal kartasi.
// Skanerdan kelganda — tanlov holati (kontrakt 6): eski reviziya banneri, "R5 ni ochish", skaner kartasi.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { errorMessage } from '../../../api/errors';
import { openArAndroid, openArIos } from '../../../ar/openAr';
import { useProject } from '../../../api/hooks';
import { formatSize, type ProjectItem } from '../../../api/types';
import { ViewerRail } from '../../../components/ViewerRail';
import { BackButton } from '../../../components/parts';
import { locationOf, PartSheet } from '../../../components/PartSheet';
import { Button, Dot, ErrorState, Segmented, SkeletonList, Spinner, T } from '../../../components/ui';
import { AR_OPEN, type Delivery } from '../../../config';
import { uz } from '../../../i18n/uz';
import { scanBanner, type ViewTarget } from '../../../scan/banner';
import { ensureCached, isCached } from '../../../offline/glbCache';
import { labelsFromParts } from '../../../offline/labels';
import { saveLabels } from '../../../offline/store';
import { setRecentNumber } from '../../../scan/recent';
import { getSelection, itemKey, useSelectionListener, type ScanSelection } from '../../../scan/selection';
import { usePairedSession, useSession } from '../../../session/SessionProvider';
import { colors, fontSize, fonts, hit, radius, space } from '../../../theme';
import type { HostMessage, MaterialInfo, PartExtras, ViewerMessage, ViewMode } from '../../../viewer/bridge';
import { ViewerView, type ViewerHandle, type ViewerPhase } from '../../../viewer/ViewerView';

const MODES = [
  { key: 'solid', label: uz.viewer.modeSolid },
  { key: 'edges', label: uz.viewer.modeEdges },
  { key: 'xray', label: uz.viewer.modeXray },
] as const satisfies readonly { key: ViewMode; label: string }[];

/** Faqat `export_status: ready` buyum (glb_url bor) ochiladi — kontrakt 4. */
const fromItem = (it: ProjectItem & { glb_url: string }, updatedAt: string): ViewTarget => ({
  itemId: it.item_id,
  name: it.name,
  sizeMm: it.size_mm,
  glbUrl: it.glb_url,
  revisionId: it.revision_id,
  revisionLabel: it.revision_label,
  approved: it.approved,
  usdzUrl: it.usdz_url,
  updatedAt,
});

const fromScan = ({ result: r }: ScanSelection): ViewTarget => ({
  itemId: r.item_id,
  name: r.item_name,
  sizeMm: null,
  glbUrl: r.glb_url,
  revisionId: r.revision_id,
  revisionLabel: r.revision_label,
  approved: null,
  usdzUrl: r.usdz_url,
  updatedAt: null,
});

export default function ItemScreen() {
  const { projectId, itemId, qr } = useLocalSearchParams<{
    projectId: string;
    itemId: string;
    qr?: string;
  }>();
  const scan = qr ? getSelection(qr) : undefined;
  if (scan)
    return (
      <ItemViewer projectId={String(scan.result.project_id)} initial={fromScan(scan)} initialScan={scan} />
    );
  return <ProjectItemScreen projectId={projectId} itemId={itemId} />;
}

function ProjectItemScreen({ projectId, itemId }: { projectId: string; itemId: string }) {
  const { state, reload } = useProject(projectId);
  if (state.status === 'loading') return <SkeletonList rows={1} />;
  if (state.status === 'error') return <ErrorState message={errorMessage(state.error)} onRetry={reload} />;
  const item = state.data.items.find((it) => it.item_id === itemId);
  if (!item) return <ErrorState message={uz.errors.notFound} />;
  if (item.export_status !== 'ready' || item.glb_url === null)
    return (
      <ErrorState
        message={item.export_status === 'failed' ? uz.project.exportFailed : uz.project.exportPending}
      />
    );
  return (
    <ItemViewer
      projectId={projectId}
      initial={fromItem({ ...item, glb_url: item.glb_url }, state.data.updated_at)}
    />
  );
}

/**
 * Oflayn kesh siyosati (batch M-A2, 3): reviziya keshda bo'lsa — B (file://), aks holda — A (onlayn) va fonda keshga.
 * null — tekshirilmoqda.
 */
function useCachePolicy(revisionId: string): Delivery | null {
  const [state, setState] = useState<{ revisionId: string; delivery: Delivery } | null>(null);
  useEffect(() => {
    let alive = true;
    isCached(revisionId).then(
      (hit) => alive && setState({ revisionId, delivery: hit ? 'offline' : 'online' }),
      () => alive && setState({ revisionId, delivery: 'online' }),
    );
    return () => {
      alive = false;
    };
  }, [revisionId]);
  return state?.revisionId === revisionId ? state.delivery : null;
}

function ItemViewer({
  projectId,
  initial,
  initialScan,
}: {
  projectId: string;
  initial: ViewTarget;
  initialScan?: ScanSelection;
}) {
  const session = usePairedSession();
  const { client } = useSession();
  const token = session?.token ?? '';
  const [arBusy, setArBusy] = useState(false);
  const viewer = useRef<ViewerHandle>(null);
  const [target, setTarget] = useState(initial);
  const [scan, setScan] = useState(initialScan);
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<ViewerPhase>('preparing');
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode>('solid');
  const [dims, setDims] = useState(false);
  const [clips, setClips] = useState<string[]>([]);
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const [stats, setStats] = useState<string | null>(null);
  // Ochilish zonalari (M-A5, 1b): viewer holatni o'zida saqlaydi; bu — tugma ko'rinishi uchun.
  const [zonesOn, setZonesOn] = useState(false);
  const [selected, setSelected] = useState<{
    part: PartExtras;
    clip: string | null;
    byScan: boolean;
    material: MaterialInfo | null;
  } | null>(null);
  /** Model yuklangach tanlanadigan uid (skaner / "R5 ni ochish"). */
  const pendingUid = useRef<string | null>(initialScan?.result.part_uid ?? null);
  /** Viewer'ga `select` yuborilgan uid — `selected` javobi skaner kartasini ochadi. */
  const expectUid = useRef<string | null>(null);

  const send = (msg: HostMessage) => viewer.current?.send(msg);
  const anyOpen = open.size > 0;
  const key = itemKey(target.itemId, target.revisionId);
  const delivery = useCachePolicy(target.revisionId);

  const selectUid = (uid: string) => {
    expectUid.current = uid;
    setNotice(null);
    send({ type: 'select', uid });
  };

  // Ketma-ket skanerlash: o'sha buyum va reviziya — model qayta yuklanmaydi, faqat tanlov (kontrakt 6.6).
  useSelectionListener((sel) => {
    if (itemKey(sel.result.item_id, sel.result.revision_id) !== key) return;
    setScan(sel);
    selectUid(sel.result.part_uid);
  });

  const onMessage = (m: ViewerMessage) => {
    switch (m.type) {
      case 'progress':
        setProgress(m.total ? Math.round((100 * m.loaded) / m.total) : null);
        break;
      case 'loaded':
        setProgress(null);
        // Oflayn: etiketkalar (QR → detal) va onlayn ochilgan reviziya fonda keshga.
        void saveLabels(
          labelsFromParts(m.parts, {
            project_id: Number(projectId),
            item_id: target.itemId,
            item_name: target.name,
            revision_id: target.revisionId,
            revision_label: target.revisionLabel,
            glb_url: target.glbUrl,
          }),
        );
        if (delivery === 'online')
          void ensureCached(target.revisionId, target.glbUrl, token, {
            name: target.name,
            revisionLabel: target.revisionLabel,
          }).catch(() => undefined);
        setClips(m.item.clips);
        setOpen(new Set());
        if (pendingUid.current) selectUid(pendingUid.current);
        pendingUid.current = null;
        break;
      case 'selected': {
        const byScan = expectUid.current === m.uid;
        expectUid.current = null;
        setSelected({ part: m.extras, clip: m.clip, byScan, material: m.material });
        if (byScan && scan) void setRecentNumber(scan.qr, m.extras.number);
        break;
      }
      case 'deselected':
        setSelected(null);
        break;
      case 'clipState':
        // Kontrakt 1.6 (2.2): viewer `reveal` tartibida eshikni ham ochadi/yopadi — holat viewer'dan.
        setOpen(new Set(m.open));
        break;
      case 'stats':
        if (__DEV__) setStats(`${m.load_ms} ms · ${m.fps} fps · ${m.triangles} △ · ${m.textures_mb} MB`);
        break;
      case 'error':
        if (m.code === 'contract_mismatch') {
          setPhase('error');
          setError(uz.viewer.contractMismatch);
        }
        if (m.code === 'part_not_found') {
          expectUid.current = null;
          setNotice(uz.select.partNotFound); // model ochiq qoladi (kontrakt 6.7)
        }
        break;
    }
  };

  const toggleClip = (clip: string) => send({ type: 'toggle', clip });

  const openOrCloseAll = () => {
    send({ type: anyOpen ? 'closeAll' : 'openAll' });
  };

  const showAll = () => {
    send({ type: 'showAll' });
    setSelected(null);
  };

  const nextScan = () => router.push({ pathname: '/scan', params: { from: key } });

  // AR (kontrakt 3): Android — AR sahifasi (WebXR, M-A5: interaktiv) Custom Tabs yoki Chrome'da, iOS — Quick Look
  // (Safari); ar-link imzolangan havolasi bilan.
  const isIos = Platform.OS === 'ios';
  const arAvailable = Platform.OS === 'android' || (isIos && target.usdzUrl !== null);
  // Linking.openURL ichida `this` ishlatadi — metodni kontekstsiz uzatib bo'lmaydi.
  const openUrl = (url: string) => Linking.openURL(url);
  const openArPage = AR_OPEN === 'custom-tabs' ? (url: string) => WebBrowser.openBrowserAsync(url) : openUrl;
  const openAr = async () => {
    setArBusy(true);
    setNotice(uz.ar.loading);
    const req = { itemId: target.itemId, revisionId: target.revisionId, title: target.name };
    const res = isIos
      ? await openArIos({ ...req, usdzUrl: target.usdzUrl }, { client, openUrl })
      : await openArAndroid(req, { client, openUrl: openArPage, dev: __DEV__ });
    setNotice(res.ok ? null : res.message);
    setArBusy(false);
  };

  const retry = () => {
    setError(null);
    setSelected(null);
    setAttempt((a) => a + 1);
  };

  // "R5 ni ochish": joriy reviziya; detal unda bo'lsa — o'sha uid qayta tanlanadi.
  const openLatest = () => {
    const r = scan?.result;
    if (!r?.latest_glb_url || !r.latest_revision_id) return;
    pendingUid.current = r.part_in_latest ? r.part_uid : null;
    setSelected(null);
    setNotice(null);
    setPhase('preparing');
    setTarget({
      ...target,
      glbUrl: r.latest_glb_url,
      revisionId: r.latest_revision_id,
      revisionLabel: r.latest_revision_label ?? r.latest_revision_id,
    });
  };

  const banner = scanBanner(scan, target);

  return (
    <View style={styles.root}>
      {delivery && (
        <ViewerView
          key={`${target.revisionId}:${attempt}`}
          ref={viewer}
          delivery={delivery}
          glbUrl={target.glbUrl}
          revisionId={target.revisionId}
          token={token}
          onMessage={onMessage}
          onPhase={(p, e) => {
            setPhase(p);
            if (e) setError(e);
          }}
        />
      )}

      <SafeAreaView style={styles.overlayTop} edges={['top']} pointerEvents="box-none">
        <View style={styles.header}>
          <BackButton />
          <View style={styles.headerText}>
            <T style={styles.title} numberOfLines={1}>
              {target.name}
            </T>
            <T mono muted>
              {target.sizeMm
                ? `${formatSize(target.sizeMm)} · ${target.revisionLabel}`
                : target.revisionLabel}
            </T>
          </View>
        </View>
        {banner && (
          <View style={styles.banner}>
            <Dot color={colors.yellow} />
            <View style={styles.bannerText}>
              {banner.lines.map((l) => (
                <T key={l} style={styles.bannerLine}>
                  {l}
                </T>
              ))}
            </View>
            {banner.action && (
              <Pressable onPress={openLatest} style={styles.bannerAction} accessibilityRole="button">
                <T style={styles.bannerActionText}>{banner.action}</T>
              </Pressable>
            )}
          </View>
        )}
        {!banner && target.approved === false && (
          <View style={styles.badge}>
            <Dot color={colors.yellow} />
            <T style={styles.badgeText}>{uz.viewer.unapproved(target.revisionLabel)}</T>
          </View>
        )}
        {notice && (
          <View style={styles.badge}>
            <Dot color={colors.yellow} />
            <T style={styles.badgeText}>{notice}</T>
          </View>
        )}
        {stats && (
          <T mono muted style={styles.stats}>
            {stats}
          </T>
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
          <T muted>
            {phase === 'preparing'
              ? uz.viewer.preparing
              : progress !== null
                ? uz.select.loadingPercent(progress)
                : uz.viewer.loading}
          </T>
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
            revisionLabel: target.revisionLabel,
            approved: target.approved,
            updatedAt: target.updatedAt,
          }}
        />
      )}
      {phase === 'error' && (
        <View style={styles.errorBox}>
          <ErrorState message={`${uz.viewer.loadFailed}\n${error ?? ''}`} onRetry={retry} />
        </View>
      )}

      {selected ? (
        <PartSheet
          part={selected.part}
          clip={selected.clip}
          material={selected.material}
          clipOpen={selected.clip ? open.has(selected.clip) : false}
          onToggle={toggleClip}
          onClose={() => {
            setSelected(null);
            send({ type: 'deselect' });
          }}
          scan={
            selected.byScan
              ? { location: locationOf(selected.part), onShowAll: showAll, onNext: nextScan }
              : undefined
          }
        />
      ) : (
        <SafeAreaView style={styles.overlayBottom} edges={['bottom']}>
          {isIos && !target.usdzUrl && (
            <T muted style={styles.arNote}>
              {uz.ar.notReady}
            </T>
          )}
          <View style={styles.bar}>
            <Button
              label={anyOpen ? uz.viewer.closeAll : uz.viewer.openAll}
              onPress={openOrCloseAll}
              disabled={phase !== 'loaded' || !clips.length}
              style={styles.grow}
            />
            <Button
              label={uz.viewer.dims}
              active={dims}
              disabled={phase !== 'loaded'}
              onPress={() => {
                setDims(!dims);
                send({ type: 'setDims', on: !dims });
              }}
            />
            <Button
              label={uz.viewer.ar}
              disabled={!arAvailable || arBusy || phase !== 'loaded'}
              onPress={() => void openAr()}
            />
            <Button label={uz.viewer.reset} onPress={() => send({ type: 'resetView' })} />
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  stats: { marginHorizontal: space.md, fontSize: fontSize.sm - 2 },
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
  bannerText: { flex: 1, gap: space.xxs },
  bannerLine: { fontSize: fontSize.sm },
  bannerAction: {
    minHeight: hit,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
  },
  bannerActionText: { fontFamily: fonts.bold, color: colors.white, fontSize: fontSize.sm },
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
  arNote: { textAlign: 'center', marginHorizontal: space.md },
});
