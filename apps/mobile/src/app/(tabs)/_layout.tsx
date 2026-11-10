// Pastki tab bar — Figma 06 Mobile Viewer, "Bottom Tab Bar / 5 destinations" (220:2):
// Loyihalar / Offline / Skaner / Fayllar / Sozlamalar. Balandlik 76 (+ pastki xavfsiz zona), ikonka 22, yorliq 9 px;
// faol — laym ikonka va yorliq, ikonka tepasida 22 × 2 laym chiziq.
// Skaner va Fayllar — alohida to'liq ekranlar (`/scan`, `/files`; juftlanmagan holatda ham ochiladi); tab faqat ularni ochadi.
import { router, Tabs } from 'expo-router';
import { StyleSheet, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { uz } from '../../i18n/uz';
import { Icon, type IconName } from '../../ui/Icon';
import { colors, fonts } from '../../theme';

/** Figma 220:2 o'lchamlari. */
const BAR = 76;
const TAB_ICON = 22;

const icon =
  (name: IconName) =>
  ({ focused, color }: { focused: boolean; color: ColorValue }) => (
    <View style={styles.iconWrap}>
      {focused && <View style={styles.indicator} />}
      <Icon name={name} size={TAB_ICON} color={color as string} />
    </View>
  );

/** Tab o'z ekranini emas, to'liq ekranli marshrutni ochadi. */
const opens = (href: '/files' | '/scan') => ({
  tabPress: (e: { preventDefault: () => void }) => {
    e.preventDefault();
    router.push(href);
  },
});

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: [styles.bar, { height: BAR + insets.bottom, paddingBottom: insets.bottom }],
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: styles.label,
        tabBarIconStyle: styles.iconSlot,
        tabBarItemStyle: styles.item,
      }}
    >
      <Tabs.Screen name="projects" options={{ title: uz.tabs.projects, tabBarIcon: icon('tab-projects') }} />
      <Tabs.Screen name="offline" options={{ title: uz.tabs.offline, tabBarIcon: icon('tab-offline') }} />
      <Tabs.Screen
        name="scanner"
        options={{ title: uz.tabs.scanner, tabBarIcon: icon('tab-scanner') }}
        listeners={opens('/scan')}
      />
      <Tabs.Screen
        name="files"
        options={{ title: uz.tabs.files, tabBarIcon: icon('tab-files') }}
        listeners={opens('/files')}
      />
      <Tabs.Screen name="settings" options={{ title: uz.tabs.settings, tabBarIcon: icon('tab-settings') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.tabBar,
    borderTopColor: colors.tabBorder,
    borderTopWidth: 1,
    paddingTop: 0,
  },
  item: { paddingTop: 11, paddingBottom: 10 },
  iconSlot: { width: TAB_ICON, height: TAB_ICON },
  label: { fontFamily: fonts.medium, fontSize: 9, marginTop: 6 },
  iconWrap: { alignItems: 'center' },
  indicator: {
    position: 'absolute',
    top: -12,
    width: TAB_ICON,
    height: 2,
    backgroundColor: colors.accent,
  },
});
