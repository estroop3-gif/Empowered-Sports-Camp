'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Facebook, Instagram, Twitter, Youtube, Mail, Phone, MapPin, Zap } from 'lucide-react'
import { SITE_NAME } from '@/lib/constants'

/**
 * Footer - Empowered Athletes Brand
 *
 * FIERCE ESPORTS AESTHETIC:
 * - Black background with subtle neon accents
 * - Bold uppercase typography
 * - Neon green highlights on hover
 * - Sharp, angular styling
 */

// Footer links configuration
const footerLinks = {
  programs: [
    { label: 'All Girls Sports Camp', href: '/programs/all-girls-sports-camp' },
    { label: 'CIT Program', href: '/programs/cit-program' },
    { label: 'Soccer & Strength', href: '/programs/soccer-and-strength' },
  ],
  company: [
    { label: 'About Us', href: '/about' },
    { label: 'Our Coaches', href: '/about#coaches' },
    { label: 'Testimonials', href: '/testimonies' },
    { label: 'Host a Camp', href: '/host-a-camp' },
    { label: 'Careers', href: '/careers' },
  ],
  support: [
    { label: 'FAQ', href: '/faq' },
    { label: 'Contact Us', href: '/contact' },
    { label: 'Locations', href: '/locations' },
    { label: 'Refund Policy', href: '/refund-policy' },
  ],
}

const socialLinks = [
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Youtube, href: '#', label: 'YouTube' },
]

export function Footer() {
  const pathname = usePathname()

  // Don't render footer on admin or portal pages
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/portal')) {
    return null
  }

  return (
    <footer className="bg-black relative">
      {/* Smooth fade from CTA section - extended overlap */}
      <div className="absolute -top-24 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-black pointer-events-none z-20" />
      {/* Main Footer */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-4">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative h-12 w-12">
                <Image
                  src="/images/logo.png"
                  alt="Empowered Athletes"
                  fill
                  sizes="48px"
                  className="object-contain"
                />
              </div>
              <div>
                <span className="text-xl font-black uppercase tracking-wider text-white">Empowered</span>
                <span className="text-xl font-light uppercase tracking-wider text-neon ml-2">Athletes</span>
              </div>
            </Link>
            <p className="mt-6 text-white/50 leading-relaxed">
              Building fierce competitors and confident leaders since 2021.
              The champions of tomorrow start here.
            </p>

            {/* Social Links */}
            <div className="mt-8 flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="flex h-10 w-10 items-center justify-center border border-white/20 text-white/50 hover:border-neon hover:text-neon hover:shadow-[0_0_15px_rgba(147,205,1,0.3)] transition-all"
                  aria-label={social.label}
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Programs */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-neon flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Programs
            </h3>
            <ul className="mt-6 space-y-4">
              {footerLinks.programs.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/50 hover:text-neon transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-purple">
              Company
            </h3>
            <ul className="mt-6 space-y-4">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/50 hover:text-neon transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-magenta">
              Contact Us
            </h3>
            <ul className="mt-6 space-y-4">
              <li>
                <a
                  href="mailto:info@empoweredsportscamp.com"
                  className="flex items-center gap-3 text-sm text-white/50 hover:text-neon transition-colors"
                >
                  <Mail className="h-5 w-5" />
                  info@empoweredsportscamp.com
                </a>
              </li>
              <li>
                <a
                  href="tel:+19417021883"
                  className="flex items-center gap-3 text-sm text-white/50 hover:text-neon transition-colors"
                >
                  <Phone className="h-5 w-5" />
                  (941) 702-1883
                </a>
              </li>
              <li className="flex items-start gap-3 text-sm text-white/50">
                <MapPin className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span>
                  Serving Sarasota, Bradenton, Lakewood Ranch, &amp; Costa Rica
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-xs text-white/30 uppercase tracking-wider">
              &copy; {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link
                href="/privacy"
                className="text-xs text-white/30 uppercase tracking-wider hover:text-neon transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-xs text-white/30 uppercase tracking-wider hover:text-neon transition-colors"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
