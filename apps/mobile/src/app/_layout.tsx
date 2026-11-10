import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, T } from '../components/ui';
import { installGlobalErrorCapture, saveLastError } from '../diag/lastError';
import { uz } from '../i18n/uz';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Boot } from '../boot/Boot';
import { SHOW_DEV_UI } from '../config';
import { SessionProvider, useSession } from '../session/SessionProvider';
import { colors, space } from '../theme';

// Ushlanmagan JS xatolari — sababi saqlanadi (Sozlamalar → "Oxirgi xato"); telefonda log yo'q.
installGlobalErrorCapture(
  (globalThis as { ErrorUtils?: Parameters<typeof installGlobalErrorCapture>[0] }).ErrorUtils,
);

/**
 * Ekran chizishdagi xato ilovani yopmaydi: xato matni va "Qayta urinish" (expo-router ErrorBoundary).
 * Matn saqlanadi — keyin Sozlamalar → "Oxirgi xato".
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    void saveLastError('screen', error);
  }, [error]);
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space.lg, paddingTop: space.lg * 3, gap: space.md }}
    >
      <T>{uz.diag.crashTitle}</T>
      <T mono muted selectable>
        {`${error.name}: ${error.message}`}
      </T>
      <Button label={uz.diag.retry} icon="rotate-ccw" onPress={() => void retry()} />
    </ScrollView>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SessionProvider>
        {/* M-A6: tizim splash'i → yuklanish ekrani (haqiqiy bosqichlar) → ilova. */}
        <Boot>
          <Routes />
        </Boot>
      </SessionProvider>
    </SafeAreaProvider>
  );
}

/** Juftlanmagan — faqat juftlash; juftlangan — ilova. 401 → token o'chadi → guard juftlashga qaytaradi. */
function Routes() {
  const { state } = useSession();
  if (state.status === 'loading') return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  const paired = state.status === 'paired';
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={!paired}>
        <Stack.Screen name="pair" />
      </Stack.Protected>
      <Stack.Protected guard={paired}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="projects/all" />
        <Stack.Screen name="projects/[id]" />
        <Stack.Screen name="item/[projectId]/[itemId]" />
      </Stack.Protected>
      {/* Skaner juftlanmagan holatda ham: "QR bilan ulash" (kontrakt 4.1). */}
      <Stack.Screen name="scan" options={{ animation: 'fade' }} />
      {/* Kontrakt 1.6 (10): `.uhub` faylidan ochish — juftlashsiz ham. */}
      <Stack.Screen name="files/index" />
      <Stack.Screen name="files/[fileId]" />
      <Stack.Screen name="files/view" />
      {/* Dev sinov sahifalari — release'da yo'q (havola bilan ham ochilmaydi). */}
      <Stack.Protected guard={SHOW_DEV_UI}>
        <Stack.Screen name="dev/spike" />
      </Stack.Protected>
    </Stack>
  );
}
