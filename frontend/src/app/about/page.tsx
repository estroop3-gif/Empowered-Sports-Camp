/**
 * About Page
 *
 * Public marketing page for Empowered Athletes.
 * Showcases mission, programs, values, and founder story.
 */

import { Metadata } from 'next'
import AboutHero from '@/components/about/AboutHero'
import AboutMission from '@/components/about/AboutMission'
import WhatWeDo from '@/components/about/WhatWeDo'
import WhyEmpoweredPillars from '@/components/about/WhyEmpoweredPillars'
import AboutCoachCole from '@/components/about/AboutCoachCole'

export const metadata: Metadata = {
  title: 'About Us | Empowered Athletes',
  description: 'Learn about Empowered Athletes - all-girls, women-led sports camps that build confidence, leadership, and real game skills.',
}

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-black">
      <AboutHero />
      <AboutMission />
      <WhatWeDo />
      <WhyEmpoweredPillars />
      <AboutCoachCole />
    </main>
  )
}
