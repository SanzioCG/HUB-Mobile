// Pastki tab bar (dizayn rasmi): Loyihalar / Skaner (markazda, katta, accent) / Offline / Sozlamalar.
// Skaner — alohida to'liq ekran (kamera); tab faqat uni ochadi.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Tabs } from 'expo-router';
import { Pressable, StyleSheet, View, type ColorValue } from 'react-native';
import { uz } from '../../i18n/uz';
import { colors, fontSize, fonts, hit, radius, size, space } from '../../theme';

type IconName = keyof typeof Ionicons.glyphMap;

const icon =
  (on: IconName, off: IconName) =>
  ({ focused, color }: { focused: boolean; color: ColorValue }) => (
    <Ionicons name={focused ? on : off} size={size.icon} color={color as string} />
  );

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: styles.bar,
        tabBarActiveTintColor: colors.white,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
      }}
    >
      <Tabs.Screen
        name="projects"
        options={{ title: uz.tabs.projects, tabBarIcon: icon('albums', 'albums-outline') }}
      />
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
                <Ionicons name="scan" size={size.icon + 6} color={colors.white} />
              </Pressable>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="offline"
        options={{ title: uz.tabs.offline, tabBarIcon: icon('layers', 'layers-outline') }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: uz.tabs.settings, tabBarIcon: icon('settings', 'settings-outline') }}
      />
    </Tabs>
  );
}

const SCAN = hit + space.lg;

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.panel,
    borderTopColor: colors.border,
    height: hit + space.xxl + space.sm,
    paddingTop: space.xs,
  },
  item: { minHeight: hit },
  label: { fontFamily: fonts.medium, fontSize: fontSize.sm - 2 },
  scanWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
  scan: {
    width: SCAN,
    height: SCAN,
    marginTop: -space.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: space.xs,
    borderColor: colors.bg,
  },
  pressed: { opacity: 0.8 },
});
