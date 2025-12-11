'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NAV_LINKS, SITE_NAME } from '@/lib/constants'
import { cn } from '@/lib/utils'

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-black/95 backdrop-blur-md"
          : "bg-transparent"
      )}
    >
      {/* Gradient border when scrolled */}
      {scrolled && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-neon via-magenta to-purple" />
      )}
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

        {/* Desktop CTA */}
        <div className="hidden items-center gap-4 lg:flex">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link href="/camps">
            <Button variant="neon" size="md">
              Register Now
            </Button>
          </Link>
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
          <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-6">
            <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="outline-neon" className="w-full">
                Sign In
              </Button>
            </Link>
            <Link href="/camps" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="neon" className="w-full">
                Register Now
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
