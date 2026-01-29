/**
 * EMPOWERED ATHLETES - REGISTRATION TYPES
 *
 * Type definitions for the camper registration and checkout flow.
 * These types support the multi-step registration, upsell engine,
 * and payment processing.
 */

// =====================================================
// CAMP SESSION TYPES
// =====================================================

export interface CampSession {
  id: string
  slug: string
  name: string
  description: string | null
  programType: ProgramType
  locationId: string | null
  location: CampLocation | null

  // Dates
  startDate: string // ISO date
  endDate: string
  dailyStartTime: string // HH:MM
  dailyEndTime: string

  // Age requirements
  minAge: number
  maxAge: number

  // Capacity
  maxCapacity: number
  spotsRemaining: number

  // Pricing (in cents)
  price: number
  earlyBirdPrice: number | null
  earlyBirdDeadline: string | null
  siblingDiscountPercent: number

  // Extended care (in cents)
  beforeCarePrice: number
  afterCarePrice: number
  beforeCareStart: string | null
  afterCareEnd: string | null

  // Content
  imageUrl: string | null
  highlights: string[]
  sportsOffered: string[]

  // Status
  isEarlyBird: boolean
  isFull: boolean

  // Tenant
  tenantId: string
}

export type ProgramType =
  | 'all_girls_sports_camp'
  | 'cit_program'
  | 'soccer_strength'
  | 'basketball_intensive'
  | 'volleyball_clinic'
  | 'specialty_camp'

export interface CampLocation {
  id: string
  name: string
  addressLine1: string
  addressLine2: string | null
  city: string
  state: string
  zipCode: string
  latitude: number | null
  longitude: number | null
}

// =====================================================
// ADD-ON / MERCHANDISE TYPES
// =====================================================

export type AddOnType = 'fuel_pack' | 'apparel' | 'merchandise' | 'digital' | 'service'
export type AddOnScope = 'per_camper' | 'per_order'

export interface AddOn {
  id: string
  tenantId: string
  name: string
  slug: string
  description: string | null
  hypeCopy: string | null
  addonType: AddOnType
  scope: AddOnScope
  price: number // cents
  compareAtPrice: number | null
  imageUrl: string | null
  displayOrder: number
  featured: boolean
  variants: AddOnVariant[]
}

export interface AddOnVariant {
  id: string
  addonId: string
  name: string // "Youth Small", "Adult Large"
  sku: string | null
  priceOverride: number | null
  inventoryQuantity: number
  lowStockThreshold: number
  allowBackorder: boolean
  isLowStock: boolean
  isSoldOut: boolean
}

// =====================================================
// CART / CHECKOUT TYPES
// =====================================================

export interface CheckoutState {
  step: CheckoutStep
  campSession: CampSession | null
  campers: CamperFormData[]
  parentInfo: ParentFormData
  selectedAddOns: SelectedAddOn[]
  promoCode: AppliedPromoCode | null
  totals: CheckoutTotals
  squadId: string | null // "Build Her Squad" feature
}

export type CheckoutStep = 'camp' | 'campers' | 'squad' | 'addons' | 'waivers' | 'account' | 'payment' | 'confirmation'

export interface CamperFormData {
  id: string // Temporary client-side ID
  existingAthleteId: string | null // Links to existing athlete record
  isNewAthlete: boolean // Whether this is a new athlete or using existing
  firstName: string
  lastName: string
  dateOfBirth: string // YYYY-MM-DD
  grade: string
  sex: 'female' // Fixed: Females-only camp
  tshirtSize: TShirtSize
  medicalNotes: string
  allergies: string
  specialConsiderations: string
  // Calculated
  age: number | null
  isEligible: boolean
}

export type TShirtSize = 'YXS' | 'YS' | 'YM' | 'YL' | 'AS' | 'AM' | 'AL' | 'AXL' | ''

export interface ParentFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  emergencyContactName: string
  emergencyContactPhone: string
  emergencyContactRelationship: string
  // Address (for billing)
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  zipCode: string
}

export interface SelectedAddOn {
  addonId: string
  variantId: string | null
  camperId: string | null // For per-camper add-ons
  quantity: number
  unitPrice: number
}

export interface AppliedPromoCode {
  id: string
  code: string
  discountType: 'percent' | 'fixed'
  discountValue: number
  discountAmount: number // Calculated
  appliesTo: 'registration' | 'addons' | 'both'
}

export interface CheckoutTotals {
  campSubtotal: number
  addOnsSubtotal: number
  siblingDiscount: number
  promoDiscount: number
  subtotal: number
  tax: number // Usually 0 for camps
  total: number
}

// =====================================================
// REGISTRATION PAYLOAD (for API submission)
// =====================================================

export interface RegistrationPayload {
  campId: string
  tenantId: string
  parent: ParentFormData
  campers: CamperFormData[]
  addOns: SelectedAddOn[]
  promoCode: string | null
  paymentIntentId: string
  totals: CheckoutTotals
}

export interface RegistrationResult {
  success: boolean
  registrationIds: string[]
  confirmationNumber: string
  error?: string
}

// =====================================================
// FORM VALIDATION
// =====================================================

export interface FormErrors {
  [field: string]: string | undefined
}

export interface CamperValidation {
  isValid: boolean
  errors: FormErrors
  ageErrors: string | null
}

export interface ParentValidation {
  isValid: boolean
  errors: FormErrors
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface CampWithAddOns {
  camp: CampSession
  addOns: AddOn[]
}

export interface CreatePaymentIntentResponse {
  clientSecret: string
  paymentIntentId: string
}
