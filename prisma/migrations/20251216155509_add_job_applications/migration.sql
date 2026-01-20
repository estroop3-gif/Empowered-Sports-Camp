-- CreateEnum
CREATE TYPE "JobApplicationStatus" AS ENUM ('submitted', 'under_review', 'phone_screen', 'interview_scheduled', 'interview_completed', 'offer_extended', 'hired', 'rejected', 'withdrawn');

-- CreateTable
CREATE TABLE "job_applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "city" TEXT,
    "state" TEXT,
    "resume_url" TEXT,
    "cover_letter" TEXT,
    "linkedin_url" TEXT,
    "how_heard" TEXT,
    "status" "JobApplicationStatus" NOT NULL DEFAULT 'submitted',
    "internal_notes" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_applications_job_id_idx" ON "job_applications"("job_id");

-- CreateIndex
CREATE INDEX "job_applications_status_idx" ON "job_applications"("status");

-- CreateIndex
CREATE INDEX "job_applications_email_idx" ON "job_applications"("email");

-- CreateIndex
CREATE INDEX "job_applications_created_at_idx" ON "job_applications"("created_at");

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "job_postings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
