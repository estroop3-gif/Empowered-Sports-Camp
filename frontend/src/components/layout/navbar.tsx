'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NAV_LINKS, SITE_NAME } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/context'
import { UserMenu, LogoutButton } from './user-menu'
import { NotificationBell } from '@/components/notifications'
import { MessageBell } from '@/components/messaging'

/**
 * Navbar - Empowered Athletes Brand
 *
 * FIERCE ESPORTS AESTHETIC:
 * - Dark/black background
 * - Neon green accents
 * - Bold uppercase typography
 * - Sharp edges, glow effects
 */
export function Navbar() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [developerModeEnabled, setDeveloperModeEnabled] = useState(false)
  const { user, loading, isHqAdmin, isLicenseeOwner, isDirector, isCoach, isViewingAsOtherRole } = useAuth()

  // Check if on admin/portal pages
  const isAdminPage = pathname?.startsWith('/admin') || pathname?.startsWith('/portal')

  // Determine dashboard link based on role
  const getDashboardLink = () => {
    if (isHqAdmin) return '/admin'
    if (isLicenseeOwner || isDirector || isCoach) return '/portal'
    return '/dashboard'
  }

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Check developer mode status for navbar positioning
  useEffect(() => {
    async function checkDeveloperMode() {
      try {
        const res = await fetch('/api/settings/developer-mode')
        if (res.ok) {
          const data = await res.json()
          setDeveloperModeEnabled(data.enabled === true)
        }
      } catch {
        // Silently fail
      }
    }
    checkDeveloperMode()
    // Re-check periodically
    const interval = setInterval(checkDeveloperMode, 30000)
    return () => clearInterval(interval)
  }, [])

  // Calculate top offset based on active banners
  const getTopOffset = () => {
    let offset = 0
    if (developerModeEnabled) offset += 36 // Developer mode banner height
    if (isViewingAsOtherRole) offset += 36 // View-as banner height
    return offset
  }

  const topOffset = getTopOffset()

  return (
    <header
      className="fixed left-0 right-0 z-50 transition-all duration-300 bg-black/95 backdrop-blur-md"
      style={{ top: `${topOffset}px` }}
    >
      {/* Gradient border */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-neon via-magenta to-purple" />
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className={cn(
            "relative h-12 w-12 transition-all duration-300",
            scrolled && "drop-shadow-[0_0_10px_rgba(204,255,0,0.5)]"
          )}>
            <Image
              src="/images/logo.png"
              alt="Empowered Athletes"
              fill
              sizes="48px"
              className="object-contain"
              priority
            />
          </div>
          <div className="hidden sm:block">
            <span className="text-xl font-black uppercase tracking-wider text-white">
              Empowered
            </span>
            <span className="text-xl font-light uppercase tracking-wider text-neon ml-2">
              Athletes
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white/80 transition-all duration-200 hover:text-neon relative group"
            >
              {link.label}
              <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-neon transition-all duration-200 group-hover:w-full group-hover:left-0" />
            </Link>
          ))}
        </div>

        {/* Desktop CTA / User Menu */}
        <div className="hidden items-center gap-4 lg:flex">
          {loading ? (
            // Loading skeleton
            <div className="h-9 w-9 bg-white/10 animate-pulse" />
          ) : user ? (
            // Authenticated: show dashboard link, notifications, and user menu
            <>
              <Link
                href={getDashboardLink()}
                className="px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white/80 hover:text-neon transition-colors"
              >
                Dashboard
              </Link>
              <MessageBell />
              <NotificationBell />
              <UserMenu variant="navbar" />
            </>
          ) : (
            // Unauthenticated: show sign in / register
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="neon" size="md">
                  Register Now
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="inline-flex items-center justify-center p-2 text-white transition-colors hover:text-neon lg:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? (
            <X className="h-7 w-7" />
          ) : (
            <Menu className="h-7 w-7" />
          )}
        </button>
      </nav>

      {/* Mobile Menu */}
      <div
        className={cn(
          "lg:hidden transition-all duration-300 ease-in-out",
          mobileMenuOpen
            ? "max-h-screen opacity-100"
            : "max-h-0 opacity-0 overflow-hidden"
        )}
      >
        <div className="bg-black/95 backdrop-blur-md border-t border-white/10 px-4 pb-6 pt-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block px-4 py-3 text-base font-semibold uppercase tracking-wider text-white/80 hover:text-neon transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {/* Auth section for mobile */}
          <div className="mt-6 border-t border-white/10 pt-6">
            {loading ? (
              <div className="h-12 bg-white/10 animate-pulse" />
            ) : user ? (
              // Authenticated mobile menu
              <div className="space-y-3">
                <Link
                  href={getDashboardLink()}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-3 text-base font-semibold uppercase tracking-wider text-neon hover:bg-neon/10 transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href={`${getDashboardLink()}/settings`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-3 text-base font-semibold uppercase tracking-wider text-white/80 hover:text-white transition-colors"
                >
                  Settings
                </Link>
                <div className="pt-3 border-t border-white/10">
                  <LogoutButton showLabel className="w-full justify-center px-4 py-3 text-base uppercase tracking-wider hover:bg-red-500/10" />
                </div>
              </div>
            ) : (
              // Unauthenticated mobile menu
              <div className="flex flex-col gap-3">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline-neon" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="neon" className="w-full">
                    Register Now
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
