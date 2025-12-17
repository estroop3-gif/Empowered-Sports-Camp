-- CreateTable
CREATE TABLE "territory_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "territory_id" UUID NOT NULL,
    "tenant_id" UUID,
    "licensee_id" UUID,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" UUID,
    "notes" TEXT,

    CONSTRAINT "territory_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "territory_assignments_territory_id_idx" ON "territory_assignments"("territory_id");

-- CreateIndex
CREATE INDEX "territory_assignments_tenant_id_idx" ON "territory_assignments"("tenant_id");

-- CreateIndex
CREATE INDEX "territory_assignments_licensee_id_idx" ON "territory_assignments"("licensee_id");

-- CreateIndex
CREATE UNIQUE INDEX "territory_assignments_territory_id_tenant_id_key" ON "territory_assignments"("territory_id", "tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "territory_assignments_territory_id_licensee_id_key" ON "territory_assignments"("territory_id", "licensee_id");

-- AddForeignKey
ALTER TABLE "territory_assignments" ADD CONSTRAINT "territory_assignments_territory_id_fkey" FOREIGN KEY ("territory_id") REFERENCES "territories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "territory_assignments" ADD CONSTRAINT "territory_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "territory_assignments" ADD CONSTRAINT "territory_assignments_licensee_id_fkey" FOREIGN KEY ("licensee_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
