/*
  Warnings:

  - You are about to drop the column `child_reference_handle` on the `workflow_edges` table. All the data in the column will be lost.
  - You are about to drop the column `parent_reference_handle` on the `workflow_edges` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "workflow_edges" DROP COLUMN "child_reference_handle",
DROP COLUMN "parent_reference_handle";
