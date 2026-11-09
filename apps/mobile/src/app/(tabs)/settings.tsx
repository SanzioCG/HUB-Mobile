// Sozlamalar tabi: server manzili, foydalanuvchi (rol bilan) va kompaniya, qurilmani uzish, versiyalar.
import { VIEWER_CONTRACT, VIEWER_VERSION } from '@hub-mobile/viewer/version';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { roleLabel } from '../../api/types';
import { Button, T } from '../../components/ui';
import { SHOW_DEV_UI } from '../../config';
import { checkAndFetch } from '../../updates/checkUpdate';
import { clearLastError, loadLastError, type LastError } from '../../diag/lastError';
import { uz } from '../../i18n/uz';
import { usePairedSession, useSession } from '../../session/SessionProvider';
import { colors, fontSize, fonts, radius, space } from '../../theme';

export default function SettingsScreen() {
  const session = usePairedSession();
  const { apiUrl, unpair } = useSession();
  const [checking, setChecking] = useState(false);
  const [updateNote, setUpdateNote] = useState<string | null>(null);
  const [lastError, setLastError] = useState<LastError | null>(null);
  useEffect(() => {
    void loadLastError().then(setLastError);
  }, []);

  // M-A8: OTA — qo'lda tekshirish; yuklansa qayta ishga tushirishni taklif qiladi.
  const checkUpdate = async () => {
    setChecking(true);
    setUpdateNote(null);
    const res = await checkAndFetch(Updates);
    setChecking(false);
    if (res.kind === 'ready')
      Alert.alert(uz.settings.updateReadyTitle, uz.settings.updateReadyText, [
        { text: uz.settings.updateLater, style: 'cancel' },
        { text: uz.settings.updateRestart, onPress: () => void Updates.reloadAsync() },
      ]);
    else if (res.kind === 'none') setUpdateNote(uz.settings.updateNone);
    else if (res.kind === 'disabled') setUpdateNote(uz.settings.updateDisabled);
    else setUpdateNote(uz.settings.updateFailed(res.message));
  };

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
          <Row
            label={uz.settings.appVersion}
            value={Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? uz.common.dash}
          />
          {/* M-A8: versionCode (EAS remote, avtomatik oshadi), kanal va OTA yangilanish ID'si. */}
          <Row label={uz.settings.buildNumber} value={Application.nativeBuildVersion ?? uz.common.dash} />
          <Row label={uz.settings.viewerVersion} value={VIEWER_VERSION} />
          <Row label={uz.settings.contractVersion} value={VIEWER_CONTRACT} />
          <Row label={uz.settings.channel} value={Updates.channel ?? uz.common.dash} />
          <Row
            label={uz.settings.updateId}
            value={Updates.updateId ? Updates.updateId.slice(0, 8) : uz.settings.embedded}
          />
          <Button
            label={checking ? uz.settings.checking : uz.settings.checkUpdate}
            icon="cloud-download"
            disabled={checking}
            onPress={() => void checkUpdate()}
            style={styles.updateBtn}
          />
          {updateNote && <T muted>{updateNote}</T>}
          {/* M-A8: OTA sinovi — faqat JS o'zgarishi (APK qayta o'rnatilmaydi). */}
          <T muted>OTA sinovi 1</T>
        </Section>
        {/* Oxirgi JS xatosi (ilova yopilgan bo'lsa ham) — telefonda log yo'q, sababini shu yerdan o'qiymiz. */}
        {lastError && (
          <Section label={`${uz.diag.lastError} · ${lastError.at.slice(0, 16).replace('T', ' ')}`}>
            <T mono muted selectable>
              {`[${lastError.where}] ${lastError.message}`}
            </T>
            <Button
              label={uz.diag.clear}
              icon="x"
              onPress={() => void clearLastError().then(() => setLastError(null))}
            />
          </Section>
        )}
        <Button label={uz.settings.unpair} icon="log-out" onPress={() => void unpair()} />
        {SHOW_DEV_UI && (
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
  updateBtn: { alignSelf: 'flex-start', marginTop: space.sm },
});
