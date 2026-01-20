-- AlterTable
ALTER TABLE "curriculum_blocks" ADD COLUMN     "pdf_name" TEXT,
ADD COLUMN     "pdf_url" TEXT;

-- AlterTable
ALTER TABLE "curriculum_templates" ADD COLUMN     "is_pdf_only" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pdf_name" TEXT,
ADD COLUMN     "pdf_url" TEXT;
