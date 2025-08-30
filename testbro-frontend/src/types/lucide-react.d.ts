// Comprehensive type declarations for lucide-react
declare module 'lucide-react' {
  import { FC, SVGProps } from 'react'
  
  export type LucideIcon = FC<SVGProps<SVGSVGElement>>
  
  // Core icons
  export const AlertTriangle: LucideIcon
  export const AlertCircle: LucideIcon
  export const Activity: LucideIcon
  export const Bot: LucideIcon
  export const CheckCircle: LucideIcon
  export const Download: LucideIcon
  export const Filter: LucideIcon
  export const Loader2: LucideIcon
  export const RefreshCw: LucideIcon
  export const Target: LucideIcon
  export const TrendingUp: LucideIcon
  export const TrendingDown: LucideIcon
  export const Users: LucideIcon
  export const User: LucideIcon
  export const Wifi: LucideIcon
  export const WifiOff: LucideIcon
  export const DollarSign: LucideIcon
  export const XCircle: LucideIcon
  
  // UI icons
  export const Plus: LucideIcon
  export const Settings: LucideIcon
  export const Trash2: LucideIcon
  export const ExternalLink: LucideIcon
  export const Clock: LucideIcon
  export const Bell: LucideIcon
  export const Link: LucideIcon
  export const PlayCircle: LucideIcon
  export const Play: LucideIcon
  export const Pause: LucideIcon
  export const FileText: LucideIcon
  export const Lightbulb: LucideIcon
  export const Database: LucideIcon
  export const Calculator: LucideIcon
  export const Award: LucideIcon
  export const Eye: LucideIcon
  export const Copy: LucideIcon
  export const ArrowRight: LucideIcon
  export const Calendar: LucideIcon
  export const ArrowUp: LucideIcon
  export const ArrowDown: LucideIcon
  export const BarChart2: LucideIcon
  export const BarChart3: LucideIcon
  export const PieChart: LucideIcon
  export const ChevronDown: LucideIcon
  export const ChevronUp: LucideIcon
  export const MoreHorizontal: LucideIcon
  export const Monitor: LucideIcon
  export const Video: LucideIcon
  export const Camera: LucideIcon
  export const Share: LucideIcon
  export const LogIn: LucideIcon
  export const History: LucideIcon
  export const Flame: LucideIcon
  export const Building: LucideIcon
  export const TestTube: LucideIcon
  export const FolderOpen: LucideIcon
  export const Folder: LucideIcon
  export const BookOpen: LucideIcon
  export const Gift: LucideIcon
  export const Palette: LucideIcon
  export const Image: LucideIcon
  
  // Integration icons
  export const MessageSquare: LucideIcon
  export const Github: LucideIcon
  export const Puzzle: LucideIcon
  export const Zap: LucideIcon
  
  // Business icons
  export const ShoppingCart: LucideIcon
  export const UserPlus: LucideIcon
  export const Shield: LucideIcon
  export const Search: LucideIcon
  export const CreditCard: LucideIcon
  export const Smartphone: LucideIcon
  export const Globe: LucideIcon
  
  // AI/Magic icons
  export const Sparkles: LucideIcon
  export const Wand2: LucideIcon
  export const Rocket: LucideIcon
  
  // Export all icons as default
  const icons: Record<string, LucideIcon>
  export default icons
}

// Individual icon module declarations for backward compatibility
declare module 'lucide-react/dist/esm/icons/dollar-sign' {
  const DollarSign: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  export default DollarSign;
}

declare module 'lucide-react/dist/esm/icons/users' {
  const Users: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  export default Users;
}

declare module 'lucide-react/dist/esm/icons/filter' {
  const Filter: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  export default Filter;
}

declare module 'lucide-react/dist/esm/icons/download' {
  const Download: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  export default Download;
}

declare module 'lucide-react/dist/esm/icons/calendar' {
  const Calendar: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  export default Calendar;
}

declare module 'lucide-react/dist/esm/icons/arrow-up' {
  const ArrowUp: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  export default ArrowUp;
}

declare module 'lucide-react/dist/esm/icons/arrow-down' {
  const ArrowDown: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  export default ArrowDown;
}

declare module 'lucide-react/dist/esm/icons/eye' {
  const Eye: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  export default Eye;
}

declare module 'lucide-react/dist/esm/icons/wifi' {
  const Wifi: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  export default Wifi;
}

declare module 'lucide-react/dist/esm/icons/wifi-off' {
  const WifiOff: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  export default WifiOff;
}

declare module 'lucide-react/dist/esm/icons/bar-chart-2' {
  const BarChart2: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  export default BarChart2;
}

declare module 'lucide-react/dist/esm/icons/pie-chart' {
  const PieChart: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  export default PieChart;
}