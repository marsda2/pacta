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
  Sparkle,
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
  copilot: Sparkle,
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

export type IconName = keyof typeof icons;
export const iconNames = Object.keys(icons) as IconName[];

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 20, color = colors.forest, strokeWidth = 2 }: IconProps) {
  const Glyph = icons[name];
  return <Glyph size={size} color={color} strokeWidth={strokeWidth} />;
}
