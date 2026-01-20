-- AlterTable
ALTER TABLE "addons" ADD COLUMN     "is_taxable" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "registrations" ADD COLUMN     "tax_cents" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "tax_rate_percent" DECIMAL(5,2) DEFAULT 0;
