'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { CheckoutProvider, useCheckout } from '@/lib/checkout/context'
import { useAuth } from '@/lib/auth/context'
import {
  RegistrationLayout,
  CamperForm,
  BuildHerSquadStep,
  AddOnSelector,
  WaiversStep,
  AccountCreationStep,
  PaymentStep,
  ConfirmationStep,
  WaitlistConfirmationStep,
} from '@/components/registration'
import { SaveExitBar } from '@/components/registration/SaveExitBar'
import type { CampSession, AddOn, CampWithAddOns } from '@/types/registration'

/**
 * Registration Page
 *
 * Multi-step checkout flow for camp registration.
 * Steps: Camp Selection → Camper Info → Add-Ons → Payment → Confirmation
 */

// Transform API response (PublicCampCard) to CampSession format
interface PublicCampCard {
  id: string
  slug: string
  name: string
  description: string | null
  program_type: string
  start_date: string
  end_date: string
  daily_start_time: string | null
  daily_end_time: string | null
  min_age: number
  max_age: number
  max_capacity: number
  price: number
  early_bird_price: number | null
  early_bird_deadline: string | null
  image_url: string | null
  highlights: string[]
  sports_offered: string[]
  tenant_id: string | null
  location_id: string | null
  location_name: string | null
  location_address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  latitude: number | null
  longitude: number | null
  venue_id: string | null
  venue_name: string | null
  waitlist_enabled: boolean
  spots_remaining: number
  current_price: number
  is_full: boolean
}

function transformApiCampToSession(apiCamp: PublicCampCard): CampSession {
  const now = new Date()
  const isEarlyBird = apiCamp.early_bird_deadline && new Date(apiCamp.early_bird_deadline) > now

  return {
    id: apiCamp.id,
    slug: apiCamp.slug,
    name: apiCamp.name,
    description: apiCamp.description,
    programType: apiCamp.program_type as CampSession['programType'],
    locationId: apiCamp.location_id || apiCamp.venue_id,
    location: (apiCamp.location_name || apiCamp.venue_name) ? {
      id: apiCamp.location_id || apiCamp.venue_id || '',
      name: apiCamp.location_name || apiCamp.venue_name || '',
      addressLine1: apiCamp.location_address || '',
      addressLine2: null,
      city: apiCamp.city || '',
      state: apiCamp.state || '',
      zipCode: apiCamp.zip_code || '',
      latitude: apiCamp.latitude,
      longitude: apiCamp.longitude,
    } : null,
    startDate: apiCamp.start_date.split('T')[0],
    endDate: apiCamp.end_date.split('T')[0],
    dailyStartTime: apiCamp.daily_start_time || '09:00',
    dailyEndTime: apiCamp.daily_end_time || '15:00',
    minAge: apiCamp.min_age,
    maxAge: apiCamp.max_age,
    maxCapacity: apiCamp.max_capacity,
    spotsRemaining: apiCamp.spots_remaining,
    price: apiCamp.price,
    earlyBirdPrice: apiCamp.early_bird_price,
    earlyBirdDeadline: apiCamp.early_bird_deadline?.split('T')[0] || null,
    siblingDiscountPercent: 10, // Default sibling discount
    beforeCarePrice: 2500, // Default before care price
    afterCarePrice: 2500, // Default after care price
    beforeCareStart: '07:30',
    afterCareEnd: '17:30',
    imageUrl: apiCamp.image_url,
    highlights: apiCamp.highlights || [],
    sportsOffered: apiCamp.sports_offered || [],
    isEarlyBird: isEarlyBird || false,
    isFull: apiCamp.is_full,
    waitlistEnabled: apiCamp.waitlist_enabled !== false,
    tenantId: apiCamp.tenant_id || '',
  }
}

// Default add-ons for when API returns empty or no add-ons exist
// These serve as examples and fallback upsell items
const DEFAULT_ADDONS: AddOn[] = [
  {
    id: 'addon-001',
    tenantId: 'default',
    name: 'Daily Fuel Pack',
    slug: 'daily-fuel-pack',
    description: 'Balanced snacks and drinks to keep her energized all day.',
    hypeCopy: 'Keep her powered up all day with balanced snacks and drinks. No sugar crashes, just sustained energy for champions.',
    addonType: 'fuel_pack',
    scope: 'per_camper',
    price: 4500,
    compareAtPrice: null,
    imageUrl: null,
    displayOrder: 1,
    featured: true,
    variants: [],
  },
  {
    id: 'addon-002',
    tenantId: 'default',
    name: 'Empowered Athlete Tee',
    slug: 'empowered-tee',
    description: 'Official camp t-shirt. Premium cotton blend.',
    hypeCopy: 'Let her wear her grind on and off the field. The official tee of future champions.',
    addonType: 'apparel',
    scope: 'per_camper',
    price: 2500,
    compareAtPrice: null,
    imageUrl: null,
    displayOrder: 2,
    featured: true,
    variants: [
      { id: 'var-001', addonId: 'addon-002', name: 'YXS', sku: 'TEE-YXS', priceOverride: null, inventoryQuantity: 50, lowStockThreshold: 5, allowBackorder: false, isLowStock: false, isSoldOut: false },
      { id: 'var-002', addonId: 'addon-002', name: 'YS', sku: 'TEE-YS', priceOverride: null, inventoryQuantity: 50, lowStockThreshold: 5, allowBackorder: false, isLowStock: false, isSoldOut: false },
      { id: 'var-003', addonId: 'addon-002', name: 'YM', sku: 'TEE-YM', priceOverride: null, inventoryQuantity: 50, lowStockThreshold: 5, allowBackorder: false, isLowStock: false, isSoldOut: false },
      { id: 'var-004', addonId: 'addon-002', name: 'YL', sku: 'TEE-YL', priceOverride: null, inventoryQuantity: 3, lowStockThreshold: 5, allowBackorder: false, isLowStock: true, isSoldOut: false },
      { id: 'var-005', addonId: 'addon-002', name: 'AS', sku: 'TEE-AS', priceOverride: null, inventoryQuantity: 50, lowStockThreshold: 5, allowBackorder: false, isLowStock: false, isSoldOut: false },
      { id: 'var-006', addonId: 'addon-002', name: 'AM', sku: 'TEE-AM', priceOverride: null, inventoryQuantity: 50, lowStockThreshold: 5, allowBackorder: false, isLowStock: false, isSoldOut: false },
      { id: 'var-007', addonId: 'addon-002', name: 'AL', sku: 'TEE-AL', priceOverride: null, inventoryQuantity: 50, lowStockThreshold: 5, allowBackorder: false, isLowStock: false, isSoldOut: false },
      { id: 'var-008', addonId: 'addon-002', name: 'AXL', sku: 'TEE-AXL', priceOverride: null, inventoryQuantity: 50, lowStockThreshold: 5, allowBackorder: false, isLowStock: false, isSoldOut: false },
    ],
  },
  {
    id: 'addon-003',
    tenantId: 'default',
    name: 'Champion Water Bottle',
    slug: 'water-bottle',
    description: '32oz insulated stainless steel with logo.',
    hypeCopy: 'Hydrate like a champion. Keeps drinks cold for 24 hours.',
    addonType: 'merchandise',
    scope: 'per_camper',
    price: 2000,
    compareAtPrice: 2500,
    imageUrl: null,
    displayOrder: 3,
    featured: false,
    variants: [],
  },
  {
    id: 'addon-004',
    tenantId: 'default',
    name: 'Empowered Snapback',
    slug: 'snapback-hat',
    description: 'Adjustable snapback with embroidered logo.',
    hypeCopy: 'Crown yourself. Adjustable fit for every future champion.',
    addonType: 'merchandise',
    scope: 'per_camper',
    price: 1800,
    compareAtPrice: null,
    imageUrl: null,
    displayOrder: 4,
    featured: false,
    variants: [],
  },
  {
    id: 'addon-005',
    tenantId: 'default',
    name: 'Fierce Wristband Pack',
    slug: 'wristband-pack',
    description: 'Set of 3 silicone wristbands in neon, magenta, and purple.',
    hypeCopy: 'Stack your strength. Three bands, infinite confidence.',
    addonType: 'merchandise',
    scope: 'per_camper',
    price: 800,
    compareAtPrice: null,
    imageUrl: null,
    displayOrder: 5,
    featured: false,
    variants: [],
  },
]

function RegistrationContent({ camp, addons }: { camp: CampSession; addons: AddOn[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { state, setStep, setCamp, setSquad, setWaitlistMode, nextStep, prevStep, loadDraftState } = useCheckout()
  const { user: authUser, loading: authLoading } = useAuth()
  const [confirmationNumber, setConfirmationNumber] = useState<string | null>(null)
  const draftLoadedRef = useRef(false)

  // Resume from saved draft if ?resume=true
  const isResume = searchParams.get('resume') === 'true'
  const loadSavedDraft = useCallback(async () => {
    if (!isResume || draftLoadedRef.current) return
    draftLoadedRef.current = true

    // Try to get parent email from localStorage state or auth user
    const savedKey = 'empowered-checkout-state'
    let email = ''
    try {
      const saved = localStorage.getItem(savedKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        email = parsed.parentInfo?.email || ''
      }
    } catch { /* ignore */ }

    if (!email && authUser) {
      try {
        const profileRes = await fetch(`/api/profiles?action=byId&profileId=${authUser.id}`)
        const profileData = await profileRes.json()
        email = profileData.data?.email || ''
      } catch { /* ignore */ }
    }

    if (!email) return

    try {
      const res = await fetch('/api/registration-drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'load', parentEmail: email, campId: camp.id }),
      })
      const result = await res.json()
      if (result.data?.checkoutState) {
        loadDraftState(result.data.checkoutState)
      }
    } catch (err) {
      console.error('[Resume] Failed to load draft:', err)
    }
  }, [isResume, camp.id, authUser, loadDraftState])

  useEffect(() => {
    loadSavedDraft()
  }, [loadSavedDraft])

  // Reactive authentication check — updates when user logs in via modal
  const isAuthenticated = authLoading ? null : !!authUser
  // Track if the user logged in mid-session (via modal) so we don't auto-skip the account step
  // The AccountCreationStep handles its own advancement after modal login
  const loggedInViaModalRef = useRef(false)
  useEffect(() => {
    // If auth was loading and now the user is present, but they weren't before, they logged in mid-flow
    if (!authLoading && authUser && isAuthenticated === true) {
      // Only set this if we're currently on the account step (meaning they used the modal)
      if (state.step === 'account') {
        loggedInViaModalRef.current = true
      }
    }
  }, [authLoading, authUser, isAuthenticated, state.step])

  // Go back to camps page from camper form
  const handleBackToCamps = () => {
    router.push('/camps')
  }

  // Set camp on mount and detect waitlist mode
  useEffect(() => {
    setCamp(camp)
    if (camp.isFull && camp.waitlistEnabled) {
      setWaitlistMode(true)
    }
  }, [camp, setCamp, setWaitlistMode])

  // Auto-advance from camp step since we're already on a specific camp page
  useEffect(() => {
    if (state.step === 'camp' && state.campSession) {
      setStep('campers')
    }
  }, [state.step, state.campSession, setStep])

  // Auto-skip account step if user was already logged in before reaching registration
  // If they log in via the login modal in AccountCreationStep, that component handles advancement itself
  useEffect(() => {
    if (state.step === 'account' && isAuthenticated === true && !loggedInViaModalRef.current) {
      nextStep() // Skip to payment
    }
  }, [state.step, isAuthenticated, nextStep])

  const handlePaymentComplete = async (sessionId: string) => {
    // This callback is called in demo mode when Stripe isn't configured
    // In production, users are redirected to Stripe and return to /register/confirmation
    // Generate confirmation number from session ID
    const confirmation = `EA-${sessionId.slice(-8).toUpperCase()}`
    setConfirmationNumber(confirmation)

    // Move to confirmation step
    setStep('confirmation')
  }

  // Custom back handler for payment step - skip account if authenticated
  const handlePaymentBack = () => {
    if (isAuthenticated) {
      setStep('waivers') // Skip account step, go directly to waivers
    } else {
      prevStep()
    }
  }

  // Build registered athletes from campers for squad feature
  // Only include athletes that already exist in the database (have existingAthleteId)
  // New athletes can't be added to squads until after registration is complete
  const registeredAthletes = state.campers
    .filter((c) => c.firstName && c.lastName && c.existingAthleteId)
    .map((c) => ({
      id: c.existingAthleteId as string,
      firstName: c.firstName,
      lastName: c.lastName,
    }))

  const renderStep = () => {
    switch (state.step) {
      case 'camp':
        // This step is auto-skipped since we're on a specific camp page
        return null

      case 'campers':
        return (
          <CamperForm
            campSession={camp}
            onContinue={nextStep}
            onBack={handleBackToCamps}
          />
        )

      case 'squad':
        return (
          <BuildHerSquadStep
            campId={camp.id}
            campName={camp.name}
            tenantId={camp.tenantId}
            registeredAthletes={registeredAthletes}
            parentName={`${state.parentInfo.firstName} ${state.parentInfo.lastName}`.trim()}
            parentEmail={state.parentInfo.email}
            onContinue={nextStep}
            onBack={prevStep}
            onSquadUpdate={setSquad}
          />
        )

      case 'addons':
        return (
          <AddOnSelector
            availableAddOns={addons}
            onContinue={nextStep}
            onBack={prevStep}
          />
        )

      case 'waivers':
        return (
          <WaiversStep
            campSession={camp}
            onContinue={nextStep}
            onBack={prevStep}
          />
        )

      case 'account':
        return (
          <AccountCreationStep
            onContinue={nextStep}
            onBack={prevStep}
          />
        )

      case 'payment':
        return (
          <PaymentStep
            onComplete={handlePaymentComplete}
            onBack={handlePaymentBack}
          />
        )

      case 'waitlist-confirm':
        return (
          <WaitlistConfirmationStep
            campSession={camp}
            onBack={prevStep}
          />
        )

      case 'confirmation':
        return (
          <ConfirmationStep
            campSession={camp}
            confirmationNumber={confirmationNumber || 'EA-PENDING'}
          />
        )

      default:
        return null
    }
  }

  return (
    <RegistrationLayout
      currentStep={state.step}
      campSession={camp}
      availableAddOns={addons}
      hideAccountStep={isAuthenticated === true}
      isWaitlistMode={state.isWaitlistMode}
    >
      {renderStep()}
      <SaveExitBar camp={camp} />
    </RegistrationLayout>
  )
}

export default function RegisterPage() {
  const params = useParams()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [camp, setCamp] = useState<CampSession | null>(null)
  const [addons, setAddons] = useState<AddOn[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCampData() {
      setIsLoading(true)
      setError(null)

      try {
        // The param can be a camp ID (from detail page) or a slug (from shared URLs)
        const param = params.campSlug as string
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(param)

        let campResult: { data: PublicCampCard | null }

        if (isUUID) {
          const res = await fetch(`/api/camps?action=byId&id=${param}`)
          campResult = await res.json()
        } else {
          const res = await fetch(`/api/camps?action=bySlug&slug=${param}`)
          campResult = await res.json()
        }

        if (!campResult.data) {
          setError('Camp not found')
          return
        }

        // Transform API response to CampSession format
        const campSession = transformApiCampToSession(campResult.data)
        setCamp(campSession)

        // Fetch camp-specific add-ons from the addons table
        let allAddons: AddOn[] = []

        try {
          const campAddonsRes = await fetch(`/api/camps/${campSession.id}/addons`)
          if (campAddonsRes.ok) {
            const campAddonsData = await campAddonsRes.json()
            if (campAddonsData.addons?.length > 0) {
              allAddons = campAddonsData.addons
            }
          }
        } catch {
          // Camp addons fetch failed, continue to fallbacks
        }

        // If no camp-specific add-ons, try shop products
        if (allAddons.length === 0) {
          try {
            const addonsResponse = await fetch('/api/shop/products?category=addons')
            const addonsResult = await addonsResponse.json()
            const shopProducts = Array.isArray(addonsResult) ? addonsResult : addonsResult.data || []

            if (shopProducts.length > 0) {
              allAddons = shopProducts.map((product: {
                id: string
                licensee_id: string | null
                name: string
                slug: string
                description: string | null
                price_cents: number
                image_url: string | null
                is_featured: boolean
                variants?: Array<{
                  id: string
                  product_id: string
                  name: string
                  sku: string | null
                  price_cents: number | null
                  inventory_quantity: number | null
                }>
              }, index: number) => ({
                id: product.id,
                tenantId: product.licensee_id || campSession.tenantId,
                name: product.name,
                slug: product.slug,
                description: product.description,
                hypeCopy: product.description,
                addonType: 'merchandise' as const,
                scope: 'per_camper' as const,
                price: product.price_cents,
                compareAtPrice: null,
                imageUrl: product.image_url,
                displayOrder: index + 1,
                featured: product.is_featured,
                variants: (product.variants || []).map((v) => ({
                  id: v.id,
                  addonId: product.id,
                  name: v.name,
                  sku: v.sku,
                  priceOverride: v.price_cents,
                  inventoryQuantity: v.inventory_quantity || 0,
                  lowStockThreshold: 5,
                  allowBackorder: false,
                  isLowStock: (v.inventory_quantity || 0) <= 5 && (v.inventory_quantity || 0) > 0,
                  isSoldOut: (v.inventory_quantity || 0) <= 0,
                })),
              }))
            }
          } catch {
            // Shop products fetch failed, continue to fallback
          }
        }

        // Fall back to default add-ons if nothing else available
        setAddons(allAddons.length > 0 ? allAddons : DEFAULT_ADDONS)
      } catch (err) {
        setError('Failed to load camp data')
        console.error('Error loading camp data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    if (params.campSlug) {
      fetchCampData()
    }
  }, [params.campSlug])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 text-neon animate-spin" />
          <p className="text-white/60">Loading camp details...</p>
        </div>
      </div>
    )
  }

  if (error || !camp) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">Camp Not Found</h1>
          <p className="text-white/60">
            {error || "The camp you're looking for doesn't exist."}
          </p>
          <button
            onClick={() => router.push('/camps')}
            className="px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
          >
            Browse Camps
          </button>
        </div>
      </div>
    )
  }

  if (camp.isFull && !camp.waitlistEnabled) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-6">
          <h1 className="text-2xl font-bold text-white">Camp Full</h1>
          <p className="text-white/60">
            {camp.name} is currently at capacity and is not accepting waitlist signups at this time.
          </p>
          <button
            onClick={() => router.push('/camps')}
            className="px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
          >
            Browse Other Camps
          </button>
        </div>
      </div>
    )
  }

  return (
    <CheckoutProvider campSlug={params.campSlug as string}>
      <RegistrationContent camp={camp} addons={addons} />
    </CheckoutProvider>
  )
}
