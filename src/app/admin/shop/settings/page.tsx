'use client'

/**
 * Locker Room Manager - Settings
 *
 * Admin interface for configuring shop settings, Stripe integration,
 * and storefront customization.
 *
 * Route: /admin/shop/settings
 */

import { useState, useEffect } from 'react'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import {
  getShopSetting,
  upsertShopSetting,
} from '@/lib/services/shop'
import {
  Settings,
  CreditCard,
  Palette,
  Type,
  Globe,
  Shield,
  Save,
  Loader2,
  AlertCircle,
  Check,
  ExternalLink,
  Info,
} from 'lucide-react'

interface ShopSettings {
  hero_title: string
  hero_subtitle: string
  hero_tagline: string
  movement_message: string
  checkout_message: string
  stripe_configured: boolean
  tax_rate: number
  shipping_flat_rate: number
  free_shipping_threshold: number
}

const DEFAULT_SETTINGS: ShopSettings = {
  hero_title: 'Empowered Locker',
  hero_subtitle: 'Gear for girls who play fierce and dream bigger.',
  hero_tagline: 'Join the Movement',
  movement_message: 'Every purchase helps more girls step into confident competition. You\'re part of something bigger.',
  checkout_message: 'Thank you for supporting Empowered Sports Camps!',
  stripe_configured: false,
  tax_rate: 0,
  shipping_flat_rate: 0,
  free_shipping_threshold: 0,
}

export default function AdminShopSettingsPage() {
  const { user, role, tenant } = useAuth()

  const [settings, setSettings] = useState<ShopSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    setLoading(true)
    setError(null)

    try {
      // Load each setting
      const settingKeys: (keyof ShopSettings)[] = [
        'hero_title',
        'hero_subtitle',
        'hero_tagline',
        'movement_message',
        'checkout_message',
        'stripe_configured',
        'tax_rate',
        'shipping_flat_rate',
        'free_shipping_threshold',
      ]

      const loadedSettings: Record<string, unknown> = {}

      for (const key of settingKeys) {
        const { data } = await getShopSetting(key)
        if (data !== null) {
          loadedSettings[key] = data
        }
      }

      setSettings({ ...DEFAULT_SETTINGS, ...loadedSettings } as ShopSettings)
    } catch (err) {
      console.error('Failed to load settings:', err)
      setError('Failed to load settings')
    }

    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      // Save each setting
      const entries = Object.entries(settings) as [keyof ShopSettings, ShopSettings[keyof ShopSettings]][]

      for (const [key, value] of entries) {
        const { error: saveError } = await upsertShopSetting(key, value)
        if (saveError) {
          throw new Error(`Failed to save ${key}`)
        }
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Failed to save settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    }

    setSaving(false)
  }

  function updateSetting<K extends keyof ShopSettings>(key: K, value: ShopSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  if (!user || role !== 'hq_admin') {
    return (
      <AdminLayout
        userRole={role || 'director'}
        userName={user?.email || 'User'}
        tenantName={tenant?.name}
      >
        <div className="flex items-center justify-center py-20">
          <p className="text-white/50">Only HQ admins can access shop settings.</p>
        </div>
      </AdminLayout>
    )
  }

  if (loading) {
    return (
      <AdminLayout
        userRole={role}
        userName={user?.email || 'Admin'}
        tenantName={tenant?.name}
      >
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-neon" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout
      userRole={role}
      userName={user?.email || 'Admin'}
      tenantName={tenant?.name}
    >
      <PageHeader
        title="Shop Settings"
        description="Configure your Empowered Locker storefront"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Locker Room', href: '/admin/shop' },
          { label: 'Settings' },
        ]}
      >
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : success ? (
            <Check className="h-5 w-5" />
          ) : (
            <Save className="h-5 w-5" />
          )}
          {success ? 'Saved!' : 'Save Settings'}
        </button>
      </PageHeader>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-magenta/10 border border-magenta/30 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-magenta" />
          <p className="text-magenta">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Storefront Content */}
        <ContentCard
          title="Storefront Content"
          description="Customize the text displayed on your shop"
          accent="neon"
        >
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                Hero Title
              </label>
              <input
                type="text"
                value={settings.hero_title}
                onChange={(e) => updateSetting('hero_title', e.target.value)}
                className="w-full h-12 bg-black border border-white/10 px-4 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
                placeholder="Empowered Locker"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                Hero Subtitle
              </label>
              <input
                type="text"
                value={settings.hero_subtitle}
                onChange={(e) => updateSetting('hero_subtitle', e.target.value)}
                className="w-full h-12 bg-black border border-white/10 px-4 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
                placeholder="Gear for girls who play fierce..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                Hero Tagline
              </label>
              <input
                type="text"
                value={settings.hero_tagline}
                onChange={(e) => updateSetting('hero_tagline', e.target.value)}
                className="w-full h-12 bg-black border border-white/10 px-4 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
                placeholder="Join the Movement"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                Movement Message
              </label>
              <textarea
                value={settings.movement_message}
                onChange={(e) => updateSetting('movement_message', e.target.value)}
                rows={3}
                className="w-full bg-black border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:border-neon focus:outline-none resize-none"
                placeholder="Every purchase helps..."
              />
              <p className="text-xs text-white/40 mt-1">
                Displayed on product pages and in cart
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                Checkout Message
              </label>
              <textarea
                value={settings.checkout_message}
                onChange={(e) => updateSetting('checkout_message', e.target.value)}
                rows={2}
                className="w-full bg-black border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:border-neon focus:outline-none resize-none"
                placeholder="Thank you for supporting..."
              />
              <p className="text-xs text-white/40 mt-1">
                Shown after successful checkout
              </p>
            </div>
          </div>
        </ContentCard>

        {/* Stripe Integration */}
        <ContentCard
          title="Stripe Integration"
          description="Configure payment processing"
          accent="purple"
        >
          <div className="space-y-6">
            {/* Status */}
            <div className="p-4 bg-black border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-6 w-6 text-purple" />
                  <div>
                    <p className="font-bold text-white">Payment Status</p>
                    <p className="text-xs text-white/40">Stripe Checkout</p>
                  </div>
                </div>
                <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider border ${
                  settings.stripe_configured
                    ? 'text-neon bg-neon/10 border-neon/30'
                    : 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30'
                }`}>
                  {settings.stripe_configured ? 'Connected' : 'Not Configured'}
                </span>
              </div>

              <div className="bg-dark-100 p-3 text-sm">
                <div className="flex items-start gap-2 text-white/60">
                  <Info className="h-4 w-4 mt-0.5 text-white/40" />
                  <div>
                    <p className="mb-2">
                      Stripe integration requires environment variables to be set on the server:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-xs text-white/40">
                      <li>STRIPE_SECRET_KEY</li>
                      <li>STRIPE_PUBLISHABLE_KEY</li>
                      <li>STRIPE_WEBHOOK_SECRET</li>
                      <li>NEXT_PUBLIC_BASE_URL</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-2">
              <a
                href="https://dashboard.stripe.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 border border-white/10 hover:border-white/20 transition-colors"
              >
                <span className="text-white">Stripe Dashboard</span>
                <ExternalLink className="h-4 w-4 text-white/40" />
              </a>
              <a
                href="https://stripe.com/docs/checkout"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 border border-white/10 hover:border-white/20 transition-colors"
              >
                <span className="text-white">Stripe Checkout Docs</span>
                <ExternalLink className="h-4 w-4 text-white/40" />
              </a>
            </div>
          </div>
        </ContentCard>

        {/* Shipping & Tax */}
        <ContentCard
          title="Shipping & Tax"
          description="Configure shipping rates and tax settings"
          accent="magenta"
        >
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                Tax Rate (%)
              </label>
              <input
                type="number"
                value={settings.tax_rate}
                onChange={(e) => updateSetting('tax_rate', parseFloat(e.target.value) || 0)}
                min="0"
                max="100"
                step="0.01"
                className="w-full h-12 bg-black border border-white/10 px-4 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
                placeholder="0"
              />
              <p className="text-xs text-white/40 mt-1">
                Applied to all orders. Set to 0 for no tax.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                Flat Shipping Rate (cents)
              </label>
              <input
                type="number"
                value={settings.shipping_flat_rate}
                onChange={(e) => updateSetting('shipping_flat_rate', parseInt(e.target.value) || 0)}
                min="0"
                className="w-full h-12 bg-black border border-white/10 px-4 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
                placeholder="0"
              />
              <p className="text-xs text-white/40 mt-1">
                e.g., 599 = $5.99 shipping. Set to 0 for free shipping.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                Free Shipping Threshold (cents)
              </label>
              <input
                type="number"
                value={settings.free_shipping_threshold}
                onChange={(e) => updateSetting('free_shipping_threshold', parseInt(e.target.value) || 0)}
                min="0"
                className="w-full h-12 bg-black border border-white/10 px-4 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
                placeholder="0"
              />
              <p className="text-xs text-white/40 mt-1">
                Orders above this amount get free shipping. Set to 0 to disable.
              </p>
            </div>
          </div>
        </ContentCard>

        {/* Future Features */}
        <ContentCard
          title="Coming Soon"
          description="Features in development"
          accent="neon"
        >
          <div className="space-y-4">
            <FeaturePreview
              icon={Globe}
              title="Multi-Currency Support"
              description="Accept payments in different currencies"
            />
            <FeaturePreview
              icon={Palette}
              title="Theme Customization"
              description="Customize colors and branding per licensee"
            />
            <FeaturePreview
              icon={Shield}
              title="Inventory Alerts"
              description="Get notified when products are low in stock"
            />
          </div>
        </ContentCard>
      </div>
    </AdminLayout>
  )
}

/**
 * Feature Preview Component
 */
function FeaturePreview({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-4 p-4 bg-black/50 border border-white/5">
      <div className="p-2 bg-white/5 text-white/30">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="font-bold text-white/50">{title}</p>
        <p className="text-xs text-white/30">{description}</p>
      </div>
    </div>
  )
}
