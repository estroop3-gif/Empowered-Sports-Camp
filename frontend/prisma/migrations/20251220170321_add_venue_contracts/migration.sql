-- CreateEnum
CREATE TYPE "VenueContractStatus" AS ENUM ('draft', 'sent', 'signed', 'expired');

-- CreateTable
CREATE TABLE "venue_contracts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "venue_id" UUID NOT NULL,
    "tenant_id" UUID,
    "rental_rate_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "contract_start_date" DATE NOT NULL,
    "contract_end_date" DATE NOT NULL,
    "deposit_cents" INTEGER,
    "payment_due_date" DATE,
    "insurance_requirements" TEXT,
    "cancellation_policy" TEXT,
    "setup_time_minutes" INTEGER,
    "cleanup_time_minutes" INTEGER,
    "special_conditions" TEXT,
    "document_url" TEXT,
    "document_name" TEXT,
    "status" "VenueContractStatus" NOT NULL DEFAULT 'draft',
    "sent_at" TIMESTAMPTZ(6),
    "sent_to_email" TEXT,
    "signed_at" TIMESTAMPTZ(6),
    "expiration_date" DATE,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "venue_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "venue_contracts_venue_id_idx" ON "venue_contracts"("venue_id");

-- CreateIndex
CREATE INDEX "venue_contracts_tenant_id_idx" ON "venue_contracts"("tenant_id");

-- CreateIndex
CREATE INDEX "venue_contracts_status_idx" ON "venue_contracts"("status");

-- AddForeignKey
ALTER TABLE "venue_contracts" ADD CONSTRAINT "venue_contracts_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venue_contracts" ADD CONSTRAINT "venue_contracts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
