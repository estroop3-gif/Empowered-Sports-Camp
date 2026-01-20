/*
  Warnings:

  - You are about to drop the column `internal_notes` on the `job_applications` table. All the data in the column will be lost.
  - You are about to drop the column `reviewed_by` on the `job_applications` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "job_applications" DROP COLUMN "internal_notes",
DROP COLUMN "reviewed_by",
ADD COLUMN     "age" INTEGER,
ADD COLUMN     "applicant_notes" TEXT,
ADD COLUMN     "availability_json" JSONB,
ADD COLUMN     "background_check_acknowledged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "certifications_json" JSONB,
ADD COLUMN     "reviewed_by_user_id" UUID,
ADD COLUMN     "tenant_id" UUID;

-- CreateTable
CREATE TABLE "job_application_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "s3_key" TEXT NOT NULL,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_application_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_application_internal_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "author_name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_application_internal_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_application_status_changes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "from_status" "JobApplicationStatus" NOT NULL,
    "to_status" "JobApplicationStatus" NOT NULL,
    "changed_by_user_id" UUID NOT NULL,
    "changed_by_name" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_application_status_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_application_attachments_application_id_idx" ON "job_application_attachments"("application_id");

-- CreateIndex
CREATE INDEX "job_application_internal_notes_application_id_idx" ON "job_application_internal_notes"("application_id");

-- CreateIndex
CREATE INDEX "job_application_internal_notes_created_at_idx" ON "job_application_internal_notes"("created_at");

-- CreateIndex
CREATE INDEX "job_application_status_changes_application_id_idx" ON "job_application_status_changes"("application_id");

-- CreateIndex
CREATE INDEX "job_application_status_changes_created_at_idx" ON "job_application_status_changes"("created_at");

-- CreateIndex
CREATE INDEX "job_applications_tenant_id_idx" ON "job_applications"("tenant_id");

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_application_attachments" ADD CONSTRAINT "job_application_attachments_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "job_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_application_internal_notes" ADD CONSTRAINT "job_application_internal_notes_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "job_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_application_status_changes" ADD CONSTRAINT "job_application_status_changes_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "job_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
