-- =====================================================
-- EMPOWERED ATHLETES - ADD-ONS & MERCHANDISE SCHEMA
-- =====================================================
-- Upsell engine for registration checkout
-- Supports: Fuel Packs, Apparel, Merch, Digital Products
-- =====================================================

-- =====================================================
-- ADD-ON TYPES
-- =====================================================
CREATE TYPE addon_type AS ENUM (
  'fuel_pack',      -- Daily snack/drink bundles
  'apparel',        -- T-shirts, jerseys, etc.
  'merchandise',    -- Hats, wristbands, bags
  'digital',        -- Digital downloads, photos
  'service'         -- Extended care, transportation
);

CREATE TYPE addon_scope AS ENUM (
  'per_camper',     -- Charged per camper (e.g., t-shirt)
  'per_order'       -- Charged once per order (e.g., parking pass)
);

-- =====================================================
-- ADD-ONS / PRODUCTS TABLE
-- =====================================================
CREATE TABLE addons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Basic info
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  hype_copy TEXT, -- Marketing/fun description

  -- Type and scope
  addon_type addon_type NOT NULL,
  scope addon_scope NOT NULL DEFAULT 'per_camper',

  -- Pricing (in cents)
  price INTEGER NOT NULL,
  compare_at_price INTEGER, -- For showing discounts

  -- Display
  image_url TEXT,
  display_order INTEGER DEFAULT 0,

  -- Availability
  active BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,

  -- Camp restrictions (null = available for all camps)
  available_camp_ids UUID[],

  -- Date restrictions
  available_from TIMESTAMPTZ,
  available_until TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, slug)
);

CREATE INDEX idx_addons_tenant ON addons(tenant_id);
CREATE INDEX idx_addons_type ON addons(addon_type);
CREATE INDEX idx_addons_active ON addons(active, tenant_id);

-- =====================================================
-- ADD-ON VARIANTS (Sizes, Colors, etc.)
-- =====================================================
CREATE TABLE addon_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  addon_id UUID NOT NULL REFERENCES addons(id) ON DELETE CASCADE,

  -- Variant details
  name VARCHAR(100) NOT NULL, -- "Youth Small", "Adult Large", "Red"
  sku VARCHAR(100),

  -- Pricing override (null = use parent price)
  price_override INTEGER,

  -- Inventory
  track_inventory BOOLEAN DEFAULT true,
  inventory_quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  allow_backorder BOOLEAN DEFAULT false,

  -- Display
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(addon_id, sku)
);

CREATE INDEX idx_addon_variants_addon ON addon_variants(addon_id);

-- =====================================================
-- CART TABLE (Persistent carts for checkout)
-- =====================================================
CREATE TABLE carts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Owner (can be anonymous or authenticated)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id VARCHAR(255), -- For anonymous carts

  -- Selected camp
  camp_id UUID REFERENCES camps(id) ON DELETE SET NULL,

  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'abandoned', 'converted')),

  -- Promo code
  promo_code_id UUID REFERENCES promo_codes(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX idx_carts_user ON carts(user_id);
CREATE INDEX idx_carts_session ON carts(session_id);
CREATE INDEX idx_carts_status ON carts(status);

-- =====================================================
-- CART CAMPERS (Campers in a cart)
-- =====================================================
CREATE TABLE cart_campers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,

  -- Camper details (pre-registration)
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE NOT NULL,
  grade VARCHAR(20),
  pronouns VARCHAR(50),
  tshirt_size VARCHAR(10),
  medical_notes TEXT,
  allergies TEXT,
  special_considerations TEXT,

  -- Link to existing athlete (if parent has registered before)
  athlete_id UUID REFERENCES athletes(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cart_campers_cart ON cart_campers(cart_id);

-- =====================================================
-- CART ADD-ONS (Add-ons in a cart)
-- =====================================================
CREATE TABLE cart_addons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES addons(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES addon_variants(id) ON DELETE CASCADE,

  -- For per-camper add-ons, link to specific camper
  cart_camper_id UUID REFERENCES cart_campers(id) ON DELETE CASCADE,

  -- Quantity
  quantity INTEGER NOT NULL DEFAULT 1,

  -- Price at time of adding (for price consistency)
  unit_price INTEGER NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cart_addons_cart ON cart_addons(cart_id);

-- =====================================================
-- ORDER ADD-ONS (Finalized add-on purchases)
-- =====================================================
CREATE TABLE registration_addons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES addons(id) ON DELETE RESTRICT,
  variant_id UUID REFERENCES addon_variants(id) ON DELETE RESTRICT,

  -- For per-camper add-ons
  athlete_id UUID REFERENCES athletes(id),

  -- Purchase details
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL,
  total_price INTEGER NOT NULL,

  -- Fulfillment
  fulfilled BOOLEAN DEFAULT false,
  fulfilled_at TIMESTAMPTZ,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_registration_addons_registration ON registration_addons(registration_id);
CREATE INDEX idx_registration_addons_addon ON registration_addons(addon_id);

-- =====================================================
-- INVENTORY TRANSACTIONS (For tracking)
-- =====================================================
CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID NOT NULL REFERENCES addon_variants(id) ON DELETE CASCADE,

  -- Transaction type
  transaction_type VARCHAR(20) NOT NULL CHECK (
    transaction_type IN ('purchase', 'return', 'adjustment', 'restock')
  ),

  -- Quantity change (negative for purchases/reductions)
  quantity_change INTEGER NOT NULL,
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,

  -- Reference
  registration_addon_id UUID REFERENCES registration_addons(id),
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_inventory_transactions_variant ON inventory_transactions(variant_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update inventory on purchase
CREATE OR REPLACE FUNCTION update_inventory_on_purchase()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.variant_id IS NOT NULL THEN
    UPDATE addon_variants
    SET inventory_quantity = inventory_quantity - NEW.quantity
    WHERE id = NEW.variant_id;

    -- Log transaction
    INSERT INTO inventory_transactions (
      variant_id,
      transaction_type,
      quantity_change,
      quantity_before,
      quantity_after,
      registration_addon_id
    )
    SELECT
      NEW.variant_id,
      'purchase',
      -NEW.quantity,
      inventory_quantity + NEW.quantity,
      inventory_quantity,
      NEW.id
    FROM addon_variants WHERE id = NEW.variant_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inventory_purchase_trigger
  AFTER INSERT ON registration_addons
  FOR EACH ROW EXECUTE FUNCTION update_inventory_on_purchase();

-- Auto-update timestamps
CREATE TRIGGER update_addons_updated_at BEFORE UPDATE ON addons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_addon_variants_updated_at BEFORE UPDATE ON addon_variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_carts_updated_at BEFORE UPDATE ON carts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_cart_campers_updated_at BEFORE UPDATE ON cart_campers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_registration_addons_updated_at BEFORE UPDATE ON registration_addons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE addon_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_campers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Addons: Public read for active, tenant admins can manage
CREATE POLICY "Active addons are publicly viewable" ON addons
  FOR SELECT USING (active = true);

CREATE POLICY "Tenant admins can manage addons" ON addons
  FOR ALL USING (
    is_licensor() OR has_tenant_access(tenant_id)
  );

-- Variants: Public read, admin manage
CREATE POLICY "Active variants are publicly viewable" ON addon_variants
  FOR SELECT USING (active = true);

CREATE POLICY "Tenant admins can manage variants" ON addon_variants
  FOR ALL USING (
    is_licensor() OR EXISTS (
      SELECT 1 FROM addons a
      WHERE a.id = addon_variants.addon_id
      AND has_tenant_access(a.tenant_id)
    )
  );

-- Carts: Users own their carts
CREATE POLICY "Users can manage their own carts" ON carts
  FOR ALL USING (
    user_id = auth.uid() OR session_id IS NOT NULL
  );

CREATE POLICY "Tenant admins can view carts" ON carts
  FOR SELECT USING (
    is_licensor() OR has_tenant_access(tenant_id)
  );

-- Cart campers: Follow cart ownership
CREATE POLICY "Cart campers follow cart access" ON cart_campers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM carts c
      WHERE c.id = cart_campers.cart_id
      AND (c.user_id = auth.uid() OR c.session_id IS NOT NULL)
    )
  );

-- Cart addons: Follow cart ownership
CREATE POLICY "Cart addons follow cart access" ON cart_addons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM carts c
      WHERE c.id = cart_addons.cart_id
      AND (c.user_id = auth.uid() OR c.session_id IS NOT NULL)
    )
  );

-- Registration addons: Parents see their own, admins see tenant
CREATE POLICY "Parents can view their registration addons" ON registration_addons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM registrations r
      WHERE r.id = registration_addons.registration_id
      AND r.parent_id = auth.uid()
    )
  );

CREATE POLICY "Tenant admins can manage registration addons" ON registration_addons
  FOR ALL USING (
    is_licensor() OR EXISTS (
      SELECT 1 FROM registrations r
      WHERE r.id = registration_addons.registration_id
      AND has_tenant_access(r.tenant_id)
    )
  );

-- Inventory transactions: Admin only
CREATE POLICY "Admins can view inventory transactions" ON inventory_transactions
  FOR SELECT USING (
    is_licensor() OR EXISTS (
      SELECT 1 FROM addon_variants v
      JOIN addons a ON a.id = v.addon_id
      WHERE v.id = inventory_transactions.variant_id
      AND has_tenant_access(a.tenant_id)
    )
  );

-- =====================================================
-- SEED DATA
-- =====================================================

-- Get Chicago North tenant ID
DO $$
DECLARE
  chicago_north_id UUID;
BEGIN
  SELECT id INTO chicago_north_id FROM tenants WHERE slug = 'chicago-north';

  -- Fuel Packs
  INSERT INTO addons (tenant_id, name, slug, description, hype_copy, addon_type, scope, price, featured, display_order)
  VALUES (
    chicago_north_id,
    'Daily Fuel Pack',
    'daily-fuel-pack',
    'Balanced snacks and drinks to keep her energized all day. Includes healthy snacks, fruit, and electrolyte drinks.',
    'Keep her powered up all day with balanced snacks and drinks. No sugar crashes, just sustained energy for champions.',
    'fuel_pack',
    'per_camper',
    4500, -- $45 for the week
    true,
    1
  );

  -- T-Shirts
  INSERT INTO addons (tenant_id, name, slug, description, hype_copy, addon_type, scope, price, featured, display_order)
  VALUES (
    chicago_north_id,
    'Empowered Athlete Tee',
    'empowered-tee',
    'Official Empowered Athletes camp t-shirt. Premium cotton blend, designed for movement.',
    'Let her wear her grind on and off the field. The official tee of future champions.',
    'apparel',
    'per_camper',
    2500, -- $25
    true,
    2
  );

  -- Add variants for t-shirt
  INSERT INTO addon_variants (addon_id, name, sku, inventory_quantity, display_order)
  SELECT
    id,
    size,
    'EA-TEE-' || size,
    50,
    ord
  FROM addons, unnest(ARRAY['YXS', 'YS', 'YM', 'YL', 'AS', 'AM', 'AL', 'AXL']) WITH ORDINALITY AS t(size, ord)
  WHERE slug = 'empowered-tee' AND tenant_id = chicago_north_id;

  -- Water Bottle
  INSERT INTO addons (tenant_id, name, slug, description, hype_copy, addon_type, scope, price, display_order)
  VALUES (
    chicago_north_id,
    'Champion Water Bottle',
    'water-bottle',
    '32oz insulated stainless steel water bottle with Empowered Athletes logo.',
    'Hydrate like a champion. Keeps drinks cold for 24 hours.',
    'merchandise',
    'per_camper',
    2000, -- $20
    3
  );

  -- Hat
  INSERT INTO addons (tenant_id, name, slug, description, hype_copy, addon_type, scope, price, display_order)
  VALUES (
    chicago_north_id,
    'Empowered Snapback',
    'snapback-hat',
    'Adjustable snapback hat with embroidered logo.',
    'Crown yourself. Adjustable fit for every future champion.',
    'merchandise',
    'per_camper',
    1800, -- $18
    4
  );

  -- Wristband Pack
  INSERT INTO addons (tenant_id, name, slug, description, hype_copy, addon_type, scope, price, display_order)
  VALUES (
    chicago_north_id,
    'Fierce Wristband Pack',
    'wristband-pack',
    'Set of 3 silicone wristbands in neon green, magenta, and purple.',
    'Stack your strength. Three bands, infinite confidence.',
    'merchandise',
    'per_camper',
    800, -- $8
    5
  );

END $$;
