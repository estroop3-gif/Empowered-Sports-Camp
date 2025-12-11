import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Badge Component - Empowered Athletes Brand
 *
 * FIERCE ESPORTS AESTHETIC:
 * - Neon green, magenta, purple accent colors
 * - Sharp edges (no rounded corners by default)
 * - Bold uppercase text
 * - Glow effects on key variants
 */
const badgeVariants = cva(
  "inline-flex items-center px-3 py-1 text-xs font-bold uppercase tracking-wider transition-all",
  {
    variants: {
      variant: {
        default:
          "bg-neon/10 text-neon border border-neon/30",
        neon:
          "bg-neon text-black shadow-[0_0_10px_rgba(147,205,1,0.3)]",
        magenta:
          "bg-magenta text-white shadow-[0_0_10px_rgba(255,45,206,0.3)]",
        purple:
          "bg-purple text-white shadow-[0_0_10px_rgba(111,0,216,0.3)]",
        dark:
          "bg-dark-100 text-white/80 border border-white/10",
        outline:
          "bg-transparent text-white/70 border border-white/20",
        "outline-neon":
          "bg-transparent text-neon border border-neon/50",
        success:
          "bg-success/10 text-success border border-success/30",
        warning:
          "bg-warning/10 text-warning border border-warning/30",
        error:
          "bg-error/10 text-error border border-error/30",
      },
      size: {
        sm: "text-[10px] px-2 py-0.5",
        md: "text-xs px-3 py-1",
        lg: "text-sm px-4 py-1.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
