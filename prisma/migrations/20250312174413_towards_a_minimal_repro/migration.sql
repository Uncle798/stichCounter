/*
  Warnings:

  - You are about to drop the column `stripeId` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "stripeId",
ALTER COLUMN "email_verified" SET DEFAULT false;
