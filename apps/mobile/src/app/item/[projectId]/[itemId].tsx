// 3D ko'rish: WebView to'liq ekran, suzuvchi sarlavha, rejimlar, pastki panel, detal kartasi.
import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { errorMessage } from '../../../api/errors';
import { useProject } from '../../../api/hooks';
import { formatSize, type ProjectItem } from '../../../api/types';
import { BackButton } from '../../../components/parts';
import { PartSheet } from '../../../components/PartSheet';
import { Button, Dot, ErrorState, Segmented, SkeletonList, Spinner, T } from '../../../components/ui';
import { defaultDelivery } from '../../../config';
import { uz } from '../../../i18n/uz';
import { usePairedSession } from '../../../session/SessionProvider';
import { colors, fontSize, fonts, radius, space } from '../../../theme';
import type { HostMessage, PartExtras, ViewerMessage, ViewMode } from '../../../viewer/bridge';
import { ViewerView, type ViewerHandle, type ViewerPhase } from '../../../viewer/ViewerView';

const MODES = [
  { key: 'solid', label: uz.viewer.modeSolid },
  { key: 'edges', label: uz.viewer.modeEdges },
  { key: 'xray', label: uz.viewer.modeXray },
] as const satisfies readonly { key: ViewMode; label: string }[];

export default function ItemScreen() {
  const { projectId, itemId } = useLocalSearchParams<{ projectId: string; itemId: string }>();
  const { state, reload } = useProject(projectId);

  if (state.status === 'loading') return <SkeletonList rows={1} />;
  if (state.status === 'error') return <ErrorState message={errorMessage(state.error)} onRetry={reload} />;
  const item = state.data.items.find((it) => it.item_id === itemId);
  if (!item) return <ErrorState message={uz.errors.notFound} />;
  return <ItemViewer item={item} />;
}

function ItemViewer({ item }: { item: ProjectItem }) {
  const session = usePairedSession();
  const viewer = useRef<ViewerHandle>(null);
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<ViewerPhase>('preparing');
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode>('solid');
  const [dims, setDims] = useState(false);
  const [clips, setClips] = useState<string[]>([]);
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const [selected, setSelected] = useState<{ part: PartExtras; clip: string | null } | null>(null);

  const send = (msg: HostMessage) => viewer.current?.send(msg);
  const anyOpen = open.size > 0;

  const onMessage = (m: ViewerMessage) => {
    if (m.type === 'loaded') {
      setClips(m.item.clips);
      setOpen(new Set());
    } else if (m.type === 'selected') {
      setSelected({ part: m.extras, clip: m.clip });
    } else if (m.type === 'deselected') {
      setSelected(null);
    }
  };

  const toggleClip = (clip: string) => {
    send({ type: 'toggle', clip });
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(clip)) next.delete(clip);
      else next.add(clip);
      return next;
    });
  };

  const openOrCloseAll = () => {
    send({ type: anyOpen ? 'closeAll' : 'openAll' });
    setOpen(anyOpen ? new Set() : new Set(clips));
  };

  const retry = () => {
    setError(null);
    setSelected(null);
    setAttempt((a) => a + 1);
  };

  return (
    <View style={styles.root}>
      <ViewerView
        key={attempt}
        ref={viewer}
        delivery={defaultDelivery}
        glbUrl={item.glb_url}
        revisionId={item.revision_id}
        token={session?.token ?? ''}
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
              {item.name}
            </T>
            <T mono muted>
              {formatSize(item.size_mm)}
            </T>
          </View>
        </View>
        {!item.approved && (
          <View style={styles.badge}>
            <Dot color={colors.yellow} />
            <T style={styles.badgeText}>{uz.viewer.unapproved(item.revision_label)}</T>
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
          <T muted>{phase === 'preparing' ? uz.viewer.preparing : uz.viewer.loading}</T>
        </View>
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
          clipOpen={selected.clip ? open.has(selected.clip) : false}
          onToggle={toggleClip}
          onClose={() => {
            setSelected(null);
            send({ type: 'deselect' });
          }}
        />
      ) : (
        <SafeAreaView style={styles.overlayBottom} edges={['bottom']}>
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
            <Button label={uz.viewer.ar} disabled />
            <Button label={uz.viewer.reset} onPress={() => send({ type: 'resetView' })} />
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
