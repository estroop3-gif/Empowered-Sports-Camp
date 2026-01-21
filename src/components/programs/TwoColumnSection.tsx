/**
 * Two Column Section Component
 *
 * Reusable two-column layout with text and placeholder/image.
 */

import Image from 'next/image'
import { Crown } from 'lucide-react'

interface TwoColumnSectionProps {
  label: string
  title: string
  titleAccent?: string
  content: React.ReactNode
  imagePlaceholder?: string
  imageSrc?: string
  imageAlt?: string
  imagePosition?: 'left' | 'right'
  accentColor?: 'neon' | 'magenta' | 'purple'
}

const colorClasses = {
  neon: {
    label: 'text-neon',
    accent: 'text-neon',
    corner1: 'bg-neon',
    corner2: 'bg-magenta',
  },
  magenta: {
    label: 'text-magenta',
    accent: 'text-magenta',
    corner1: 'bg-magenta',
    corner2: 'bg-neon',
  },
  purple: {
    label: 'text-purple',
    accent: 'text-purple',
    corner1: 'bg-purple',
    corner2: 'bg-neon',
  },
}

export default function TwoColumnSection({
  label,
  title,
  titleAccent,
  content,
  imagePlaceholder = 'Photo Coming Soon',
  imageSrc,
  imageAlt = '',
  imagePosition = 'right',
  accentColor = 'neon',
}: TwoColumnSectionProps) {
  const colors = colorClasses[accentColor]
  const isLeft = imagePosition === 'left'

  return (
    <section className="relative py-20 lg:py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-dark-100/50 to-black" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Image or placeholder */}
          <div className={`relative ${isLeft ? 'order-1' : 'order-2 lg:order-2'}`}>
            <div className="aspect-[4/3] bg-dark-100 border border-white/10 flex items-center justify-center relative overflow-hidden">
              {imageSrc ? (
                /* Actual image */
                <Image
                  src={imageSrc}
                  alt={imageAlt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              ) : (
                /* Placeholder content */
                <>
                  {/* Decorative elements */}
                  <div className="absolute inset-0 bg-gradient-to-br from-neon/5 via-transparent to-magenta/5" />
                  <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-neon/10 rounded-full blur-[60px]" />
                  <div className="absolute -top-4 -left-4 w-24 h-24 bg-purple/10 rounded-full blur-[40px]" />

                  <div className="relative flex flex-col items-center gap-4 text-white/30">
                    <Crown className="h-16 w-16" />
                    <span className="text-xs font-bold uppercase tracking-widest">
                      {imagePlaceholder}
                    </span>
                  </div>
                </>
              )}

              {/* Corner accents */}
              <div className={`absolute top-0 left-0 w-16 h-1 ${colors.corner1}`} />
              <div className={`absolute top-0 left-0 w-1 h-16 ${colors.corner1}`} />
              <div className={`absolute bottom-0 right-0 w-16 h-1 ${colors.corner2}`} />
              <div className={`absolute bottom-0 right-0 w-1 h-16 ${colors.corner2}`} />
            </div>
          </div>

          {/* Text content */}
          <div className={isLeft ? 'order-2' : 'order-1 lg:order-1'}>
            {/* Section label */}
            <span className={`text-xs font-bold uppercase tracking-widest ${colors.label} mb-4 block`}>
              {label}
            </span>

            {/* Headline */}
            <h2 className="headline-display headline-md text-white mb-6">
              {title}
              {titleAccent && (
                <>
                  {' '}
                  <span className={colors.accent}>{titleAccent}</span>
                </>
              )}
            </h2>

            {/* Content */}
            <div className="text-white/70 leading-relaxed space-y-4">
              {content}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
