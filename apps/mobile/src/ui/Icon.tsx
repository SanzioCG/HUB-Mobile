// M-A6: yagona ikonka komponenti — Lucide (docs/design/ASSETS.md ro'yxati) va maxsus SVG'lar (assets/icons →
// `npm run icons` → ./generated) bitta tiplangan nomlar ro'yxatida. `<Icon name="door-open" size={24} color={…} />`.
// Chiziq qalinligi 1.8 (Brand Kit, design-tokens.json `iconStyle.stroke`).
import {
  ArrowDownToLine,
  ArrowUpToLine,
  Box,
  ChevronLeft,
  ChevronRight,
  CloudDownload,
  Ellipsis,
  Eye,
  EyeOff,
  Flashlight,
  FlashlightOff,
  FolderOpen,
  Info,
  Layers,
  LayoutGrid,
  LogOut,
  RotateCcw,
  Rotate3d,
  Ruler,
  Scan,
  ScanQrCode,
  Search,
  Settings,
  Smartphone,
  Square,
  SquareCheck,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { colors } from '../theme';
import { customIcons } from './generated';

/** ASSETS.md ro'yxati + ilovaga kerak bo'lgan qo'shimchalar (folder-open, layout-grid, chevron-right, …). */
const LUCIDE = {
  'scan-qr-code': ScanQrCode,
  /** V-110: pantograf (Brand Kit'da ikonka yo'q). */
  'arrow-down-to-line': ArrowDownToLine,
  'arrow-up-to-line': ArrowUpToLine,
  ruler: Ruler,
  box: Box,
  'rotate-ccw': RotateCcw,
  layers: Layers,
  scan: Scan,
  'rotate-3d': Rotate3d,
  flashlight: Flashlight,
  'flashlight-off': FlashlightOff,
  'cloud-download': CloudDownload,
  'trash-2': Trash2,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  x: X,
  settings: Settings,
  search: Search,
  'triangle-alert': TriangleAlert,
  smartphone: Smartphone,
  'log-out': LogOut,
  'folder-open': FolderOpen,
  'layout-grid': LayoutGrid,
  ellipsis: Ellipsis,
  square: Square,
  eye: Eye,
  'eye-off': EyeOff,
  info: Info,
  'square-check': SquareCheck,
} as const;

export type LucideName = keyof typeof LUCIDE;
export type CustomIconName = keyof typeof customIcons;
export type IconName = LucideName | CustomIconName;

export const ICON_STROKE = 1.8;

const isCustom = (name: IconName): name is CustomIconName => name in customIcons;

export function Icon({
  name,
  size = 24,
  color = colors.text,
  style,
}: {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  if (isCustom(name)) {
    const Custom = customIcons[name];
    return <Custom size={size} color={color} style={style} />;
  }
  const Lucide = LUCIDE[name];
  return <Lucide size={size} color={color} strokeWidth={ICON_STROKE} style={style} />;
}
