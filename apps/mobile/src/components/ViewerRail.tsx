// 3D ekrandagi o'ng vertikal panel (dizayn 3-ekran): Ko'rinishlar, Qatlamlar, Sig'dirish, Ochilish zonalari (M-A5),
// "…" (reviziya ma'lumoti).
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { uz } from '../i18n/uz';
import { colors, fontSize, fonts, hit, radius, size, space } from '../theme';
import type { HostMessage } from '../viewer/bridge';
import { T } from './ui';

type Group = 'carcass' | 'fronts' | 'hardware';
type Panel = 'views' | 'layers' | 'info' | null;

export interface RailInfo {
  revisionLabel: string;
  /** null — noma'lum (skanerlangan eski reviziya). */
  approved: boolean | null;
  /** ISO-8601 yoki null. */
  updatedAt: string | null;
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
  const [visible, setVisible] = useState<Record<Group, boolean>>({
    carcass: true,
    fronts: true,
    hardware: true,
  });
  const toggle = (p: Panel) => setPanel((cur) => (cur === p ? null : p));

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {panel && (
        <View style={styles.popover}>
          {panel === 'views' &&
            VIEWS.map((v) => (
              <Item
                key={v.key}
                onPress={() => {
                  send({ type: 'setView', view: v.key });
                  setPanel(null);
                }}
              >
                <T>{v.label}</T>
              </Item>
            ))}
          {panel === 'layers' &&
            GROUPS.map((g) => (
              <Item
                key={g.key}
                onPress={() => {
                  const on = !visible[g.key];
                  setVisible({ ...visible, [g.key]: on });
                  send({ type: 'setGroupVisible', group: g.key, on });
                }}
              >
                <Ionicons
                  name={visible[g.key] ? 'checkbox' : 'square-outline'}
                  size={size.icon - 2}
                  color={visible[g.key] ? colors.accent : colors.textMuted}
                />
                <T>{g.label}</T>
              </Item>
            ))}
          {panel === 'info' && (
            <View style={styles.info}>
              <InfoRow label={uz.viewer.infoRevision} value={info.revisionLabel} />
              <InfoRow
                label={uz.viewer.infoStatus}
                value={
                  info.approved === null
                    ? uz.common.dash
                    : info.approved
                      ? uz.status.approved
                      : uz.status.unapproved
                }
              />
              <InfoRow label={uz.viewer.infoDate} value={formatDate(info.updatedAt)} />
            </View>
          )}
        </View>
      )}
      <View style={styles.rail}>
        <RailButton
          icon="cube-outline"
          label={uz.viewer.views}
          active={panel === 'views'}
          disabled={disabled}
          onPress={() => toggle('views')}
        />
        <RailButton
          icon="layers-outline"
          label={uz.viewer.layers}
          active={panel === 'layers'}
          disabled={disabled}
          onPress={() => toggle('layers')}
        />
        <RailButton
          icon="scan-outline"
          label={uz.viewer.fit}
          disabled={disabled}
          onPress={() => send({ type: 'fit' })}
        />
        <RailButton
          icon="expand-outline"
          label={uz.viewer.zones}
          active={zonesOn}
          disabled={disabled}
          onPress={onToggleZones}
        />
        <RailButton
          icon="ellipsis-horizontal"
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
  onPress,
  active,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.btn,
        active && styles.btnActive,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Ionicons name={icon} size={size.icon} color={active ? colors.white : colors.text} />
    </Pressable>
  );
}

function Item({ children, onPress }: { children: ReactNode; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
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

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: space.md,
    top: '30%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  rail: { backgroundColor: colors.panel, borderRadius: radius.lg, padding: space.xs, gap: space.xs },
  btn: { width: hit, height: hit, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  btnActive: { backgroundColor: colors.border },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
  popover: { backgroundColor: colors.panel, borderRadius: radius.md, padding: space.xs, minWidth: 160 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: hit,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
  },
  info: { padding: space.md, gap: space.sm },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space.lg },
  infoValue: { fontFamily: fonts.monoMedium, fontSize: fontSize.sm, color: colors.white },
});
