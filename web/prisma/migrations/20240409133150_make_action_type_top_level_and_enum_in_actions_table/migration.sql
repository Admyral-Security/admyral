/*
  Warnings:

  - Added the required column `action_type` to the `actions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('Webhook', 'HttpRequest');

-- AlterTable
ALTER TABLE "actions" ADD COLUMN     "action_type" "ActionType" NOT NULL;
