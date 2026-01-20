/**
 * Shop Utilities (Client-safe)
 *
 * Types, constants, and utility functions that can be used
 * in both client and server components.
 */

// ============================================================================
// TYPES (snake_case to match page expectations)
// ============================================================================

export interface ShopProduct {
  id: string
  licensee_id: string | null
  name: string
  slug: string
  description: string | null
  category: 'apparel' | 'gear' | 'digital' | 'addons'
  tags: string[]
  price_cents: number
  currency: string
  image_url: string | null
  is_active: boolean
  is_featured: boolean
  stripe_product_id: string | null
  stripe_price_id: string | null
  inventory_quantity: number | null
  created_at: string
  updated_at: string
  variants?: ShopProductVariant[]
  licensee?: { id: string; name: string } | null
}

export interface ShopProductVariant {
  id: string
  product_id: string
  name: string
  sku: string | null
  price_cents: number | null
  inventory_quantity: number | null
  stripe_price_id: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ShopOrder {
  id: string
  profile_id: string | null
  licensee_id: string | null
  stripe_checkout_session_id: string | null
  stripe_payment_intent_id: string | null
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'failed' | 'cancelled' | 'refunded'
  subtotal_cents: number
  tax_cents: number
  shipping_cents: number
  total_cents: number
  currency: string
  shipping_address: Record<string, unknown> | null
  customer_name: string | null
  customer_email: string | null
  notes: string | null
  created_at: string
  updated_at: string
  items?: ShopOrderItem[]
  profile?: { id: string; email: string; first_name: string | null; last_name: string | null } | null
}

export interface ShopOrderItem {
  id: string
  order_id: string
  product_id: string
  variant_id: string | null
  quantity: number
  unit_price_cents: number
  total_price_cents: number
  product_name: string
  variant_name: string | null
  created_at: string
  updated_at: string
}

export interface ShopSettings {
  id: string
  key: string
  value: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CartItem {
  product_id: string
  variant_id: string | null
  quantity: number
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const CATEGORY_LABELS: Record<string, string> = {
  apparel: 'Player Gear',
  gear: 'Camp Essentials',
  digital: 'Coach & Director Tools',
  addons: 'Extras & Add-ons',
}

export const CATEGORY_OPTIONS = [
  { value: 'apparel', label: 'Player Gear (Apparel)' },
  { value: 'gear', label: 'Camp Essentials (Gear)' },
  { value: 'digital', label: 'Coach & Director Tools (Digital)' },
  { value: 'addons', label: 'Extras & Add-ons' },
]

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format price in cents to display string
 */
export function formatPrice(cents: number, currency: string = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

/**
 * Generate a URL-safe slug from a name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
