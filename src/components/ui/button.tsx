import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Button Component - Empowered Athletes Brand
 *
 * PRIMARY: Neon Green (#93CD01)
 * HOVER: Transitions to Magenta (#FF2DCE) or Purple (#6F00D8)
 * Sharp edges, uppercase text, glow effects
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-bold uppercase tracking-wider transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // Primary Neon - Hover to Magenta (ELECTRIC GLOW!)
        neon:
          "bg-neon text-black shadow-[0_0_25px_rgba(204,255,0,0.7),0_0_50px_rgba(204,255,0,0.4)] hover:bg-magenta hover:text-white hover:shadow-[0_0_30px_rgba(255,45,206,0.8),0_0_60px_rgba(255,45,206,0.4)] active:bg-magenta-600 focus-visible:ring-neon",
        // Primary Neon - Hover to Purple
        "neon-purple":
          "bg-neon text-black shadow-[0_0_25px_rgba(204,255,0,0.7),0_0_50px_rgba(204,255,0,0.4)] hover:bg-purple hover:text-white hover:shadow-[0_0_30px_rgba(111,0,216,0.8),0_0_60px_rgba(111,0,216,0.4)] active:bg-purple-600 focus-visible:ring-neon",
        // Magenta - Hover to Neon
        magenta:
          "bg-magenta text-white shadow-[0_0_20px_rgba(255,45,206,0.5)] hover:bg-neon hover:text-black hover:shadow-[0_0_30px_rgba(204,255,0,0.8),0_0_60px_rgba(204,255,0,0.4)] active:bg-neon-600 focus-visible:ring-magenta",
        // Purple - Hover to Neon
        purple:
          "bg-purple text-white shadow-[0_0_20px_rgba(111,0,216,0.5)] hover:bg-neon hover:text-black hover:shadow-[0_0_30px_rgba(204,255,0,0.8),0_0_60px_rgba(204,255,0,0.4)] active:bg-neon-600 focus-visible:ring-purple",
        // Dark - Hover to Neon
        dark:
          "bg-black text-white border border-white/20 hover:border-neon hover:text-neon hover:shadow-[0_0_20px_rgba(204,255,0,0.5)] focus-visible:ring-neon",
        // Outline Neon - Fill with Magenta on hover
        "outline-neon":
          "border-2 border-neon text-neon bg-transparent shadow-[0_0_10px_rgba(204,255,0,0.3)] hover:bg-magenta hover:border-magenta hover:text-white hover:shadow-[0_0_25px_rgba(255,45,206,0.6),0_0_50px_rgba(255,45,206,0.3)] focus-visible:ring-neon",
        // Outline Neon - Fill with Purple on hover
        "outline-neon-purple":
          "border-2 border-neon text-neon bg-transparent shadow-[0_0_10px_rgba(204,255,0,0.3)] hover:bg-purple hover:border-purple hover:text-white hover:shadow-[0_0_25px_rgba(111,0,216,0.6),0_0_50px_rgba(111,0,216,0.3)] focus-visible:ring-neon",
        // Outline White - Fill with Neon on hover
        "outline-white":
          "border-2 border-white text-white bg-transparent hover:bg-neon hover:border-neon hover:text-black hover:shadow-[0_0_25px_rgba(204,255,0,0.7),0_0_50px_rgba(204,255,0,0.4)] focus-visible:ring-white",
        // Ghost - Subtle hover to neon
        ghost:
          "text-white/80 hover:text-neon hover:bg-neon/10 focus-visible:ring-neon",
        // Link style
        link:
          "text-neon underline-offset-4 hover:underline hover:text-magenta focus-visible:ring-neon",
      },
      size: {
        sm: "h-10 px-5 text-xs",
        md: "h-12 px-7 text-sm",
        lg: "h-14 px-10 text-base",
        xl: "h-16 px-12 text-lg",
        // Icon only
        icon: "h-12 w-12",
        "icon-sm": "h-10 w-10",
        "icon-lg": "h-14 w-14",
      },
      shape: {
        default: "rounded-none", // Sharp edges - pro gamer style
        rounded: "rounded-lg",
        pill: "rounded-full",
        skew: "skew-x-[-6deg]", // Angled esports style
      },
    },
    defaultVariants: {
      variant: "neon",
      size: "md",
      shape: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, shape, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, shape, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        <span className={shape === "skew" ? "skew-x-[6deg]" : undefined}>
          {children}
        </span>
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
