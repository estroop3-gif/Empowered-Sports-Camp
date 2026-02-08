-- Migration: Deduplicate camp slugs and add UNIQUE constraint
-- Run BEFORE `prisma db push` to avoid constraint violation errors

-- Step 1: Rename duplicate slugs
-- For camps with duplicate slugs, keep the one with a tenant_id unchanged (preferred),
-- and append a numeric suffix to the rest.
-- If both have tenant_id or both are null, the newest one keeps the original slug.

WITH ranked AS (
  SELECT
    id,
    slug,
    tenant_id,
    ROW_NUMBER() OVER (
      PARTITION BY slug
      ORDER BY
        CASE WHEN tenant_id IS NOT NULL THEN 0 ELSE 1 END,  -- tenant camps first
        created_at DESC  -- newest first as tiebreaker
    ) AS rn
  FROM camps
),
duplicates AS (
  SELECT id, slug, rn
  FROM ranked
  WHERE rn > 1
)
UPDATE camps
SET slug = camps.slug || '-' || duplicates.rn
FROM duplicates
WHERE camps.id = duplicates.id;

-- Step 2: Add unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS camps_slug_key ON camps (slug);
