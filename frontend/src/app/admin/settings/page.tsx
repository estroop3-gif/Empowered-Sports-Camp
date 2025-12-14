'use client'

import { useState } from 'react'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import {
  Settings,
  Building2,
  CreditCard,
  Mail,
  Bell,
  Shield,
  Globe,
  Palette,
  Users,
  Key,
  Save,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * Admin Settings Page
 *
 * Global system settings for HQ admins
 */

const SETTINGS_SECTIONS = [
  { id: 'organization', label: 'Organization', icon: Building2 },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'branding', label: 'Branding', icon: Palette },
]

export default function AdminSettingsPage() {
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState('organization')
  const [saving, setSaving] = useState(false)

  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'

  const handleSave = async () => {
    setSaving(true)
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSaving(false)
  }

  return (
    <AdminLayout
      userRole="hq_admin"
      userName={userName}
    >
      <PageHeader
        title="Settings"
        description="Configure global system settings"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Settings' },
        ]}
      >
        <Button variant="neon" onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <span className="animate-spin mr-2">...</span>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </PageHeader>

      <div className="grid gap-8 lg:grid-cols-4">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {SETTINGS_SECTIONS.map((section) => {
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'flex items-center gap-3 w-full px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider transition-all',
                    activeSection === section.id
                      ? 'bg-neon/10 text-neon border-l-2 border-neon'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {section.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3 space-y-6">
          {activeSection === 'organization' && (
            <ContentCard title="Organization Settings" accent="neon">
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    Organization Name
                  </label>
                  <Input
                    type="text"
                    defaultValue="Empowered Sports Camp"
                    placeholder="Your organization name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    Primary Contact Email
                  </label>
                  <Input
                    type="email"
                    defaultValue=""
                    placeholder="contact@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    Support Phone
                  </label>
                  <Input
                    type="tel"
                    defaultValue=""
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    Website URL
                  </label>
                  <Input
                    type="url"
                    defaultValue=""
                    placeholder="https://www.example.com"
                  />
                </div>
              </div>
            </ContentCard>
          )}

          {activeSection === 'payments' && (
            <ContentCard title="Payment Settings" accent="magenta">
              <div className="space-y-6">
                <div className="p-4 bg-magenta/5 border border-magenta/30">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-magenta" />
                    <div>
                      <p className="font-bold text-white">Stripe Integration</p>
                      <p className="text-xs text-white/40">Connect your Stripe account to process payments</p>
                    </div>
                  </div>
                  <Button variant="outline-neon" size="sm" className="mt-4">
                    Configure Stripe
                  </Button>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    Default Royalty Rate (%)
                  </label>
                  <Input
                    type="number"
                    defaultValue="10"
                    min="0"
                    max="100"
                    placeholder="10"
                  />
                  <p className="text-xs text-white/30 mt-1">Percentage of registration fees collected as royalty</p>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    Currency
                  </label>
                  <select className="w-full bg-black border border-white/20 text-white px-4 py-3 focus:border-neon focus:outline-none">
                    <option value="USD">USD - US Dollar</option>
                    <option value="CAD">CAD - Canadian Dollar</option>
                  </select>
                </div>
              </div>
            </ContentCard>
          )}

          {activeSection === 'email' && (
            <ContentCard title="Email Settings" accent="purple">
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    From Email Address
                  </label>
                  <Input
                    type="email"
                    defaultValue=""
                    placeholder="noreply@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    From Name
                  </label>
                  <Input
                    type="text"
                    defaultValue="Empowered Sports Camp"
                    placeholder="Your organization name"
                  />
                </div>
                <div className="p-4 bg-white/5 border border-white/10">
                  <p className="text-sm text-white/60">
                    Email templates can be customized in the AWS Cognito console under User Pool → Messaging.
                  </p>
                </div>
              </div>
            </ContentCard>
          )}

          {activeSection === 'notifications' && (
            <ContentCard title="Notification Settings" accent="neon">
              <div className="space-y-4">
                {[
                  { label: 'New registration alerts', description: 'Get notified when a new registration is made', enabled: true },
                  { label: 'Payment received', description: 'Get notified when payments are processed', enabled: true },
                  { label: 'New licensee signup', description: 'Get notified when a new licensee joins', enabled: true },
                  { label: 'Low enrollment warnings', description: 'Get notified when camp enrollment is low', enabled: false },
                  { label: 'Daily summary', description: 'Receive a daily summary of activity', enabled: false },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-black/50 border border-white/10">
                    <div>
                      <p className="font-semibold text-white">{item.label}</p>
                      <p className="text-xs text-white/40">{item.description}</p>
                    </div>
                    <button
                      className={cn(
                        'relative h-6 w-11 rounded-full transition-colors',
                        item.enabled ? 'bg-neon' : 'bg-white/20'
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-1 h-4 w-4 bg-white rounded-full transition-transform',
                          item.enabled ? 'left-6' : 'left-1'
                        )}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </ContentCard>
          )}

          {activeSection === 'security' && (
            <ContentCard title="Security Settings" accent="magenta">
              <div className="space-y-6">
                <div className="p-4 bg-neon/5 border border-neon/30">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-neon" />
                    <div>
                      <p className="font-bold text-white">Two-Factor Authentication</p>
                      <p className="text-xs text-white/40">Add an extra layer of security to admin accounts</p>
                    </div>
                  </div>
                  <Button variant="outline-neon" size="sm" className="mt-4">
                    Configure 2FA
                  </Button>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    Session Timeout (minutes)
                  </label>
                  <Input
                    type="number"
                    defaultValue="60"
                    min="5"
                    max="480"
                    placeholder="60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    Password Requirements
                  </label>
                  <div className="space-y-2 text-sm text-white/60">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-neon" />
                      Minimum 8 characters
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-neon" />
                      At least one uppercase letter
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-neon" />
                      At least one number
                    </div>
                  </div>
                </div>
              </div>
            </ContentCard>
          )}

          {activeSection === 'branding' && (
            <ContentCard title="Branding Settings" accent="purple">
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    Logo
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 bg-white/5 border border-white/10 flex items-center justify-center">
                      <Palette className="h-8 w-8 text-white/20" />
                    </div>
                    <Button variant="outline-neon" size="sm">
                      Upload Logo
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    Primary Color
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-neon border border-white/20" />
                    <Input
                      type="text"
                      defaultValue="#39FF14"
                      placeholder="#39FF14"
                      className="max-w-32"
                    />
                    <span className="text-xs text-white/40">Neon Green (default)</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    Accent Color
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-magenta border border-white/20" />
                    <Input
                      type="text"
                      defaultValue="#FF0080"
                      placeholder="#FF0080"
                      className="max-w-32"
                    />
                    <span className="text-xs text-white/40">Magenta (default)</span>
                  </div>
                </div>
              </div>
            </ContentCard>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
