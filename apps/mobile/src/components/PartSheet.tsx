// Detal kartasi — Figma 06 Mobile Viewer, "11 — Parts Materials Dimensions" (152:159): viewer `selected` xabaridan,
// pastdan chiqadi (model tepada ko'rinib turadi — boshqa detalni bosib tanlash mumkin). Tanlangan detal kartasi,
// yorliqlar DETAL / MATERIAL / O'LCHAMLAR. Faqat kontraktdagi `extras.uhub` maydonlari.
import { useEffect, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { uz } from '../i18n/uz';
import { Icon } from '../ui/Icon';
import { clipAction } from '../viewer/clipAction';
import { colors, duration, fonts, radius } from '../theme';
import type { MaterialInfo, PartExtras } from '../viewer/bridge';
import { ListRow, SectionLabel } from './screen';
import { Button, T } from './ui';

// V-110: `locationOf` va `clipAction` — `viewer/clipAction.ts` (native importsiz, jest testi uchun).
export { locationOf } from '../viewer/clipAction';

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

type Tab = 'part' | 'material' | 'dims';

export function PartSheet({ part, clip, clipOpen, onToggle, onClose, scan, material }: Props) {
  const [slide] = useState(() => new Animated.Value(1));
  const [tab, setTab] = useState<Tab>('part');
  useEffect(() => {
    slide.setValue(1);
    Animated.timing(slide, { toValue: 0, duration: duration.sheet, useNativeDriver: true }).start();
  }, [part.uid, slide]);

  const t = uz.partUi;
  const hardware = part.kind === 'hardware';
  // Kontrakt 2.1: har doim 4 kalit (L1 L2 W1 W2), null — kromkasiz. Furniturada `edges` yo'q.
  const edges = Object.entries(part.edges ?? {}) as [string, string | null][];
  const banded = edges.filter(([, v]) => v !== null);
  const size = part.size_mm ?? [];
  const materialDetail = material
    ? [material.code, material.supplier, material.kind].filter(Boolean).join('  •  ')
    : undefined;

  return (
    <Animated.View
      style={[
        styles.sheet,
        { transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [0, 400] }) }] },
      ]}
    >
      <View style={styles.card}>
        <View style={styles.cardText}>
          <T style={styles.name} numberOfLines={2}>
            {part.name}
          </T>
          <T style={styles.id}>{part.number ? t.id(part.number) : t.hardwareId}</T>
          {scan?.location && <T style={styles.id}>{scan.location}</T>}
        </View>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={uz.common.close}
          style={styles.close}
          hitSlop={12}
        >
          <Icon name="x" size={20} color={colors.text} />
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

      <View style={styles.tabs}>
        {(
          [
            ['part', t.tabPart],
            ['material', t.tabMaterial],
            ['dims', t.tabDims],
          ] as const
        ).map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setTab(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === key }}
            style={styles.tab}
          >
            <T style={[styles.tabLabel, tab === key && styles.tabActive]}>{label}</T>
            {tab === key && <View style={styles.underline} />}
          </Pressable>
        ))}
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {tab === 'part' && (
          <>
            <SectionLabel style={styles.section}>{t.props}</SectionLabel>
            <ListRow title={t.component} detail={part.name} tag={part.number ?? undefined} />
            {hardware && (part.supplier || part.model) && (
              <ListRow
                title={t.supplier}
                detail={[part.supplier, part.model].filter(Boolean).join('  •  ')}
              />
            )}
            {part.article && <ListRow title={t.article} detail={part.article} />}
            {clip && (
              <Button
                // M-A6 / V-110: eshik, tortma yoki pantograf — yozuv va ikonka klip nomidan.
                label={clipAction(clip, clipOpen).label}
                icon={clipAction(clip, clipOpen).icon}
                active={clipOpen}
                onPress={() => onToggle(clip)}
              />
            )}
          </>
        )}

        {tab === 'material' && (
          <>
            <SectionLabel style={styles.section}>{t.tabMaterial}</SectionLabel>
            <ListRow
              title={t.material}
              detail={
                [part.material ?? material?.name, materialDetail].filter(Boolean).join('\n') || uz.common.dash
              }
              tag={material?.thickness_mm != null ? `${material.thickness_mm} mm` : undefined}
            />
            {!hardware && (
              <ListRow
                title={t.edges}
                detail={
                  edges.length
                    ? edges.map(([k, v]) => `${k}  ${v ?? uz.part.edgeless}`).join('\n')
                    : uz.part.noEdges
                }
                tag={banded.length ? t.edgesCount(banded.length) : t.noEdgesTag}
              />
            )}
          </>
        )}

        {tab === 'dims' && (
          <>
            <SectionLabel style={styles.section}>{t.dims}</SectionLabel>
            <View style={styles.dims}>
              {size.length === 0 && <T style={styles.dimLine}>{uz.common.dash}</T>}
              {[t.length, t.width, t.thickness].slice(0, size.length).map((label, i) => (
                <View key={label} style={styles.dimRow}>
                  <T style={styles.dimLabel}>{label}</T>
                  <T style={styles.dimLine}>{`${size[i]} mm`}</T>
                </View>
              ))}
            </View>
            <T style={styles.note}>{t.note}</T>
          </>
        )}
        <T style={styles.footer}>{t.footer}</T>
      </ScrollView>
    </Animated.View>
  );
}

// O'lchamlar — Figma 152:159 (karta 342 × 82, yorliqlar 12 px laym, qatorlar 66).
const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '62%',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  card: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.tabBar,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardText: { flex: 1, gap: 6 },
  name: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  id: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },
  close: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flexDirection: 'row', gap: 8 },
  grow: { flex: 1 },
  tabs: { flexDirection: 'row', justifyContent: 'center', gap: 4 },
  tab: { minHeight: 40, paddingHorizontal: 10, justifyContent: 'center', alignItems: 'center' },
  tabLabel: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textMuted },
  tabActive: { color: colors.accent },
  underline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.accent,
  },
  body: { flexGrow: 0 },
  bodyContent: { gap: 10, paddingBottom: 4 },
  section: { marginTop: 4 },
  dims: {
    gap: 8,
    padding: 16,
    borderRadius: 10,
    backgroundColor: colors.tabBar,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dimRow: { flexDirection: 'row', gap: 12 },
  dimLabel: { width: 72, fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  dimLine: { fontFamily: fonts.medium, fontSize: 13, color: colors.text },
  note: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  footer: {
    marginTop: 4,
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.textMuted,
  },
});
