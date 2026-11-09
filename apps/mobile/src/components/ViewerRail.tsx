// 3D ekrandagi o'ng vertikal panel (Graphite Engineering): har tugma — ikonka + yorliq (faqat ikonkaga tayanmaydi).
// Ko'rinishlar (kamera), Qatlamlar (Korpus / Fasadlar / Furnitura), Sig'dirish, Ochilish zonalari (M-A5), Ma'lumot.
// Panel relsning chap tomonida ochiladi va modelning markazini to'smaydi.
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { uz } from '../i18n/uz';
import { Icon, type IconName } from '../ui/Icon';
import { colors, fontSize, fonts, hit, radius, size, space } from '../theme';
import type { HostMessage } from '../viewer/bridge';
import { StatusPill } from './parts';
import { T } from './ui';

type Group = 'carcass' | 'fronts' | 'hardware';
type Panel = 'views' | 'layers' | 'info' | null;

export interface RailInfo {
  revisionLabel: string;
  /** null — noma'lum (skanerlangan eski reviziya). */
  approved: boolean | null;
  /** ISO-8601 yoki null. */
  updatedAt: string | null;
  /** "1200 × 2400 × 600" yoki null (skanerda o'lcham yo'q). */
  size: string | null;
}

const VIEWS = [
  { key: 'front', label: uz.viewer.viewFront },
  { key: 'side', label: uz.viewer.viewSide },
  { key: 'top', label: uz.viewer.viewTop },
  { key: 'iso', label: uz.viewer.viewIso },
] as const;

const GROUPS: readonly { key: Group; label: string }[] = [
  { key: 'carcass', label: uz.viewer.layerCarcass },
  { key: 'fronts', label: uz.viewer.layerFronts },
  { key: 'hardware', label: uz.viewer.layerHardware },
];

const formatDate = (iso: string | null) => {
  if (!iso) return uz.common.dash;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return uz.common.dash;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
};

export function ViewerRail({
  send,
  info,
  disabled,
  zonesOn,
  onToggleZones,
}: {
  send: (msg: HostMessage) => void;
  info: RailInfo;
  disabled: boolean;
  /** Ochilish zonalari holati ota ekranda (panel detal kartasi ochilganda yashirinadi). */
  zonesOn: boolean;
  onToggleZones: () => void;
}) {
  const [panel, setPanel] = useState<Panel>(null);
  const [view, setView] = useState<(typeof VIEWS)[number]['key'] | null>(null);
  const [visible, setVisible] = useState<Record<Group, boolean>>({
    carcass: true,
    fronts: true,
    hardware: true,
  });
  const toggle = (p: Panel) => setPanel((cur) => (cur === p ? null : p));
  const layersChanged = !visible.carcass || !visible.fronts || !visible.hardware;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {panel && (
        <View style={styles.popover}>
          <T style={styles.popTitle}>
            {panel === 'views' ? uz.viewer.views : panel === 'layers' ? uz.viewer.layers : uz.viewer.info}
          </T>
          {panel === 'views' && (
            <View style={styles.grid}>
              {VIEWS.map((v) => {
                const on = view === v.key;
                return (
                  <Pressable
                    key={v.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    onPress={() => {
                      send({ type: 'setView', view: v.key });
                      setView(v.key);
                      setPanel(null);
                    }}
                    style={({ pressed }) => [styles.cell, on && styles.cellOn, pressed && styles.pressed]}
                  >
                    <T style={[styles.cellText, on && styles.textOn]}>{v.label}</T>
                  </Pressable>
                );
              })}
            </View>
          )}
          {panel === 'layers' &&
            GROUPS.map((g) => {
              const on = visible[g.key];
              return (
                <Item
                  key={g.key}
                  selected={on}
                  label={g.label}
                  onPress={() => {
                    setVisible({ ...visible, [g.key]: !on });
                    send({ type: 'setGroupVisible', group: g.key, on: !on });
                  }}
                >
                  <T style={[styles.itemText, !on && styles.itemTextOff]}>{g.label}</T>
                  <Icon
                    name={on ? 'eye' : 'eye-off'}
                    size={size.icon - 2}
                    color={on ? colors.accent : colors.textMuted}
                  />
                </Item>
              );
            })}
          {panel === 'info' && (
            <View style={styles.info}>
              {info.size && <InfoRow label={uz.viewer.infoSize} value={info.size} />}
              <InfoRow label={uz.viewer.infoRevision} value={info.revisionLabel} />
              <InfoRow label={uz.viewer.infoDate} value={formatDate(info.updatedAt)} />
              <View style={styles.infoRow}>
                <T muted>{uz.viewer.infoStatus}</T>
                {info.approved === null ? (
                  <T mono style={styles.infoValue}>
                    {uz.common.dash}
                  </T>
                ) : (
                  <StatusPill
                    tone={info.approved ? 'green' : 'yellow'}
                    label={info.approved ? uz.status.approved : uz.status.unapproved}
                  />
                )}
              </View>
            </View>
          )}
        </View>
      )}
      <View style={styles.rail}>
        <RailButton
          icon="rotate-3d"
          label={uz.viewer.views}
          active={panel === 'views'}
          disabled={disabled}
          onPress={() => toggle('views')}
        />
        <RailButton
          icon="layers"
          label={uz.viewer.layers}
          active={panel === 'layers' || layersChanged}
          disabled={disabled}
          onPress={() => toggle('layers')}
        />
        <RailButton
          icon="scan"
          label={uz.viewer.fit}
          disabled={disabled}
          onPress={() => {
            send({ type: 'fit' });
            setView(null);
          }}
        />
        <RailButton
          icon="swing-zone"
          label={uz.viewer.zonesShort}
          a11yLabel={uz.viewer.zones}
          active={zonesOn}
          disabled={disabled}
          onPress={onToggleZones}
        />
        <RailButton
          icon="info"
          label={uz.viewer.info}
          active={panel === 'info'}
          onPress={() => toggle('info')}
        />
      </View>
    </View>
  );
}

function RailButton({
  icon,
  label,
  a11yLabel,
  onPress,
  active,
  disabled,
}: {
  icon: IconName;
  label: string;
  a11yLabel?: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel ?? label}
      accessibilityState={{ selected: active, disabled }}
      style={({ pressed }) => [
        styles.btn,
        active && styles.btnActive,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Icon name={icon} size={size.icon} color={active ? colors.accent : colors.text} />
      <T
        style={[styles.btnLabel, active && styles.textOn]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {label}
      </T>
    </Pressable>
  );
}

function Item({
  children,
  onPress,
  selected,
  label,
}: {
  children: ReactNode;
  onPress: () => void;
  selected: boolean;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <T muted>{label}</T>
      <T mono style={styles.infoValue}>
        {value}
      </T>
    </View>
  );
}

const RAIL_W = 68;

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: space.sm,
    top: '24%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  rail: {
    width: RAIL_W,
    backgroundColor: colors.panel,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.xxs,
    gap: space.xxs,
  },
  btn: {
    minHeight: hit + space.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxs,
    paddingHorizontal: space.xxs,
  },
  btnActive: { backgroundColor: colors.accentSoft },
  btnLabel: { fontFamily: fonts.medium, fontSize: fontSize.label - 1, color: colors.textMuted },
  textOn: { color: colors.accent, fontFamily: fonts.semibold },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.4 },
  popover: {
    backgroundColor: colors.panel,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.sm,
    width: 208,
    gap: space.xs,
  },
  popTitle: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.label,
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: space.sm,
    paddingTop: space.xs,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  cell: {
    width: '48%',
    flexGrow: 1,
    minHeight: hit,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellOn: { backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accent },
  cellText: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.text },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    minHeight: hit,
    paddingHorizontal: space.sm,
    borderRadius: radius.sm,
  },
  itemText: { fontFamily: fonts.medium, color: colors.text },
  itemTextOff: { color: colors.textMuted },
  info: { padding: space.sm, gap: space.md },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md },
  infoValue: { fontFamily: fonts.monoMedium, fontSize: fontSize.sm, color: colors.text },
});
