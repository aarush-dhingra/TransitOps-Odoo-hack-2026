-- Step 1: add new enum values
-- PostgreSQL requires these to be committed before any column defaults using
-- the new values can be set, so they run first and we avoid SET DEFAULT below.
ALTER TYPE "TripStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "VehicleStatus" ADD VALUE IF NOT EXISTS 'IN_SHOP';

-- Step 2: drop old foreign keys (vehicle/driver will become nullable)
ALTER TABLE "trips" DROP CONSTRAINT IF EXISTS "trips_driver_id_fkey";
ALTER TABLE "trips" DROP CONSTRAINT IF EXISTS "trips_vehicle_id_fkey";

-- Step 3: alter trips table – new columns + make vehicle/driver nullable
-- NOTE: status default is NOT changed here to avoid the same-transaction enum issue.
--       The application layer always passes status = 'DRAFT' explicitly on create.
ALTER TABLE "trips"
  ADD COLUMN IF NOT EXISTS "cargo_weight" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "revenue"      DOUBLE PRECISION,
  ALTER COLUMN "vehicle_id" DROP NOT NULL,
  ALTER COLUMN "driver_id"  DROP NOT NULL;

-- Step 4: alter vehicles table – new optional fields
ALTER TABLE "vehicles"
  ADD COLUMN IF NOT EXISTS "acquisition_cost"      DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "maximum_load_capacity" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "region"                TEXT;

-- Step 5: create settings table
CREATE TABLE IF NOT EXISTS "settings" (
    "id"            TEXT NOT NULL,
    "depot_name"    TEXT NOT NULL DEFAULT 'TransitOps HQ',
    "currency"      TEXT NOT NULL DEFAULT 'INR',
    "distance_unit" TEXT NOT NULL DEFAULT 'km',
    "updated_at"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- Step 6: restore foreign keys as nullable (ON DELETE SET NULL)
ALTER TABLE "trips"
  ADD CONSTRAINT "trips_vehicle_id_fkey"
  FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "trips"
  ADD CONSTRAINT "trips_driver_id_fkey"
  FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
