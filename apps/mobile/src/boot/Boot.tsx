// M-A6, 2-qism: yuklanish. Tizim splash'i (`preventAutoHideAsync`) → haqiqiy bosqichlar → ilova.
// Bosqichlar: shriftlar → secure-store (server, token) → kesh indeksi (GLB keshi va fayllar) → birinchi API so'rovi
// (loyihalar; oflaynda — keshdan). Xato yoki server javob bermasa — qotib qolmaydi: ilova oflayn/xato holatida ochiladi.
import { DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { primeProjectList } from '../api/hooks';
import { isOfflineError } from '../api/errors';
import { sortByUpdated } from '../api/projects';
import { listFiles } from '../files/store';
import { cachedEntries } from '../offline/glbCache';
import { loadProjects, saveProjects } from '../offline/store';
import { useSession } from '../session/SessionProvider';
import { colors } from '../theme';
import { LoadingScreen } from './LoadingScreen';
import {
  API_STAGE_TIMEOUT_MS,
  bootProgress,
  nextPhase,
  withTimeout,
  type BootPhase,
  type BootStage,
} from './phase';

// Modul yuklanganda: tizim splash'i ilova tayyor bo'lguncha (yoki yuklanish ekrani chiqquncha) qoladi.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);
/** Yuklanish boshlanishi — modul yuklangan payt. */
const BOOT_T0 = Date.now();

export function Boot({ children }: { children: ReactNode }) {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    DMMono_400Regular,
    DMMono_500Medium,
  });
  const { state, client } = useSession();
  // Asinxron bosqichlar (kesh, API) — callback'larda; shriftlar va sessiya — holatdan hosila.
  const [asyncDone, setAsyncDone] = useState<ReadonlySet<BootStage>>(new Set());
  const [phase, setPhase] = useState<BootPhase>('splash');
  const shownAt = useRef(0);
  const apiStarted = useRef(false);

  const mark = (s: BootStage) => setAsyncDone((d) => (d.has(s) ? d : new Set([...d, s])));
  const done = new Set<BootStage>(asyncDone);
  if (fontsLoaded || fontError) done.add('fonts');
  if (state.status !== 'loading') done.add('session');
  // Juftlanmagan — API bosqichi yo'q.
  if (state.status === 'unpaired') done.add('api');

  useEffect(() => {
    void Promise.all([cachedEntries(), listFiles()])
      .catch(() => undefined)
      .finally(() => mark('cache'));
  }, []);

  // Birinchi API so'rovi — juftlangan bo'lsa loyihalar ro'yxati (ekran uni qayta so'ramaydi: `primeProjectList`).
  useEffect(() => {
    if (state.status !== 'paired' || apiStarted.current) return;
    apiStarted.current = true;
    void withTimeout(client.projects(), API_STAGE_TIMEOUT_MS)
      .then(async (res) => {
        if (res === 'timeout') return; // ekran o'zi so'raydi va xato/oflayn holatini ko'rsatadi
        const list = sortByUpdated(res);
        primeProjectList(list, false);
        await saveProjects(list);
      })
      .catch(async (e: unknown) => {
        const cached = isOfflineError(e) ? await loadProjects() : null;
        if (cached) primeProjectList(cached, true);
      })
      .finally(() => mark('api'));
  }, [state.status, client]);

  const allDone = done.size === 4;
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      setPhase((p) => {
        const next = nextPhase({
          phase: p,
          allDone,
          elapsed: now - BOOT_T0,
          shownFor: shownAt.current ? now - shownAt.current : 0,
        });
        if (next !== p) {
          if (next === 'loading') shownAt.current = now;
          if (p === 'splash') void SplashScreen.hideAsync().catch(() => undefined);
        }
        return next;
      });
    };
    tick();
    const t = setInterval(tick, 50);
    return () => clearInterval(t);
  }, [allDone]);

  if (phase === 'ready') return children;
  if (phase === 'loading') return <LoadingScreen progress={bootProgress(done)} />;
  return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
}
