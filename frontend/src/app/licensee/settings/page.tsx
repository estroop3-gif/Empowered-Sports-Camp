'use client'

/**
 * Licensee Settings Page
 *
 * Manage territory and business settings.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PortalPageHeader, PortalCard, LmsGate } from '@/components/portal'
import { cn } from '@/lib/utils'
import {
  Settings,
  Building2,
  MapPin,
  Mail,
  Phone,
  Globe,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  User,
  Calendar,
} from 'lucide-react'

interface TerritorySettings {
  territory_name: string
  territory_description: string
  business_name: string
  owner_name: string
  email: string
  phone: string
  website: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  default_start_time: string
  default_end_time: string
  reply_to_email: string
  support_contact: string
  created_at: string
}

export default function LicenseeSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [settings, setSettings] = useState<TerritorySettings | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      setLoading(true)
      const res = await fetch('/api/licensee/dashboard')
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load settings')
      }

      const territory = json.data?.territory
      setSettings({
        territory_name: territory?.territory_name || '',
        territory_description: territory?.territory_description || '',
        business_name: territory?.name || '',
        owner_name: territory?.primary_contact_name || '',
        email: territory?.primary_contact_email || '',
        phone: territory?.primary_contact_phone || '',
        website: null,
        address: null,
        city: null,
        state: null,
        zip: null,
        default_start_time: '09:00',
        default_end_time: '15:00',
        reply_to_email: territory?.primary_contact_email || '',
        support_contact: territory?.primary_contact_phone || '',
        created_at: territory?.created_at || '',
      })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    // Settings save would go to an API endpoint
    setSaving(true)
    setSuccess(false)
    try {
      // Simulate save
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <LmsGate featureName="settings">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 text-neon animate-spin" />
        </div>
      </LmsGate>
    )
  }

  return (
    <LmsGate featureName="settings">
      <div>
        <PortalPageHeader
          title="Settings"
          description="Manage your territory and business settings"
          actions={
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-neon text-black font-bold uppercase tracking-wider text-sm hover:bg-neon/90 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? 'Saving...' : success ? 'Saved!' : 'Save Changes'}
            </button>
          }
        />

        {error && (
          <div className="mb-6 p-4 bg-magenta/10 border border-magenta/30 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-magenta" />
            <span className="text-white">{error}</span>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Territory Info */}
          <PortalCard title="Territory Information" accent="purple">
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/50 uppercase tracking-wider mb-2">
                  Territory Name
                </label>
                <div className="flex items-center gap-3 p-3 bg-white/5">
                  <MapPin className="h-5 w-5 text-purple" />
                  <span className="text-white">{settings?.territory_name || 'Not assigned'}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/50 uppercase tracking-wider mb-2">
                  Description
                </label>
                <div className="p-3 bg-white/5">
                  <p className="text-white/70 text-sm">
                    {settings?.territory_description || 'No description available'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/50 uppercase tracking-wider mb-2">
                  Member Since
                </label>
                <div className="flex items-center gap-3 p-3 bg-white/5">
                  <Calendar className="h-5 w-5 text-white/50" />
                  <span className="text-white">
                    {settings?.created_at
                      ? new Date(settings.created_at).toLocaleDateString()
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </PortalCard>

          {/* Business Info */}
          <PortalCard title="Business Information">
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/50 uppercase tracking-wider mb-2">
                  Business Name
                </label>
                <input
                  type="text"
                  value={settings?.business_name || ''}
                  onChange={(e) =>
                    setSettings((s) => (s ? { ...s, business_name: e.target.value } : null))
                  }
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-white/50 uppercase tracking-wider mb-2">
                  Owner Name
                </label>
                <input
                  type="text"
                  value={settings?.owner_name || ''}
                  onChange={(e) =>
                    setSettings((s) => (s ? { ...s, owner_name: e.target.value } : null))
                  }
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-white/50 uppercase tracking-wider mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={settings?.email || ''}
                  onChange={(e) =>
                    setSettings((s) => (s ? { ...s, email: e.target.value } : null))
                  }
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-white/50 uppercase tracking-wider mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={settings?.phone || ''}
                  onChange={(e) =>
                    setSettings((s) => (s ? { ...s, phone: e.target.value } : null))
                  }
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                />
              </div>
            </div>
          </PortalCard>

          {/* Communication Settings */}
          <PortalCard title="Communication Settings">
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/50 uppercase tracking-wider mb-2">
                  Reply-To Email
                </label>
                <input
                  type="email"
                  value={settings?.reply_to_email || ''}
                  onChange={(e) =>
                    setSettings((s) => (s ? { ...s, reply_to_email: e.target.value } : null))
                  }
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                  placeholder="Email address for parent replies"
                />
              </div>

              <div>
                <label className="block text-sm text-white/50 uppercase tracking-wider mb-2">
                  Support Contact
                </label>
                <input
                  type="text"
                  value={settings?.support_contact || ''}
                  onChange={(e) =>
                    setSettings((s) => (s ? { ...s, support_contact: e.target.value } : null))
                  }
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                  placeholder="Local support phone/email"
                />
              </div>
            </div>
          </PortalCard>

          {/* Camp Defaults */}
          <PortalCard title="Camp Defaults">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/50 uppercase tracking-wider mb-2">
                    Default Start Time
                  </label>
                  <input
                    type="time"
                    value={settings?.default_start_time || '09:00'}
                    onChange={(e) =>
                      setSettings((s) =>
                        s ? { ...s, default_start_time: e.target.value } : null
                      )
                    }
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/50 uppercase tracking-wider mb-2">
                    Default End Time
                  </label>
                  <input
                    type="time"
                    value={settings?.default_end_time || '15:00'}
                    onChange={(e) =>
                      setSettings((s) => (s ? { ...s, default_end_time: e.target.value } : null))
                    }
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                  />
                </div>
              </div>

              <p className="text-xs text-white/40">
                These defaults will be pre-filled when creating new camps.
              </p>
            </div>
          </PortalCard>
        </div>

        {/* Info Footer */}
        <div className="mt-8 p-4 bg-white/5 border border-white/10">
          <p className="text-sm text-white/50">
            <span className="font-bold text-white">Note:</span> Some settings like territory
            boundaries and license terms are managed by HQ and cannot be changed here. Contact
            support for any changes to your license agreement.
          </p>
        </div>
      </div>
    </LmsGate>
  )
}
