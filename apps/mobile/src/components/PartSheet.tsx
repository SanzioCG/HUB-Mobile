// Detal kartasi: viewer `selected` xabaridan, pastdan chiqadi. Faqat kontraktdagi `extras.uhub` maydonlari.
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { uz } from '../i18n/uz';
import { Icon } from '../ui/Icon';
import { colors, duration, fontSize, fonts, hit, radius, size, space } from '../theme';
import type { MaterialInfo, PartExtras } from '../viewer/bridge';
import { Button, T } from './ui';

/** Skaner tanlovi kartasi (kontrakt 6, maket): joylashuv, "Hammasini ko'rsatish", "Keyingisi". */
export interface ScanCardActions {
  location: string | null;
  onShowAll: () => void;
  onNext: () => void;
}

interface Props {
  part: PartExtras;
  /** Detal joylashgan eshik/tortma klipi (viewer `selected.clip`); bo'lmasa tugma yo'q. */
  clip: string | null;
  clipOpen: boolean;
  onToggle: (clip: string) => void;
  onClose: () => void;
  /** Berilsa — skaner varianti. */
  scan?: ScanCardActions;
  /** Plita materiali `extras.uhub` (kontrakt 2.5) — viewer `selected.material`. */
  material?: MaterialInfo | null;
}

/**
 * Detal joylashuvi `reveal` kliplaridan (eshik orqasida / tortma ichida).
 * TODO(contract): aniq joylashuv ("2-tortma ichida") kontraktda yo'q — tartib raqami bilinmaydi.
 */
export function locationOf(part: PartExtras): string | null {
  if (part.reveal.some((c) => c.startsWith('drawer__'))) return uz.select.inDrawer;
  if (part.reveal.some((c) => c.startsWith('door__'))) return uz.select.behindDoor;
  return null;
}

export function PartSheet({ part, clip, clipOpen, onToggle, onClose, scan, material }: Props) {
  const [slide] = useState(() => new Animated.Value(1));
  useEffect(() => {
    slide.setValue(1);
    Animated.timing(slide, { toValue: 0, duration: duration.sheet, useNativeDriver: true }).start();
  }, [part.uid, slide]);

  // Kontrakt 2.1: har doim 4 kalit (L1 L2 W1 W2), null — kromkasiz. Furniturada `edges` yo'q.
  const edges = Object.entries(part.edges ?? {}) as [string, string | null][];
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
          {scan?.location && <T muted>{scan.location}</T>}
        </View>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={uz.common.close}
          style={styles.close}
          hitSlop={space.sm}
        >
          <Icon name="x" size={size.icon} color={colors.text} />
        </Pressable>
      </View>

      {scan && (
        <View style={styles.actions}>
          <Button label={uz.select.showAll} onPress={scan.onShowAll} style={styles.grow} />
          <Button
            label={uz.select.next}
            primary
            onPress={scan.onNext}
            style={styles.grow}
            icon="scan-qr-code"
          />
        </View>
      )}

      <Row label={uz.part.size}>
        <T mono>{part.size_mm.join(' × ')} mm</T>
      </Row>
      <Row label={uz.part.material}>
        <T>{part.material}</T>
        {material && (
          <T muted>
            {[
              `${uz.part.code}: ${material.code}`,
              `${uz.part.supplier}: ${material.supplier}`,
              `${uz.part.kind}: ${material.kind}`,
              // Kontrakt 1.4: `null` — qalinlik ma'nosiz (metall, plastik) → "—".
              `${uz.part.thickness}: ${material.thickness_mm !== null ? `${material.thickness_mm} mm` : uz.common.dash}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </T>
        )}
      </Row>
      <Row label={uz.part.edges}>
        {edges.length ? (
          edges.map(([k, v]) => (
            <T key={k} muted={v === null}>
              <T mono>{k}</T> {v ?? uz.part.edgeless}
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
          // M-A6: eshik/tortma — ochish yoki yopish ikonkasi (klip nomidan).
          icon={
            clip.includes('door__')
              ? clipOpen
                ? 'door-close'
                : 'door-open'
              : clipOpen
                ? 'drawer-close'
                : 'drawer-open'
          }
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
  number: { fontFamily: fonts.monoMedium, fontSize: fontSize.number, color: colors.text },
  name: { fontFamily: fonts.semibold, fontSize: fontSize.lg },
  close: {
    width: hit,
    height: hit,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', gap: space.md },
  label: { width: 88 },
  value: { flex: 1, gap: space.xxs },
  toggle: { marginTop: space.xs },
  actions: { flexDirection: 'row', gap: space.sm },
  grow: { flex: 1 },
});
