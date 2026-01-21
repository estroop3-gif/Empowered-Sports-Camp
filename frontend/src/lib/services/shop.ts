/**
 * Shop Services
 *
 * Prisma-based queries for the Empowered Locker shop.
 * Handles products, variants, orders, and shop settings.
 */

import prisma from '@/lib/db/client'
import { Prisma, ShopCategory, OrderStatus } from '@/generated/prisma'

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

// Category display names
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
// TRANSFORM FUNCTIONS
// ============================================================================

type PrismaProduct = Prisma.ShopProductGetPayload<{
  include: { variants: true; licensee: { select: { id: true; name: true } } }
}>

type PrismaOrder = Prisma.ShopOrderGetPayload<{
  include: { items: true; profile: { select: { id: true; email: true; firstName: true; lastName: true } } }
}>

function transformProduct(product: PrismaProduct): ShopProduct {
  return {
    id: product.id,
    licensee_id: product.licenseeId,
    name: product.name,
    slug: product.slug,
    description: product.description,
    category: product.category as ShopProduct['category'],
    tags: product.tags || [],
    price_cents: product.priceCents,
    currency: product.currency,
    image_url: product.imageUrl,
    is_active: product.isActive,
    is_featured: product.isFeatured,
    stripe_product_id: product.stripeProductId,
    stripe_price_id: product.stripePriceId,
    inventory_quantity: product.inventoryQuantity,
    created_at: product.createdAt.toISOString(),
    updated_at: product.updatedAt.toISOString(),
    variants: product.variants?.map(v => ({
      id: v.id,
      product_id: v.productId,
      name: v.name,
      sku: v.sku,
      price_cents: v.priceCents,
      inventory_quantity: v.inventoryQuantity,
      stripe_price_id: v.stripePriceId,
      sort_order: v.sortOrder,
      created_at: v.createdAt.toISOString(),
      updated_at: v.updatedAt.toISOString(),
    })),
    licensee: product.licensee ? { id: product.licensee.id, name: product.licensee.name } : null,
  }
}

function transformOrder(order: PrismaOrder): ShopOrder {
  return {
    id: order.id,
    profile_id: order.profileId,
    licensee_id: order.licenseeId,
    stripe_checkout_session_id: order.stripeCheckoutSessionId,
    stripe_payment_intent_id: order.stripePaymentIntentId,
    status: order.status as ShopOrder['status'],
    subtotal_cents: order.subtotalCents,
    tax_cents: order.taxCents,
    shipping_cents: order.shippingCents,
    total_cents: order.totalCents,
    currency: order.currency,
    shipping_address: order.shippingAddress as Record<string, unknown> | null,
    customer_name: order.customerName,
    customer_email: order.customerEmail,
    notes: order.notes,
    created_at: order.createdAt.toISOString(),
    updated_at: order.updatedAt.toISOString(),
    items: order.items?.map(i => ({
      id: i.id,
      order_id: i.orderId,
      product_id: i.productId,
      variant_id: i.variantId,
      quantity: i.quantity,
      unit_price_cents: i.unitPriceCents,
      total_price_cents: i.totalPriceCents,
      product_name: i.productName,
      variant_name: i.variantName,
      created_at: i.createdAt.toISOString(),
      updated_at: i.updatedAt.toISOString(),
    })),
    profile: order.profile ? {
      id: order.profile.id,
      email: order.profile.email,
      first_name: order.profile.firstName,
      last_name: order.profile.lastName,
    } : null,
  }
}

// ============================================================================
// PRODUCT QUERIES
// ============================================================================

/**
 * Fetch all active products for the public shop
 */
export async function getActiveProducts(options?: {
  category?: string
  featured?: boolean
  licenseeId?: string | null
  limit?: number
}): Promise<{ data: ShopProduct[] | null; error: Error | null }> {
  try {
    const where: Prisma.ShopProductWhereInput = {
      isActive: true,
    }

    if (options?.category) {
      where.category = options.category as Prisma.EnumShopCategoryFilter<"ShopProduct">
    }

    if (options?.featured) {
      where.isFeatured = true
    }

    if (options?.licenseeId !== undefined) {
      where.licenseeId = options.licenseeId
    }

    const products = await prisma.shopProduct.findMany({
      where,
      include: {
        variants: { orderBy: { sortOrder: 'asc' } },
        licensee: { select: { id: true, name: true } },
      },
      orderBy: [
        { isFeatured: 'desc' },
        { createdAt: 'desc' },
      ],
      take: options?.limit,
    })

    return { data: products.map(transformProduct), error: null }
  } catch (error) {
    console.error('[getActiveProducts] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Fetch a single product by slug
 */
export async function getProductBySlug(slug: string): Promise<{ data: ShopProduct | null; error: Error | null }> {
  try {
    const product = await prisma.shopProduct.findFirst({
      where: { slug, isActive: true },
      include: {
        variants: { orderBy: { sortOrder: 'asc' } },
        licensee: { select: { id: true, name: true } },
      },
    })

    return { data: product ? transformProduct(product) : null, error: null }
  } catch (error) {
    console.error('[getProductBySlug] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Fetch a product by ID
 */
export async function getProductById(id: string): Promise<{ data: ShopProduct | null; error: Error | null }> {
  try {
    const product = await prisma.shopProduct.findUnique({
      where: { id },
      include: {
        variants: { orderBy: { sortOrder: 'asc' } },
        licensee: { select: { id: true, name: true } },
      },
    })

    return { data: product ? transformProduct(product) : null, error: null }
  } catch (error) {
    console.error('[getProductById] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Fetch multiple products by IDs
 */
export async function getProductsByIds(ids: string[]): Promise<{ data: ShopProduct[] | null; error: Error | null }> {
  try {
    const products = await prisma.shopProduct.findMany({
      where: { id: { in: ids } },
      include: {
        variants: { orderBy: { sortOrder: 'asc' } },
        licensee: { select: { id: true, name: true } },
      },
    })

    return { data: products.map(transformProduct), error: null }
  } catch (error) {
    console.error('[getProductsByIds] Error:', error)
    return { data: null, error: error as Error }
  }
}

// ============================================================================
// ADMIN PRODUCT QUERIES
// ============================================================================

/**
 * Fetch all products for admin (including inactive)
 */
export async function getAdminProducts(options?: {
  licenseeId?: string | null
}): Promise<{ data: ShopProduct[] | null; error: Error | null }> {
  try {
    const where: Prisma.ShopProductWhereInput = {}

    if (options?.licenseeId !== undefined) {
      where.licenseeId = options.licenseeId
    }

    const products = await prisma.shopProduct.findMany({
      where,
      include: {
        variants: { orderBy: { sortOrder: 'asc' } },
        licensee: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return { data: products.map(transformProduct), error: null }
  } catch (error) {
    console.error('[getAdminProducts] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Create a new product
 */
export async function createProduct(product: {
  name: string
  slug: string
  description?: string | null
  category: string
  tags?: string[]
  price_cents: number
  image_url?: string | null
  is_active?: boolean
  is_featured?: boolean
  inventory_quantity?: number | null
  licensee_id?: string | null
}): Promise<{ data: ShopProduct | null; error: Error | null }> {
  try {
    const created = await prisma.shopProduct.create({
      data: {
        name: product.name,
        slug: product.slug,
        description: product.description || null,
        category: product.category as ShopCategory,
        tags: product.tags || [],
        priceCents: product.price_cents,
        imageUrl: product.image_url || null,
        isActive: product.is_active ?? true,
        isFeatured: product.is_featured ?? false,
        inventoryQuantity: product.inventory_quantity ?? null,
        licenseeId: product.licensee_id ?? null,
      },
      include: {
        variants: true,
        licensee: { select: { id: true, name: true } },
      },
    })

    return { data: transformProduct(created), error: null }
  } catch (error) {
    console.error('[createProduct] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Update a product
 */
export async function updateProduct(
  id: string,
  updates: Partial<{
    name: string
    slug: string
    description: string | null
    category: string
    tags: string[]
    price_cents: number
    image_url: string | null
    is_active: boolean
    is_featured: boolean
    stripe_product_id: string | null
    stripe_price_id: string | null
    inventory_quantity: number | null
    licensee_id: string | null
  }>
): Promise<{ data: ShopProduct | null; error: Error | null }> {
  try {
    // Convert snake_case to camelCase for Prisma
    const updateData: Prisma.ShopProductUpdateInput = {}
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.slug !== undefined) updateData.slug = updates.slug
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.category !== undefined) updateData.category = updates.category as ShopCategory
    if (updates.tags !== undefined) updateData.tags = updates.tags
    if (updates.price_cents !== undefined) updateData.priceCents = updates.price_cents
    if (updates.image_url !== undefined) updateData.imageUrl = updates.image_url
    if (updates.is_active !== undefined) updateData.isActive = updates.is_active
    if (updates.is_featured !== undefined) updateData.isFeatured = updates.is_featured
    if (updates.stripe_product_id !== undefined) updateData.stripeProductId = updates.stripe_product_id
    if (updates.stripe_price_id !== undefined) updateData.stripePriceId = updates.stripe_price_id
    if (updates.inventory_quantity !== undefined) updateData.inventoryQuantity = updates.inventory_quantity
    if (updates.licensee_id !== undefined) {
      updateData.licensee = updates.licensee_id
        ? { connect: { id: updates.licensee_id } }
        : { disconnect: true }
    }

    const updated = await prisma.shopProduct.update({
      where: { id },
      data: updateData,
      include: {
        variants: true,
        licensee: { select: { id: true, name: true } },
      },
    })

    return { data: transformProduct(updated), error: null }
  } catch (error) {
    console.error('[updateProduct] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(id: string): Promise<{ error: Error | null }> {
  try {
    await prisma.shopProduct.delete({ where: { id } })
    return { error: null }
  } catch (error) {
    console.error('[deleteProduct] Error:', error)
    return { error: error as Error }
  }
}

// ============================================================================
// VARIANT QUERIES
// ============================================================================

/**
 * Create a product variant
 */
export async function createVariant(variant: {
  product_id: string
  name: string
  sku?: string | null
  price_cents?: number | null
  inventory_quantity?: number | null
  sort_order?: number
}): Promise<{ data: ShopProductVariant | null; error: Error | null }> {
  try {
    const created = await prisma.shopProductVariant.create({
      data: {
        productId: variant.product_id,
        name: variant.name,
        sku: variant.sku || null,
        priceCents: variant.price_cents ?? null,
        inventoryQuantity: variant.inventory_quantity ?? null,
        sortOrder: variant.sort_order ?? 0,
      },
    })

    return {
      data: {
        id: created.id,
        product_id: created.productId,
        name: created.name,
        sku: created.sku,
        price_cents: created.priceCents,
        inventory_quantity: created.inventoryQuantity,
        stripe_price_id: created.stripePriceId,
        sort_order: created.sortOrder,
        created_at: created.createdAt.toISOString(),
        updated_at: created.updatedAt.toISOString(),
      },
      error: null,
    }
  } catch (error) {
    console.error('[createVariant] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Update a variant
 */
export async function updateVariant(
  id: string,
  updates: Partial<{
    name: string
    sku: string | null
    price_cents: number | null
    inventory_quantity: number | null
    stripe_price_id: string | null
    sort_order: number
  }>
): Promise<{ data: ShopProductVariant | null; error: Error | null }> {
  try {
    // Convert snake_case to camelCase for Prisma
    const updateData: Record<string, unknown> = {}
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.sku !== undefined) updateData.sku = updates.sku
    if (updates.price_cents !== undefined) updateData.priceCents = updates.price_cents
    if (updates.inventory_quantity !== undefined) updateData.inventoryQuantity = updates.inventory_quantity
    if (updates.stripe_price_id !== undefined) updateData.stripePriceId = updates.stripe_price_id
    if (updates.sort_order !== undefined) updateData.sortOrder = updates.sort_order

    const updated = await prisma.shopProductVariant.update({
      where: { id },
      data: updateData,
    })

    return {
      data: {
        id: updated.id,
        product_id: updated.productId,
        name: updated.name,
        sku: updated.sku,
        price_cents: updated.priceCents,
        inventory_quantity: updated.inventoryQuantity,
        stripe_price_id: updated.stripePriceId,
        sort_order: updated.sortOrder,
        created_at: updated.createdAt.toISOString(),
        updated_at: updated.updatedAt.toISOString(),
      },
      error: null,
    }
  } catch (error) {
    console.error('[updateVariant] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Delete a variant
 */
export async function deleteVariant(id: string): Promise<{ error: Error | null }> {
  try {
    await prisma.shopProductVariant.delete({ where: { id } })
    return { error: null }
  } catch (error) {
    console.error('[deleteVariant] Error:', error)
    return { error: error as Error }
  }
}

// ============================================================================
// ORDER QUERIES
// ============================================================================

/**
 * Create an order
 */
export async function createOrder(order: {
  profileId?: string | null
  licenseeId?: string | null
  stripeCheckoutSessionId?: string | null
  subtotalCents: number
  totalCents: number
  items: Array<{
    productId: string
    variantId?: string | null
    quantity: number
    unitPriceCents: number
    totalPriceCents: number
    productName: string
    variantName?: string | null
  }>
}): Promise<{ data: ShopOrder | null; error: Error | null }> {
  try {
    const created = await prisma.shopOrder.create({
      data: {
        profileId: order.profileId || null,
        licenseeId: order.licenseeId || null,
        stripeCheckoutSessionId: order.stripeCheckoutSessionId || null,
        status: 'pending',
        subtotalCents: order.subtotalCents,
        totalCents: order.totalCents,
        items: {
          create: order.items.map(item => ({
            productId: item.productId,
            variantId: item.variantId || null,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            totalPriceCents: item.totalPriceCents,
            productName: item.productName,
            variantName: item.variantName || null,
          })),
        },
      },
      include: {
        items: true,
        profile: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    })

    return { data: transformOrder(created), error: null }
  } catch (error) {
    console.error('[createOrder] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Update order status by order ID
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: ShopOrder['status']
): Promise<{ data: ShopOrder | null; error: Error | null }> {
  try {
    const updated = await prisma.shopOrder.update({
      where: { id: orderId },
      data: { status: newStatus },
      include: {
        items: true,
        profile: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    })

    return { data: transformOrder(updated), error: null }
  } catch (error) {
    console.error('[updateOrderStatus] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Update order by Stripe session ID (called by webhook)
 */
export async function updateOrderByStripeSession(
  stripeSessionId: string,
  updates: {
    status: ShopOrder['status']
    stripePaymentIntentId?: string
  }
): Promise<{ data: ShopOrder | null; error: Error | null }> {
  try {
    const updated = await prisma.shopOrder.update({
      where: { stripeCheckoutSessionId: stripeSessionId },
      data: updates,
      include: {
        items: true,
        profile: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    })

    return { data: transformOrder(updated), error: null }
  } catch (error) {
    console.error('[updateOrderByStripeSession] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Fetch orders for admin
 */
export async function getAdminOrders(options?: {
  licenseeId?: string | null
  status?: string
  limit?: number
}): Promise<{ data: ShopOrder[] | null; error: Error | null }> {
  try {
    const where: Prisma.ShopOrderWhereInput = {}

    if (options?.licenseeId !== undefined) {
      where.licenseeId = options.licenseeId
    }

    if (options?.status) {
      where.status = options.status as OrderStatus
    }

    const orders = await prisma.shopOrder.findMany({
      where,
      include: {
        items: true,
        profile: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit,
    })

    return { data: orders.map(transformOrder), error: null }
  } catch (error) {
    console.error('[getAdminOrders] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Fetch orders for a specific user
 */
export async function getUserOrders(profileId: string): Promise<{ data: ShopOrder[] | null; error: Error | null }> {
  try {
    const orders = await prisma.shopOrder.findMany({
      where: { profileId },
      include: {
        items: true,
        profile: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return { data: orders.map(transformOrder), error: null }
  } catch (error) {
    console.error('[getUserOrders] Error:', error)
    return { data: null, error: error as Error }
  }
}

// ============================================================================
// SETTINGS QUERIES
// ============================================================================

/**
 * Get a shop setting value by key
 */
export async function getShopSetting<T = unknown>(key: string): Promise<{ data: T | null; error: Error | null }> {
  try {
    const setting = await prisma.shopSetting.findFirst({
      where: { key },
    })

    if (!setting) {
      return { data: null, error: null }
    }

    return { data: setting.value as T, error: null }
  } catch (error) {
    console.error('[getShopSetting] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get all shop settings
 */
export async function getShopSettings(): Promise<{ data: ShopSettings[] | null; error: Error | null }> {
  try {
    const settings = await prisma.shopSetting.findMany({
      orderBy: { key: 'asc' },
    })

    return {
      data: settings.map(s => ({
        id: s.id,
        key: s.key,
        value: s.value as Record<string, unknown>,
        created_at: s.createdAt.toISOString(),
        updated_at: s.updatedAt.toISOString(),
      })),
      error: null,
    }
  } catch (error) {
    console.error('[getShopSettings] Error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Upsert a shop setting
 */
export async function upsertShopSetting<T = unknown>(
  key: string,
  value: T
): Promise<{ data: ShopSettings | null; error: Error | null }> {
  try {
    const upserted = await prisma.shopSetting.upsert({
      where: { key },
      create: { key, value: value as Prisma.InputJsonValue },
      update: { value: value as Prisma.InputJsonValue },
    })

    return {
      data: {
        id: upserted.id,
        key: upserted.key,
        value: upserted.value as Record<string, unknown>,
        created_at: upserted.createdAt.toISOString(),
        updated_at: upserted.updatedAt.toISOString(),
      },
      error: null,
    }
  } catch (error) {
    console.error('[upsertShopSetting] Error:', error)
    return { data: null, error: error as Error }
  }
}

// ============================================================================
// HELPER FUNCTIONS
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

/**
 * Calculate cart totals
 */
export function calculateCartTotals(
  items: Array<{ product: ShopProduct; variant?: ShopProductVariant | null; quantity: number }>
): { subtotal: number; itemCount: number } {
  let subtotal = 0
  let itemCount = 0

  for (const item of items) {
    const price = item.variant?.price_cents ?? item.product.price_cents
    subtotal += price * item.quantity
    itemCount += item.quantity
  }

  return { subtotal, itemCount }
}

// ============================================================================
// LICENSEE SHOP STATS
// ============================================================================

export interface LicenseeShopProductSales {
  productId: string
  productName: string
  category: string
  unitsSold: number
  revenue: number
  imageUrl: string | null
}

export interface LicenseeShopStats {
  localRevenue: number
  ordersThisMonth: number
  totalOrders: number
  topProducts: LicenseeShopProductSales[]
}

/**
 * Get shop stats for a licensee territory
 */
export async function getLicenseeShopStats(
  tenantId: string
): Promise<{ data: LicenseeShopStats | null; error: Error | null }> {
  try {
    // Get start of current month
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Get all completed orders for this licensee
    const orders = await prisma.shopOrder.findMany({
      where: {
        licenseeId: tenantId,
        status: { in: ['paid', 'processing', 'shipped', 'delivered'] },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                category: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    })

    // Calculate total revenue
    const localRevenue = orders.reduce((sum, order) => sum + order.totalCents, 0)

    // Count orders this month
    const ordersThisMonth = orders.filter(
      (order) => order.createdAt >= monthStart
    ).length

    // Aggregate sales by product
    const productSalesMap = new Map<
      string,
      {
        productId: string
        productName: string
        category: string
        unitsSold: number
        revenue: number
        imageUrl: string | null
      }
    >()

    for (const order of orders) {
      for (const item of order.items) {
        const existing = productSalesMap.get(item.productId)
        if (existing) {
          existing.unitsSold += item.quantity
          existing.revenue += item.totalPriceCents
        } else {
          productSalesMap.set(item.productId, {
            productId: item.productId,
            productName: item.product?.name || item.productName,
            category: (item.product?.category as string) || 'unknown',
            unitsSold: item.quantity,
            revenue: item.totalPriceCents,
            imageUrl: item.product?.imageUrl || null,
          })
        }
      }
    }

    // Convert to array and sort by revenue
    const topProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    return {
      data: {
        localRevenue,
        ordersThisMonth,
        totalOrders: orders.length,
        topProducts,
      },
      error: null,
    }
  } catch (error) {
    console.error('[getLicenseeShopStats] Error:', error)
    return { data: null, error: error as Error }
  }
}
