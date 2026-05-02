/**
 * Volunteer Application Page (Public)
 *
 * Standalone volunteer application form.
 * This page is public and does not require authentication.
 */

import { Metadata } from 'next'
import CITApplicationHero from '@/components/cit/CITApplicationHero'
import CITApplicationForm from '@/components/cit/CITApplicationForm'

export const metadata: Metadata = {
  title: 'Volunteer Application | Empowered Athletes',
  description:
    'Apply to volunteer at Empowered Athletes camp. Help with check-in, concessions, equipment, and more.',
}

export default function VolunteerApplyPage() {
  return (
    <main className="min-h-screen bg-black">
      <CITApplicationHero />
      <CITApplicationForm />
    </main>
  )
}
