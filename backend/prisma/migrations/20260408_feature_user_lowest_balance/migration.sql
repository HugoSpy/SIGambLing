-- Feature 1E: Add lowestBalance to User for COMEBACK_KID badge trigger
ALTER TABLE "User" ADD COLUMN "lowestBalance" INTEGER NOT NULL DEFAULT 1000;
