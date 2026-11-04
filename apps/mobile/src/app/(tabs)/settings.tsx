// Sozlamalar tabi: server manzili, foydalanuvchi (rol bilan) va kompaniya, qurilmani uzish, versiyalar.
import { VIEWER_CONTRACT, VIEWER_VERSION } from '@hub-mobile/viewer/version';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { roleLabel } from '../../api/types';
import { Button, T } from '../../components/ui';
import { uz } from '../../i18n/uz';
import { usePairedSession, useSession } from '../../session/SessionProvider';
import { colors, fontSize, fonts, radius, space } from '../../theme';

export default function SettingsScreen() {
  const session = usePairedSession();
  const { apiUrl, unpair } = useSession();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body}>
        <T style={styles.title}>{uz.settings.title}</T>
        <Section label={uz.settings.server}>
          <T mono>{apiUrl ?? uz.common.dash}</T>
        </Section>
        <Section label={uz.settings.user}>
          <T>{session?.user.name ?? uz.common.dash}</T>
          {session && <T muted>{roleLabel(session.user.role)}</T>}
        </Section>
        <Section label={uz.settings.company}>
          <T>{session?.company.name ?? uz.common.dash}</T>
        </Section>
        <Section label={uz.settings.versions}>
          <Row label={uz.settings.appVersion} value={Constants.expoConfig?.version ?? uz.common.dash} />
          <Row label={uz.settings.viewerVersion} value={VIEWER_VERSION} />
          <Row label={uz.settings.contractVersion} value={VIEWER_CONTRACT} />
        </Section>
        <Button label={uz.settings.unpair} icon="log-out" onPress={() => void unpair()} />
        {__DEV__ && (
          <Section label={uz.settings.dev}>
            <Button
              label="Spike: GLB yetkazish"
              onPress={() => router.push('/dev/spike')}
              style={styles.devBtn}
            />
          </Section>
        )}
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <T>{label}</T>
      <T mono>{value}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { padding: space.lg, gap: space.md },
  title: { fontFamily: fonts.semibold, fontSize: fontSize.title },
  section: { backgroundColor: colors.panel, borderRadius: radius.md, padding: space.lg, gap: space.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  devBtn: { alignSelf: 'flex-start', marginTop: space.xs },
});
