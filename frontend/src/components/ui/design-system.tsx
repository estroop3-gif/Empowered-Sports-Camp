/**
 * EMPOWERED ATHLETES - DESIGN SYSTEM
 *
 * Brand-consistent components for the entire platform.
 * Every component follows the fierce esports aesthetic:
 *
 * COLORS:
 * - Neon Green: #CCFF00 (primary accent, CTAs, success states)
 * - Hot Magenta: #FF2DCE (secondary accent, highlights)
 * - Electric Purple: #6F00D8 (tertiary accent, premium features)
 * - Black: #000000 (backgrounds, text on light)
 * - Dark grays for cards/surfaces
 *
 * TYPOGRAPHY:
 * - Headlines: Poppins, ALL CAPS, extra bold, wide tracking
 * - Body: Poppins, regular weight, relaxed leading
 * - Labels: ALL CAPS, small size, wide tracking
 *
 * SPACING:
 * - Consistent 4px base unit
 * - Sections: py-24 (96px)
 * - Cards: p-6 or p-8
 * - Gaps: gap-4, gap-6, gap-8
 *
 * EDGES:
 * - Sharp corners (no border-radius) for fierce look
 * - Occasional 2px borders with brand colors
 *
 * EFFECTS:
 * - Neon glow on hover (box-shadow with brand colors)
 * - Gradient borders for premium feel
 * - Subtle backdrop blur on overlays
 */

export const designTokens = {
  colors: {
    neon: '#CCFF00',
    magenta: '#FF2DCE',
    purple: '#6F00D8',
    black: '#000000',
    dark: {
      100: '#1a1a1a',
      200: '#2a2a2a',
      300: '#3a3a3a',
    },
    white: '#FFFFFF',
  },
  shadows: {
    neon: '0 0 20px rgba(204, 255, 0, 0.5)',
    neonIntense: '0 0 30px rgba(204, 255, 0, 0.7), 0 0 60px rgba(204, 255, 0, 0.4)',
    magenta: '0 0 20px rgba(255, 45, 206, 0.5)',
    purple: '0 0 20px rgba(111, 0, 216, 0.5)',
  },
  typography: {
    headline: 'font-black uppercase tracking-wider',
    label: 'text-xs font-bold uppercase tracking-widest',
    body: 'font-normal leading-relaxed',
  },
}

// Re-export for convenience
export { designTokens as tokens }
