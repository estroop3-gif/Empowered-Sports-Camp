-- AlterTable
ALTER TABLE "camp_attendance" ADD COLUMN     "check_out_pickup_person_id" UUID,
ADD COLUMN     "check_out_pickup_person_name" TEXT,
ADD COLUMN     "check_out_pickup_person_relationship" TEXT;

-- AddForeignKey
ALTER TABLE "camp_attendance" ADD CONSTRAINT "camp_attendance_check_out_pickup_person_id_fkey" FOREIGN KEY ("check_out_pickup_person_id") REFERENCES "authorized_pickups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
