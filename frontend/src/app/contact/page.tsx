/**
 * Contact Page
 *
 * Public contact and inquiry form page.
 */

import { Metadata } from 'next'
import ContactHero from '@/components/contact/ContactHero'
import ContactForm from '@/components/contact/ContactForm'

export const metadata: Metadata = {
  title: 'Contact Us | Empowered Athletes',
  description: 'Get in touch with Empowered Athletes. Register for camps, host a camp at your location, or learn more about our programs.',
}

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-black">
      <ContactHero />
      <ContactForm />
    </main>
  )
}
