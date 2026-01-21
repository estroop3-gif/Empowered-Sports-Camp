-- AlterTable
ALTER TABLE "camp_staff_assignments" ADD COLUMN     "ad_hoc_email" TEXT,
ADD COLUMN     "ad_hoc_first_name" TEXT,
ADD COLUMN     "ad_hoc_last_name" TEXT,
ADD COLUMN     "ad_hoc_phone" TEXT,
ADD COLUMN     "is_ad_hoc" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "user_id" DROP NOT NULL;
