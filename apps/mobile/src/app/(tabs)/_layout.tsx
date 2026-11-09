// Pastki tab bar (Graphite Engineering): Loyihalar / Offline / Skaner (markazda, laym) / Fayllar / Sozlamalar.
// Skaner va Fayllar — alohida to'liq ekranlar (`/scan`, `/files`; juftlanmagan holatda ham ochiladi); tab faqat ularni ochadi.
// Faol tab — laym ikonka va yorliq, tepasida ingichka laym indikator.
import { router, Tabs } from 'expo-router';
import { Pressable, StyleSheet, View, type ColorValue } from 'react-native';
import { uz } from '../../i18n/uz';
import { Icon, type IconName } from '../../ui/Icon';
import { colors, fontSize, fonts, hit, radius, size, space } from '../../theme';

const icon =
  (name: IconName) =>
  ({ focused, color }: { focused: boolean; color: ColorValue }) => (
    <View style={styles.iconWrap}>
      {focused && <View style={styles.indicator} />}
      <Icon name={name} size={size.icon} color={color as string} />
    </View>
  );

/** Tab o'z ekranini emas, to'liq ekranli marshrutni ochadi. */
const opens = (href: '/files') => ({
  tabPress: (e: { preventDefault: () => void }) => {
    e.preventDefault();
    router.push(href);
  },
});

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: styles.bar,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
      }}
    >
      <Tabs.Screen name="projects" options={{ title: uz.tabs.projects, tabBarIcon: icon('layout-grid') }} />
      <Tabs.Screen name="offline" options={{ title: uz.tabs.offline, tabBarIcon: icon('cloud-download') }} />
      <Tabs.Screen
        name="scanner"
        options={{
          title: uz.tabs.scanner,
          tabBarButton: () => (
            <View style={styles.scanWrap}>
              <Pressable
                onPress={() => router.push('/scan')}
                accessibilityRole="button"
                accessibilityLabel={uz.tabs.scanner}
                style={({ pressed }) => [styles.scan, pressed && styles.pressed]}
              >
                <Icon name="scan-qr-code" size={size.icon + 4} color={colors.onAccent} />
              </Pressable>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="files"
        options={{ title: uz.tabs.files, tabBarIcon: icon('folder-open') }}
        listeners={opens('/files')}
      />
      <Tabs.Screen name="settings" options={{ title: uz.tabs.settings, tabBarIcon: icon('settings') }} />
    </Tabs>
  );
}

const SCAN = hit + space.xs;

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.panel,
    borderTopColor: colors.border,
    height: hit + space.xxl + space.sm,
    paddingTop: space.xs,
  },
  item: { minHeight: hit },
  label: { fontFamily: fonts.medium, fontSize: fontSize.label },
  iconWrap: { alignItems: 'center' },
  indicator: {
    position: 'absolute',
    top: -space.sm - 1,
    width: space.lg + space.xs,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.accent,
  },
  scanWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scan: {
    width: SCAN,
    height: SCAN,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.8 },
});
