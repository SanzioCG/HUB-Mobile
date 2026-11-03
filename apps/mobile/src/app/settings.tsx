// Sozlamalar: kompaniya, server, oflayn kesh (band hajm, tozalash), qurilmani uzish.
import { useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../components/parts';
import { Button, T } from '../components/ui';
import { CACHE_LIMITS } from '../config';
import { uz } from '../i18n/uz';
import { cacheUsage, clearCache } from '../offline/glbCache';
import { formatMb } from '../offline/policy';
import { usePairedSession, useSession } from '../session/SessionProvider';
import { colors, radius, space } from '../theme';

export default function SettingsScreen() {
  const session = usePairedSession();
  const { apiUrl, unpair } = useSession();
  const [usage, setUsage] = useState<{ count: number; bytes: number } | null>(null);

  const refresh = useCallback(() => {
    void cacheUsage().then(setUsage);
  }, []);
  useFocusEffect(refresh);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <Header title={uz.settings.title} />
      <ScrollView contentContainerStyle={styles.body}>
        <Section label={uz.settings.company}>
          <T>{session?.company.name ?? uz.common.dash}</T>
          <T muted>{session?.user.name}</T>
        </Section>
        <Section label={uz.settings.server}>
          <T mono>{apiUrl ?? uz.common.dash}</T>
        </Section>
        <Section label={uz.settings.cache}>
          <T mono>{usage ? uz.settings.cacheUsage(usage.count, formatMb(usage.bytes)) : uz.common.loading}</T>
          <T muted>{uz.settings.cacheLimits(CACHE_LIMITS.maxRevisions, formatMb(CACHE_LIMITS.maxBytes))}</T>
          <Button
            label={uz.settings.clearCache}
            disabled={!usage?.count}
            onPress={() => void clearCache().then(refresh)}
            style={styles.action}
          />
        </Section>
        <Button label={uz.settings.unpair} onPress={() => void unpair()} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <T muted>{label}</T>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { padding: space.lg, gap: space.md },
  section: { backgroundColor: colors.panel, borderRadius: radius.md, padding: space.lg, gap: space.xs },
  action: { marginTop: space.sm, alignSelf: 'flex-start' },
});
