'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Calendar,
  Crown,
  CreditCard,
  Settings,
  LogOut,
  Plus,
  ArrowRight,
  Clock,
  MapPin,
  CheckCircle,
  AlertCircle,
  Zap,
  Bell,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Parent Dashboard
 *
 * DESIGN NOTES:
 * - Personal view for parents/guardians
 * - Manage their athletes and view registrations
 * - Same fierce esports brand aesthetic
 * - Simpler navigation than admin portals
 *
 * This is the "parent's locker room" - should feel welcoming
 * but still unmistakably Empowered Athletes brand
 */

// Mock data
const parentData = {
  name: 'Sarah Johnson',
  email: 'sarah@example.com',
}

const athletes = [
  {
    id: '1',
    name: 'Emma Johnson',
    age: 10,
    tshirtSize: 'YM',
    upcomingCamps: 2,
    completedCamps: 5,
  },
  {
    id: '2',
    name: 'Lily Johnson',
    age: 7,
    tshirtSize: 'YS',
    upcomingCamps: 1,
    completedCamps: 2,
  },
]

const upcomingRegistrations = [
  {
    id: '1',
    athlete: 'Emma Johnson',
    camp: 'Summer Week 1 - Lincoln Park',
    date: 'Jun 9-13, 2025',
    location: 'Lincoln Park Athletic Field',
    status: 'confirmed',
    amount: 29900,
  },
  {
    id: '2',
    athlete: 'Emma Johnson',
    camp: 'Basketball Intensive',
    date: 'Jul 14-18, 2025',
    location: 'Lincoln Park Athletic Field',
    status: 'pending_payment',
    amount: 34900,
  },
  {
    id: '3',
    athlete: 'Lily Johnson',
    camp: 'Summer Week 2 - Evanston',
    date: 'Jun 16-20, 2025',
    location: 'Evanston Recreation Center',
    status: 'confirmed',
    amount: 29900,
  },
]

const pastRegistrations = [
  {
    id: '4',
    athlete: 'Emma Johnson',
    camp: 'Fall Soccer Clinic',
    date: 'Oct 14-18, 2024',
    status: 'completed',
  },
  {
    id: '5',
    athlete: 'Emma Johnson',
    camp: 'Summer Week 3 - 2024',
    date: 'Jun 24-28, 2024',
    status: 'completed',
  },
]

export default function ParentDashboard() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100)
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black border-b border-white/10">
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-neon via-magenta to-purple" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <div className="relative h-10 w-10">
                <Image
                  src="/images/logo.png"
                  alt="Empowered Athletes"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="hidden sm:block">
                <span className="text-lg font-black uppercase tracking-wider text-white">Empowered</span>
                <span className="text-lg font-light uppercase tracking-wider text-neon ml-2">Athletes</span>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm font-semibold uppercase tracking-wider text-neon"
              >
                Dashboard
              </Link>
              <Link
                href="/camps"
                className="px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white/60 hover:text-white transition-colors"
              >
                Find Camps
              </Link>
            </nav>

            {/* User menu */}
            <div className="flex items-center gap-4">
              <button className="relative p-2 text-white/50 hover:text-white transition-colors">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-magenta rounded-full" />
              </button>
              <div className="h-10 w-10 bg-neon/10 border border-neon/30 flex items-center justify-center">
                <span className="text-neon font-black">{parentData.name[0]}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-black uppercase tracking-wider text-white">
            Welcome back, {parentData.name.split(' ')[0]}
          </h1>
          <p className="mt-2 text-white/50">
            Manage your athletes and camp registrations
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            {/* Athletes Section */}
            <div className="bg-dark-100 border border-white/10">
              <div className="flex items-center justify-between px-6 py-4 border-b border-neon/30">
                <div className="flex items-center gap-3">
                  <Crown className="h-5 w-5 text-neon" />
                  <h2 className="text-sm font-bold uppercase tracking-widest text-white">
                    My Athletes
                  </h2>
                </div>
                <Link
                  href="/dashboard/athletes/new"
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neon hover:text-neon/80 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Athlete
                </Link>
              </div>
              <div className="p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  {athletes.map((athlete) => (
                    <Link
                      key={athlete.id}
                      href={`/dashboard/athletes/${athlete.id}`}
                      className="p-4 bg-black/50 border border-white/10 hover:border-neon/30 hover:bg-neon/5 transition-all group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="h-14 w-14 bg-neon/10 border border-neon/30 flex items-center justify-center group-hover:bg-neon/20 transition-colors">
                          <span className="text-neon font-black text-xl">{athlete.name[0]}</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-white">{athlete.name}</h3>
                          <p className="text-xs text-white/40 mt-1">Age {athlete.age} • Size {athlete.tshirtSize}</p>
                          <div className="flex gap-4 mt-3">
                            <span className="text-xs text-neon font-bold">
                              {athlete.upcomingCamps} upcoming
                            </span>
                            <span className="text-xs text-white/40">
                              {athlete.completedCamps} completed
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Registrations Section */}
            <div className="bg-dark-100 border border-white/10">
              <div className="px-6 py-4 border-b border-magenta/30">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setActiveTab('upcoming')}
                    className={cn(
                      'text-sm font-bold uppercase tracking-wider transition-colors',
                      activeTab === 'upcoming' ? 'text-magenta' : 'text-white/40 hover:text-white/60'
                    )}
                  >
                    Upcoming ({upcomingRegistrations.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('past')}
                    className={cn(
                      'text-sm font-bold uppercase tracking-wider transition-colors',
                      activeTab === 'past' ? 'text-magenta' : 'text-white/40 hover:text-white/60'
                    )}
                  >
                    Past ({pastRegistrations.length})
                  </button>
                </div>
              </div>
              <div className="p-6">
                {activeTab === 'upcoming' ? (
                  <div className="space-y-4">
                    {upcomingRegistrations.map((reg) => (
                      <div
                        key={reg.id}
                        className={cn(
                          'p-4 border transition-all',
                          reg.status === 'pending_payment'
                            ? 'bg-magenta/5 border-magenta/30'
                            : 'bg-black/50 border-white/10'
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-white">{reg.camp}</h4>
                              {reg.status === 'confirmed' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-neon/10 text-neon text-xs font-bold uppercase tracking-wider border border-neon/30">
                                  <CheckCircle className="h-3 w-3" />
                                  Confirmed
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-magenta/10 text-magenta text-xs font-bold uppercase tracking-wider border border-magenta/30">
                                  <AlertCircle className="h-3 w-3" />
                                  Payment Due
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-white/60 mt-1">
                              Athlete: <span className="text-white">{reg.athlete}</span>
                            </p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="flex items-center gap-1 text-xs text-white/40">
                                <Calendar className="h-3 w-3" />
                                {reg.date}
                              </span>
                              <span className="flex items-center gap-1 text-xs text-white/40">
                                <MapPin className="h-3 w-3" />
                                {reg.location}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-neon">{formatCurrency(reg.amount)}</p>
                            {reg.status === 'pending_payment' && (
                              <Button variant="neon" size="sm" className="mt-2">
                                Pay Now
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pastRegistrations.map((reg) => (
                      <div key={reg.id} className="p-4 bg-black/30 border border-white/5">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-white/70">{reg.camp}</h4>
                            <p className="text-sm text-white/40 mt-1">{reg.athlete}</p>
                            <p className="text-xs text-white/30 mt-1">{reg.date}</p>
                          </div>
                          <span className="text-xs font-bold uppercase tracking-wider text-white/30">
                            Completed
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Quick Actions */}
            <div className="bg-dark-100 border border-white/10">
              <div className="px-6 py-4 border-b border-purple/30">
                <h2 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
                  <Zap className="h-4 w-4 text-purple" />
                  Quick Actions
                </h2>
              </div>
              <div className="p-4 space-y-2">
                <Link
                  href="/camps"
                  className="flex items-center justify-between p-3 bg-black/50 border border-white/10 hover:border-neon/30 hover:bg-neon/5 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-neon" />
                    <span className="text-sm font-semibold text-white">Find Camps</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-neon transition-colors" />
                </Link>
                <Link
                  href="/dashboard/athletes/new"
                  className="flex items-center justify-between p-3 bg-black/50 border border-white/10 hover:border-magenta/30 hover:bg-magenta/5 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Plus className="h-5 w-5 text-magenta" />
                    <span className="text-sm font-semibold text-white">Add Athlete</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-magenta transition-colors" />
                </Link>
                <Link
                  href="/dashboard/payments"
                  className="flex items-center justify-between p-3 bg-black/50 border border-white/10 hover:border-purple/30 hover:bg-purple/5 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-purple" />
                    <span className="text-sm font-semibold text-white">Payment History</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-purple transition-colors" />
                </Link>
              </div>
            </div>

            {/* Account Info */}
            <div className="bg-dark-100 border border-white/10">
              <div className="px-6 py-4 border-b border-white/10">
                <h2 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
                  <User className="h-4 w-4 text-white/50" />
                  Account
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider">Name</p>
                    <p className="text-sm text-white">{parentData.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider">Email</p>
                    <p className="text-sm text-white">{parentData.email}</p>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-white/10 space-y-2">
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    Account Settings
                  </Link>
                  <button className="flex items-center gap-2 text-sm text-white/60 hover:text-red-400 transition-colors">
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>

            {/* Support Card */}
            <div className="bg-gradient-to-br from-neon/10 via-magenta/10 to-purple/10 border border-white/10 p-6">
              <h3 className="font-bold text-white">Need Help?</h3>
              <p className="text-sm text-white/50 mt-2">
                Our team is here to answer any questions about camps or registrations.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 mt-4 text-sm font-bold uppercase tracking-wider text-neon hover:text-neon/80 transition-colors"
              >
                Contact Support
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
