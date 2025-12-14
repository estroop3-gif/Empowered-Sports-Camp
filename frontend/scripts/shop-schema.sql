-- ============================================================================
-- EMPOWERED LOCKER - Shop Data Model
-- ============================================================================
--
-- This schema supports the Empowered Locker storefront and Locker Room Manager
-- admin interface. It's designed to be Stripe-ready while working independently
-- until Stripe is fully integrated.
--
-- Tables:
--   shop_products        - Sellable items (apparel, gear, digital, add-ons)
--   shop_product_variants - Size/color variants for products
--   shop_orders          - Order records (created on Stripe checkout completion)
--   shop_order_items     - Line items within each order
--
-- Multi-tenant aware:
--   - licensee_id = NULL means global Empowered brand item
--   - licensee_id = <uuid> means licensee-specific merchandise
--
-- ============================================================================

-- ============================================================================
-- SHOP_PRODUCTS
-- ============================================================================
-- Represents a sellable item in the Empowered Locker.
-- Can be global (HQ managed) or licensee-specific (territory merch).

CREATE TABLE IF NOT EXISTS shop_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant: NULL = global Empowered store item, otherwise licensee-specific
  licensee_id UUID REFERENCES tenants(id) ON DELETE SET NULL,

  -- Core product info
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,

  -- Categorization
  category TEXT NOT NULL DEFAULT 'apparel'
    CHECK (category IN ('apparel', 'gear', 'digital', 'addons')),
  tags TEXT[] DEFAULT '{}',

  -- Pricing
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',

  -- Media
  image_url TEXT,

  -- Status flags
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,

  -- Stripe integration (populated when product is synced to Stripe)
  stripe_product_id TEXT,
  stripe_price_id TEXT,

  -- Inventory (NULL means unlimited/digital)
  inventory_quantity INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_shop_products_slug ON shop_products(slug);
CREATE INDEX IF NOT EXISTS idx_shop_products_category ON shop_products(category);
CREATE INDEX IF NOT EXISTS idx_shop_products_licensee ON shop_products(licensee_id);
CREATE INDEX IF NOT EXISTS idx_shop_products_active_featured ON shop_products(is_active, is_featured);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_shop_products_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS shop_products_updated_at ON shop_products;
CREATE TRIGGER shop_products_updated_at
  BEFORE UPDATE ON shop_products
  FOR EACH ROW
  EXECUTE FUNCTION update_shop_products_timestamp();

-- ============================================================================
-- SHOP_PRODUCT_VARIANTS
-- ============================================================================
-- Size/color variants for products. Each variant can have its own price
-- and inventory, plus its own Stripe price ID for checkout.

CREATE TABLE IF NOT EXISTS shop_product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parent product
  product_id UUID NOT NULL REFERENCES shop_products(id) ON DELETE CASCADE,

  -- Variant info
  name TEXT NOT NULL,  -- e.g., "Youth Small", "Adult Medium", "Navy Blue"
  sku TEXT,            -- Optional SKU for inventory management

  -- Optional price override (NULL = use product base price)
  price_cents INTEGER CHECK (price_cents IS NULL OR price_cents >= 0),

  -- Variant-specific inventory
  inventory_quantity INTEGER,

  -- Stripe integration
  stripe_price_id TEXT,

  -- Display order
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast variant lookups
CREATE INDEX IF NOT EXISTS idx_shop_product_variants_product ON shop_product_variants(product_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_shop_product_variants_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS shop_product_variants_updated_at ON shop_product_variants;
CREATE TRIGGER shop_product_variants_updated_at
  BEFORE UPDATE ON shop_product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_shop_product_variants_timestamp();

-- ============================================================================
-- SHOP_ORDERS
-- ============================================================================
-- Order records created when a Stripe Checkout session completes.
-- We maintain our own order table even though Stripe handles payment,
-- so we have full control over order history and reporting.

CREATE TABLE IF NOT EXISTS shop_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Customer (nullable for guest checkout if we support it later)
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Multi-tenant: which licensee gets credit for this order
  licensee_id UUID REFERENCES tenants(id) ON DELETE SET NULL,

  -- Stripe references
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,

  -- Order status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'failed', 'cancelled', 'refunded')),

  -- Pricing (all in cents)
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  shipping_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',

  -- Customer info (captured at checkout, separate from profile)
  customer_name TEXT,
  customer_email TEXT,

  -- Shipping info (JSON for flexibility)
  shipping_address JSONB,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for order lookups
CREATE INDEX IF NOT EXISTS idx_shop_orders_profile ON shop_orders(profile_id);
CREATE INDEX IF NOT EXISTS idx_shop_orders_licensee ON shop_orders(licensee_id);
CREATE INDEX IF NOT EXISTS idx_shop_orders_status ON shop_orders(status);
CREATE INDEX IF NOT EXISTS idx_shop_orders_stripe_session ON shop_orders(stripe_checkout_session_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_shop_orders_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS shop_orders_updated_at ON shop_orders;
CREATE TRIGGER shop_orders_updated_at
  BEFORE UPDATE ON shop_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_shop_orders_timestamp();

-- ============================================================================
-- SHOP_ORDER_ITEMS
-- ============================================================================
-- Line items within each order. Captures the product, variant, quantity,
-- and price at the time of purchase (important since prices may change).

CREATE TABLE IF NOT EXISTS shop_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parent order
  order_id UUID NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,

  -- What was purchased
  product_id UUID NOT NULL REFERENCES shop_products(id) ON DELETE RESTRICT,
  variant_id UUID REFERENCES shop_product_variants(id) ON DELETE RESTRICT,

  -- Quantity and pricing (captured at time of purchase)
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  total_price_cents INTEGER NOT NULL CHECK (total_price_cents >= 0),

  -- Product snapshot (in case product details change later)
  product_name TEXT NOT NULL,
  variant_name TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for order item lookups
CREATE INDEX IF NOT EXISTS idx_shop_order_items_order ON shop_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_shop_order_items_product ON shop_order_items(product_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_shop_order_items_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS shop_order_items_updated_at ON shop_order_items;
CREATE TRIGGER shop_order_items_updated_at
  BEFORE UPDATE ON shop_order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_shop_order_items_timestamp();

-- ============================================================================
-- SHOP_SETTINGS
-- ============================================================================
-- Key-value store for shop configuration. Allows HQ admins to customize
-- storefront content, shipping rates, tax settings, etc. without code changes.

CREATE TABLE IF NOT EXISTS shop_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Setting key (unique identifier)
  key TEXT NOT NULL UNIQUE,

  -- Setting value (stored as JSONB for flexibility)
  value JSONB NOT NULL DEFAULT 'null'::jsonb,

  -- Optional description for admin UI
  description TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast key lookups
CREATE INDEX IF NOT EXISTS idx_shop_settings_key ON shop_settings(key);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_shop_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS shop_settings_updated_at ON shop_settings;
CREATE TRIGGER shop_settings_updated_at
  BEFORE UPDATE ON shop_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_shop_settings_timestamp();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all shop tables
ALTER TABLE shop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_order_items ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- SHOP_PRODUCTS RLS
-- ----------------------------------------------------------------------------
-- Public: Can view active products
-- HQ Admin: Full access to all products
-- Licensee Owner: Full access to their products only

-- Public read access for active products
CREATE POLICY "Anyone can view active products"
  ON shop_products FOR SELECT
  USING (is_active = true);

-- HQ Admin full access
CREATE POLICY "HQ Admin can manage all products"
  ON shop_products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'hq_admin'
      AND is_active = true
    )
  );

-- Licensee owners can manage their own products
CREATE POLICY "Licensee owners can manage their products"
  ON shop_products FOR ALL
  USING (
    licensee_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'licensee_owner'
      AND tenant_id = shop_products.licensee_id
      AND is_active = true
    )
  );

-- ----------------------------------------------------------------------------
-- SHOP_PRODUCT_VARIANTS RLS
-- ----------------------------------------------------------------------------
-- Inherit access from parent product

-- Public read access (if parent product is active)
CREATE POLICY "Anyone can view variants of active products"
  ON shop_product_variants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shop_products
      WHERE shop_products.id = shop_product_variants.product_id
      AND shop_products.is_active = true
    )
  );

-- HQ Admin full access
CREATE POLICY "HQ Admin can manage all variants"
  ON shop_product_variants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'hq_admin'
      AND is_active = true
    )
  );

-- Licensee owners can manage variants of their products
CREATE POLICY "Licensee owners can manage their product variants"
  ON shop_product_variants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM shop_products
      JOIN user_roles ON user_roles.tenant_id = shop_products.licensee_id
      WHERE shop_products.id = shop_product_variants.product_id
      AND shop_products.licensee_id IS NOT NULL
      AND user_roles.user_id = auth.uid()
      AND user_roles.role = 'licensee_owner'
      AND user_roles.is_active = true
    )
  );

-- ----------------------------------------------------------------------------
-- SHOP_ORDERS RLS
-- ----------------------------------------------------------------------------
-- Users see their own orders only
-- Admins see all orders

-- Users can view their own orders
CREATE POLICY "Users can view their own orders"
  ON shop_orders FOR SELECT
  USING (profile_id = auth.uid());

-- Users can create orders for themselves
CREATE POLICY "Users can create their own orders"
  ON shop_orders FOR INSERT
  WITH CHECK (profile_id = auth.uid() OR profile_id IS NULL);

-- HQ Admin can view and manage all orders
CREATE POLICY "HQ Admin can manage all orders"
  ON shop_orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'hq_admin'
      AND is_active = true
    )
  );

-- Licensee owners can view orders for their territory
CREATE POLICY "Licensee owners can view their orders"
  ON shop_orders FOR SELECT
  USING (
    licensee_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'licensee_owner'
      AND tenant_id = shop_orders.licensee_id
      AND is_active = true
    )
  );

-- ----------------------------------------------------------------------------
-- SHOP_ORDER_ITEMS RLS
-- ----------------------------------------------------------------------------
-- Users see items for their own orders
-- Admins see all

-- Users can view items for their own orders
CREATE POLICY "Users can view their own order items"
  ON shop_order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shop_orders
      WHERE shop_orders.id = shop_order_items.order_id
      AND shop_orders.profile_id = auth.uid()
    )
  );

-- Users can insert items for orders they're creating
CREATE POLICY "Users can add items to their orders"
  ON shop_order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shop_orders
      WHERE shop_orders.id = shop_order_items.order_id
      AND (shop_orders.profile_id = auth.uid() OR shop_orders.profile_id IS NULL)
    )
  );

-- HQ Admin full access
CREATE POLICY "HQ Admin can manage all order items"
  ON shop_order_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'hq_admin'
      AND is_active = true
    )
  );

-- Licensee owners can view order items for their territory
CREATE POLICY "Licensee owners can view their order items"
  ON shop_order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shop_orders
      WHERE shop_orders.id = shop_order_items.order_id
      AND shop_orders.licensee_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role = 'licensee_owner'
        AND tenant_id = shop_orders.licensee_id
        AND is_active = true
      )
    )
  );

-- ----------------------------------------------------------------------------
-- SHOP_SETTINGS RLS
-- ----------------------------------------------------------------------------
-- Only HQ admins can manage settings
-- Public can read settings (for storefront customization)

-- Public read access for settings
CREATE POLICY "Anyone can read shop settings"
  ON shop_settings FOR SELECT
  USING (true);

-- HQ Admin can manage all settings
CREATE POLICY "HQ Admin can manage shop settings"
  ON shop_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'hq_admin'
      AND is_active = true
    )
  );

-- ============================================================================
-- SEED DATA - Sample Products for Empowered Locker
-- ============================================================================
-- These are placeholder products to demonstrate the shop. HQ can modify
-- or replace these via the Locker Room Manager.

INSERT INTO shop_products (
  name, slug, description, category, tags, price_cents, image_url, is_active, is_featured
) VALUES
  (
    'Empowered Athlete Tee',
    'empowered-athlete-tee',
    'The official Empowered Athletes tee. Soft, breathable, and built for girls who play fierce. Made from premium cotton blend that moves with you on and off the court.',
    'apparel',
    ARRAY['bestseller', 'new'],
    2999,
    '/images/shop/tee-placeholder.jpg',
    true,
    true
  ),
  (
    'Movement Hoodie',
    'movement-hoodie',
    'Cozy up in the Movement Hoodie. Perfect for early morning practices, game day warmups, or repping the crew anywhere you go. Features our signature "Part of Something Bigger" print on the back.',
    'apparel',
    ARRAY['bestseller'],
    5499,
    '/images/shop/hoodie-placeholder.jpg',
    true,
    true
  ),
  (
    'Fierce Player Shorts',
    'fierce-player-shorts',
    'Lightweight, moisture-wicking shorts designed for peak performance. Side pockets, elastic waistband, and the Empowered logo you''re proud to wear.',
    'apparel',
    ARRAY['new'],
    3499,
    '/images/shop/shorts-placeholder.jpg',
    true,
    false
  ),
  (
    'Empowered Athlete Bag',
    'empowered-athlete-bag',
    'Carry your gear in style. This durable duffle fits everything you need for practice, games, and camp. Separate shoe compartment, water bottle pocket, and plenty of room to grow.',
    'gear',
    ARRAY['bestseller'],
    4999,
    '/images/shop/bag-placeholder.jpg',
    true,
    true
  ),
  (
    'Game Day Water Bottle',
    'game-day-water-bottle',
    'Stay hydrated, stay fierce. Our 32oz insulated bottle keeps your water cold for 24 hours. Features the Empowered Athletes logo and motivational reminder to fuel your fire.',
    'gear',
    ARRAY[]::TEXT[],
    2499,
    '/images/shop/bottle-placeholder.jpg',
    true,
    false
  ),
  (
    'Champions Headband Pack',
    'champions-headband-pack',
    'Three-pack of moisture-wicking headbands in signature Empowered colors. Keep your focus on the game, not your hair.',
    'gear',
    ARRAY['new'],
    1499,
    '/images/shop/headband-placeholder.jpg',
    true,
    false
  ),
  (
    'Digital Playbook: Home Training',
    'digital-playbook-home-training',
    'A downloadable guide with 30+ at-home drills and exercises designed by our coaches. Build skills between camps and stay game-ready year-round.',
    'digital',
    ARRAY[]::TEXT[],
    1999,
    '/images/shop/playbook-placeholder.jpg',
    true,
    false
  ),
  (
    'Camp Photo Package Add-on',
    'camp-photo-package',
    'Professional photos from your camp week. Includes digital downloads of action shots, team photos, and candid moments. Order with your camp registration or add later.',
    'addons',
    ARRAY[]::TEXT[],
    3999,
    '/images/shop/photos-placeholder.jpg',
    true,
    false
  )
ON CONFLICT (slug) DO NOTHING;

-- Add variants for apparel products
INSERT INTO shop_product_variants (product_id, name, sku, inventory_quantity)
SELECT id, 'Youth Small', 'EAT-YS', 50 FROM shop_products WHERE slug = 'empowered-athlete-tee'
ON CONFLICT DO NOTHING;

INSERT INTO shop_product_variants (product_id, name, sku, inventory_quantity)
SELECT id, 'Youth Medium', 'EAT-YM', 50 FROM shop_products WHERE slug = 'empowered-athlete-tee'
ON CONFLICT DO NOTHING;

INSERT INTO shop_product_variants (product_id, name, sku, inventory_quantity)
SELECT id, 'Youth Large', 'EAT-YL', 50 FROM shop_products WHERE slug = 'empowered-athlete-tee'
ON CONFLICT DO NOTHING;

INSERT INTO shop_product_variants (product_id, name, sku, inventory_quantity)
SELECT id, 'Adult Small', 'EAT-AS', 30 FROM shop_products WHERE slug = 'empowered-athlete-tee'
ON CONFLICT DO NOTHING;

INSERT INTO shop_product_variants (product_id, name, sku, inventory_quantity)
SELECT id, 'Adult Medium', 'EAT-AM', 30 FROM shop_products WHERE slug = 'empowered-athlete-tee'
ON CONFLICT DO NOTHING;

INSERT INTO shop_product_variants (product_id, name, sku, inventory_quantity)
SELECT id, 'Adult Large', 'EAT-AL', 30 FROM shop_products WHERE slug = 'empowered-athlete-tee'
ON CONFLICT DO NOTHING;

-- Hoodie variants
INSERT INTO shop_product_variants (product_id, name, sku, inventory_quantity)
SELECT id, 'Youth Small', 'MH-YS', 25 FROM shop_products WHERE slug = 'movement-hoodie'
ON CONFLICT DO NOTHING;

INSERT INTO shop_product_variants (product_id, name, sku, inventory_quantity)
SELECT id, 'Youth Medium', 'MH-YM', 25 FROM shop_products WHERE slug = 'movement-hoodie'
ON CONFLICT DO NOTHING;

INSERT INTO shop_product_variants (product_id, name, sku, inventory_quantity)
SELECT id, 'Youth Large', 'MH-YL', 25 FROM shop_products WHERE slug = 'movement-hoodie'
ON CONFLICT DO NOTHING;

INSERT INTO shop_product_variants (product_id, name, sku, inventory_quantity)
SELECT id, 'Adult Small', 'MH-AS', 20 FROM shop_products WHERE slug = 'movement-hoodie'
ON CONFLICT DO NOTHING;

INSERT INTO shop_product_variants (product_id, name, sku, inventory_quantity)
SELECT id, 'Adult Medium', 'MH-AM', 20 FROM shop_products WHERE slug = 'movement-hoodie'
ON CONFLICT DO NOTHING;

INSERT INTO shop_product_variants (product_id, name, sku, inventory_quantity)
SELECT id, 'Adult Large', 'MH-AL', 20 FROM shop_products WHERE slug = 'movement-hoodie'
ON CONFLICT DO NOTHING;

-- Shorts variants
INSERT INTO shop_product_variants (product_id, name, sku, inventory_quantity)
SELECT id, 'Youth Small', 'FPS-YS', 40 FROM shop_products WHERE slug = 'fierce-player-shorts'
ON CONFLICT DO NOTHING;

INSERT INTO shop_product_variants (product_id, name, sku, inventory_quantity)
SELECT id, 'Youth Medium', 'FPS-YM', 40 FROM shop_products WHERE slug = 'fierce-player-shorts'
ON CONFLICT DO NOTHING;

INSERT INTO shop_product_variants (product_id, name, sku, inventory_quantity)
SELECT id, 'Youth Large', 'FPS-YL', 40 FROM shop_products WHERE slug = 'fierce-player-shorts'
ON CONFLICT DO NOTHING;

-- Default shop settings
INSERT INTO shop_settings (key, value, description)
VALUES
  ('hero_title', '"Empowered Locker"', 'Main title on the shop hero section'),
  ('hero_subtitle', '"Gear for girls who play fierce and dream bigger."', 'Subtitle text below the hero title'),
  ('hero_tagline', '"Join the Movement"', 'Small tagline badge above the hero title'),
  ('movement_message', '"Every purchase helps more girls step into confident competition. You''re part of something bigger."', 'Movement messaging on product pages and cart'),
  ('checkout_message', '"Thank you for supporting Empowered Sports Camps!"', 'Message shown after successful checkout'),
  ('stripe_configured', 'false', 'Whether Stripe integration is active'),
  ('tax_rate', '0', 'Tax rate as percentage (e.g., 8.25 for 8.25%)'),
  ('shipping_flat_rate', '0', 'Flat shipping rate in cents (0 = free shipping)'),
  ('free_shipping_threshold', '0', 'Order total in cents for free shipping (0 = disabled)')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- NOTES FOR DEVELOPERS
-- ============================================================================
--
-- Stripe Integration:
--   When connecting Stripe, update products with:
--   - stripe_product_id: The Stripe Product ID
--   - stripe_price_id: The default Stripe Price ID
--   For variants, each needs its own stripe_price_id.
--
-- Inventory:
--   - NULL inventory_quantity = unlimited (digital goods)
--   - 0 = out of stock
--   - Decrement on successful order
--
-- Multi-tenant:
--   - Global products: licensee_id IS NULL
--   - Territory products: licensee_id = tenant.id
--   - Future: Allow licensees to "opt in" to global products
--
-- ============================================================================
