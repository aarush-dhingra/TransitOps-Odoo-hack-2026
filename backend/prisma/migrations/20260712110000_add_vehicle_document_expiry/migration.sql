-- AlterEnum
ALTER TYPE "DocumentCategory" ADD VALUE 'FITNESS_CERTIFICATE';

-- AlterTable
ALTER TABLE "documents" ADD COLUMN "expiry_date" TIMESTAMP(3);
