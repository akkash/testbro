declare module 'lucide-react' {
  import { FC, SVGProps } from 'react'

  export interface LucideProps extends SVGProps<SVGSVGElement> {
    size?: string | number
    strokeWidth?: string | number
    absoluteStrokeWidth?: boolean
  }

  export type LucideIcon = FC<LucideProps>

  // Core icons used in the application
  export const AlertTriangle: LucideIcon
  export const RefreshCw: LucideIcon
  export const TrendingUp: LucideIcon
  export const TrendingDown: LucideIcon
  export const Clock: LucideIcon
  export const CheckCircle: LucideIcon
  export const XCircle: LucideIcon
  export const Bot: LucideIcon
  export const Zap: LucideIcon
  export const Target: LucideIcon
  export const Activity: LucideIcon
  export const ArrowRight: LucideIcon
  export const Play: LucideIcon
  export const Pause: LucideIcon
  export const Video: LucideIcon
  export const Monitor: LucideIcon
  export const PlayCircle: LucideIcon
  export const Loader2: LucideIcon
  export const ChevronDown: LucideIcon
  export const ChevronUp: LucideIcon
  export const Flame: LucideIcon

  // Add any other icons as needed
  const lucideReact: {
    [key: string]: LucideIcon
  }

  export default lucideReact
}