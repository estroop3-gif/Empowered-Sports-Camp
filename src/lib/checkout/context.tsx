'use client'

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  useEffect,
  ReactNode,
} from 'react'
import type {
  CheckoutState,
  CheckoutStep,
  CampSession,
  CamperFormData,
  ParentFormData,
  SelectedAddOn,
  AppliedPromoCode,
  CheckoutTotals,
  AddOn,
} from '@/types/registration'

// Type for existing athlete data from the user's profile
export interface ExistingAthlete {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string
  gender: string | null
  grade: string | null
  tshirt_size: string | null
  medical_notes: string | null
  allergies: string | null
}

// Type for parent profile data
export interface ParentProfile {
  first_name: string | null
  last_name: string | null
  email: string
  phone: string | null
  address_line_1: string | null
  address_line_2: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_relationship: string | null
}

/**
 * CHECKOUT CONTEXT
 *
 * Manages state across the multi-step registration flow.
 * Handles campers, add-ons, promo codes, and totals calculation.
 */

// =====================================================
// INITIAL STATE
// =====================================================

const createInitialCamper = (): CamperFormData => ({
  id: crypto.randomUUID(),
  existingAthleteId: null,
  isNewAthlete: true, // Default to new athlete mode
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  grade: '',
  sex: 'female', // Fixed: Females-only camp
  tshirtSize: '',
  medicalNotes: '',
  allergies: '',
  specialConsiderations: '',
  authorizedPickups: [{ name: '', relationship: '', phone: '' }],
  age: null,
  isEligible: false,
})

const initialParentInfo: ParentFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelationship: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  zipCode: '',
}

const initialTotals: CheckoutTotals = {
  campSubtotal: 0,
  addOnsSubtotal: 0,
  siblingDiscount: 0,
  promoDiscount: 0,
  subtotal: 0,
  tax: 0,
  total: 0,
}

const initialState: CheckoutState = {
  step: 'camp',
  campSession: null,
  campers: [createInitialCamper()],
  parentInfo: initialParentInfo,
  selectedAddOns: [],
  promoCode: null,
  totals: initialTotals,
  squadId: null,
  isWaitlistMode: false,
}

// =====================================================
// ACTIONS
// =====================================================

type CheckoutAction =
  | { type: 'SET_STEP'; step: CheckoutStep }
  | { type: 'SET_CAMP'; camp: CampSession }
  | { type: 'ADD_CAMPER' }
  | { type: 'REMOVE_CAMPER'; camperId: string }
  | { type: 'UPDATE_CAMPER'; camperId: string; data: Partial<CamperFormData> }
  | { type: 'SELECT_EXISTING_ATHLETE'; camperId: string; athlete: ExistingAthlete }
  | { type: 'SET_NEW_ATHLETE_MODE'; camperId: string }
  | { type: 'UPDATE_PARENT'; data: Partial<ParentFormData> }
  | { type: 'SET_PARENT_FROM_PROFILE'; profile: ParentProfile }
  | { type: 'SET_SQUAD'; squadId: string | null }
  | { type: 'ADD_ADDON'; addon: SelectedAddOn }
  | { type: 'REMOVE_ADDON'; addonId: string; variantId: string | null; camperId: string | null }
  | { type: 'UPDATE_ADDON_QUANTITY'; addonId: string; variantId: string | null; camperId: string | null; quantity: number }
  | { type: 'APPLY_PROMO'; promo: AppliedPromoCode }
  | { type: 'REMOVE_PROMO' }
  | { type: 'SET_WAITLIST_MODE'; isWaitlistMode: boolean }
  | { type: 'RESET' }

// =====================================================
// REDUCER
// =====================================================

function checkoutReducer(state: CheckoutState, action: CheckoutAction): CheckoutState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.step }

    case 'SET_CAMP':
      // Only reset add-ons when the camp actually changes (different ID)
      // Re-setting the same camp (e.g., after auth refresh) should preserve add-ons
      if (state.campSession?.id === action.camp.id) {
        return { ...state, campSession: action.camp }
      }
      return {
        ...state,
        campSession: action.camp,
        selectedAddOns: [],
      }

    case 'ADD_CAMPER':
      return {
        ...state,
        campers: [...state.campers, createInitialCamper()],
      }

    case 'REMOVE_CAMPER':
      if (state.campers.length <= 1) return state
      return {
        ...state,
        campers: state.campers.filter((c) => c.id !== action.camperId),
        // Remove add-ons for this camper
        selectedAddOns: state.selectedAddOns.filter(
          (a) => a.camperId !== action.camperId
        ),
      }

    case 'UPDATE_CAMPER': {
      const camperIndex = state.campers.findIndex((c) => c.id === action.camperId)
      if (camperIndex === -1) return state

      const updatedCamper = {
        ...state.campers[camperIndex],
        ...action.data,
      }

      // Calculate age if DOB changed
      if (action.data.dateOfBirth) {
        const dob = new Date(action.data.dateOfBirth)
        const today = new Date()
        let age = today.getFullYear() - dob.getFullYear()
        const monthDiff = today.getMonth() - dob.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age--
        }
        updatedCamper.age = age

        // Check eligibility
        if (state.campSession) {
          updatedCamper.isEligible =
            age >= state.campSession.minAge && age <= state.campSession.maxAge
        }
      }

      const newCampers = [...state.campers]
      newCampers[camperIndex] = updatedCamper

      return { ...state, campers: newCampers }
    }

    case 'SELECT_EXISTING_ATHLETE': {
      const camperIndex = state.campers.findIndex((c) => c.id === action.camperId)
      if (camperIndex === -1) return state

      // Calculate age from DOB
      const dob = new Date(action.athlete.date_of_birth)
      const today = new Date()
      let age = today.getFullYear() - dob.getFullYear()
      const monthDiff = today.getMonth() - dob.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--
      }

      // Check eligibility
      let isEligible = false
      if (state.campSession) {
        isEligible = age >= state.campSession.minAge && age <= state.campSession.maxAge
      }

      const updatedCamper: CamperFormData = {
        ...state.campers[camperIndex],
        existingAthleteId: action.athlete.id,
        isNewAthlete: false,
        firstName: action.athlete.first_name,
        lastName: action.athlete.last_name,
        dateOfBirth: action.athlete.date_of_birth,
        grade: action.athlete.grade || '',
        sex: 'female',
        tshirtSize: (action.athlete.tshirt_size as CamperFormData['tshirtSize']) || '',
        medicalNotes: action.athlete.medical_notes || '',
        allergies: action.athlete.allergies || '',
        specialConsiderations: '',
        age,
        isEligible,
      }

      const updatedCampers = [...state.campers]
      updatedCampers[camperIndex] = updatedCamper

      return { ...state, campers: updatedCampers }
    }

    case 'SET_NEW_ATHLETE_MODE': {
      const camperIndex = state.campers.findIndex((c) => c.id === action.camperId)
      if (camperIndex === -1) return state

      const clearedCamper: CamperFormData = {
        ...createInitialCamper(),
        id: state.campers[camperIndex].id, // Keep the same ID
      }

      const updatedCampers = [...state.campers]
      updatedCampers[camperIndex] = clearedCamper

      return { ...state, campers: updatedCampers }
    }

    case 'UPDATE_PARENT':
      return {
        ...state,
        parentInfo: { ...state.parentInfo, ...action.data },
      }

    case 'SET_PARENT_FROM_PROFILE':
      return {
        ...state,
        parentInfo: {
          ...state.parentInfo,
          firstName: action.profile.first_name || '',
          lastName: action.profile.last_name || '',
          email: action.profile.email || '',
          phone: action.profile.phone || '',
          emergencyContactName: action.profile.emergency_contact_name || '',
          emergencyContactPhone: action.profile.emergency_contact_phone || '',
          emergencyContactRelationship: action.profile.emergency_contact_relationship || '',
          addressLine1: action.profile.address_line_1 || '',
          addressLine2: action.profile.address_line_2 || '',
          city: action.profile.city || '',
          state: action.profile.state || '',
          zipCode: action.profile.zip_code || '',
        },
      }

    case 'SET_SQUAD':
      return {
        ...state,
        squadId: action.squadId,
      }

    case 'ADD_ADDON': {
      // Check if this addon already exists
      const existingIndex = state.selectedAddOns.findIndex(
        (a) =>
          a.addonId === action.addon.addonId &&
          a.variantId === action.addon.variantId &&
          a.camperId === action.addon.camperId
      )

      if (existingIndex !== -1) {
        // Update quantity
        const newAddOns = [...state.selectedAddOns]
        newAddOns[existingIndex] = {
          ...newAddOns[existingIndex],
          quantity: newAddOns[existingIndex].quantity + action.addon.quantity,
        }
        return { ...state, selectedAddOns: newAddOns }
      }

      return {
        ...state,
        selectedAddOns: [...state.selectedAddOns, action.addon],
      }
    }

    case 'REMOVE_ADDON':
      return {
        ...state,
        selectedAddOns: state.selectedAddOns.filter(
          (a) =>
            !(
              a.addonId === action.addonId &&
              a.variantId === action.variantId &&
              a.camperId === action.camperId
            )
        ),
      }

    case 'UPDATE_ADDON_QUANTITY': {
      if (action.quantity <= 0) {
        return {
          ...state,
          selectedAddOns: state.selectedAddOns.filter(
            (a) =>
              !(
                a.addonId === action.addonId &&
                a.variantId === action.variantId &&
                a.camperId === action.camperId
              )
          ),
        }
      }

      return {
        ...state,
        selectedAddOns: state.selectedAddOns.map((a) =>
          a.addonId === action.addonId &&
          a.variantId === action.variantId &&
          a.camperId === action.camperId
            ? { ...a, quantity: action.quantity }
            : a
        ),
      }
    }

    case 'APPLY_PROMO':
      return { ...state, promoCode: action.promo }

    case 'REMOVE_PROMO':
      return { ...state, promoCode: null }

    case 'SET_WAITLIST_MODE':
      return { ...state, isWaitlistMode: action.isWaitlistMode }

    case 'RESET':
      return initialState

    default:
      return state
  }
}

// =====================================================
// CONTEXT
// =====================================================

interface CheckoutContextValue {
  state: CheckoutState
  totals: CheckoutTotals

  // Navigation
  setStep: (step: CheckoutStep) => void
  nextStep: () => void
  prevStep: () => void
  canProceed: () => boolean

  // Camp
  setCamp: (camp: CampSession) => void

  // Campers
  addCamper: () => void
  removeCamper: (camperId: string) => void
  updateCamper: (camperId: string, data: Partial<CamperFormData>) => void
  selectExistingAthlete: (camperId: string, athlete: ExistingAthlete) => void
  setNewAthleteMode: (camperId: string) => void

  // Parent
  updateParent: (data: Partial<ParentFormData>) => void
  setParentFromProfile: (profile: ParentProfile) => void

  // Squad
  setSquad: (squadId: string | null) => void

  // Add-ons
  addAddOn: (addon: SelectedAddOn) => void
  removeAddOn: (addonId: string, variantId: string | null, camperId: string | null) => void
  updateAddOnQuantity: (
    addonId: string,
    variantId: string | null,
    camperId: string | null,
    quantity: number
  ) => void
  getAddOnQuantity: (
    addonId: string,
    variantId: string | null,
    camperId: string | null
  ) => number

  // Promo
  applyPromo: (promo: AppliedPromoCode) => void
  removePromo: () => void

  // Waitlist
  setWaitlistMode: (isWaitlistMode: boolean) => void

  // Reset
  reset: () => void
}

const CheckoutContext = createContext<CheckoutContextValue | undefined>(undefined)

// =====================================================
// PROVIDER
// =====================================================

const STEP_ORDER: CheckoutStep[] = ['camp', 'campers', 'squad', 'addons', 'waivers', 'account', 'payment', 'confirmation']
const WAITLIST_STEP_ORDER: CheckoutStep[] = ['camp', 'campers', 'squad', 'waivers', 'account', 'waitlist-confirm']

// Storage key for checkout state
const CHECKOUT_STORAGE_KEY = 'empowered-checkout-state'

// Load state from localStorage
function loadPersistedState(): CheckoutState | null {
  if (typeof window === 'undefined') return null
  try {
    const saved = localStorage.getItem(CHECKOUT_STORAGE_KEY)
    if (!saved) return null

    const parsed = JSON.parse(saved)

    // Check if the saved state is expired (older than 24 hours)
    if (parsed._savedAt) {
      const savedAt = new Date(parsed._savedAt).getTime()
      const now = Date.now()
      const hoursSinceSave = (now - savedAt) / (1000 * 60 * 60)
      if (hoursSinceSave > 24) {
        localStorage.removeItem(CHECKOUT_STORAGE_KEY)
        return null
      }
    }

    // Remove metadata before returning
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _savedAt, ...state } = parsed
    return state as CheckoutState
  } catch (e) {
    console.error('[Checkout] Failed to load persisted state:', e)
    return null
  }
}

// Save state to localStorage
function persistState(state: CheckoutState) {
  if (typeof window === 'undefined') return
  try {
    // Don't persist if we're on the confirmation/waitlist-confirm step (checkout complete)
    if (state.step === 'confirmation' || state.step === 'waitlist-confirm') {
      localStorage.removeItem(CHECKOUT_STORAGE_KEY)
      return
    }

    const toSave = {
      ...state,
      _savedAt: new Date().toISOString(),
    }
    localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(toSave))
  } catch (e) {
    console.error('[Checkout] Failed to persist state:', e)
  }
}

interface CheckoutProviderProps {
  children: ReactNode
  campSlug?: string // Pass the current camp slug to validate persisted state
}

export function CheckoutProvider({ children, campSlug }: CheckoutProviderProps) {
  // Initialize with persisted state if available and matches current camp
  const [state, dispatch] = useReducer(
    checkoutReducer,
    initialState,
    (initial) => {
      const persisted = loadPersistedState()
      if (!persisted) return initial

      // If we have a campSlug and the persisted state is for a different camp, start fresh
      if (campSlug && persisted.campSession?.slug && persisted.campSession.slug !== campSlug) {
        console.log('[Checkout] Persisted state is for different camp, starting fresh')
        localStorage.removeItem(CHECKOUT_STORAGE_KEY)
        return initial
      }

      return persisted
    }
  )

  // Persist state changes to localStorage
  useEffect(() => {
    persistState(state)
  }, [state])

  // Calculate totals
  const totals = useMemo((): CheckoutTotals => {
    if (!state.campSession) {
      return initialTotals
    }

    const campPrice = state.campSession.isEarlyBird && state.campSession.earlyBirdPrice
      ? state.campSession.earlyBirdPrice
      : state.campSession.price

    const numCampers = state.campers.length
    const campSubtotal = campPrice * numCampers

    // Sibling discount (applies to 2nd+ campers)
    const siblingDiscount =
      numCampers > 1
        ? Math.round(campPrice * (numCampers - 1) * (state.campSession.siblingDiscountPercent / 100))
        : 0

    // Add-ons subtotal
    const addOnsSubtotal = state.selectedAddOns.reduce(
      (sum, addon) => sum + addon.unitPrice * addon.quantity,
      0
    )

    const subtotalBeforePromo = campSubtotal - siblingDiscount + addOnsSubtotal

    // Promo discount (scoped by appliesTo)
    let promoDiscount = 0
    if (state.promoCode) {
      const appliesTo = state.promoCode.appliesTo || 'both'
      let eligible = 0
      if (appliesTo === 'registration' || appliesTo === 'both') eligible += (campSubtotal - siblingDiscount)
      if (appliesTo === 'addons' || appliesTo === 'both') eligible += addOnsSubtotal
      promoDiscount = state.promoCode.discountType === 'percent'
        ? Math.round(eligible * (state.promoCode.discountValue / 100))
        : Math.min(state.promoCode.discountValue, eligible)
    }

    const subtotal = subtotalBeforePromo - promoDiscount
    const tax = 0 // Camps typically tax-exempt

    return {
      campSubtotal,
      addOnsSubtotal,
      siblingDiscount,
      promoDiscount,
      subtotal,
      tax,
      total: subtotal + tax,
    }
  }, [state.campSession, state.campers, state.selectedAddOns, state.promoCode])

  // Scroll to top helper - scroll after DOM updates for step transitions
  const scrollToTop = useCallback(() => {
    if (typeof window !== 'undefined') {
      // Use requestAnimationFrame to ensure scroll happens after React renders new content
      requestAnimationFrame(() => {
        window.scrollTo(0, 0)
        // Also scroll document element as fallback for different browsers
        document.documentElement.scrollTop = 0
        document.body.scrollTop = 0
      })
    }
  }, [])

  // Navigation
  const setStep = useCallback((step: CheckoutStep) => {
    dispatch({ type: 'SET_STEP', step })
    scrollToTop()
  }, [scrollToTop])

  const nextStep = useCallback(() => {
    const order = state.isWaitlistMode ? WAITLIST_STEP_ORDER : STEP_ORDER
    const currentIndex = order.indexOf(state.step)
    if (currentIndex < order.length - 1) {
      dispatch({ type: 'SET_STEP', step: order[currentIndex + 1] })
      scrollToTop()
    }
  }, [state.step, state.isWaitlistMode, scrollToTop])

  const prevStep = useCallback(() => {
    const order = state.isWaitlistMode ? WAITLIST_STEP_ORDER : STEP_ORDER
    const currentIndex = order.indexOf(state.step)
    if (currentIndex > 0) {
      dispatch({ type: 'SET_STEP', step: order[currentIndex - 1] })
      scrollToTop()
    }
  }, [state.step, state.isWaitlistMode, scrollToTop])

  const canProceed = useCallback((): boolean => {
    switch (state.step) {
      case 'camp':
        return state.campSession !== null && (state.isWaitlistMode || state.campSession.spotsRemaining > 0)

      case 'campers':
        return (
          state.campers.every(
            (c) =>
              c.firstName.trim() !== '' &&
              c.lastName.trim() !== '' &&
              c.dateOfBirth !== '' &&
              c.isEligible &&
              // At least one authorized pickup with name + phone
              (c.authorizedPickups || []).length > 0 &&
              (c.authorizedPickups || []).some(
                (p) => p.name.trim() !== '' && p.phone.trim() !== ''
              )
          ) &&
          state.parentInfo.firstName.trim() !== '' &&
          state.parentInfo.lastName.trim() !== '' &&
          state.parentInfo.email.trim() !== '' &&
          state.parentInfo.phone.trim() !== '' &&
          // Emergency contact required
          state.parentInfo.emergencyContactName.trim() !== '' &&
          state.parentInfo.emergencyContactPhone.trim() !== '' &&
          state.parentInfo.emergencyContactRelationship.trim() !== ''
        )

      case 'squad':
        return true // Squad is optional

      case 'addons':
        return true // Add-ons are optional

      case 'payment':
        return true // Payment validation handled by Stripe

      default:
        return false
    }
  }, [state])

  // Camp
  const setCamp = useCallback((camp: CampSession) => {
    dispatch({ type: 'SET_CAMP', camp })
  }, [])

  // Campers
  const addCamper = useCallback(() => {
    dispatch({ type: 'ADD_CAMPER' })
  }, [])

  const removeCamper = useCallback((camperId: string) => {
    dispatch({ type: 'REMOVE_CAMPER', camperId })
  }, [])

  const updateCamper = useCallback(
    (camperId: string, data: Partial<CamperFormData>) => {
      dispatch({ type: 'UPDATE_CAMPER', camperId, data })
    },
    []
  )

  const selectExistingAthlete = useCallback(
    (camperId: string, athlete: ExistingAthlete) => {
      dispatch({ type: 'SELECT_EXISTING_ATHLETE', camperId, athlete })
    },
    []
  )

  const setNewAthleteMode = useCallback((camperId: string) => {
    dispatch({ type: 'SET_NEW_ATHLETE_MODE', camperId })
  }, [])

  // Parent
  const updateParent = useCallback((data: Partial<ParentFormData>) => {
    dispatch({ type: 'UPDATE_PARENT', data })
  }, [])

  const setParentFromProfile = useCallback((profile: ParentProfile) => {
    dispatch({ type: 'SET_PARENT_FROM_PROFILE', profile })
  }, [])

  // Squad
  const setSquad = useCallback((squadId: string | null) => {
    dispatch({ type: 'SET_SQUAD', squadId })
  }, [])

  // Add-ons
  const addAddOn = useCallback((addon: SelectedAddOn) => {
    dispatch({ type: 'ADD_ADDON', addon })
  }, [])

  const removeAddOn = useCallback(
    (addonId: string, variantId: string | null, camperId: string | null) => {
      dispatch({ type: 'REMOVE_ADDON', addonId, variantId, camperId })
    },
    []
  )

  const updateAddOnQuantity = useCallback(
    (
      addonId: string,
      variantId: string | null,
      camperId: string | null,
      quantity: number
    ) => {
      dispatch({ type: 'UPDATE_ADDON_QUANTITY', addonId, variantId, camperId, quantity })
    },
    []
  )

  const getAddOnQuantity = useCallback(
    (addonId: string, variantId: string | null, camperId: string | null): number => {
      const addon = state.selectedAddOns.find(
        (a) =>
          a.addonId === addonId &&
          a.variantId === variantId &&
          a.camperId === camperId
      )
      return addon?.quantity ?? 0
    },
    [state.selectedAddOns]
  )

  // Promo
  const applyPromo = useCallback((promo: AppliedPromoCode) => {
    dispatch({ type: 'APPLY_PROMO', promo })
  }, [])

  const removePromo = useCallback(() => {
    dispatch({ type: 'REMOVE_PROMO' })
  }, [])

  // Waitlist
  const setWaitlistMode = useCallback((isWaitlistMode: boolean) => {
    dispatch({ type: 'SET_WAITLIST_MODE', isWaitlistMode })
  }, [])

  // Reset
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
    // Clear persisted state
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CHECKOUT_STORAGE_KEY)
    }
  }, [])

  const value: CheckoutContextValue = {
    state,
    totals,
    setStep,
    nextStep,
    prevStep,
    canProceed,
    setCamp,
    addCamper,
    removeCamper,
    updateCamper,
    selectExistingAthlete,
    setNewAthleteMode,
    updateParent,
    setParentFromProfile,
    setSquad,
    addAddOn,
    removeAddOn,
    updateAddOnQuantity,
    getAddOnQuantity,
    applyPromo,
    removePromo,
    setWaitlistMode,
    reset,
  }

  return (
    <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>
  )
}

// =====================================================
// HOOK
// =====================================================

export function useCheckout() {
  const context = useContext(CheckoutContext)
  if (!context) {
    throw new Error('useCheckout must be used within a CheckoutProvider')
  }
  return context
}
