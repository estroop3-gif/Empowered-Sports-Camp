-- CreateEnum
CREATE TYPE "WaiverSigningStatus" AS ENUM ('pending', 'signed', 'expired', 'declined');

-- CreateTable
CREATE TABLE "waiver_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content_html" TEXT NOT NULL,
    "is_mandatory_site_wide" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "current_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_user_id" UUID,
    "updated_by_user_id" UUID,

    CONSTRAINT "waiver_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waiver_template_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "waiver_template_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "content_html" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_user_id" UUID,

    CONSTRAINT "waiver_template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camp_waiver_requirements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "camp_id" UUID NOT NULL,
    "waiver_template_id" UUID NOT NULL,
    "waiver_template_version" INTEGER,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "camp_waiver_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athlete_waiver_signings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "camp_id" UUID,
    "registration_id" UUID,
    "athlete_id" UUID NOT NULL,
    "parent_profile_id" UUID NOT NULL,
    "waiver_template_id" UUID NOT NULL,
    "waiver_template_version_id" UUID,
    "camp_waiver_requirement_id" UUID,
    "version_signed" INTEGER NOT NULL,
    "status" "WaiverSigningStatus" NOT NULL DEFAULT 'pending',
    "signed_at" TIMESTAMPTZ(6),
    "signer_name" TEXT,
    "signer_email" TEXT,
    "signer_ip_address" TEXT,
    "signature_payload_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "athlete_waiver_signings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "waiver_templates_tenant_id_idx" ON "waiver_templates"("tenant_id");

-- CreateIndex
CREATE INDEX "waiver_templates_is_mandatory_site_wide_idx" ON "waiver_templates"("is_mandatory_site_wide");

-- CreateIndex
CREATE INDEX "waiver_templates_is_active_idx" ON "waiver_templates"("is_active");

-- CreateIndex
CREATE INDEX "waiver_template_versions_waiver_template_id_idx" ON "waiver_template_versions"("waiver_template_id");

-- CreateIndex
CREATE UNIQUE INDEX "waiver_template_versions_waiver_template_id_version_key" ON "waiver_template_versions"("waiver_template_id", "version");

-- CreateIndex
CREATE INDEX "camp_waiver_requirements_camp_id_idx" ON "camp_waiver_requirements"("camp_id");

-- CreateIndex
CREATE INDEX "camp_waiver_requirements_waiver_template_id_idx" ON "camp_waiver_requirements"("waiver_template_id");

-- CreateIndex
CREATE UNIQUE INDEX "camp_waiver_requirements_camp_id_waiver_template_id_key" ON "camp_waiver_requirements"("camp_id", "waiver_template_id");

-- CreateIndex
CREATE INDEX "athlete_waiver_signings_tenant_id_idx" ON "athlete_waiver_signings"("tenant_id");

-- CreateIndex
CREATE INDEX "athlete_waiver_signings_camp_id_idx" ON "athlete_waiver_signings"("camp_id");

-- CreateIndex
CREATE INDEX "athlete_waiver_signings_registration_id_idx" ON "athlete_waiver_signings"("registration_id");

-- CreateIndex
CREATE INDEX "athlete_waiver_signings_athlete_id_idx" ON "athlete_waiver_signings"("athlete_id");

-- CreateIndex
CREATE INDEX "athlete_waiver_signings_parent_profile_id_idx" ON "athlete_waiver_signings"("parent_profile_id");

-- CreateIndex
CREATE INDEX "athlete_waiver_signings_waiver_template_id_idx" ON "athlete_waiver_signings"("waiver_template_id");

-- CreateIndex
CREATE INDEX "athlete_waiver_signings_status_idx" ON "athlete_waiver_signings"("status");

-- AddForeignKey
ALTER TABLE "waiver_templates" ADD CONSTRAINT "waiver_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waiver_templates" ADD CONSTRAINT "waiver_templates_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waiver_templates" ADD CONSTRAINT "waiver_templates_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waiver_template_versions" ADD CONSTRAINT "waiver_template_versions_waiver_template_id_fkey" FOREIGN KEY ("waiver_template_id") REFERENCES "waiver_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waiver_template_versions" ADD CONSTRAINT "waiver_template_versions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_waiver_requirements" ADD CONSTRAINT "camp_waiver_requirements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_waiver_requirements" ADD CONSTRAINT "camp_waiver_requirements_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camp_waiver_requirements" ADD CONSTRAINT "camp_waiver_requirements_waiver_template_id_fkey" FOREIGN KEY ("waiver_template_id") REFERENCES "waiver_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_waiver_signings" ADD CONSTRAINT "athlete_waiver_signings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_waiver_signings" ADD CONSTRAINT "athlete_waiver_signings_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_waiver_signings" ADD CONSTRAINT "athlete_waiver_signings_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_waiver_signings" ADD CONSTRAINT "athlete_waiver_signings_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_waiver_signings" ADD CONSTRAINT "athlete_waiver_signings_parent_profile_id_fkey" FOREIGN KEY ("parent_profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_waiver_signings" ADD CONSTRAINT "athlete_waiver_signings_waiver_template_id_fkey" FOREIGN KEY ("waiver_template_id") REFERENCES "waiver_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_waiver_signings" ADD CONSTRAINT "athlete_waiver_signings_waiver_template_version_id_fkey" FOREIGN KEY ("waiver_template_version_id") REFERENCES "waiver_template_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_waiver_signings" ADD CONSTRAINT "athlete_waiver_signings_camp_waiver_requirement_id_fkey" FOREIGN KEY ("camp_waiver_requirement_id") REFERENCES "camp_waiver_requirements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
