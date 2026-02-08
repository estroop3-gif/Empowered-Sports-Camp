-- CreateTable
CREATE TABLE IF NOT EXISTS "sport_tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sport_tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "sport_tags_slug_key" ON "sport_tags"("slug");

-- Seed data (union of all hardcoded sport lists)
INSERT INTO "sport_tags" ("slug", "name", "sort_order") VALUES
  ('multi_sport',            'Multi-Sport',             1),
  ('basketball',             'Basketball',              2),
  ('soccer',                 'Soccer',                  3),
  ('volleyball',             'Volleyball',              4),
  ('flag_football',          'Flag Football',           5),
  ('lacrosse',               'Lacrosse',                6),
  ('tennis',                 'Tennis',                   7),
  ('softball',               'Softball',                8),
  ('track_field',            'Track & Field',           9),
  ('swimming',               'Swimming',               10),
  ('field_hockey',           'Field Hockey',            11),
  ('speed_agility',          'Speed & Agility',        12),
  ('gymnastics',             'Gymnastics',             13),
  ('dance',                  'Dance',                  14),
  ('cheerleading',           'Cheerleading',           15),
  ('football',               'Football',               16),
  ('baseball',               'Baseball',               17),
  ('wrestling',              'Wrestling',              18),
  ('intro_to_weightlifting', 'Intro to Weightlifting', 19)
ON CONFLICT ("slug") DO NOTHING;
