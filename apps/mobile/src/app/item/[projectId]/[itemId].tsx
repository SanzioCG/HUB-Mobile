// 3D ko'rish — Figma 06 Mobile Viewer, "09 — 3D Viewer / Main View" (152:108): sarlavha va holat, yumaloq viewer
// maydoni ("3D / rejim", kattalashtirish, yo'riqnoma), pastki panel (o'lcham; Model / Detallar / Ma'lumot);
// "Boshqaruv" — 10 (ViewerControls), detal kartasi — 11 (PartSheet).
// Skanerdan kelganda — tanlov holati (kontrakt 6): eski reviziya banneri, "R5 ni ochish", skaner kartasi.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { BackHandler, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { errorMessage } from '../../../api/errors';
import { openArAndroid, openArIos } from '../../../ar/openAr';
import { useProject } from '../../../api/hooks';
import { formatSize, type ProjectItem } from '../../../api/types';
import { ViewerRail } from '../../../components/ViewerRail';
import { BackButton, StatusPill } from '../../../components/parts';
import { ScreenTitle } from '../../../components/screen';
import { locationOf, PartSheet } from '../../../components/PartSheet';
import { BarButton, Dot, ErrorState, SkeletonList, Spinner, T } from '../../../components/ui';
import { ViewerControls } from '../../../components/ViewerControls';
import { AR_OPEN, SHOW_DEV_UI, type Delivery } from '../../../config';
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

const MODE_LABEL: Record<ViewMode, string> = {
  solid: uz.viewer.modeSolid,
  edges: uz.viewer.modeEdges,
  xray: uz.viewer.modeXray,
};

type PanelTab = 'model' | 'parts';

const MODE_ORDER: readonly ViewMode[] = ['solid', 'edges', 'xray'];

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
};

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
  /** Figma 09: kattalashtirilgan viewer (sarlavha va pastki panel yashirin). */
  const [full, setFull] = useState(false);
  const [tab, setTab] = useState<PanelTab>('model');
  const [controls, setControls] = useState(false);
  /** Figma 19: "Ma’lumot" ekrani. */
  const [info, setInfo] = useState(false);
  /** "Detallar" yorlig'i: modeldagi detallar (viewer `loaded`). */
  const [parts, setParts] = useState<PartExtras[]>([]);
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
            // Kontrakt 4: id shaffof satr (U-HUB — UUID); `Number()` UUID'ni NaN qilardi.
            project_id: projectId,
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
        setParts(m.parts);
        setOpen(new Set());
        if (pendingUid.current) selectUid(pendingUid.current);
        pendingUid.current = null;
        break;
      case 'selected': {
        const byScan = expectUid.current === m.uid;
        expectUid.current = null;
        setSelected({ part: m.extras, clip: m.clip, byScan, material: m.material });
        if (byScan && scan && m.extras.number) void setRecentNumber(scan.qr, m.extras.number);
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
        if (SHOW_DEV_UI) setStats(`${m.load_ms} ms · ${m.fps} fps · ${m.triangles} △ · ${m.textures_mb} MB`);
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
      : await openArAndroid(req, { client, openUrl: openArPage, dev: SHOW_DEV_UI });
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
  const loaded = phase === 'loaded';
  const t = uz.viewerUi;
  const sizeText = target.sizeMm ? `${formatSize(target.sizeMm)} mm` : target.revisionLabel;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {!full && (
        <View style={styles.header}>
          <BackButton />
          <View style={styles.headerText}>
            <T style={styles.title} numberOfLines={1}>
              {target.name}
            </T>
            <T style={styles.status} numberOfLines={1}>
              {t.status(delivery === 'offline')}
            </T>
          </View>
          {target.approved !== null && (
            <StatusPill
              tone={target.approved ? 'green' : 'yellow'}
              label={target.approved ? uz.status.approved : uz.status.unapproved}
            />
          )}
        </View>
      )}

      <View style={[styles.canvas, full && styles.canvasFull]}>
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

        <View style={styles.canvasTop} pointerEvents="box-none">
          <Pressable
            onPress={() => {
              const next = MODE_ORDER[(MODE_ORDER.indexOf(mode) + 1) % MODE_ORDER.length]!;
              setMode(next);
              send({ type: 'setMode', mode: next });
            }}
            disabled={!loaded}
            accessibilityRole="button"
            accessibilityLabel={t.modeHint}
            hitSlop={12}
          >
            <T style={styles.canvasLabel}>{t.canvas(MODE_LABEL[mode].toUpperCase())}</T>
          </Pressable>
          <Pressable
            onPress={() => setFull(!full)}
            accessibilityRole="button"
            accessibilityLabel={full ? t.collapse : t.expand}
            hitSlop={12}
          >
            <T style={styles.expand}>{full ? '⤡' : '⤢'}</T>
          </Pressable>
        </View>

        <View style={styles.overlays} pointerEvents="box-none">
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
        </View>

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
        {!selected && !controls && (
          <ViewerRail
            send={send}
            disabled={!loaded}
            zonesOn={zonesOn}
            onToggleZones={() => {
              send({ type: 'setHelpers', on: !zonesOn });
              setZonesOn(!zonesOn);
            }}
            info={{
              revisionLabel: target.revisionLabel,
              approved: target.approved,
              updatedAt: target.updatedAt,
              size: target.sizeMm ? formatSize(target.sizeMm) : null,
            }}
          />
        )}
        {loaded && !selected && !controls && (
          <T style={styles.hint} pointerEvents="none">
            {t.hint}
          </T>
        )}
        {phase === 'error' && (
          <View style={styles.errorBox}>
            <ErrorState message={`${uz.viewer.loadFailed}\n${error ?? ''}`} onRetry={retry} />
          </View>
        )}
      </View>

      {!full && !selected && !controls && (
        <View style={styles.panel}>
          <View style={styles.panelHead}>
            <View style={styles.panelHeadText}>
              <T style={styles.eyebrow} numberOfLines={1}>
                {t.eyebrow(target.name)}
              </T>
              <T style={styles.size}>{sizeText}</T>
            </View>
            <Pressable
              onPress={() => setControls(true)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.controlsButton, pressed && styles.partRowPressed]}
            >
              <T style={styles.controlsLabel}>{t.controls}</T>
            </Pressable>
          </View>
          <View style={styles.separator} />
          <View style={styles.tabs}>
            {(
              [
                ['model', t.tabModel],
                ['parts', t.tabParts],
                ['info', t.tabInfo],
              ] as const
            ).map(([key, label]) => (
              <Pressable
                key={key}
                onPress={() => (key === 'info' ? setInfo(true) : setTab(key))}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === key }}
                style={styles.tab}
              >
                <T style={[styles.tabLabel, tab === key && styles.tabActive]}>{label}</T>
              </Pressable>
            ))}
          </View>

          {tab === 'model' && (
            <>
              {isIos && !target.usdzUrl && (
                <T muted style={styles.arNote}>
                  {uz.ar.notReady}
                </T>
              )}
              <View style={styles.bar}>
                <BarButton
                  icon="open-all"
                  label={anyOpen ? uz.viewer.closeAll : uz.viewer.openAll}
                  onPress={openOrCloseAll}
                  disabled={!loaded || !clips.length}
                />
                <BarButton
                  icon="ruler"
                  label={uz.viewer.dims}
                  active={dims}
                  disabled={!loaded}
                  onPress={() => {
                    setDims(!dims);
                    send({ type: 'setDims', on: !dims });
                  }}
                />
                <BarButton
                  icon="box"
                  label={uz.viewer.ar}
                  disabled={!arAvailable || arBusy || !loaded}
                  onPress={() => void openAr()}
                />
                <BarButton
                  icon="rotate-ccw"
                  label={uz.viewer.reset}
                  disabled={!loaded}
                  onPress={() => send({ type: 'resetView' })}
                />
              </View>
            </>
          )}
          {tab === 'parts' && (
            <ScrollView style={styles.partList} contentContainerStyle={styles.partListContent}>
              {parts.length === 0 && <T style={styles.panelHint}>{t.partsHint}</T>}
              {parts.map((p) => (
                <Pressable
                  key={p.uid}
                  onPress={() => selectUid(p.uid)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.partRow, pressed && styles.partRowPressed]}
                >
                  <T mono style={styles.partNo}>
                    {p.number ? `№ ${p.number}` : uz.common.dash}
                  </T>
                  <T style={styles.partName} numberOfLines={1}>
                    {p.name}
                  </T>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {selected && (
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
      )}
      {controls && !selected && <ViewerControls onClose={() => setControls(false)} />}
      {info && (
        <ProjectInfo
          name={target.name}
          revision={target.revisionLabel}
          approved={target.approved}
          local={delivery === 'offline'}
          updatedAt={target.updatedAt}
          onBack={() => setInfo(false)}
        />
      )}
    </SafeAreaView>
  );
}

/** Figma 06 "19 — Project Information / Ma’lumot" (224:10): nom, reviziya, holat, oxirgi yangilanish. */
function ProjectInfo({
  name,
  revision,
  approved,
  local,
  updatedAt,
  onBack,
}: {
  name: string;
  revision: string;
  approved: boolean | null;
  local: boolean;
  updatedAt: string | null;
  onBack: () => void;
}) {
  const t = uz.viewerUi;
  // Android "orqaga" — faqat shu ekranni yopadi (viewer ochiq qoladi).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);
  const state = [
    approved === null ? null : approved ? uz.status.approved : uz.status.unapproved,
    local ? t.savedLocal : null,
    t.readOnly,
  ]
    .filter(Boolean)
    .join('  ·  ');
  return (
    <SafeAreaView style={styles.infoScreen} edges={['top', 'bottom']}>
      <View style={styles.infoHead}>
        <ScreenTitle back onBack={onBack} title={t.infoTitle} />
      </View>
      <T style={styles.infoSubtitle}>{t.infoSubtitle}</T>
      <View style={styles.infoCards}>
        <InfoCard label={t.infoName} value={name} big />
        <InfoCard label={t.infoRevision} value={revision || t.noRevision} />
        <InfoCard label={t.infoState} value={state} />
        <InfoCard label={t.infoUpdated} value={updatedAt ? formatDate(updatedAt) : t.noDate} />
      </View>
    </SafeAreaView>
  );
}

function InfoCard({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <View style={[styles.infoCard, big && styles.infoCardBig]}>
      <T style={styles.infoLabel}>{label}</T>
      <T style={[styles.infoValue, big && styles.infoValueBig]}>{value}</T>
    </View>
  );
}

// O'lchamlar — Figma 152:108 (viewer maydoni chetdan 12, radius 14; pastki panel 366 × 116).
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerText: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.semibold, fontSize: 18, color: colors.text },
  status: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },
  canvas: {
    flex: 1,
    marginHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.viewerCanvas,
    overflow: 'hidden',
  },
  canvasFull: { marginHorizontal: 0, borderRadius: 0, borderWidth: 0 },
  canvasTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 14,
    paddingRight: 14,
    paddingTop: 12,
  },
  canvasLabel: { fontFamily: fonts.medium, fontSize: 10, color: colors.textMuted, letterSpacing: 0.3 },
  expand: { fontFamily: fonts.medium, fontSize: 16, color: colors.text },
  overlays: { position: 'absolute', top: 40, left: 0, right: 0, gap: space.sm },
  stats: { marginHorizontal: space.md, fontSize: fontSize.sm - 2 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bannerText: { flex: 1, gap: space.xxs },
  bannerLine: { fontSize: fontSize.sm },
  bannerAction: {
    minHeight: hit,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
  },
  bannerActionText: { fontFamily: fonts.semibold, color: colors.onAccent, fontSize: fontSize.sm },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    alignSelf: 'flex-start',
    marginHorizontal: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: { fontSize: fontSize.sm },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: space.md },
  hint: {
    position: 'absolute',
    bottom: 16,
    left: 12,
    right: 12,
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
  errorBox: { ...StyleSheet.absoluteFill, backgroundColor: colors.bg },
  panel: {
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderRadius: 14,
    backgroundColor: colors.tabBar,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 10, color: colors.textMuted, letterSpacing: 0.3 },
  size: { marginTop: 6, fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  separator: { marginTop: 9, height: 1, backgroundColor: colors.border },
  tabs: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  tab: { minHeight: 40, paddingHorizontal: 14, justifyContent: 'center' },
  tabLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  tabActive: { color: colors.text },
  bar: { flexDirection: 'row', gap: space.xxs },
  arNote: { textAlign: 'center', marginBottom: space.xs },
  partList: { maxHeight: 168 },
  partListContent: { gap: 4, paddingBottom: 4 },
  panelHint: { textAlign: 'center', fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  partRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
  },
  partRowPressed: { backgroundColor: colors.surface },
  partNo: { width: 64, fontFamily: fonts.monoMedium, fontSize: 12, color: colors.textMuted },
  partName: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.text },
  panelHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  panelHeadText: { flex: 1 },
  // Figma 224:6 / 224:7: 92 × 30, radius 8, laym 10 px yozuv.
  controlsButton: {
    minWidth: 92,
    height: 30,
    marginTop: -4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#1C1F21',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlsLabel: { fontFamily: fonts.medium, fontSize: 10, color: colors.accent },
  // Figma 224:10 — "Ma’lumot".
  infoScreen: { ...StyleSheet.absoluteFill, backgroundColor: colors.bg, paddingHorizontal: 24 },
  infoHead: { marginTop: 8, marginLeft: -12 },
  infoSubtitle: { marginTop: 4, fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  infoCards: { marginTop: 23, gap: 16 },
  infoCard: {
    minHeight: 82,
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 10,
    borderRadius: 10,
    backgroundColor: colors.tabBar,
  },
  infoCardBig: { minHeight: 104 },
  infoLabel: { fontFamily: fonts.medium, fontSize: 10, color: '#8C9499', letterSpacing: 0.3 },
  infoValue: { fontFamily: fonts.medium, fontSize: 14, color: '#E8EBE8' },
  infoValueBig: { fontSize: 16 },
});
