-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('active', 'suspended', 'terminated');

-- CreateEnum
CREATE TYPE "CampStatus" AS ENUM ('draft', 'published', 'registration_open', 'registration_closed', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "GroupingStatus" AS ENUM ('pending', 'auto_grouped', 'reviewed', 'finalized');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('parent', 'coach', 'director', 'licensee_owner', 'hq_admin', 'cit_volunteer');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');

-- CreateEnum
CREATE TYPE "AthleteRiskFlag" AS ENUM ('none', 'monitor', 'restricted');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'partial', 'paid', 'refunded', 'failed');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('pending', 'confirmed', 'waitlisted', 'cancelled', 'refunded');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('percentage', 'fixed');

-- CreateEnum
CREATE TYPE "AssignmentType" AS ENUM ('auto', 'manual', 'override');

-- CreateEnum
CREATE TYPE "ViolationType" AS ENUM ('size_exceeded', 'grade_spread_exceeded', 'friend_group_split', 'friend_group_too_large', 'impossible_placement', 'grade_discrepancy');

-- CreateEnum
CREATE TYPE "ViolationSeverity" AS ENUM ('warning', 'hard');

-- CreateEnum
CREATE TYPE "ResolutionType" AS ENUM ('auto_fixed', 'manual_override', 'accepted', 'dismissed');

-- CreateEnum
CREATE TYPE "GroupingRunType" AS ENUM ('initial', 'rerun', 'incremental');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('draft', 'final', 'amended');

-- CreateEnum
CREATE TYPE "SportType" AS ENUM ('multi_sport', 'basketball', 'soccer', 'volleyball', 'softball', 'flag_football', 'lacrosse', 'field_hockey', 'track_field', 'speed_agility');

-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('intro', 'beginner', 'intermediate', 'advanced');

-- CreateEnum
CREATE TYPE "BlockCategory" AS ENUM ('warmup', 'drill', 'skill_station', 'scrimmage', 'game', 'mindset', 'leadership', 'team_building', 'cooldown', 'water_break', 'transition', 'other');

-- CreateEnum
CREATE TYPE "IntensityLevel" AS ENUM ('low', 'moderate', 'high', 'variable');

-- CreateEnum
CREATE TYPE "SessionDayStatus" AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "ScheduleBlockType" AS ENUM ('activity', 'transition', 'break', 'meal', 'arrival', 'departure', 'special', 'curriculum');

-- CreateEnum
CREATE TYPE "IndoorOutdoor" AS ENUM ('indoor', 'outdoor', 'both');

-- CreateEnum
CREATE TYPE "CertificationStatus" AS ENUM ('pending_review', 'approved', 'rejected', 'expired');

-- CreateEnum
CREATE TYPE "ShopCategory" AS ENUM ('apparel', 'gear', 'digital', 'addons');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'paid', 'processing', 'shipped', 'delivered', 'failed', 'cancelled', 'refunded');

-- CreateEnum
CREATE TYPE "TerritoryStatus" AS ENUM ('open', 'reserved', 'assigned', 'closed');

-- CreateEnum
CREATE TYPE "CitApplicationStatus" AS ENUM ('applied', 'under_review', 'interview_scheduled', 'interview_completed', 'training_pending', 'training_complete', 'approved', 'assigned_first_camp', 'rejected', 'on_hold', 'withdrawn');

-- CreateEnum
CREATE TYPE "CitProgressEventType" AS ENUM ('status_change', 'note_added', 'interview_scheduled', 'interview_completed', 'training_started', 'training_completed', 'camp_assigned', 'document_uploaded', 'application_submitted');

-- CreateEnum
CREATE TYPE "TeamColor" AS ENUM ('pink', 'purple');

-- CreateEnum
CREATE TYPE "PortalType" AS ENUM ('OPERATIONAL', 'BUSINESS', 'SKILL_STATION');

-- CreateEnum
CREATE TYPE "VideoProvider" AS ENUM ('YOUTUBE', 'VIMEO', 'EMBED');

-- CreateEnum
CREATE TYPE "EmpowerUProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE');

-- CreateEnum
CREATE TYPE "ContributionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED');

-- CreateEnum
CREATE TYPE "CompensationPlanCode" AS ENUM ('HIGH', 'MID', 'ENTRY', 'FIXED');

-- CreateEnum
CREATE TYPE "ContactSubmissionStatus" AS ENUM ('new', 'read', 'replied', 'archived');

-- CreateEnum
CREATE TYPE "TestimonyStatus" AS ENUM ('pending_review', 'approved', 'rejected', 'archived');

-- CreateEnum
CREATE TYPE "TestimonyRole" AS ENUM ('parent', 'athlete', 'coach', 'licensee', 'cit', 'volunteer', 'other');

-- CreateEnum
CREATE TYPE "TestimonySourceType" AS ENUM ('submitted', 'imported', 'internal');

-- CreateEnum
CREATE TYPE "LicenseeApplicationStatus" AS ENUM ('submitted', 'under_review', 'contacted', 'interview_scheduled', 'interview_completed', 'approved', 'rejected', 'withdrawn');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('draft', 'open', 'closed', 'archived');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('seasonal', 'part_time', 'full_time', 'internship', 'contract');

-- CreateEnum
CREATE TYPE "CampDayStatus" AS ENUM ('not_started', 'in_progress', 'finished');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('not_arrived', 'checked_in', 'checked_out', 'absent');

-- CreateEnum
CREATE TYPE "CheckMethod" AS ENUM ('qr', 'manual');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "RoyaltyInvoiceStatus" AS ENUM ('pending', 'invoiced', 'paid', 'overdue', 'disputed', 'waived');

-- CreateEnum
CREATE TYPE "RoyaltyPeriodType" AS ENUM ('camp_session', 'weekly', 'monthly', 'quarterly');

-- CreateEnum
CREATE TYPE "PdfReportType" AS ENUM ('session_report', 'camp_day_report', 'curriculum_export', 'roster_export', 'financial_summary');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('licensee_application_created', 'licensee_application_status_changed', 'cit_application_created', 'cit_application_status_changed', 'camp_registration_completed', 'payment_confirmed', 'camp_reminder', 'schedule_changed', 'camp_day_status_changed', 'camp_day_recap_submitted', 'camp_day_incident_logged', 'grouping_alert', 'incentive_earned', 'compensation_finalized', 'lms_module_assigned', 'lms_module_completed', 'lms_quiz_passed', 'lms_portal_unlocked', 'message_received', 'royalty_invoice_created', 'royalty_invoice_status_changed', 'royalty_invoice_overdue', 'job_posted', 'job_application_status_changed', 'certification_approved', 'certification_rejected', 'certification_expiring', 'system_alert', 'welcome', 'testimony_submitted', 'testimony_approved', 'testimony_rejected', 'squad_invite_received', 'squad_invite_accepted', 'squad_invite_declined');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('licensee', 'camp', 'lms', 'message', 'royalty', 'incentive', 'job', 'certification', 'system', 'marketing');

-- CreateEnum
CREATE TYPE "NotificationSeverity" AS ENUM ('info', 'success', 'warning', 'error');

-- CreateEnum
CREATE TYPE "MessageThreadType" AS ENUM ('licensee_director', 'director_parent', 'director_staff', 'admin_licensee', 'support', 'general');

-- CreateEnum
CREATE TYPE "CurriculumSubmissionStatus" AS ENUM ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'revision_requested');

-- CreateEnum
CREATE TYPE "ComplaintSeverity" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('open', 'investigating', 'resolved', 'dismissed');

-- CreateEnum
CREATE TYPE "SquadMemberStatus" AS ENUM ('requested', 'accepted', 'declined', 'removed');

-- CreateEnum
CREATE TYPE "EmailType" AS ENUM ('registration_confirmation', 'camp_two_weeks_out', 'camp_two_days_before', 'camp_daily_recap', 'camp_session_recap', 'season_followup_jan', 'season_followup_feb', 'season_followup_mar', 'season_followup_apr', 'season_followup_may', 'camp_confirmation', 'camp_reminder', 'daily_recap', 'post_camp', 'staff_message', 'password_reset', 'welcome', 'payment_receipt', 'payment_failed', 'licensee_application', 'licensee_status_update', 'cit_application', 'cit_status_update', 'royalty_invoice', 'royalty_status_update', 'system_alert', 'broadcast');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('sent', 'failed', 'bounced', 'delivered');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('pending', 'accepted', 'expired', 'revoked');

-- CreateEnum
CREATE TYPE "FacilityType" AS ENUM ('school', 'park', 'sports_complex', 'private_gym', 'community_center', 'recreation_center', 'other');

-- CreateEnum
CREATE TYPE "SettingScope" AS ENUM ('GLOBAL', 'TENANT');

-- CreateEnum
CREATE TYPE "SettingValueType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'JSON');

-- CreateEnum
CREATE TYPE "SettingAuditSource" AS ENUM ('ADMIN_UI', 'LICENSEE_UI', 'API', 'SYSTEM');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,
    "primary_color" TEXT DEFAULT '#CCFF00',
    "secondary_color" TEXT DEFAULT '#FF2DCE',
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "timezone" TEXT DEFAULT 'America/New_York',
    "license_status" "LicenseStatus" NOT NULL DEFAULT 'active',
    "license_start_date" DATE,
    "license_end_date" DATE,
    "royalty_rate" DECIMAL(5,4) DEFAULT 0.08,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stripe_account_id" TEXT,
    "stripe_onboarding_complete" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "indoor_outdoor" "IndoorOutdoor",
    "capacity" INTEGER,
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venues" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "address_line_1" TEXT NOT NULL,
    "address_line_2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postal_code" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'US',
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "region_label" TEXT,
    "facility_type" "FacilityType" DEFAULT 'other',
    "indoor_outdoor" "IndoorOutdoor" DEFAULT 'both',
    "sports_supported" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "max_daily_capacity" INTEGER,
    "primary_contact_name" TEXT,
    "primary_contact_email" TEXT,
    "primary_contact_phone" TEXT,
    "notes" TEXT,
    "hero_image_url" TEXT,
    "gallery_image_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "location_id" UUID,
    "venue_id" UUID,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "start_time" TIME(6),
    "end_time" TIME(6),
    "min_age" INTEGER DEFAULT 5,
    "max_age" INTEGER DEFAULT 14,
    "capacity" INTEGER DEFAULT 60,
    "price_cents" INTEGER NOT NULL DEFAULT 0,
    "early_bird_price_cents" INTEGER,
    "early_bird_deadline" DATE,
    "registration_open" DATE,
    "registration_close" DATE,
    "status" "CampStatus" NOT NULL DEFAULT 'draft',
    "grouping_status" "GroupingStatus" NOT NULL DEFAULT 'pending',
    "grouping_run_at" TIMESTAMPTZ(6),
    "grouping_finalized_at" TIMESTAMPTZ(6),
    "grouping_finalized_by" UUID,
    "max_group_size" INTEGER DEFAULT 12,
    "num_groups" INTEGER DEFAULT 5,
    "max_grade_spread" INTEGER DEFAULT 2,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "image_url" TEXT,
    "max_grade" INTEGER,
    "min_grade" INTEGER,
    "program_type" TEXT NOT NULL DEFAULT 'all_girls_sports_camp',
    "sports_offered" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "curriculum_adherence_score" DECIMAL(5,2),

    CONSTRAINT "camps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "phone" TEXT,
    "avatar_url" TEXT,
    "has_completed_lms_core" BOOLEAN NOT NULL DEFAULT false,
    "has_completed_lms_director" BOOLEAN NOT NULL DEFAULT false,
    "has_completed_lms_volunteer" BOOLEAN NOT NULL DEFAULT false,
    "onboarding_completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "city" TEXT,
    "state" TEXT,
    "zip_code" TEXT,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "tenant_id" UUID,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athletes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "parent_id" UUID NOT NULL,
    "tenant_id" UUID,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "gender" "Gender",
    "grade" TEXT,
    "school" TEXT,
    "medical_notes" TEXT,
    "allergies" TEXT,
    "emergency_contact_name" TEXT,
    "emergency_contact_phone" TEXT,
    "emergency_contact_relationship" TEXT,
    "photo_url" TEXT,
    "t_shirt_size" TEXT,
    "jersey_number_preference" TEXT,
    "primary_sport_interest" TEXT,
    "secondary_sport_interest" TEXT,
    "pickup_notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "risk_flag" "AthleteRiskFlag",
    "internal_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "athletes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registrations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "camp_id" UUID NOT NULL,
    "athlete_id" UUID NOT NULL,
    "parent_id" UUID NOT NULL,
    "base_price_cents" INTEGER NOT NULL,
    "discount_cents" INTEGER NOT NULL DEFAULT 0,
    "addons_total_cents" INTEGER NOT NULL DEFAULT 0,
    "total_price_cents" INTEGER NOT NULL,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "payment_method" TEXT,
    "stripe_payment_intent_id" TEXT,
    "stripe_checkout_session_id" TEXT,
    "paid_at" TIMESTAMPTZ(6),
    "friend_requests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "friend_squad_id" UUID,
    "special_considerations" TEXT,
    "shirt_size" TEXT,
    "promo_code_id" UUID,
    "promo_discount_cents" INTEGER NOT NULL DEFAULT 0,
    "waiver_signed" BOOLEAN NOT NULL DEFAULT false,
    "waiver_signed_at" TIMESTAMPTZ(6),
    "waiver_signed_by" TEXT,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'pending',
    "cancelled_at" TIMESTAMPTZ(6),
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discount_type" "DiscountType" NOT NULL,
    "discount_value" INTEGER NOT NULL,
    "max_uses" INTEGER,
    "current_uses" INTEGER NOT NULL DEFAULT 0,
    "min_purchase_cents" INTEGER,
    "valid_from" DATE,
    "valid_until" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "camp_id" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price_cents" INTEGER NOT NULL DEFAULT 0,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "max_quantity" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "addons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addon_variants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "addon_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "price_adjustment_cents" INTEGER NOT NULL DEFAULT 0,
    "inventory" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "addon_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_addons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "registration_id" UUID NOT NULL,
    "addon_id" UUID NOT NULL,
    "variant_id" UUID,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price_cents" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_addons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camper_session_data" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "registration_id" UUID NOT NULL,
    "camp_id" UUID NOT NULL,
    "athlete_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "age_at_camp_start" INTEGER NOT NULL,
    "age_months_at_camp_start" INTEGER NOT NULL,
    "grade_from_registration" TEXT,
    "grade_validated" INTEGER,
    "grade_computed_from_dob" INTEGER,
    "grade_discrepancy" BOOLEAN NOT NULL DEFAULT false,
    "grade_discrepancy_resolved" BOOLEAN NOT NULL DEFAULT false,
    "grade_discrepancy_resolution" TEXT,
    "friend_requests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "friend_request_athlete_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "friend_group_id" UUID,
    "medical_notes" TEXT,
    "allergies" TEXT,
    "special_considerations" TEXT,
    "leadership_potential" BOOLEAN NOT NULL DEFAULT false,
    "leadership_notes" TEXT,
    "registered_at" TIMESTAMPTZ(6) NOT NULL,
    "is_late_registration" BOOLEAN NOT NULL DEFAULT false,
    "assigned_group_id" UUID,
    "assignment_type" "AssignmentType",
    "assignment_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "team_color" "TeamColor",

    CONSTRAINT "camper_session_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "friend_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "camp_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "group_number" INTEGER NOT NULL,
    "member_count" INTEGER NOT NULL DEFAULT 0,
    "min_grade" INTEGER,
    "max_grade" INTEGER,
    "grade_spread" INTEGER,
    "exceeds_grade_constraint" BOOLEAN NOT NULL DEFAULT false,
    "exceeds_size_constraint" BOOLEAN NOT NULL DEFAULT false,
    "can_be_placed_intact" BOOLEAN NOT NULL DEFAULT true,
    "placement_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "friend_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camp_friend_squads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "camp_id" UUID NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Her Squad',
    "created_by_parent_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "camp_friend_squads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camp_friend_squad_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "squad_id" UUID NOT NULL,
    "parent_id" UUID NOT NULL,
    "athlete_id" UUID NOT NULL,
    "status" "SquadMemberStatus" NOT NULL DEFAULT 'requested',
    "invited_by_email" TEXT,
    "responded_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "camp_friend_squad_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_squad_invites" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "squad_id" UUID NOT NULL,
    "invited_email" TEXT NOT NULL,
    "invited_by_name" TEXT,
    "camp_name" TEXT NOT NULL,
    "camp_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "claimed_at" TIMESTAMPTZ(6),
    "claimed_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_squad_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camp_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "camp_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "group_number" INTEGER NOT NULL,
    "group_name" TEXT,
    "group_color" TEXT,
    "camper_count" INTEGER NOT NULL DEFAULT 0,
    "min_grade" INTEGER,
    "max_grade" INTEGER,
    "grade_spread" INTEGER NOT NULL DEFAULT 0,
    "size_violation" BOOLEAN NOT NULL DEFAULT false,
    "grade_violation" BOOLEAN NOT NULL DEFAULT false,
    "friend_violation" BOOLEAN NOT NULL DEFAULT false,
    "has_warnings" BOOLEAN NOT NULL DEFAULT false,
    "has_hard_violations" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "camp_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "camper_session_id" UUID NOT NULL,
    "camp_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "from_group_id" UUID,
    "to_group_id" UUID NOT NULL,
    "assignment_type" "AssignmentType" NOT NULL,
    "reason" TEXT,
    "caused_size_violation" BOOLEAN NOT NULL DEFAULT false,
    "caused_grade_violation" BOOLEAN NOT NULL DEFAULT false,
    "caused_friend_violation" BOOLEAN NOT NULL DEFAULT false,
    "override_acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "override_note" TEXT,
    "assigned_by" UUID,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grouping_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "camp_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "run_type" "GroupingRunType" NOT NULL,
    "triggered_by" UUID,
    "trigger_reason" TEXT,
    "total_campers" INTEGER NOT NULL,
    "total_friend_groups" INTEGER,
    "late_registrations" INTEGER NOT NULL DEFAULT 0,
    "grade_discrepancies" INTEGER NOT NULL DEFAULT 0,
    "max_group_size" INTEGER NOT NULL,
    "num_groups" INTEGER NOT NULL,
    "max_grade_spread" INTEGER NOT NULL,
    "algorithm_version" TEXT DEFAULT '1.0',
    "execution_time_ms" INTEGER,
    "campers_auto_placed" INTEGER NOT NULL DEFAULT 0,
    "friend_groups_placed_intact" INTEGER NOT NULL DEFAULT 0,
    "friend_groups_split" INTEGER NOT NULL DEFAULT 0,
    "constraint_violations" INTEGER NOT NULL DEFAULT 0,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error_message" TEXT,
    "warnings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preserved_manual_overrides" BOOLEAN NOT NULL DEFAULT true,
    "overrides_preserved_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grouping_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "constraint_violations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "camp_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "grouping_run_id" UUID,
    "violation_type" "ViolationType" NOT NULL,
    "severity" "ViolationSeverity" NOT NULL,
    "affected_group_id" UUID,
    "affected_camper_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "affected_friend_group_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "suggested_resolution" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_by" UUID,
    "resolved_at" TIMESTAMPTZ(6),
    "resolution_type" "ResolutionType",
    "resolution_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "constraint_violations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_levels" (
    "id" SERIAL NOT NULL,
    "grade_name" TEXT NOT NULL,
    "grade_short" TEXT NOT NULL,
    "grade_numeric" INTEGER NOT NULL,
    "typical_age_start" INTEGER NOT NULL,
    "typical_age_end" INTEGER NOT NULL,

    CONSTRAINT "grade_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_report_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "camp_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "report_type" "ReportType" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "groups_snapshot" JSONB NOT NULL,
    "campers_snapshot" JSONB NOT NULL,
    "violations_snapshot" JSONB,
    "stats_snapshot" JSONB NOT NULL,
    "generated_by" UUID,
    "generated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "amends_report_id" UUID,
    "amendment_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_report_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "licensee_id" UUID,
    "sport" "SportType" NOT NULL DEFAULT 'multi_sport',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "age_min" INTEGER,
    "age_max" INTEGER,
    "difficulty" "DifficultyLevel" NOT NULL DEFAULT 'intro',
    "is_global" BOOLEAN NOT NULL DEFAULT false,
    "total_days" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curriculum_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_blocks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "licensee_id" UUID,
    "sport" "SportType" NOT NULL DEFAULT 'multi_sport',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "duration_minutes" INTEGER NOT NULL DEFAULT 15,
    "category" "BlockCategory" NOT NULL DEFAULT 'drill',
    "intensity" "IntensityLevel" NOT NULL DEFAULT 'moderate',
    "equipment_needed" TEXT,
    "setup_notes" TEXT,
    "coaching_points" TEXT,
    "is_global" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curriculum_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_template_days" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "template_id" UUID NOT NULL,
    "day_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "theme" TEXT,
    "notes" TEXT,
    "total_duration_minutes" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curriculum_template_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_day_blocks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "day_id" UUID NOT NULL,
    "block_id" UUID NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "custom_title" TEXT,
    "custom_duration_minutes" INTEGER,
    "custom_notes" TEXT,
    "field_location" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curriculum_day_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camp_session_curriculum" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "camp_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "assigned_by" UUID,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "camp_session_curriculum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camp_session_days" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "camp_id" UUID NOT NULL,
    "day_number" INTEGER NOT NULL,
    "actual_date" DATE,
    "title" TEXT NOT NULL,
    "theme" TEXT,
    "notes" TEXT,
    "status" "SessionDayStatus" NOT NULL DEFAULT 'planned',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "camp_session_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camp_session_schedule_blocks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "camp_session_day_id" UUID NOT NULL,
    "start_time" TIME(6) NOT NULL,
    "end_time" TIME(6) NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "curriculum_block_id" UUID,
    "location" TEXT,
    "assigned_staff_notes" TEXT,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "block_type" "ScheduleBlockType" NOT NULL DEFAULT 'activity',
    "color_code" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "camp_session_schedule_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "licensee_id" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "default_start_time" TIME(6) NOT NULL DEFAULT '09:00:00'::time without time zone,
    "default_end_time" TIME(6) NOT NULL DEFAULT '15:00:00'::time without time zone,
    "total_days" INTEGER NOT NULL DEFAULT 1,
    "sport" TEXT,
    "is_global" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_template_blocks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "template_id" UUID NOT NULL,
    "day_number" INTEGER NOT NULL DEFAULT 1,
    "start_time" TIME(6) NOT NULL,
    "end_time" TIME(6) NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "default_location" TEXT,
    "block_type" "ScheduleBlockType" NOT NULL DEFAULT 'activity',
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_template_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteer_certifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "document_url" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "document_name" TEXT,
    "status" "CertificationStatus" NOT NULL DEFAULT 'pending_review',
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    "reviewed_at" TIMESTAMPTZ(6),
    "reviewed_by_profile_id" UUID,
    "notes" TEXT,
    "reviewer_notes" TEXT,
    "tenant_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "volunteer_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms_modules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "required_for_roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "content_url" TEXT,
    "duration_minutes" INTEGER NOT NULL DEFAULT 30,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "module_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "progress_percent" INTEGER NOT NULL DEFAULT 0,
    "quiz_score" INTEGER,
    "quiz_passed" BOOLEAN,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "licensee_id" UUID,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "category" "ShopCategory" NOT NULL DEFAULT 'apparel',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "price_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "image_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "stripe_product_id" TEXT,
    "stripe_price_id" TEXT,
    "inventory_quantity" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_product_variants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "price_cents" INTEGER,
    "inventory_quantity" INTEGER,
    "stripe_price_id" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID,
    "licensee_id" UUID,
    "stripe_checkout_session_id" TEXT,
    "stripe_payment_intent_id" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'pending',
    "subtotal_cents" INTEGER NOT NULL DEFAULT 0,
    "tax_cents" INTEGER NOT NULL DEFAULT 0,
    "shipping_cents" INTEGER NOT NULL DEFAULT 0,
    "total_cents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "customer_name" TEXT,
    "customer_email" TEXT,
    "shipping_address" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "quantity" INTEGER NOT NULL,
    "unit_price_cents" INTEGER NOT NULL,
    "total_price_cents" INTEGER NOT NULL,
    "product_name" TEXT NOT NULL,
    "variant_name" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL DEFAULT 'null',
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "territories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "country" TEXT NOT NULL,
    "state_region" TEXT NOT NULL,
    "city" TEXT,
    "postal_codes" TEXT,
    "tenant_id" UUID,
    "status" "TerritoryStatus" NOT NULL DEFAULT 'open',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "territories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cit_applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "city" TEXT,
    "state" TEXT,
    "school_name" TEXT,
    "grade_level" TEXT,
    "graduation_year" TEXT,
    "sports_played" TEXT,
    "experience_summary" TEXT,
    "why_cit" TEXT,
    "leadership_experience" TEXT,
    "availability_notes" TEXT,
    "parent_name" TEXT,
    "parent_email" TEXT,
    "parent_phone" TEXT,
    "status" "CitApplicationStatus" NOT NULL DEFAULT 'applied',
    "assigned_licensee_id" UUID,
    "assigned_director_id" UUID,
    "notes_internal" TEXT,
    "how_heard" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cit_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cit_progress_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cit_application_id" UUID NOT NULL,
    "type" "CitProgressEventType" NOT NULL,
    "from_status" "CitApplicationStatus",
    "to_status" "CitApplicationStatus",
    "details" TEXT,
    "changed_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cit_progress_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cit_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cit_application_id" UUID NOT NULL,
    "camp_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'cit',
    "status" TEXT NOT NULL DEFAULT 'planned',
    "notes" TEXT,
    "assigned_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cit_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "inquiry_type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "athlete_info" TEXT,
    "organization" TEXT,
    "location" TEXT,
    "status" "ContactSubmissionStatus" NOT NULL DEFAULT 'new',
    "responded_by" UUID,
    "responded_at" TIMESTAMPTZ(6),
    "internal_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimonies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "author_name" TEXT NOT NULL,
    "author_email" TEXT,
    "author_role" "TestimonyRole" NOT NULL,
    "author_relationship" TEXT,
    "headline" TEXT,
    "body" TEXT NOT NULL,
    "photo_url" TEXT,
    "video_url" TEXT,
    "camp_session_id" UUID,
    "program_type" TEXT,
    "status" "TestimonyStatus" NOT NULL DEFAULT 'pending_review',
    "source_type" "TestimonySourceType" NOT NULL DEFAULT 'submitted',
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER,
    "review_notes" TEXT,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "testimonies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licensee_applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company_name" TEXT,
    "website" TEXT,
    "city" TEXT,
    "state" TEXT,
    "territory_interest" TEXT,
    "business_experience" TEXT,
    "sports_background" TEXT,
    "why_interested" TEXT,
    "investment_capacity" TEXT,
    "how_heard" TEXT,
    "status" "LicenseeApplicationStatus" NOT NULL DEFAULT 'submitted',
    "assigned_territory_id" UUID,
    "internal_notes" TEXT,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "licensee_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_postings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "short_description" TEXT NOT NULL,
    "full_description" TEXT NOT NULL,
    "location_label" TEXT NOT NULL,
    "employment_type" "EmploymentType" NOT NULL DEFAULT 'seasonal',
    "is_remote_friendly" BOOLEAN NOT NULL DEFAULT false,
    "min_comp_cents" INTEGER,
    "max_comp_cents" INTEGER,
    "comp_frequency" TEXT,
    "application_instructions" TEXT,
    "application_email" TEXT,
    "application_url" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'draft',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "tenant_id" UUID,
    "created_by_user_id" UUID NOT NULL,
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_postings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camp_days" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "camp_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "day_number" INTEGER NOT NULL,
    "title" TEXT,
    "status" "CampDayStatus" NOT NULL DEFAULT 'not_started',
    "notes" TEXT,
    "completed_at" TIMESTAMPTZ(6),
    "completed_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "camp_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camp_attendance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "camp_day_id" UUID NOT NULL,
    "athlete_id" UUID NOT NULL,
    "parent_profile_id" UUID NOT NULL,
    "registration_id" UUID NOT NULL,
    "group_id" UUID,
    "check_in_time" TIMESTAMPTZ(6),
    "check_in_method" "CheckMethod",
    "check_in_by_user_id" UUID,
    "check_in_notes" TEXT,
    "check_out_time" TIMESTAMPTZ(6),
    "check_out_method" "CheckMethod",
    "check_out_by_user_id" UUID,
    "check_out_notes" TEXT,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'not_arrived',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "camp_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pickup_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "camp_day_id" UUID NOT NULL,
    "athlete_id" UUID NOT NULL,
    "parent_profile_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "used_at" TIMESTAMPTZ(6),
    "used_by_user_id" UUID,
    "manual_reason" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pickup_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camp_incidents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "camp_day_id" UUID NOT NULL,
    "athlete_id" UUID,
    "schedule_block_id" UUID,
    "reported_by_user_id" UUID NOT NULL,
    "incident_type" TEXT NOT NULL,
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'low',
    "description" TEXT NOT NULL,
    "action_taken" TEXT,
    "parent_notified" BOOLEAN NOT NULL DEFAULT false,
    "parent_notified_at" TIMESTAMPTZ(6),
    "resolved_at" TIMESTAMPTZ(6),
    "resolved_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "camp_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_block_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "camp_day_id" UUID NOT NULL,
    "schedule_block_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "started_by_user_id" UUID,
    "completed_by_user_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_block_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_onboarding" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "parent_profile_id" UUID NOT NULL,
    "camp_id" UUID NOT NULL,
    "athlete_id" UUID NOT NULL,
    "emergency_contact_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "medical_info_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "pickup_auth_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "waiver_accepted" BOOLEAN NOT NULL DEFAULT false,
    "waiver_accepted_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parent_onboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authorized_pickups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "parent_profile_id" UUID NOT NULL,
    "athlete_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone" TEXT,
    "photo_id_on_file" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authorized_pickups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camp_staff_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "camp_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "is_lead" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "call_time" TIME(6),
    "end_time" TIME(6),
    "notes" TEXT,
    "station_name" TEXT,

    CONSTRAINT "camp_staff_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empoweru_modules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "portal_type" "PortalType" NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "video_provider" "VideoProvider" NOT NULL DEFAULT 'YOUTUBE',
    "video_url" TEXT,
    "estimated_minutes" INTEGER NOT NULL DEFAULT 30,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_by_user_id" UUID,
    "contribution_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empoweru_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empoweru_quizzes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "module_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "passing_score" INTEGER NOT NULL DEFAULT 80,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empoweru_quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empoweru_quiz_questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quiz_id" UUID NOT NULL,
    "question_text" TEXT NOT NULL,
    "question_type" "QuestionType" NOT NULL DEFAULT 'MULTIPLE_CHOICE',
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empoweru_quiz_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empoweru_quiz_options" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "question_id" UUID NOT NULL,
    "option_text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empoweru_quiz_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empoweru_module_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "module_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "tenant_id" UUID,
    "status" "EmpowerUProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "quiz_score" INTEGER,
    "quiz_passed" BOOLEAN,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empoweru_module_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empoweru_contributions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "submitted_by_user_id" UUID NOT NULL,
    "submitted_by_role" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "portal_type" "PortalType" NOT NULL,
    "video_url" TEXT,
    "attachment_url" TEXT,
    "status" "ContributionStatus" NOT NULL DEFAULT 'PENDING',
    "admin_reviewer_id" UUID,
    "admin_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empoweru_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empoweru_unlock_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "portal_type" "PortalType" NOT NULL,
    "unlock_feature_code" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empoweru_unlock_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empoweru_unlock_rule_modules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rule_id" UUID NOT NULL,
    "module_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empoweru_unlock_rule_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empoweru_user_unlocks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "tenant_id" UUID,
    "feature_code" TEXT NOT NULL,
    "unlocked_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empoweru_user_unlocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compensation_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "plan_code" "CompensationPlanCode" NOT NULL,
    "pre_camp_stipend_amount" DECIMAL(10,2) NOT NULL,
    "on_site_stipend_amount" DECIMAL(10,2) NOT NULL,
    "enrollment_threshold" INTEGER,
    "enrollment_bonus_per_camper" DECIMAL(10,2),
    "csat_required_score" DECIMAL(3,2),
    "csat_bonus_amount" DECIMAL(10,2),
    "budget_efficiency_rate" DECIMAL(5,4),
    "guest_speaker_required_count" INTEGER,
    "guest_speaker_bonus_amount" DECIMAL(10,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compensation_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camp_session_compensations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "camp_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "staff_profile_id" UUID NOT NULL,
    "compensation_plan_id" UUID NOT NULL,
    "pre_camp_stipend_amount" DECIMAL(10,2) NOT NULL,
    "on_site_stipend_amount" DECIMAL(10,2) NOT NULL,
    "enrollment_threshold" INTEGER,
    "enrollment_bonus_per_camper" DECIMAL(10,2),
    "csat_required_score" DECIMAL(3,2),
    "csat_bonus_amount" DECIMAL(10,2),
    "budget_efficiency_rate" DECIMAL(5,4),
    "guest_speaker_required_count" INTEGER,
    "guest_speaker_bonus_amount" DECIMAL(10,2),
    "total_enrolled_campers" INTEGER,
    "csat_avg_score" DECIMAL(3,2),
    "budget_preapproved_total" DECIMAL(10,2),
    "budget_actual_total" DECIMAL(10,2),
    "budget_savings_amount" DECIMAL(10,2),
    "guest_speaker_count" INTEGER,
    "enrollment_bonus_earned" DECIMAL(10,2),
    "csat_bonus_earned" DECIMAL(10,2),
    "budget_efficiency_bonus_earned" DECIMAL(10,2),
    "guest_speaker_bonus_earned" DECIMAL(10,2),
    "fixed_stipend_total" DECIMAL(10,2),
    "total_variable_bonus" DECIMAL(10,2),
    "total_compensation" DECIMAL(10,2),
    "calculated_at" TIMESTAMPTZ(6),
    "is_finalized" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "camp_session_compensations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camp_day_compensation_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "camp_day_id" UUID NOT NULL,
    "camp_id" UUID NOT NULL,
    "staff_profile_id" UUID NOT NULL,
    "session_compensation_id" UUID NOT NULL,
    "day_enrolled_campers" INTEGER,
    "day_checked_in_count" INTEGER,
    "day_checked_out_count" INTEGER,
    "day_no_show_count" INTEGER,
    "day_csat_avg_score" DECIMAL(3,2),
    "day_guest_speaker_count" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "camp_day_compensation_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "royalty_invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "camp_id" UUID,
    "invoice_number" TEXT NOT NULL,
    "period_type" "RoyaltyPeriodType" NOT NULL DEFAULT 'camp_session',
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "gross_revenue_cents" INTEGER NOT NULL,
    "registration_revenue_cents" INTEGER NOT NULL,
    "addon_revenue_cents" INTEGER NOT NULL DEFAULT 0,
    "merchandise_revenue_cents" INTEGER NOT NULL DEFAULT 0,
    "refunds_total_cents" INTEGER NOT NULL DEFAULT 0,
    "net_revenue_cents" INTEGER NOT NULL,
    "royalty_rate_bps" INTEGER NOT NULL,
    "royalty_due_cents" INTEGER NOT NULL,
    "adjustment_cents" INTEGER NOT NULL DEFAULT 0,
    "adjustment_notes" TEXT,
    "total_due_cents" INTEGER NOT NULL,
    "status" "RoyaltyInvoiceStatus" NOT NULL DEFAULT 'pending',
    "due_date" DATE NOT NULL,
    "generated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generated_by" UUID,
    "paid_at" TIMESTAMPTZ(6),
    "paid_amount_cents" INTEGER,
    "payment_method" TEXT,
    "payment_reference" TEXT,
    "paid_by" UUID,
    "notes" TEXT,
    "dispute_reason" TEXT,
    "disputed_at" TIMESTAMPTZ(6),
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "royalty_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "royalty_line_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_amount_cents" INTEGER NOT NULL,
    "total_amount_cents" INTEGER NOT NULL,
    "royalty_applies" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "royalty_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pdf_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "type" "PdfReportType" NOT NULL,
    "resource_id" UUID NOT NULL,
    "url" TEXT,
    "file_name" TEXT,
    "generated_by" UUID,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),

    CONSTRAINT "pdf_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "tenant_id" UUID,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "action_url" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" "NotificationCategory" NOT NULL DEFAULT 'system',
    "data" JSONB,
    "severity" "NotificationSeverity" NOT NULL DEFAULT 'info',
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "tenant_id" UUID,
    "category" "NotificationCategory" NOT NULL,
    "enabled_in_app" BOOLEAN NOT NULL DEFAULT true,
    "enabled_email" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_threads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "type" "MessageThreadType" NOT NULL DEFAULT 'general',
    "subject" TEXT,
    "last_message_at" TIMESTAMPTZ(6),
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_participants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "thread_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "last_read_at" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "thread_id" UUID NOT NULL,
    "from_user_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "gross_revenue_cents" INTEGER NOT NULL,
    "net_revenue_cents" INTEGER NOT NULL,
    "refunds_cents" INTEGER NOT NULL DEFAULT 0,
    "total_campers" INTEGER NOT NULL DEFAULT 0,
    "arpc_cents" INTEGER NOT NULL DEFAULT 0,
    "sessions_held" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "submitted_by_user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sport" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "video_url" TEXT,
    "attachment_url" TEXT,
    "status" "CurriculumSubmissionStatus" NOT NULL DEFAULT 'draft',
    "admin_notes" TEXT,
    "reviewed_by_user_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "approved_block_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curriculum_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_surveys" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "camp_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "parent_profile_id" UUID NOT NULL,
    "athlete_id" UUID,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "staff_rating" INTEGER,
    "activities_rating" INTEGER,
    "communication_rating" INTEGER,
    "safety_rating" INTEGER,
    "value_rating" INTEGER,
    "would_recommend" BOOLEAN,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_complaints" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "camp_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "parent_profile_id" UUID,
    "athlete_id" UUID,
    "category" TEXT NOT NULL,
    "severity" "ComplaintSeverity" NOT NULL DEFAULT 'medium',
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'open',
    "assigned_to_id" UUID,
    "resolution" TEXT,
    "resolved_at" TIMESTAMPTZ(6),
    "resolved_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "user_id" UUID,
    "to_email" TEXT NOT NULL,
    "from_email" TEXT,
    "subject" TEXT NOT NULL,
    "email_type" "EmailType" NOT NULL,
    "payload" JSONB,
    "provider_message_id" TEXT,
    "status" "EmailStatus" NOT NULL DEFAULT 'sent',
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "email_type" "EmailType" NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body_html" TEXT NOT NULL,
    "body_text" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "available_vars" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camp_day_recaps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "camp_day_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "submitted_by_user_id" UUID NOT NULL,
    "day_theme" TEXT,
    "word_of_the_day" TEXT,
    "word_of_the_day_example" TEXT,
    "primary_sport" TEXT,
    "primary_sport_focus" TEXT,
    "secondary_sport" TEXT,
    "secondary_sport_focus" TEXT,
    "guest_speaker_name" TEXT,
    "guest_speaker_title" TEXT,
    "guest_speaker_topic" TEXT,
    "pink_point_skill" TEXT,
    "purple_point_skill" TEXT,
    "tomorrow_sport_1" TEXT,
    "tomorrow_sport_2" TEXT,
    "tomorrow_word_of_the_day" TEXT,
    "local_resources" JSONB,
    "photo_urls" JSONB,
    "highlights" TEXT,
    "emails_sent_at" TIMESTAMPTZ(6),
    "emails_sent_count" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "camp_day_recaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_invites" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "invited_by_user_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "phone" TEXT,
    "target_role" "UserRole" NOT NULL,
    "token" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "status" "InviteStatus" NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_at" TIMESTAMPTZ(6),
    "accepted_user_id" UUID,
    "last_email_sent_at" TIMESTAMPTZ(6),
    "email_sent_count" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scope" "SettingScope" NOT NULL DEFAULT 'GLOBAL',
    "tenant_id" UUID,
    "key" TEXT NOT NULL,
    "value_json" JSONB NOT NULL DEFAULT 'null',
    "value_type" "SettingValueType" NOT NULL DEFAULT 'STRING',
    "description" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "setting_id" UUID,
    "scope" "SettingScope" NOT NULL,
    "tenant_id" UUID,
    "key" TEXT NOT NULL,
    "old_value_json" JSONB,
    "new_value_json" JSONB NOT NULL,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by_user_id" UUID,
    "source" "SettingAuditSource" NOT NULL DEFAULT 'ADMIN_UI',

    CONSTRAINT "settings_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "locations_tenant_id_idx" ON "locations"("tenant_id");

-- CreateIndex
CREATE INDEX "venues_tenant_id_idx" ON "venues"("tenant_id");

-- CreateIndex
CREATE INDEX "venues_city_state_idx" ON "venues"("city", "state");

-- CreateIndex
CREATE INDEX "venues_is_active_idx" ON "venues"("is_active");

-- CreateIndex
CREATE INDEX "camps_tenant_id_idx" ON "camps"("tenant_id");

-- CreateIndex
CREATE INDEX "camps_start_date_end_date_idx" ON "camps"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "camps_status_idx" ON "camps"("status");

-- CreateIndex
CREATE UNIQUE INDEX "camps_tenant_id_slug_key" ON "camps"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "user_roles_user_id_idx" ON "user_roles"("user_id");

-- CreateIndex
CREATE INDEX "user_roles_tenant_id_idx" ON "user_roles"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_tenant_id_role_key" ON "user_roles"("user_id", "tenant_id", "role");

-- CreateIndex
CREATE INDEX "athletes_parent_id_idx" ON "athletes"("parent_id");

-- CreateIndex
CREATE INDEX "athletes_tenant_id_idx" ON "athletes"("tenant_id");

-- CreateIndex
CREATE INDEX "registrations_camp_id_idx" ON "registrations"("camp_id");

-- CreateIndex
CREATE INDEX "registrations_athlete_id_idx" ON "registrations"("athlete_id");

-- CreateIndex
CREATE INDEX "registrations_parent_id_idx" ON "registrations"("parent_id");

-- CreateIndex
CREATE INDEX "registrations_status_idx" ON "registrations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "registrations_camp_id_athlete_id_key" ON "registrations"("camp_id", "athlete_id");

-- CreateIndex
CREATE UNIQUE INDEX "promo_codes_tenant_id_code_key" ON "promo_codes"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "camper_session_data_registration_id_key" ON "camper_session_data"("registration_id");

-- CreateIndex
CREATE INDEX "camper_session_data_camp_id_idx" ON "camper_session_data"("camp_id");

-- CreateIndex
CREATE INDEX "camper_session_data_tenant_id_idx" ON "camper_session_data"("tenant_id");

-- CreateIndex
CREATE INDEX "camper_session_data_friend_group_id_idx" ON "camper_session_data"("friend_group_id");

-- CreateIndex
CREATE INDEX "camper_session_data_assigned_group_id_idx" ON "camper_session_data"("assigned_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "camper_session_data_camp_id_athlete_id_key" ON "camper_session_data"("camp_id", "athlete_id");

-- CreateIndex
CREATE INDEX "friend_groups_camp_id_idx" ON "friend_groups"("camp_id");

-- CreateIndex
CREATE UNIQUE INDEX "friend_groups_camp_id_group_number_key" ON "friend_groups"("camp_id", "group_number");

-- CreateIndex
CREATE INDEX "camp_friend_squads_camp_id_idx" ON "camp_friend_squads"("camp_id");

-- CreateIndex
CREATE INDEX "camp_friend_squads_tenant_id_idx" ON "camp_friend_squads"("tenant_id");

-- CreateIndex
CREATE INDEX "camp_friend_squads_created_by_parent_id_idx" ON "camp_friend_squads"("created_by_parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "camp_friend_squads_camp_id_created_by_parent_id_key" ON "camp_friend_squads"("camp_id", "created_by_parent_id");

-- CreateIndex
CREATE INDEX "camp_friend_squad_members_squad_id_idx" ON "camp_friend_squad_members"("squad_id");

-- CreateIndex
CREATE INDEX "camp_friend_squad_members_parent_id_idx" ON "camp_friend_squad_members"("parent_id");

-- CreateIndex
CREATE INDEX "camp_friend_squad_members_athlete_id_idx" ON "camp_friend_squad_members"("athlete_id");

-- CreateIndex
CREATE INDEX "camp_friend_squad_members_status_idx" ON "camp_friend_squad_members"("status");

-- CreateIndex
CREATE UNIQUE INDEX "camp_friend_squad_members_squad_id_athlete_id_key" ON "camp_friend_squad_members"("squad_id", "athlete_id");

-- CreateIndex
CREATE INDEX "pending_squad_invites_invited_email_idx" ON "pending_squad_invites"("invited_email");

-- CreateIndex
CREATE INDEX "pending_squad_invites_squad_id_idx" ON "pending_squad_invites"("squad_id");

-- CreateIndex
CREATE INDEX "pending_squad_invites_expires_at_idx" ON "pending_squad_invites"("expires_at");

-- CreateIndex
CREATE INDEX "camp_groups_camp_id_idx" ON "camp_groups"("camp_id");

-- CreateIndex
CREATE UNIQUE INDEX "camp_groups_camp_id_group_number_key" ON "camp_groups"("camp_id", "group_number");

-- CreateIndex
CREATE INDEX "group_assignments_camp_id_idx" ON "group_assignments"("camp_id");

-- CreateIndex
CREATE INDEX "group_assignments_camper_session_id_idx" ON "group_assignments"("camper_session_id");

-- CreateIndex
CREATE INDEX "grouping_runs_camp_id_idx" ON "grouping_runs"("camp_id");

-- CreateIndex
CREATE INDEX "constraint_violations_camp_id_idx" ON "constraint_violations"("camp_id");

-- CreateIndex
CREATE INDEX "constraint_violations_camp_id_resolved_idx" ON "constraint_violations"("camp_id", "resolved");

-- CreateIndex
CREATE UNIQUE INDEX "grade_levels_grade_name_key" ON "grade_levels"("grade_name");

-- CreateIndex
CREATE UNIQUE INDEX "grade_levels_grade_short_key" ON "grade_levels"("grade_short");

-- CreateIndex
CREATE UNIQUE INDEX "grade_levels_grade_numeric_key" ON "grade_levels"("grade_numeric");

-- CreateIndex
CREATE INDEX "group_report_snapshots_camp_id_idx" ON "group_report_snapshots"("camp_id");

-- CreateIndex
CREATE INDEX "curriculum_templates_licensee_id_idx" ON "curriculum_templates"("licensee_id");

-- CreateIndex
CREATE INDEX "curriculum_templates_sport_idx" ON "curriculum_templates"("sport");

-- CreateIndex
CREATE INDEX "curriculum_templates_is_global_idx" ON "curriculum_templates"("is_global");

-- CreateIndex
CREATE INDEX "curriculum_templates_is_active_idx" ON "curriculum_templates"("is_active");

-- CreateIndex
CREATE INDEX "curriculum_blocks_licensee_id_idx" ON "curriculum_blocks"("licensee_id");

-- CreateIndex
CREATE INDEX "curriculum_blocks_sport_idx" ON "curriculum_blocks"("sport");

-- CreateIndex
CREATE INDEX "curriculum_blocks_category_idx" ON "curriculum_blocks"("category");

-- CreateIndex
CREATE INDEX "curriculum_blocks_is_global_idx" ON "curriculum_blocks"("is_global");

-- CreateIndex
CREATE INDEX "curriculum_template_days_template_id_idx" ON "curriculum_template_days"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_template_days_template_id_day_number_key" ON "curriculum_template_days"("template_id", "day_number");

-- CreateIndex
CREATE INDEX "curriculum_day_blocks_day_id_idx" ON "curriculum_day_blocks"("day_id");

-- CreateIndex
CREATE INDEX "curriculum_day_blocks_block_id_idx" ON "curriculum_day_blocks"("block_id");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_day_blocks_day_id_order_index_key" ON "curriculum_day_blocks"("day_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "camp_session_curriculum_camp_id_key" ON "camp_session_curriculum"("camp_id");

-- CreateIndex
CREATE INDEX "camp_session_curriculum_camp_id_idx" ON "camp_session_curriculum"("camp_id");

-- CreateIndex
CREATE INDEX "camp_session_curriculum_template_id_idx" ON "camp_session_curriculum"("template_id");

-- CreateIndex
CREATE INDEX "camp_session_days_camp_id_idx" ON "camp_session_days"("camp_id");

-- CreateIndex
CREATE INDEX "camp_session_days_actual_date_idx" ON "camp_session_days"("actual_date");

-- CreateIndex
CREATE UNIQUE INDEX "camp_session_days_camp_id_day_number_key" ON "camp_session_days"("camp_id", "day_number");

-- CreateIndex
CREATE INDEX "camp_session_schedule_blocks_camp_session_day_id_idx" ON "camp_session_schedule_blocks"("camp_session_day_id");

-- CreateIndex
CREATE INDEX "camp_session_schedule_blocks_curriculum_block_id_idx" ON "camp_session_schedule_blocks"("curriculum_block_id");

-- CreateIndex
CREATE INDEX "camp_session_schedule_blocks_camp_session_day_id_order_inde_idx" ON "camp_session_schedule_blocks"("camp_session_day_id", "order_index");

-- CreateIndex
CREATE INDEX "camp_session_schedule_blocks_camp_session_day_id_start_time_idx" ON "camp_session_schedule_blocks"("camp_session_day_id", "start_time");

-- CreateIndex
CREATE INDEX "schedule_templates_licensee_id_idx" ON "schedule_templates"("licensee_id");

-- CreateIndex
CREATE INDEX "schedule_templates_is_global_idx" ON "schedule_templates"("is_global");

-- CreateIndex
CREATE INDEX "schedule_template_blocks_template_id_idx" ON "schedule_template_blocks"("template_id");

-- CreateIndex
CREATE INDEX "schedule_template_blocks_template_id_day_number_idx" ON "schedule_template_blocks"("template_id", "day_number");

-- CreateIndex
CREATE INDEX "volunteer_certifications_profile_id_idx" ON "volunteer_certifications"("profile_id");

-- CreateIndex
CREATE INDEX "volunteer_certifications_status_idx" ON "volunteer_certifications"("status");

-- CreateIndex
CREATE INDEX "volunteer_certifications_tenant_id_idx" ON "volunteer_certifications"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "lms_modules_slug_key" ON "lms_modules"("slug");

-- CreateIndex
CREATE INDEX "lms_progress_profile_id_idx" ON "lms_progress"("profile_id");

-- CreateIndex
CREATE INDEX "lms_progress_completed_at_idx" ON "lms_progress"("completed_at");

-- CreateIndex
CREATE UNIQUE INDEX "lms_progress_profile_id_module_id_key" ON "lms_progress"("profile_id", "module_id");

-- CreateIndex
CREATE UNIQUE INDEX "shop_products_slug_key" ON "shop_products"("slug");

-- CreateIndex
CREATE INDEX "shop_products_slug_idx" ON "shop_products"("slug");

-- CreateIndex
CREATE INDEX "shop_products_category_idx" ON "shop_products"("category");

-- CreateIndex
CREATE INDEX "shop_products_licensee_id_idx" ON "shop_products"("licensee_id");

-- CreateIndex
CREATE INDEX "shop_products_is_active_is_featured_idx" ON "shop_products"("is_active", "is_featured");

-- CreateIndex
CREATE INDEX "shop_product_variants_product_id_idx" ON "shop_product_variants"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "shop_orders_stripe_checkout_session_id_key" ON "shop_orders"("stripe_checkout_session_id");

-- CreateIndex
CREATE INDEX "shop_orders_profile_id_idx" ON "shop_orders"("profile_id");

-- CreateIndex
CREATE INDEX "shop_orders_licensee_id_idx" ON "shop_orders"("licensee_id");

-- CreateIndex
CREATE INDEX "shop_orders_status_idx" ON "shop_orders"("status");

-- CreateIndex
CREATE INDEX "shop_orders_stripe_checkout_session_id_idx" ON "shop_orders"("stripe_checkout_session_id");

-- CreateIndex
CREATE INDEX "shop_order_items_order_id_idx" ON "shop_order_items"("order_id");

-- CreateIndex
CREATE INDEX "shop_order_items_product_id_idx" ON "shop_order_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "shop_settings_key_key" ON "shop_settings"("key");

-- CreateIndex
CREATE INDEX "shop_settings_key_idx" ON "shop_settings"("key");

-- CreateIndex
CREATE INDEX "territories_tenant_id_idx" ON "territories"("tenant_id");

-- CreateIndex
CREATE INDEX "territories_status_idx" ON "territories"("status");

-- CreateIndex
CREATE INDEX "cit_applications_email_idx" ON "cit_applications"("email");

-- CreateIndex
CREATE INDEX "cit_applications_status_idx" ON "cit_applications"("status");

-- CreateIndex
CREATE INDEX "cit_applications_assigned_licensee_id_idx" ON "cit_applications"("assigned_licensee_id");

-- CreateIndex
CREATE INDEX "cit_applications_created_at_idx" ON "cit_applications"("created_at");

-- CreateIndex
CREATE INDEX "cit_progress_events_cit_application_id_idx" ON "cit_progress_events"("cit_application_id");

-- CreateIndex
CREATE INDEX "cit_progress_events_created_at_idx" ON "cit_progress_events"("created_at");

-- CreateIndex
CREATE INDEX "cit_assignments_cit_application_id_idx" ON "cit_assignments"("cit_application_id");

-- CreateIndex
CREATE INDEX "cit_assignments_camp_id_idx" ON "cit_assignments"("camp_id");

-- CreateIndex
CREATE INDEX "cit_assignments_status_idx" ON "cit_assignments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "cit_assignments_cit_application_id_camp_id_key" ON "cit_assignments"("cit_application_id", "camp_id");

-- CreateIndex
CREATE INDEX "contact_submissions_email_idx" ON "contact_submissions"("email");

-- CreateIndex
CREATE INDEX "contact_submissions_status_idx" ON "contact_submissions"("status");

-- CreateIndex
CREATE INDEX "contact_submissions_inquiry_type_idx" ON "contact_submissions"("inquiry_type");

-- CreateIndex
CREATE INDEX "contact_submissions_created_at_idx" ON "contact_submissions"("created_at");

-- CreateIndex
CREATE INDEX "testimonies_tenant_id_idx" ON "testimonies"("tenant_id");

-- CreateIndex
CREATE INDEX "testimonies_status_idx" ON "testimonies"("status");

-- CreateIndex
CREATE INDEX "testimonies_is_featured_idx" ON "testimonies"("is_featured");

-- CreateIndex
CREATE INDEX "testimonies_created_at_idx" ON "testimonies"("created_at");

-- CreateIndex
CREATE INDEX "testimonies_author_role_idx" ON "testimonies"("author_role");

-- CreateIndex
CREATE INDEX "licensee_applications_email_idx" ON "licensee_applications"("email");

-- CreateIndex
CREATE INDEX "licensee_applications_status_idx" ON "licensee_applications"("status");

-- CreateIndex
CREATE INDEX "licensee_applications_state_idx" ON "licensee_applications"("state");

-- CreateIndex
CREATE INDEX "licensee_applications_created_at_idx" ON "licensee_applications"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "job_postings_slug_key" ON "job_postings"("slug");

-- CreateIndex
CREATE INDEX "job_postings_status_idx" ON "job_postings"("status");

-- CreateIndex
CREATE INDEX "job_postings_tenant_id_idx" ON "job_postings"("tenant_id");

-- CreateIndex
CREATE INDEX "job_postings_employment_type_idx" ON "job_postings"("employment_type");

-- CreateIndex
CREATE INDEX "job_postings_created_at_idx" ON "job_postings"("created_at");

-- CreateIndex
CREATE INDEX "job_postings_priority_idx" ON "job_postings"("priority");

-- CreateIndex
CREATE INDEX "camp_days_camp_id_idx" ON "camp_days"("camp_id");

-- CreateIndex
CREATE INDEX "camp_days_date_idx" ON "camp_days"("date");

-- CreateIndex
CREATE INDEX "camp_days_status_idx" ON "camp_days"("status");

-- CreateIndex
CREATE UNIQUE INDEX "camp_days_camp_id_date_key" ON "camp_days"("camp_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "camp_days_camp_id_day_number_key" ON "camp_days"("camp_id", "day_number");

-- CreateIndex
CREATE INDEX "camp_attendance_camp_day_id_idx" ON "camp_attendance"("camp_day_id");

-- CreateIndex
CREATE INDEX "camp_attendance_athlete_id_idx" ON "camp_attendance"("athlete_id");

-- CreateIndex
CREATE INDEX "camp_attendance_parent_profile_id_idx" ON "camp_attendance"("parent_profile_id");

-- CreateIndex
CREATE INDEX "camp_attendance_registration_id_idx" ON "camp_attendance"("registration_id");

-- CreateIndex
CREATE INDEX "camp_attendance_status_idx" ON "camp_attendance"("status");

-- CreateIndex
CREATE UNIQUE INDEX "camp_attendance_camp_day_id_athlete_id_key" ON "camp_attendance"("camp_day_id", "athlete_id");

-- CreateIndex
CREATE UNIQUE INDEX "pickup_tokens_token_key" ON "pickup_tokens"("token");

-- CreateIndex
CREATE INDEX "pickup_tokens_camp_day_id_idx" ON "pickup_tokens"("camp_day_id");

-- CreateIndex
CREATE INDEX "pickup_tokens_athlete_id_idx" ON "pickup_tokens"("athlete_id");

-- CreateIndex
CREATE INDEX "pickup_tokens_parent_profile_id_idx" ON "pickup_tokens"("parent_profile_id");

-- CreateIndex
CREATE INDEX "pickup_tokens_token_idx" ON "pickup_tokens"("token");

-- CreateIndex
CREATE INDEX "pickup_tokens_is_used_idx" ON "pickup_tokens"("is_used");

-- CreateIndex
CREATE INDEX "camp_incidents_camp_day_id_idx" ON "camp_incidents"("camp_day_id");

-- CreateIndex
CREATE INDEX "camp_incidents_athlete_id_idx" ON "camp_incidents"("athlete_id");

-- CreateIndex
CREATE INDEX "camp_incidents_severity_idx" ON "camp_incidents"("severity");

-- CreateIndex
CREATE INDEX "schedule_block_progress_camp_day_id_idx" ON "schedule_block_progress"("camp_day_id");

-- CreateIndex
CREATE INDEX "schedule_block_progress_schedule_block_id_idx" ON "schedule_block_progress"("schedule_block_id");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_block_progress_camp_day_id_schedule_block_id_key" ON "schedule_block_progress"("camp_day_id", "schedule_block_id");

-- CreateIndex
CREATE INDEX "parent_onboarding_parent_profile_id_idx" ON "parent_onboarding"("parent_profile_id");

-- CreateIndex
CREATE INDEX "parent_onboarding_camp_id_idx" ON "parent_onboarding"("camp_id");

-- CreateIndex
CREATE INDEX "parent_onboarding_athlete_id_idx" ON "parent_onboarding"("athlete_id");

-- CreateIndex
CREATE UNIQUE INDEX "parent_onboarding_parent_profile_id_camp_id_athlete_id_key" ON "parent_onboarding"("parent_profile_id", "camp_id", "athlete_id");

-- CreateIndex
CREATE INDEX "authorized_pickups_parent_profile_id_idx" ON "authorized_pickups"("parent_profile_id");

-- CreateIndex
CREATE INDEX "authorized_pickups_athlete_id_idx" ON "authorized_pickups"("athlete_id");

-- CreateIndex
CREATE INDEX "camp_staff_assignments_camp_id_idx" ON "camp_staff_assignments"("camp_id");

-- CreateIndex
CREATE INDEX "camp_staff_assignments_user_id_idx" ON "camp_staff_assignments"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "camp_staff_assignments_camp_id_user_id_key" ON "camp_staff_assignments"("camp_id", "user_id");

-- CreateIndex
CREATE INDEX "empoweru_modules_tenant_id_idx" ON "empoweru_modules"("tenant_id");

-- CreateIndex
CREATE INDEX "empoweru_modules_portal_type_idx" ON "empoweru_modules"("portal_type");

-- CreateIndex
CREATE INDEX "empoweru_modules_level_idx" ON "empoweru_modules"("level");

-- CreateIndex
CREATE INDEX "empoweru_modules_is_published_idx" ON "empoweru_modules"("is_published");

-- CreateIndex
CREATE UNIQUE INDEX "empoweru_modules_tenant_id_slug_key" ON "empoweru_modules"("tenant_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "empoweru_quizzes_module_id_key" ON "empoweru_quizzes"("module_id");

-- CreateIndex
CREATE INDEX "empoweru_quizzes_module_id_idx" ON "empoweru_quizzes"("module_id");

-- CreateIndex
CREATE INDEX "empoweru_quiz_questions_quiz_id_idx" ON "empoweru_quiz_questions"("quiz_id");

-- CreateIndex
CREATE INDEX "empoweru_quiz_questions_quiz_id_order_index_idx" ON "empoweru_quiz_questions"("quiz_id", "order_index");

-- CreateIndex
CREATE INDEX "empoweru_quiz_options_question_id_idx" ON "empoweru_quiz_options"("question_id");

-- CreateIndex
CREATE INDEX "empoweru_module_progress_module_id_idx" ON "empoweru_module_progress"("module_id");

-- CreateIndex
CREATE INDEX "empoweru_module_progress_user_id_idx" ON "empoweru_module_progress"("user_id");

-- CreateIndex
CREATE INDEX "empoweru_module_progress_tenant_id_idx" ON "empoweru_module_progress"("tenant_id");

-- CreateIndex
CREATE INDEX "empoweru_module_progress_status_idx" ON "empoweru_module_progress"("status");

-- CreateIndex
CREATE UNIQUE INDEX "empoweru_module_progress_module_id_user_id_tenant_id_key" ON "empoweru_module_progress"("module_id", "user_id", "tenant_id");

-- CreateIndex
CREATE INDEX "empoweru_contributions_tenant_id_idx" ON "empoweru_contributions"("tenant_id");

-- CreateIndex
CREATE INDEX "empoweru_contributions_submitted_by_user_id_idx" ON "empoweru_contributions"("submitted_by_user_id");

-- CreateIndex
CREATE INDEX "empoweru_contributions_status_idx" ON "empoweru_contributions"("status");

-- CreateIndex
CREATE INDEX "empoweru_contributions_portal_type_idx" ON "empoweru_contributions"("portal_type");

-- CreateIndex
CREATE INDEX "empoweru_unlock_rules_portal_type_idx" ON "empoweru_unlock_rules"("portal_type");

-- CreateIndex
CREATE INDEX "empoweru_unlock_rules_unlock_feature_code_idx" ON "empoweru_unlock_rules"("unlock_feature_code");

-- CreateIndex
CREATE UNIQUE INDEX "empoweru_unlock_rules_portal_type_unlock_feature_code_key" ON "empoweru_unlock_rules"("portal_type", "unlock_feature_code");

-- CreateIndex
CREATE INDEX "empoweru_unlock_rule_modules_rule_id_idx" ON "empoweru_unlock_rule_modules"("rule_id");

-- CreateIndex
CREATE INDEX "empoweru_unlock_rule_modules_module_id_idx" ON "empoweru_unlock_rule_modules"("module_id");

-- CreateIndex
CREATE UNIQUE INDEX "empoweru_unlock_rule_modules_rule_id_module_id_key" ON "empoweru_unlock_rule_modules"("rule_id", "module_id");

-- CreateIndex
CREATE INDEX "empoweru_user_unlocks_user_id_idx" ON "empoweru_user_unlocks"("user_id");

-- CreateIndex
CREATE INDEX "empoweru_user_unlocks_tenant_id_idx" ON "empoweru_user_unlocks"("tenant_id");

-- CreateIndex
CREATE INDEX "empoweru_user_unlocks_feature_code_idx" ON "empoweru_user_unlocks"("feature_code");

-- CreateIndex
CREATE UNIQUE INDEX "empoweru_user_unlocks_user_id_tenant_id_feature_code_key" ON "empoweru_user_unlocks"("user_id", "tenant_id", "feature_code");

-- CreateIndex
CREATE UNIQUE INDEX "compensation_plans_plan_code_key" ON "compensation_plans"("plan_code");

-- CreateIndex
CREATE INDEX "compensation_plans_plan_code_idx" ON "compensation_plans"("plan_code");

-- CreateIndex
CREATE INDEX "compensation_plans_is_active_idx" ON "compensation_plans"("is_active");

-- CreateIndex
CREATE INDEX "camp_session_compensations_camp_id_idx" ON "camp_session_compensations"("camp_id");

-- CreateIndex
CREATE INDEX "camp_session_compensations_tenant_id_idx" ON "camp_session_compensations"("tenant_id");

-- CreateIndex
CREATE INDEX "camp_session_compensations_staff_profile_id_idx" ON "camp_session_compensations"("staff_profile_id");

-- CreateIndex
CREATE INDEX "camp_session_compensations_is_finalized_idx" ON "camp_session_compensations"("is_finalized");

-- CreateIndex
CREATE UNIQUE INDEX "camp_session_compensations_camp_id_staff_profile_id_key" ON "camp_session_compensations"("camp_id", "staff_profile_id");

-- CreateIndex
CREATE INDEX "camp_day_compensation_snapshots_camp_day_id_idx" ON "camp_day_compensation_snapshots"("camp_day_id");

-- CreateIndex
CREATE INDEX "camp_day_compensation_snapshots_camp_id_idx" ON "camp_day_compensation_snapshots"("camp_id");

-- CreateIndex
CREATE INDEX "camp_day_compensation_snapshots_staff_profile_id_idx" ON "camp_day_compensation_snapshots"("staff_profile_id");

-- CreateIndex
CREATE INDEX "camp_day_compensation_snapshots_session_compensation_id_idx" ON "camp_day_compensation_snapshots"("session_compensation_id");

-- CreateIndex
CREATE UNIQUE INDEX "camp_day_compensation_snapshots_camp_day_id_staff_profile_i_key" ON "camp_day_compensation_snapshots"("camp_day_id", "staff_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "royalty_invoices_invoice_number_key" ON "royalty_invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "royalty_invoices_tenant_id_idx" ON "royalty_invoices"("tenant_id");

-- CreateIndex
CREATE INDEX "royalty_invoices_camp_id_idx" ON "royalty_invoices"("camp_id");

-- CreateIndex
CREATE INDEX "royalty_invoices_status_idx" ON "royalty_invoices"("status");

-- CreateIndex
CREATE INDEX "royalty_invoices_due_date_idx" ON "royalty_invoices"("due_date");

-- CreateIndex
CREATE INDEX "royalty_invoices_period_start_period_end_idx" ON "royalty_invoices"("period_start", "period_end");

-- CreateIndex
CREATE INDEX "royalty_line_items_invoice_id_idx" ON "royalty_line_items"("invoice_id");

-- CreateIndex
CREATE INDEX "royalty_line_items_category_idx" ON "royalty_line_items"("category");

-- CreateIndex
CREATE INDEX "pdf_reports_tenant_id_idx" ON "pdf_reports"("tenant_id");

-- CreateIndex
CREATE INDEX "pdf_reports_type_idx" ON "pdf_reports"("type");

-- CreateIndex
CREATE INDEX "pdf_reports_resource_id_idx" ON "pdf_reports"("resource_id");

-- CreateIndex
CREATE INDEX "pdf_reports_status_idx" ON "pdf_reports"("status");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_tenant_id_idx" ON "notifications"("tenant_id");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_category_idx" ON "notifications"("category");

-- CreateIndex
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "notification_preferences_user_id_idx" ON "notification_preferences"("user_id");

-- CreateIndex
CREATE INDEX "notification_preferences_tenant_id_idx" ON "notification_preferences"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_tenant_id_category_key" ON "notification_preferences"("user_id", "tenant_id", "category");

-- CreateIndex
CREATE INDEX "message_threads_tenant_id_idx" ON "message_threads"("tenant_id");

-- CreateIndex
CREATE INDEX "message_threads_type_idx" ON "message_threads"("type");

-- CreateIndex
CREATE INDEX "message_threads_last_message_at_idx" ON "message_threads"("last_message_at");

-- CreateIndex
CREATE INDEX "message_participants_thread_id_idx" ON "message_participants"("thread_id");

-- CreateIndex
CREATE INDEX "message_participants_user_id_idx" ON "message_participants"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "message_participants_thread_id_user_id_key" ON "message_participants"("thread_id", "user_id");

-- CreateIndex
CREATE INDEX "messages_thread_id_idx" ON "messages"("thread_id");

-- CreateIndex
CREATE INDEX "messages_from_user_id_idx" ON "messages"("from_user_id");

-- CreateIndex
CREATE INDEX "messages_created_at_idx" ON "messages"("created_at");

-- CreateIndex
CREATE INDEX "revenue_snapshots_tenant_id_idx" ON "revenue_snapshots"("tenant_id");

-- CreateIndex
CREATE INDEX "revenue_snapshots_period_start_idx" ON "revenue_snapshots"("period_start");

-- CreateIndex
CREATE INDEX "revenue_snapshots_period_end_idx" ON "revenue_snapshots"("period_end");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_snapshots_tenant_id_period_start_period_end_key" ON "revenue_snapshots"("tenant_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "curriculum_submissions_tenant_id_idx" ON "curriculum_submissions"("tenant_id");

-- CreateIndex
CREATE INDEX "curriculum_submissions_submitted_by_user_id_idx" ON "curriculum_submissions"("submitted_by_user_id");

-- CreateIndex
CREATE INDEX "curriculum_submissions_status_idx" ON "curriculum_submissions"("status");

-- CreateIndex
CREATE INDEX "curriculum_submissions_created_at_idx" ON "curriculum_submissions"("created_at");

-- CreateIndex
CREATE INDEX "session_surveys_camp_id_idx" ON "session_surveys"("camp_id");

-- CreateIndex
CREATE INDEX "session_surveys_tenant_id_idx" ON "session_surveys"("tenant_id");

-- CreateIndex
CREATE INDEX "session_surveys_rating_idx" ON "session_surveys"("rating");

-- CreateIndex
CREATE INDEX "session_surveys_created_at_idx" ON "session_surveys"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "session_surveys_camp_id_parent_profile_id_athlete_id_key" ON "session_surveys"("camp_id", "parent_profile_id", "athlete_id");

-- CreateIndex
CREATE INDEX "session_complaints_camp_id_idx" ON "session_complaints"("camp_id");

-- CreateIndex
CREATE INDEX "session_complaints_tenant_id_idx" ON "session_complaints"("tenant_id");

-- CreateIndex
CREATE INDEX "session_complaints_severity_idx" ON "session_complaints"("severity");

-- CreateIndex
CREATE INDEX "session_complaints_status_idx" ON "session_complaints"("status");

-- CreateIndex
CREATE INDEX "session_complaints_created_at_idx" ON "session_complaints"("created_at");

-- CreateIndex
CREATE INDEX "email_logs_tenant_id_idx" ON "email_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "email_logs_user_id_idx" ON "email_logs"("user_id");

-- CreateIndex
CREATE INDEX "email_logs_email_type_idx" ON "email_logs"("email_type");

-- CreateIndex
CREATE INDEX "email_logs_status_idx" ON "email_logs"("status");

-- CreateIndex
CREATE INDEX "email_logs_to_email_idx" ON "email_logs"("to_email");

-- CreateIndex
CREATE INDEX "email_logs_created_at_idx" ON "email_logs"("created_at");

-- CreateIndex
CREATE INDEX "email_templates_email_type_idx" ON "email_templates"("email_type");

-- CreateIndex
CREATE INDEX "email_templates_tenant_id_idx" ON "email_templates"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_tenant_id_email_type_key" ON "email_templates"("tenant_id", "email_type");

-- CreateIndex
CREATE UNIQUE INDEX "camp_day_recaps_camp_day_id_key" ON "camp_day_recaps"("camp_day_id");

-- CreateIndex
CREATE INDEX "camp_day_recaps_tenant_id_idx" ON "camp_day_recaps"("tenant_id");

-- CreateIndex
CREATE INDEX "camp_day_recaps_camp_day_id_idx" ON "camp_day_recaps"("camp_day_id");

-- CreateIndex
CREATE INDEX "camp_day_recaps_created_at_idx" ON "camp_day_recaps"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "role_invites_token_key" ON "role_invites"("token");

-- CreateIndex
CREATE INDEX "role_invites_email_idx" ON "role_invites"("email");

-- CreateIndex
CREATE INDEX "role_invites_token_idx" ON "role_invites"("token");

-- CreateIndex
CREATE INDEX "role_invites_tenant_id_idx" ON "role_invites"("tenant_id");

-- CreateIndex
CREATE INDEX "role_invites_invited_by_user_id_idx" ON "role_invites"("invited_by_user_id");

-- CreateIndex
CREATE INDEX "role_invites_target_role_idx" ON "role_invites"("target_role");

-- CreateIndex
CREATE INDEX "role_invites_status_idx" ON "role_invites"("status");

-- CreateIndex
CREATE INDEX "role_invites_expires_at_idx" ON "role_invites"("expires_at");

-- CreateIndex
CREATE INDEX "settings_tenant_id_key_idx" ON "settings"("tenant_id", "key");

-- CreateIndex
CREATE INDEX "settings_key_idx" ON "settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "settings_scope_tenant_id_key_key" ON "settings"("scope", "tenant_id", "key");

-- CreateIndex
CREATE INDEX "settings_audit_logs_setting_id_idx" ON "settings_audit_logs"("setting_id");

-- CreateIndex
CREATE INDEX "settings_audit_logs_tenant_id_idx" ON "settings_audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "settings_audit_logs_key_idx" ON "settings_audit_logs"("key");

-- CreateIndex
CREATE INDEX "settings_audit_logs_changed_at_idx" ON "settings_audit_logs"("changed_at");

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venues" ADD CONSTRAINT "venues_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camps" ADD CONSTRAINT "camps_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camps" ADD CONSTRAINT "camps_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camps" ADD CONSTRAINT "camps_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athletes" ADD CONSTRAINT "athletes_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athletes" ADD CONSTRAINT "athletes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_promo_code_id_fkey" FOREIGN KEY ("promo_code_id") REFERENCES "promo_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addons" ADD CONSTRAINT "addons_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addons" ADD CONSTRAINT "addons_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addon_variants" ADD CONSTRAINT "addon_variants_addon_id_fkey" FOREIGN KEY ("addon_id") REFERENCES "addons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_addons" ADD CONSTRAINT "registration_addons_addon_id_fkey" FOREIGN KEY ("addon_id") REFERENCES "addons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_addons" ADD CONSTRAINT "registration_addons_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_addons" ADD CONSTRAINT "registration_addons_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "addon_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camper_session_data" ADD CONSTRAINT "camper_session_data_assigned_group_id_fkey" FOREIGN KEY ("assigned_group_id") REFERENCES "camp_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camper_session_data" ADD CONSTRAINT "camper_session_data_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camper_session_data" ADD CONSTRAINT "camper_session_data_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camper_session_data" ADD CONSTRAINT "camper_session_data_friend_group_id_fkey" FOREIGN KEY ("friend_group_id") REFERENCES "friend_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camper_session_data" ADD CONSTRAINT "camper_session_data_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camper_session_data" ADD CONSTRAINT "camper_session_data_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friend_groups" ADD CONSTRAINT "friend_groups_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friend_groups" ADD CONSTRAINT "friend_groups_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_friend_squads" ADD CONSTRAINT "camp_friend_squads_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_friend_squads" ADD CONSTRAINT "camp_friend_squads_created_by_parent_id_fkey" FOREIGN KEY ("created_by_parent_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_friend_squad_members" ADD CONSTRAINT "camp_friend_squad_members_squad_id_fkey" FOREIGN KEY ("squad_id") REFERENCES "camp_friend_squads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_friend_squad_members" ADD CONSTRAINT "camp_friend_squad_members_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_friend_squad_members" ADD CONSTRAINT "camp_friend_squad_members_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_groups" ADD CONSTRAINT "camp_groups_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_groups" ADD CONSTRAINT "camp_groups_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_assignments" ADD CONSTRAINT "group_assignments_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_assignments" ADD CONSTRAINT "group_assignments_camper_session_id_fkey" FOREIGN KEY ("camper_session_id") REFERENCES "camper_session_data"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_assignments" ADD CONSTRAINT "group_assignments_from_group_id_fkey" FOREIGN KEY ("from_group_id") REFERENCES "camp_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_assignments" ADD CONSTRAINT "group_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_assignments" ADD CONSTRAINT "group_assignments_to_group_id_fkey" FOREIGN KEY ("to_group_id") REFERENCES "camp_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grouping_runs" ADD CONSTRAINT "grouping_runs_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grouping_runs" ADD CONSTRAINT "grouping_runs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "constraint_violations" ADD CONSTRAINT "constraint_violations_affected_friend_group_id_fkey" FOREIGN KEY ("affected_friend_group_id") REFERENCES "friend_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "constraint_violations" ADD CONSTRAINT "constraint_violations_affected_group_id_fkey" FOREIGN KEY ("affected_group_id") REFERENCES "camp_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "constraint_violations" ADD CONSTRAINT "constraint_violations_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "constraint_violations" ADD CONSTRAINT "constraint_violations_grouping_run_id_fkey" FOREIGN KEY ("grouping_run_id") REFERENCES "grouping_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "constraint_violations" ADD CONSTRAINT "constraint_violations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_report_snapshots" ADD CONSTRAINT "group_report_snapshots_amends_report_id_fkey" FOREIGN KEY ("amends_report_id") REFERENCES "group_report_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_report_snapshots" ADD CONSTRAINT "group_report_snapshots_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_report_snapshots" ADD CONSTRAINT "group_report_snapshots_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_templates" ADD CONSTRAINT "curriculum_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_templates" ADD CONSTRAINT "curriculum_templates_licensee_id_fkey" FOREIGN KEY ("licensee_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_blocks" ADD CONSTRAINT "curriculum_blocks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_blocks" ADD CONSTRAINT "curriculum_blocks_licensee_id_fkey" FOREIGN KEY ("licensee_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_template_days" ADD CONSTRAINT "curriculum_template_days_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "curriculum_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_day_blocks" ADD CONSTRAINT "curriculum_day_blocks_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "curriculum_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_day_blocks" ADD CONSTRAINT "curriculum_day_blocks_day_id_fkey" FOREIGN KEY ("day_id") REFERENCES "curriculum_template_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_session_curriculum" ADD CONSTRAINT "camp_session_curriculum_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_session_curriculum" ADD CONSTRAINT "camp_session_curriculum_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_session_curriculum" ADD CONSTRAINT "camp_session_curriculum_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "curriculum_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_session_days" ADD CONSTRAINT "camp_session_days_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_session_schedule_blocks" ADD CONSTRAINT "camp_session_schedule_blocks_camp_session_day_id_fkey" FOREIGN KEY ("camp_session_day_id") REFERENCES "camp_session_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_session_schedule_blocks" ADD CONSTRAINT "camp_session_schedule_blocks_curriculum_block_id_fkey" FOREIGN KEY ("curriculum_block_id") REFERENCES "curriculum_blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_templates" ADD CONSTRAINT "schedule_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_templates" ADD CONSTRAINT "schedule_templates_licensee_id_fkey" FOREIGN KEY ("licensee_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_template_blocks" ADD CONSTRAINT "schedule_template_blocks_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "schedule_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_certifications" ADD CONSTRAINT "volunteer_certifications_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_certifications" ADD CONSTRAINT "volunteer_certifications_reviewed_by_profile_id_fkey" FOREIGN KEY ("reviewed_by_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_certifications" ADD CONSTRAINT "volunteer_certifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms_progress" ADD CONSTRAINT "lms_progress_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "lms_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms_progress" ADD CONSTRAINT "lms_progress_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_products" ADD CONSTRAINT "shop_products_licensee_id_fkey" FOREIGN KEY ("licensee_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_product_variants" ADD CONSTRAINT "shop_product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "shop_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_licensee_id_fkey" FOREIGN KEY ("licensee_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_order_items" ADD CONSTRAINT "shop_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "shop_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_order_items" ADD CONSTRAINT "shop_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "shop_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_order_items" ADD CONSTRAINT "shop_order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "shop_product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "territories" ADD CONSTRAINT "territories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cit_progress_events" ADD CONSTRAINT "cit_progress_events_cit_application_id_fkey" FOREIGN KEY ("cit_application_id") REFERENCES "cit_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cit_assignments" ADD CONSTRAINT "cit_assignments_cit_application_id_fkey" FOREIGN KEY ("cit_application_id") REFERENCES "cit_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonies" ADD CONSTRAINT "testimonies_camp_session_id_fkey" FOREIGN KEY ("camp_session_id") REFERENCES "camps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonies" ADD CONSTRAINT "testimonies_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonies" ADD CONSTRAINT "testimonies_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonies" ADD CONSTRAINT "testimonies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_days" ADD CONSTRAINT "camp_days_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_attendance" ADD CONSTRAINT "camp_attendance_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_attendance" ADD CONSTRAINT "camp_attendance_camp_day_id_fkey" FOREIGN KEY ("camp_day_id") REFERENCES "camp_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_attendance" ADD CONSTRAINT "camp_attendance_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "camp_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_attendance" ADD CONSTRAINT "camp_attendance_parent_profile_id_fkey" FOREIGN KEY ("parent_profile_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_attendance" ADD CONSTRAINT "camp_attendance_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_tokens" ADD CONSTRAINT "pickup_tokens_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_tokens" ADD CONSTRAINT "pickup_tokens_camp_day_id_fkey" FOREIGN KEY ("camp_day_id") REFERENCES "camp_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_tokens" ADD CONSTRAINT "pickup_tokens_parent_profile_id_fkey" FOREIGN KEY ("parent_profile_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_incidents" ADD CONSTRAINT "camp_incidents_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_incidents" ADD CONSTRAINT "camp_incidents_camp_day_id_fkey" FOREIGN KEY ("camp_day_id") REFERENCES "camp_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_block_progress" ADD CONSTRAINT "schedule_block_progress_camp_day_id_fkey" FOREIGN KEY ("camp_day_id") REFERENCES "camp_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_block_progress" ADD CONSTRAINT "schedule_block_progress_schedule_block_id_fkey" FOREIGN KEY ("schedule_block_id") REFERENCES "camp_session_schedule_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_onboarding" ADD CONSTRAINT "parent_onboarding_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_onboarding" ADD CONSTRAINT "parent_onboarding_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_onboarding" ADD CONSTRAINT "parent_onboarding_parent_profile_id_fkey" FOREIGN KEY ("parent_profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorized_pickups" ADD CONSTRAINT "authorized_pickups_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorized_pickups" ADD CONSTRAINT "authorized_pickups_parent_profile_id_fkey" FOREIGN KEY ("parent_profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_staff_assignments" ADD CONSTRAINT "camp_staff_assignments_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_staff_assignments" ADD CONSTRAINT "camp_staff_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empoweru_modules" ADD CONSTRAINT "empoweru_modules_contribution_id_fkey" FOREIGN KEY ("contribution_id") REFERENCES "empoweru_contributions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empoweru_quizzes" ADD CONSTRAINT "empoweru_quizzes_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "empoweru_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empoweru_quiz_questions" ADD CONSTRAINT "empoweru_quiz_questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "empoweru_quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empoweru_quiz_options" ADD CONSTRAINT "empoweru_quiz_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "empoweru_quiz_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empoweru_module_progress" ADD CONSTRAINT "empoweru_module_progress_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "empoweru_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empoweru_unlock_rule_modules" ADD CONSTRAINT "empoweru_unlock_rule_modules_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "empoweru_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empoweru_unlock_rule_modules" ADD CONSTRAINT "empoweru_unlock_rule_modules_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "empoweru_unlock_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_session_compensations" ADD CONSTRAINT "camp_session_compensations_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_session_compensations" ADD CONSTRAINT "camp_session_compensations_compensation_plan_id_fkey" FOREIGN KEY ("compensation_plan_id") REFERENCES "compensation_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_session_compensations" ADD CONSTRAINT "camp_session_compensations_staff_profile_id_fkey" FOREIGN KEY ("staff_profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_session_compensations" ADD CONSTRAINT "camp_session_compensations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_day_compensation_snapshots" ADD CONSTRAINT "camp_day_compensation_snapshots_camp_day_id_fkey" FOREIGN KEY ("camp_day_id") REFERENCES "camp_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_day_compensation_snapshots" ADD CONSTRAINT "camp_day_compensation_snapshots_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_day_compensation_snapshots" ADD CONSTRAINT "camp_day_compensation_snapshots_session_compensation_id_fkey" FOREIGN KEY ("session_compensation_id") REFERENCES "camp_session_compensations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_day_compensation_snapshots" ADD CONSTRAINT "camp_day_compensation_snapshots_staff_profile_id_fkey" FOREIGN KEY ("staff_profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "royalty_invoices" ADD CONSTRAINT "royalty_invoices_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "royalty_invoices" ADD CONSTRAINT "royalty_invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "royalty_line_items" ADD CONSTRAINT "royalty_line_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "royalty_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_reports" ADD CONSTRAINT "pdf_reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_participants" ADD CONSTRAINT "message_participants_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "message_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_participants" ADD CONSTRAINT "message_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "message_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_snapshots" ADD CONSTRAINT "revenue_snapshots_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_submissions" ADD CONSTRAINT "curriculum_submissions_approved_block_id_fkey" FOREIGN KEY ("approved_block_id") REFERENCES "curriculum_blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_submissions" ADD CONSTRAINT "curriculum_submissions_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_submissions" ADD CONSTRAINT "curriculum_submissions_submitted_by_user_id_fkey" FOREIGN KEY ("submitted_by_user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_submissions" ADD CONSTRAINT "curriculum_submissions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_surveys" ADD CONSTRAINT "session_surveys_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_complaints" ADD CONSTRAINT "session_complaints_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_day_recaps" ADD CONSTRAINT "camp_day_recaps_camp_day_id_fkey" FOREIGN KEY ("camp_day_id") REFERENCES "camp_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_day_recaps" ADD CONSTRAINT "camp_day_recaps_submitted_by_user_id_fkey" FOREIGN KEY ("submitted_by_user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_day_recaps" ADD CONSTRAINT "camp_day_recaps_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_invites" ADD CONSTRAINT "role_invites_accepted_user_id_fkey" FOREIGN KEY ("accepted_user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_invites" ADD CONSTRAINT "role_invites_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_invites" ADD CONSTRAINT "role_invites_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings_audit_logs" ADD CONSTRAINT "settings_audit_logs_setting_id_fkey" FOREIGN KEY ("setting_id") REFERENCES "settings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings_audit_logs" ADD CONSTRAINT "settings_audit_logs_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

