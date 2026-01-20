/**
 * Shop Types
 *
 * Shared types for shop functionality that can be used
 * in both client and server components.
 * NOTE: These types must match the services/shop.ts interfaces (snake_case)
 */

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

export type ShopCategory = 'apparel' | 'gear' | 'digital' | 'addons'
export type OrderStatus = 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'failed' | 'cancelled' | 'refunded'
