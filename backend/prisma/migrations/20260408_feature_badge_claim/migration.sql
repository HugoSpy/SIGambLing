-- Feature 1A: Add claimedAt to Badge for one-time token reward claim
ALTER TABLE "Badge" ADD COLUMN "claimedAt" TIMESTAMP(3);
