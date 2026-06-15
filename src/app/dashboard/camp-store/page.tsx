'use client'

/**
 * Camp Store - Post-Registration Add-Ons & Concession Credits
 *
 * Allows parents to purchase additional add-ons and concession credits
 * for their existing camp registrations.
 */

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/context'
import { useConcessionCredits } from '@/hooks/useConcessionCredits'
import { Button } from '@/components/ui/button'
import { cn, parseDateSafe } from '@/lib/utils'
import {
  ShoppingBag,
  ArrowLeft,
  Loader2,
  Calendar,
  Check,
  Plus,
  Minus,
  Coins,
  Package,
  Shirt,
  Coffee,
  Sparkles,
  CreditCard,
  AlertCircle,
} from 'lucide-react'

interface Registration {
  id: string
  athlete_id: string
  camp_id: string
  status: string
  athletes?: {
    id: string
    first_name: string
    last_name: string
  }
  camps?: {
    id: string
    name: string
    start_date: string
    end_date: string
  }
}

interface AddOn {
  id: string
  name: string
  description: string
  type: 'fuel_pack' | 'apparel' | 'merchandise' | 'digital' | 'service' | 'concession_credit'
  price_cents: number
  compare_at_price_cents?: number
  image_url?: string
  variants?: Array<{
    id: string
    name: string
    stock: number
  }>
  requires_size?: boolean
  featured?: boolean
  is_required?: boolean
  max_quantity?: number
}

interface CartItem {
  addOnId: string
  variantId?: string
  quantity: number
  priceCents: number
  name: string
  size?: string
}

// Concession credit preset amounts
const CREDIT_AMOUNTS = [
  { amount: 1000, label: '$10' },
  { amount: 2000, label: '$20' },
  { amount: 2500, label: '$25' },
  { amount: 5000, label: '$50' },
]

export default function CampStorePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const { getCreditDetail, fetchDetail } = useConcessionCredits()

  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null)
  const [loading, setLoading] = useState(true)
  const [addOns, setAddOns] = useState<AddOn[]>([])
  const [addOnsLoading, setAddOnsLoading] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [concessionAmount, setConcessionAmount] = useState<number>(0)
  const [customCreditAmount, setCustomCreditAmount] = useState('')
  const [activeSection, setActiveSection] = useState<'addons' | 'credits'>(
    searchParams.get('section') === 'credits' ? 'credits' : 'addons'
  )
  const [processing, setProcessing] = useState(false)
  const [selectedSize, setSelectedSize] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login')
      } else {
        loadRegistrations()
      }
    }
  }, [user, authLoading])

  // Fetch credit detail when a registration is selected
  useEffect(() => {
    if (selectedRegistration) {
      fetchDetail(selectedRegistration.athlete_id, selectedRegistration.camp_id)
    }
  }, [selectedRegistration?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch add-ons when a registration is selected, with 30s polling
  useEffect(() => {
    if (!selectedRegistration?.camp_id) {
      setAddOns([])
      return
    }

    const campId = selectedRegistration.camp_id

    let isFirst = true
    const loadAddOns = async () => {
      if (isFirst) setAddOnsLoading(true)
      try {
        const res = await fetch(`/api/camps/${campId}/addons`)
        const data = await res.json()
        if (data.addons) {
          const mapped: AddOn[] = data.addons.map((addon: Record<string, unknown>) => ({
            id: addon.id,
            name: addon.name,
            description: addon.description || '',
            type: (addon.addonType as string) || 'merchandise',
            price_cents: addon.price as number,
            compare_at_price_cents: (addon.compareAtPrice as number) || undefined,
            image_url: (addon.imageUrl as string) || undefined,
            requires_size: addon.collectSize as boolean,
            featured: addon.featured as boolean,
            is_required: addon.isRequired as boolean,
            max_quantity: addon.maxQuantity as number,
            variants: Array.isArray(addon.variants)
              ? (addon.variants as Array<Record<string, unknown>>).map((v) => ({
                  id: v.id as string,
                  name: v.name as string,
                  stock: v.inventoryQuantity as number,
                }))
              : undefined,
          }))
          setAddOns(mapped)
        }
      } catch (err) {
        console.error('Failed to load add-ons:', err)
      }
      setAddOnsLoading(false)
      isFirst = false
    }

    loadAddOns()
    const interval = setInterval(loadAddOns, 30_000)
    return () => clearInterval(interval)
  }, [selectedRegistration?.camp_id])

  const loadRegistrations = async () => {
    if (!user?.id) return

    try {
      const res = await fetch(`/api/registrations?action=byParent&parentId=${user.id}`)
      const data = await res.json()

      if (data.data) {
        // Filter to only upcoming/active registrations
        const today = new Date()
        const upcoming = data.data.filter((r: Registration) =>
          r.camps &&
          new Date(r.camps.end_date) >= today &&
          (r.status === 'confirmed' || r.status === 'registered')
        )
        setRegistrations(upcoming)

        // Auto-select if only one registration
        if (upcoming.length === 1) {
          setSelectedRegistration(upcoming[0])
        }
      }
    } catch (err) {
      console.error('Failed to load registrations:', err)
    }
    setLoading(false)
  }

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = parseDateSafe(startDate)
    const end = parseDateSafe(endDate)
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    return `${start.toLocaleDateString('en-US', options)}-${end.toLocaleDateString('en-US', options)}`
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100)
  }

  const addToCart = (addOn: AddOn, variantId?: string) => {
    const existingIndex = cart.findIndex(
      item => item.addOnId === addOn.id && item.variantId === variantId
    )

    if (existingIndex >= 0) {
      const newCart = [...cart]
      newCart[existingIndex].quantity += 1
      setCart(newCart)
    } else {
      const variant = addOn.variants?.find(v => v.id === variantId)
      setCart([...cart, {
        addOnId: addOn.id,
        variantId,
        quantity: 1,
        priceCents: addOn.price_cents,
        name: addOn.name,
        size: variant?.name,
      }])
    }
  }

  const updateCartQuantity = (index: number, delta: number) => {
    const newCart = [...cart]
    newCart[index].quantity += delta
    if (newCart[index].quantity <= 0) {
      newCart.splice(index, 1)
    }
    setCart(newCart)
  }

  const removeFromCart = (index: number) => {
    const newCart = [...cart]
    newCart.splice(index, 1)
    setCart(newCart)
  }

  const getCartTotal = () => {
    const addOnsTotal = cart.reduce((sum, item) => sum + (item.priceCents * item.quantity), 0)
    return addOnsTotal + concessionAmount
  }

  const handleSetConcessionAmount = (amount: number) => {
    setConcessionAmount(amount)
    setCustomCreditAmount('')
  }

  const handleCustomCreditChange = (value: string) => {
    setCustomCreditAmount(value)
    const parsed = parseFloat(value)
    if (!isNaN(parsed) && parsed > 0) {
      setConcessionAmount(Math.round(parsed * 100))
    } else {
      setConcessionAmount(0)
    }
  }

  const handleCheckout = async () => {
    if (!selectedRegistration || (cart.length === 0 && concessionAmount === 0)) return

    setProcessing(true)
    try {
      // In production, this would create a Stripe checkout session
      const response = await fetch('/api/store/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId: selectedRegistration.id,
          athleteId: selectedRegistration.athlete_id,
          campId: selectedRegistration.camp_id,
          items: cart,
          concessionCredits: concessionAmount,
        }),
      })

      const data = await response.json()

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else if (data.error) {
        alert(data.error)
      }
    } catch (err) {
      console.error('Checkout failed:', err)
      alert('Failed to process checkout. Please try again.')
    }
    setProcessing(false)
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neon" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-neon transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 bg-orange-400/10 border border-orange-400/30 flex items-center justify-center">
              <ShoppingBag className="h-6 w-6 text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-wider text-white">
                Camp Store
              </h1>
              <p className="text-white/50 text-sm">
                Purchase add-ons and concession credits for your camper
              </p>
            </div>
          </div>
        </div>

        {registrations.length === 0 ? (
          <div className="bg-dark-100 border border-white/10 p-12 text-center">
            <Calendar className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No Active Registrations</h3>
            <p className="text-white/50 mb-6 max-w-md mx-auto">
              You need an upcoming camp registration to purchase add-ons or concession credits.
            </p>
            <Link href="/camps">
              <Button variant="neon">Browse Camps</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Registration Selector */}
              {registrations.length > 1 && (
                <div className="bg-dark-100 border border-white/10 p-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-3">
                    Select Registration
                  </label>
                  <div className="space-y-2">
                    {registrations.map((reg) => (
                      <button
                        key={reg.id}
                        onClick={() => setSelectedRegistration(reg)}
                        className={cn(
                          'w-full flex items-center justify-between p-3 border transition-all text-left',
                          selectedRegistration?.id === reg.id
                            ? 'bg-neon/10 border-neon/50'
                            : 'bg-black/50 border-white/10 hover:border-white/30'
                        )}
                      >
                        <div>
                          <p className="font-semibold text-white">
                            {reg.athletes?.first_name} {reg.athletes?.last_name}
                          </p>
                          <p className="text-sm text-white/50">
                            {reg.camps?.name} • {reg.camps && formatDateRange(reg.camps.start_date, reg.camps.end_date)}
                          </p>
                        </div>
                        {selectedRegistration?.id === reg.id && (
                          <Check className="h-5 w-5 text-neon" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Show selected registration info if single */}
              {registrations.length === 1 && selectedRegistration && (
                <div className="bg-dark-100 border border-neon/30 p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-neon/10 border border-neon/30 flex items-center justify-center">
                      <span className="text-neon font-bold">
                        {selectedRegistration.athletes?.first_name?.[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-white">
                        {selectedRegistration.athletes?.first_name} {selectedRegistration.athletes?.last_name}
                      </p>
                      <p className="text-sm text-white/50">
                        {selectedRegistration.camps?.name}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Section Tabs */}
              <div className="flex gap-1 border-b border-white/10">
                <button
                  onClick={() => setActiveSection('addons')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 text-sm font-bold uppercase tracking-wider border-b-2 -mb-[1px] transition-colors',
                    activeSection === 'addons'
                      ? 'text-orange-400 border-orange-400'
                      : 'text-white/50 border-transparent hover:text-white'
                  )}
                >
                  <Package className="h-4 w-4" />
                  Add-Ons
                </button>
                <button
                  onClick={() => setActiveSection('credits')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 text-sm font-bold uppercase tracking-wider border-b-2 -mb-[1px] transition-colors',
                    activeSection === 'credits'
                      ? 'text-amber-400 border-amber-400'
                      : 'text-white/50 border-transparent hover:text-white'
                  )}
                >
                  <Coins className="h-4 w-4" />
                  Concession Credits
                </button>
              </div>

              {/* Add-Ons Section */}
              {activeSection === 'addons' && selectedRegistration && (
                <div className="space-y-4">
                  {addOnsLoading && addOns.length === 0 && (
                    <div className="bg-dark-100 border border-white/10 p-12 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-neon mx-auto mb-3" />
                      <p className="text-white/50">Loading add-ons...</p>
                    </div>
                  )}
                  {!addOnsLoading && addOns.length === 0 && (
                    <div className="bg-dark-100 border border-white/10 p-12 text-center">
                      <Package className="h-12 w-12 text-white/20 mx-auto mb-4" />
                      <h3 className="text-lg font-bold text-white mb-2">No Add-Ons Available</h3>
                      <p className="text-white/50 max-w-md mx-auto">
                        There are no add-ons configured for this camp yet. Check back later or switch to Concession Credits.
                      </p>
                    </div>
                  )}
                  {addOns.map((addOn) => (
                    <div
                      key={addOn.id}
                      className="bg-dark-100 border border-white/10 p-4 hover:border-white/20 transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          'h-16 w-16 flex items-center justify-center border flex-shrink-0',
                          addOn.type === 'fuel_pack' && 'bg-green-500/10 border-green-500/30',
                          addOn.type === 'apparel' && 'bg-purple-500/10 border-purple-500/30',
                          addOn.type === 'merchandise' && 'bg-blue-500/10 border-blue-500/30',
                        )}>
                          {addOn.type === 'fuel_pack' && <Coffee className="h-6 w-6 text-green-400" />}
                          {addOn.type === 'apparel' && <Shirt className="h-6 w-6 text-purple-400" />}
                          {addOn.type === 'merchandise' && <Package className="h-6 w-6 text-blue-400" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-bold text-white flex items-center gap-2">
                                {addOn.name}
                                {addOn.featured && (
                                  <span className="px-2 py-0.5 bg-neon/10 text-neon text-xs uppercase tracking-wider border border-neon/30">
                                    Popular
                                  </span>
                                )}
                              </h3>
                              <p className="text-sm text-white/50 mt-1">{addOn.description}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-neon">{formatCurrency(addOn.price_cents)}</p>
                              {addOn.compare_at_price_cents && (
                                <p className="text-xs text-white/40 line-through">
                                  {formatCurrency(addOn.compare_at_price_cents)}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Size selector for apparel */}
                          {addOn.requires_size && addOn.variants && (
                            <div className="mt-3">
                              <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">
                                Select Size
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {addOn.variants.map((variant) => (
                                  <button
                                    key={variant.id}
                                    onClick={() => setSelectedSize({ ...selectedSize, [addOn.id]: variant.id })}
                                    disabled={variant.stock === 0}
                                    className={cn(
                                      'px-3 py-1 text-xs font-medium border transition-all',
                                      selectedSize[addOn.id] === variant.id
                                        ? 'bg-neon/20 border-neon text-neon'
                                        : variant.stock === 0
                                          ? 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed'
                                          : 'bg-white/5 border-white/20 text-white/70 hover:border-white/40'
                                    )}
                                  >
                                    {variant.name}
                                    {variant.stock === 0 && ' (Sold Out)'}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="mt-3 flex justify-end">
                            <Button
                              variant="outline-neon"
                              size="sm"
                              onClick={() => addToCart(addOn, addOn.requires_size ? selectedSize[addOn.id] : undefined)}
                              disabled={addOn.requires_size && !selectedSize[addOn.id]}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add to Cart
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Concession Credits Section */}
              {activeSection === 'credits' && selectedRegistration && (
                <div className="bg-dark-100 border border-white/10 p-6">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="h-12 w-12 bg-amber-400/10 border border-amber-400/30 flex items-center justify-center">
                      <Coins className="h-6 w-6 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">Concession Credits</h3>
                      <p className="text-sm text-white/50 mt-1">
                        Add money to your camper&apos;s account for snacks, drinks, and treats at the camp concession stand.
                      </p>
                    </div>
                  </div>

                  {(() => {
                    const detail = selectedRegistration ? getCreditDetail(selectedRegistration.athlete_id, selectedRegistration.camp_id) : null
                    return detail ? (
                      <div className="mb-4 p-3 bg-amber-400/10 border border-amber-400/30 flex items-center justify-between">
                        <span className="text-sm text-amber-400 font-medium">Current Balance</span>
                        <span className="text-lg font-black text-amber-400">
                          ${(detail.balanceCents / 100).toFixed(2)}
                        </span>
                      </div>
                    ) : null
                  })()}

                  <div className="space-y-4">
                    <label className="text-xs text-white/50 uppercase tracking-wider block">
                      Select Amount
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {CREDIT_AMOUNTS.map((credit) => (
                        <button
                          key={credit.amount}
                          onClick={() => handleSetConcessionAmount(credit.amount)}
                          className={cn(
                            'py-4 text-center border font-bold transition-all',
                            concessionAmount === credit.amount && !customCreditAmount
                              ? 'bg-amber-400/20 border-amber-400 text-amber-400'
                              : 'bg-black/50 border-white/20 text-white hover:border-amber-400/50'
                          )}
                        >
                          {credit.label}
                        </button>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-white/10">
                      <label className="text-xs text-white/50 uppercase tracking-wider block mb-2">
                        Or Enter Custom Amount
                      </label>
                      <div className="relative max-w-xs">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">$</span>
                        <input
                          type="number"
                          min="1"
                          step="0.01"
                          value={customCreditAmount}
                          onChange={(e) => handleCustomCreditChange(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-black border border-white/20 text-white pl-8 pr-4 py-3 focus:border-amber-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    {concessionAmount > 0 && (
                      <div className="mt-4 p-3 bg-amber-400/10 border border-amber-400/30 flex items-center justify-between">
                        <span className="text-amber-400 font-medium">Credits to add:</span>
                        <span className="text-amber-400 font-black text-lg">
                          {formatCurrency(concessionAmount)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 p-4 bg-white/5 border border-white/10">
                    <div className="flex items-start gap-3">
                      <Sparkles className="h-5 w-5 text-neon flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-white/60">
                        <p className="font-medium text-white mb-1">Important</p>
                        <p>
                          We are a cash free camp. Please purchase concession credits for your camper.
                          Camper simply states first and last name at concession to use credits.
                          No rollover or refunds &mdash; please use credits before end of camp.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!selectedRegistration && registrations.length > 1 && (
                <div className="bg-dark-100 border border-amber-400/30 p-6 text-center">
                  <AlertCircle className="h-8 w-8 text-amber-400 mx-auto mb-3" />
                  <p className="text-white/70">Please select a registration above to continue shopping.</p>
                </div>
              )}
            </div>

            {/* Cart Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-dark-100 border border-white/10 sticky top-4">
                <div className="px-6 py-4 border-b border-orange-400/30">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-orange-400" />
                    Your Cart
                  </h2>
                </div>
                <div className="p-4">
                  {cart.length === 0 && concessionAmount === 0 ? (
                    <p className="text-center text-white/40 py-8">Your cart is empty</p>
                  ) : (
                    <div className="space-y-3">
                      {/* Cart Items */}
                      {cart.map((item, index) => (
                        <div key={`${item.addOnId}-${item.variantId}`} className="flex items-center justify-between p-2 bg-black/30 border border-white/5">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{item.name}</p>
                            {item.size && (
                              <p className="text-xs text-white/50">Size: {item.size}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <button
                              onClick={() => updateCartQuantity(index, -1)}
                              className="w-6 h-6 flex items-center justify-center text-white/50 hover:text-white border border-white/20 hover:border-white/40"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-white font-medium w-6 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateCartQuantity(index, 1)}
                              className="w-6 h-6 flex items-center justify-center text-white/50 hover:text-white border border-white/20 hover:border-white/40"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                            <span className="text-neon font-bold ml-2 min-w-[60px] text-right">
                              {formatCurrency(item.priceCents * item.quantity)}
                            </span>
                          </div>
                        </div>
                      ))}

                      {/* Concession Credits in Cart */}
                      {concessionAmount > 0 && (
                        <div className="flex items-center justify-between p-2 bg-amber-400/10 border border-amber-400/30">
                          <div className="flex items-center gap-2">
                            <Coins className="h-4 w-4 text-amber-400" />
                            <span className="text-sm font-medium text-amber-400">Concession Credits</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setConcessionAmount(0)}
                              className="text-xs text-white/50 hover:text-white"
                            >
                              Remove
                            </button>
                            <span className="text-amber-400 font-bold">
                              {formatCurrency(concessionAmount)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Total */}
                      <div className="pt-3 border-t border-white/10">
                        <div className="flex items-center justify-between">
                          <span className="text-white/60">Total</span>
                          <span className="text-xl font-black text-neon">
                            {formatCurrency(getCartTotal())}
                          </span>
                        </div>
                      </div>

                      {/* Checkout Button */}
                      <Button
                        variant="neon"
                        className="w-full mt-4"
                        onClick={handleCheckout}
                        disabled={processing || !selectedRegistration || (cart.length === 0 && concessionAmount === 0)}
                      >
                        {processing ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <CreditCard className="h-4 w-4 mr-2" />
                        )}
                        {processing ? 'Processing...' : 'Checkout'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
