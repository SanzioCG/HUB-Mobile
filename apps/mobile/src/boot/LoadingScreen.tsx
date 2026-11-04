// M-A6: ilovaning o'z yuklanish ekrani (tizim splash'idan keyin): to'liq ekran `loading-bg.png` (cover), markazda
// `logo-full.svg`, pastda progress chizig'i (ekran enining ~45 %, 4 px, fon `surface`, to'lishi `accent`).
// Rasmlar repo ildizidagi assets/brand dan — fayl shu nom bilan almashtirilsa kod o'zgarmaydi.
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { LogoFull } from '../ui/generated';

const BG = require('../../../../assets/brand/loading-bg.png') as number;

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
      <Image source={BG} style={StyleSheet.absoluteFill} contentFit="cover" />
      <View style={styles.center}>
        <LogoFull size={64} />
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  track: {
    position: 'absolute',
    bottom: '14%',
    alignSelf: 'center',
    width: '45%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  fill: { height: '100%', backgroundColor: colors.accent },
});
