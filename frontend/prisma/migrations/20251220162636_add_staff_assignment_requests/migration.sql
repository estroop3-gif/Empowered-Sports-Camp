-- CreateEnum
CREATE TYPE "StaffRequestStatus" AS ENUM ('pending', 'accepted', 'declined');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'staff_assignment_request_received';
ALTER TYPE "NotificationType" ADD VALUE 'staff_assignment_request_accepted';
ALTER TYPE "NotificationType" ADD VALUE 'staff_assignment_request_declined';

-- CreateTable
CREATE TABLE "staff_assignment_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "camp_id" UUID NOT NULL,
    "requested_user_id" UUID NOT NULL,
    "requested_by_user_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "status" "StaffRequestStatus" NOT NULL DEFAULT 'pending',
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "is_lead" BOOLEAN NOT NULL DEFAULT false,
    "call_time" TIME(6),
    "end_time" TIME(6),
    "station_name" TEXT,

    CONSTRAINT "staff_assignment_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staff_assignment_requests_requested_user_id_status_idx" ON "staff_assignment_requests"("requested_user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "staff_assignment_requests_camp_id_requested_user_id_key" ON "staff_assignment_requests"("camp_id", "requested_user_id");

-- AddForeignKey
ALTER TABLE "staff_assignment_requests" ADD CONSTRAINT "staff_assignment_requests_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_assignment_requests" ADD CONSTRAINT "staff_assignment_requests_requested_user_id_fkey" FOREIGN KEY ("requested_user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_assignment_requests" ADD CONSTRAINT "staff_assignment_requests_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
