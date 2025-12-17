-- AlterTable
ALTER TABLE "pending_squad_invites" ADD COLUMN     "athlete_names" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "inviter_email" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending',
ALTER COLUMN "squad_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "guest_speakers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "camp_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "organization" TEXT,
    "topic" TEXT,
    "speaker_date" DATE,
    "is_high_profile" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_speakers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guest_speakers_camp_id_idx" ON "guest_speakers"("camp_id");

-- CreateIndex
CREATE INDEX "guest_speakers_tenant_id_idx" ON "guest_speakers"("tenant_id");

-- CreateIndex
CREATE INDEX "guest_speakers_speaker_date_idx" ON "guest_speakers"("speaker_date");

-- CreateIndex
CREATE INDEX "pending_squad_invites_inviter_email_idx" ON "pending_squad_invites"("inviter_email");

-- CreateIndex
CREATE INDEX "pending_squad_invites_status_idx" ON "pending_squad_invites"("status");

-- AddForeignKey
ALTER TABLE "guest_speakers" ADD CONSTRAINT "guest_speakers_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_speakers" ADD CONSTRAINT "guest_speakers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
