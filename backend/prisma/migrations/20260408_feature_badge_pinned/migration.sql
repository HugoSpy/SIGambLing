-- Feature 2B: Add pinned badge support for public profile
ALTER TABLE "Badge" ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Badge" ADD COLUMN "pinnedOrder" INTEGER;
