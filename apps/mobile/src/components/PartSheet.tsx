// Detal kartasi: viewer `selected` xabaridan, pastdan chiqadi. Faqat kontraktdagi `extras.uhub` maydonlari.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { uz } from '../i18n/uz';
import { colors, duration, fontSize, fonts, hit, radius, size, space } from '../theme';
import type { PartExtras } from '../viewer/bridge';
import { Button, T } from './ui';

interface Props {
  part: PartExtras;
  /** Detal joylashgan eshik/tortma klipi (viewer `selected.clip`); bo'lmasa tugma yo'q. */
  clip: string | null;
  clipOpen: boolean;
  onToggle: (clip: string) => void;
  onClose: () => void;
}

export function PartSheet({ part, clip, clipOpen, onToggle, onClose }: Props) {
  const [slide] = useState(() => new Animated.Value(1));
  useEffect(() => {
    slide.setValue(1);
    Animated.timing(slide, { toValue: 0, duration: duration.sheet, useNativeDriver: true }).start();
  }, [part.uid, slide]);

  const edges = Object.entries(part.edges ?? {});
  return (
    <Animated.View
      style={[
        styles.sheet,
        { transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [0, 400] }) }] },
      ]}
    >
      <View style={styles.head}>
        <View style={styles.headText}>
          <T mono style={styles.number}>
            № {part.number}
          </T>
          <T style={styles.name}>{part.name}</T>
        </View>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={uz.common.close}
          style={styles.close}
          hitSlop={space.sm}
        >
          <Ionicons name="close" size={size.icon} color={colors.text} />
        </Pressable>
      </View>

      <Row label={uz.part.size}>
        <T mono>{part.size_mm.join(' × ')} mm</T>
      </Row>
      <Row label={uz.part.material}>
        <T>{part.material}</T>
      </Row>
      <Row label={uz.part.edges}>
        {edges.length ? (
          edges.map(([k, v]) => (
            <T key={k}>
              <T mono>{k}</T> {v}
            </T>
          ))
        ) : (
          <T muted>{uz.part.noEdges}</T>
        )}
      </Row>
      <Row label={uz.part.article}>
        <T mono>{part.article ?? uz.common.dash}</T>
      </Row>

      {clip && (
        <Button
          label={clipOpen ? uz.part.close : uz.part.open}
          active={clipOpen}
          onPress={() => onToggle(clip)}
          style={styles.toggle}
        />
      )}
    </Animated.View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <T muted style={styles.label}>
        {label}
      </T>
      <View style={styles.value}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.panel,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: space.lg,
    paddingBottom: space.xl,
    gap: space.md,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  headText: { flex: 1, gap: space.xs },
  number: { fontFamily: fonts.monoMedium, fontSize: fontSize.number, color: colors.white },
  name: { fontFamily: fonts.semibold, fontSize: fontSize.lg },
  close: {
    width: hit,
    height: hit,
    borderRadius: radius.pill,
    backgroundColor: colors.panel2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', gap: space.md },
  label: { width: 88 },
  value: { flex: 1, gap: space.xxs },
  toggle: { marginTop: space.xs },
});
