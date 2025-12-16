/**
 * CIT Application Page (Public)
 *
 * Application form for the Coaches-In-Training program.
 * This page is public and does not require authentication.
 */

import { Metadata } from 'next'
import CITApplicationHero from '@/components/cit/CITApplicationHero'
import CITApplicationForm from '@/components/cit/CITApplicationForm'

export const metadata: Metadata = {
  title: 'Apply to CIT Program | Empowered Athletes',
  description:
    'Apply to become a Coach-In-Training at Empowered Athletes. Leadership training, coaching experience, and certifications for high school female athletes.',
}

export default function CITApplyPage() {
  return (
    <main className="min-h-screen bg-black">
      <CITApplicationHero />
      <CITApplicationForm />
    </main>
  )
}
