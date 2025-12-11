'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { CheckoutProvider, useCheckout } from '@/lib/checkout/context'
import {
  RegistrationLayout,
  CamperForm,
  AddOnSelector,
  PaymentStep,
  ConfirmationStep,
} from '@/components/registration'
import type { CampSession, AddOn, CampWithAddOns } from '@/types/registration'

/**
 * Registration Page
 *
 * Multi-step checkout flow for camp registration.
 * Steps: Camp Selection → Camper Info → Add-Ons → Payment → Confirmation
 */

// Mock data - replace with actual API fetch
const MOCK_CAMP: CampSession = {
  id: 'camp-001',
  slug: 'summer-2025-all-girls',
  name: 'All-Girls Summer Camp 2025',
  description: 'A week of fierce competition, skill building, and confidence boosting for girls ages 8-14.',
  programType: 'all_girls_sports_camp',
  locationId: 'loc-001',
  location: {
    id: 'loc-001',
    name: 'Northfield Sports Complex',
    addressLine1: '1234 Champion Way',
    addressLine2: null,
    city: 'Northfield',
    state: 'IL',
    zipCode: '60093',
    latitude: null,
    longitude: null,
  },
  startDate: '2025-06-16',
  endDate: '2025-06-20',
  dailyStartTime: '09:00',
  dailyEndTime: '15:00',
  minAge: 8,
  maxAge: 14,
  maxCapacity: 50,
  spotsRemaining: 23,
  price: 39900, // $399
  earlyBirdPrice: 34900, // $349
  earlyBirdDeadline: '2025-05-01',
  siblingDiscountPercent: 10,
  beforeCarePrice: 2500,
  afterCarePrice: 2500,
  beforeCareStart: '07:30',
  afterCareEnd: '17:30',
  imageUrl: '/images/camp-hero.jpg',
  highlights: [
    'Multi-sport rotation: Basketball, Soccer, Volleyball',
    'Leadership workshops and team building',
    'Professional female athlete guest speakers',
    'End-of-week showcase for families',
  ],
  sportsOffered: ['Basketball', 'Soccer', 'Volleyball', 'Flag Football'],
  isEarlyBird: true,
  isFull: false,
  tenantId: 'tenant-001',
}

const MOCK_ADDONS: AddOn[] = [
  {
    id: 'addon-001',
    tenantId: 'tenant-001',
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
    tenantId: 'tenant-001',
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
      { id: 'var-007', addonId: 'addon-002', name: 'AL', sku: 'TEE-AL', priceOverride: null, inventoryQuantity: 0, lowStockThreshold: 5, allowBackorder: false, isLowStock: false, isSoldOut: true },
      { id: 'var-008', addonId: 'addon-002', name: 'AXL', sku: 'TEE-AXL', priceOverride: null, inventoryQuantity: 50, lowStockThreshold: 5, allowBackorder: false, isLowStock: false, isSoldOut: false },
    ],
  },
  {
    id: 'addon-003',
    tenantId: 'tenant-001',
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
    tenantId: 'tenant-001',
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
    tenantId: 'tenant-001',
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
  const { state, setStep, setCamp, nextStep, prevStep } = useCheckout()
  const [confirmationNumber, setConfirmationNumber] = useState<string | null>(null)

  // Set camp on mount
  useEffect(() => {
    setCamp(camp)
  }, [camp, setCamp])

  // Auto-advance from camp step since we're already on a specific camp page
  useEffect(() => {
    if (state.step === 'camp' && state.campSession) {
      setStep('campers')
    }
  }, [state.step, state.campSession, setStep])

  const handlePaymentComplete = async (paymentIntentId: string) => {
    // TODO: Submit registration to API
    // This would create the registration record and process payment
    console.log('Payment complete:', paymentIntentId)

    // Generate confirmation number
    const confirmation = `EA-${Date.now().toString(36).toUpperCase()}`
    setConfirmationNumber(confirmation)

    // Move to confirmation step
    setStep('confirmation')
  }

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

      case 'payment':
        return (
          <PaymentStep
            onComplete={handlePaymentComplete}
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
    >
      {renderStep()}
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
        // TODO: Fetch actual camp data from API
        // const response = await fetch(`/api/camps/${params.campSlug}`)
        // const data: CampWithAddOns = await response.json()

        // For now, use mock data
        await new Promise((resolve) => setTimeout(resolve, 500))

        if (params.campSlug === 'summer-2025-all-girls' || params.campSlug === 'demo') {
          setCamp(MOCK_CAMP)
          setAddons(MOCK_ADDONS)
        } else {
          setError('Camp not found')
        }
      } catch (err) {
        setError('Failed to load camp data')
        console.error(err)
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

  return (
    <CheckoutProvider>
      <RegistrationContent camp={camp} addons={addons} />
    </CheckoutProvider>
  )
}
