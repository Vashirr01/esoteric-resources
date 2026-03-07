-- Add description and imageUrl columns to Resource
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
