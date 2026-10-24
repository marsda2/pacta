import {
  ArrowRight,
  Bell,
  BadgeCheck,
  Calendar,
  Camera,
  ChartNoAxesColumn,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleQuestionMark,
  Clock,
  FileMinus,
  House,
  Lock,
  MapPin,
  Minus,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCw,
  Settings,
  Target,
  Timer,
  Upload,
  User,
  UserCheck,
  Users,
  Wallet,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';
import { Image, type ImageSourcePropType } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import appBlockIcon from '@/assets/brand/icons/app_block.png';
import calendarIcon from '@/assets/brand/icons/calendar.png';
import cameraIcon from '@/assets/brand/icons/camera.png';
import focusIcon from '@/assets/brand/icons/focus.png';
import helpIcon from '@/assets/brand/icons/help.png';
import locationIcon from '@/assets/brand/icons/location.png';
import notificationsIcon from '@/assets/brand/icons/notifications.png';
import pactIcon from '@/assets/brand/icons/pact.png';
import progressIcon from '@/assets/brand/icons/progress.png';
import retryIcon from '@/assets/brand/icons/retry.png';
import settingsIcon from '@/assets/brand/icons/settings.png';
import timelapseIcon from '@/assets/brand/icons/timelapse.png';
import timerIcon from '@/assets/brand/icons/timer.png';
import uploadIcon from '@/assets/brand/icons/upload.png';
import verifiedIcon from '@/assets/brand/icons/verified.png';
import walletIcon from '@/assets/brand/icons/wallet.png';
import witnessIcon from '@/assets/brand/icons/witness.png';

import { ARM_RIGHT, BODY } from '@/components/companion/Pax';
import { colors } from '@/lib/theme';

// Biblioteca de iconos de PACTA (ver ICON LIBRARY del UI Kit).
const icons = {
  timer: Clock,
  timelapse: Timer,
  focus: Target,
  camera: Camera,
  location: MapPin,
  witness: UserCheck,
  witnesses: Users,
  upload: Upload,
  verified: BadgeCheck,
  calendar: Calendar,
  wallet: Wallet,
  notifications: Bell,
  appBlock: FileMinus,
  progress: ChartNoAxesColumn,
  settings: Settings,
  retry: RotateCw,
  help: CircleQuestionMark,
  plus: Plus,
  minus: Minus,
  arrowRight: ArrowRight,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  close: X,
  check: Check,
  pause: Pause,
  play: Play,
  flash: Zap,
  flip: RefreshCw,
  home: House,
  user: User,
  lock: Lock,
  pacts: CircleCheck,
} satisfies Record<string, LucideIcon>;

// Iconos de marca (assets/brand/icons): máscaras monocromas que se tiñen con `color`.
// Los nombres sin PNG siguen usando Lucide.
const brandIcons: Partial<Record<keyof typeof icons, ImageSourcePropType>> = {
  timer: timerIcon,
  timelapse: timelapseIcon,
  focus: focusIcon,
  camera: cameraIcon,
  location: locationIcon,
  witness: witnessIcon,
  upload: uploadIcon,
  verified: verifiedIcon,
  calendar: calendarIcon,
  wallet: walletIcon,
  notifications: notificationsIcon,
  appBlock: appBlockIcon,
  progress: progressIcon,
  settings: settingsIcon,
  retry: retryIcon,
  help: helpIcon,
  pacts: pactIcon,
};

// Copilot no es un icono de Lucide ni un PNG: es Pax (ver PaxGlyph).
export type IconName = keyof typeof icons | 'copilot';
export const iconNames = [...Object.keys(icons), 'copilot'] as IconName[];

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

// Copilot: el propio Pax en silueta monocroma (cuerpo con cara recortada y brazo saludando).
const PAX_ICON_VIEWBOX = '28 14 186 226';

function PaxGlyph({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox={PAX_ICON_VIEWBOX}>
      <Path d={BODY} fill={color} fillRule="evenodd" />
      <Path d={ARM_RIGHT} stroke={color} strokeWidth={13} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

export function Icon({ name, size = 20, color = colors.forest, strokeWidth = 2 }: IconProps) {
  if (name === 'copilot') return <PaxGlyph size={size} color={color} />;

  const brand = brandIcons[name];
  if (brand) return <Image source={brand} style={{ width: size, height: size, tintColor: color }} />;

  const Glyph = icons[name];
  return <Glyph size={size} color={color} strokeWidth={strokeWidth} />;
}
