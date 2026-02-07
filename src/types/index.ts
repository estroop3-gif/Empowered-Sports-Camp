// Database types - defined manually based on our schema

export type UserRole = 'parent' | 'coach' | 'admin' | 'super_admin'
export type RegistrationStatus = 'pending' | 'confirmed' | 'cancelled' | 'refunded'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'
export type SessionStatus = 'draft' | 'published' | 'cancelled' | 'completed'

export interface Profile {
  id: string
  email: string
  role: UserRole
  first_name: string | null
  last_name: string | null
  phone: string | null
  created_at: string
  updated_at: string
}

export interface ParentProfile {
  id: string
  user_id: string
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_relation: string | null
  how_heard_about_us: string | null
  created_at: string
  updated_at: string
}

export interface AthleteProfile {
  id: string
  parent_id: string
  first_name: string
  last_name: string
  date_of_birth: string
  gender: string | null
  school: string | null
  grade: string | null
  shirt_size: string | null
  allergies: string | null
  medical_conditions: string | null
  medications: string | null
  special_needs: string | null
  photo_url: string | null
  created_at: string
  updated_at: string
}

export interface Location {
  id: string
  name: string
  address_line1: string
  address_line2: string | null
  city: string
  state: string
  zip_code: string
  latitude: number | null
  longitude: number | null
  description: string | null
  amenities: string[] | null
  parking_info: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProgramType {
  id: string
  name: string
  slug: string
  description: string | null
  short_description: string | null
  min_age: number
  max_age: number
  sports: string[] | null
  highlights: string[] | null
  what_to_bring: string[] | null
  image_url: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CampSession {
  id: string
  program_type_id: string
  location_id: string
  name: string
  slug: string
  start_date: string
  end_date: string
  daily_start_time: string
  daily_end_time: string
  capacity: number
  enrolled_count: number
  waitlist_count: number
  price_cents: number
  early_bird_price_cents: number | null
  early_bird_deadline: string | null
  status: SessionStatus
  registration_opens_at: string | null
  registration_closes_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Joined data
  program_type?: ProgramType
  location?: Location
}

export interface Registration {
  id: string
  athlete_id: string
  session_id: string
  parent_id: string
  status: RegistrationStatus
  amount_cents: number
  discount_code_id: string | null
  discount_amount_cents: number
  stripe_payment_intent_id: string | null
  registered_at: string
  cancelled_at: string | null
  cancellation_reason: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Joined data
  athlete?: AthleteProfile
  session?: CampSession
}

export interface Payment {
  id: string
  registration_id: string
  amount_cents: number
  status: PaymentStatus
  stripe_payment_intent_id: string | null
  stripe_charge_id: string | null
  payment_method: string | null
  receipt_url: string | null
  paid_at: string | null
  refunded_at: string | null
  refund_amount_cents: number | null
  created_at: string
  updated_at: string
}

export interface DiscountCode {
  id: string
  code: string
  description: string | null
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  max_uses: number | null
  current_uses: number
  min_purchase_cents: number | null
  valid_from: string | null
  valid_until: string | null
  applicable_program_types: string[] | null
  applicable_sessions: string[] | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface WaiverTemplate {
  id: string
  name: string
  content: string
  version: number
  is_required: boolean
  is_active: boolean
  applicable_program_types: string[] | null
  created_at: string
  updated_at: string
}

export interface SignedWaiver {
  id: string
  registration_id: string
  waiver_template_id: string
  signer_name: string
  signer_email: string
  signer_ip: string | null
  signature_data: string | null
  signed_at: string
  created_at: string
}

export interface WaitlistEntry {
  id: string
  athlete_id: string
  session_id: string
  parent_id: string
  position: number
  notified_at: string | null
  expires_at: string | null
  converted_to_registration_id: string | null
  created_at: string
}

export interface StaffProfile {
  id: string
  user_id: string
  title: string | null
  bio: string | null
  certifications: string[] | null
  photo_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined
  profile?: Profile
}

export interface StaffAssignment {
  id: string
  staff_id: string
  session_id: string
  role: 'lead_coach' | 'assistant_coach' | 'coordinator'
  notes: string | null
  created_at: string
  // Joined
  staff?: StaffProfile
  session?: CampSession
}

// UI Helper Types
export interface CampCardData {
  id: string
  slug: string
  name: string
  programType: string
  location: string
  city: string
  state: string
  startDate: string
  endDate: string
  minAge: number
  maxAge: number
  price: number
  spotsLeft: number
  imageUrl: string | null
}

export interface FilterOptions {
  location?: string
  minAge?: number
  maxAge?: number
  startDate?: string
  endDate?: string
  programType?: string
}

// ============================================================================
// VENUE-GROUPED CAMP TYPES (for zip code search)
// ============================================================================

export interface CampProgramData {
  id: string
  slug: string
  name: string
  programType: string
  programTypeName: string
  startDate: string
  endDate: string
  dailyStartTime: string | null
  dailyEndTime: string | null
  minAge: number
  maxAge: number
  price: number // cents
  currentPrice: number // cents
  earlyBirdPrice: number | null
  earlyBirdDeadline: string | null
  sportsOffered: string[]
  spotsRemaining: number
  maxCapacity: number
  isFull: boolean
  status: string
}

export interface VenueGroupData {
  venueId: string | null
  venueName: string
  territoryName: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  distanceMiles: number | null
  latitude: number | null
  longitude: number | null
  programs: CampProgramData[]
}

export interface NearZipSearchResult {
  venues: VenueGroupData[]
  total: number
  searchedLocation: {
    zip: string
    city: string
    state: string
    latitude: number
    longitude: number
  }
}

// ============================================================================
// PROGRAM-TYPE GROUPED CAMP TYPES (for redesigned /camps page)
// ============================================================================

export type CampBadge = 'MOST POPULAR' | 'NEW!' | 'EARLY BIRD' | null

export interface CampListingItem {
  id: string
  slug: string
  name: string
  programType: string
  programTypeName: string
  venueName: string
  venueCity: string | null
  venueState: string | null
  venueCountry: string | null
  distanceMiles: number | null
  startDate: string
  endDate: string
  dailyStartTime: string | null
  dailyEndTime: string | null
  minAge: number
  maxAge: number
  price: number // cents
  currentPrice: number // cents
  earlyBirdPrice: number | null
  earlyBirdDeadline: string | null
  sportsOffered: string[]
  highlights: string[]
  spotsRemaining: number
  maxCapacity: number
  isFull: boolean
  featured: boolean
  status: string
  createdAt: string
  desirabilityScore: number
  fillRate: number
  badge: CampBadge
  flag: string | null
  isOvernight: boolean
  dropoffTime: string | null
  pickupTime: string | null
}

export interface ProgramTypeSection {
  slug: string
  name: string
  sortOrder: number
  campCount: number
  nearestDistanceMiles: number | null
  camps: CampListingItem[]
}

export interface ProgramTypeGroupedResult {
  sections: ProgramTypeSection[]
  totalCamps: number
  searchedLocation?: {
    zip: string
    city: string
    state: string
    latitude: number
    longitude: number
  } | null
}
