-- AlterTable
ALTER TABLE "camps" ADD COLUMN     "archived_at" TIMESTAMPTZ(6),
ADD COLUMN     "archived_by" UUID,
ADD COLUMN     "concluded_at" TIMESTAMPTZ(6),
ADD COLUMN     "concluded_by" UUID,
ADD COLUMN     "final_email_sent_at" TIMESTAMPTZ(6),
ADD COLUMN     "final_email_sent_count" INTEGER,
ADD COLUMN     "is_locked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lock_reason" TEXT;
