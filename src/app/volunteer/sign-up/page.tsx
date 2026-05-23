/**
 * Volunteer Sign-Up Page (Public)
 *
 * Simple volunteer sign-up form for non-coaching camp duties.
 * Separate from the CIT application at /volunteer/apply.
 */

import { Metadata } from 'next'
import VolunteerSignupHero from '@/components/volunteer/VolunteerSignupHero'
import VolunteerSignupForm from '@/components/volunteer/VolunteerSignupForm'

export const metadata: Metadata = {
  title: 'Volunteer Sign-Up | Empowered Athletes',
  description:
    'Sign up to volunteer at Empowered Athletes camp. Help with setup, check-in, concessions, timekeeping, and more. Earn community service hours.',
}

export default function VolunteerSignUpPage() {
  return (
    <main className="min-h-screen bg-black">
      <VolunteerSignupHero />
      <VolunteerSignupForm />
    </main>
  )
}
