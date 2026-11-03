// Debug: GLB yetkazish spike'i (ADR-M002). Yo'lni tanlash, vaqtlar (ms) va xato matni ekranda.
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Segmented, T } from '../../components/ui';
import { defaultApiUrl, defaultDelivery, type Delivery } from '../../config';
import { uz } from '../../i18n/uz';
import { colors, fontSize, fonts, hit, radius, space } from '../../theme';
import { clearCache } from '../../offline/glbCache';
import { ViewerView, type ViewerPhase, type ViewerTimings } from '../../viewer/ViewerView';

const ms = (v: number | null) => (v === null ? uz.common.dash : `${v} ms`);

export default function SpikeScreen() {
  const api = defaultApiUrl() ?? '';
  const [delivery, setDelivery] = useState<Delivery>(defaultDelivery);
  const [glbUrl, setGlbUrl] = useState(`${api}/files/glb/m0-r5.glb`);
  const [revisionId, setRevisionId] = useState('m0-r5');
  // Mock'ning doimiy dev tokeni (mock/.env.example); juftlangan token bilan almashtirsa bo'ladi.
  const [token, setToken] = useState('dev-token');
  const [run, setRun] = useState<{ key: number; delivery: Delivery } | null>(null);
  const [phase, setPhase] = useState<ViewerPhase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timings, setTimings] = useState<ViewerTimings | null>(null);

  const start = () => {
    setTimings(null);
    setError(null);
    setRun((r) => ({ key: (r?.key ?? 0) + 1, delivery }));
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.panel}>
        <View style={styles.row}>
          <Button label={uz.common.back} onPress={() => router.back()} />
          <T style={styles.title}>{uz.spike.title}</T>
        </View>
        <Segmented
          options={[
            { key: 'online', label: uz.spike.online },
            { key: 'offline', label: uz.spike.offline },
          ]}
          value={delivery}
          onChange={setDelivery}
        />
        <Field value={glbUrl} onChangeText={setGlbUrl} label="glb_url" />
        <View style={styles.row}>
          <Field value={revisionId} onChangeText={setRevisionId} label="revision_id" />
          <Field value={token} onChangeText={setToken} label="token" />
        </View>
        <View style={styles.row}>
          <Button label={uz.spike.load} primary onPress={start} style={styles.grow} />
          <Button label={uz.spike.clear} onPress={() => void clearCache()} />
        </View>
        <T mono style={styles.metrics}>
          {[
            `${phase ?? uz.common.dash}`,
            `${uz.spike.download}: ${timings?.cacheHit ? uz.spike.cacheHit : ms(timings?.downloadMs ?? null)}`,
            `${uz.spike.viewer}: ${ms(timings?.viewerMs ?? null)}`,
            `${uz.spike.total}: ${ms(timings?.totalMs ?? null)}`,
          ].join('  ·  ')}
        </T>
        {error && <T style={styles.error}>{error}</T>}
      </View>
      {run && (
        <ViewerView
          key={run.key}
          delivery={run.delivery}
          glbUrl={glbUrl}
          revisionId={revisionId}
          token={token}
          onPhase={(p, e) => {
            setPhase(p);
            if (e) setError(e);
          }}
          onTimings={setTimings}
          onMessage={(m) => m.type === 'error' && setError(`${m.code}: ${m.message}`)}
        />
      )}
    </SafeAreaView>
  );
}

function Field({ label, ...rest }: { label: string; value: string; onChangeText: (v: string) => void }) {
  return (
    <View style={styles.grow}>
      <T muted>{label}</T>
      <TextInput
        {...rest}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  panel: { padding: space.lg, gap: space.sm, backgroundColor: colors.panel },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  grow: { flex: 1 },
  title: { fontFamily: fonts.semibold, fontSize: fontSize.lg },
  input: {
    minHeight: hit,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
  },
  metrics: { fontSize: fontSize.sm },
  error: { color: colors.yellow, fontSize: fontSize.sm },
});
