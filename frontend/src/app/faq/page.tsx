'use client'

/**
 * FAQ Page
 *
 * Public FAQ page with interactive accordions, grouped by category.
 * Fun, encouraging tone for parents and potential partners.
 */

import Link from 'next/link'
import { HelpCircle, ArrowRight, MessageCircle } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import { FAQ_CATEGORIES, FAQ_HERO } from '@/lib/constants/faq'

export default function FaqPage() {
  return (
    <main className="min-h-screen bg-black">
      {/* Hero Section */}
      <section className="relative min-h-[50vh] flex items-center overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple/10 via-neon/5 to-magenta/10" />
        <div className="absolute inset-0 bg-black/60" />

        {/* Glow orbs */}
        <div className="absolute top-20 -left-40 w-[500px] h-[500px] bg-purple/15 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-neon/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-magenta/10 rounded-full blur-[100px]" />

        {/* Content */}
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-24">
          <div className="max-w-3xl">
            {/* Badge */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-neon/10 border border-neon/30">
                <HelpCircle className="h-4 w-4 text-neon" />
                <span className="text-xs font-bold uppercase tracking-widest text-neon">
                  {FAQ_HERO.badge}
                </span>
              </div>
            </div>

            {/* Headline */}
            <h1 className="headline-display headline-lg text-white mb-6">
              {FAQ_HERO.title}
            </h1>

            {/* Subtitle */}
            <p className="text-xl lg:text-2xl text-white/80 mb-6">
              {FAQ_HERO.subtitle}
            </p>

            {/* Description */}
            <p className="text-white/60 leading-relaxed mb-8 max-w-2xl">
              {FAQ_HERO.description}
            </p>

            {/* CTA Link */}
            <Link
              href={FAQ_HERO.ctaHref}
              className="inline-flex items-center gap-2 text-neon hover:text-neon/80 transition-colors group"
            >
              <MessageCircle className="h-5 w-5" />
              <span className="font-medium">{FAQ_HERO.ctaText}</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
      </section>

      {/* FAQ Content Section */}
      <section className="relative py-16 lg:py-20 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-dark-100/20 to-black" />

        {/* Glow effects */}
        <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-neon/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 left-0 w-[300px] h-[300px] bg-purple/5 rounded-full blur-[120px]" />

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Section intro */}
          <div className="text-center mb-12">
            <p className="text-sm font-bold uppercase tracking-widest text-magenta mb-3">
              Camp questions, answered.
            </p>
            <p className="text-white/50 max-w-xl mx-auto">
              Parents ask great questions. We love that. Here are the ones we hear most often.
            </p>
          </div>

          {/* FAQ Categories */}
          {FAQ_CATEGORIES.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-white/60 mb-4">
                Our FAQ is being updated. In the meantime, reach out on the contact page with any questions.
              </p>
              <Link
                href="/contact"
                className={buttonVariants({ variant: 'outline-neon', size: 'lg' })}
              >
                Contact Us
              </Link>
            </div>
          ) : (
            <div className="space-y-12">
              {FAQ_CATEGORIES.map((category) => (
                <div key={category.id}>
                  {/* Category heading */}
                  <div className="mb-6">
                    <h2 className="headline-display headline-sm text-white mb-2">
                      {category.title}
                    </h2>
                    {category.description && (
                      <p className="text-white/50 text-sm">{category.description}</p>
                    )}
                  </div>

                  {/* Questions accordion */}
                  <Accordion>
                    {category.items.map((item, index) => (
                      <AccordionItem key={`${category.id}-${index}`}>
                        <AccordionTrigger>{item.question}</AccordionTrigger>
                        <AccordionContent>{item.answer}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </div>
          )}

          {/* Bottom CTA */}
          <div className="mt-16 pt-12 border-t border-white/10 text-center">
            <p className="text-white/60 mb-6">
              Didn&apos;t find what you were looking for?
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/contact"
                className={buttonVariants({ variant: 'neon', size: 'lg' })}
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                Get in Touch
              </Link>
              <Link
                href="/camps"
                className={buttonVariants({ variant: 'outline-neon', size: 'lg' })}
              >
                Find a Camp
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
