// 3D ekrandagi "Boshqaruv" — Figma 06 Mobile Viewer, "10 — Viewer Controls / Bottom Sheet" (152:132, 390 × 390):
// tutqich, "Model boshqaruvi", NAVIGATSIYA qatorlari. Imo-ishoralar doim yoqiq (OrbitControls: bir barmoq aylantiradi,
// ikki barmoq yaqinlashtiradi va suradi). Model tepada ko'rinib turadi; bo'sh joyga yoki tutqichga bosish — yopadi.
import { Pressable, StyleSheet, View } from 'react-native';
import { uz } from '../i18n/uz';
import { colors, fonts } from '../theme';
import { ListRow, SectionLabel } from './screen';
import { T } from './ui';

export function ViewerControls({ onClose }: { onClose: () => void }) {
  const t = uz.controlsUi;
  return (
    <>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={uz.common.close}
      />
      <View style={styles.sheet}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={uz.common.close}
          hitSlop={16}
          style={styles.grabberHit}
        >
          <View style={styles.grabber} />
        </Pressable>
        <T style={styles.title}>{t.title}</T>
        <T style={styles.subtitle}>{t.subtitle}</T>
        <SectionLabel style={styles.section}>{t.navigation}</SectionLabel>
        <View style={styles.rows}>
          <ListRow title={t.orbit} detail={t.orbitHint} tag={t.on} />
          <ListRow title={t.zoom} detail={t.zoomHint} tag={t.on} />
          <ListRow title={t.pan} detail={t.panHint} tag={t.on} />
        </View>
      </View>
    </>
  );
}

// O'lchamlar — Figma 152:132 (tutqich 36 × 4 tepadan 16; sarlavha 42; qatorlar 66, oraliq 6).
const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingBottom: 38,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  grabberHit: { alignSelf: 'center', paddingTop: 16, paddingBottom: 22 },
  grabber: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#8C9499' },
  title: { fontFamily: fonts.semibold, fontSize: 21, color: colors.text },
  subtitle: { marginTop: 4, fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  section: { marginTop: 18, marginBottom: 6 },
  rows: { gap: 6 },
});
