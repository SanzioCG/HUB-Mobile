// M-A6: ilovaning o'z yuklanish ekrani (tizim splash'idan keyin) — Figma 06 Mobile Viewer, "02 — Splash Screen" (139:15):
// markazda master logo (124 × 132), "U-HUB" va "MOBILE VIEWER", ingichka ajratgich, shior; pastda 60 × 3 progress
// chizig'i (haqiqiy yuklanish bosqichlari) va versiya.
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { T } from '../components/ui';
import { uz } from '../i18n/uz';
import { colors, fonts } from '../theme';
import { LogoMaster } from '../ui/generated';

const version = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '';

export function LoadingScreen({ progress }: { progress: number }) {
  const [value] = useState(() => new Animated.Value(progress));
  useEffect(() => {
    Animated.timing(value, { toValue: progress, duration: 200, useNativeDriver: false }).start();
  }, [progress, value]);
  const width = value.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View
      style={styles.root}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
    >
      <View style={styles.center}>
        <LogoMaster size={132} />
        <T style={styles.wordmark}>U-HUB</T>
        <T style={styles.product}>{uz.brand.product}</T>
        <View style={styles.separator} />
        <T style={styles.tagline}>{uz.brand.tagline}</T>
      </View>
      <View style={styles.bottom}>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { width }]} />
        </View>
        {version !== '' && <T style={styles.version}>{uz.brand.version(version)}</T>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  wordmark: { marginTop: 30, fontFamily: fonts.semibold, fontSize: 30, color: colors.text },
  product: { marginTop: 1, fontFamily: fonts.semibold, fontSize: 11, color: colors.accent },
  separator: { marginTop: 27, width: 48, height: 2, backgroundColor: colors.raised },
  tagline: { marginTop: 26, fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 38, alignItems: 'center', gap: 21 },
  track: {
    width: 60,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: colors.raised,
  },
  fill: { height: '100%', backgroundColor: colors.accent },
  version: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted, letterSpacing: 0.5 },
});
