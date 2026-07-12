-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'ADMIN';

-- AlterTable
ALTER TABLE "trips" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
