import { DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider, useSession } from '../session/SessionProvider';
import { colors } from '../theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    DMMono_400Regular,
    DMMono_500Medium,
  });

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SessionProvider>{fontsLoaded ? <Routes /> : <Splash />}</SessionProvider>
    </SafeAreaProvider>
  );
}

function Splash() {
  return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
}

/** Juftlanmagan — faqat juftlash; juftlangan — ilova. 401 → token o'chadi → guard juftlashga qaytaradi. */
function Routes() {
  const { state } = useSession();
  if (state.status === 'loading') return <Splash />;
  const paired = state.status === 'paired';
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={!paired}>
        <Stack.Screen name="pair" />
      </Stack.Protected>
      <Stack.Protected guard={paired}>
        <Stack.Screen name="projects/index" />
        <Stack.Screen name="projects/[id]" />
        <Stack.Screen name="item/[projectId]/[itemId]" />
      </Stack.Protected>
      <Stack.Screen name="dev/spike" />
    </Stack>
  );
}
